/**
 * Collapsed-by-default technical details (L3).
 * Internal enum / diagnostic codes stay English here only.
 */
import { useId, useState, type ReactNode } from "react";
import { getButtonLabel } from "../i18n";

export type TechnicalDetailsProps = {
  readonly title?: string;
  readonly children?: ReactNode;
  /** Preformatted code=value lines */
  readonly lines?: readonly string[];
  readonly defaultOpen?: boolean;
  readonly testId?: string;
};

export function TechnicalDetails({
  title,
  children,
  lines = [],
  defaultOpen = false,
  testId = "apollo-technical-details",
}: TechnicalDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const summary = open ? "技術情報を閉じる" : getButtonLabel("SHOW_TECH");

  return (
    <div className="apollo-technical-details" data-testid={testId}>
      <button
        type="button"
        className="apollo-technical-details-toggle"
        data-testid={`${testId}-toggle`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {title ? `${summary}（${title}）` : summary}
      </button>
      {open ? (
        <div
          id={panelId}
          className="apollo-technical-details-panel"
          data-testid={`${testId}-panel`}
          data-technical-details="expanded"
        >
          {lines.length > 0 ? (
            <pre className="apollo-technical-details-pre" data-testid={`${testId}-lines`}>
              {lines.join("\n")}
            </pre>
          ) : null}
          {children}
        </div>
      ) : (
        <div hidden data-technical-details="collapsed" />
      )}
    </div>
  );
}
