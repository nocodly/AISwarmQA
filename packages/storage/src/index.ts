import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export interface StoredObject {
  key: string;
  uri: string;
  bucket?: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface StorageProvider {
  putObject(key: string, body: Uint8Array | string, contentType: string): Promise<StoredObject>;
}

export type EvidenceStorageMetadata = {
  storageProvider: "supabase";
  storageBucket: string;
  storagePath: string;
  storageContentType: string;
  storageSizeBytes: number;
};

export class StorageError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  constructor(
    private readonly config: {
      supabaseUrl: string;
      serviceKey: string;
      bucket: string;
      maxBytes: number;
    }
  ) {}

  async putObject(key: string, body: Uint8Array | string, contentType: string): Promise<StoredObject> {
    const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
    validateEvidenceUpload(bytes, contentType, this.config.maxBytes);
    const uploadBody = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(uploadBody).set(bytes);
    const normalizedKey = key.replace(/^\/+/, "");
    const response = await fetch(`${this.config.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(this.config.bucket)}/${normalizedKey}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.serviceKey}`,
        apikey: this.config.serviceKey,
        "content-type": contentType,
        "x-upsert": "false"
      },
      body: uploadBody
    });
    if (!response.ok) {
      throw new StorageError("SUPABASE_UPLOAD_FAILED", `Supabase Storage upload failed with HTTP ${response.status}.`);
    }
    return {
      key: normalizedKey,
      bucket: this.config.bucket,
      uri: `supabase://${this.config.bucket}/${normalizedKey}`,
      contentType,
      sizeBytes: bytes.byteLength
    };
  }

  async getObject(key: string): Promise<{ body: Uint8Array; contentType: string }> {
    const response = await fetch(`${this.config.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(this.config.bucket)}/${key.replace(/^\/+/, "")}`, {
      headers: {
        authorization: `Bearer ${this.config.serviceKey}`,
        apikey: this.config.serviceKey
      }
    });
    if (!response.ok) {
      throw new StorageError("SUPABASE_DOWNLOAD_FAILED", `Supabase Storage download failed with HTTP ${response.status}.`);
    }
    return {
      body: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? "application/octet-stream"
    };
  }

  async deleteObject(key: string): Promise<void> {
    const response = await fetch(`${this.config.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(this.config.bucket)}/${key.replace(/^\/+/, "")}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${this.config.serviceKey}`,
        apikey: this.config.serviceKey
      }
    });
    if (!response.ok && response.status !== 404) {
      throw new StorageError("SUPABASE_DELETE_FAILED", `Supabase Storage delete failed with HTTP ${response.status}.`);
    }
  }
}

export function buildEvidenceStorageKey(input: { workspaceId: string; auditId: string; findingId: string; evidenceId: string; extension?: string }) {
  const extension = input.extension?.replace(/^\./, "") || "png";
  return [
    "workspaces",
    safeSegment(input.workspaceId),
    "audits",
    safeSegment(input.auditId),
    "findings",
    safeSegment(input.findingId),
    `${safeSegment(input.evidenceId)}-${randomUUID()}.${extension}`
  ].join("/");
}

export function detectEvidenceContentType(path: string, body: Uint8Array) {
  const lower = path.toLowerCase();
  if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) return "image/png";
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "image/jpeg";
  if (lower.endsWith(".webp") && body[0] === 0x52 && body[1] === 0x49 && body[2] === 0x46 && body[3] === 0x46) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export function extensionForContentType(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return "png";
}

function validateEvidenceUpload(body: Uint8Array, contentType: string, maxBytes: number) {
  if (body.byteLength > maxBytes) {
    throw new StorageError("EVIDENCE_TOO_LARGE", `Evidence upload exceeds ${maxBytes} bytes.`);
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(contentType)) {
    throw new StorageError("EVIDENCE_UNSUPPORTED_TYPE", `Evidence content type is not supported: ${contentType}.`);
  }
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootPath: string) {}

  async putObject(key: string, body: Uint8Array | string, contentType: string): Promise<StoredObject> {
    const path = join(this.rootPath, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return {
      key,
      uri: `local://${key}?contentType=${encodeURIComponent(contentType)}`
    };
  }
}
