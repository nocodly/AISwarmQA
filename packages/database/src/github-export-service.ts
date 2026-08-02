import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { DomainError } from "./audit-service";

export async function getDevelopmentActor() {
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
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    create: { organizationId: organization.id, userId: user.id, role: "owner" },
    update: {}
  });
  return { user, organization };
}

export async function ensureMockGitHubRepository() {
  const { user, organization } = await getDevelopmentActor();
  const connection = await prisma.gitHubConnection.upsert({
    where: { workspaceId_installationId: { workspaceId: organization.id, installationId: "mock-installation" } },
    create: {
      workspaceId: organization.id,
      userId: user.id,
      githubAccountId: "mock-account",
      githubLogin: "mock-owner",
      accountType: "USER",
      installationId: "mock-installation"
    },
    update: { revokedAt: null }
  });
  const repository = await prisma.gitHubRepository.upsert({
    where: { githubConnectionId_fullName: { githubConnectionId: connection.id, fullName: "mock-owner/mock-repo" } },
    create: {
      githubConnectionId: connection.id,
      githubRepositoryId: "mock-repo",
      owner: "mock-owner",
      name: "mock-repo",
      fullName: "mock-owner/mock-repo",
      defaultBranch: "main",
      private: true,
      issuesEnabled: true,
      archived: false,
      lastSyncedAt: new Date()
    },
    update: {
      issuesEnabled: true,
      archived: false,
      lastSyncedAt: new Date()
    }
  });
  return { connection, repository };
}

export async function listGitHubRepositoriesForDevelopment(options: { includeMock?: boolean; workspaceId?: string } = {}) {
  if (options.includeMock) {
    await ensureMockGitHubRepository();
  }
  const { organization } = options.workspaceId ? { organization: { id: options.workspaceId } } : await getDevelopmentActor();
  return prisma.gitHubRepository.findMany({
    where: {
      githubConnection: {
        workspaceId: organization.id,
        revokedAt: null
      }
    },
    include: { githubConnection: true },
    orderBy: { fullName: "asc" }
  });
}

export async function getGitHubConnectionStatus(options: { includeMock?: boolean; workspaceId?: string } = {}) {
  const repositories = await listGitHubRepositoriesForDevelopment(options);
  return {
    connected: repositories.length > 0,
    repositories: repositories.map((repository) => ({
      id: repository.id,
      fullName: repository.fullName,
      owner: repository.owner,
      name: repository.name,
      private: repository.private,
      issuesEnabled: repository.issuesEnabled,
      archived: repository.archived,
      connectionId: repository.githubConnectionId,
      accountLogin: repository.githubConnection.githubLogin,
      accountType: repository.githubConnection.accountType.toLowerCase()
    }))
  };
}

export async function getCompletedAuditForExport(auditId: string, options: { workspaceId?: string } = {}) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      project: true,
      findings: { include: { evidence: true }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!audit) {
    throw new DomainError("AUDIT_NOT_FOUND", `Audit not found: ${auditId}`, "Audit was not found.");
  }
  if (audit.status !== "COMPLETED") {
    throw new DomainError("AUDIT_NOT_COMPLETED", "Only completed audits can be exported.", "Only completed audits can be exported.");
  }
  if (options.workspaceId && audit.project.organizationId !== options.workspaceId) {
    throw new DomainError("AUDIT_ACCESS_DENIED", "Audit is outside the current workspace.", "Audit is not available.");
  }
  return audit;
}

export async function getRepositoryForExport(repositoryId: string, options: { workspaceId?: string } = {}) {
  const { organization } = options.workspaceId ? { organization: { id: options.workspaceId } } : await getDevelopmentActor();
  const repository = await prisma.gitHubRepository.findFirst({
    where: {
      id: repositoryId,
      githubConnection: {
        workspaceId: organization.id,
        revokedAt: null
      }
    },
    include: { githubConnection: true }
  });
  if (!repository) {
    throw new DomainError("GITHUB_REPOSITORY_NOT_FOUND", "GitHub repository was not found or is not authorized.", "GitHub repository was not found.");
  }
  if (!repository.issuesEnabled) {
    throw new DomainError("GITHUB_ISSUES_DISABLED", "GitHub Issues are disabled for this repository.", "GitHub Issues are disabled for this repository.");
  }
  if (repository.archived) {
    throw new DomainError("GITHUB_REPOSITORY_ARCHIVED", "GitHub repository is archived.", "GitHub repository is archived.");
  }
  return repository;
}

