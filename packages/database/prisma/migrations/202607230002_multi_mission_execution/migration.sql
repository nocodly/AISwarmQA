ALTER TYPE "MissionStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

ALTER TABLE "Audit"
  ADD COLUMN "executionSummary" JSONB;

ALTER TABLE "Mission"
  ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "timeoutMs" INTEGER NOT NULL DEFAULT 45000,
  ADD COLUMN "resultSummary" TEXT,
  ADD COLUMN "failedAt" TIMESTAMP(3);

ALTER TABLE "BrowserSession"
  ADD COLUMN "browserDurationMs" INTEGER;

ALTER TABLE "Finding"
  ADD COLUMN "sourceMissionTypes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "occurrenceCount" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "Mission_auditId_type_key" ON "Mission"("auditId", "type");

CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "overallScore" INTEGER NOT NULL,
  "severityCounts" JSONB NOT NULL,
  "categoryCounts" JSONB NOT NULL,
  "missionSummary" JSONB NOT NULL,
  "executionWarnings" JSONB NOT NULL,
  "topFindings" JSONB NOT NULL,
  "limitations" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Report_auditId_key" ON "Report"("auditId");

ALTER TABLE "Report" ADD CONSTRAINT "Report_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
