export type OpenProjectFileResult =
  | { canceled: true }
  | { canceled: false; fileName: string; content: string };

export type SaveProjectFileResult =
  | { canceled: true }
  | { canceled: false; filePath: string };

export type CloseGuardPromptPayload = {
  readonly kind: "window-close" | "app-quit";
};

export type PersistenceIpcResult =
  | { ok: true; value?: { content?: string; rootDir?: string; exists?: boolean; [key: string]: unknown } }
  | { ok: false; reason: string };

export type SpacerDesktopBridge = {
  openProjectFile: () => Promise<OpenProjectFileResult>;
  saveProjectFile: (content: string, suggestedName?: string) => Promise<SaveProjectFileResult>;
  saveSpacerProjFile?: (content: string, suggestedName?: string) => Promise<SaveProjectFileResult>;
  showAbout: () => Promise<void>;
  persistence?: {
    init: () => Promise<PersistenceIpcResult>;
    getRootDir: () => Promise<PersistenceIpcResult>;
    readFile: (relativePath: string) => Promise<PersistenceIpcResult>;
    writeFile: (relativePath: string, content: string) => Promise<PersistenceIpcResult>;
    listDirectories: (relativePath: string) => Promise<PersistenceIpcResult>;
    listFiles: (relativePath: string) => Promise<PersistenceIpcResult>;
    deleteDirectory: (relativePath: string) => Promise<PersistenceIpcResult>;
    exists: (relativePath: string) => Promise<PersistenceIpcResult>;
  };
  onCloseGuardPrompt?: (listener: (payload: CloseGuardPromptPayload) => void) => () => void;
  respondCloseGuard?: (allow: boolean) => void;
  platform: NodeJS.Platform;
  gpuMode?: string;
  appVersion?: string;
};

declare global {
  interface Window {
    spacerDesktop?: SpacerDesktopBridge;
  }
}

export {};
