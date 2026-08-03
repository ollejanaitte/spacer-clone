import { useEffect, useMemo, useState } from "react";
import type { ProjectModel } from "../../types";
import {
  APPURTENANCE_SLOT_LABELS,
  APPURTENANCE_SLOT_TYPE_SIDE,
  APPURTENANCE_SLOTS,
  PRESENCE_STATUS,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  setAppurtenanceFullLength,
  stableAppurtenanceId,
  validateBridgeAppurtenanceConfiguration,
  withAppurtenanceConfiguration,
  withAppurtenanceSlotItem,
  withAppurtenanceSlotPresence,
  type AppurtenanceSlot,
  type ApolloAppurtenanceItemDraft,
  type PresenceStatus,
} from "../bridgeStructure";
import { commitApolloNumericDraft } from "../numericInput";
import { CompositionAwareInput } from "./CompositionAwareInput";

type DeckAppurtenanceInputPanelProps = {
  readonly project: ProjectModel;
  readonly onProjectChange: (nextProject: ProjectModel) => void;
  readonly onAuditEvent?: (message: string) => void;
};

function NullableNumberInput({
  testId,
  value,
  label,
  onCommit,
}: {
  readonly testId: string;
  readonly value: number | null;
  readonly label: string;
  readonly onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value === null ? "" : String(value));
    setInputError(null);
  }, [value]);

  const commitDraft = (nextDraft: string) => {
    const trimmed = nextDraft.trim();
    if (trimmed.length === 0) {
      setInputError(null);
      onCommit(null);
      setDraft("");
      return;
    }
    const result = commitApolloNumericDraft(trimmed);
    if (!result.ok) {
      setInputError(result.message);
      setDraft(value === null ? "" : String(value));
      return;
    }
    setInputError(null);
    onCommit(result.value);
    setDraft(String(result.value));
  };

  return (
    <label className="apollo-field">
      <span>{label}</span>
      <CompositionAwareInput
        data-testid={testId}
        value={draft}
        inputMode="decimal"
        aria-label={label}
        onValueChange={setDraft}
        onBlur={(event) => commitDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft(event.currentTarget.value);
          }
        }}
      />
      {inputError ? (
        <small className="apollo-input-error" role="alert">
          {inputError}
        </small>
      ) : null}
    </label>
  );
}