export async function createGitHubAuthState(input: { stateHash: string; returnUrl: string; expiresAt: Date; userId?: string; workspaceId?: string }) {
  const { user, organization } =
    input.userId && input.workspaceId ? { user: { id: input.userId }, organization: { id: input.workspaceId } } : await getDevelopmentActor();
  return prisma.gitHubAuthState.create({
    data: {
      stateHash: input.stateHash,
      userId: user.id,
      workspaceId: organization.id,
      returnUrl: input.returnUrl,
      expiresAt: input.expiresAt
    }
  });
}

export async function consumeGitHubAuthState(input: { stateHash: string }) {
  const state = await prisma.gitHubAuthState.findUnique({ where: { stateHash: input.stateHash } });
  if (!state) {
    throw new DomainError("GITHUB_STATE_INVALID", "GitHub state was not found.", "GitHub connection state is invalid.");
  }
  if (state.consumedAt) {
    throw new DomainError("GITHUB_STATE_REPLAYED", "GitHub state was already consumed.", "GitHub connection state was already used.");
  }
  if (state.expiresAt.getTime() < Date.now()) {
    throw new DomainError("GITHUB_STATE_EXPIRED", "GitHub state expired.", "GitHub connection state expired.");
  }
  return prisma.gitHubAuthState.update({
    where: { id: state.id },
    data: { consumedAt: new Date() }
  });
}

export async function upsertGitHubInstallation(input: {
  workspaceId: string;
  userId: string;
  installationId: string;
  githubAccountId: string;
  githubLogin: string;
  accountType: "USER" | "ORGANIZATION";
}) {
  return prisma.gitHubConnection.upsert({
    where: { workspaceId_installationId: { workspaceId: input.workspaceId, installationId: input.installationId } },
    create: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      installationId: input.installationId,
      githubAccountId: input.githubAccountId,
      githubLogin: input.githubLogin,
      accountType: input.accountType
    },
    update: {
      githubAccountId: input.githubAccountId,
      githubLogin: input.githubLogin,
      accountType: input.accountType,
      revokedAt: null
    }
  });
}

export async function syncGitHubRepositories(input: {
  connectionId: string;
  repositories: Array<{
    githubRepositoryId: string;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string | null;
    private: boolean;
    issuesEnabled: boolean;
    archived: boolean;
  }>;
}) {
  const seen = new Set<string>();
  for (const repository of input.repositories) {
    seen.add(repository.githubRepositoryId);
    await prisma.gitHubRepository.upsert({
      where: { githubConnectionId_githubRepositoryId: { githubConnectionId: input.connectionId, githubRepositoryId: repository.githubRepositoryId } },
      create: {
        githubConnectionId: input.connectionId,
        githubRepositoryId: repository.githubRepositoryId,
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        private: repository.private,
        issuesEnabled: repository.issuesEnabled,
        archived: repository.archived,
        lastSyncedAt: new Date()
      },
      update: {
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        private: repository.private,
        issuesEnabled: repository.issuesEnabled,
        archived: repository.archived,
        lastSyncedAt: new Date()
      }
    });
  }
  await prisma.gitHubRepository.updateMany({
    where: {
      githubConnectionId: input.connectionId,
      githubRepositoryId: { notIn: [...seen] }
    },
    data: { issuesEnabled: false, archived: true, lastSyncedAt: new Date() }
  });
}

export async function getActiveGitHubConnectionByInstallation(installationId: string) {
  return prisma.gitHubConnection.findFirst({
    where: {
      installationId,
      revokedAt: null
    },
    select: {
      id: true,
      workspaceId: true,
      userId: true
    }
  });
}

export async function markGitHubInstallationRevoked(installationId: string) {
  return prisma.gitHubConnection.updateMany({
    where: { installationId },
    data: { revokedAt: new Date() }
  });
}

