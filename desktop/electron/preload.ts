import { contextBridge, ipcRenderer } from "electron";

// Channel strings are inlined here on purpose: Electron's sandboxed preload bundle
// cannot resolve relative imports such as `./ipcChannels`. Main-process handlers
// still use `ipcChannels.ts` as the single source of truth for registration.
const OPEN_PROJECT_CHANNEL = "spacer:dialog:open-project";
const SAVE_PROJECT_CHANNEL = "spacer:dialog:save-project";
const SHOW_ABOUT_CHANNEL = "spacer:app:show-about";

contextBridge.exposeInMainWorld("spacerDesktop", {
  openProjectFile: () => ipcRenderer.invoke(OPEN_PROJECT_CHANNEL),
  saveProjectFile: (content: string, suggestedName?: string) =>
    ipcRenderer.invoke(SAVE_PROJECT_CHANNEL, { content, suggestedName }),
  showAbout: () => ipcRenderer.invoke(SHOW_ABOUT_CHANNEL),
  platform: process.platform,
});
