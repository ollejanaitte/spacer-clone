import { AuthorizationBanner } from "./AuthorizationBanner";
import { useEffect, useMemo, useState } from "react";
import type { ProjectModel } from "../../types";
import {
  PRESENCE_STATUS,
  applyHaunchExplicitNoneAll,
  applyHaunchToAllGirders,
  createEmptyHaunchItemDraft,
  expectedGirderKeys,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  mainGirderKeyFromIndex,
  resetHaunchConfiguration,
  setHaunchFullLength,
  stableHaunchId,
  validateRcDeckHaunchConfiguration,
  withHaunchConfiguration,
  withHaunchGirderItem,
  withHaunchGirderPresence,
  type ApolloHaunchItemDraft,
  type HaunchShapeType,
  type PresenceStatus,
} from "../bridgeStructure";
import { commitApolloNumericDraft } from "../numericInput";
import { CompositionAwareInput } from "./CompositionAwareInput";

type RcDeckHaunchInputPanelProps = {
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

export function RcDeckHaunchInputPanel({
  project,
  onProjectChange,
  onAuditEvent,
}: RcDeckHaunchInputPanelProps) {
  const draft = getBridgeStructureInputDraft(project);
  const validation = useMemo(
    () =>
      validateRcDeckHaunchConfiguration(draft.haunchConfiguration, {
        bridgeLength: draft.bridgeLength,
        girderCount: draft.girderCount,
        projectScopeId: project.project.id,
      }),
    [draft, project.project.id],
  );
  const generationCurrent = isBridgeStructureGenerationCurrent(project);
  const girderCount = draft.girderCount;
  const girderKeys =
    girderCount !== null && girderCount >= 1
      ? expectedGirderKeys(girderCount)
      : draft.haunchConfiguration.girders.map((g) => g.mainGirderKey);

  const [applyShape, setApplyShape] = useState<HaunchShapeType>("RECT");
  const [applyTopWidth, setApplyTopWidth] = useState<number | null>(null);
  const [applyBottomWidth, setApplyBottomWidth] = useState<number | null>(null);
  const [applyHeight, setApplyHeight] = useState<number | null>(null);

  const updatePresence = (mainGirderKey: string, presence: PresenceStatus) => {
    const next = withHaunchGirderPresence(
      draft.haunchConfiguration,
      mainGirderKey,
      presence,
      project.project.id,
    );
    onProjectChange(withHaunchConfiguration(project, next));
    onAuditEvent?.(`ハンチ ${mainGirderKey} を ${presence} に更新`);
  };

  const updateItem = (mainGirderKey: string, item: ApolloHaunchItemDraft) => {
    const next = withHaunchGirderItem(draft.haunchConfiguration, mainGirderKey, item);
    onProjectChange(withHaunchConfiguration(project, next));
  };

  const setAllNone = () => {
    if (girderCount === null || girderCount < 1) return;
    onProjectChange(withHaunchConfiguration(project, applyHaunchExplicitNoneAll(girderCount)));
    onAuditEvent?.("全主桁ハンチなしを明示");
  };

  const applyAll = () => {
    if (girderCount === null || girderCount < 1) return;
    if (
      applyTopWidth === null ||
      applyHeight === null ||
      (applyShape === "TRAPEZOID" && applyBottomWidth === null)
    ) {
      onAuditEvent?.("全主桁適用: 寸法が不足しています");
      return;
    }
    const confirmed =
      draft.haunchConfiguration.girders.some((g) => g.presence !== PRESENCE_STATUS.NOT_PROVIDED)
        ? globalThis.confirm("既存のハンチ個別入力を上書きします。続行しますか？")
        : true;
    if (!confirmed) return;
    const bottomWidth = applyShape === "RECT" ? applyTopWidth : applyBottomWidth;
    const template: Omit<ApolloHaunchItemDraft, "haunchId"> = {
      startStation: draft.bridgeLength !== null ? 0 : null,
      endStation: draft.bridgeLength,
      shapeType: applyShape,
      topWidth: applyTopWidth,
      bottomWidth,
      height: applyHeight,
      materialRef: null,
    };
    onProjectChange(
      withHaunchConfiguration(
        project,
        applyHaunchToAllGirders(girderCount, project.project.id, template),
      ),
    );
    onAuditEvent?.(`ハンチを全主桁に適用 (${applyShape})`);
  };

  const regenerate = () => {
    const result = generateBridgeStructureFromInput(project, draft);
    if (!result.ok) {
      onAuditEvent?.(`構造再生成失敗: ${result.diagnostics.join("; ")}`);
      return;
    }
    onProjectChange(result.project);
    onAuditEvent?.("ハンチ入力反映のため構造を再生成");
  };

  const projectedCount = project.apolloBsdd?.structuralDesignModel?.haunches.length ?? 0;

  return (
    <article className="apollo-editor-card" data-testid="apollo-haunch-panel">
      <header>
        <h3>RC床版ハンチ（WF-05）</h3>
        <div className="apollo-dev-banner" data-testid="apollo-haunch-dev-banner">
          <AuthorizationBanner testId="apollo-haunch-auth" />
        </div>
        <p role="note" data-testid="apollo-haunch-datum">
          ハンチ datum: 主桁上フランジ上面と床版下面の間（DEC-S4-0009）。mesh から逆算しません。
          3D solids・数量・自重は Step 4-C 未実装です。
        </p>
        <p data-testid="apollo-haunch-context">
          主桁本数: {girderCount ?? "未入力"} / 構造モデル長: {draft.bridgeLength ?? "未入力"} m /
          生成状態: {generationCurrent ? "生成結果は最新" : "要再計算／未生成"} / ハンチ投影件数:{" "}
          {projectedCount}
        </p>
      </header>

      <section data-testid="apollo-haunch-apply-all" className="apollo-haunch-apply-all">
        <h4>全主桁に適用（明示操作）</h4>
        <label className="apollo-field">
          <span>形状</span>
          <select
            data-testid="apollo-haunch-apply-shape"
            value={applyShape}
            aria-label="全主桁適用の形状"
            onChange={(event) => setApplyShape(event.target.value as HaunchShapeType)}
          >
            <option value="RECT">矩形</option>
            <option value="TRAPEZOID">台形</option>
          </select>
        </label>
        <NullableNumberInput
          testId="apollo-haunch-apply-top-width"
          label="上幅 (m)"
          value={applyTopWidth}
          onCommit={setApplyTopWidth}
        />
        <NullableNumberInput
          testId="apollo-haunch-apply-bottom-width"
          label="下幅 (m)"
          value={applyBottomWidth}
          onCommit={setApplyBottomWidth}
        />
        <NullableNumberInput
          testId="apollo-haunch-apply-height"
          label="高さ (m)"
          value={applyHeight}
          onCommit={setApplyHeight}
        />
        <div className="apollo-button-row">
          <button
            type="button"
            data-testid="apollo-haunch-apply-all-button"
            disabled={girderCount === null || girderCount < 1}
            onClick={applyAll}
          >
            全主桁に適用
          </button>
          <button
            type="button"
            data-testid="apollo-haunch-all-none"
            disabled={girderCount === null || girderCount < 1}
            onClick={setAllNone}
          >
            全主桁ハンチなし
          </button>
          <button
            type="button"
            data-testid="apollo-haunch-reset"
            onClick={() => {
              onProjectChange(withHaunchConfiguration(project, resetHaunchConfiguration()));
              onAuditEvent?.("ハンチ設定を未入力にリセット");
            }}
          >
            未入力に戻す
          </button>
          <button
            type="button"
            data-testid="apollo-haunch-regenerate"
            onClick={regenerate}
            disabled={!validation.complete}
          >
            構造を再生成
          </button>
        </div>
      </section>

      {girderKeys.map((mainGirderKey, index) => {
        const girder =
          draft.haunchConfiguration.girders.find((g) => g.mainGirderKey === mainGirderKey) ?? {
            mainGirderKey,
            presence: PRESENCE_STATUS.NOT_PROVIDED,
            item: null,
          };
        const item =
          girder.item ??
          createEmptyHaunchItemDraft(stableHaunchId(project.project.id, mainGirderKey));
        const girderDiagnostics = validation.diagnostics.filter(
          (d) => d.mainGirderKey === mainGirderKey,
        );
        return (
          <fieldset
            key={mainGirderKey}
            className="apollo-haunch-girder"
            data-testid={`apollo-haunch-girder-${mainGirderKey}`}
          >
            <legend>
              主桁 {index + 1}（{mainGirderKey} / seed={mainGirderKeyFromIndex(index)}）
            </legend>
            <label className="apollo-field">
              <span>有無</span>
              <select
                data-testid={`apollo-haunch-presence-${mainGirderKey}`}
                value={girder.presence}
                aria-label={`主桁 ${mainGirderKey} のハンチ有無`}
                onChange={(event) =>
                  updatePresence(mainGirderKey, event.target.value as PresenceStatus)
                }
              >
                <option value={PRESENCE_STATUS.NOT_PROVIDED}>未入力</option>
                <option value={PRESENCE_STATUS.EXPLICIT_NONE}>なし</option>
                <option value={PRESENCE_STATUS.PROVIDED}>あり</option>
              </select>
            </label>
            {girder.presence === PRESENCE_STATUS.PROVIDED ? (
              <div className="apollo-haunch-item-fields">
                <p data-testid={`apollo-haunch-id-${mainGirderKey}`}>
                  ID: {item.haunchId.slice(0, 8)}…
                </p>
                <label className="apollo-field">
                  <span>形状</span>
                  <select
                    data-testid={`apollo-haunch-shape-${mainGirderKey}`}
                    value={item.shapeType ?? ""}
                    aria-label={`主桁 ${mainGirderKey} 形状`}
                    onChange={(event) =>
                      updateItem(mainGirderKey, {
                        ...item,
                        shapeType:
                          event.target.value === ""
                            ? null
                            : (event.target.value as HaunchShapeType),
                      })
                    }
                  >
                    <option value="">未選択</option>
                    <option value="RECT">矩形</option>
                    <option value="TRAPEZOID">台形</option>
                  </select>
                </label>
                <NullableNumberInput
                  testId={`apollo-haunch-start-${mainGirderKey}`}
                  label="始点測点 (m)"
                  value={item.startStation}
                  onCommit={(value) => updateItem(mainGirderKey, { ...item, startStation: value })}
                />
                <NullableNumberInput
                  testId={`apollo-haunch-end-${mainGirderKey}`}
                  label="終点測点 (m)"
                  value={item.endStation}
                  onCommit={(value) => updateItem(mainGirderKey, { ...item, endStation: value })}
                />
                <button
                  type="button"
                  data-testid={`apollo-haunch-full-length-${mainGirderKey}`}
                  disabled={draft.bridgeLength === null}
                  onClick={() => {
                    if (draft.bridgeLength === null) return;
                    updateItem(mainGirderKey, setHaunchFullLength(item, draft.bridgeLength));
                  }}
                >
                  全延長を設定
                </button>
                <NullableNumberInput
                  testId={`apollo-haunch-top-width-${mainGirderKey}`}
                  label="上幅 (m)"
                  value={item.topWidth}
                  onCommit={(value) => updateItem(mainGirderKey, { ...item, topWidth: value })}
                />
                <NullableNumberInput
                  testId={`apollo-haunch-bottom-width-${mainGirderKey}`}
                  label="下幅 (m)"
                  value={item.bottomWidth}
                  onCommit={(value) => updateItem(mainGirderKey, { ...item, bottomWidth: value })}
                />
                <NullableNumberInput
                  testId={`apollo-haunch-height-${mainGirderKey}`}
                  label="高さ (m)"
                  value={item.height}
                  onCommit={(value) => updateItem(mainGirderKey, { ...item, height: value })}
                />
                <label className="apollo-field">
                  <span>材料参照（任意）</span>
                  <CompositionAwareInput
                    data-testid={`apollo-haunch-material-${mainGirderKey}`}
                    value={item.materialRef ?? ""}
                    aria-label={`主桁 ${mainGirderKey} 材料参照`}
                    onValueChange={(next) =>
                      updateItem(mainGirderKey, {
                        ...item,
                        materialRef: next.trim() === "" ? null : next,
                      })
                    }
                  />
                </label>
              </div>
            ) : null}
            {girderDiagnostics.length > 0 ? (
              <ul data-testid={`apollo-haunch-diagnostics-${mainGirderKey}`}>
                {girderDiagnostics.map((d) => (
                  <li key={`${d.code}-${d.message}`} role={d.blocking ? "alert" : "status"}>
                    [{d.blocking ? "blocking" : "info"}] {d.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </fieldset>
        );
      })}

      <footer data-testid="apollo-haunch-status">
        完了判定: {validation.complete ? "input COMPLETE候補" : "INCOMPLETE/BLOCKED"} /
        blocking={validation.blockingDiagnostics.length} / models={validation.models.length}
      </footer>
    </article>
  );
}
