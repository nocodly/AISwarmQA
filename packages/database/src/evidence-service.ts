import { randomUUID } from "node:crypto";
import { prisma } from "./client";
import { DomainError } from "./audit-service";

export async function markEvidenceStored(input: {
  evidenceId: string;
  storageProvider: string;
  storageBucket: string;
  storagePath: string;
  storageContentType: string;
  storageSizeBytes: number;
}) {
  return prisma.findingEvidence.update({
    where: { id: input.evidenceId },
    data: {
      storageProvider: input.storageProvider,
      storageBucket: input.storageBucket,
      storagePath: input.storagePath,
      storageContentType: input.storageContentType,
      storageSizeBytes: input.storageSizeBytes,
      publicEvidenceId: randomUUID()
    }
  });
}

export async function listUnstoredLocalEvidenceForAudit(auditId: string) {
  return prisma.findingEvidence.findMany({
    where: {
      localPath: { not: null },
      storagePath: null,
      finding: { auditId }
    },
    select: {
      id: true,
      localPath: true,
      type: true,
      findingId: true,
      finding: {
        select: {
          auditId: true,
          audit: {
            select: {
              project: { select: { organizationId: true } }
            }
          }
        }
      }
    }
  });
}

export async function enableExternalEvidenceForFindings(input: { auditId: string; findingIds: string[]; workspaceId: string }) {
  const audit = await prisma.audit.findFirst({
    where: {
      id: input.auditId,
      project: { organizationId: input.workspaceId }
    },
    select: { id: true }
  });
  if (!audit) {
    throw new DomainError("AUDIT_ACCESS_DENIED", "Audit is outside the current workspace.", "Audit is not available.");
  }
  const evidence = await prisma.findingEvidence.findMany({
    where: {
      finding: {
        auditId: input.auditId,
        id: { in: input.findingIds }
      },
      storageProvider: "supabase",
      storagePath: { not: null },
      revokedAt: null
    },
    select: { id: true, publicEvidenceId: true }
  });
  for (const item of evidence) {
    await prisma.findingEvidence.update({
      where: { id: item.id },
      data: {
        externalSharingEnabled: true,
        publicEvidenceId: item.publicEvidenceId ?? randomUUID()
      }
    });
  }
  return { enabledCount: evidence.length };
}

export async function getPublicEvidence(publicEvidenceId: string) {
  const now = new Date();
  const evidence = await prisma.findingEvidence.findFirst({
    where: {
      publicEvidenceId,
      externalSharingEnabled: true,
      revokedAt: null,
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      storageProvider: "supabase",
      storageBucket: { not: null },
      storagePath: { not: null }
    },
    include: {
      finding: {
        include: {
          audit: { include: { project: true } }
        }
      }
    }
  });
  if (!evidence || !evidence.storageBucket || !evidence.storagePath) {
    throw new DomainError("EVIDENCE_NOT_FOUND", "Evidence was not found or is not shared externally.", "Evidence was not found.");
  }
  return evidence;
}
