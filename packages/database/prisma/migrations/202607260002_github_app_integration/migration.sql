ALTER TABLE "FindingEvidence"
ADD COLUMN "publicEvidenceId" TEXT,
ADD COLUMN "externalSharingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "revokedAt" TIMESTAMP(3);

ALTER TABLE "GitHubRepository"
ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "GitHubExportBatch"
ADD COLUMN "exportOptionsJson" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "GitHubAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubAuthState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GitHubWebhookDelivery" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "action" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubWebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FindingEvidence_publicEvidenceId_key" ON "FindingEvidence"("publicEvidenceId");
CREATE INDEX "FindingEvidence_publicEvidenceId_idx" ON "FindingEvidence"("publicEvidenceId");

CREATE UNIQUE INDEX "GitHubAuthState_stateHash_key" ON "GitHubAuthState"("stateHash");
CREATE INDEX "GitHubAuthState_workspaceId_idx" ON "GitHubAuthState"("workspaceId");
CREATE INDEX "GitHubAuthState_expiresAt_idx" ON "GitHubAuthState"("expiresAt");

CREATE UNIQUE INDEX "GitHubWebhookDelivery_deliveryId_key" ON "GitHubWebhookDelivery"("deliveryId");
CREATE INDEX "GitHubWebhookDelivery_event_idx" ON "GitHubWebhookDelivery"("event");

ALTER TABLE "GitHubAuthState" ADD CONSTRAINT "GitHubAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitHubAuthState" ADD CONSTRAINT "GitHubAuthState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
