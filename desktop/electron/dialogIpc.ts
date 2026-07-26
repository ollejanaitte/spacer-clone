import { dialog, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { IPC_CHANNELS } from "./ipcChannels";

export type OpenProjectResult =
  | { canceled: true }
  | { canceled: false; fileName: string; content: string };

export type SaveProjectPayload = {
  content: string;
  suggestedName?: string;
};

export type SaveProjectResult =
  | { canceled: true }
  | { canceled: false; filePath: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function validateSavePayload(payload: unknown): SaveProjectPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.content !== "string") return null;
  if (record.suggestedName !== undefined && typeof record.suggestedName !== "string") {
    return null;
  }
  return {
    content: record.content,
    suggestedName: record.suggestedName,
  };
}

function ensureJsonExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(".json") ? filePath : `${filePath}.json`;
}

export async function handleOpenProject(
  parent: Electron.BrowserWindow | undefined,
): Promise<OpenProjectResult> {
  const options: Electron.OpenDialogOptions = {
    title: "プロジェクトを開く",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  };
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const filePath = result.filePaths[0];
  if (!isNonEmptyString(filePath)) {
    return { canceled: true };
  }
  const content = await fs.readFile(filePath, "utf8");
  return { canceled: false, fileName: path.basename(filePath), content };
}

export async function handleSaveProject(
  parent: Electron.BrowserWindow | undefined,
  payload: SaveProjectPayload,
): Promise<SaveProjectResult> {
  const options: Electron.SaveDialogOptions = {
    title: "プロジェクトを保存",
    defaultPath: payload.suggestedName ?? "project.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  };
  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options);
  if (result.canceled || !isNonEmptyString(result.filePath)) {
    return { canceled: true };
  }
  const filePath = ensureJsonExtension(result.filePath);
  await fs.writeFile(filePath, payload.content, "utf8");
  return { canceled: false, filePath };
}

export type ShowAboutHandler = (parent: Electron.BrowserWindow | undefined) => Promise<void>;

export function registerDialogIpc(getParentWindow: () => Electron.BrowserWindow | undefined, showAbout: ShowAboutHandler): void {
  ipcMain.handle(IPC_CHANNELS.OPEN_PROJECT, async () => handleOpenProject(getParentWindow()));
  ipcMain.handle(IPC_CHANNELS.SAVE_PROJECT, async (_event, payload: unknown) => {
    const validated = validateSavePayload(payload);
    if (!validated) {
      throw new Error("Invalid save-project payload");
    }
    return handleSaveProject(getParentWindow(), validated);
  });
  ipcMain.handle(IPC_CHANNELS.SHOW_ABOUT, async () => {
    await showAbout(getParentWindow());
  });
}
