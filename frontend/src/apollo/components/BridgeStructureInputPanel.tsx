import { useEffect, useMemo, useState } from "react";
import type { ProjectModel } from "../../types";
import {
  BRIDGE_STRUCTURE_INPUT_FIELDS,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  getBridgeStructureQuantities,
  isBridgeStructureGenerationCurrent,
  validateBridgeStructureInputDraft,
  withBridgeStructureField,
  type BridgeStructureApproximateQuantity,
  type BridgeStructureInputFieldKey,
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
  readonly onCommit: (value: number | null) => void;
};

function NullableBridgeStructureFieldInput({
  fieldKey,
  value,
  error,
  onCommit,
}: NullableFieldInputProps) {
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
    <>
      <CompositionAwareInput
        data-testid={`apollo-bridge-input-${fieldKey}`}
        value={draft}
        inputMode="decimal"
        aria-invalid={error || inputError ? true : undefined}
        onValueChange={(nextDraft) => setDraft(nextDraft)}
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

function formatQuantityValue(quantity: BridgeStructureApproximateQuantity): string {
  if (quantity.value === null) {
    return "—";
  }
  return `${quantity.value.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${quantity.units}`;
}

export function BridgeStructureInputPanel({
  project,
  onProjectChange,
  onAuditEvent,
}: BridgeStructureInputPanelProps) {
  const inputDraft = getBridgeStructureInputDraft(project);
  const validation = useMemo(() => validateBridgeStructureInputDraft(inputDraft), [inputDraft]);
  const quantities = useMemo(() => getBridgeStructureQuantities(project), [project]);
  const sdm = project.apolloBsdd?.structuralDesignModel;
  const isGenerationCurrent = isBridgeStructureGenerationCurrent(project);
  const isStale = Boolean(sdm && !isGenerationCurrent);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  const fieldErrorMap = useMemo(() => {
    const map = new Map<BridgeStructureInputFieldKey, string>();
    for (const entry of validation.fieldErrors) {
      if (entry.message) {
        map.set(entry.key, entry.message);
      }
    }
    return map;
  }, [validation.fieldErrors]);

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

  return (
    <article className="apollo-editor-card" data-testid="apollo-bridge-structure-panel">
      <div className="apollo-editor-card-header">
        <div>
          <h2>橋梁構造入力</h2>
          <p>寸法を入力し「構造を生成」で StructuralDesignModel を作成します。設計判定は未許可のままです。</p>
        </div>
      </div>

      <div className="apollo-detail-grid">
        {BRIDGE_STRUCTURE_INPUT_FIELDS.map((field) => {
          const currentValue = inputDraft[field.key];
          const error = fieldErrorMap.get(field.key);
          return (
            <label key={field.key}>
              {field.label} ({field.units})
              <NullableBridgeStructureFieldInput
                fieldKey={field.key}
                value={currentValue}
                error={error}
                onCommit={(nextValue) => {
                  onProjectChange(withBridgeStructureField(project, field.key, nextValue));
                }}
              />
            </label>
          );
        })}
      </div>

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

      <section data-testid="apollo-bridge-structure-quantities">
        <h3>概算数量（体積のみ・重量は未採用）</h3>
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
        <p className="apollo-inline-hint">単位重量は未採用のため、NOT_AUTHORIZED / INCOMPLETE を表示します。</p>
      </section>
    </article>
  );
}
