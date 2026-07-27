import {
  type AuditStatus as SharedAuditStatus,
  assertValidMissionTransition,
  assertValidAuditTransition,
  calculateReportScore,
  type FindingCategory,
  type FindingSeverity,
  getMissionDefinition,
  type MergedMissionDefinition,
  type MissionStatus as SharedMissionStatus,
  type MissionType,
  planAuditMissions,
  type PlannerFallbackReason,
  type PlanningMode,
  type PlanningSnapshot,
  type PlannerOutput,
  type RejectedPlannerProposal,
  type BrowserAgentRunStatus,
  type BrowserAgentTerminalReason,
  type BrowserSwarmAgentRole,
  type BrowserSwarmAgentStatus,
  type BrowserSwarmRunStatus,
  type BrowserSwarmTerminalReason,
  type SwarmSharedState
} from "@ai-swarm-qa/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "./client";

const statusToPrisma = {
  created: "CREATED",
  validating: "VALIDATING",
  queued: "QUEUED",
  planning: "PLANNING",
  running: "RUNNING",
  analyzing: "ANALYZING",
  generating_report: "GENERATING_REPORT",
  completed: "COMPLETED",
  failed: "FAILED",
  cancelled: "CANCELLED"
} as const satisfies Record<SharedAuditStatus, string>;

const statusFromPrisma = Object.fromEntries(
  Object.entries(statusToPrisma).map(([shared, prismaStatus]) => [prismaStatus, shared])
) as Record<string, SharedAuditStatus>;

const categoryToPrisma = {
  functional: "FUNCTIONAL",
  accessibility: "ACCESSIBILITY",
  performance: "PERFORMANCE",
  ux: "UX",
  security: "SECURITY",
  network: "NETWORK",
  console: "CONSOLE"
} as const satisfies Record<FindingCategory, string>;

const severityToPrisma = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW"
} as const satisfies Record<FindingSeverity, string>;

const missionStatusToPrisma = {
  created: "CREATED",
  queued: "QUEUED",
  running: "RUNNING",
  completed: "COMPLETED",
  failed: "FAILED",
  cancelled: "CANCELLED",
  skipped: "SKIPPED"
} as const satisfies Record<SharedMissionStatus, string>;

const missionStatusFromPrisma = Object.fromEntries(
  Object.entries(missionStatusToPrisma).map(([shared, prismaStatus]) => [prismaStatus, shared])
) as Record<string, SharedMissionStatus>;

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly safeMessage = message
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function toSharedAuditStatus(status: string): SharedAuditStatus {
  const shared = statusFromPrisma[status];
  if (!shared) {
    throw new DomainError("UNKNOWN_AUDIT_STATUS", `Unknown audit status: ${status}`);
  }
  return shared;
}

export function toSharedMissionStatus(status: string): SharedMissionStatus {
  const shared = missionStatusFromPrisma[status];
  if (!shared) {
    throw new DomainError("UNKNOWN_MISSION_STATUS", `Unknown mission status: ${status}`);
  }
  return shared;
}

export async function getOrCreateDevelopmentProject(targetUrl: string) {
  const user = await prisma.user.upsert({
    where: { email: "local-owner@ai-swarm-qa.dev" },
    create: { email: "local-owner@ai-swarm-qa.dev", name: "Local Owner" },
    update: {}
  });

  const organization = await prisma.organization.upsert({
    where: { id: "local-dev-organization" },
    create: { id: "local-dev-organization", name: "Local Development" },
    update: {}
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "owner"
    },
    update: {}
  });

  return prisma.project.upsert({
    where: { id: "local-dev-project" },
    create: {
      id: "local-dev-project",
      organizationId: organization.id,
      name: "Local Fixture Project",
      targetUrl,
      verifiedAt: new Date()
    },
    update: {
      targetUrl
    }
  });
}

export async function getOrCreateWorkspaceProject(input: { workspaceId: string; targetUrl: string }) {
  const existing = await prisma.project.findFirst({
    where: {
      organizationId: input.workspaceId,
      targetUrl: input.targetUrl
    }
  });
  if (existing) return existing;
  const host = new URL(input.targetUrl).host;
  return prisma.project.create({
    data: {
      organizationId: input.workspaceId,
      name: host,
      targetUrl: input.targetUrl,
      verifiedAt: new Date()
    }
  });
}

export async function createAuditWithMission(input: {
  targetUrl: string;
  correlationId: string;
  maxSteps: number;
  maxCostUsd: number;
}) {
  return createAuditWithMissions(input);
}

export async function createAuditRecord(input: {
  targetUrl: string;
  correlationId: string;
  maxSteps: number;
  maxCostUsd: number;
  workspaceId?: string;
}) {
  const project = input.workspaceId
    ? await getOrCreateWorkspaceProject({ workspaceId: input.workspaceId, targetUrl: input.targetUrl })
    : await getOrCreateDevelopmentProject(input.targetUrl);

  return prisma.audit.create({
    data: {
      projectId: project.id,
      targetUrl: input.targetUrl,
      correlationId: input.correlationId,
      maxSteps: input.maxSteps,
      maxCostUsd: input.maxCostUsd.toString()
    }
  });
}

