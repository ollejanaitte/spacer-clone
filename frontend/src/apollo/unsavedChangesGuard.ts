export type UnsavedGuardChoice = "save" | "discard" | "cancel";

export type UnsavedGuardResolution = "proceed" | "abort";

export type UnsavedGuardPrompt = (message: string) => Promise<UnsavedGuardChoice>;

export type UnsavedChangesGuardParams = {
  readonly isDirty: boolean;
  readonly message: string;
  readonly prompt: UnsavedGuardPrompt;
  readonly save: () => Promise<boolean>;
  readonly discard?: () => void;
  readonly flushComposition?: () => void;
};

/**
 * Shared Save / Discard / Cancel contract for Apollo guarded transitions.
 * Failed save and cancel both abort the requested action.
 */
export async function resolveUnsavedChangesGuard(
  params: UnsavedChangesGuardParams,
): Promise<UnsavedGuardResolution> {
  params.flushComposition?.();
  if (!params.isDirty) {
    return "proceed";
  }
  const choice = await params.prompt(params.message);
  if (choice === "cancel") {
    return "abort";
  }
  if (choice === "discard") {
    params.discard?.();
    return "proceed";
  }
  const saved = await params.save();
  return saved ? "proceed" : "abort";
}
