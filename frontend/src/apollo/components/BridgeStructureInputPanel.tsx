import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ProjectModel } from "../../types";
import {
  BRIDGE_STRUCTURE_INPUT_FIELDS,
  BRIDGE_SYSTEM_LABELS,
  BridgeSystem,
  CONTINUOUS_ANALYSIS_DISCLAIMER,
  CONTINUOUS_GIRDER_SAMPLE_DISCLAIMER,
  CONTINUOUS_SPAN_COUNT_MAX,
  CONTINUOUS_SPAN_COUNT_MIN,
  SIMPLE_SINGLE_SPAN_SAMPLE_DISCLAIMER,
  SupportLayoutRole,
  addContinuousSpan,
  applyContinuousGirderSampleInput,
  applySimpleSingleSpanSampleInput,
  clearBridgeStructureInput,
  deriveSingleSpanModelLength,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  getBridgeStructureQuantities,
  getBridgeStructureUnitWeightAdoption,
  isBridgeStructureGenerationCurrent,
  removeContinuousSpan,
  validateBridgeStructureInputDraft,
  withAdoptedBridgeStructureUnitWeight,
  withBridgeStructureBooleanField,
  withBridgeStructureField,
  withBridgeStructureSystem,
  withBridgeStructureUnitWeightReset,
  withContinuousSpanLength,
  computeGirderSectionProperties,
  type BridgeStructureApproximateQuantity,
  type BridgeStructureInputFieldKey,
  type BridgeStructureUnitWeightKind,
  type GirderSectionProperties,
  type SelectableBridgeSystem,
} from "../bridgeStructure";
import { commitApolloNumericDraft } from "../numericInput";
import { CompositionAwareInput } from "./CompositionAwareInput";

type BridgeStructureInputPanelProps = {
  readonly project: ProjectModel;
  readonly onProjectChange: (nextProject: ProjectModel) => void;
  readonly onAuditEvent?: (message: string) => void;
};

type NullableFieldInputProps = {
  readonly fieldKey: BridgeStructureInputFieldKey;
  readonly value: number | null;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly onCommit: (value: number | null) => void;
};

function NullableBridgeStructureFieldInput({
  fieldKey,
  value,
  error,
  readOnly = false,
  onCommit,
}: NullableFieldInputProps) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value === null ? "" : String(value));
    setInputError(null);
  }, [value]);

  const commitDraft = (nextDraft: string) => {
    if (readOnly) {
      return;
    }
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
    <>
      <CompositionAwareInput
        data-testid={`apollo-bridge-input-${fieldKey}`}
        value={draft}
        inputMode="decimal"
        readOnly={readOnly}
        aria-invalid={error || inputError ? true : undefined}
        onValueChange={(nextDraft) => {
          if (!readOnly) {
            setDraft(nextDraft);
          }
        }}
        onBlur={(event) => commitDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft(event.currentTarget.value);
          }
        }}
      />
      {inputError ? (
        <small className="apollo-input-error" role="alert">{inputError}</small>
      ) : null}
      {error ? (
        <small className="apollo-input-error" role="alert">{error}</small>
      ) : null}
    </>
  );
}

type ContinuousSpanLengthInputProps = {
  readonly index: number;
  readonly value: number;
  readonly onCommit: (length: number) => void;
};

function ContinuousSpanLengthInput({ index, value, onCommit }: ContinuousSpanLengthInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(value));
    setInputError(null);
  }, [value]);

  const commitDraft = (nextDraft: string) => {
    const trimmed = nextDraft.trim();
    if (trimmed.length === 0) {
      setInputError("支間長を入力してください。");
      setDraft(String(value));
      return;
    }
    const result = commitApolloNumericDraft(trimmed);
    if (!result.ok) {
      setInputError(result.message);
      setDraft(String(value));
      return;
    }
    if (result.value <= 0) {
      setInputError("支間長は 0 より大きい値を入力してください。");
      setDraft(String(value));
      return;
    }
    setInputError(null);
    onCommit(result.value);
    setDraft(String(result.value));
  };

  return (
    <>
      <CompositionAwareInput
        data-testid={`apollo-continuous-span-length-${index}`}
        value={draft}
        inputMode="decimal"
        aria-invalid={inputError ? true : undefined}
        onValueChange={setDraft}
        onBlur={(event) => commitDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft(event.currentTarget.value);
          }
        }}
      />
      {inputError ? (
        <small className="apollo-input-error" role="alert">{inputError}</small>
      ) : null}
    </>
  );
}