export async function createAuditWithMissions(input: {
  targetUrl: string;
  correlationId: string;
  maxSteps: number;
  maxCostUsd: number;
  mode?: "preview" | "standard";
  workspaceId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const project = input.workspaceId
      ? await getOrCreateWorkspaceProject({ workspaceId: input.workspaceId, targetUrl: input.targetUrl })
      : await getOrCreateDevelopmentProject(input.targetUrl);
    const audit = await tx.audit.create({
      data: {
        projectId: project.id,
        targetUrl: input.targetUrl,
        correlationId: input.correlationId,
        maxSteps: input.maxSteps,
        maxCostUsd: input.maxCostUsd.toString()
      }
    });

    const definitions = planAuditMissions({
      auditId: audit.id,
      targetUrl: input.targetUrl,
      mode: input.mode ?? "standard"
    });

    const missions = [];
    for (const definition of definitions) {
      missions.push(
        await tx.mission.create({
          data: {
            auditId: audit.id,
            type: definition.type,
            role: definition.role,
            objective: definition.objective,
            priority: definition.priority,
            required: definition.required,
            maxAttempts: definition.maxAttempts,
            timeoutMs: definition.timeoutMs,
            instructions: {
              viewport: definition.viewport,
              limits: definition.limits
            }
          }
        })
      );
    }

    return { audit, mission: missions[0], missions };
  });
}

export async function persistMissionPlan(input: { auditId: string; missions: MergedMissionDefinition[] }) {
  const records = [];
  for (const definition of input.missions) {
    records.push(
      await prisma.mission.upsert({
        where: { auditId_type: { auditId: input.auditId, type: definition.type } },
        create: {
          auditId: input.auditId,
          type: definition.type,
          role: definition.role,
          objective: definition.objective,
          priority: definition.priority,
          required: definition.required,
          maxAttempts: definition.maxAttempts,
          timeoutMs: definition.timeoutMs,
          instructions: {
            viewport: definition.viewport,
            limits: definition.limits,
            planning: definition.planning
          }
        },
        update: {
          priority: definition.priority,
          instructions: {
            viewport: definition.viewport,
            limits: definition.limits,
            planning: definition.planning
          }
        }
      })
    );
  }
  return records;
}

export type PersistAuditPlanInput = {
  auditId: string;
  mode: PlanningMode;
  source: "deterministic" | "anthropic" | "mock";
  status: "completed" | "fallback" | "failed";
  provider?: string | null;
  model?: string | null;
  promptId?: string | null;
  promptVersion?: string | null;
  baselinePlanJson: Prisma.InputJsonValue;
  snapshotJson?: PlanningSnapshot | null;
  proposedPlanJson?: PlannerOutput | null;
  acceptedPlanJson: Prisma.InputJsonValue;
  rejectedProposalsJson: RejectedPlannerProposal[];
  importantJourneysJson: Prisma.InputJsonValue;
  websiteClassification?: string | null;
  classificationConfidence?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedInputCost?: number | null;
  estimatedOutputCost?: number | null;
  estimatedCost?: number | null;
  durationMs?: number | null;
  fallbackReason?: PlannerFallbackReason | null;
  warningsJson: string[];
};

export async function upsertAuditPlan(input: PersistAuditPlanInput) {
  const data = {
    mode: input.mode,
    source: input.source,
    status: input.status,
    provider: input.provider ?? null,
    model: input.model ?? null,
    promptId: input.promptId ?? null,
    promptVersion: input.promptVersion ?? null,
    baselinePlanJson: input.baselinePlanJson,
    snapshotJson: input.snapshotJson ?? Prisma.JsonNull,
    proposedPlanJson: input.proposedPlanJson ?? Prisma.JsonNull,
    acceptedPlanJson: input.acceptedPlanJson,
    rejectedProposalsJson: input.rejectedProposalsJson,
    importantJourneysJson: input.importantJourneysJson,
    websiteClassification: input.websiteClassification ?? null,
    classificationConfidence: typeof input.classificationConfidence === "number" ? input.classificationConfidence.toString() : null,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    estimatedInputCost: typeof input.estimatedInputCost === "number" ? input.estimatedInputCost.toString() : null,
    estimatedOutputCost: typeof input.estimatedOutputCost === "number" ? input.estimatedOutputCost.toString() : null,
    estimatedCost: typeof input.estimatedCost === "number" ? input.estimatedCost.toString() : null,
    durationMs: input.durationMs ?? null,
    fallbackReason: input.fallbackReason ?? null,
    warningsJson: input.warningsJson,
    completedAt: new Date()
  };
  return prisma.auditPlan.upsert({
    where: { auditId: input.auditId },
    create: { auditId: input.auditId, ...data },
    update: data
  });
}

