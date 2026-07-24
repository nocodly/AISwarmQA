CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE');
CREATE TYPE "AuditStatus" AS ENUM ('CREATED', 'VALIDATING', 'QUEUED', 'PLANNING', 'RUNNING', 'ANALYZING', 'GENERATING_REPORT', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "MissionStatus" AS ENUM ('CREATED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "BrowserSessionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "FindingCategory" AS ENUM ('FUNCTIONAL', 'ACCESSIBILITY', 'PERFORMANCE', 'UX', 'SECURITY', 'NETWORK', 'CONSOLE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Audit" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "status" "AuditStatus" NOT NULL DEFAULT 'CREATED',
  "correlationId" TEXT NOT NULL,
  "maxSteps" INTEGER NOT NULL,
  "maxCostUsd" DECIMAL(65,30) NOT NULL,
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "actualCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "browserDurationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mission" (
  "id" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" "MissionStatus" NOT NULL DEFAULT 'CREATED',
  "objective" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "instructions" JSONB NOT NULL,
  "failureReason" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrowserSession" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "status" "BrowserSessionStatus" NOT NULL,
  "browser" TEXT NOT NULL,
  "viewportWidth" INTEGER NOT NULL,
  "viewportHeight" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "finalUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrowserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Finding" (
  "id" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "category" "FindingCategory" NOT NULL,
  "severity" "FindingSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "affectedUrl" TEXT NOT NULL,
  "affectedUrls" JSONB NOT NULL,
  "stepsToReproduce" JSONB NOT NULL,
  "expectedBehavior" TEXT NOT NULL,
  "actualBehavior" TEXT NOT NULL,
  "evidenceIds" JSONB NOT NULL,
  "browser" TEXT NOT NULL,
  "viewport" TEXT NOT NULL,
  "confidence" DECIMAL(65,30) NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "sourceMissions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FindingEvidence" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT,
  "localPath" TEXT,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FindingEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "Finding_auditId_fingerprint_idx" ON "Finding"("auditId", "fingerprint");

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrowserSession" ADD CONSTRAINT "BrowserSession_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FindingEvidence" ADD CONSTRAINT "FindingEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
