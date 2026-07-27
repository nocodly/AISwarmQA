import { assertAuditUrlAllowed } from "@ai-swarm-qa/shared";
import { getOrCreateOnboarding, updateOnboarding } from "@ai-swarm-qa/database";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { z } from "zod";
import { jsonErrorFromUnknown } from "../errors";
import { requireAuth } from "@/lib/auth";

const onboardingUpdateSchema = z.object({
  websiteUrl: z.string().url().optional(),
  skipGitHub: z.boolean().optional()
});

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const onboarding = await getOrCreateOnboarding(actor.workspaceId);
    return Response.json({
      onboarding: {
        welcomeCompleted: Boolean(onboarding.welcomeCompletedAt),
        workspaceConfirmed: Boolean(onboarding.workspaceConfirmedAt),
        websiteUrl: onboarding.websiteUrl,
        websiteValidated: Boolean(onboarding.websiteValidatedAt),
        firstAuditId: onboarding.firstAuditId,
        firstAuditStarted: Boolean(onboarding.firstAuditStartedAt),
        findingsReviewed: Boolean(onboarding.findingsReviewedAt),
        githubConnected: Boolean(onboarding.githubConnectedAt),
        githubSkipped: Boolean(onboarding.skippedGitHubAt),
        firstIssueExported: Boolean(onboarding.firstIssueExportedAt),
        completed: Boolean(onboarding.completedAt)
      }
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuth(request);
    const body = onboardingUpdateSchema.parse(await request.json());
    if (body.websiteUrl) {
      const config = readRuntimeConfig();
      assertAuditUrlAllowed(body.websiteUrl, {
        mode: process.env.NODE_ENV === "production" ? "production" : "development",
        devAllowedHosts: config.auditDevAllowedHosts
      });
    }
    const onboarding = await updateOnboarding({
      workspaceId: actor.workspaceId,
      ...(body.websiteUrl ? { websiteUrl: body.websiteUrl } : {}),
      ...(typeof body.skipGitHub === "boolean" ? { skipGitHub: body.skipGitHub } : {})
    });
    return Response.json({ onboarding });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
