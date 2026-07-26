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
      lastSyncedAt: new Date()
    },
    update: {
      issuesEnabled: true,
      lastSyncedAt: new Date()
    }
  });
  return { connection, repository };
}

export async function listGitHubRepositoriesForDevelopment(options: { includeMock?: boolean } = {}) {
  if (options.includeMock) {
    await ensureMockGitHubRepository();
  }
  const { organization } = await getDevelopmentActor();
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

export async function getGitHubConnectionStatus(options: { includeMock?: boolean } = {}) {
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
      connectionId: repository.githubConnectionId,
      accountLogin: repository.githubConnection.githubLogin,
      accountType: repository.githubConnection.accountType.toLowerCase()
    }))
  };
}

export async function getCompletedAuditForExport(auditId: string) {
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
  return audit;
}

export async function getRepositoryForExport(repositoryId: string) {
  const { organization } = await getDevelopmentActor();
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
  return repository;
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
      id: evidence.id,
      type: evidence.type,
      content: evidence.content,
      localPath: evidence.localPath,
      metadata: evidence.metadata
    }))
  };
}

export async function createGitHubExportBatch(input: {
  auditId: string;
  repositoryId: string;
  findingIds: string[];
  idempotencyKeys: Map<string, string>;
}) {
  const { user, organization } = await getDevelopmentActor();
  const audit = await getCompletedAuditForExport(input.auditId);
  if (audit.project.organizationId !== organization.id) {
    throw new DomainError("AUDIT_ACCESS_DENIED", "Audit is outside the current workspace.", "Audit is not available.");
  }
  const repository = await getRepositoryForExport(input.repositoryId);
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
        createdByUserId: user.id
      }
    });

    for (const finding of selectedFindings) {
      const idempotencyKey = input.idempotencyKeys.get(finding.id);
      if (!idempotencyKey) {
        throw new DomainError("IDEMPOTENCY_KEY_MISSING", "Missing GitHub export idempotency key.", "Export could not be prepared.");
      }
      await tx.findingGitHubExport.upsert({
        where: { idempotencyKey },
        create: {
          batchId: batch.id,
          auditId: audit.id,
          findingId: finding.id,
          githubConnectionId: repository.githubConnectionId,
          repositoryId: repository.id,
          idempotencyKey,
          createdByUserId: user.id,
          status: "QUEUED"
        },
        update: {
          batchId: batch.id
        }
      });
    }

    return tx.gitHubExportBatch.findUniqueOrThrow({
      where: { id: batch.id },
      include: { exports: true, repository: true, githubConnection: true }
    });
  });
}

export async function getGitHubExportBatch(batchId: string) {
  const { organization } = await getDevelopmentActor();
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

export async function resetFailedGitHubExportsForRetry(batchId: string) {
  const batch = await getGitHubExportBatch(batchId);
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
