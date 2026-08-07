/**
 * Canonical TypeScript types for the Common Bridge Data Model (CBDM).
 *
 * STEP 10 Phase 5 freeze: these types are the frozen canonical type surface.
 * They are re-exported from (and are z.infer of) the single source of truth,
 * `runtime/schemas/commonBridgeDataModel.ts`, so the canonical JSON Schema and
 * the canonical types stay in semantic parity.
 *
 * The model is bridge-agnostic. Reference Bridge 001 specific values live only
 * in the Reference fixture and mapping registers, never in this contract.
 */

import type {
  AlignmentModelValue,
  AnalysisReferenceModelValue,
  BridgeGeometryModelValue,
  BridgeMetadataValue,
  CandidateValueValue,
  CommonBridgeDataModelValue,
  CommonEntityValue,
  CommonStructuralModelValue,
  ConflictRegistryEntryValue,
  ConflictValueValue,
  DesignReferenceModelValue,
  DrawingItemValue,
  DrawingSheetValue,
  DrawingSpecificationValue,
  HoldRegistryEntryValue,
  HumanConfirmationRegistryEntryValue,
  LoadCaseValue,
  LoadCombinationValue,
  LoadDefinitionValue,
  LoadsModelValue,
  MaterialDefinitionValue,
  MaterialsModelValue,
  ReportItemValue,
  ReportSpecificationValue,
  ResolutionRegistryValue,
  ResolvedValueValue,
  SectionDefinitionValue,
  SectionsModelValue,
  StructuralMemberValue,
  StructuralNodeValue,
  SupportDefinitionValue,
  TraceabilityLinkValue,
  TraceabilityRegistryValue,
} from "./runtime/schemas/commonBridgeDataModel";

export type {
  CommonBridgeDataModelValue,
  BridgeMetadataValue,
  AlignmentModelValue,
  BridgeGeometryModelValue,
  CommonStructuralModelValue,
  StructuralNodeValue,
  StructuralMemberValue,
  SupportDefinitionValue,
  MaterialDefinitionValue,
  SectionDefinitionValue,
  LoadDefinitionValue,
  LoadCaseValue,
  LoadCombinationValue,
  AnalysisReferenceModelValue,
  DesignReferenceModelValue,
  ReportSpecificationValue,
  ReportItemValue,
  DrawingSpecificationValue,
  DrawingSheetValue,
  DrawingItemValue,
  TraceabilityRegistryValue,
  TraceabilityLinkValue,
  ResolutionRegistryValue,
  ConflictRegistryEntryValue,
  HumanConfirmationRegistryEntryValue,
  HoldRegistryEntryValue,
  CandidateValueValue,
} from "./runtime/schemas/commonBridgeDataModel";

/** Root Common Bridge Data Model document. */
export type CommonBridgeModel = CommonBridgeDataModelValue;

/** Bridge document metadata. */
export type BridgeMetadata = BridgeMetadataValue;

/** Alignment / geometry input layer. */
export type AlignmentModel = AlignmentModelValue;

/** Bridge geometry layer. */
export type BridgeGeometryModel = BridgeGeometryModelValue;

/** Structural model layer (nodes + members). */
export type StructuralModel = CommonStructuralModelValue;

/** A structural node entity. */
export type StructuralNode = StructuralNodeValue;

/** A structural member entity. */
export type StructuralMember = StructuralMemberValue;

/** A support / pier / abutment definition entity. */
export type SupportDefinition = SupportDefinitionValue;

/** A material definition entity. */
export type MaterialDefinition = MaterialDefinitionValue;

/** A section definition entity. */
export type SectionDefinition = SectionDefinitionValue;

/** Load definition entity (load case or load combination). */
export type LoadDefinition = LoadDefinitionValue;

/** A load case entity. */
export type LoadCase = LoadCaseValue;

/** A load combination entity. */
export type LoadCombination = LoadCombinationValue;

/** Analysis reference slot (may be NOT_AVAILABLE). */
export type AnalysisReferenceModel = AnalysisReferenceModelValue;

/** Design reference layer. */
export type DesignReferenceModel = DesignReferenceModelValue;

/** Report specification layer. */
export type ReportSpecification = ReportSpecificationValue;

/** Drawing specification layer. */
export type DrawingSpecification = DrawingSpecificationValue;

/** Traceability registry. */
export type TraceabilityRegistry = TraceabilityRegistryValue;

/** Resolution registry (conflicts / HCR / holds). */
export type ResolutionRegistry = ResolutionRegistryValue;

/**
 * Generic resolved-value record. The concrete state-discriminated union is
 * `ResolvedValueValue`; this generic alias documents the shape `value + state
 * + unit + sourceRefs + authority`, used uniformly across CBDM entities.
 */
export type ResolvedValue<T = unknown> = {
  readonly state: ResolvedValueValue["state"];
  readonly value?: T;
  readonly unit?: string;
  readonly sourceUnit?: string;
  readonly sourceRefs?: readonly string[];
  readonly goldenId?: string;
  readonly precision?: number;
  readonly authority?: string;
  readonly humanConfirmationId?: string;
  readonly conflictId?: string;
  readonly stateReason?: string;
};

/** Generic conflict value alias over `ConflictValueValue`. */
export type ConflictValue<T = unknown> = {
  readonly state: "CONFLICT";
  readonly conflictId: string;
  readonly candidates: readonly { readonly value: T; readonly unit?: string }[];
  readonly selected: { readonly value: T; readonly unit?: string } | null;
  readonly resolutionStatus: "UNRESOLVED" | "RESOLVED" | "RESOLVED_WITH_DEVIATION";
};

/** Base entity shape (id + optional displayName + resolved fields). */
export type CommonEntity = CommonEntityValue;

/** Materials layer. */
export type MaterialsModel = MaterialsModelValue;

/** Sections layer. */
export type SectionsModel = SectionsModelValue;

/** Loads layer. */
export type LoadsModel = LoadsModelValue;

/** A candidate value with sources. */
export type CandidateValue = CandidateValueValue;
