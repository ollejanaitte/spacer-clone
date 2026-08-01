import {
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_VERSION,
  CONTENT_CHECKSUM_ALGORITHM,
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  UNIT_CONTEXT_SCHEMA_VERSION,
  validateBridgeSuperstructureDesignDocument,
  type BridgeSuperstructureDesignDocument,
  type CrossBeam,
  type DesignEntityDesignStatus,
  type DesignEntityMetadata,
  type GovernedQuantity,
  type MainGirder,
  type RcDeck,
  type StructuralDesignModel,
} from "../../contracts";
import type { UuidString } from "../../contracts/uuid";
import { computeContentChecksum } from "../../contracts/legacy/checksum";
import type { ProjectModel } from "../../types";
import { computeBridgeStructureApproximateQuantities } from "./quantities";
import { stableEntitySeed, stableUuidFromSeed } from "./stableIds";
import {
  createEmptyBridgeStructureInputDraft,
  validateBridgeStructureInputDraft,
  type BridgeStructureValidationResult,
} from "./validation";
import type {
  ApolloBridgeStructureInputDraft,
  BridgeStructureApproximateQuantity,
  BridgeStructureGenerationResult,
} from "./types";

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
] as const;

function createProvenance() {
  return {
    createdAt: new Date().toISOString(),
    createdBy: { actorId: "apollo-vvs01", actorType: "system" as const },
    producer: { toolId: "spacer-apollo", toolVersion: "vvs01-block-b" },
  };
}

function userInputQuantity(value: number, units: string): GovernedQuantity {
  return {
    value,
    units,
    adoptionStatus: "PENDING",
    sourceLocator: null,
  };
}

function createEntityMetadata(
  geometryRefId: UuidString,
  designStatus: DesignEntityDesignStatus,
): DesignEntityMetadata {
  return {
    entityRevisionId: 1,
    provenance: createProvenance(),
    geometryRef: { geometryRefId, bindingStatus: "bound" },
    analysisMapping: {
      analysisMemberRefId: null,
      bindingStatus: "unbound",
      analysisBindingId: null,
    },
    designStatus,
    adoptionStatus: "PENDING",
  };
}

function stableId(projectScopeId: string, entityKind: string, key: string): UuidString {
  return stableUuidFromSeed(stableEntitySeed(projectScopeId, entityKind, key));
}

