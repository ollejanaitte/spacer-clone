import type { OpenProjectFileResult, SaveProjectFileResult } from "./spacerDesktop";

function hasSpacerDesktopBridge(): boolean {
  return typeof window !== "undefined" && typeof window.spacerDesktop?.openProjectFile === "function";
}

function openProjectFileBrowser(): Promise<OpenProjectFileResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve({ canceled: true });
        return;
      }
      void file.text().then((content) => {
        resolve({ canceled: false, fileName: file.name, content });
      });
    });
    input.addEventListener("cancel", () => {
      input.remove();
      resolve({ canceled: true });
    });
    document.body.appendChild(input);
    input.click();
  });
}

function saveProjectFileBrowser(content: string, suggestedName = "project.json"): Promise<SaveProjectFileResult> {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
  return Promise.resolve({ canceled: false, filePath: suggestedName });
}

export function isNativeProjectFileDialogAvailable(): boolean {
  return hasSpacerDesktopBridge();
}

export async function openProjectFile(): Promise<OpenProjectFileResult> {
  if (hasSpacerDesktopBridge()) {
    return window.spacerDesktop!.openProjectFile();
  }
  return openProjectFileBrowser();
}

export async function saveProjectFile(
  content: string,
  suggestedName = "project.json",
): Promise<SaveProjectFileResult> {
  if (hasSpacerDesktopBridge()) {
    return window.spacerDesktop!.saveProjectFile(content, suggestedName);
  }
  return saveProjectFileBrowser(content, suggestedName);
}

export async function saveSpacerProjFile(
  content: string,
  suggestedName = "project.spacerproj",
): Promise<SaveProjectFileResult> {
  if (typeof window !== "undefined" && typeof window.spacerDesktop?.saveSpacerProjFile === "function") {
    return window.spacerDesktop!.saveSpacerProjFile(content, suggestedName);
  }
  return saveProjectFileBrowser(content, suggestedName);
}

export async function showAboutDialog(): Promise<void> {
  if (typeof window !== "undefined" && typeof window.spacerDesktop?.showAbout === "function") {
    await window.spacerDesktop.showAbout();
  }
}

export function getDesktopPlatform(): NodeJS.Platform | "browser" {
  if (hasSpacerDesktopBridge()) {
    return window.spacerDesktop!.platform;
  }
  return "browser";
}
