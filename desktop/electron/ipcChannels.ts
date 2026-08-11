export const IPC_CHANNELS = {
  OPEN_PROJECT: "spacer:dialog:open-project",
  SAVE_PROJECT: "spacer:dialog:save-project",
  SHOW_ABOUT: "spacer:app:show-about",
  CLOSE_GUARD_PROMPT: "spacer:close-guard:prompt",
  CLOSE_GUARD_RESPONSE: "spacer:close-guard:response",
  PERSISTENCE_INIT: "spacer:persistence:init",
  PERSISTENCE_GET_ROOT: "spacer:persistence:get-root",
  PERSISTENCE_READ_FILE: "spacer:persistence:read-file",
  PERSISTENCE_WRITE_FILE: "spacer:persistence:write-file",
  PERSISTENCE_LIST_DIRS: "spacer:persistence:list-dirs",
  PERSISTENCE_LIST_FILES: "spacer:persistence:list-files",
  PERSISTENCE_DELETE_DIR: "spacer:persistence:delete-dir",
  PERSISTENCE_EXISTS: "spacer:persistence:exists",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
