import {
  TargetStandardStatus,
  type NumericAuthorityContext,
} from "../apollo/types";
import type { ContentChecksum } from "./contentChecksum";
import { validateContentChecksum } from "./contentChecksum";
import {
  BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import type { CoordinateContext } from "./coordinateContext";
import { validateCoordinateContext } from "./coordinateContext";
import {
  validateDocumentReference,
  type DocumentReference,
} from "./documentReference";
import type { Extensions } from "./extensions";
import { validateExtensions } from "./extensions";
import {
  validateGovernedQuantity,
  type GovernedQuantity,
  type GovernedQuantityAdoptionStatus,
  type ValidateGovernedQuantityOptions,
} from "./governedQuantity";
import type { Provenance } from "./provenance";
import { validateProvenance } from "./provenance";
import type { RunAnalysisIf3Metadata } from "../if3/buildRunAnalysisIf3Metadata";
import { validateRunAnalysisIf3Metadata } from "../if3/runAnalysisBindingGuard";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import type { UnitContext } from "./unitContext";
import { validateUnitContext } from "./unitContext";
import { isValidUuid, type UuidString } from "./uuid";
import {
  collectEntityIdIssues,
  findDuplicateEntityIds,
  validateEntityIdReference,
  type EntityIdRef,
} from "./contractEntityRefs";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND =
  "bridge-superstructure-design" as const;

export type BsddLifecycleStatus =
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "SUPERSEDED"
  | "STALE"
  | "ARCHIVED";

export type BsddValidationStatus =
  | "unvalidated"
  | "structurally_valid"
  | "structurally_invalid"
  | "blocked";

export type BsddAnalysisBindingStatus = "pending" | "exported" | "analyzed" | "stale";

export type BsddAnalysisType = "static_linear";

export interface BsddProjectContext {
  readonly projectId: UuidString;
  readonly name: string;
  readonly clientName?: string | null;
  readonly phaseTag?: string | null;
}

export interface BsddSpan {
  readonly spanId: UuidString;
  readonly index: number;
  readonly startSupportId: UuidString;
  readonly endSupportId: UuidString;
  readonly length: GovernedQuantity;
}

export interface BsddGirderLine {
  readonly girderLineId: UuidString;
  readonly index: number;
  readonly label: string;
  readonly offsetFromCenterline: GovernedQuantity;
  readonly depthProfile: string;
  readonly materialRefId: UuidString | null;
  readonly sectionIntentRefId: UuidString | null;
}

export interface BsddDeck {
  readonly deckId: UuidString;
  readonly deckKind: "rc_non_composite";
  readonly width: GovernedQuantity;
  readonly thickness: GovernedQuantity;
  readonly unitWeight: GovernedQuantity;
}

export interface BsddSupport {
  readonly supportId: UuidString;
  readonly station: GovernedQuantity;
  readonly fixity: string;
  readonly role: string;
}

export interface BsddBridge {
  readonly bridgeId: UuidString;
  readonly name: string;
  readonly spans: readonly BsddSpan[];
  readonly girderLines: readonly BsddGirderLine[];
  readonly deck: BsddDeck;
  readonly supports: readonly BsddSupport[];
}

export interface BsddMaterialDefinition {
  readonly materialId: UuidString;
  readonly designation: string;
  readonly yieldStrength: GovernedQuantity;
  readonly elasticModulus: GovernedQuantity;
  readonly unitWeight: GovernedQuantity;
}

export type BsddLoadTargetKind = "girderLine" | "deck" | "supportRegion";

export interface BsddLoadTargetRef {
  readonly kind: BsddLoadTargetKind;
  readonly refId: UuidString;
}

export interface BsddLoad {
  readonly loadId: UuidString;
  readonly pattern: "uniform" | "point" | "line" | "unknown";
  readonly magnitude: GovernedQuantity;
  readonly direction?: "+Z" | "-Z" | "+Y" | "-Y" | "+X" | "-X" | null;
  readonly targetRef: BsddLoadTargetRef;
}

export interface BsddLoadCase {
  readonly loadCaseId: UuidString;
  readonly name: string;
  readonly kind: "dead" | "slab" | "live" | "other";
  readonly loads: readonly BsddLoad[];
}

export interface BsddAnalysisBinding {
  readonly bindingId: UuidString;
  readonly analysisType: BsddAnalysisType;
  readonly bindingStatus: BsddAnalysisBindingStatus;
  readonly sourceBsdDocumentRef: DocumentReference;
  readonly targetBfadDocumentRef: DocumentReference | null;
  readonly resultResourceRef: DocumentReference | null;
  readonly if3Metadata: RunAnalysisIf3Metadata | null;
  readonly exportAuthorityRef?: DocumentReference | null;
}

export interface BsddPhase1ScopeAssertion {
  readonly alignmentClass: "straight";
  readonly skewAngleDeg: GovernedQuantity;
  readonly spanSystem: "simple" | "continuous";
  readonly superstructureKind: "plate_girder_rc_slab_non_composite";
  readonly analysisType: "static_linear";
}

export const DESIGN_ENTITY_DESIGN_STATUSES = [
  "NOT_AUTHORIZED",
  "INCOMPLETE",
  "READY",
  "STALE",
  "OK",
  "NG",
  "WARNING",
  "ERROR",
] as const;

export type DesignEntityDesignStatus = (typeof DESIGN_ENTITY_DESIGN_STATUSES)[number];

export type DesignEntityAdoptionStatus = GovernedQuantityAdoptionStatus;

export type DesignBindingStatus = "unbound" | "bound" | "stale";

export interface DesignGeometryReference {
  readonly geometryRefId: UuidString | null;
  readonly bindingStatus: DesignBindingStatus;
}

export interface DesignAnalysisMemberMapping {
  readonly analysisMemberRefId: UuidString | null;
  readonly bindingStatus: DesignBindingStatus;
  readonly analysisBindingId?: UuidString | null;
}

export interface DesignEntityMetadata {
  readonly entityRevisionId: number;
  readonly provenance: Provenance;
  readonly sourceRef?: DocumentReference | null;
  readonly geometryRef: DesignGeometryReference;
  readonly analysisMapping: DesignAnalysisMemberMapping;
  readonly designStatus: DesignEntityDesignStatus;
  readonly adoptionStatus: DesignEntityAdoptionStatus;
  readonly extensions?: Extensions;
}

export interface SdmNonCompositeAssertion {
  readonly compositeAction: false;
}

export interface MainGirder extends DesignEntityMetadata {
  readonly entityKind: "MainGirder";
  readonly mainGirderId: UuidString;
  readonly girderLineRefId: UuidString | null;
  readonly materialRefId?: UuidString | null;
  readonly compositeAction?: false;
}

export interface GirderSectionSegment extends DesignEntityMetadata {
  readonly entityKind: "GirderSectionSegment";
  readonly girderSectionSegmentId: UuidString;
  readonly mainGirderRefId: UuidString | null;
  readonly materialRefId?: UuidString | null;
}

export interface RcDeck extends DesignEntityMetadata {
  readonly entityKind: "RcDeck";
  readonly rcDeckId: UuidString;
  readonly deckRefId: UuidString | null;
  readonly compositeAction?: false;
}

export interface Haunch extends DesignEntityMetadata {
  readonly entityKind: "Haunch";
  readonly haunchId: UuidString;
  readonly mainGirderRefId: UuidString | null;
  /** Step 4-B additive geometry (DEC-S4-0003). Optional for backward compatibility with ID-only haunches. */
  readonly shapeType?: "RECT" | "TRAPEZOID";
  readonly startStation?: number;
  readonly endStation?: number;
  readonly topWidth?: number;
  readonly bottomWidth?: number;
  readonly height?: number;
  readonly materialRef?: string | null;
}

export interface CrossBeam extends DesignEntityMetadata {
  readonly entityKind: "CrossBeam";
  readonly crossBeamId: UuidString;
  readonly materialRefId?: UuidString | null;
}

export interface SwayBracing extends DesignEntityMetadata {
  readonly entityKind: "SwayBracing";
  readonly swayBracingId: UuidString;
}

export interface LateralBracing extends DesignEntityMetadata {
  readonly entityKind: "LateralBracing";
  readonly lateralBracingId: UuidString;
}

export interface BraceMember extends DesignEntityMetadata {
  readonly entityKind: "BraceMember";
  readonly braceMemberId: UuidString;
  readonly parentBracingRefId: UuidString | null;
}

export interface Stiffener extends DesignEntityMetadata {
  readonly entityKind: "Stiffener";
  readonly stiffenerId: UuidString;
  readonly mainGirderRefId: UuidString | null;
}

export interface Splice extends DesignEntityMetadata {
  readonly entityKind: "Splice";
  readonly spliceId: UuidString;
  readonly mainGirderRefId: UuidString | null;
}

export const DECK_ANCHORAGE_ROLES = [
  "slab_to_girder",
  "uplift_restraint",
  "other_non_composite",
] as const;

export type DeckAnchorageRole = (typeof DECK_ANCHORAGE_ROLES)[number];

export interface DeckAnchorage extends DesignEntityMetadata {
  readonly entityKind: "DeckAnchorage";
  readonly deckAnchorageId: UuidString;
  readonly anchorageRole: DeckAnchorageRole;
  readonly girderRefId: UuidString | null;
  readonly rcDeckRefId: UuidString | null;
}

export interface StructuralDesignModel {
  readonly modelId: UuidString;
  readonly nonCompositeAssertion: SdmNonCompositeAssertion;
  readonly mainGirders: readonly MainGirder[];
  readonly girderSectionSegments: readonly GirderSectionSegment[];
  readonly rcDecks: readonly RcDeck[];
  readonly haunches: readonly Haunch[];
  readonly crossBeams: readonly CrossBeam[];
  readonly swayBracings: readonly SwayBracing[];
  readonly lateralBracings: readonly LateralBracing[];
  readonly braceMembers: readonly BraceMember[];
  readonly stiffeners: readonly Stiffener[];
  readonly splices: readonly Splice[];
  readonly deckAnchorages: readonly DeckAnchorage[];
}

export type StructuralDesignModelEntity =
  | MainGirder
  | GirderSectionSegment
  | RcDeck
  | Haunch
  | CrossBeam
  | SwayBracing
  | LateralBracing
  | BraceMember
  | Stiffener
  | Splice
  | DeckAnchorage;

const DESIGN_ENTITY_DESIGN_STATUS_SET = new Set<string>(DESIGN_ENTITY_DESIGN_STATUSES);

export function isDesignEntityDesignStatus(value: string): value is DesignEntityDesignStatus {
  return DESIGN_ENTITY_DESIGN_STATUS_SET.has(value);
}

export interface BridgeSuperstructureDesignDocument {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentKind: typeof BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND;
  readonly documentId: UuidString;
  readonly revisionId: number;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly lifecycleStatus: BsddLifecycleStatus;
  readonly coordinateContexts: readonly CoordinateContext[];
  readonly unitContext: UnitContext;
  readonly projectContext: BsddProjectContext;
  readonly bridge: BsddBridge;
  readonly materialDefinitions: readonly BsddMaterialDefinition[];
  readonly loadCases: readonly BsddLoadCase[];
  readonly analysisBindings: readonly BsddAnalysisBinding[];
  readonly structuralDesignModel?: StructuralDesignModel;
  readonly roadImportProvenance?: DocumentReference | null;
  readonly phase1ScopeAssertion: BsddPhase1ScopeAssertion;
  readonly validationStatus?: BsddValidationStatus;
  readonly exportAuthorityRef?: DocumentReference | null;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly migrationProvenanceRef?: DocumentReference;
}

export interface ValidateBridgeSuperstructureDesignDocumentOptions {
  readonly numericAuthorityContext?: NumericAuthorityContext;
}

function joinPath(basePath: string, suffix: string): string {
  if (basePath.length === 0) {
    return suffix.startsWith("/") ? suffix.slice(1) : suffix;
  }
  if (suffix.startsWith("/")) {
    return `${basePath}${suffix}`;
  }
  return `${basePath}/${suffix}`;
}

const DESIGN_ENTITY_CHECK_RESULT_STATUSES = new Set<DesignEntityDesignStatus>([
  "OK",
  "NG",
  "WARNING",
  "ERROR",
]);

const COMPOSITE_CONNECTOR_EXTENSION_KEY_PATTERN =
  /(?:^|\/)compositeShearConnector$|(?:^|\/)slabGirderConnector$/i;

interface BsddEntityIdRegistry {
  readonly knownIds: ReadonlySet<UuidString>;
  readonly geometryAnchorIds: ReadonlySet<UuidString>;
  readonly mainGirderIds: ReadonlySet<UuidString>;
  readonly rcDeckIds: ReadonlySet<UuidString>;
  readonly swayBracingIds: ReadonlySet<UuidString>;
  readonly lateralBracingIds: ReadonlySet<UuidString>;
  readonly materialIds: ReadonlySet<UuidString>;
  readonly girderLineIds: ReadonlySet<UuidString>;
  readonly deckId: UuidString | undefined;
  readonly analysisBindingIds: ReadonlySet<UuidString>;
}

function collectEntityIdRef(
  id: UuidString | undefined,
  path: string,
  entries: EntityIdRef[],
): void {
  if (id !== undefined && isValidUuid(id)) {
    entries.push({ id, path });
  }
}

function buildBsddEntityIdRegistry(
  document: Partial<BridgeSuperstructureDesignDocument>,
  basePath: string,
): { readonly entries: readonly EntityIdRef[]; readonly registry: BsddEntityIdRegistry } {
  const entries: EntityIdRef[] = [];

  collectEntityIdRef(
    document.bridge?.bridgeId,
    joinPath(basePath, "/bridge/bridgeId"),
    entries,
  );
  document.bridge?.spans?.forEach((span, index) => {
    collectEntityIdRef(
      span.spanId,
      joinPath(basePath, `/bridge/spans/${index}/spanId`),
      entries,
    );
  });
  document.bridge?.girderLines?.forEach((line, index) => {
    collectEntityIdRef(
      line.girderLineId,
      joinPath(basePath, `/bridge/girderLines/${index}/girderLineId`),
      entries,
    );
  });
  collectEntityIdRef(
    document.bridge?.deck?.deckId,
    joinPath(basePath, "/bridge/deck/deckId"),
    entries,
  );
  document.bridge?.supports?.forEach((support, index) => {
    collectEntityIdRef(
      support.supportId,
      joinPath(basePath, `/bridge/supports/${index}/supportId`),
      entries,
    );
  });
  document.materialDefinitions?.forEach((material, index) => {
    collectEntityIdRef(
      material.materialId,
      joinPath(basePath, `/materialDefinitions/${index}/materialId`),
      entries,
    );
  });
  document.loadCases?.forEach((loadCase, caseIndex) => {
    collectEntityIdRef(
      loadCase.loadCaseId,
      joinPath(basePath, `/loadCases/${caseIndex}/loadCaseId`),
      entries,
    );
    loadCase.loads.forEach((load, loadIndex) => {
      collectEntityIdRef(
        load.loadId,
        joinPath(basePath, `/loadCases/${caseIndex}/loads/${loadIndex}/loadId`),
        entries,
      );
    });
  });
  document.analysisBindings?.forEach((binding, index) => {
    collectEntityIdRef(
      binding.bindingId,
      joinPath(basePath, `/analysisBindings/${index}/bindingId`),
      entries,
    );
  });

  const sdm = document.structuralDesignModel;
  const sdmPath = joinPath(basePath, "/structuralDesignModel");
  if (sdm !== undefined) {
    collectEntityIdRef(sdm.modelId, joinPath(sdmPath, "/modelId"), entries);
    sdm.mainGirders.forEach((entity, index) => {
      collectEntityIdRef(
        entity.mainGirderId,
        joinPath(sdmPath, `/mainGirders/${index}/mainGirderId`),
        entries,
      );
    });
    sdm.girderSectionSegments.forEach((entity, index) => {
      collectEntityIdRef(
        entity.girderSectionSegmentId,
        joinPath(sdmPath, `/girderSectionSegments/${index}/girderSectionSegmentId`),
        entries,
      );
    });
    sdm.rcDecks.forEach((entity, index) => {
      collectEntityIdRef(
        entity.rcDeckId,
        joinPath(sdmPath, `/rcDecks/${index}/rcDeckId`),
        entries,
      );
    });
    sdm.haunches.forEach((entity, index) => {
      collectEntityIdRef(entity.haunchId, joinPath(sdmPath, `/haunches/${index}/haunchId`), entries);
    });
    sdm.crossBeams.forEach((entity, index) => {
      collectEntityIdRef(
        entity.crossBeamId,
        joinPath(sdmPath, `/crossBeams/${index}/crossBeamId`),
        entries,
      );
    });
    sdm.swayBracings.forEach((entity, index) => {
      collectEntityIdRef(
        entity.swayBracingId,
        joinPath(sdmPath, `/swayBracings/${index}/swayBracingId`),
        entries,
      );
    });
    sdm.lateralBracings.forEach((entity, index) => {
      collectEntityIdRef(
        entity.lateralBracingId,
        joinPath(sdmPath, `/lateralBracings/${index}/lateralBracingId`),
        entries,
      );
    });
    sdm.braceMembers.forEach((entity, index) => {
      collectEntityIdRef(
        entity.braceMemberId,
        joinPath(sdmPath, `/braceMembers/${index}/braceMemberId`),
        entries,
      );
    });
    sdm.stiffeners.forEach((entity, index) => {
      collectEntityIdRef(
        entity.stiffenerId,
        joinPath(sdmPath, `/stiffeners/${index}/stiffenerId`),
        entries,
      );
    });
    sdm.splices.forEach((entity, index) => {
      collectEntityIdRef(entity.spliceId, joinPath(sdmPath, `/splices/${index}/spliceId`), entries);
    });
    sdm.deckAnchorages.forEach((entity, index) => {
      collectEntityIdRef(
        entity.deckAnchorageId,
        joinPath(sdmPath, `/deckAnchorages/${index}/deckAnchorageId`),
        entries,
      );
    });
  }

  const knownIds = new Set<UuidString>(entries.map((entry) => entry.id));
  const geometryAnchorIds = new Set<UuidString>();
  document.bridge?.spans?.forEach((span) => {
    if (isValidUuid(span.spanId)) {
      geometryAnchorIds.add(span.spanId);
    }
  });
  document.bridge?.girderLines?.forEach((line) => {
    if (isValidUuid(line.girderLineId)) {
      geometryAnchorIds.add(line.girderLineId);
    }
  });
  if (document.bridge?.deck?.deckId !== undefined && isValidUuid(document.bridge.deck.deckId)) {
    geometryAnchorIds.add(document.bridge.deck.deckId);
  }
  document.bridge?.supports?.forEach((support) => {
    if (isValidUuid(support.supportId)) {
      geometryAnchorIds.add(support.supportId);
    }
  });

  const mainGirderIds = new Set<UuidString>(
    sdm?.mainGirders
      .map((entity) => entity.mainGirderId)
      .filter((id): id is UuidString => isValidUuid(id)) ?? [],
  );
  const rcDeckIds = new Set<UuidString>(
    sdm?.rcDecks.map((entity) => entity.rcDeckId).filter((id): id is UuidString => isValidUuid(id)) ??
      [],
  );
  const swayBracingIds = new Set<UuidString>(
    sdm?.swayBracings
      .map((entity) => entity.swayBracingId)
      .filter((id): id is UuidString => isValidUuid(id)) ?? [],
  );
  const lateralBracingIds = new Set<UuidString>(
    sdm?.lateralBracings
      .map((entity) => entity.lateralBracingId)
      .filter((id): id is UuidString => isValidUuid(id)) ?? [],
  );
  const materialIds = new Set<UuidString>(
    document.materialDefinitions
      ?.map((material) => material.materialId)
      .filter((id): id is UuidString => isValidUuid(id)) ?? [],
  );
  const girderLineIds = new Set<UuidString>(
    document.bridge?.girderLines
      ?.map((line) => line.girderLineId)
      .filter((id): id is UuidString => isValidUuid(id)) ?? [],
  );
  const analysisBindingIds = new Set<UuidString>(
    document.analysisBindings
      ?.map((binding) => binding.bindingId)
      .filter((id): id is UuidString => isValidUuid(id)) ?? [],
  );

  return {
    entries,
    registry: {
      knownIds,
      geometryAnchorIds,
      mainGirderIds,
      rcDeckIds,
      swayBracingIds,
      lateralBracingIds,
      materialIds,
      girderLineIds,
      deckId:
        document.bridge?.deck?.deckId !== undefined && isValidUuid(document.bridge.deck.deckId)
          ? document.bridge.deck.deckId
          : undefined,
      analysisBindingIds,
    },
  };
}

function validateEntityUuidField(
  id: UuidString | undefined,
  path: string,
  issues: ValidationIssue[],
): void {
  if (id === undefined || !isValidUuid(id)) {
    issues.push(
      createValidationIssue({
        code: "BSDD_ENTITY_ID_INVALID",
        severity: "error",
        message: "Entity ID must be a valid UUID.",
        path,
      }),
    );
  }
}

function validateEntityRevisionId(
  entityRevisionId: number | undefined,
  path: string,
  issues: ValidationIssue[],
): void {
  if (
    entityRevisionId === undefined ||
    !Number.isInteger(entityRevisionId) ||
    entityRevisionId <= 0
  ) {
    issues.push(
      createValidationIssue({
        code: "BSDD_ENTITY_REVISION_ID_INVALID",
        severity: "error",
        message: "entityRevisionId must be a positive integer.",
        path,
      }),
    );
  }
}

function validateNullableBindingConsistency(
  refId: UuidString | null | undefined,
  bindingStatus: DesignBindingStatus | undefined,
  refPath: string,
  statusPath: string,
  issues: ValidationIssue[],
): void {
  if (refId === undefined || bindingStatus === undefined) {
    return;
  }

  if (refId === null && bindingStatus !== "unbound") {
    issues.push(
      createValidationIssue({
        code: "BSDD_NULL_BINDING_VIOLATION",
        severity: "error",
        message: "bindingStatus must be unbound when the reference ID is null.",
        path: statusPath,
      }),
    );
  }

  if (refId !== null && bindingStatus === "unbound") {
    issues.push(
      createValidationIssue({
        code: "BSDD_NULL_BINDING_VIOLATION",
        severity: "error",
        message: "bindingStatus cannot be unbound when a reference ID is present.",
        path: refPath,
      }),
    );
  }
}

function validateDesignEntityExtensionsForCompositeContamination(
  extensions: Extensions | undefined,
  basePath: string,
  issues: ValidationIssue[],
): void {
  if (extensions === undefined) {
    return;
  }

  for (const key of Object.keys(extensions)) {
    if (COMPOSITE_CONNECTOR_EXTENSION_KEY_PATTERN.test(key)) {
      issues.push(
        createValidationIssue({
          code: "BSDD_COMPOSITE_CONNECTOR_FORBIDDEN",
          severity: "error",
          message: "Composite shear connector extensions are forbidden in Phase 1 non-composite scope.",
          path: joinPath(basePath, `/${key}`),
        }),
      );
    }
  }
}

function validateDesignStatusGovernance(
  metadata: DesignEntityMetadata,
  entityPath: string,
  options: ValidateGovernedQuantityOptions,
  issues: ValidationIssue[],
): void {
  const { designStatus, adoptionStatus } = metadata;
  const designStatusPath = joinPath(entityPath, "/designStatus");
  const adoptionStatusPath = joinPath(entityPath, "/adoptionStatus");
  const numericContext =
    options.numericAuthorityContext ?? {
      targetStandardStatus: TargetStandardStatus.NOT_SELECTED,
    };

  if (!isDesignEntityDesignStatus(designStatus)) {
    issues.push(
      createValidationIssue({
        code: "BSDD_DESIGN_STATUS_INVALID",
        severity: "error",
        message: "designStatus must be a supported DesignEntityDesignStatus value.",
        path: designStatusPath,
      }),
    );
    return;
  }

  if (DESIGN_ENTITY_CHECK_RESULT_STATUSES.has(designStatus)) {
    if (adoptionStatus !== "ADOPTED") {
      issues.push(
        createValidationIssue({
          code: "BSDD_ADOPTION_DESIGN_STATUS_CONTRADICTION",
          severity: "error",
          message: `${designStatus} designStatus requires adoptionStatus ADOPTED.`,
          path: adoptionStatusPath,
        }),
      );
    }

    if (numericContext.targetStandardStatus === TargetStandardStatus.NOT_SELECTED) {
      issues.push(
        createValidationIssue({
          code: "BSDD_DESIGN_STATUS_NOT_AUTHORIZED_FAIL_CLOSED",
          severity: "error",
          message: `${designStatus} designStatus is not permitted while numeric design authority is NOT_SELECTED.`,
          path: designStatusPath,
        }),
      );
    }
  }

  if (designStatus === "INCOMPLETE" && adoptionStatus === "ADOPTED") {
    issues.push(
      createValidationIssue({
        code: "BSDD_ADOPTION_DESIGN_STATUS_CONTRADICTION",
        severity: "error",
        message: "INCOMPLETE designStatus cannot coexist with adoptionStatus ADOPTED.",
        path: adoptionStatusPath,
      }),
    );
  }
}

function validateDanglingReference(
  refId: UuidString | null | undefined,
  knownIds: ReadonlySet<UuidString>,
  path: string,
  issues: ValidationIssue[],
): void {
  if (refId === null || refId === undefined) {
    return;
  }

  collectEntityIdIssues(
    issues,
    validateEntityIdReference(
      refId,
      knownIds,
      path,
      "BSDD_DANGLING_REFERENCE",
      "Referenced entity ID does not resolve within the document.",
    ),
  );
}

function validateDesignEntityMetadata(
  metadata: DesignEntityMetadata & { readonly entityKind: StructuralDesignModelEntity["entityKind"] },
  entityPath: string,
  expectedKind: StructuralDesignModelEntity["entityKind"],
  registry: BsddEntityIdRegistry,
  options: ValidateGovernedQuantityOptions,
  issues: ValidationIssue[],
): void {
  const entityKindPath = joinPath(entityPath, "/entityKind");
  if (metadata.entityKind !== expectedKind) {
    issues.push(
      createValidationIssue({
        code: "BSDD_ENTITY_KIND_MISMATCH",
        severity: "error",
        message: `entityKind must be "${expectedKind}" for entities in this collection.`,
        path: entityKindPath,
      }),
    );
  }

  validateEntityRevisionId(
    metadata.entityRevisionId,
    joinPath(entityPath, "/entityRevisionId"),
    issues,
  );
  issues.push(...validateProvenance(metadata.provenance, joinPath(entityPath, "/provenance")).issues);
  if (metadata.sourceRef !== undefined && metadata.sourceRef !== null) {
    issues.push(
      ...validateDocumentReference(metadata.sourceRef, joinPath(entityPath, "/sourceRef")).issues,
    );
  }
  issues.push(
    ...validateExtensions(metadata.extensions, joinPath(entityPath, "/extensions")).issues,
  );
  validateDesignEntityExtensionsForCompositeContamination(
    metadata.extensions,
    joinPath(entityPath, "/extensions"),
    issues,
  );
  validateNullableBindingConsistency(
    metadata.geometryRef.geometryRefId,
    metadata.geometryRef.bindingStatus,
    joinPath(entityPath, "/geometryRef/geometryRefId"),
    joinPath(entityPath, "/geometryRef/bindingStatus"),
    issues,
  );
  validateNullableBindingConsistency(
    metadata.analysisMapping.analysisMemberRefId,
    metadata.analysisMapping.bindingStatus,
    joinPath(entityPath, "/analysisMapping/analysisMemberRefId"),
    joinPath(entityPath, "/analysisMapping/bindingStatus"),
    issues,
  );
  validateDanglingReference(
    metadata.geometryRef.geometryRefId,
    registry.geometryAnchorIds,
    joinPath(entityPath, "/geometryRef/geometryRefId"),
    issues,
  );
  validateDanglingReference(
    metadata.analysisMapping.analysisMemberRefId,
    new Set<UuidString>(),
    joinPath(entityPath, "/analysisMapping/analysisMemberRefId"),
    issues,
  );
  validateDanglingReference(
    metadata.analysisMapping.analysisBindingId ?? null,
    registry.analysisBindingIds,
    joinPath(entityPath, "/analysisMapping/analysisBindingId"),
    issues,
  );
  validateDesignStatusGovernance(metadata, entityPath, options, issues);
}

function validateStructuralDesignModel(
  model: StructuralDesignModel | undefined,
  registry: BsddEntityIdRegistry,
  basePath: string,
  options: ValidateGovernedQuantityOptions,
): ValidationResult {
  if (model === undefined) {
    return createValidationResult([]);
  }

  const issues: ValidationIssue[] = [];

  validateEntityUuidField(model.modelId, joinPath(basePath, "/modelId"), issues);

  if (model.nonCompositeAssertion.compositeAction !== false) {
    issues.push(
      createValidationIssue({
        code: "BSDD_NON_COMPOSITE_ASSERTION_INVALID",
        severity: "error",
        message: "nonCompositeAssertion.compositeAction must be false.",
        path: joinPath(basePath, "/nonCompositeAssertion/compositeAction"),
      }),
    );
  }

  model.mainGirders.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/mainGirders/${index}`);
    validateEntityUuidField(entity.mainGirderId, joinPath(entityPath, "/mainGirderId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "MainGirder", registry, options, issues);
    if (entity.compositeAction !== undefined && entity.compositeAction !== false) {
      issues.push(
        createValidationIssue({
          code: "BSDD_NON_COMPOSITE_ASSERTION_INVALID",
          severity: "error",
          message: "MainGirder compositeAction must be false when present.",
          path: joinPath(entityPath, "/compositeAction"),
        }),
      );
    }
    validateDanglingReference(
      entity.girderLineRefId,
      registry.girderLineIds,
      joinPath(entityPath, "/girderLineRefId"),
      issues,
    );
    validateDanglingReference(
      entity.materialRefId ?? null,
      registry.materialIds,
      joinPath(entityPath, "/materialRefId"),
      issues,
    );
  });

  model.girderSectionSegments.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/girderSectionSegments/${index}`);
    validateEntityUuidField(
      entity.girderSectionSegmentId,
      joinPath(entityPath, "/girderSectionSegmentId"),
      issues,
    );
    validateDesignEntityMetadata(
      entity,
      entityPath,
      "GirderSectionSegment",
      registry,
      options,
      issues,
    );
    validateDanglingReference(
      entity.mainGirderRefId,
      registry.mainGirderIds,
      joinPath(entityPath, "/mainGirderRefId"),
      issues,
    );
    validateDanglingReference(
      entity.materialRefId ?? null,
      registry.materialIds,
      joinPath(entityPath, "/materialRefId"),
      issues,
    );
  });

  model.rcDecks.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/rcDecks/${index}`);
    validateEntityUuidField(entity.rcDeckId, joinPath(entityPath, "/rcDeckId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "RcDeck", registry, options, issues);
    if (entity.compositeAction !== undefined && entity.compositeAction !== false) {
      issues.push(
        createValidationIssue({
          code: "BSDD_NON_COMPOSITE_ASSERTION_INVALID",
          severity: "error",
          message: "RcDeck compositeAction must be false when present.",
          path: joinPath(entityPath, "/compositeAction"),
        }),
      );
    }
    const deckRefTargets =
      registry.deckId !== undefined
        ? new Set<UuidString>([registry.deckId, ...registry.rcDeckIds])
        : registry.rcDeckIds;
    validateDanglingReference(
      entity.deckRefId,
      deckRefTargets,
      joinPath(entityPath, "/deckRefId"),
      issues,
    );
  });

  model.haunches.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/haunches/${index}`);
    validateEntityUuidField(entity.haunchId, joinPath(entityPath, "/haunchId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "Haunch", registry, options, issues);
    validateDanglingReference(
      entity.mainGirderRefId,
      registry.mainGirderIds,
      joinPath(entityPath, "/mainGirderRefId"),
      issues,
    );
  });

  model.crossBeams.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/crossBeams/${index}`);
    validateEntityUuidField(entity.crossBeamId, joinPath(entityPath, "/crossBeamId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "CrossBeam", registry, options, issues);
    validateDanglingReference(
      entity.materialRefId ?? null,
      registry.materialIds,
      joinPath(entityPath, "/materialRefId"),
      issues,
    );
  });

  model.swayBracings.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/swayBracings/${index}`);
    validateEntityUuidField(entity.swayBracingId, joinPath(entityPath, "/swayBracingId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "SwayBracing", registry, options, issues);
  });

  model.lateralBracings.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/lateralBracings/${index}`);
    validateEntityUuidField(
      entity.lateralBracingId,
      joinPath(entityPath, "/lateralBracingId"),
      issues,
    );
    validateDesignEntityMetadata(entity, entityPath, "LateralBracing", registry, options, issues);
  });

  model.braceMembers.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/braceMembers/${index}`);
    validateEntityUuidField(entity.braceMemberId, joinPath(entityPath, "/braceMemberId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "BraceMember", registry, options, issues);
    const parentBracingIds = new Set<UuidString>([
      ...registry.swayBracingIds,
      ...registry.lateralBracingIds,
    ]);
    validateDanglingReference(
      entity.parentBracingRefId,
      parentBracingIds,
      joinPath(entityPath, "/parentBracingRefId"),
      issues,
    );
  });

  model.stiffeners.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/stiffeners/${index}`);
    validateEntityUuidField(entity.stiffenerId, joinPath(entityPath, "/stiffenerId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "Stiffener", registry, options, issues);
    validateDanglingReference(
      entity.mainGirderRefId,
      registry.mainGirderIds,
      joinPath(entityPath, "/mainGirderRefId"),
      issues,
    );
  });

  model.splices.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/splices/${index}`);
    validateEntityUuidField(entity.spliceId, joinPath(entityPath, "/spliceId"), issues);
    validateDesignEntityMetadata(entity, entityPath, "Splice", registry, options, issues);
    validateDanglingReference(
      entity.mainGirderRefId,
      registry.mainGirderIds,
      joinPath(entityPath, "/mainGirderRefId"),
      issues,
    );
  });

  model.deckAnchorages.forEach((entity, index) => {
    const entityPath = joinPath(basePath, `/deckAnchorages/${index}`);
    validateEntityUuidField(
      entity.deckAnchorageId,
      joinPath(entityPath, "/deckAnchorageId"),
      issues,
    );
    validateDesignEntityMetadata(entity, entityPath, "DeckAnchorage", registry, options, issues);
    if (!DECK_ANCHORAGE_ROLES.includes(entity.anchorageRole)) {
      issues.push(
        createValidationIssue({
          code: "BSDD_DECK_ANCHORAGE_ROLE_INVALID",
          severity: "error",
          message: "DeckAnchorage anchorageRole must be a non-composite role.",
          path: joinPath(entityPath, "/anchorageRole"),
        }),
      );
    }
    validateDanglingReference(
      entity.girderRefId,
      registry.mainGirderIds,
      joinPath(entityPath, "/girderRefId"),
      issues,
    );
    validateDanglingReference(
      entity.rcDeckRefId,
      registry.rcDeckIds,
      joinPath(entityPath, "/rcDeckRefId"),
      issues,
    );
  });

  return createValidationResult(issues);
}

