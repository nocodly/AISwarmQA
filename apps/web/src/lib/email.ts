import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { recordEmailEvent } from "@ai-swarm-qa/database";

export type EmailTemplate =
  | "welcome"
  | "audit_completed"
  | "audit_failed"
  | "subscription_activated"
  | "payment_failed"
  | "subscription_canceled"
  | "workspace_invitation"
  | "invitation_accepted";

export async function sendTransactionalEmail(input: {
  workspaceId?: string | null;
  userId?: string | null;
  to: string;
  template: EmailTemplate;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  const config = readRuntimeConfig();
  const eventBase = {
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    recipientEmail: input.to,
    template: input.template,
    idempotencyKey: input.idempotencyKey
  };
  if (!config.resendApiKey || !config.emailFrom) {
    return recordEmailEvent({
      ...eventBase,
      status: "skipped",
      provider: "mock",
      errorMessage: "Email provider is not configured."
    });
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.resendApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });
  if (!response.ok) {
    return recordEmailEvent({
      ...eventBase,
      status: "failed",
      provider: "resend",
      errorMessage: `Email provider returned HTTP ${response.status}.`
    });
  }
  const body = (await response.json()) as { id?: string };
  return recordEmailEvent({
    ...eventBase,
    status: "sent",
    provider: "resend",
    providerMessageId: body.id ?? null
  });
}

export function invitationEmail(input: { inviteUrl: string; workspaceName: string }) {
  const subject = `Join ${input.workspaceName} on AISwarmQA`;
  const text = `You have been invited to ${input.workspaceName} on AISwarmQA.\n\nAccept invitation: ${input.inviteUrl}\n\nIf you did not expect this invitation, you can ignore this email.`;
  const html = `<main style="font-family:Arial,sans-serif;line-height:1.5"><h1>Join ${escapeHtml(input.workspaceName)}</h1><p>You have been invited to AISwarmQA.</p><p><a href="${escapeHtml(input.inviteUrl)}">Accept invitation</a></p><p>If you did not expect this invitation, you can ignore this email.</p></main>`;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
