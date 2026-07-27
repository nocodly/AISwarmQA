-- Phase 8 commercial SaaS foundation.
-- Safe additive migration: introduces billing, usage, onboarding, invitations,
-- email idempotency, retention metadata, audit logs, and deletion workflow tables.

CREATE TYPE "CommercialPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'CONTACT');
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED');
CREATE TYPE "UsageEventType" AS ENUM ('AUDIT_CREATED', 'AUDIT_COMPLETED', 'AUDIT_FAILED', 'AUDIT_CANCELLED', 'PAGE_SCANNED', 'AI_REQUEST', 'SCREENSHOT_CREATED', 'STORAGE_BYTES', 'GITHUB_ISSUE_EXPORTED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "WorkspaceDeletionStatus" AS ENUM ('REQUESTED', 'BLOCKED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

ALTER TABLE "FindingEvidence"
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "deletionQueuedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletionError" TEXT;

CREATE TABLE "BillingCustomer" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceSubscription" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "plan" "CommercialPlan" NOT NULL DEFAULT 'FREE',
  "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'FREE',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "stripePriceId" TEXT,
  "latestPaymentStatus" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "trialEndsAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceUsageEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "auditId" TEXT,
  "userId" TEXT,
  "type" "UsageEventType" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "billingPeriodStart" TIMESTAMP(3) NOT NULL,
  "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceOnboarding" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "welcomeCompletedAt" TIMESTAMP(3),
  "workspaceConfirmedAt" TIMESTAMP(3),
  "websiteUrl" TEXT,
  "websiteValidatedAt" TIMESTAMP(3),
  "firstAuditId" TEXT,
  "firstAuditStartedAt" TIMESTAMP(3),
  "findingsReviewedAt" TIMESTAMP(3),
  "githubOfferedAt" TIMESTAMP(3),
  "githubConnectedAt" TIMESTAMP(3),
  "firstIssueExportedAt" TIMESTAMP(3),
  "skippedGitHubAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceInvitation" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT,
  "userId" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceAuditLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceDeletionRequest" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "confirmation" TEXT NOT NULL,
  "status" "WorkspaceDeletionStatus" NOT NULL DEFAULT 'REQUESTED',
  "blockedReason" TEXT,
  "scheduledFor" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCustomer_workspaceId_key" ON "BillingCustomer"("workspaceId");
CREATE UNIQUE INDEX "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId");
CREATE UNIQUE INDEX "WorkspaceSubscription_workspaceId_key" ON "WorkspaceSubscription"("workspaceId");
CREATE UNIQUE INDEX "WorkspaceSubscription_stripeSubscriptionId_key" ON "WorkspaceSubscription"("stripeSubscriptionId");
CREATE INDEX "WorkspaceSubscription_workspaceId_status_idx" ON "WorkspaceSubscription"("workspaceId", "status");
CREATE INDEX "WorkspaceSubscription_stripeCustomerId_idx" ON "WorkspaceSubscription"("stripeCustomerId");
CREATE INDEX "WorkspaceSubscription_stripePriceId_idx" ON "WorkspaceSubscription"("stripePriceId");
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_eventId_key" ON "BillingWebhookEvent"("provider", "eventId");
CREATE INDEX "BillingWebhookEvent_eventType_idx" ON "BillingWebhookEvent"("eventType");
CREATE UNIQUE INDEX "WorkspaceUsageEvent_idempotencyKey_key" ON "WorkspaceUsageEvent"("idempotencyKey");
CREATE INDEX "WorkspaceUsageEvent_workspaceId_billingPeriodStart_billingPeriodEnd_idx" ON "WorkspaceUsageEvent"("workspaceId", "billingPeriodStart", "billingPeriodEnd");
CREATE INDEX "WorkspaceUsageEvent_auditId_idx" ON "WorkspaceUsageEvent"("auditId");
CREATE INDEX "WorkspaceUsageEvent_type_idx" ON "WorkspaceUsageEvent"("type");
CREATE UNIQUE INDEX "WorkspaceOnboarding_workspaceId_key" ON "WorkspaceOnboarding"("workspaceId");
CREATE UNIQUE INDEX "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");
CREATE INDEX "WorkspaceInvitation_workspaceId_status_idx" ON "WorkspaceInvitation"("workspaceId", "status");
CREATE INDEX "WorkspaceInvitation_email_idx" ON "WorkspaceInvitation"("email");
CREATE INDEX "WorkspaceInvitation_expiresAt_idx" ON "WorkspaceInvitation"("expiresAt");
CREATE UNIQUE INDEX "EmailEvent_idempotencyKey_key" ON "EmailEvent"("idempotencyKey");
CREATE INDEX "EmailEvent_workspaceId_idx" ON "EmailEvent"("workspaceId");
CREATE INDEX "EmailEvent_template_idx" ON "EmailEvent"("template");
CREATE INDEX "EmailEvent_status_idx" ON "EmailEvent"("status");
CREATE INDEX "WorkspaceAuditLog_workspaceId_createdAt_idx" ON "WorkspaceAuditLog"("workspaceId", "createdAt");
CREATE INDEX "WorkspaceAuditLog_action_idx" ON "WorkspaceAuditLog"("action");
CREATE INDEX "WorkspaceDeletionRequest_workspaceId_status_idx" ON "WorkspaceDeletionRequest"("workspaceId", "status");
CREATE INDEX "FindingEvidence_expiresAt_idx" ON "FindingEvidence"("expiresAt");
CREATE INDEX "FindingEvidence_deletedAt_idx" ON "FindingEvidence"("deletedAt");

ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceSubscription" ADD CONSTRAINT "WorkspaceSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceUsageEvent" ADD CONSTRAINT "WorkspaceUsageEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceUsageEvent" ADD CONSTRAINT "WorkspaceUsageEvent_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceUsageEvent" ADD CONSTRAINT "WorkspaceUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceOnboarding" ADD CONSTRAINT "WorkspaceOnboarding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceAuditLog" ADD CONSTRAINT "WorkspaceAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceDeletionRequest" ADD CONSTRAINT "WorkspaceDeletionRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceDeletionRequest" ADD CONSTRAINT "WorkspaceDeletionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
