import type { FileSystemGateway, GatewayReadResult } from "./fileSystemGateway";

export class MemoryFileSystemGateway implements FileSystemGateway {
  readonly kind = "memory" as const;
  private rootDir = "";
  private files = new Map<string, string>();

  async initialize(rootDir: string): Promise<void> {
    this.rootDir = rootDir;
    this.files.clear();
  }

  getRootDir(): string {
    return this.rootDir;
  }

  private normalize(relativePath: string): string {
    return relativePath.replace(/^\/+/, "");
  }

  async readTextFile(relativePath: string): Promise<GatewayReadResult> {
    const key = this.normalize(relativePath);
    const content = this.files.get(key);
    if (content === undefined) {
      return { ok: false, reason: "not-found" };
    }
    return { ok: true, content };
  }

  async writeTextFile(
    relativePath: string,
    content: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    this.files.set(this.normalize(relativePath), content);
    return { ok: true };
  }

  async listDirectories(relativePath: string): Promise<string[]> {
    const prefix = this.normalize(relativePath);
    const dirs = new Set<string>();
    for (const key of this.files.keys()) {
      const rest = prefix.length === 0 ? key : key.startsWith(`${prefix}/`) ? key.slice(prefix.length + 1) : undefined;
      if (rest === undefined || rest.length === 0) continue;
      const top = rest.split("/")[0];
      if (top !== undefined) dirs.add(top);
    }
    return Array.from(dirs).sort();
  }

  async listFiles(relativePath: string): Promise<string[]> {
    const prefix = this.normalize(relativePath);
    const files: string[] = [];
    for (const key of this.files.keys()) {
      const rest = prefix.length === 0 ? key : key.startsWith(`${prefix}/`) ? key.slice(prefix.length + 1) : undefined;
      if (rest === undefined || rest.length === 0) continue;
      if (!rest.includes("/")) files.push(rest);
    }
    return files.sort();
  }

  async deleteDirectory(
    relativePath: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const prefix = this.normalize(relativePath);
    const toDelete: string[] = [];
    for (const key of this.files.keys()) {
      if (key === prefix || key.startsWith(`${prefix}/`)) {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) {
      this.files.delete(key);
    }
    return { ok: true };
  }

  async exists(relativePath: string): Promise<boolean> {
    const prefix = this.normalize(relativePath);
    for (const key of this.files.keys()) {
      if (key === prefix || key.startsWith(`${prefix}/`)) {
        return true;
      }
    }
    return false;
  }
}
