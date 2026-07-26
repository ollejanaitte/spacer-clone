export const IPC_CHANNELS = {
  OPEN_PROJECT: "spacer:dialog:open-project",
  SAVE_PROJECT: "spacer:dialog:save-project",
  SHOW_ABOUT: "spacer:app:show-about",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
