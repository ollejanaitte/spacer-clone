/**
 * Step 5-R R3: editable cross-frame / sway attachment depths (ER-001).
 * Datum: depth downward from girder top-flange upper face [m].
 */
import { useMemo } from "react";
import type { ProjectModel } from "../../types";
import {
  getBridgeStructureInputDraft,
  validateCrossFrameAttachment,
  withCrossFrameAttachment,
  type ApolloCrossFrameAttachmentDraft,
  type CrossFramePattern,
} from "../bridgeStructure";

type Props = {
  readonly project: ProjectModel;
  readonly onProjectChange: (nextProject: ProjectModel) => void;
  readonly onAuditEvent?: (message: string) => void;
};

const PATTERN_OPTIONS: readonly { value: CrossFramePattern; label: string; available: boolean }[] = [
  { value: "V", label: "V（IMPLEMENTED）", available: true },
  { value: "INVERTED_V", label: "逆V（PLANNED / UNAVAILABLE）", available: false },
  { value: "X", label: "X（PLANNED / UNAVAILABLE）", available: false },
];

export function CrossFrameAttachmentInputPanel({ project, onProjectChange, onAuditEvent }: Props) {
  const draft = useMemo(() => getBridgeStructureInputDraft(project), [project]);
  const config = draft.crossFrameAttachment;
  const diagnostics = useMemo(
    () => validateCrossFrameAttachment(config, draft.girderDepth),
    [config, draft.girderDepth],
  );

  const patch = (partial: Partial<ApolloCrossFrameAttachmentDraft>) => {
    const next: ApolloCrossFrameAttachmentDraft = {
      ...config,
      ...partial,
      provenance: "USER_PROVIDED_UNVERIFIED",
      status: "DEVELOPMENT",
    };
    onProjectChange(withCrossFrameAttachment(project, next));
    onAuditEvent?.("対傾構取付点を更新しました（STALE → 再生成が必要）");
  };

  const parseNullableNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  };

  return (
    <section
      className="apollo-editor-card"
      data-testid="apollo-cross-frame-attachment-panel"
      aria-label="対傾構取付点入力"
    >
      <h3>対傾構取付点（Step 5-R / ER-001）</h3>
      <p
        className="apollo-input-error"
        role="status"
        data-testid="apollo-cross-frame-dev-banner"
      >
        UNVERIFIED DEVELOPMENT ONLY — HUMAN ENGINEERING REVIEW REQUIRED /
        NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED / mesh推定禁止
      </p>
      <p className="apollo-inline-hint">
        基準: 主桁上フランジ上面から下向きの depth [m]。横桁（CrossBeam）とは別 entity です。
        provenance: {config.provenance} / pattern status:{" "}
        {config.pattern === "V" ? "IMPLEMENTED" : "PLANNED"}
      </p>

      <fieldset>
        <legend>配置パターン</legend>
        {PATTERN_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="cross-frame-pattern"
              value={option.value}
              checked={config.pattern === option.value}
              disabled={!option.available}
              data-testid={`apollo-cross-frame-pattern-${option.value}`}
              onChange={() => {
                if (option.available) patch({ pattern: option.value });
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <div className="apollo-cross-frame-fields">
        <label>
          上側取付 depth（上フランジ上面から下向き） [m]
          <input
            type="number"
            step="0.001"
            min="0"
            value={config.upperAttachmentDepthFromGirderTop ?? ""}
            data-testid="apollo-cross-frame-upper-depth"
            onChange={(event) =>
              patch({ upperAttachmentDepthFromGirderTop: parseNullableNumber(event.target.value) })
            }
          />
        </label>
        <label>
          下側取付 depth（上フランジ上面から下向き） [m]
          <input
            type="number"
            step="0.001"
            min="0"
            value={config.lowerAttachmentDepthFromGirderTop ?? ""}
            data-testid="apollo-cross-frame-lower-depth"
            onChange={(event) =>
              patch({ lowerAttachmentDepthFromGirderTop: parseNullableNumber(event.target.value) })
            }
          />
        </label>
        <label>
          中央節点 depth（任意・未入力時は下側） [m]
          <input
            type="number"
            step="0.001"
            min="0"
            value={config.centerNodeDepthFromGirderTop ?? ""}
            data-testid="apollo-cross-frame-center-depth"
            onChange={(event) =>
              patch({ centerNodeDepthFromGirderTop: parseNullableNumber(event.target.value) })
            }
          />
        </label>
      </div>

      <div data-testid="apollo-cross-frame-schematic" aria-hidden="true">
        <svg viewBox="0 0 120 80" width="180" height="120" role="img">
          <title>V pattern schematic</title>
          <line x1="20" y1="15" x2="20" y2="65" stroke="currentColor" strokeWidth="2" />
          <line x1="100" y1="15" x2="100" y2="65" stroke="currentColor" strokeWidth="2" />
          <line x1="20" y1="20" x2="60" y2="60" stroke="#c45c26" strokeWidth="2" />
          <line x1="100" y1="20" x2="60" y2="60" stroke="#c45c26" strokeWidth="2" />
          <circle cx="20" cy="20" r="3" fill="#c45c26" />
          <circle cx="100" cy="20" r="3" fill="#c45c26" />
          <circle cx="60" cy="60" r="3" fill="#c45c26" />
        </svg>
      </div>

      {diagnostics.length > 0 ? (
        <ul data-testid="apollo-cross-frame-validation" role="alert">
          {diagnostics.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : (
        <p data-testid="apollo-cross-frame-validation-ok" role="status">
          取付点入力は validation OK（engineering authorization は未付与）
        </p>
      )}
    </section>
  );
}
