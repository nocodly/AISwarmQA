CREATE TABLE "BrowserAgentRun" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptId" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "finalUrl" TEXT,
    "maxSteps" INTEGER NOT NULL,
    "stepsUsed" INTEGER NOT NULL DEFAULT 0,
    "providerCalls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(65,30),
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "terminalReason" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrowserAgentStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "observationJson" JSONB NOT NULL,
    "proposedActionJson" JSONB NOT NULL,
    "validationStatus" TEXT NOT NULL,
    "safetyDecisionJson" JSONB NOT NULL,
    "executionStatus" TEXT NOT NULL,
    "executionResultJson" JSONB NOT NULL,
    "urlBefore" TEXT,
    "urlAfter" TEXT,
    "stateChanged" BOOLEAN NOT NULL DEFAULT false,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(65,30),
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrowserAgentStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrowserAgentRun_missionId_key" ON "BrowserAgentRun"("missionId");
CREATE INDEX "BrowserAgentRun_auditId_idx" ON "BrowserAgentRun"("auditId");
CREATE UNIQUE INDEX "BrowserAgentStep_runId_sequence_key" ON "BrowserAgentStep"("runId", "sequence");
CREATE INDEX "BrowserAgentStep_runId_idx" ON "BrowserAgentStep"("runId");

ALTER TABLE "BrowserAgentRun" ADD CONSTRAINT "BrowserAgentRun_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrowserAgentRun" ADD CONSTRAINT "BrowserAgentRun_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrowserAgentStep" ADD CONSTRAINT "BrowserAgentStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BrowserAgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
