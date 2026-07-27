import { createHash, randomBytes } from "node:crypto";
import { type CommercialPlan, type CommercialPlanId, getCommercialPlan, readCommercialPlans } from "@ai-swarm-qa/config";
import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { DomainError } from "./audit-service";

type LimitMetadata = {
  current?: number;
  limit?: number | null;
  resetAt?: string;
  upgradeRequired?: boolean;
};

export class PlanLimitError extends DomainError {
  constructor(code: string, message: string, readonly metadata: LimitMetadata) {
    super(code, message, message);
  }
}

export type WorkspaceRole = "owner" | "admin" | "member";
export type WorkspacePermission =
  | "billing:manage"
  | "workspace:delete"
  | "members:manage"
  | "github:manage"
  | "audits:write"
  | "exports:write";

const rolePermissions: Record<WorkspaceRole, WorkspacePermission[]> = {
  owner: ["billing:manage", "workspace:delete", "members:manage", "github:manage", "audits:write", "exports:write"],
  admin: ["members:manage", "github:manage", "audits:write", "exports:write"],
  member: ["audits:write", "exports:write"]
};

const activeSubscriptionStatuses = new Set(["TRIALING", "ACTIVE"]);
const billingPeriodMs = 30 * 24 * 60 * 60 * 1000;

function toPlanId(plan: string | null | undefined): CommercialPlanId {
  const normalized = (plan ?? "FREE").toLowerCase();
  if (normalized === "pro") return "pro";
  if (normalized === "business" || normalized === "team" || normalized === "enterprise") return "business";
  return "free";
}

function nowPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

function quantity(rows: Array<{ _sum: { quantity: number | null } }>) {
  return rows[0]?._sum.quantity ?? 0;
}

export async function getWorkspaceRole(input: { workspaceId: string; userId: string }): Promise<WorkspaceRole> {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: input.workspaceId, userId: input.userId } }
  });
  if (!membership) {
    throw new DomainError("WORKSPACE_ACCESS_DENIED", "User is not a member of this workspace.", "Workspace is not available.");
  }
  if (membership.role === "owner" || membership.role === "admin" || membership.role === "member") return membership.role;
  return "member";
}

export async function assertWorkspacePermission(input: { workspaceId: string; userId: string; permission: WorkspacePermission }) {
  const role = await getWorkspaceRole(input);
  if (!rolePermissions[role].includes(input.permission)) {
    throw new DomainError("FEATURE_NOT_AVAILABLE", "The current role cannot perform this action.", "Your role cannot perform this action.");
  }
  return role;
}

export async function getWorkspacePlanState(workspaceId: string) {
  const workspace = await prisma.organization.findUnique({
    where: { id: workspaceId },
    include: { subscription: true }
  });
  if (!workspace) throw new DomainError("WORKSPACE_NOT_FOUND", "Workspace not found.", "Workspace was not found.");
  const subscription = workspace.subscription;
  const planId =
    subscription && activeSubscriptionStatuses.has(subscription.status)
      ? toPlanId(subscription.plan)
      : subscription?.status === "PAST_DUE" || subscription?.status === "UNPAID"
        ? toPlanId(subscription.plan)
        : toPlanId(workspace.plan);
  const plan = getCommercialPlan(planId);
  return { workspace, subscription, planId, plan };
}

export async function getBillingPeriod(workspaceId: string) {
  const state = await getWorkspacePlanState(workspaceId);
  if (state.subscription?.currentPeriodStart && state.subscription.currentPeriodEnd) {
    return { start: state.subscription.currentPeriodStart, end: state.subscription.currentPeriodEnd };
  }
  return nowPeriod();
}