export async function transitionAuditStatus(
  auditId: string,
  nextStatus: SharedAuditStatus,
  options: { failureReason?: string; browserDurationMs?: number; actualCost?: number } = {}
) {
  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) {
    throw new DomainError("AUDIT_NOT_FOUND", `Audit not found: ${auditId}`, "Audit was not found.");
  }

  const currentStatus = toSharedAuditStatus(audit.status);
  if (currentStatus === nextStatus) {
    return audit;
  }

  const transition = assertValidAuditTransition(currentStatus, nextStatus);
  const now = new Date();

  return prisma.audit.update({
    where: { id: auditId },
    data: {
      status: statusToPrisma[nextStatus],
      ...(transition.timestampField ? { [transition.timestampField]: now } : {}),
      ...(options.failureReason ? { failureReason: options.failureReason } : {}),
      ...(typeof options.browserDurationMs === "number" ? { browserDurationMs: options.browserDurationMs } : {}),
      ...(typeof options.actualCost === "number" ? { actualCost: options.actualCost.toString() } : {})
    }
  });
}

export async function markMissionRunning(missionId: string) {
  return transitionMissionStatus(missionId, "running", { incrementAttempt: true });
}

export async function markMissionQueued(missionId: string) {
  return transitionMissionStatus(missionId, "queued");
}

export async function markMissionCompleted(missionId: string, options: { resultSummary?: string } = {}) {
  return transitionMissionStatus(missionId, "completed", options);
}

export async function markMissionFailed(missionId: string, failureReason: string) {
  return transitionMissionStatus(missionId, "failed", { failureReason });
}

export async function transitionMissionStatus(
  missionId: string,
  nextStatus: SharedMissionStatus,
  options: { failureReason?: string; resultSummary?: string; incrementAttempt?: boolean } = {}
) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) {
    throw new DomainError("MISSION_NOT_FOUND", `Mission not found: ${missionId}`, "Mission was not found.");
  }
  const currentStatus = toSharedMissionStatus(mission.status);
  if (currentStatus === nextStatus) {
    return mission;
  }
  const transition = assertValidMissionTransition(currentStatus, nextStatus);
  const now = new Date();
  return prisma.mission.update({
    where: { id: missionId },
    data: {
      status: missionStatusToPrisma[nextStatus],
      ...(transition.timestampField ? { [transition.timestampField]: now } : {}),
      ...(nextStatus === "failed" ? { completedAt: now } : {}),
      ...(options.failureReason ? { failureReason: options.failureReason } : {}),
      ...(options.resultSummary ? { resultSummary: options.resultSummary } : {}),
      ...(options.incrementAttempt ? { attemptCount: { increment: 1 } } : {})
    }
  });
}

export async function createBrowserSession(input: {
  missionId: string;
  browser: string;
  viewportWidth: number;
  viewportHeight: number;
}) {
  return prisma.browserSession.create({
    data: {
      missionId: input.missionId,
      status: "RUNNING",
      browser: input.browser,
      viewportWidth: input.viewportWidth,
      viewportHeight: input.viewportHeight,
      startedAt: new Date()
    }
  });
}

export async function completeBrowserSession(input: { browserSessionId: string; finalUrl?: string; failed?: boolean }) {
  return prisma.browserSession.update({
    where: { id: input.browserSessionId },
    data: {
      status: input.failed ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      ...(input.finalUrl ? { finalUrl: input.finalUrl } : {})
    }
  });
}

export async function completeBrowserSessionWithDuration(input: {
  browserSessionId: string;
  browserDurationMs: number;
  finalUrl?: string;
  failed?: boolean;
}) {
  return prisma.browserSession.update({
    where: { id: input.browserSessionId },
    data: {
      status: input.failed ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      browserDurationMs: input.browserDurationMs,
      ...(input.finalUrl ? { finalUrl: input.finalUrl } : {})
    }
  });
}

export type PersistableFinding = {
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  summary: string;
  description: string;
  affectedUrl: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  browser: string;
  viewport: string;
  confidence: number;
  fingerprint: string;
  sourceMissionId: string;
  sourceMissionType?: MissionType;
  occurrenceCount?: number;
  evidence: Array<{
    type: string;
    content?: string;
    localPath?: string;
    metadata: Prisma.InputJsonValue;
  }>;
};

