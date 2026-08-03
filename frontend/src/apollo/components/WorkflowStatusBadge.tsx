/**
 * Step 4-A workflow status badge.
 * Never color-only: every badge renders an explicit label + status symbol so
 * color is a reinforcement, not the only signal (a11y, E2E-S4A-005).
 */
import type { WorkflowStatus } from "../workflow/types";
import { STATUS_GROUP_LABELS } from "../workflow/diagnostics";

const STATUS_SYMBOL: Record<WorkflowStatus, string> = {
  NOT_STARTED: "○",
  AVAILABLE: "△",
  RECOMMENDED: "★",
  INCOMPLETE: "…",
  BLOCKED: "✕",
  READY: "▶",
  STALE: "↻",
  WARNING: "!",
  ERROR: "✕!",
  COMPLETE: "✓",
  NOT_AUTHORIZED: "🔒",
  OUT_OF_SCOPE: "–",
};

type Props = {
  readonly status: WorkflowStatus;
  readonly isRecommended?: boolean;
};

export function WorkflowStatusBadge({ status, isRecommended = false }: Props) {
  const symbol = STATUS_SYMBOL[status];
  const label = STATUS_GROUP_LABELS[status];
  return (
    <span
      className={`apollo-wf-badge apollo-wf-badge-${status.toLowerCase()}`}
      data-testid={`apollo-wf-status-${status.toLowerCase()}`}
      aria-label={`状態: ${label}${isRecommended ? "（推奨）" : ""}`}
    >
      <span className="apollo-wf-badge-symbol" aria-hidden="true">
        {symbol}
      </span>
      <span className="apollo-wf-badge-label">{label}</span>
      {isRecommended ? (
        <span className="apollo-wf-badge-recommended" data-testid="apollo-wf-recommended-flag">
          {STATUS_GROUP_LABELS.RECOMMENDED}
        </span>
      ) : null}
    </span>
  );
}
