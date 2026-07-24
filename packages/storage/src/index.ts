import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface StoredObject {
  key: string;
  uri: string;
}

export interface StorageProvider {
  putObject(key: string, body: Uint8Array | string, contentType: string): Promise<StoredObject>;
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

