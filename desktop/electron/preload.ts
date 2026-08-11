import { contextBridge, ipcRenderer } from "electron";

// Channel strings are inlined here on purpose: Electron's sandboxed preload bundle
// cannot resolve relative imports such as `./ipcChannels`. Main-process handlers
// still use `ipcChannels.ts` as the single source of truth for registration.
const OPEN_PROJECT_CHANNEL = "spacer:dialog:open-project";
const SAVE_PROJECT_CHANNEL = "spacer:dialog:save-project";
const SHOW_ABOUT_CHANNEL = "spacer:app:show-about";
const CLOSE_GUARD_PROMPT_CHANNEL = "spacer:close-guard:prompt";
const CLOSE_GUARD_RESPONSE_CHANNEL = "spacer:close-guard:response";
const PERSISTENCE_INIT_CHANNEL = "spacer:persistence:init";
const PERSISTENCE_GET_ROOT_CHANNEL = "spacer:persistence:get-root";
const PERSISTENCE_READ_FILE_CHANNEL = "spacer:persistence:read-file";
const PERSISTENCE_WRITE_FILE_CHANNEL = "spacer:persistence:write-file";
const PERSISTENCE_LIST_DIRS_CHANNEL = "spacer:persistence:list-dirs";
const PERSISTENCE_LIST_FILES_CHANNEL = "spacer:persistence:list-files";
const PERSISTENCE_DELETE_DIR_CHANNEL = "spacer:persistence:delete-dir";
const PERSISTENCE_EXISTS_CHANNEL = "spacer:persistence:exists";

type CloseGuardPromptPayload = {
  kind: "window-close" | "app-quit";
};

type CloseGuardResponsePayload = {
  allow: boolean;
};

type GpuMode = "normal" | "compat-gpu-blocklist" | "compat-angle-gl" | "legacy-desktop-gl";

function resolveGpuModeFromArgs(argv: string[], envValue: string | undefined): GpuMode {
  return resolveGpuMode(envValue ?? findGpuModeArg(argv));
}

function resolveGpuMode(input: string | undefined): GpuMode {
  switch (input) {
    case "compat-gpu-blocklist":
    case "compat-angle-gl":
    case "legacy-desktop-gl":
    case "normal":
      return input;
    default:
      return "normal";
  }
}

function findGpuModeArg(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--gpu-mode=")) {
      return arg.slice("--gpu-mode=".length);
    }
    if (arg === "--gpu-mode") {
      return argv[index + 1];
    }
  }
  return undefined;
}

contextBridge.exposeInMainWorld("spacerDesktop", {
  openProjectFile: () => ipcRenderer.invoke(OPEN_PROJECT_CHANNEL),
  saveProjectFile: (content: string, suggestedName?: string) =>
    ipcRenderer.invoke(SAVE_PROJECT_CHANNEL, { content, suggestedName }),
  showAbout: () => ipcRenderer.invoke(SHOW_ABOUT_CHANNEL),
  persistence: {
    init: () => ipcRenderer.invoke(PERSISTENCE_INIT_CHANNEL),
    getRootDir: () => ipcRenderer.invoke(PERSISTENCE_GET_ROOT_CHANNEL),
    readFile: (relativePath: string) => ipcRenderer.invoke(PERSISTENCE_READ_FILE_CHANNEL, relativePath),
    writeFile: (relativePath: string, content: string) =>
      ipcRenderer.invoke(PERSISTENCE_WRITE_FILE_CHANNEL, { relativePath, content }),
    listDirectories: (relativePath: string) => ipcRenderer.invoke(PERSISTENCE_LIST_DIRS_CHANNEL, relativePath),
    listFiles: (relativePath: string) => ipcRenderer.invoke(PERSISTENCE_LIST_FILES_CHANNEL, relativePath),
    deleteDirectory: (relativePath: string) => ipcRenderer.invoke(PERSISTENCE_DELETE_DIR_CHANNEL, relativePath),
    exists: (relativePath: string) => ipcRenderer.invoke(PERSISTENCE_EXISTS_CHANNEL, relativePath),
  },
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
  gpuMode: resolveGpuModeFromArgs(process.argv, process.env.GPU_MODE),
  appVersion: process.env.npm_package_version ?? "0.0.0",
});
