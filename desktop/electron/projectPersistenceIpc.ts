import { app, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { IPC_CHANNELS } from "./ipcChannels";

export type PersistenceIpcResult =
  | { ok: true; value?: unknown }
  | { ok: false; reason: string };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function projectsRoot(): string {
  return path.join(app.getPath("userData"), "projects");
}

function resolveSafe(relativePath: string): string {
  const cleaned = relativePath.replace(/^\/+/, "");
  return path.join(projectsRoot(), cleaned);
}

async function handleWriteFile(payload: unknown): Promise<PersistenceIpcResult> {
  if (!payload || typeof payload !== "object") return { ok: false, reason: "invalid-payload" };
  const record = payload as Record<string, unknown>;
  if (!isString(record.relativePath) || !isString(record.content)) {
    return { ok: false, reason: "invalid-payload" };
  }
  try {
    const target = resolveSafe(record.relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, record.content, "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "write-failed" };
  }
}

async function handleReadFile(payload: unknown): Promise<PersistenceIpcResult> {
  if (!isString(payload)) return { ok: false, reason: "invalid-payload" };
  try {
    const content = await fs.readFile(resolveSafe(payload), "utf8");
    return { ok: true, value: { content } };
  } catch {
    return { ok: false, reason: "not-found" };
  }
}

async function handleListDirs(payload: unknown): Promise<PersistenceIpcResult> {
  const relativePath = isString(payload) ? payload : "";
  try {
    const entries = await fs.readdir(resolveSafe(relativePath), { withFileTypes: true });
    return {
      ok: true,
      value: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    };
  } catch {
    return { ok: true, value: [] };
  }
}

async function handleListFiles(payload: unknown): Promise<PersistenceIpcResult> {
  const relativePath = isString(payload) ? payload : "";
  try {
    const entries = await fs.readdir(resolveSafe(relativePath), { withFileTypes: true });
    return {
      ok: true,
      value: entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort(),
    };
  } catch {
    return { ok: true, value: [] };
  }
}

async function handleDeleteDir(payload: unknown): Promise<PersistenceIpcResult> {
  if (!isString(payload)) return { ok: false, reason: "invalid-payload" };
  try {
    await fs.rm(resolveSafe(payload), { recursive: true, force: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "delete-failed" };
  }
}

async function handleExists(payload: unknown): Promise<PersistenceIpcResult> {
  if (!isString(payload)) return { ok: false, reason: "invalid-payload" };
  try {
    await fs.access(resolveSafe(payload));
    return { ok: true, value: { exists: true } };
  } catch {
    return { ok: true, value: { exists: false } };
  }
}

export function registerPersistenceIpc(): void {
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_INIT, async () => {
    try {
      await fs.mkdir(projectsRoot(), { recursive: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "init-failed" };
    }
  });
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_GET_ROOT, async () => ({
    ok: true,
    value: { rootDir: projectsRoot() },
  }));
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_READ_FILE, (_event, payload) => handleReadFile(payload));
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_WRITE_FILE, (_event, payload) => handleWriteFile(payload));
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_LIST_DIRS, (_event, payload) => handleListDirs(payload));
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_LIST_FILES, (_event, payload) => handleListFiles(payload));
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_DELETE_DIR, (_event, payload) => handleDeleteDir(payload));
  ipcMain.handle(IPC_CHANNELS.PERSISTENCE_EXISTS, (_event, payload) => handleExists(payload));
}