export function buildBridgeSuperstructureDesignDocument(
  projectScopeId: string,
  input: ApolloBridgeStructureInputDraft,
  validation: BridgeStructureValidationResult,
): { readonly document: BridgeSuperstructureDesignDocument | null; readonly diagnostics: readonly string[] } {
  if (!validation.complete) {
    return { document: null, diagnostics: ["Input validation incomplete."] };
  }

  const spanLength = input.spanLength!;
  const bridgeLength = input.bridgeLength!;
  const width = input.width!;
  const girderCount = input.girderCount!;
  const girderSpacing = input.girderSpacing!;
  const deckThickness = input.deckThickness!;
  const crossBeamSpacing = input.crossBeamSpacing!;

  const spanCount = Math.max(1, Math.round(bridgeLength / spanLength));
  const effectiveSpanLength = bridgeLength / spanCount;
  const crossBeamCount = Math.floor(bridgeLength / crossBeamSpacing) + 1;

  const documentId = stableId(projectScopeId, "BsddDocument", "document");
  const contextId = stableId(projectScopeId, "CoordinateContext", "primary");
  const projectContextId = stableId(projectScopeId, "ProjectContext", "project");
  const bridgeId = stableId(projectScopeId, "Bridge", "bridge");
  const deckId = stableId(projectScopeId, "Deck", "deck");
  const materialId = stableId(projectScopeId, "Material", "steel-default");
  const loadCaseId = stableId(projectScopeId, "LoadCase", "dead");
  const sdmModelId = stableId(projectScopeId, "StructuralDesignModel", "model");

  const girderLineIds = Array.from({ length: girderCount }, (_, index) =>
    stableId(projectScopeId, "GirderLine", `line-${index}`),
  );

  const spanIds = Array.from({ length: spanCount }, (_, index) =>
    stableId(projectScopeId, "Span", `span-${index}`),
  );

  const supportIds = Array.from({ length: spanCount + 1 }, (_, index) =>
    stableId(projectScopeId, "Support", `support-${index}`),
  );

  const designStatus: DesignEntityDesignStatus = "NOT_AUTHORIZED";

  const mainGirders: MainGirder[] = girderLineIds.map((girderLineRefId, index) => ({
    ...createEntityMetadata(girderLineRefId, designStatus),
    entityKind: "MainGirder",
    mainGirderId: stableId(projectScopeId, "MainGirder", `girder-${index}`),
    girderLineRefId,
    materialRefId: materialId,
    compositeAction: false,
  }));

  const rcDecks: RcDeck[] = [
    {
      ...createEntityMetadata(deckId, designStatus),
      entityKind: "RcDeck",
      rcDeckId: stableId(projectScopeId, "RcDeck", "deck-0"),
      deckRefId: deckId,
      compositeAction: false,
    },
  ];

  const crossBeams: CrossBeam[] = Array.from({ length: crossBeamCount }, (_, index) => {
    const spanIndex = Math.min(Math.floor((index * crossBeamSpacing) / effectiveSpanLength), spanCount - 1);
    const geometryRefId = spanIds[spanIndex]!;
    return {
      ...createEntityMetadata(geometryRefId, designStatus),
      entityKind: "CrossBeam",
      crossBeamId: stableId(projectScopeId, "CrossBeam", `cross-beam-${index}`),
      materialRefId: materialId,
    };
  });

  const structuralDesignModel: StructuralDesignModel = {
    modelId: sdmModelId,
    nonCompositeAssertion: { compositeAction: false },
    mainGirders,
    girderSectionSegments: [],
    rcDecks,
    haunches: [],
    crossBeams,
    swayBracings: [],
    lateralBracings: [],
    braceMembers: [],
    stiffeners: [],
    splices: [],
    deckAnchorages: [],
  };

  const draftWithoutChecksum: Omit<BridgeSuperstructureDesignDocument, "contentChecksum"> = {
    schemaId: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
    schemaVersion: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_VERSION,
    documentKind: BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND,
    documentId,
    revisionId: 1,
    provenance: createProvenance(),
    lifecycleStatus: "DRAFT",
    coordinateContexts: [
      {
        schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
        contextId,
        referenceType: "local",
        referenceName: "Bridge local CRS",
        origin: { x: 0, y: 0, z: 0 },
        axisOrder: ["x", "y", "z"],
        axisDirections: { x: "+x", y: "+y", z: "+z" },
        handedness: "right",
        verticalAxis: "z",
        orientation: {
          rotations: [0, 0, 0],
          rotationOrder: "xyz",
          rotationConvention: "intrinsic",
        },
        transformToCanonical: {
          transformVersion: "canonical-v1",
          status: "verified",
          matrix: IDENTITY_MATRIX,
        },
        angleUnit: "rad",
        confidenceStatus: "unknown",
      },
    ],
    unitContext: {
      schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
      contextId,
      length: "m",
      angle: "rad",
      force: "kN",
      stress: "kPa",
      conversionVersion: "si-v1",
    },
    projectContext: {
      projectId: projectContextId,
      name: "Apollo bridge structure",
      clientName: null,
      phaseTag: "vvs01-block-b",
    },
    bridge: {
      bridgeId,
      name: "User bridge structure",
      spans: spanIds.map((spanId, index) => ({
        spanId,
        index,
        startSupportId: supportIds[index]!,
        endSupportId: supportIds[index + 1]!,
        length: userInputQuantity(effectiveSpanLength, "m"),
      })),
      girderLines: girderLineIds.map((girderLineId, index) => {
        const offset = (index - (girderCount - 1) / 2) * girderSpacing;
        return {
          girderLineId,
          index,
          label: `G${index + 1}`,
          offsetFromCenterline: userInputQuantity(offset, "m"),
          depthProfile: "equal",
          materialRefId: materialId,
          sectionIntentRefId: null,
        };
      }),
      deck: {
        deckId,
        deckKind: "rc_non_composite",
        width: userInputQuantity(width, "m"),
        thickness: userInputQuantity(deckThickness, "m"),
        unitWeight: {
          value: null,
          units: "kN/m3",
          adoptionStatus: "UNKNOWN",
          sourceLocator: null,
        },
      },
      supports: supportIds.map((supportId, index) => ({
        supportId,
        station: userInputQuantity(index * effectiveSpanLength, "m"),
        fixity: index === 0 || index === supportIds.length - 1 ? "pinned" : "roller",
        role: index === 0 || index === supportIds.length - 1 ? "abutment" : "bearing",
      })),
    },
    materialDefinitions: [
      {
        materialId,
        designation: "USER_INPUT_STEEL",
        yieldStrength: {
          value: null,
          units: "MPa",
          adoptionStatus: "UNKNOWN",
          sourceLocator: null,
        },
        elasticModulus: {
          value: null,
          units: "MPa",
          adoptionStatus: "UNKNOWN",
          sourceLocator: null,
        },
        unitWeight: {
          value: null,
          units: "kN/m3",
          adoptionStatus: "UNKNOWN",
          sourceLocator: null,
        },
      },
    ],
    loadCases: [
      {
        loadCaseId,
        name: "Dead load placeholder",
        kind: "dead",
        loads: [],
      },
    ],
    analysisBindings: [],
    structuralDesignModel,
    roadImportProvenance: null,
    phase1ScopeAssertion: {
      alignmentClass: "straight",
      skewAngleDeg: userInputQuantity(90, "deg"),
      spanSystem: "simple",
      superstructureKind: "plate_girder_rc_slab_non_composite",
      analysisType: "static_linear",
    },
    validationStatus: "unvalidated",
  };

  const contentChecksum = computeContentChecksum(draftWithoutChecksum);
  const document: BridgeSuperstructureDesignDocument = {
    ...draftWithoutChecksum,
    contentChecksum,
  };

  const validationResult = validateBridgeSuperstructureDesignDocument(document);
  if (validationResult.status !== "valid") {
    return { document: null, diagnostics: validationResult.issues.map((issue) => issue.message) };
  }

  return { document, diagnostics: [] };
}


