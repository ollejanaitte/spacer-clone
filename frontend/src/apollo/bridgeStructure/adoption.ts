import {
  validateBridgeSuperstructureDesignDocument,
  type GovernedQuantity,
  type GovernedQuantityAdoptionStatus,
} from "../../contracts";
import { NumericAuthorityContext, TargetStandardStatus } from "../types";
import type { ProjectModel } from "../../types";
import { getApolloBsdd, withApolloBsdd } from "./projectBsdd";
import { stableEntitySeed, stableUuidFromSeed } from "./stableIds";

export type BridgeStructureUnitWeightKind = "steel" | "rc";

export type BridgeStructureAdoptionResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

const NOT_SELECTED_CONTEXT: NumericAuthorityContext = {
  targetStandardStatus: TargetStandardStatus.NOT_SELECTED,
};

type QuantityUpdater = (quantity: GovernedQuantity) => GovernedQuantity;

function updateSteelUnitWeight(
  document: NonNullable<ReturnType<typeof getApolloBsdd>>,
  updater: QuantityUpdater,
): NonNullable<ReturnType<typeof getApolloBsdd>> {
  const [material, ...rest] = document.materialDefinitions;
  if (!material) {
    return document;
  }
  return {
    ...document,
    materialDefinitions: [{ ...material, unitWeight: updater(material.unitWeight) }, ...rest],
  };
}

function updateRcUnitWeight(
  document: NonNullable<ReturnType<typeof getApolloBsdd>>,
  updater: QuantityUpdater,
): NonNullable<ReturnType<typeof getApolloBsdd>> {
  return {
    ...document,
    bridge: {
      ...document.bridge,
      deck: { ...document.bridge.deck, unitWeight: updater(document.bridge.deck.unitWeight) },
    },
  };
}

function currentUnitWeight(
  document: NonNullable<ReturnType<typeof getApolloBsdd>>,
  kind: BridgeStructureUnitWeightKind,
): GovernedQuantity | null {
  if (kind === "steel") {
    return document.materialDefinitions[0]?.unitWeight ?? null;
  }
  return document.bridge?.deck?.unitWeight ?? null;
}

function updateUnitWeight(
  document: NonNullable<ReturnType<typeof getApolloBsdd>>,
  kind: BridgeStructureUnitWeightKind,
  updater: QuantityUpdater,
): NonNullable<ReturnType<typeof getApolloBsdd>> {
  return kind === "steel"
    ? updateSteelUnitWeight(document, updater)
    : updateRcUnitWeight(document, updater);
}

export function getBridgeStructureUnitWeightAdoption(
  project: ProjectModel,
  kind: BridgeStructureUnitWeightKind,
): GovernedQuantityAdoptionStatus {
  const document = getApolloBsdd(project);
  if (!document) {
    return "UNKNOWN";
  }
  return currentUnitWeight(document, kind)?.adoptionStatus ?? "UNKNOWN";
}

/**
 * Attempt to adopt a user-entered unit weight. ADOPTED is fail-closed under
 * the default NOT_SELECTED numeric authority context; pass an explicit
 * granted context to permit adoption (used by tests and future standard
 * selection UI).
 */
export function withAdoptedBridgeStructureUnitWeight(
  project: ProjectModel,
  kind: BridgeStructureUnitWeightKind,
  context: NumericAuthorityContext = NOT_SELECTED_CONTEXT,
): BridgeStructureAdoptionResult {
  const document = getApolloBsdd(project);
  if (!document) {
    return { ok: false, diagnostics: ["構造が生成されていないため、単位体積重量を採用できません。"] };
  }
  const current = currentUnitWeight(document, kind);
  if (!current || current.value === null) {
    return { ok: false, diagnostics: ["単位体積重量が入力されていません。"] };
  }

  const decisionId = stableUuidFromSeed(
    stableEntitySeed(project.project.id, "Decision", `adopt-${kind}-unit-weight`),
  );
  const sourceLocator = `user:apollo:vvs02:${kind}-unit-weight`;
  const next = updateUnitWeight(document, kind, (quantity) => ({
    ...quantity,
    adoptionStatus: "ADOPTED" as const,
    sourceLocator,
    decisionId,
  }));

  const validation = validateBridgeSuperstructureDesignDocument(next, "", {
    numericAuthorityContext: context,
  });
  if (validation.status !== "valid") {
    return {
      ok: false,
      diagnostics: [
        "数値設計権限が付与されていないため、単位体積重量を採用できません（ADOPTED は標準選定後にのみ有効）。",
        ...validation.issues.map((issue) => issue.message),
      ],
    };
  }

  return { ok: true, project: withApolloBsdd(project, next) };
}

export function withBridgeStructureUnitWeightReset(
  project: ProjectModel,
  kind: BridgeStructureUnitWeightKind,
): ProjectModel {
  const document = getApolloBsdd(project);
  if (!document) {
    return project;
  }
  const next = updateUnitWeight(document, kind, (quantity) => ({
    ...quantity,
    adoptionStatus: quantity.value === null ? "UNKNOWN" : "PENDING",
    sourceLocator: null,
    decisionId: null,
  }));
  return withApolloBsdd(project, next);
}
