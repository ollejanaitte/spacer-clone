import { useState } from "react";
import { getAuthorizationBannerLines, type AuthorizationMessageId } from "../i18n";
import { TechnicalDetails } from "./TechnicalDetails";

export type CompactAuthorizationBadgeProps = {
  readonly keys?: readonly (AuthorizationMessageId | string)[];
  readonly testId?: string;
  readonly forceExpanded?: boolean;
};

const DEFAULT_KEYS: readonly AuthorizationMessageId[] = [
  "UNVERIFIED_DEVELOPMENT_ONLY",
  "NOT_GRANTED",
  "PROHIBITED",
];

export function CompactAuthorizationBadge({
  keys = DEFAULT_KEYS,
  testId = "apollo-compact-auth-badge",
  forceExpanded = false,
}: CompactAuthorizationBadgeProps) {
  const [expanded, setExpanded] = useState(forceExpanded);
  const { l1Lines, l2Lines, technicalLines } = getAuthorizationBannerLines(keys);

  if (forceExpanded) {
    return (
      <aside className="apollo-authorization-banner apollo-compact-auth-expanded" data-testid={testId} role="note">
        <p className="apollo-authorization-banner-l1" data-testid={`${testId}-l1`}>
          {l1Lines.join(" — ")}
        </p>
        {l2Lines.length > 0 ? (
          <p className="apollo-authorization-banner-l2" data-testid={`${testId}-l2`}>
            {l2Lines.join(" ")}
          </p>
        ) : null}
        <TechnicalDetails
          testId={`${testId}-tech`}
          lines={technicalLines}
          title="認可"
        />
      </aside>
    );
  }

  const summary = l1Lines.join(" / ");

  return (
    <div className="apollo-compact-auth" data-testid={testId}>
      <button
        type="button"
        className="apollo-compact-auth-toggle"
        data-testid={`${testId}-toggle`}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="apollo-compact-auth-token">{summary}</span>
        <span className="apollo-compact-auth-arrow">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? (
        <div className="apollo-compact-auth-panel" data-testid={`${testId}-panel`}>
          {l2Lines.length > 0 ? (
            <p className="apollo-authorization-banner-l2" data-testid={`${testId}-l2`}>
              {l2Lines.join(" ")}
            </p>
          ) : null}
          <TechnicalDetails
            testId={`${testId}-tech`}
            lines={technicalLines}
            title="認可"
          />
        </div>
      ) : null}
    </div>
  );
}