export async function persistFindings(auditId: string, findings: PersistableFinding[]) {
  const existing = await prisma.finding.findMany({
    where: { auditId },
    select: { fingerprint: true }
  });
  const existingFingerprints = new Set(existing.map((finding) => finding.fingerprint));
  const created = [];

  for (const finding of findings) {
    if (existingFingerprints.has(finding.fingerprint)) {
      const existingFinding = await prisma.finding.findFirst({
        where: { auditId, fingerprint: finding.fingerprint },
        include: { evidence: true }
      });
      if (existingFinding) {
        const sourceMissions = new Set([...(existingFinding.sourceMissions as string[]), finding.sourceMissionId]);
        const sourceMissionTypes = new Set([
          ...((existingFinding.sourceMissionTypes as string[]) ?? []),
          ...(finding.sourceMissionType ? [finding.sourceMissionType] : [])
        ]);
        const evidence = [];
        for (const item of finding.evidence) {
          evidence.push(
            await prisma.findingEvidence.create({
              data: {
            findingId: existingFinding.id,
            type: item.type,
            content: item.content ?? null,
            localPath: item.localPath ?? null,
            metadata: item.metadata
              }
            })
          );
        }
        const evidenceIds = new Set([...(existingFinding.evidenceIds as string[]), ...evidence.map((item) => item.id)]);
        await prisma.finding.update({
          where: { id: existingFinding.id },
          data: {
            occurrenceCount: { increment: finding.occurrenceCount ?? 1 },
            sourceMissions: [...sourceMissions],
            sourceMissionTypes: [...sourceMissionTypes],
            evidenceIds: [...evidenceIds],
            affectedUrls: [...new Set([...(existingFinding.affectedUrls as string[]), finding.affectedUrl])]
          }
        });
      }
      continue;
    }

    const record = await prisma.finding.create({
      data: {
        auditId,
        category: categoryToPrisma[finding.category],
        severity: severityToPrisma[finding.severity],
        title: finding.title,
        summary: finding.summary,
        description: finding.description,
        affectedUrl: finding.affectedUrl,
        affectedUrls: [finding.affectedUrl],
        stepsToReproduce: finding.stepsToReproduce,
        expectedBehavior: finding.expectedBehavior,
        actualBehavior: finding.actualBehavior,
        evidenceIds: [],
        browser: finding.browser,
        viewport: finding.viewport,
        confidence: finding.confidence.toString(),
        fingerprint: finding.fingerprint,
        sourceMissions: [finding.sourceMissionId],
        sourceMissionTypes: finding.sourceMissionType ? [finding.sourceMissionType] : [],
        occurrenceCount: finding.occurrenceCount ?? 1,
        evidence: {
          create: finding.evidence.map((evidence) => ({
            type: evidence.type,
            content: evidence.content ?? null,
            localPath: evidence.localPath ?? null,
            metadata: evidence.metadata
          }))
        }
      },
      include: { evidence: true }
    });

    const evidenceRecords = await prisma.findingEvidence.findMany({
      where: { findingId: record.id },
      select: { id: true }
    });

    await prisma.finding.update({
      where: { id: record.id },
      data: { evidenceIds: evidenceRecords.map((evidence) => evidence.id) }
    });

    created.push(record);
    existingFingerprints.add(finding.fingerprint);
  }

  return created;
}

export type UpsertBrowserAgentRunInput = {
  auditId: string;
  missionId: string;
  swarmAgentId?: string | null;
  status: BrowserAgentRunStatus;
  provider: string;
  model?: string | null;
  promptId: string;
  promptVersion: string;
  objective: string;
  startUrl: string;
  maxSteps: number;
};

export async function upsertBrowserAgentRun(input: UpsertBrowserAgentRunInput) {
  const existing = input.swarmAgentId
    ? await prisma.browserAgentRun.findUnique({ where: { swarmAgentId: input.swarmAgentId } })
    : await prisma.browserAgentRun.findFirst({ where: { missionId: input.missionId, swarmAgentId: null } });
  const data = {
    auditId: input.auditId,
    missionId: input.missionId,
    swarmAgentId: input.swarmAgentId ?? null,
    status: input.status,
    provider: input.provider,
    model: input.model ?? null,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
    objective: input.objective,
    startUrl: input.startUrl,
    maxSteps: input.maxSteps
  };
  if (existing) {
    return prisma.browserAgentRun.update({
      where: { id: existing.id },
      data
    });
  }
  return prisma.browserAgentRun.create({
    data: {
      ...data,
      startedAt: new Date()
    }
  });
}

export async function createBrowserSwarmRun(input: {
  auditId: string;
  mode: string;
  maxAgents: number;
  maxConcurrency: number;
  coverageStateJson: Prisma.InputJsonValue;
}) {
  return prisma.browserSwarmRun.create({
    data: {
      auditId: input.auditId,
      status: "running",
      mode: input.mode,
      maxAgents: input.maxAgents,
      maxConcurrency: input.maxConcurrency,
      coverageStateJson: input.coverageStateJson,
      startedAt: new Date()
    }
  });
}