function formatSupportRole(role: (typeof SupportLayoutRole)[keyof typeof SupportLayoutRole]): string {
  if (role === SupportLayoutRole.ABUTMENT) {
    return "橋台（端部）";
  }
  return "橋脚（中間）";
}

function formatQuantityValue(quantity: BridgeStructureApproximateQuantity): string {
  if (quantity.value === null) {
    return "—";
  }
  return `${quantity.value.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${quantity.units}`;
}

function formatMetric(value: number | null, digits: number): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function sectionPropertyRows(
  section: GirderSectionProperties,
): Array<{ readonly label: string; readonly value: string; readonly unit: string }> {
  return [
    { label: "ウェブ高さ", value: formatMetric(section.webHeight, 4), unit: "m" },
    { label: "上フランジ断面積", value: formatMetric(section.topFlangeArea, 4), unit: "m²" },
    { label: "下フランジ断面積", value: formatMetric(section.bottomFlangeArea, 4), unit: "m²" },
    { label: "ウェブ断面積", value: formatMetric(section.webArea, 4), unit: "m²" },
    { label: "断面積合計", value: formatMetric(section.totalArea, 4), unit: "m²" },
    { label: "図心位置（下面基準）", value: formatMetric(section.centroidFromBottom, 4), unit: "m" },
    { label: "断面2次モーメント", value: formatMetric(section.secondMomentOfArea, 4), unit: "m⁴" },
    { label: "断面係数（上縁）", value: formatMetric(section.sectionModulusTop, 4), unit: "m³" },
    { label: "断面係数（下縁）", value: formatMetric(section.sectionModulusBottom, 4), unit: "m³" },
    { label: "主桁1本当たり鋼体積", value: formatMetric(section.steelVolumePerGirder, 4), unit: "m³" },
  ];
}

function adoptionButton(
  kind: BridgeStructureUnitWeightKind,
  project: ProjectModel,
  onProjectChange: (nextProject: ProjectModel) => void,
  setMessage: (message: string) => void,
): ReactNode {
  const status = getBridgeStructureUnitWeightAdoption(project, kind);
  const isAdopted = status === "ADOPTED";
  return (
    <button
      type="button"
      className={isAdopted ? "apollo-button-secondary" : "apollo-button-primary"}
      data-testid={`apollo-adopt-${kind}-unit-weight`}
      onClick={() => {
        if (isAdopted) {
          onProjectChange(withBridgeStructureUnitWeightReset(project, kind));
          setMessage(`${kind === "steel" ? "鋼" : "RC床版"}の単位体積重量を未採用に戻しました。`);
          return;
        }
        const result = withAdoptedBridgeStructureUnitWeight(project, kind);
        if (!result.ok) {
          setMessage(result.diagnostics.join(" / "));
          return;
        }
        onProjectChange(result.project);
        setMessage(`${kind === "steel" ? "鋼" : "RC床版"}の単位体積重量を採用しました。`);
      }}
    >
      {isAdopted ? "取消" : "採用"}
    </button>
  );
}