export async function disconnectGitHubConnectionsForWorkspace(workspaceId: string) {
  return prisma.gitHubConnection.updateMany({
    where: { workspaceId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function recordGitHubWebhookDelivery(input: { deliveryId: string; event: string; action?: string | null }) {
  try {
    await prisma.gitHubWebhookDelivery.create({
      data: {
        deliveryId: input.deliveryId,
        event: input.event,
        action: input.action ?? null
      }
    });
    return { duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { duplicate: true };
    }
    throw error;
  }
}

export function toIssueFinding(finding: Awaited<ReturnType<typeof getCompletedAuditForExport>>["findings"][number]) {
  return {
    id: finding.id,
    auditId: finding.auditId,
    title: finding.title,
    summary: finding.summary,
    description: finding.description,
    severity: finding.severity.toLowerCase(),
    category: finding.category.toLowerCase(),
    affectedUrl: finding.affectedUrl,
    stepsToReproduce: finding.stepsToReproduce as string[],
    expectedBehavior: finding.expectedBehavior,
    actualBehavior: finding.actualBehavior,
    confidence: Number(finding.confidence),
    sourceMissionTypes: finding.sourceMissionTypes as string[],
    occurrenceCount: finding.occurrenceCount,
    evidence: finding.evidence.map((evidence) => ({
      id: evidence.publicEvidenceId ?? evidence.id,
      type: evidence.type,
      content: evidence.content,
      localPath: evidence.storagePath && evidence.externalSharingEnabled && !evidence.revokedAt ? evidence.storagePath : null,
      metadata: evidence.metadata
    }))
  };
}

export async function createGitHubExportBatch(input: {
  auditId: string;
  repositoryId: string;
  findingIds: string[];
  idempotencyKeys: Map<string, string>;
  exportOptions?: {
    labelNames?: string[];
    assignees?: string[];
    milestoneNumber?: number;
    createMissingLabels?: boolean;
    includeExternalEvidence?: boolean;
  };
  actor?: { userId: string; workspaceId: string };
}) {
  const { user, organization } = input.actor
    ? { user: { id: input.actor.userId }, organization: { id: input.actor.workspaceId } }
    : await getDevelopmentActor();
  const audit = await getCompletedAuditForExport(input.auditId, { workspaceId: organization.id });
  if (audit.project.organizationId !== organization.id) {
    throw new DomainError("AUDIT_ACCESS_DENIED", "Audit is outside the current workspace.", "Audit is not available.");
  }
  const repository = await getRepositoryForExport(input.repositoryId, { workspaceId: organization.id });
  const selectedFindings = audit.findings.filter((finding) => input.findingIds.includes(finding.id));
  if (selectedFindings.length !== input.findingIds.length) {
    throw new DomainError("FINDING_ACCESS_DENIED", "One or more findings are not part of this audit.", "One or more findings are not available.");
  }

  return prisma.$transaction(async (tx) => {
    const batch = await tx.gitHubExportBatch.create({
      data: {
        auditId: audit.id,
        repositoryId: repository.id,
        githubConnectionId: repository.githubConnectionId,
        requestedCount: selectedFindings.length,
        exportOptionsJson: jsonInput(input.exportOptions ?? {}),
        createdByUserId: user.id
      }
    });

    for (const finding of selectedFindings) {
      const idempotencyKey = input.idempotencyKeys.get(finding.id);
      if (!idempotencyKey) {
        throw new DomainError("IDEMPOTENCY_KEY_MISSING", "Missing GitHub export idempotency key.", "Export could not be prepared.");
      }
      const existingExport = await tx.findingGitHubExport.findUnique({
        where: { idempotencyKey },
        select: { id: true, status: true, githubIssueUrl: true }
      });

      if (!existingExport) {
        await tx.findingGitHubExport.create({
          data: {
            batchId: batch.id,
            auditId: audit.id,
            findingId: finding.id,
            githubConnectionId: repository.githubConnectionId,
            repositoryId: repository.id,
            idempotencyKey,
            createdByUserId: user.id,
            status: "QUEUED"
          }
        });
        continue;
      }

      if (existingExport.status === "CREATED" && existingExport.githubIssueUrl) {
        await tx.findingGitHubExport.update({
          where: { id: existingExport.id },
          data: { batchId: batch.id }
        });
        continue;
      }

      await tx.findingGitHubExport.update({
        where: { id: existingExport.id },
        data: {
          batchId: batch.id,
          status: "QUEUED",
          errorCode: null,
          errorMessage: null
        }
      });
    }

    return tx.gitHubExportBatch.findUniqueOrThrow({
      where: { id: batch.id },
      include: { exports: true, repository: true, githubConnection: true }
    });
  });
}

export async function listExistingGitHubExportsByIdempotencyKeys(idempotencyKeys: string[]) {
  if (idempotencyKeys.length === 0) return [];
  return prisma.findingGitHubExport.findMany({
    where: { idempotencyKey: { in: idempotencyKeys } },
    select: {
      findingId: true,
      idempotencyKey: true,
      status: true,
      githubIssueNumber: true,
      githubIssueUrl: true,
      errorCode: true
    }
  });
}

export async function getGitHubExportBatch(batchId: string, options: { workspaceId?: string } = {}) {
  const { organization } = options.workspaceId ? { organization: { id: options.workspaceId } } : await getDevelopmentActor();
  const batch = await prisma.gitHubExportBatch.findFirst({
    where: {
      id: batchId,
      githubConnection: { workspaceId: organization.id }
    },
    include: {
      repository: true,
      githubConnection: true,
      exports: {
        include: { finding: { include: { evidence: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!batch) {
    throw new DomainError("GITHUB_EXPORT_BATCH_NOT_FOUND", "GitHub export batch was not found.", "GitHub export was not found.");
  }
  return batch;
}

export async function markGitHubExportBatchRunning(batchId: string) {
  return prisma.gitHubExportBatch.update({
    where: { id: batchId },
    data: { status: "RUNNING" }
  });
}

export async function markFindingGitHubExportCreating(exportId: string) {
  return prisma.findingGitHubExport.update({
    where: { id: exportId },
    data: { status: "CREATING", errorCode: null, errorMessage: null }
  });
}

export async function markFindingGitHubExportCreated(input: { exportId: string; issueNumber: number; issueUrl: string }) {
  return prisma.findingGitHubExport.update({
    where: { id: input.exportId },
    data: {
      status: "CREATED",
      githubIssueNumber: input.issueNumber,
      githubIssueUrl: input.issueUrl,
      errorCode: null,
      errorMessage: null
    }
  });
}

export async function markFindingGitHubExportSkipped(input: { exportId: string; issueNumber?: number; issueUrl?: string; reason: string }) {
  return prisma.findingGitHubExport.update({
    where: { id: input.exportId },
    data: {
      status: "SKIPPED",
      githubIssueNumber: input.issueNumber ?? null,
      githubIssueUrl: input.issueUrl ?? null,
      errorCode: "ALREADY_EXPORTED",
      errorMessage: input.reason.slice(0, 500)
    }
  });
}

export async function markFindingGitHubExportFailed(input: { exportId: string; errorCode: string; errorMessage: string }) {
  return prisma.findingGitHubExport.update({
    where: { id: input.exportId },
    data: {
      status: "FAILED",
      errorCode: input.errorCode,
      errorMessage: input.errorMessage.slice(0, 500)
    }
  });
}

export async function finalizeGitHubExportBatch(batchId: string) {
  const exports = await prisma.findingGitHubExport.findMany({ where: { batchId } });
  const createdCount = exports.filter((item) => item.status === "CREATED").length;
  const failedCount = exports.filter((item) => item.status === "FAILED").length;
  const skippedCount = exports.filter((item) => item.status === "SKIPPED").length;
  const status = failedCount === 0 ? "COMPLETED" : createdCount > 0 || skippedCount > 0 ? "PARTIALLY_COMPLETED" : "FAILED";
  return prisma.gitHubExportBatch.update({
    where: { id: batchId },
    data: {
      createdCount,
      failedCount,
      skippedCount,
      status,
      completedAt: new Date()
    }
  });
}

export async function resetFailedGitHubExportsForRetry(batchId: string, options: { workspaceId?: string } = {}) {
  const batch = await getGitHubExportBatch(batchId, options);
  await prisma.findingGitHubExport.updateMany({
    where: {
      batchId,
      status: "FAILED"
    },
    data: {
      status: "QUEUED",
      errorCode: null,
      errorMessage: null
    }
  });
  await prisma.gitHubExportBatch.update({
    where: { id: batchId },
    data: {
      status: "QUEUED",
      completedAt: null
    }
  });
  return batch;
}

export function jsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
