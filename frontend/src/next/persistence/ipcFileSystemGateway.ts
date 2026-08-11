import type { FileSystemGateway, GatewayReadResult } from "./fileSystemGateway";

function hasBridge(): boolean {
  return typeof window !== "undefined" && typeof window.spacerDesktop?.persistence === "object";
}

function bridge() {
  const persistence = window.spacerDesktop?.persistence;
  if (persistence === undefined) {
    throw new Error("spacerDesktop persistence bridge is unavailable");
  }
  return persistence;
}

export class IpcFileSystemGateway implements FileSystemGateway {
  readonly kind = "ipc" as const;
  private rootDir = "";

  async initialize(rootDir: string): Promise<void> {
    if (!hasBridge()) {
      throw new Error("spacerDesktop persistence bridge is unavailable");
    }
    const result = await bridge().init();
    if (!result.ok) {
      throw new Error(`persistence init failed: ${result.reason}`);
    }
    const rootResult = await bridge().getRootDir();
    this.rootDir = rootResult.ok && typeof rootResult.value?.rootDir === "string"
      ? rootResult.value.rootDir
      : rootDir;
  }

  getRootDir(): string {
    return this.rootDir;
  }

  async readTextFile(relativePath: string): Promise<GatewayReadResult> {
    const result = await bridge().readFile(relativePath);
    if (!result.ok || typeof result.value?.content !== "string") {
      return { ok: false, reason: result.ok ? "not-found" : result.reason };
    }
    return { ok: true, content: result.value.content };
  }

  async writeTextFile(
    relativePath: string,
    content: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const result = await bridge().writeFile(relativePath, content);
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }

  async listDirectories(relativePath: string): Promise<string[]> {
    const result = await bridge().listDirectories(relativePath);
    return result.ok && Array.isArray(result.value) ? (result.value as string[]) : [];
  }

  async listFiles(relativePath: string): Promise<string[]> {
    const result = await bridge().listFiles(relativePath);
    return result.ok && Array.isArray(result.value) ? (result.value as string[]) : [];
  }

  async deleteDirectory(
    relativePath: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const result = await bridge().deleteDirectory(relativePath);
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }

  async exists(relativePath: string): Promise<boolean> {
    const result = await bridge().exists(relativePath);
    return result.ok && result.value?.exists === true;
  }
}

export function isIpcAvailable(): boolean {
  return hasBridge();
}
