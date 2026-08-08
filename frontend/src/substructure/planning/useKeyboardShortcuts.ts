// Phase C1 (M2-07) キーボードショートカット（C1 対象）
// P03.5: ESC=選択解除, Ctrl/Cmd+Z=Undo, Ctrl/Cmd+Y or Shift+Z=Redo, Delete=削除。
import { useEffect } from "react";
import type { SelectionApi } from "./selectionState";

export interface ShortcutHandlers {
  onDeselect: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
}

export function useSubstructureShortcuts(
  handlers: ShortcutHandlers,
  selectionApi?: SelectionApi,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      // フォーム入力中のショートカット干渉を避ける
      const inField =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      if (e.key === "Escape") {
        handlers.onDeselect();
        return;
      }
      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) handlers.onRedo?.();
        else handlers.onUndo?.();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }
      if (e.key === "Delete" && !inField) {
        handlers.onDelete?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers, selectionApi]);
}
