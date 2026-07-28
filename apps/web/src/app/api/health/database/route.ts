export async function GET() {
  try {
    const database = await import("@ai-swarm-qa/database");
    const auditCount = await database.prisma.audit.count();
    return Response.json({
      ok: true,
      database: {
        reachable: true,
        auditCount
      }
    });
  } catch (error) {
    const knownError = error as { code?: string };
    const message = error instanceof Error ? error.message : "Unknown database health failure.";
    const safeMessage = message
      .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
      .replace(/redis(?:s)?:\/\/\S+/gi, "[redacted-redis-url]")
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[redacted-api-key]");
    const safeTail = safeMessage.slice(Math.max(0, safeMessage.length - 500));
    return Response.json(
      {
        ok: false,
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          code: knownError.code,
          message: safeMessage.slice(0, 500),
          tail: safeTail === safeMessage.slice(0, 500) ? undefined : safeTail
        }
      },
      { status: 500 }
    );
  }
}
