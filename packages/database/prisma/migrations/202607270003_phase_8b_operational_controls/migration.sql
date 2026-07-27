-- Phase 8B operational controls.
-- Safe additive migration: records cooperative cancellation requests and
-- bounded evidence retention cleanup attempts without changing existing data.

ALTER TABLE "Audit"
  ADD COLUMN "cancelRequestedAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT;

ALTER TABLE "FindingEvidence"
  ADD COLUMN "deletionAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deletionLastAttemptAt" TIMESTAMP(3);

CREATE INDEX "Audit_cancelRequestedAt_idx" ON "Audit"("cancelRequestedAt");
CREATE INDEX "FindingEvidence_deletionQueuedAt_idx" ON "FindingEvidence"("deletionQueuedAt");
