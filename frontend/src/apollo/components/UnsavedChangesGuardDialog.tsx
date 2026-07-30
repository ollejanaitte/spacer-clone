import { useEffect, useRef, useState } from "react";
import type { UnsavedGuardChoice } from "../unsavedChangesGuard";

type UnsavedChangesGuardDialogProps = {
  open: boolean;
  message: string;
  onChoice: (choice: UnsavedGuardChoice) => void;
};

export function UnsavedChangesGuardDialog({
  open,
  message,
  onChoice,
}: UnsavedChangesGuardDialogProps) {
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    saveButtonRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="apollo-guard-backdrop" data-testid="apollo-unsaved-guard-dialog" role="presentation">
      <section
        className="apollo-guard-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apollo-unsaved-guard-title"
      >
        <h2 id="apollo-unsaved-guard-title">未保存の変更があります</h2>
        <p>{message}</p>
        <div className="apollo-guard-actions">
          <button
            ref={saveButtonRef}
            type="button"
            data-testid="apollo-guard-save"
            onClick={() => onChoice("save")}
          >
            保存
          </button>
          <button type="button" data-testid="apollo-guard-discard" onClick={() => onChoice("discard")}>
            破棄
          </button>
          <button type="button" data-testid="apollo-guard-cancel" onClick={() => onChoice("cancel")}>
            キャンセル
          </button>
        </div>
      </section>
    </div>
  );
}

type GuardPromptController = {
  prompt: (message: string) => Promise<UnsavedGuardChoice>;
  dialogProps: {
    open: boolean;
    message: string;
    onChoice: (choice: UnsavedGuardChoice) => void;
  };
};

export function useUnsavedGuardPrompt(): GuardPromptController {
  const resolverRef = useRef<((choice: UnsavedGuardChoice) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const prompt = (nextMessage: string) =>
    new Promise<UnsavedGuardChoice>((resolve) => {
      resolverRef.current = resolve;
      setMessage(nextMessage);
      setOpen(true);
    });

  const onChoice = (choice: UnsavedGuardChoice) => {
    setOpen(false);
    resolverRef.current?.(choice);
    resolverRef.current = null;
  };

  return {
    prompt,
    dialogProps: {
      open,
      message,
      onChoice,
    },
  };
}