export async function createBrowserSwarmAgent(input: {
  swarmRunId: string;
  missionId: string;
  role: BrowserSwarmAgentRole;
  objective: string;
  priority: number;
}) {
  return prisma.browserSwarmAgent.upsert({
    where: { swarmRunId_role: { swarmRunId: input.swarmRunId, role: input.role } },
    create: {
      swarmRunId: input.swarmRunId,
      missionId: input.missionId,
      role: input.role,
      objective: input.objective,
      status: "created",
      priority: input.priority,
      routesVisitedJson: []
    },
    update: {
      objective: input.objective,
      priority: input.priority
    }
  });
}

export async function updateBrowserSwarmAgent(input: {
  agentId: string;
  status: BrowserSwarmAgentStatus;
  browserAgentRunId?: string | null;
  routesVisitedJson?: Prisma.InputJsonValue;
  findingsCount?: number;
  stepsUsed?: number;
  terminalReason?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}) {
  return prisma.browserSwarmAgent.update({
    where: { id: input.agentId },
    data: {
      status: input.status,
      ...(input.browserAgentRunId ? { browserAgentRunId: input.browserAgentRunId } : {}),
      ...(input.routesVisitedJson ? { routesVisitedJson: input.routesVisitedJson } : {}),
      ...(typeof input.findingsCount === "number" ? { findingsCount: input.findingsCount } : {}),
      ...(typeof input.stepsUsed === "number" ? { stepsUsed: input.stepsUsed } : {}),
      ...(input.terminalReason ? { terminalReason: input.terminalReason } : {}),
      ...(input.startedAt ? { startedAt: input.startedAt } : {}),
      ...(input.completedAt ? { completedAt: input.completedAt } : {})
    }
  });
}

export async function completeBrowserSwarmRun(input: {
  swarmRunId: string;
  status: BrowserSwarmRunStatus;
  terminalReason: BrowserSwarmTerminalReason;
  summary: string;
  coverageStateJson: SwarmSharedState;
  agentsCreated: number;
  agentsCompleted: number;
  totalSteps: number;
  totalProviderCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
}) {
  return prisma.browserSwarmRun.update({
    where: { id: input.swarmRunId },
    data: {
      status: input.status,
      terminalReason: input.terminalReason,
      summary: input.summary,
      coverageStateJson: input.coverageStateJson,
      agentsCreated: input.agentsCreated,
      agentsCompleted: input.agentsCompleted,
      totalSteps: input.totalSteps,
      totalProviderCalls: input.totalProviderCalls,
      totalInputTokens: input.totalInputTokens,
      totalOutputTokens: input.totalOutputTokens,
      estimatedCost: input.estimatedCost.toString(),
      completedAt: new Date()
    }
  });
}

export async function persistBrowserAgentStep(input: {
  runId: string;
  sequence: number;
  observationJson: Prisma.InputJsonValue;
  proposedActionJson: Prisma.InputJsonValue;
  validationStatus: string;
  safetyDecisionJson: Prisma.InputJsonValue;
  executionStatus: string;
  executionResultJson: Prisma.InputJsonValue;
  urlBefore?: string | null;
  urlAfter?: string | null;
  stateChanged: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCost?: number | null;
  durationMs?: number | null;
  startedAt?: Date;
  completedAt?: Date;
}) {
  return prisma.browserAgentStep.upsert({
    where: { runId_sequence: { runId: input.runId, sequence: input.sequence } },
    create: {
      runId: input.runId,
      sequence: input.sequence,
      observationJson: input.observationJson,
      proposedActionJson: input.proposedActionJson,
      validationStatus: input.validationStatus,
      safetyDecisionJson: input.safetyDecisionJson,
      executionStatus: input.executionStatus,
      executionResultJson: input.executionResultJson,
      urlBefore: input.urlBefore ?? null,
      urlAfter: input.urlAfter ?? null,
      stateChanged: input.stateChanged,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      estimatedCost: typeof input.estimatedCost === "number" ? input.estimatedCost.toString() : null,
      durationMs: input.durationMs ?? null,
      startedAt: input.startedAt ?? new Date(),
      completedAt: input.completedAt ?? new Date()
    },
    update: {
      observationJson: input.observationJson,
      proposedActionJson: input.proposedActionJson,
      validationStatus: input.validationStatus,
      safetyDecisionJson: input.safetyDecisionJson,
      executionStatus: input.executionStatus,
      executionResultJson: input.executionResultJson,
      urlBefore: input.urlBefore ?? null,
      urlAfter: input.urlAfter ?? null,
      stateChanged: input.stateChanged,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      estimatedCost: typeof input.estimatedCost === "number" ? input.estimatedCost.toString() : null,
      durationMs: input.durationMs ?? null,
      completedAt: input.completedAt ?? new Date()
    }
  });
}