function validateGovernedQuantityAt(
  quantity: GovernedQuantity | undefined,
  itemPath: string,
  options: ValidateGovernedQuantityOptions,
): ValidationResult {
  return validateGovernedQuantity(quantity, itemPath, options);
}

function validateAnalysisBinding(
  binding: Partial<BsddAnalysisBinding> | undefined,
  path: string,
): ValidationResult {
  const basePath = path.length > 0 ? path : "";
  const issues: ValidationIssue[] = [];

  if (binding === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BSDD_ANALYSIS_BINDING_MISSING",
        severity: "error",
        message: "Analysis binding is required.",
        path: basePath,
      }),
    ]);
  }

  if (binding.bindingId !== undefined && !isValidUuid(binding.bindingId)) {
    issues.push(
      createValidationIssue({
        code: "BSDD_ANALYSIS_BINDING_ID_INVALID",
        severity: "error",
        message: "bindingId must be a valid UUID.",
        path: joinPath(basePath, "/bindingId"),
      }),
    );
  }

  issues.push(
    ...validateDocumentReference(
      binding.sourceBsdDocumentRef,
      joinPath(basePath, "/sourceBsdDocumentRef"),
    ).issues,
  );

  if (binding.targetBfadDocumentRef !== null && binding.targetBfadDocumentRef !== undefined) {
    issues.push(
      ...validateDocumentReference(
        binding.targetBfadDocumentRef,
        joinPath(basePath, "/targetBfadDocumentRef"),
        "bridge-frame-analysis",
      ).issues,
    );
  }

  if (binding.resultResourceRef !== null && binding.resultResourceRef !== undefined) {
    issues.push(
      ...validateDocumentReference(
        binding.resultResourceRef,
        joinPath(basePath, "/resultResourceRef"),
        "persisted-result",
      ).issues,
    );
  }

  if (binding.exportAuthorityRef !== undefined && binding.exportAuthorityRef !== null) {
    issues.push(
      ...validateDocumentReference(
        binding.exportAuthorityRef,
        joinPath(basePath, "/exportAuthorityRef"),
      ).issues,
    );
  }

  if (binding.if3Metadata !== null && binding.if3Metadata !== undefined) {
    const if3Result = validateRunAnalysisIf3Metadata(binding.if3Metadata);
    if (!if3Result.ok) {
      issues.push(
        createValidationIssue({
          code: "BSDD_ANALYSIS_BINDING_IF3_METADATA_INVALID",
          severity: "error",
          message: if3Result.message,
          path: joinPath(basePath, "/if3Metadata"),
        }),
      );
    }
  }

  return createValidationResult(issues);
}