export function DeckAppurtenanceInputPanel({
  project,
  onProjectChange,
  onAuditEvent,
}: DeckAppurtenanceInputPanelProps) {
  const draft = getBridgeStructureInputDraft(project);
  const validation = useMemo(
    () =>
      validateBridgeAppurtenanceConfiguration(draft.appurtenanceConfiguration, {
        bridgeLength: draft.bridgeLength,
        width: draft.width,
        projectScopeId: project.project.id,
      }),
    [draft, project.project.id],
  );
  const generationCurrent = isBridgeStructureGenerationCurrent(project);

  const updatePresence = (slot: AppurtenanceSlot, presence: PresenceStatus) => {
    const next = withAppurtenanceSlotPresence(
      draft.appurtenanceConfiguration,
      slot,
      presence,
      project.project.id,
    );
    onProjectChange(withAppurtenanceConfiguration(project, next));
    onAuditEvent?.(`付属物 ${APPURTENANCE_SLOT_LABELS[slot]} を ${presence} に更新`);
  };

  const updateItem = (slot: AppurtenanceSlot, item: ApolloAppurtenanceItemDraft) => {
    const next = withAppurtenanceSlotItem(draft.appurtenanceConfiguration, slot, item);
    onProjectChange(withAppurtenanceConfiguration(project, next));
  };

  const setAllExplicitNone = () => {
    let configuration = draft.appurtenanceConfiguration;
    for (const slot of APPURTENANCE_SLOTS) {
      configuration = withAppurtenanceSlotPresence(
        configuration,
        slot,
        PRESENCE_STATUS.EXPLICIT_NONE,
        project.project.id,
      );
    }
    onProjectChange(withAppurtenanceConfiguration(project, configuration));
    onAuditEvent?.("付属物全スロットを明示なしに設定");
  };

  const regenerate = () => {
    const result = generateBridgeStructureFromInput(project, draft);
    if (!result.ok) {
      onAuditEvent?.(`構造再生成失敗: ${result.diagnostics.join("; ")}`);
      return;
    }
    onProjectChange(result.project);
    onAuditEvent?.("付属物入力反映のため構造を再生成");
  };

  return (
    <article className="apollo-editor-card" data-testid="apollo-appurtenance-panel">
      <header>
        <h3>床版・橋面付属物（WF-03）</h3>
        <p className="apollo-dev-banner" data-testid="apollo-appurtenance-dev-banner">
          UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION /
          NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
        </p>
        <p role="note" data-testid="apollo-appurtenance-local-crs-warning">
          横断オフセットは橋梁 local CRS（+Y = 右、測点増方向を向いて）です。道路線形 binding は
          Step 4-E 待ち。3D・数量・荷重は Step 4-C 未実装です。
        </p>
        <p data-testid="apollo-appurtenance-context">
          構造モデル長: {draft.bridgeLength ?? "未入力"} m / 幅員: {draft.width ?? "未入力"} m /
          生成状態: {generationCurrent ? "CURRENT" : "STALE/未生成"}
        </p>
      </header>

      <div className="apollo-button-row">
        <button
          type="button"
          data-testid="apollo-appurtenance-all-none"
          onClick={setAllExplicitNone}
        >
          全スロットを明示なし
        </button>
        <button
          type="button"
          data-testid="apollo-appurtenance-regenerate"
          onClick={regenerate}
          disabled={!validation.complete}
        >
          構造を再生成
        </button>
      </div>

      {APPURTENANCE_SLOTS.map((slot) => {
        const slotDraft = draft.appurtenanceConfiguration.slots.find((entry) => entry.slot === slot)!;
        const typeSide = APPURTENANCE_SLOT_TYPE_SIDE[slot];
        const item =
          slotDraft.item ??
          ({
            appurtenanceId: stableAppurtenanceId(project.project.id, slot),
            startStation: null,
            endStation: null,
            transverseOffset: null,
            crossSectionShape: null,
            width: null,
            height: null,
            materialRef: null,
            unitWeight: null,
          } satisfies ApolloAppurtenanceItemDraft);
        const slotDiagnostics = validation.diagnostics.filter((d) => d.slot === slot);
        return (
          <fieldset
            key={slot}
            className="apollo-appurtenance-slot"
            data-testid={`apollo-appurtenance-slot-${slot}`}
          >
            <legend>
              {APPURTENANCE_SLOT_LABELS[slot]}（type={typeSide.type} / side={typeSide.side}）
            </legend>
            <label className="apollo-field">
              <span>有無</span>
              <select
                data-testid={`apollo-appurtenance-presence-${slot}`}
                value={slotDraft.presence}
                aria-label={`${APPURTENANCE_SLOT_LABELS[slot]}の有無`}
                onChange={(event) =>
                  updatePresence(slot, event.target.value as PresenceStatus)
                }
              >
                <option value={PRESENCE_STATUS.NOT_PROVIDED}>未入力</option>
                <option value={PRESENCE_STATUS.EXPLICIT_NONE}>なし</option>
                <option value={PRESENCE_STATUS.PROVIDED}>あり</option>
              </select>
            </label>
            {slotDraft.presence === PRESENCE_STATUS.PROVIDED ? (
              <div className="apollo-appurtenance-item-fields">
                <p data-testid={`apollo-appurtenance-id-${slot}`}>
                  ID: {item.appurtenanceId.slice(0, 8)}…
                </p>
                <NullableNumberInput
                  testId={`apollo-appurtenance-start-${slot}`}
                  label="始点測点 (m)"
                  value={item.startStation}
                  onCommit={(value) => updateItem(slot, { ...item, startStation: value })}
                />
                <NullableNumberInput
                  testId={`apollo-appurtenance-end-${slot}`}
                  label="終点測点 (m)"
                  value={item.endStation}
                  onCommit={(value) => updateItem(slot, { ...item, endStation: value })}
                />
                <button
                  type="button"
                  data-testid={`apollo-appurtenance-full-length-${slot}`}
                  disabled={draft.bridgeLength === null}
                  onClick={() => {
                    if (draft.bridgeLength === null) return;
                    updateItem(slot, setAppurtenanceFullLength(item, draft.bridgeLength));
                  }}
                >
                  全延長を設定
                </button>
                <NullableNumberInput
                  testId={`apollo-appurtenance-offset-${slot}`}
                  label="横断オフセット Y (m)"
                  value={item.transverseOffset}
                  onCommit={(value) => updateItem(slot, { ...item, transverseOffset: value })}
                />
                <label className="apollo-field">
                  <span>断面形状</span>
                  <select
                    data-testid={`apollo-appurtenance-shape-${slot}`}
                    value={item.crossSectionShape ?? ""}
                    aria-label={`${APPURTENANCE_SLOT_LABELS[slot]}断面形状`}
                    onChange={(event) =>
                      updateItem(slot, {
                        ...item,
                        crossSectionShape:
                          event.target.value === ""
                            ? null
                            : (event.target.value as "RECT"),
                      })
                    }
                  >
                    <option value="">未選択</option>
                    <option value="RECT">RECT</option>
                  </select>
                </label>
                <NullableNumberInput
                  testId={`apollo-appurtenance-width-${slot}`}
                  label="幅 (m)"
                  value={item.width}
                  onCommit={(value) => updateItem(slot, { ...item, width: value })}
                />
                <NullableNumberInput
                  testId={`apollo-appurtenance-height-${slot}`}
                  label="高さ (m)"
                  value={item.height}
                  onCommit={(value) => updateItem(slot, { ...item, height: value })}
                />
                <label className="apollo-field">
                  <span>材料参照（任意）</span>
                  <CompositionAwareInput
                    data-testid={`apollo-appurtenance-material-${slot}`}
                    value={item.materialRef ?? ""}
                    aria-label={`${APPURTENANCE_SLOT_LABELS[slot]}材料参照`}
                    onValueChange={(next) =>
                      updateItem(slot, {
                        ...item,
                        materialRef: next.trim() === "" ? null : next,
                      })
                    }
                  />
                </label>
                <NullableNumberInput
                  testId={`apollo-appurtenance-unit-weight-${slot}`}
                  label="単位重量 (kN/m³, 任意・未検証)"
                  value={item.unitWeight}
                  onCommit={(value) => updateItem(slot, { ...item, unitWeight: value })}
                />
              </div>
            ) : null}
            {slotDiagnostics.length > 0 ? (
              <ul data-testid={`apollo-appurtenance-diagnostics-${slot}`}>
                {slotDiagnostics.map((d) => (
                  <li key={d.code} role={d.blocking ? "alert" : "status"}>
                    [{d.blocking ? "blocking" : "info"}] {d.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </fieldset>
        );
      })}

      <footer data-testid="apollo-appurtenance-status">
        完了判定: {validation.complete ? "input COMPLETE候補" : "INCOMPLETE/BLOCKED"} /
        blocking={validation.blockingDiagnostics.length}
      </footer>
    </article>
  );
}