export async function getWorkspaceUsageSummary(workspaceId: string, userId?: string) {
  const state = await getWorkspacePlanState(workspaceId);
  const period = await getBillingPeriod(workspaceId);
  const [auditEvents, pageEvents, aiEvents, screenshotEvents, storageEvents, exportEvents, failedEvents, cancelledEvents, concurrentAudits, workspaceCount, teamCount] =
    await Promise.all([
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "AUDIT_CREATED" },
        _sum: { quantity: true }
      }),
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "PAGE_SCANNED" },
        _sum: { quantity: true }
      }),
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "AI_REQUEST" },
        _sum: { quantity: true }
      }),
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "SCREENSHOT_CREATED" },
        _sum: { quantity: true }
      }),
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "STORAGE_BYTES" },
        _sum: { quantity: true }
      }),
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "GITHUB_ISSUE_EXPORTED" },
        _sum: { quantity: true }
      }),
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "AUDIT_FAILED" },
        _sum: { quantity: true }
      }),
      prisma.workspaceUsageEvent.groupBy({
        by: ["type"],
        where: { workspaceId, billingPeriodStart: period.start, billingPeriodEnd: period.end, type: "AUDIT_CANCELLED" },
        _sum: { quantity: true }
      }),
      prisma.audit.count({
        where: {
          project: { organizationId: workspaceId },
          status: { in: ["CREATED", "VALIDATING", "QUEUED", "PLANNING", "RUNNING", "ANALYZING", "GENERATING_REPORT"] }
        }
      }),
      userId ? prisma.organizationMember.count({ where: { userId } }) : Promise.resolve(1),
      prisma.organizationMember.count({ where: { organizationId: workspaceId } })
    ]);
  return {
    plan: state.plan,
    planId: state.planId,
    subscription: state.subscription
      ? {
          status: state.subscription.status.toLowerCase(),
          interval: state.subscription.interval.toLowerCase(),
          currentPeriodStart: state.subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: state.subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: state.subscription.cancelAtPeriodEnd
        }
      : { status: "free", interval: "monthly", currentPeriodStart: period.start.toISOString(), currentPeriodEnd: period.end.toISOString(), cancelAtPeriodEnd: false },
    period: { start: period.start.toISOString(), end: period.end.toISOString() },
    usage: {
      audits: quantity(auditEvents),
      pages: quantity(pageEvents),
      aiRequests: quantity(aiEvents),
      screenshots: quantity(screenshotEvents),
      storageBytes: quantity(storageEvents),
      githubIssuesExported: quantity(exportEvents),
      failedAudits: quantity(failedEvents),
      cancelledAudits: quantity(cancelledEvents),
      concurrentAudits,
      workspaces: workspaceCount,
      teamMembers: teamCount
    },
    limits: {
      auditsPerMonth: state.plan.auditsPerMonth,
      maxPagesPerAudit: state.plan.maxPagesPerAudit,
      concurrentAudits: state.plan.concurrentAudits,
      workspaceLimit: state.plan.workspaceLimit,
      teamMemberLimit: state.plan.teamMemberLimit,
      evidenceRetentionDays: state.plan.evidenceRetentionDays,
      githubExportEnabled: state.plan.githubExportEnabled,
      teamInvitationsEnabled: state.plan.teamInvitationsEnabled
    }
  };
}

export async function assertCanCreateAudit(input: { workspaceId: string; userId: string }) {
  await assertWorkspacePermission({ ...input, permission: "audits:write" });
  const summary = await getWorkspaceUsageSummary(input.workspaceId, input.userId);
  if (summary.subscription.status !== "free" && !activeSubscriptionStatuses.has(summary.subscription.status.toUpperCase())) {
    throw new PlanLimitError("SUBSCRIPTION_INACTIVE", "Subscription is not active.", { upgradeRequired: true });
  }
  if (summary.limits.auditsPerMonth !== null && summary.usage.audits >= summary.limits.auditsPerMonth) {
    throw new PlanLimitError("AUDIT_LIMIT_REACHED", "Monthly audit limit reached.", {
      current: summary.usage.audits,
      limit: summary.limits.auditsPerMonth,
      resetAt: summary.period.end,
      upgradeRequired: true
    });
  }
  if (summary.limits.concurrentAudits !== null && summary.usage.concurrentAudits >= summary.limits.concurrentAudits) {
    throw new PlanLimitError("CONCURRENCY_LIMIT_REACHED", "Concurrent audit limit reached.", {
      current: summary.usage.concurrentAudits,
      limit: summary.limits.concurrentAudits,
      resetAt: summary.period.end,
      upgradeRequired: true
    });
  }
  return summary;
}