function validateBridgeSection(
  bridge: Partial<BsddBridge> | undefined,
  path: string,
  quantityOptions: ValidateGovernedQuantityOptions,
): ValidationResult {
  const basePath = path.length > 0 ? path : "";
  const issues: ValidationIssue[] = [];

  if (bridge === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BSDD_BRIDGE_MISSING",
        severity: "error",
        message: "bridge section is required.",
        path: basePath,
      }),
    ]);
  }

  bridge.spans?.forEach((span, index) => {
    const spanPath = joinPath(basePath, `/spans/${index}`);
    issues.push(
      ...validateGovernedQuantityAt(span.length, joinPath(spanPath, "/length"), quantityOptions)
        .issues,
    );
  });

  bridge.girderLines?.forEach((line, index) => {
    const linePath = joinPath(basePath, `/girderLines/${index}`);
    issues.push(
      ...validateGovernedQuantityAt(
        line.offsetFromCenterline,
        joinPath(linePath, "/offsetFromCenterline"),
        quantityOptions,
      ).issues,
    );
  });

  if (bridge.deck !== undefined) {
    const deckPath = joinPath(basePath, "/deck");
    issues.push(
      ...validateGovernedQuantityAt(bridge.deck.width, joinPath(deckPath, "/width"), quantityOptions)
        .issues,
      ...validateGovernedQuantityAt(
        bridge.deck.thickness,
        joinPath(deckPath, "/thickness"),
        quantityOptions,
      ).issues,
      ...validateGovernedQuantityAt(
        bridge.deck.unitWeight,
        joinPath(deckPath, "/unitWeight"),
        quantityOptions,
      ).issues,
    );
  }

  bridge.supports?.forEach((support, index) => {
    issues.push(
      ...validateGovernedQuantityAt(
        support.station,
        joinPath(basePath, `/supports/${index}/station`),
        quantityOptions,
      ).issues,
    );
  });

  return createValidationResult(issues);
}

