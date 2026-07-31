export type OpenProjectFileResult =
  | { canceled: true }
  | { canceled: false; fileName: string; content: string };

export type SaveProjectFileResult =
  | { canceled: true }
  | { canceled: false; filePath: string };

export type CloseGuardPromptPayload = {
  readonly kind: "window-close" | "app-quit";
};

export type SpacerDesktopBridge = {
  openProjectFile: () => Promise<OpenProjectFileResult>;
  saveProjectFile: (content: string, suggestedName?: string) => Promise<SaveProjectFileResult>;
  showAbout: () => Promise<void>;
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
