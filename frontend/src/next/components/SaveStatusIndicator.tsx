import { useEffect, useState } from "react";
import type { SaveState } from "../project/persistentProjectManager";
import { getProjectManager } from "../project/projectManagerInstance";

const LABELS: Record<SaveState, { text: string; testid: string }> = {
  idle: { text: "", testid: "save-state-idle" },
  saving: { text: "保存中...", testid: "save-state-saving" },
  saved: { text: "保存済み", testid: "save-state-saved" },
  failed: { text: "保存に失敗しました", testid: "save-state-failed" },
};

export function SaveStatusIndicator() {
  const [state, setState] = useState<SaveState>(() => getProjectManager().getSaveState());

  useEffect(() => {
    const unsubscribe = getProjectManager().onSaveState(setState);
    return unsubscribe;
  }, []);

  if (state === "idle") {
    return null;
  }

  const label = LABELS[state];
  return (
    <span className={`next-save-state next-save-state-${state}`} data-testid={label.testid} role="status">
      {label.text}
    </span>
  );
}
