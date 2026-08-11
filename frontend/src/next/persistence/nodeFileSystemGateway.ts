import { promises as fs } from "node:fs";
import path from "node:path";
import type { FileSystemGateway, GatewayReadResult } from "./fileSystemGateway";

export class NodeFileSystemGateway implements FileSystemGateway {
  readonly kind = "node" as const;
  private rootDir = "";

  async initialize(rootDir: string): Promise<void> {
    this.rootDir = rootDir;
    await fs.mkdir(rootDir, { recursive: true });
  }

  getRootDir(): string {
    return this.rootDir;
  }

  private resolve(relativePath: string): string {
    const cleaned = relativePath.replace(/^\/+/, "");
    return path.join(this.rootDir, cleaned);
  }

  async readTextFile(relativePath: string): Promise<GatewayReadResult> {
    try {
      const content = await fs.readFile(this.resolve(relativePath), "utf8");
      return { ok: true, content };
    } catch {
      return { ok: false, reason: "not-found" };
    }
  }

  async writeTextFile(
    relativePath: string,
    content: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      const target = this.resolve(relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "write-failed" };
    }
  }

  async listDirectories(relativePath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.resolve(relativePath), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  async listFiles(relativePath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.resolve(relativePath), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  async deleteDirectory(
    relativePath: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      await fs.rm(this.resolve(relativePath), { recursive: true, force: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "delete-failed" };
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }
}
