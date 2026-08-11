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

function getAutomationOpenPath(): string | null {
  const candidate = process.env.SPACER_AUTOMATION_OPEN_PATH;
  return isNonEmptyString(candidate) ? candidate : null;
}

function getAutomationSavePath(): string | null {
  const candidate = process.env.SPACER_AUTOMATION_SAVE_PATH;
  return isNonEmptyString(candidate) ? candidate : null;
}

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
  const automationPath = getAutomationOpenPath();
  if (automationPath) {
    const content = await fs.readFile(automationPath, "utf8");
    return { canceled: false, fileName: path.basename(automationPath), content };
  }
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
  const automationPath = getAutomationSavePath();
  if (automationPath) {
    const filePath = ensureJsonExtension(automationPath);
    await fs.writeFile(filePath, payload.content, "utf8");
    return { canceled: false, filePath };
  }
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

function ensureSpacerProjExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(".spacerproj") ? filePath : `${filePath}.spacerproj`;
}

export async function handleSaveSpacerProj(
  parent: Electron.BrowserWindow | undefined,
  payload: SaveProjectPayload,
): Promise<SaveProjectResult> {
  const automationPath = getAutomationSavePath();
  if (automationPath) {
    const filePath = ensureSpacerProjExtension(automationPath);
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, payload.content, "utf8");
    await fs.rename(tempPath, filePath);
    return { canceled: false, filePath };
  }
  const options: Electron.SaveDialogOptions = {
    title: "業務データを書き出し",
    defaultPath: payload.suggestedName ?? "project.spacerproj",
    filters: [{ name: "Project Package", extensions: ["spacerproj"] }],
  };
  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options);
  if (result.canceled || !isNonEmptyString(result.filePath)) {
    return { canceled: true };
  }
  const filePath = ensureSpacerProjExtension(result.filePath);
  // temp -> rename: never leave a broken final package as a valid artifact
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, payload.content, "utf8");
  await fs.rename(tempPath, filePath);
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
  ipcMain.handle(IPC_CHANNELS.SAVE_SPACER_PROJ, async (_event, payload: unknown) => {
    const validated = validateSavePayload(payload);
    if (!validated) {
      throw new Error("Invalid save-spacerproj payload");
    }
    return handleSaveSpacerProj(getParentWindow(), validated);
  });
  ipcMain.handle(IPC_CHANNELS.SHOW_ABOUT, async () => {
    await showAbout(getParentWindow());
  });
}