export async function assertCanUseGitHubExport(input: { workspaceId: string; userId: string }) {
  await assertWorkspacePermission({ ...input, permission: "exports:write" });
  const state = await getWorkspacePlanState(input.workspaceId);
  if (!state.plan.githubExportEnabled) {
    throw new PlanLimitError("FEATURE_NOT_AVAILABLE", "GitHub export is not available on this plan.", { upgradeRequired: true });
  }
  return state;
}

export async function recordUsageEvent(input: {
  workspaceId: string;
  userId?: string | null;
  auditId?: string | null;
  type: "AUDIT_CREATED" | "AUDIT_COMPLETED" | "AUDIT_FAILED" | "AUDIT_CANCELLED" | "PAGE_SCANNED" | "AI_REQUEST" | "SCREENSHOT_CREATED" | "STORAGE_BYTES" | "GITHUB_ISSUE_EXPORTED";
  quantity?: number;
  metadata?: Prisma.InputJsonValue;
  idempotencyKey: string;
}) {
  const period = await getBillingPeriod(input.workspaceId);
  return prisma.workspaceUsageEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      auditId: input.auditId ?? null,
      type: input.type,
      quantity: input.quantity ?? 1,
      metadata: input.metadata ?? {},
      billingPeriodStart: period.start,
      billingPeriodEnd: period.end,
      idempotencyKey: input.idempotencyKey
    },
    update: {}
  });
}

export async function getAuditWorkspaceId(auditId: string) {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { project: { select: { organizationId: true } } }
  });
  return audit?.project.organizationId ?? null;
}

export async function getDashboardOverview(input: { workspaceId: string }) {
  const [summary, recentAudits, githubExports] = await Promise.all([
    getWorkspaceUsageSummary(input.workspaceId),
    prisma.audit.findMany({
      where: { project: { organizationId: input.workspaceId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { findings: true, githubExportBatches: true }
    }),
    prisma.findingGitHubExport.count({ where: { githubConnection: { workspaceId: input.workspaceId }, status: "CREATED" } })
  ]);
  return {
    summary,
    recentAudits: recentAudits.map((audit) => ({
      id: audit.id,
      targetUrl: audit.targetUrl,
      status: audit.status.toLowerCase(),
      findingsCount: audit.findings.length,
      criticalHighCount: audit.findings.filter((finding) => finding.severity === "CRITICAL" || finding.severity === "HIGH").length,
      githubExportStatus: audit.githubExportBatches[0]?.status.toLowerCase() ?? "none",
      createdAt: audit.createdAt.toISOString(),
      completedAt: audit.completedAt?.toISOString() ?? null
    })),
    githubIssuesExported: githubExports
  };
}

export async function getOrCreateOnboarding(workspaceId: string) {
  return prisma.workspaceOnboarding.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {}
  });
}

export async function updateOnboarding(input: { workspaceId: string; websiteUrl?: string; skipGitHub?: boolean; firstAuditId?: string }) {
  const now = new Date();
  return prisma.workspaceOnboarding.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      welcomeCompletedAt: now,
      workspaceConfirmedAt: now,
      websiteUrl: input.websiteUrl ?? null,
      websiteValidatedAt: input.websiteUrl ? now : null,
      firstAuditId: input.firstAuditId ?? null,
      firstAuditStartedAt: input.firstAuditId ? now : null,
      skippedGitHubAt: input.skipGitHub ? now : null
    },
    update: {
      welcomeCompletedAt: now,
      workspaceConfirmedAt: now,
      ...(input.websiteUrl ? { websiteUrl: input.websiteUrl, websiteValidatedAt: now } : {}),
      ...(input.firstAuditId ? { firstAuditId: input.firstAuditId, firstAuditStartedAt: now } : {}),
      ...(input.skipGitHub ? { skippedGitHubAt: now } : {})
    }
  });
}

