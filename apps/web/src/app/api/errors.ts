import { NextResponse } from "next/server";
import { DomainError, PlanLimitError } from "@ai-swarm-qa/database";

export function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function jsonErrorFromUnknown(error: unknown) {
  if (error instanceof PlanLimitError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.safeMessage, ...error.metadata } },
      { status: error.code === "SUBSCRIPTION_INACTIVE" ? 402 : 429 }
    );
  }
  if (error instanceof DomainError) {
    const status = error.code.endsWith("_NOT_FOUND") ? 404 : error.code.endsWith("_ACCESS_DENIED") ? 403 : 400;
    return jsonError(error.code, error.safeMessage, status);
  }

  if (error instanceof Error) {
    if (error.name === "AuthError") {
      return jsonError("AUTH_REQUIRED", error.message, 401);
    }

    if (error.message === "INVALID_URL") {
      return jsonError("INVALID_URL", "The submitted URL is invalid.", 400);
    }

    if (error.message === "FORBIDDEN_TARGET") {
      return jsonError("FORBIDDEN_TARGET", "This target is not allowed for audits in the current environment.", 403);
    }

    if (error.message === "TARGET_RESOLUTION_FAILED") {
      return jsonError("TARGET_RESOLUTION_FAILED", "The audit target hostname could not be resolved.", 400);
    }

    if (error.message === "TARGET_RESOLUTION_TIMEOUT") {
      return jsonError("TARGET_RESOLUTION_TIMEOUT", "The audit target hostname lookup timed out. Please try again.", 408);
    }

    if (error.message === "AUDIT_QUEUE_UNAVAILABLE") {
      return jsonError("AUDIT_QUEUE_UNAVAILABLE", "Audit planning could not be queued. Please try again in a moment.", 503);
    }
  }

  return jsonError("INTERNAL_ERROR", "Something went wrong while handling the audit request.", 500);
}
