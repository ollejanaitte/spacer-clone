import type { ReactNode } from "react";

export type SaveStatusBadgeProps = {
  readonly isDirty: boolean;
  readonly persisting: "save" | "reload" | null;
};

const STATUS_SAVED = "保存済み" as const;
const STATUS_UNSAVED = "変更あり" as const;
const STATUS_PERSISTING = "保存中..." as const;

export function SaveStatusBadge({ isDirty, persisting }: SaveStatusBadgeProps) {
  let status: string;
  let className: string;
  if (persisting === "save") {
    status = STATUS_PERSISTING;
    className = "apollo-save-status-persisting";
  } else if (isDirty) {
    status = STATUS_UNSAVED;
    className = "apollo-save-status-unsaved";
  } else {
    status = STATUS_SAVED;
    className = "apollo-save-status-saved";
  }
  return (
    <span
      className={`apollo-save-status-badge ${className}`}
      data-testid="apollo-save-status-badge"
      aria-live="polite"
    >
      {status}
    </span>
  );
}