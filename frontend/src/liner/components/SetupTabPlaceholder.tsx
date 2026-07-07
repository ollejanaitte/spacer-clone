import type { ReactNode } from "react";
import { ja } from "../../i18n/ja";
import type { LinerSetupTabId } from "../uiPreparation";

export type SetupTabPlaceholderProps = {
  tabId: LinerSetupTabId;
  /** Placeholder copy key under ja.liner.setupTabs.placeholders. */
  variant: "height" | "review";
  /** Optional override for tests or future routed placeholders. */
  customTitle?: string;
  customBody?: ReactNode;
  /** Optional actions, such as a Preview or Mapping navigation button. */
  actions?: ReactNode;
};

export function SetupTabPlaceholder({
  tabId,
  variant,
  customTitle,
  customBody,
  actions,
}: SetupTabPlaceholderProps) {
  const fallback = ja.liner.setupTabs.placeholders[variant];
  const title = customTitle ?? fallback.title;
  const body = customBody ?? fallback.body;
  return (
    <section
      className="liner-edit-panel liner-setup-tab-placeholder"
      aria-label={title}
      data-testid={`liner-setup-tab-placeholder-${tabId}`}
    >
      <h2>{title}</h2>
      <p>{body}</p>
      {actions}
    </section>
  );
}
