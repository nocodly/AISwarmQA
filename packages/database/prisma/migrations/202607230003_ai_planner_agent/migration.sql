CREATE TABLE "AuditPlan" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "promptId" TEXT,
    "promptVersion" TEXT,
    "baselinePlanJson" JSONB NOT NULL,
    "snapshotJson" JSONB,
    "proposedPlanJson" JSONB,
    "acceptedPlanJson" JSONB,
    "rejectedProposalsJson" JSONB NOT NULL,
    "importantJourneysJson" JSONB NOT NULL,
    "websiteClassification" TEXT,
    "classificationConfidence" DECIMAL(65,30),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedInputCost" DECIMAL(65,30),
    "estimatedOutputCost" DECIMAL(65,30),
    "estimatedCost" DECIMAL(65,30),
    "durationMs" INTEGER,
    "fallbackReason" TEXT,
    "warningsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditPlan_auditId_key" ON "AuditPlan"("auditId");

ALTER TABLE "AuditPlan" ADD CONSTRAINT "AuditPlan_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
