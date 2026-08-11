export type GatewayReadResult = { ok: true; content: string } | { ok: false; reason: string };

export interface FileSystemGateway {
  readonly kind: "memory" | "node" | "ipc";
  initialize(rootDir: string): Promise<void>;
  getRootDir(): string;
  readTextFile(relativePath: string): Promise<GatewayReadResult>;
  writeTextFile(relativePath: string, content: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  listDirectories(relativePath: string): Promise<string[]>;
  listFiles(relativePath: string): Promise<string[]>;
  deleteDirectory(relativePath: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  exists(relativePath: string): Promise<boolean>;
}
