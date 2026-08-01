import {
  parseBridgeSuperstructureDesignDocumentValue,
  validateBridgeSuperstructureDesignDocument,
  type BridgeSuperstructureDesignDocument,
} from "../../contracts";
import type { ProjectModel } from "../../types";
import {
  parseBridgeStructureInputDraft,
  validateBridgeStructureInputPersistence,
} from "./validation";

export type ApolloBsddHydrationResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export type ApolloBsddSerializationResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export function getApolloBsdd(project: ProjectModel): BridgeSuperstructureDesignDocument | undefined {
  return project.apolloBsdd;
}

export function withApolloBsdd(
  project: ProjectModel,
  document: BridgeSuperstructureDesignDocument | undefined,
): ProjectModel {
  return {
    ...project,
    apolloBsdd: document,
  };
}

export function hydrateApolloBsddFromPersistence(project: ProjectModel): ApolloBsddHydrationResult {
  if (project.apolloBsdd === undefined) {
    return { ok: true, project };
  }

  const parsed = parseBridgeSuperstructureDesignDocumentValue(project.apolloBsdd);
  if (!parsed.success) {
    return {
      ok: false,
      diagnostics: parsed.validation.issues.map((issue) => issue.message),
    };
  }

  const validation = validateBridgeSuperstructureDesignDocument(parsed.data);
  if (validation.status !== "valid") {
    return {
      ok: false,
      diagnostics: validation.issues.map((issue) => issue.message),
    };
  }

  if (project.apolloBridgeStructureInput !== undefined) {
    const inputDiagnostics = validateBridgeStructureInputPersistence(project.apolloBridgeStructureInput);
    if (inputDiagnostics.length > 0) {
      return { ok: false, diagnostics: inputDiagnostics };
    }
    const parsedInput = parseBridgeStructureInputDraft(project.apolloBridgeStructureInput);
    if (!parsedInput) {
      return { ok: false, diagnostics: ["apolloBridgeStructureInput is malformed."] };
    }
    return {
      ok: true,
      project: {
        ...project,
        apolloBsdd: parsed.data,
        apolloBridgeStructureInput: parsedInput,
      },
    };
  }

  return {
    ok: true,
    project: {
      ...project,
      apolloBsdd: parsed.data,
    },
  };
}

export function serializeApolloBsddForPersistence(project: ProjectModel): ApolloBsddSerializationResult {
  if (project.apolloBsdd === undefined && project.apolloBridgeStructureInput === undefined) {
    return { ok: true, project };
  }

  if (project.apolloBsdd !== undefined) {
    const validation = validateBridgeSuperstructureDesignDocument(project.apolloBsdd);
    if (validation.status !== "valid") {
      return {
        ok: false,
        diagnostics: validation.issues.map((issue) => issue.message),
      };
    }
  }

  if (project.apolloBridgeStructureInput !== undefined) {
    const inputDiagnostics = validateBridgeStructureInputPersistence(project.apolloBridgeStructureInput);
    if (inputDiagnostics.length > 0) {
      return { ok: false, diagnostics: inputDiagnostics };
    }
  }

  return { ok: true, project };
}

export function buildApolloBsddFingerprintPayload(project: ProjectModel): Record<string, unknown> | null {
  const document = project.apolloBsdd;
  if (!document?.structuralDesignModel) {
    return null;
  }

  const model = document.structuralDesignModel;
  return {
    modelId: model.modelId,
    nonCompositeAssertion: model.nonCompositeAssertion,
    mainGirders: model.mainGirders.map((entity) => ({
      mainGirderId: entity.mainGirderId,
      girderLineRefId: entity.girderLineRefId,
      designStatus: entity.designStatus,
      geometryRef: entity.geometryRef,
      compositeAction: entity.compositeAction ?? false,
    })),
    rcDecks: model.rcDecks.map((entity) => ({
      rcDeckId: entity.rcDeckId,
      deckRefId: entity.deckRefId,
      designStatus: entity.designStatus,
      geometryRef: entity.geometryRef,
      compositeAction: entity.compositeAction ?? false,
    })),
    crossBeams: model.crossBeams.map((entity) => ({
      crossBeamId: entity.crossBeamId,
      designStatus: entity.designStatus,
      geometryRef: entity.geometryRef,
    })),
    bridgeStructureInput: project.apolloBridgeStructureInput ?? null,
  };
}