export function validateBridgeSuperstructureDesignDocument(
  document: Partial<BridgeSuperstructureDesignDocument> | undefined,
  path = "",
  options: ValidateBridgeSuperstructureDesignDocumentOptions = {},
): ValidationResult {
  const basePath = path.length > 0 ? path : "";
  const quantityOptions: ValidateGovernedQuantityOptions = {
    numericAuthorityContext:
      options.numericAuthorityContext ?? {
        targetStandardStatus: TargetStandardStatus.NOT_SELECTED,
      },
  };

  if (document === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BSDD_DOCUMENT_MISSING",
        severity: "error",
        message: "BridgeSuperstructureDesignDocument is required.",
        path: basePath,
      }),
    ]);
  }

  const issues: ValidationIssue[] = [];

  if (document.schemaId !== BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "BSDD_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID}".`,
        path: joinPath(basePath, "/schemaId"),
      }),
    );
  }

  if (document.documentKind !== BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "BSDD_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_KIND}".`,
        path: joinPath(basePath, "/documentKind"),
      }),
    );
  }

  if (document.documentId !== undefined && !isValidUuid(document.documentId)) {
    issues.push(
      createValidationIssue({
        code: "BSDD_DOCUMENT_ID_INVALID",
        severity: "error",
        message: "documentId must be a valid UUID.",
        path: joinPath(basePath, "/documentId"),
      }),
    );
  }

  const coordinateContextResults = (document.coordinateContexts ?? []).map((context, index) =>
    validateCoordinateContext(context, joinPath(basePath, `/coordinateContexts/${index}`)),
  );

  document.materialDefinitions?.forEach((material, index) => {
    const materialPath = joinPath(basePath, `/materialDefinitions/${index}`);
    issues.push(
      ...validateGovernedQuantityAt(
        material.yieldStrength,
        joinPath(materialPath, "/yieldStrength"),
        quantityOptions,
      ).issues,
      ...validateGovernedQuantityAt(
        material.elasticModulus,
        joinPath(materialPath, "/elasticModulus"),
        quantityOptions,
      ).issues,
      ...validateGovernedQuantityAt(
        material.unitWeight,
        joinPath(materialPath, "/unitWeight"),
        quantityOptions,
      ).issues,
    );
  });

  document.loadCases?.forEach((loadCase, caseIndex) => {
    loadCase.loads.forEach((load, loadIndex) => {
      issues.push(
        ...validateGovernedQuantityAt(
          load.magnitude,
          joinPath(
            basePath,
            `/loadCases/${caseIndex}/loads/${loadIndex}/magnitude`,
          ),
          quantityOptions,
        ).issues,
      );
    });
  });

  const bindingResults = (document.analysisBindings ?? []).map((binding, index) =>
    validateAnalysisBinding(binding, joinPath(basePath, `/analysisBindings/${index}`)),
  );

  if (document.phase1ScopeAssertion !== undefined) {
    issues.push(
      ...validateGovernedQuantityAt(
        document.phase1ScopeAssertion.skewAngleDeg,
        joinPath(basePath, "/phase1ScopeAssertion/skewAngleDeg"),
        quantityOptions,
      ).issues,
    );
  }

  const optionalRefResults: ValidationResult[] = [];
  if (document.roadImportProvenance !== undefined && document.roadImportProvenance !== null) {
    optionalRefResults.push(
      validateDocumentReference(
        document.roadImportProvenance,
        joinPath(basePath, "/roadImportProvenance"),
        "road-design",
      ),
    );
  }
  if (document.exportAuthorityRef !== undefined && document.exportAuthorityRef !== null) {
    optionalRefResults.push(
      validateDocumentReference(
        document.exportAuthorityRef,
        joinPath(basePath, "/exportAuthorityRef"),
      ),
    );
  }

  const { entries: entityIdEntries, registry } = buildBsddEntityIdRegistry(document, basePath);
  issues.push(
    ...findDuplicateEntityIds(
      entityIdEntries,
      "BSDD_DUPLICATE_ENTITY_ID",
      "Stable entity IDs must be unique across the document.",
    ),
  );

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(
      BRIDGE_SUPERSTRUCTURE_DESIGN_DOCUMENT_SCHEMA_ID,
      document.schemaVersion,
      basePath,
    ),
    validateContentChecksum(document.contentChecksum, joinPath(basePath, "/contentChecksum")),
    validateProvenance(document.provenance, joinPath(basePath, "/provenance")),
    validateExtensions(document.extensions, joinPath(basePath, "/extensions")),
    validateUnitContext(document.unitContext, joinPath(basePath, "/unitContext"), {
      profile: "generic",
    }),
    validateBridgeSection(document.bridge, joinPath(basePath, "/bridge"), quantityOptions),
    validateStructuralDesignModel(
      document.structuralDesignModel,
      registry,
      joinPath(basePath, "/structuralDesignModel"),
      quantityOptions,
    ),
    ...coordinateContextResults,
    ...bindingResults,
    ...optionalRefResults,
  );
}
