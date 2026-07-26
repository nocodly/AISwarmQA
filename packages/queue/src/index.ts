import { Queue } from "bullmq";
import {
  executeMissionJobSchema,
  githubExportJobSchema,
  getMissionDefinition,
  planAuditJobSchema,
  type ExecuteMissionJob,
  type GitHubExportJob,
  type PlanAuditJob
} from "@ai-swarm-qa/shared";

export const AUDIT_QUEUE_NAME = "audit-missions";
export const GITHUB_EXPORT_QUEUE_NAME = "github-export";

export type AuditQueueJob = PlanAuditJob | ExecuteMissionJob;

export function createAuditQueue(redisUrl: string): Queue<AuditQueueJob> {
  return new Queue<AuditQueueJob>(AUDIT_QUEUE_NAME, {
    connection: { url: redisUrl }
  });
}

export async function enqueueAuditPlan(queue: Queue<AuditQueueJob>, job: PlanAuditJob): Promise<string> {
  const parsed = planAuditJobSchema.parse(job);
  const queued = await queue.add("plan-audit", parsed, {
    jobId: `plan-${parsed.auditId}`,
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100
  });
  return queued.id ?? parsed.auditId;
}

export function createGitHubExportQueue(redisUrl: string): Queue<GitHubExportJob> {
  return new Queue<GitHubExportJob>(GITHUB_EXPORT_QUEUE_NAME, {
    connection: { url: redisUrl }
  });
}

export async function enqueueGitHubExport(queue: Queue<GitHubExportJob>, job: GitHubExportJob): Promise<string> {
  const parsed = githubExportJobSchema.parse(job);
  const queued = await queue.add("github-export", parsed, {
    jobId: `github-export-${parsed.batchId}`,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 100
  });
  return queued.id ?? parsed.batchId;
}

export async function enqueueMission(queue: Queue<AuditQueueJob>, job: ExecuteMissionJob): Promise<string> {
  const parsed = executeMissionJobSchema.parse(job);
  const definition = getMissionDefinition(parsed.missionType);
  const queued = await queue.add("run-audit", parsed, {
    jobId: `mission-${parsed.missionId}`,
    attempts: definition.maxAttempts,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 100
  });
  return queued.id ?? parsed.auditId;
}

export const enqueueAudit = enqueueMission;