export function BridgeStructureInputPanel({
  project,
  onProjectChange,
  onAuditEvent,
}: BridgeStructureInputPanelProps) {
  const inputDraft = getBridgeStructureInputDraft(project);
  const isContinuous = inputDraft.bridgeSystem === BridgeSystem.CONTINUOUS;
  const validation = useMemo(() => validateBridgeStructureInputDraft(inputDraft), [inputDraft]);
  const quantities = useMemo(() => getBridgeStructureQuantities(project), [project]);
  const sdm = project.apolloBsdd?.structuralDesignModel;
  const isGenerationCurrent = isBridgeStructureGenerationCurrent(project);
  const isStale = Boolean(sdm && !isGenerationCurrent);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  const sectionProperties = useMemo(() => {
    if (!validation.complete || inputDraft.bridgeLength === null) {
      return null;
    }
    const representativeSpanLength =
      inputDraft.bridgeSystem === BridgeSystem.CONTINUOUS
        ? inputDraft.bridgeLength
        : inputDraft.spanLength;
    if (representativeSpanLength === null) {
      return null;
    }
    return computeGirderSectionProperties({
      spanLength: representativeSpanLength,
      bridgeLength: inputDraft.bridgeLength,
      width: inputDraft.width!,
      girderCount: inputDraft.girderCount!,
      girderSpacing: inputDraft.girderSpacing!,
      girderDepth: inputDraft.girderDepth!,
      topFlangeWidth: inputDraft.topFlangeWidth!,
      topFlangeThickness: inputDraft.topFlangeThickness!,
      bottomFlangeWidth: inputDraft.bottomFlangeWidth!,
      bottomFlangeThickness: inputDraft.bottomFlangeThickness!,
      webThickness: inputDraft.webThickness!,
      deckThickness: inputDraft.deckThickness!,
      crossBeamSpacing: inputDraft.crossBeamSpacing!,
    });
  }, [validation.complete, inputDraft]);

  const steelAdoption = getBridgeStructureUnitWeightAdoption(project, "steel");
  const rcAdoption = getBridgeStructureUnitWeightAdoption(project, "rc");

  const fieldErrorMap = useMemo(() => {
    const map = new Map<BridgeStructureInputFieldKey, string>();
    for (const entry of validation.fieldErrors) {
      if (entry.message) {
        map.set(entry.key, entry.message);
      }
    }
    return map;
  }, [validation.fieldErrors]);

  const visibleFields = useMemo(
    () =>
      BRIDGE_STRUCTURE_INPUT_FIELDS.filter((field) => {
        if (isContinuous && field.key === "spanLength") {
          return false;
        }
        return true;
      }),
    [isContinuous],
  );

  const handleGenerate = () => {
    const result = generateBridgeStructureFromInput(project, inputDraft);
    if (!result.ok) {
      setGenerationMessage(result.diagnostics.join(" / "));
      return;
    }
    onProjectChange(result.project);
    setGenerationMessage("構造設計モデルを生成しました。");
    onAuditEvent?.("構造を生成しました。");
  };

  const handleCommitField = (fieldKey: BridgeStructureInputFieldKey, nextValue: number | null) => {
    if (isContinuous && fieldKey === "bridgeLength") {
      return;
    }
    let nextProject = withBridgeStructureField(project, fieldKey, nextValue);
    if (fieldKey === "spanLength" && nextValue !== null) {
      const nextInput = getBridgeStructureInputDraft(nextProject);
      const derived = deriveSingleSpanModelLength(nextInput);
      if (derived !== null) {
        nextProject = withBridgeStructureField(nextProject, "bridgeLength", derived);
      }
    }
    onProjectChange(nextProject);
  };

  const currentBridgeSystemLabel = BRIDGE_SYSTEM_LABELS[inputDraft.bridgeSystem as SelectableBridgeSystem]
    ?? BRIDGE_SYSTEM_LABELS[BridgeSystem.SIMPLE_SINGLE];

  return (
    <article className="apollo-editor-card" data-testid="apollo-bridge-structure-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>橋梁構造入力</h2>
          <p>
            現在の対応形式: <strong data-testid="apollo-current-bridge-system">{currentBridgeSystemLabel}</strong>
          </p>
          <p>寸法を入力し「構造を生成」で StructuralDesignModel を作成します。設計判定は未許可のままです。</p>
        </div>
      </div>

      <label>
        構造形式
        <select
          data-testid="apollo-bridge-system-select"
          value={inputDraft.bridgeSystem}
          onChange={(event) => {
            const nextSystem = event.currentTarget.value as SelectableBridgeSystem;
            onProjectChange(withBridgeStructureSystem(project, nextSystem));
            setGenerationMessage(null);
            onAuditEvent?.(`構造形式を ${BRIDGE_SYSTEM_LABELS[nextSystem]} に切り替えました。`);
          }}
        >
          <option value={BridgeSystem.SIMPLE_SINGLE}>{BRIDGE_SYSTEM_LABELS[BridgeSystem.SIMPLE_SINGLE]}</option>
          <option value={BridgeSystem.CONTINUOUS}>{BRIDGE_SYSTEM_LABELS[BridgeSystem.CONTINUOUS]}</option>
        </select>
      </label>

      {isContinuous ? (
        <p
          className="apollo-input-error"
          data-testid="apollo-continuous-analysis-disclaimer"
          role="status"
        >
          {CONTINUOUS_ANALYSIS_DISCLAIMER}
        </p>
      ) : null}

      <div className="apollo-workspace-actions">
        {isContinuous ? (
          <button
            type="button"
            className="apollo-button-secondary"
            data-testid="apollo-continuous-sample-input"
            onClick={() => {
              onProjectChange(applyContinuousGirderSampleInput(project));
              setGenerationMessage("連続桁の動作確認用サンプル値を入力しました。「構造を生成」を押して生成してください。");
              onAuditEvent?.("連続桁の動作確認用サンプル値を入力しました。");
            }}
          >
            連続桁サンプル [30, 35, 30] を入力
          </button>
        ) : (
          <button
            type="button"
            className="apollo-button-secondary"
            data-testid="apollo-sample-input"
            onClick={() => {
              onProjectChange(applySimpleSingleSpanSampleInput(project));
              setGenerationMessage("動作確認用サンプル値を入力しました。「構造を生成」を押して生成してください。");
              onAuditEvent?.("動作確認用サンプル値を入力しました。");
            }}
          >
            動作確認用サンプル値を入力
          </button>
        )}
        <button
          type="button"
          className="apollo-button-secondary"
          data-testid="apollo-clear-input"
          onClick={() => {
            onProjectChange(clearBridgeStructureInput(project));
            setGenerationMessage("入力をクリアしました。");
            onAuditEvent?.("入力をクリアしました。");
          }}
        >
          入力をクリア
        </button>
      </div>

      <p className="apollo-inline-hint" data-testid="apollo-sample-disclaimer">
        {isContinuous ? CONTINUOUS_GIRDER_SAMPLE_DISCLAIMER : SIMPLE_SINGLE_SPAN_SAMPLE_DISCLAIMER}
      </p>

      {isContinuous ? (
        <section data-testid="apollo-continuous-layout-panel">
          <h3>連続桁レイアウト</h3>
          <div className="apollo-workspace-actions">
            <span data-testid="apollo-continuous-span-count">
              支間数: {inputDraft.spans.length}（{CONTINUOUS_SPAN_COUNT_MIN}〜{CONTINUOUS_SPAN_COUNT_MAX}）
            </span>
            <button
              type="button"
              className="apollo-button-secondary"
              data-testid="apollo-continuous-add-span"
              disabled={inputDraft.spans.length >= CONTINUOUS_SPAN_COUNT_MAX}
              onClick={() => {
                onProjectChange(addContinuousSpan(project));
              }}
            >
              支間を追加
            </button>
            <button
              type="button"
              className="apollo-button-secondary"
              data-testid="apollo-continuous-remove-span"
              disabled={inputDraft.spans.length <= CONTINUOUS_SPAN_COUNT_MIN}
              onClick={() => {
                onProjectChange(removeContinuousSpan(project));
              }}
            >
              支間を削除
            </button>
          </div>

          <table className="apollo-detail-table" data-testid="apollo-continuous-span-table">
            <thead>
              <tr>
                <th>支間</th>
                <th>支間長 (m)</th>
              </tr>
            </thead>
            <tbody>
              {inputDraft.spans.map((span, index) => (
                <tr key={span.id} data-testid={`apollo-continuous-span-row-${index}`}>
                  <td>径間 {index + 1}</td>
                  <td>
                    <ContinuousSpanLengthInput
                      index={index}
                      value={span.length}
                      onCommit={(length) => {
                        onProjectChange(withContinuousSpanLength(project, index, length));
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="apollo-detail-table" data-testid="apollo-continuous-support-table">
            <thead>
              <tr>
                <th>支点</th>
                <th>累積位置 (m)</th>
                <th>種別</th>
              </tr>
            </thead>
            <tbody>
              {inputDraft.supports.map((support, index) => (
                <tr key={support.id} data-testid={`apollo-continuous-support-row-${index}`}>
                  <td>支点 {index + 1}</td>
                  <td data-testid={`apollo-continuous-support-station-${index}`}>
                    {formatMetric(support.station, 4)}
                  </td>
                  <td data-testid={`apollo-continuous-support-role-${index}`}>
                    {formatSupportRole(support.role)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <div className="apollo-detail-grid">
        {visibleFields.map((field) => {
          const currentValue = inputDraft[field.key];
          const error = fieldErrorMap.get(field.key);
          const readOnly = isContinuous && field.key === "bridgeLength";
          return (
            <label key={field.key}>
              {field.label} ({field.units}){field.optional ? "（任意）" : null}
              {readOnly ? "（支間合計）" : null}
              <NullableBridgeStructureFieldInput
                fieldKey={field.key}
                value={currentValue}
                error={error}
                readOnly={readOnly}
                onCommit={(nextValue) => {
                  handleCommitField(field.key, nextValue);
                }}
              />
            </label>
          );
        })}
      </div>

      <label className="apollo-inline-checkbox">
        <input
          type="checkbox"
          data-testid="apollo-bridge-input-lateralBracingEnabled"
          checked={inputDraft.lateralBracingEnabled}
          onChange={(event) => {
            onProjectChange(
              withBridgeStructureBooleanField(project, "lateralBracingEnabled", event.currentTarget.checked),
            );
          }}
        />
        横繋（下フランジ水平ブレース）を有効にする
      </label>

      {sectionProperties ? (
        <section data-testid="apollo-bridge-structure-section-properties">
          <h3>断面特性（純幾何計算・設計判定なし）</h3>
          <table className="apollo-detail-table">
            <thead>
              <tr>
                <th>項目</th>
                <th>値</th>
                <th>単位</th>
              </tr>
            </thead>
            <tbody>
              {sectionPropertyRows(sectionProperties).map((row) => (
                <tr key={row.label} data-testid={`apollo-section-property-${row.label}`}>
                  <td>{row.label}</td>
                  <td>{row.value}</td>
                  <td>{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="apollo-inline-hint">寸法入力からの純幾何計算であり、設計判定や数値採用ではありません。</p>
        </section>
      ) : null}

      <div className="apollo-workspace-actions">
        <button
          type="button"
          className="apollo-button-primary"
          data-testid="apollo-generate-structure"
          onClick={handleGenerate}
        >
          構造を生成
        </button>
      </div>

      {generationMessage ? (
        <p data-testid="apollo-bridge-structure-message">{generationMessage}</p>
      ) : null}

      {isStale ? (
        <p
          className="apollo-input-error"
          data-testid="apollo-bridge-structure-stale-message"
          role="alert"
        >
          入力が変更されました。「構造を生成」を押して再生成してください。3D表示と概算数量は再生成後に更新されます。
        </p>
      ) : null}

      {sdm && isGenerationCurrent ? (
        <section data-testid="apollo-bridge-structure-sdm-summary">
          <h3>生成済み設計エンティティ</h3>
          <ul>
            <li>主桁: {sdm.mainGirders.length} 件（designStatus: NOT_AUTHORIZED）</li>
            <li>RC床版: {sdm.rcDecks.length} 件（designStatus: NOT_AUTHORIZED）</li>
            <li>横桁: {sdm.crossBeams.length} 件（designStatus: NOT_AUTHORIZED）</li>
            <li>補剛材: {sdm.stiffeners.length} 件（designStatus: NOT_AUTHORIZED）</li>
            <li>対傾構: {sdm.swayBracings.length} 箇所 / 横繋: {sdm.lateralBracings.length} 箇所</li>
            <li>対傾構・横繋部材: {sdm.braceMembers.length} 本（designStatus: NOT_AUTHORIZED）</li>
            <li>nonCompositeAssertion.compositeAction: {String(sdm.nonCompositeAssertion.compositeAction)}</li>
          </ul>
          {sdm.mainGirders.length > 0 ? (
            <p data-testid="apollo-bridge-structure-main-girder-status">
              主桁1: {sdm.mainGirders[0]!.designStatus}
            </p>
          ) : null}
        </section>
      ) : (
        <p data-testid="apollo-bridge-structure-not-generated">まだ構造は生成されていません。</p>
      )}

      <section data-testid="apollo-bridge-structure-unit-weight">
        <h3>単位体積重量の採用</h3>
        <table className="apollo-detail-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>鋼（{inputDraft.steelUnitWeight ?? "未入力"} kN/m³）</td>
              <td data-testid="apollo-steel-unit-weight-status">{steelAdoption}</td>
              <td>{adoptionButton("steel", project, onProjectChange, setGenerationMessage)}</td>
            </tr>
            <tr>
              <td>RC床版（{inputDraft.rcUnitWeight ?? "未入力"} kN/m³）</td>
              <td data-testid="apollo-rc-unit-weight-status">{rcAdoption}</td>
              <td>{adoptionButton("rc", project, onProjectChange, setGenerationMessage)}</td>
            </tr>
          </tbody>
        </table>
        <p className="apollo-inline-hint">
          ADOPTED は数値設計権限（NOT_GRANTED が既定）のもとで拒否されます。現時点では採用操作は失敗し、NOT_AUTHORIZED のままです。
        </p>
      </section>

      <section data-testid="apollo-bridge-structure-quantities">
        <h3>概算数量・重量</h3>
        <table className="apollo-detail-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>値</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {quantities.map((quantity) => (
              <tr key={quantity.label} data-testid={`apollo-quantity-row-${quantity.label}`}>
                <td>{quantity.label}</td>
                <td>{formatQuantityValue(quantity)}</td>
                <td data-testid={`apollo-quantity-status-${quantity.label}`}>{quantity.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="apollo-inline-hint">
          単位重量が未設定の場合は NOT_AUTHORIZED / INCOMPLETE、入力済み未採用は USER_PROVIDED_UNVERIFIED、採用時のみ ADOPTED を表示します。
        </p>
      </section>
    </article>
  );
}
