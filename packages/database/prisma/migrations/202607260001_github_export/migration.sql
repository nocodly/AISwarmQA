CREATE TYPE "GitHubAccountType" AS ENUM ('USER', 'ORGANIZATION');

CREATE TYPE "GitHubExportStatus" AS ENUM ('QUEUED', 'CREATING', 'CREATED', 'FAILED', 'SKIPPED');

CREATE TYPE "GitHubExportBatchStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "GitHubConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubAccountId" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "accountType" "GitHubAccountType" NOT NULL,
    "installationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GitHubConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GitHubRepository" (
    "id" TEXT NOT NULL,
    "githubConnectionId" TEXT NOT NULL,
    "githubRepositoryId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "defaultBranch" TEXT,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "issuesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubRepository_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GitHubExportBatch" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubConnectionId" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GitHubExportBatchStatus" NOT NULL DEFAULT 'QUEUED',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GitHubExportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FindingGitHubExport" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "auditId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "githubConnectionId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubIssueNumber" INTEGER,
    "githubIssueUrl" TEXT,
    "status" "GitHubExportStatus" NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FindingGitHubExport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GitHubConnection_workspaceId_installationId_key" ON "GitHubConnection"("workspaceId", "installationId");
CREATE INDEX "GitHubConnection_workspaceId_idx" ON "GitHubConnection"("workspaceId");
CREATE INDEX "GitHubConnection_userId_idx" ON "GitHubConnection"("userId");

CREATE UNIQUE INDEX "GitHubRepository_githubConnectionId_githubRepositoryId_key" ON "GitHubRepository"("githubConnectionId", "githubRepositoryId");
CREATE UNIQUE INDEX "GitHubRepository_githubConnectionId_fullName_key" ON "GitHubRepository"("githubConnectionId", "fullName");
CREATE INDEX "GitHubRepository_fullName_idx" ON "GitHubRepository"("fullName");

CREATE INDEX "GitHubExportBatch_auditId_idx" ON "GitHubExportBatch"("auditId");
CREATE INDEX "GitHubExportBatch_repositoryId_idx" ON "GitHubExportBatch"("repositoryId");
CREATE INDEX "GitHubExportBatch_githubConnectionId_idx" ON "GitHubExportBatch"("githubConnectionId");
CREATE INDEX "GitHubExportBatch_status_idx" ON "GitHubExportBatch"("status");

CREATE UNIQUE INDEX "FindingGitHubExport_idempotencyKey_key" ON "FindingGitHubExport"("idempotencyKey");
CREATE INDEX "FindingGitHubExport_auditId_idx" ON "FindingGitHubExport"("auditId");
CREATE INDEX "FindingGitHubExport_findingId_idx" ON "FindingGitHubExport"("findingId");
CREATE INDEX "FindingGitHubExport_repositoryId_idx" ON "FindingGitHubExport"("repositoryId");
CREATE INDEX "FindingGitHubExport_batchId_idx" ON "FindingGitHubExport"("batchId");
CREATE INDEX "FindingGitHubExport_status_idx" ON "FindingGitHubExport"("status");

ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GitHubRepository" ADD CONSTRAINT "GitHubRepository_githubConnectionId_fkey" FOREIGN KEY ("githubConnectionId") REFERENCES "GitHubConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GitHubExportBatch" ADD CONSTRAINT "GitHubExportBatch_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitHubExportBatch" ADD CONSTRAINT "GitHubExportBatch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitHubRepository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GitHubExportBatch" ADD CONSTRAINT "GitHubExportBatch_githubConnectionId_fkey" FOREIGN KEY ("githubConnectionId") REFERENCES "GitHubConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GitHubExportBatch" ADD CONSTRAINT "GitHubExportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FindingGitHubExport" ADD CONSTRAINT "FindingGitHubExport_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GitHubExportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FindingGitHubExport" ADD CONSTRAINT "FindingGitHubExport_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FindingGitHubExport" ADD CONSTRAINT "FindingGitHubExport_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FindingGitHubExport" ADD CONSTRAINT "FindingGitHubExport_githubConnectionId_fkey" FOREIGN KEY ("githubConnectionId") REFERENCES "GitHubConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FindingGitHubExport" ADD CONSTRAINT "FindingGitHubExport_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitHubRepository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FindingGitHubExport" ADD CONSTRAINT "FindingGitHubExport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
