"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Channel strings are inlined here on purpose: Electron's sandboxed preload bundle
// cannot resolve relative imports such as `./ipcChannels`. Main-process handlers
// still use `ipcChannels.ts` as the single source of truth for registration.
const OPEN_PROJECT_CHANNEL = "spacer:dialog:open-project";
const SAVE_PROJECT_CHANNEL = "spacer:dialog:save-project";
const SHOW_ABOUT_CHANNEL = "spacer:app:show-about";
const CLOSE_GUARD_PROMPT_CHANNEL = "spacer:close-guard:prompt";
const CLOSE_GUARD_RESPONSE_CHANNEL = "spacer:close-guard:response";
electron_1.contextBridge.exposeInMainWorld("spacerDesktop", {
    openProjectFile: () => electron_1.ipcRenderer.invoke(OPEN_PROJECT_CHANNEL),
    saveProjectFile: (content, suggestedName) => electron_1.ipcRenderer.invoke(SAVE_PROJECT_CHANNEL, { content, suggestedName }),
    showAbout: () => electron_1.ipcRenderer.invoke(SHOW_ABOUT_CHANNEL),
    onCloseGuardPrompt: (listener) => {
        const wrapped = (_event, payload) => {
            listener(payload);
        };
        electron_1.ipcRenderer.on(CLOSE_GUARD_PROMPT_CHANNEL, wrapped);
        return () => {
            electron_1.ipcRenderer.removeListener(CLOSE_GUARD_PROMPT_CHANNEL, wrapped);
        };
    },
    respondCloseGuard: (allow) => {
        const payload = { allow };
        electron_1.ipcRenderer.send(CLOSE_GUARD_RESPONSE_CHANNEL, payload);
    },
    platform: process.platform,
});
