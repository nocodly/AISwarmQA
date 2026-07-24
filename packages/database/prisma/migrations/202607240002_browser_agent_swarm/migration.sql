DROP INDEX IF EXISTS "BrowserAgentRun_missionId_key";

ALTER TABLE "BrowserAgentRun" ADD COLUMN "swarmAgentId" TEXT;

CREATE UNIQUE INDEX "BrowserAgentRun_swarmAgentId_key" ON "BrowserAgentRun"("swarmAgentId");
CREATE INDEX "BrowserAgentRun_missionId_idx" ON "BrowserAgentRun"("missionId");

CREATE TABLE "BrowserSwarmRun" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "maxAgents" INTEGER NOT NULL,
    "maxConcurrency" INTEGER NOT NULL,
    "agentsCreated" INTEGER NOT NULL DEFAULT 0,
    "agentsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "totalProviderCalls" INTEGER NOT NULL DEFAULT 0,
    "totalInputTokens" INTEGER,
    "totalOutputTokens" INTEGER,
    "estimatedCost" DECIMAL(65,30),
    "coverageStateJson" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "terminalReason" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserSwarmRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrowserSwarmAgent" (
    "id" TEXT NOT NULL,
    "swarmRunId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "browserAgentRunId" TEXT,
    "role" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "routesVisitedJson" JSONB NOT NULL,
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "stepsUsed" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "terminalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserSwarmAgent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrowserSwarmRun_auditId_idx" ON "BrowserSwarmRun"("auditId");
CREATE UNIQUE INDEX "BrowserSwarmAgent_swarmRunId_role_key" ON "BrowserSwarmAgent"("swarmRunId", "role");
CREATE UNIQUE INDEX "BrowserSwarmAgent_browserAgentRunId_key" ON "BrowserSwarmAgent"("browserAgentRunId");
CREATE INDEX "BrowserSwarmAgent_missionId_idx" ON "BrowserSwarmAgent"("missionId");

ALTER TABLE "BrowserSwarmRun" ADD CONSTRAINT "BrowserSwarmRun_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrowserSwarmAgent" ADD CONSTRAINT "BrowserSwarmAgent_swarmRunId_fkey" FOREIGN KEY ("swarmRunId") REFERENCES "BrowserSwarmRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrowserSwarmAgent" ADD CONSTRAINT "BrowserSwarmAgent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
