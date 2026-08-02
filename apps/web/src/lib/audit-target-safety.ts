import { lookup } from "node:dns/promises";
import { assertAuditUrlAllowed, isForbiddenAuditHostname, type UrlSafetyMode } from "@ai-swarm-qa/shared";

const dnsLookupTimeoutMs = 5000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function isDevelopmentAllowedHost(url: URL, options: { mode: UrlSafetyMode; devAllowedHosts: string[] }) {
  const host = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return options.mode === "development" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname) && options.devAllowedHosts.includes(host);
}

export async function assertAuditTargetNetworkAllowed(input: string, options: { mode: UrlSafetyMode; devAllowedHosts: string[] }): Promise<string> {
  const normalized = assertAuditUrlAllowed(input, options);
  const url = new URL(normalized);

  if (isDevelopmentAllowedHost(url, options)) {
    return normalized;
  }

  if (isForbiddenAuditHostname(url.hostname)) {
    throw new Error("FORBIDDEN_TARGET");
  }

  try {
    const addresses = await withTimeout(lookup(url.hostname, { all: true, verbatim: false }), dnsLookupTimeoutMs, "TARGET_RESOLUTION_TIMEOUT");
    if (addresses.length === 0) {
      throw new Error("TARGET_RESOLUTION_FAILED");
    }
    if (addresses.some((address) => isForbiddenAuditHostname(address.address))) {
      throw new Error("FORBIDDEN_TARGET");
    }
  } catch (error) {
    if (error instanceof Error && (error.message === "FORBIDDEN_TARGET" || error.message === "TARGET_RESOLUTION_TIMEOUT")) {
      throw error;
    }
    throw new Error("TARGET_RESOLUTION_FAILED");
  }

  return normalized;
}