export async function completeBrowserAgentRun(input: {
  runId: string;
  status: BrowserAgentRunStatus;
  terminalReason: BrowserAgentTerminalReason;
  summary: string;
  finalUrl?: string | null;
  stepsUsed: number;
  providerCalls: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCost?: number | null;
}) {
  return prisma.browserAgentRun.update({
    where: { id: input.runId },
    data: {
      status: input.status,
      terminalReason: input.terminalReason,
      summary: input.summary,
      finalUrl: input.finalUrl ?? null,
      stepsUsed: input.stepsUsed,
      providerCalls: input.providerCalls,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      estimatedCost: typeof input.estimatedCost === "number" ? input.estimatedCost.toString() : null,
      completedAt: new Date()
    }
  });
}

export async function planAuditMissionRecords(auditId: string, mode: "preview" | "standard" = "standard") {
  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) {
    throw new DomainError("AUDIT_NOT_FOUND", `Audit not found: ${auditId}`, "Audit was not found.");
  }
  const definitions = planAuditMissions({ auditId, targetUrl: audit.targetUrl, mode });
  const missions = [];
  for (const definition of definitions) {
    missions.push(
      await prisma.mission.upsert({
        where: { auditId_type: { auditId, type: definition.type } },
        create: {
          auditId,
          type: definition.type,
          role: definition.role,
          objective: definition.objective,
          priority: definition.priority,
          required: definition.required,
          maxAttempts: definition.maxAttempts,
          timeoutMs: definition.timeoutMs,
          instructions: { viewport: definition.viewport, limits: definition.limits }
        },
        update: {}
      })
    );
  }
  return missions;
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {});
}

export async function finalizeAuditIfReady(auditId: string) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: { missions: true, findings: true, report: true }
  });
  if (!audit) {
    throw new DomainError("AUDIT_NOT_FOUND", `Audit not found: ${auditId}`, "Audit was not found.");
  }
  const status = toSharedAuditStatus(audit.status);
  if (status === "completed" || status === "failed" || status === "cancelled") {
    return { finalized: true, status };
  }

  const terminalMissionStatuses = new Set(["COMPLETED", "FAILED", "CANCELLED", "SKIPPED"]);
  if (audit.missions.some((mission) => !terminalMissionStatuses.has(mission.status))) {
    return { finalized: false, status };
  }

  const requiredFailures = audit.missions.filter((mission) => mission.required && mission.status === "FAILED");
  const allFailed = audit.missions.length > 0 && audit.missions.every((mission) => mission.status === "FAILED");
  const warnings = audit.missions
    .filter((mission) => !mission.required && mission.status === "FAILED")
    .map((mission) => `${mission.role} failed: ${mission.failureReason ?? "unknown reason"}`);

  if (requiredFailures.length > 0 || allFailed) {
    const reason = requiredFailures[0]?.failureReason ?? "All missions failed.";
    await transitionAuditStatus(auditId, "failed", { failureReason: reason });
    return { finalized: true, status: "failed" as const };
  }

  await transitionAuditStatus(auditId, "analyzing");
  await transitionAuditStatus(auditId, "generating_report");

  const refreshedFindings = await prisma.finding.findMany({ where: { auditId }, orderBy: { createdAt: "asc" } });
  const severityCounts = countBy(refreshedFindings.map((finding) => finding.severity.toLowerCase()));
  const categoryCounts = countBy(refreshedFindings.map((finding) => finding.category.toLowerCase()));
  const missionSummary = {
    totalMissions: audit.missions.length,
    completedMissions: audit.missions.filter((mission) => mission.status === "COMPLETED").length,
    failedMissions: audit.missions.filter((mission) => mission.status === "FAILED").length,
    skippedMissions: audit.missions.filter((mission) => mission.status === "SKIPPED").length,
    findings: refreshedFindings.length,
    warnings
  };
  const overallScore = calculateReportScore({
    critical: severityCounts.critical ?? 0,
    high: severityCounts.high ?? 0,
    medium: severityCounts.medium ?? 0,
    low: severityCounts.low ?? 0
  });

  await prisma.report.upsert({
    where: { auditId },
    create: {
      auditId,
      targetUrl: audit.targetUrl,
      overallScore,
      severityCounts,
      categoryCounts,
      missionSummary,
      executionWarnings: warnings,
      topFindings: refreshedFindings.slice(0, 5).map((finding) => ({
        id: finding.id,
        title: finding.title,
        severity: finding.severity.toLowerCase()
      })),
      limitations: [
        "Deterministic Phase 2 scan only.",
        "No authenticated workflows, payments, or user-defined scripts were executed.",
        "Score is a product quality signal, not a security or compliance certification."
      ]
    },
    update: {
      generatedAt: new Date(),
      overallScore,
      severityCounts,
      categoryCounts,
      missionSummary,
      executionWarnings: warnings,
      topFindings: refreshedFindings.slice(0, 5).map((finding) => ({
        id: finding.id,
        title: finding.title,
        severity: finding.severity.toLowerCase()
      }))
    }
  });

  const totalBrowserDuration = await prisma.browserSession.aggregate({
    where: { mission: { auditId } },
    _sum: { browserDurationMs: true }
  });

  await transitionAuditStatus(auditId, "completed", {
    browserDurationMs: totalBrowserDuration._sum.browserDurationMs ?? 0,
    actualCost: 0
  });
  await prisma.audit.update({ where: { id: auditId }, data: { executionSummary: missionSummary } });
  return { finalized: true, status: "completed" as const };
}

