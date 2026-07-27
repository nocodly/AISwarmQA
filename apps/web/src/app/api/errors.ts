import { NextResponse } from "next/server";
import { DomainError } from "@ai-swarm-qa/database";

export function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function jsonErrorFromUnknown(error: unknown) {
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
  }

  return jsonError("INTERNAL_ERROR", "Something went wrong while handling the audit request.", 500);
}