export async function createWorkspaceInvitation(input: { workspaceId: string; invitedByUserId: string; email: string; role: WorkspaceRole }) {
  await assertWorkspacePermission({ workspaceId: input.workspaceId, userId: input.invitedByUserId, permission: "members:manage" });
  const summary = await getWorkspaceUsageSummary(input.workspaceId, input.invitedByUserId);
  if (!summary.limits.teamInvitationsEnabled) {
    throw new PlanLimitError("FEATURE_NOT_AVAILABLE", "Team invitations require a paid plan.", { upgradeRequired: true });
  }
  if (summary.limits.teamMemberLimit !== null && summary.usage.teamMembers >= summary.limits.teamMemberLimit) {
    throw new PlanLimitError("TEAM_LIMIT_REACHED", "Team member limit reached.", {
      current: summary.usage.teamMembers,
      limit: summary.limits.teamMemberLimit,
      upgradeRequired: true
    });
  }
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId: input.workspaceId,
      invitedByUserId: input.invitedByUserId,
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  return { invitation, token };
}

export async function acceptWorkspaceInvitation(input: { token: string; userId: string; email: string }) {
  const tokenHash = hashToken(input.token);
  const invitation = await prisma.workspaceInvitation.findUnique({ where: { tokenHash } });
  if (!invitation || invitation.status !== "PENDING") {
    throw new DomainError("INVITATION_NOT_FOUND", "Invitation is not available.", "Invitation is not available.");
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    await prisma.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    throw new DomainError("INVITATION_EXPIRED", "Invitation has expired.", "Invitation has expired.");
  }
  if (invitation.email !== input.email.toLowerCase()) {
    throw new DomainError("INVITATION_ACCESS_DENIED", "Invitation belongs to a different email.", "Invitation is not available.");
  }
  return prisma.$transaction(async (tx) => {
    await tx.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: invitation.workspaceId, userId: input.userId } },
      create: { organizationId: invitation.workspaceId, userId: input.userId, role: invitation.role },
      update: { role: invitation.role }
    });
    return tx.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() }
    });
  });
}

export async function revokeWorkspaceInvitation(input: { workspaceId: string; invitationId: string; actorUserId: string }) {
  await assertWorkspacePermission({ workspaceId: input.workspaceId, userId: input.actorUserId, permission: "members:manage" });
  return prisma.workspaceInvitation.update({
    where: { id: input.invitationId, workspaceId: input.workspaceId },
    data: { status: "REVOKED", revokedAt: new Date() }
  });
}

export async function updateWorkspaceName(input: { workspaceId: string; actorUserId: string; name: string }) {
  await assertWorkspacePermission({ workspaceId: input.workspaceId, userId: input.actorUserId, permission: "members:manage" });
  return prisma.organization.update({ where: { id: input.workspaceId }, data: { name: input.name } });
}

export async function requestWorkspaceDeletion(input: { workspaceId: string; actorUserId: string; confirmation: string }) {
  await assertWorkspacePermission({ workspaceId: input.workspaceId, userId: input.actorUserId, permission: "workspace:delete" });
  const running = await prisma.audit.count({
    where: { project: { organizationId: input.workspaceId }, status: { in: ["CREATED", "VALIDATING", "QUEUED", "PLANNING", "RUNNING", "ANALYZING", "GENERATING_REPORT"] } }
  });
  const status = running > 0 ? "BLOCKED" : "REQUESTED";
  return prisma.workspaceDeletionRequest.create({
    data: {
      workspaceId: input.workspaceId,
      requestedByUserId: input.actorUserId,
      confirmation: input.confirmation,
      status,
      blockedReason: running > 0 ? "Active audits must finish or be cancelled before deletion." : null,
      scheduledFor: running > 0 ? null : new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
}

export async function listEvidenceDueForDeletion(now = new Date()) {
  return prisma.findingEvidence.findMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null,
      deletionQueuedAt: null
    },
    take: 100,
    orderBy: { expiresAt: "asc" }
  });
}