export async function getAuditSummary(auditId: string, options: { workspaceId?: string } = {}) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      project: true,
      findings: true,
      missions: { orderBy: { priority: "asc" } },
      report: true,
      plan: true,
      browserAgentRuns: {
        orderBy: { startedAt: "asc" },
        include: { steps: { orderBy: { sequence: "asc" } } }
      },
      browserSwarmRuns: {
        orderBy: { startedAt: "asc" },
        include: { agents: { orderBy: { priority: "asc" } } }
      }
    }
  });

  if (!audit) {
    throw new DomainError("AUDIT_NOT_FOUND", `Audit not found: ${auditId}`, "Audit was not found.");
  }
  if (options.workspaceId && audit.project.organizationId !== options.workspaceId) {
    throw new DomainError("AUDIT_ACCESS_DENIED", "Audit is outside the current workspace.", "Audit is not available.");
  }

  const missions = audit.missions.map((mission) => ({
    id: mission.id,
    type: mission.type,
    role: mission.role,
    objective: mission.objective,
    required: mission.required,
    status: toSharedMissionStatus(mission.status),
    attemptCount: mission.attemptCount,
    maxAttempts: mission.maxAttempts,
    timeoutMs: mission.timeoutMs,
    startedAt: mission.startedAt?.toISOString() ?? null,
    completedAt: mission.completedAt?.toISOString() ?? null,
    failedAt: mission.failedAt?.toISOString() ?? null,
    failureReason: mission.failureReason,
    resultSummary: mission.resultSummary,
    planning: (mission.instructions as { planning?: unknown }).planning ?? null,
    findingCount: audit.findings.filter((finding) => (finding.sourceMissions as string[]).includes(mission.id)).length
  }));
  const progress = {
    total: missions.length,
    queued: missions.filter((mission) => mission.status === "queued").length,
    running: missions.filter((mission) => mission.status === "running").length,
    completed: missions.filter((mission) => mission.status === "completed").length,
    failed: missions.filter((mission) => mission.status === "failed").length,
    skipped: missions.filter((mission) => mission.status === "skipped").length
  };

  return {
    audit: {
      id: audit.id,
      targetUrl: audit.targetUrl,
      status: toSharedAuditStatus(audit.status),
      createdAt: audit.createdAt.toISOString(),
      queuedAt: audit.queuedAt?.toISOString() ?? null,
      startedAt: audit.startedAt?.toISOString() ?? null,
      completedAt: audit.completedAt?.toISOString() ?? null,
      failedAt: audit.failedAt?.toISOString() ?? null,
      failureReason: audit.failureReason,
      browserDurationMs: audit.browserDurationMs,
      findingCount: audit.findings.length
    },
    missions,
    progress,
    report: audit.report
      ? {
          overallScore: audit.report.overallScore,
          generatedAt: audit.report.generatedAt.toISOString(),
          severityCounts: audit.report.severityCounts,
          categoryCounts: audit.report.categoryCounts,
          missionSummary: audit.report.missionSummary,
          executionWarnings: audit.report.executionWarnings,
          topFindings: audit.report.topFindings,
          limitations: audit.report.limitations
        }
      : null,
    planning: audit.plan
      ? {
          mode: audit.plan.mode,
          source: audit.plan.source,
          status: audit.plan.status,
          websiteType: audit.plan.websiteClassification,
          confidence: audit.plan.classificationConfidence ? Number(audit.plan.classificationConfidence) : null,
          provider: audit.plan.provider,
          model: audit.plan.model,
          promptId: audit.plan.promptId,
          promptVersion: audit.plan.promptVersion,
          inputTokens: audit.plan.inputTokens,
          outputTokens: audit.plan.outputTokens,
          estimatedCostUsd: audit.plan.estimatedCost ? Number(audit.plan.estimatedCost) : null,
          durationMs: audit.plan.durationMs,
          fallbackReason: audit.plan.fallbackReason,
          warnings: audit.plan.warningsJson,
          importantJourneys: audit.plan.importantJourneysJson
      }
      : null,
    browserAgentRuns: audit.browserAgentRuns.map((run) => ({
      id: run.id,
      auditId: run.auditId,
      missionId: run.missionId,
      status: run.status,
      provider: run.provider,
      model: run.model,
      promptId: run.promptId,
      promptVersion: run.promptVersion,
      objective: run.objective,
      startUrl: run.startUrl,
      finalUrl: run.finalUrl,
      maxSteps: run.maxSteps,
      stepsUsed: run.stepsUsed,
      providerCalls: run.providerCalls,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      estimatedCostUsd: run.estimatedCost ? Number(run.estimatedCost) : null,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      terminalReason: run.terminalReason,
      summary: run.summary,
      steps: run.steps.map((step) => {
        const action = step.proposedActionJson as { tool?: string; targetId?: string; reason?: string; summary?: string };
        const safety = step.safetyDecisionJson as { allowed?: boolean; code?: string; reason?: string; warnings?: string[] };
        const result = step.executionResultJson as {
          status?: string;
          summary?: string;
          evidenceIds?: string[];
          metrics?: Record<string, number>;
        };
        return {
          id: step.id,
          sequence: step.sequence,
          proposedTool: action.tool ?? "unknown",
          targetId: action.targetId ?? null,
          reason: action.reason ?? action.summary ?? null,
          validationStatus: step.validationStatus,
          safetyAllowed: Boolean(safety.allowed),
          rejectionCode: safety.code ?? null,
          rejectionReason: safety.reason ?? null,
          executionStatus: step.executionStatus,
          executionSummary: result.summary ?? null,
          urlBefore: step.urlBefore,
          urlAfter: step.urlAfter,
          stateChanged: step.stateChanged,
          evidenceIds: result.evidenceIds ?? [],
          durationMs: step.durationMs,
          inputTokens: step.inputTokens,
          outputTokens: step.outputTokens,
          estimatedCostUsd: step.estimatedCost ? Number(step.estimatedCost) : null
        };
      })
    })),
    browserSwarmRuns: audit.browserSwarmRuns.map((run) => ({
      id: run.id,
      auditId: run.auditId,
      status: run.status,
      mode: run.mode,
      maxAgents: run.maxAgents,
      maxConcurrency: run.maxConcurrency,
      agentsCreated: run.agentsCreated,
      agentsCompleted: run.agentsCompleted,
      totalSteps: run.totalSteps,
      totalProviderCalls: run.totalProviderCalls,
      totalInputTokens: run.totalInputTokens,
      totalOutputTokens: run.totalOutputTokens,
      estimatedCostUsd: run.estimatedCost ? Number(run.estimatedCost) : null,
      coverageState: run.coverageStateJson,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      terminalReason: run.terminalReason,
      summary: run.summary,
      agents: run.agents.map((agent) => ({
        id: agent.id,
        missionId: agent.missionId,
        browserAgentRunId: agent.browserAgentRunId,
        role: agent.role,
        objective: agent.objective,
        status: agent.status,
        priority: agent.priority,
        routesVisited: agent.routesVisitedJson,
        findingsCount: agent.findingsCount,
        stepsUsed: agent.stepsUsed,
        startedAt: agent.startedAt?.toISOString() ?? null,
        completedAt: agent.completedAt?.toISOString() ?? null,
        terminalReason: agent.terminalReason
      }))
    }))
  };
}

