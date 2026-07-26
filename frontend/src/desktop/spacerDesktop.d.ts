export type OpenProjectFileResult =
  | { canceled: true }
  | { canceled: false; fileName: string; content: string };

export type SaveProjectFileResult =
  | { canceled: true }
  | { canceled: false; filePath: string };

export type SpacerDesktopBridge = {
  openProjectFile: () => Promise<OpenProjectFileResult>;
  saveProjectFile: (content: string, suggestedName?: string) => Promise<SaveProjectFileResult>;
  showAbout: () => Promise<void>;
  platform: NodeJS.Platform;
};

declare global {
  interface Window {
    spacerDesktop?: SpacerDesktopBridge;
  }
}

export {};
