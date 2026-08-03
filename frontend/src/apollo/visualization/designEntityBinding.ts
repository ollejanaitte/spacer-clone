import type { BridgeSuperstructureDesignDocument } from "../../contracts";
import type {
  ApolloDesignEntityKind,
  ApolloSolidGeometryParameter,
  ApolloVisualizationWarning,
} from "./types";

export const APOLLO_DESIGN_ENTITY_KINDS = [
  "MainGirder",
  "RcDeck",
  "CrossBeam",
  "Stiffener",
  "Splice",
  "SwayBracing",
  "LateralBracing",
  "DeckAnchorage",
  "Haunch",
  "BridgeAppurtenance",
] as const satisfies readonly ApolloDesignEntityKind[];

export const UNIMPLEMENTED_APOLLO_DESIGN_ENTITY_KINDS = [
  "Splice",
  "DeckAnchorage",
] as const satisfies readonly ApolloDesignEntityKind[];

export function buildDesignEntitySelectionKey(
  kind: ApolloDesignEntityKind,
  entityId: string,
): string {
  return `design-entity:${kind}:${entityId}`;
}

export function resolveDesignEntityId(solid: ApolloSolidGeometryParameter): string | null {
  return solid.designEntityId ?? null;
}

export function collectUnimplementedDesignEntityWarnings(
  document: BridgeSuperstructureDesignDocument,
): ApolloVisualizationWarning[] {
  const warnings: ApolloVisualizationWarning[] = [];
  const model = document.structuralDesignModel;
  if (!model) {
    return warnings;
  }
  const unimplementedCounts: Partial<Record<ApolloDesignEntityKind, number>> = {
    Stiffener: model.stiffeners.length,
    Splice: model.splices.length,
    SwayBracing: model.swayBracings.length,
    LateralBracing: model.lateralBracings.length,
    DeckAnchorage: model.deckAnchorages.length,
  };

  for (const kind of UNIMPLEMENTED_APOLLO_DESIGN_ENTITY_KINDS) {
    const count = unimplementedCounts[kind] ?? 0;
    if (count > 0) {
      warnings.push({
        code: "missing-bridge-geometry",
        severity: "info",
        message: `${kind} entities (${count}) are present in StructuralDesignModel but remain unimplemented in Block C visualization.`,
      });
    }
  }

  return warnings;
}

export function collectDesignEntityBindingWarnings(
  document: BridgeSuperstructureDesignDocument,
  solids: readonly ApolloSolidGeometryParameter[],
): ApolloVisualizationWarning[] {
  const warnings = collectUnimplementedDesignEntityWarnings(document);
  const model = document.structuralDesignModel;
  if (!model) {
    return warnings;
  }
  const boundByKind: Record<"MainGirder" | "RcDeck" | "CrossBeam" | "Stiffener", Set<string>> = {
    MainGirder: new Set(),
    RcDeck: new Set(),
    CrossBeam: new Set(),
    Stiffener: new Set(),
  };

  for (const solid of solids) {
    if (!solid.designEntityKind || !solid.designEntityId) continue;
    if (solid.designEntityKind in boundByKind) {
      boundByKind[solid.designEntityKind as keyof typeof boundByKind].add(solid.designEntityId);
    }
  }

  const expected: Array<{ kind: keyof typeof boundByKind; count: number; ids: readonly string[] }> = [
    {
      kind: "MainGirder",
      count: model.mainGirders.length,
      ids: model.mainGirders.map((entity) => entity.mainGirderId),
    },
    {
      kind: "RcDeck",
      count: model.rcDecks.length,
      ids: model.rcDecks.map((entity) => entity.rcDeckId),
    },
    {
      kind: "CrossBeam",
      count: model.crossBeams.length,
      ids: model.crossBeams.map((entity) => entity.crossBeamId),
    },
    {
      kind: "Stiffener",
      count: model.stiffeners.length,
      ids: model.stiffeners.map((entity) => entity.stiffenerId),
    },
  ];

  for (const entry of expected) {
    const bound = boundByKind[entry.kind];
    if (bound.size !== entry.count) {
      warnings.push({
        code: "missing-bridge-geometry",
        severity: "warning",
        message: `Design entity binding mismatch for ${entry.kind}: expected ${entry.count} bound solids, found ${bound.size}.`,
      });
    }
    for (const entityId of entry.ids) {
      if (!bound.has(entityId)) {
        warnings.push({
          code: "missing-bridge-geometry",
          severity: "warning",
          message: `Design entity ${entry.kind} "${entityId}" has no bound 3D solid.`,
          sourceEntityId: entityId,
        });
      }
    }
  }

  return warnings;
}
