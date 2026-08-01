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
  readonly spanSystem: "simple";
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
    ...coordinateContextResults,
    ...bindingResults,
    ...optionalRefResults,
  );
}
