// Phase C1 (A-05) Adapter Save/Load Round Trip（純粋ロジック）
// Pier model + Adapter入力 + Adapter結果 を 1 つの JSON envelope に保存し、
// Load で復元する。supportId / calculationId / schemaVersion の一致を fail-closed で検証。

import type { Support, SubstructureProject } from "../model";
import { ADAPTER_ENVELOPE_SCHEMA_VERSION, ADAPTER_SCHEMA_VERSION, type CalculationAdapterInput, type CalculationAdapterResult, validateAdapterInput, validateAdapterResult } from "./calculationAdapter";
import { serializeSubstructureProject, deserializeSubstructureProject, type PersistResult } from "../planning/persistence";
import { modelRevisionOf } from "./adapterMapper";

export interface AdapterCalculationState {
  inputs: Record<string, CalculationAdapterInput>;
  results: Record<string, CalculationAdapterResult>;
  engineType: string;
  engineVersion: string;
}

export interface AdapterEnvelope {
  schemaVersion: string;
  project: SubstructureProject;
  calculation?: AdapterCalculationState;
}

export interface AdapterLoadOutput {
  supports: Support[];
  calculation: AdapterCalculationState | null;
  /** Load 時点で model と result の revision が食い違う supportId 一覧（stale）。 */
  staleSupportIds: string[];
}

export interface EnvelopeSerializeInput {
  supports: readonly Support[];
  projectId?: string;
  bridgeId?: string;
  calculation?: AdapterCalculationState | null;
}

export function serializeAdapterEnvelope(
  input: EnvelopeSerializeInput,
): PersistResult<{ envelope: AdapterEnvelope; json: string }> {
  const projectResult = serializeSubstructureProject({
    supports: input.supports,
    projectId: input.projectId,
    bridgeId: input.bridgeId,
  });
  if (!projectResult.ok || !projectResult.value) {
    return { ok: false, value: null, diagnostics: projectResult.diagnostics };
  }

  const diagnostics: string[] = [];
  if (input.calculation) {
    for (const [sid, adapterInput] of Object.entries(input.calculation.inputs)) {
      const issues = validateAdapterInput(adapterInput);
      if (issues.length > 0) {
        diagnostics.push(`adapter input ${sid}: ${issues.join(" / ")}`);
      }
    }
    for (const [sid, result] of Object.entries(input.calculation.results)) {
      const issues = validateAdapterResult(result);
      if (issues.length > 0) {
        diagnostics.push(`adapter result ${sid}: ${issues.join(" / ")}`);
      }
      if (result.supportId !== sid) {
        diagnostics.push(`result supportId mismatch: ${sid} vs ${result.supportId}`);
      }
      const model = input.supports.find((s) => s.supportId === sid);
      if (!model) {
        diagnostics.push(`result ${sid}: 対応する model supportId がありません`);
      }
    }
  }
  if (diagnostics.length > 0) {
    return { ok: false, value: null, diagnostics };
  }

  const envelope: AdapterEnvelope = {
    schemaVersion: ADAPTER_ENVELOPE_SCHEMA_VERSION,
    project: projectResult.value.project,
    ...(input.calculation ? { calculation: input.calculation } : {}),
  };
  return { ok: true, value: { envelope, json: `${JSON.stringify(envelope, null, 2)}\n` }, diagnostics };
}

/** 保存形式（envelope または 旧 format の素の SubstructureProject）を判別して読込。 */
export function deserializeAdapterEnvelope(jsonText: string): PersistResult<AdapterLoadOutput> {
  const diagnostics: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      ok: false,
      value: null,
      diagnostics: [`JSON として解釈できません: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, value: null, diagnostics: ["オブジェクトが必要"] };
  }

  const doc = parsed as Record<string, unknown>;
  const isEnvelope = typeof doc.schemaVersion === "string" && doc.schemaVersion === ADAPTER_ENVELOPE_SCHEMA_VERSION && doc.project !== undefined;

  if (isEnvelope) {
    const projectResult = deserializeSubstructureProject(JSON.stringify(doc.project));
    if (!projectResult.ok || !projectResult.value) {
      return { ok: false, value: null, diagnostics: projectResult.diagnostics };
    }
    const supports = projectResult.value.supports;
    const calc = doc.calculation as AdapterCalculationState | undefined;
    if (calc) {
      if (calc.engineType !== "test-mock") {
        return { ok: false, value: null, diagnostics: [`engineType=${String(calc.engineType)} は test-mock のみ対応`] };
      }
      for (const [sid, adapterInput] of Object.entries(calc.inputs ?? {})) {
        const issues = validateAdapterInput(adapterInput);
        if (issues.length > 0) {
          return { ok: false, value: null, diagnostics: [`adapter input ${sid}: ${issues.join(" / ")}`] };
        }
      }
      for (const [sid, result] of Object.entries(calc.results ?? {})) {
        const issues = validateAdapterResult(result);
        if (issues.length > 0) {
          return { ok: false, value: null, diagnostics: [`adapter result ${sid}: ${issues.join(" / ")}`] };
        }
        if (result.supportId !== sid) {
          return { ok: false, value: null, diagnostics: [`result supportId mismatch: ${sid} vs ${result.supportId}`] };
        }
      }
      const staleSupportIds = Object.keys(calc.inputs ?? {}).filter((sid) => {
        const model = supports.find((s) => s.supportId === sid);
        const input = calc.inputs?.[sid];
        if (!model || !input) return false;
        return input.modelRevision !== modelRevisionOf(model);
      });
      return {
        ok: true,
        value: { supports, calculation: calc, staleSupportIds },
        diagnostics,
      };
    }
    return { ok: true, value: { supports, calculation: null, staleSupportIds: [] }, diagnostics };
  }

  // 旧 format（素の SubstructureProject）→ supports のみ
  const legacy = deserializeSubstructureProject(jsonText);
  if (!legacy.ok || !legacy.value) {
    return { ok: false, value: null, diagnostics: legacy.diagnostics };
  }
  return { ok: true, value: { supports: legacy.value.supports, calculation: null, staleSupportIds: [] }, diagnostics };
}

/** Adapter 結果が現モデルに対して stale か（modelRevision 比較）。 */
export function isAdapterResultStale(
  adapterInput: CalculationAdapterInput,
  support: Support,
): boolean {
  return adapterInput.modelRevision !== modelRevisionOf(support);
}

export { ADAPTER_SCHEMA_VERSION };