export async function getAuditFindings(auditId: string, options: { workspaceId?: string } = {}) {
  if (options.workspaceId) {
    const audit = await prisma.audit.findFirst({
      where: { id: auditId, project: { organizationId: options.workspaceId } },
      select: { id: true }
    });
    if (!audit) {
      throw new DomainError("AUDIT_ACCESS_DENIED", "Audit is outside the current workspace.", "Audit is not available.");
    }
  }
  const findings = await prisma.finding.findMany({
    where: { auditId },
    orderBy: [{ severity: "asc" }, { createdAt: "asc" }],
    include: { evidence: true }
  });

  return findings.map((finding) => ({
    id: finding.id,
    category: finding.category.toLowerCase(),
    severity: finding.severity.toLowerCase(),
    title: finding.title,
    summary: finding.summary,
    description: finding.description,
    affectedUrl: finding.affectedUrl,
    stepsToReproduce: finding.stepsToReproduce,
    expectedBehavior: finding.expectedBehavior,
    actualBehavior: finding.actualBehavior,
    confidence: Number(finding.confidence),
    fingerprint: finding.fingerprint,
    sourceMissions: finding.sourceMissions,
    sourceMissionTypes: finding.sourceMissionTypes,
    occurrenceCount: finding.occurrenceCount,
    evidence: finding.evidence.map((evidence) => ({
      id: evidence.id,
      type: evidence.type,
      content: evidence.content,
      localPath: evidence.localPath,
      storageProvider: evidence.storageProvider,
      storageBucket: evidence.storageBucket,
      storagePath: evidence.storagePath,
      storageContentType: evidence.storageContentType,
      storageSizeBytes: evidence.storageSizeBytes,
      publicEvidenceId: evidence.publicEvidenceId,
      externalSharingEnabled: evidence.externalSharingEnabled,
      metadata: evidence.metadata,
      createdAt: evidence.createdAt.toISOString()
    }))
  }));
}
