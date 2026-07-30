import { contextBridge, ipcRenderer } from "electron";

// Channel strings are inlined here on purpose: Electron's sandboxed preload bundle
// cannot resolve relative imports such as `./ipcChannels`. Main-process handlers
// still use `ipcChannels.ts` as the single source of truth for registration.
const OPEN_PROJECT_CHANNEL = "spacer:dialog:open-project";
const SAVE_PROJECT_CHANNEL = "spacer:dialog:save-project";
const SHOW_ABOUT_CHANNEL = "spacer:app:show-about";
const CLOSE_GUARD_PROMPT_CHANNEL = "spacer:close-guard:prompt";
const CLOSE_GUARD_RESPONSE_CHANNEL = "spacer:close-guard:response";

type CloseGuardPromptPayload = {
  kind: "window-close" | "app-quit";
};

type CloseGuardResponsePayload = {
  allow: boolean;
};

contextBridge.exposeInMainWorld("spacerDesktop", {
  openProjectFile: () => ipcRenderer.invoke(OPEN_PROJECT_CHANNEL),
  saveProjectFile: (content: string, suggestedName?: string) =>
    ipcRenderer.invoke(SAVE_PROJECT_CHANNEL, { content, suggestedName }),
  showAbout: () => ipcRenderer.invoke(SHOW_ABOUT_CHANNEL),
  onCloseGuardPrompt: (listener: (payload: CloseGuardPromptPayload) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: CloseGuardPromptPayload) => {
      listener(payload);
    };
    ipcRenderer.on(CLOSE_GUARD_PROMPT_CHANNEL, wrapped);
    return () => {
      ipcRenderer.removeListener(CLOSE_GUARD_PROMPT_CHANNEL, wrapped);
    };
  },
  respondCloseGuard: (allow: boolean) => {
    const payload: CloseGuardResponsePayload = { allow };
    ipcRenderer.send(CLOSE_GUARD_RESPONSE_CHANNEL, payload);
  },
  platform: process.platform,
});