export function generateBridgeStructureFromInput(
  project: ProjectModel,
  input: ApolloBridgeStructureInputDraft,
): BridgeStructureGenerationResult {
  const validation = validateBridgeStructureInputDraft(input);
  if (!validation.complete) {
    return { ok: false, diagnostics: validation.diagnostics };
  }

  const projectScopeId = project.project.id;
  const built = buildBridgeSuperstructureDesignDocument(projectScopeId, input, validation);
  if (!built.document) {
    return {
      ok: false,
      diagnostics:
        built.diagnostics.length > 0
          ? built.diagnostics
          : ["構造設計モデルの生成に失敗しました。入力値を確認してください。"],
    };
  }

  const generatedAt = new Date().toISOString();
  const nextInput: ApolloBridgeStructureInputDraft = {
    ...input,
    generatedAt,
  };

  const quantities = computeBridgeStructureApproximateQuantities(nextInput, true);

  const nextProject: ProjectModel = {
    ...project,
    apolloBsdd: built.document,
    apolloBridgeStructureInput: nextInput,
  };

  return { ok: true, project: nextProject, quantities };
}

export function getBridgeStructureInputDraft(project: ProjectModel): ApolloBridgeStructureInputDraft {
  return project.apolloBridgeStructureInput ?? createEmptyBridgeStructureInputDraft();
}

export function getBridgeStructureQuantities(project: ProjectModel): readonly BridgeStructureApproximateQuantity[] {
  const input = getBridgeStructureInputDraft(project);
  const validation = validateBridgeStructureInputDraft(input);
  if (!project.apolloBsdd?.structuralDesignModel) {
    return computeBridgeStructureApproximateQuantities(input, validation.complete);
  }
  return computeBridgeStructureApproximateQuantities(input, true);
}

export function withBridgeStructureInputDraft(
  project: ProjectModel,
  updater: (draft: ApolloBridgeStructureInputDraft) => ApolloBridgeStructureInputDraft,
): ProjectModel {
  const current = getBridgeStructureInputDraft(project);
  return {
    ...project,
    apolloBridgeStructureInput: updater(current),
  };
}

export function withBridgeStructureField(
  project: ProjectModel,
  key: keyof ApolloBridgeStructureInputDraft,
  value: number | null,
): ProjectModel {
  if (key === "schemaVersion" || key === "generatedAt") {
    return project;
  }
  return withBridgeStructureInputDraft(project, (draft) => ({
    ...draft,
    [key]: value,
    generatedAt: null,
  }));
}
