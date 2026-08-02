import { lookup } from "node:dns/promises";
import { assertAuditUrlAllowed, isForbiddenAuditHostname, type UrlSafetyMode } from "@ai-swarm-qa/shared";
import type { BrowserContext } from "playwright";

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

  await assertHostnamePublic(url.hostname);
  return normalized;
}

async function assertHostnamePublic(hostname: string): Promise<void> {
  if (isForbiddenAuditHostname(hostname)) {
    throw new Error("FORBIDDEN_TARGET");
  }

  try {
    const addresses = await withTimeout(lookup(hostname, { all: true, verbatim: false }), dnsLookupTimeoutMs, "TARGET_RESOLUTION_TIMEOUT");
    if (addresses.length === 0) {
      throw new Error("TARGET_RESOLUTION_FAILED");
    }
    if (addresses.some((address) => isForbiddenAuditHostname(address.address))) {
      throw new Error("FORBIDDEN_TARGET");
    }
  } catch (error) {
    if (error instanceof Error && ["FORBIDDEN_TARGET", "TARGET_RESOLUTION_TIMEOUT"].includes(error.message)) {
      throw error;
    }
    throw new Error("TARGET_RESOLUTION_FAILED");
  }
}

export async function installAuditNetworkGuard(context: BrowserContext, options: { mode: UrlSafetyMode; devAllowedHosts: string[] }): Promise<void> {
  const hostnameChecks = new Map<string, Promise<void>>();

  await context.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    let parsed: URL;
    try {
      parsed = new URL(requestUrl);
    } catch {
      await route.abort("blockedbyclient");
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      await route.continue();
      return;
    }

    if (!isDevelopmentAllowedHost(parsed, options)) {
      const check = hostnameChecks.get(parsed.hostname) ?? assertHostnamePublic(parsed.hostname);
      hostnameChecks.set(parsed.hostname, check);
      try {
        await check;
      } catch {
        await route.abort("blockedbyclient");
        return;
      }
    }

    await route.continue();
  });
}