export async function markEvidenceRetentionForAudit(input: { auditId: string; workspaceId: string }) {
  const state = await getWorkspacePlanState(input.workspaceId);
  const expiresAt = new Date(Date.now() + state.plan.evidenceRetentionDays * 24 * 60 * 60 * 1000);
  return prisma.findingEvidence.updateMany({
    where: { finding: { auditId: input.auditId, audit: { project: { organizationId: input.workspaceId } } }, expiresAt: null },
    data: { expiresAt }
  });
}

export async function recordEmailEvent(input: {
  workspaceId?: string | null;
  userId?: string | null;
  recipientEmail: string;
  template: string;
  idempotencyKey: string;
  status: "queued" | "sent" | "skipped" | "failed";
  provider: "resend" | "mock";
  providerMessageId?: string | null;
  errorMessage?: string | null;
}) {
  return prisma.emailEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      workspaceId: input.workspaceId ?? null,
      userId: input.userId ?? null,
      recipientEmail: input.recipientEmail,
      template: input.template,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      provider: input.provider,
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
      sentAt: input.status === "sent" ? new Date() : null
    },
    update: {}
  });
}

export function getPlanCatalog() {
  return readCommercialPlans();
}

export async function getOrCreateBillingCustomerRecord(input: { workspaceId: string; stripeCustomerId: string }) {
  return prisma.billingCustomer.upsert({
    where: { workspaceId: input.workspaceId },
    create: { workspaceId: input.workspaceId, stripeCustomerId: input.stripeCustomerId },
    update: { stripeCustomerId: input.stripeCustomerId }
  });
}

export async function getWorkspaceBillingState(workspaceId: string) {
  const [summary, customer] = await Promise.all([
    getWorkspaceUsageSummary(workspaceId),
    prisma.billingCustomer.findUnique({ where: { workspaceId } })
  ]);
  return {
    ...summary,
    billingCustomerConfigured: Boolean(customer),
    stripeCustomerIdPresent: Boolean(customer?.stripeCustomerId)
  };
}

export async function recordBillingWebhookEvent(input: { provider: "stripe"; eventId: string; eventType: string }) {
  try {
    await prisma.billingWebhookEvent.create({
      data: { provider: input.provider, eventId: input.eventId, eventType: input.eventType }
    });
    return { duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { duplicate: true };
    throw error;
  }
}

export async function syncWorkspaceSubscription(input: {
  workspaceId: string;
  plan: CommercialPlanId;
  interval: "monthly" | "yearly" | "contact";
  status: "free" | "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  latestPaymentStatus?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date | null;
  canceledAt?: Date | null;
}) {
  const data = {
    workspaceId: input.workspaceId,
    plan: input.plan.toUpperCase() as "FREE" | "PRO" | "BUSINESS",
    interval: input.interval.toUpperCase() as "MONTHLY" | "YEARLY" | "CONTACT",
    status: input.status.toUpperCase() as
      | "FREE"
      | "TRIALING"
      | "ACTIVE"
      | "PAST_DUE"
      | "UNPAID"
      | "CANCELED"
      | "INCOMPLETE"
      | "INCOMPLETE_EXPIRED",
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    stripePriceId: input.stripePriceId ?? null,
    latestPaymentStatus: input.latestPaymentStatus ?? null,
    currentPeriodStart: input.currentPeriodStart ?? null,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    trialEndsAt: input.trialEndsAt ?? null,
    canceledAt: input.canceledAt ?? null,
    activatedAt: input.status === "active" || input.status === "trialing" ? new Date() : null
  };
  const subscription = await prisma.workspaceSubscription.upsert({
    where: { workspaceId: input.workspaceId },
    create: data,
    update: data
  });
  await prisma.organization.update({
    where: { id: input.workspaceId },
    data: { plan: input.plan === "business" ? "ENTERPRISE" : input.plan === "pro" ? "PRO" : "FREE" }
  });
  return subscription;
}

export async function findWorkspaceIdForStripeCustomer(stripeCustomerId: string) {
  const customer = await prisma.billingCustomer.findUnique({ where: { stripeCustomerId } });
  if (customer) return customer.workspaceId;
  const subscription = await prisma.workspaceSubscription.findFirst({ where: { stripeCustomerId } });
  return subscription?.workspaceId ?? null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
