import type { ContentChecksum } from "./contentChecksum";
import {
  BRIDGE_PROJECT_SCHEMA_ID,
  validateSupportedContractVersion,
} from "./contractVersionRegistry";
import {
  validateDocumentReference,
  validateDocumentReferenceCollection,
  type DocumentReference,
} from "./documentReference";
import type { Extensions } from "./extensions";
import { validateExtensions } from "./extensions";
import type { Provenance } from "./provenance";
import { validateProvenance } from "./provenance";
import {
  validateRevisionMetadata,
  type RevisionId,
  type RevisionMetadata,
} from "./revision";
import { isPositiveRevisionId } from "./revision";
import type { SchemaId, SchemaVersion } from "./schemaIdentity";
import type { UuidString } from "./uuid";
import { isValidUuid } from "./uuid";
import { validateContentChecksum } from "./contentChecksum";
import {
  createValidationIssue,
  createValidationResult,
  mergeValidationResults,
  type ValidationResult,
} from "./validation";

export const BRIDGE_PROJECT_DOCUMENT_KIND = "bridge-project" as const;

export type BridgeProjectValueStatus =
  | "CONFIRMED"
  | "DERIVED"
  | "INFERRED"
  | "MISSING"
  | "DEFERRED"
  | "NOT_AUTHORIZED";

export type BridgeProjectOwner =
  | "ALIGNMENT_OWNER"
  | "SUPERSTRUCTURE_OWNER"
  | "SUBSTRUCTURE_OWNER"
  | "BRIDGE_PROJECT_SHARED";

export type BridgeProjectSectionKey =
  | "project"
  | "alignment"
  | "bridgeGeometry"
  | "superstructure"
  | "substructure"
  | "analysis"
  | "model3D"
  | "metadata";

export interface BridgeProjectValue {
  readonly value: number | string | boolean | null;
  readonly unit?: string;
  readonly status: BridgeProjectValueStatus;
  readonly source?:
    | "ORIGINAL"
    | "USER_INPUT"
    | "GENERATED_BY_TOOL"
    | "RECONSTRUCTED";
  readonly generatedBy?: string;
  readonly updatedAt?: string;
  readonly sourceReference?: string;
  readonly stateReason?: string;
}

export interface BridgeProjectSectionStatus {
  readonly owner: BridgeProjectOwner;
  readonly state: "EMPTY" | "PARTIAL" | "COMPLETE" | "NOT_AUTHORIZED" | "DEFERRED";
  readonly stateReason?: string;
  readonly sourceDocumentRef?: DocumentReference;
}

export interface BridgeProjectReferences {
  readonly roadDesign?: DocumentReference;
  readonly commonModel?: DocumentReference;
  readonly superstructure?: DocumentReference;
  readonly analysis?: readonly DocumentReference[];
  readonly substructure?: DocumentReference;
  readonly model3D?: DocumentReference;
}

export interface BridgeProjectSupport {
  readonly supportId: string;
  readonly supportType?: "abutment" | "pier";
  readonly stationM?: BridgeProjectValue;
  readonly offsetM?: BridgeProjectValue;
  readonly skewRad?: BridgeProjectValue;
  readonly elevationM?: BridgeProjectValue;
  readonly bearingSeats?: readonly {
    readonly seatId: string;
    readonly transverseOffsetM?: BridgeProjectValue;
  }[];
}

export interface BridgeProjectReaction {
  readonly supportId: string;
  readonly caseKind:
    | "permanent"
    | "liveLoad"
    | "braking"
    | "wind"
    | "seismicLevel1"
    | "seismicLevel2";
  readonly status: BridgeProjectValueStatus;
  readonly force?: { readonly x: number; readonly y: number; readonly z: number };
  readonly moment?: { readonly x: number; readonly y: number; readonly z: number };
  readonly sourceReference?: string;
  readonly stateReason?: string;
}

export interface BridgeProjectReconstructionEntry {
  readonly fieldKey: string;
  readonly status: BridgeProjectValueStatus;
  readonly value?: number | string | boolean | null;
  readonly unit?: string;
  readonly derivationRef?: string;
  readonly stateReason?: string;
}

export interface BridgeProjectReconstruction {
  readonly source?: DocumentReference;
  readonly entries?: readonly BridgeProjectReconstructionEntry[];
}

export interface BridgeProject {
  readonly schemaId: SchemaId;
  readonly schemaVersion: SchemaVersion;
  readonly documentId: UuidString;
  readonly documentKind: typeof BRIDGE_PROJECT_DOCUMENT_KIND;
  readonly revisionId: RevisionId;
  readonly contentChecksum: ContentChecksum;
  readonly provenance: Provenance;
  readonly projectId: UuidString;
  readonly name: string;
  readonly projectRevisionMetadata: RevisionMetadata;
  readonly status: {
    readonly phase: "road-alignment" | "superstructure" | "substructure" | "reconciliation" | "closed";
    readonly sections: Record<BridgeProjectSectionKey, BridgeProjectSectionStatus>;
  };
  readonly references: BridgeProjectReferences;
  readonly sharedFacts?: {
    readonly supports?: readonly BridgeProjectSupport[];
    readonly reactions?: readonly BridgeProjectReaction[];
    readonly coordinateSystem?: "x-longitudinal-y-transverse-z-up" | "x-east-y-north-z-up";
    readonly unitSystem?: "si-m-rad-kn" | "si";
  };
  readonly reconstruction?: BridgeProjectReconstruction;
  readonly extensions?: Extensions;
  readonly unknownFieldStoreRef?: DocumentReference;
  readonly migrationProvenanceRef?: DocumentReference;
}

/**
 * BridgeProject is a coordination manifest. It MUST NOT embed full domain
 * payloads (road geometry bodies, superstructure design entities, substructure
 * geometry) — those live in the authoritative per-domain documents referenced by
 * `references`. Only cross-domain handoff facts (support system, reactions) and
 * reconstruction provenance are carried inline.
 */
const FORBIDDEN_EMBEDDED_PAYLOAD_KEYS = [
  "roadDesign",
  "roadDesignDocument",
  "superstructureDocument",
  "substructureDocument",
  "commonModel",
  "commonModelDocument",
  "alignments",
  "alignmentGeometry",
  "bridgeGeometry",
  "spans",
  "girders",
  "structuralModel",
  "materials",
  "sections",
  "loadCases",
  "loadDefinitions",
  "analysisResults",
  "designEntities",
  "model3DPayload",
  "solidGeometry",
] as const;

export function detectForbiddenEmbeddedPayloadKeys(value: unknown): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  const record = value as Record<string, unknown>;
  return FORBIDDEN_EMBEDDED_PAYLOAD_KEYS.filter((key) => key in record);
}

const RECONSTRUCTION_STATUSES: readonly BridgeProjectValueStatus[] = [
  "CONFIRMED",
  "DERIVED",
  "INFERRED",
  "MISSING",
  "DEFERRED",
  "NOT_AUTHORIZED",
];

const REACTION_CASE_KINDS = [
  "permanent",
  "liveLoad",
  "braking",
  "wind",
  "seismicLevel1",
  "seismicLevel2",
] as const;

export function validateBridgeProject(
  project: Partial<BridgeProject> | undefined,
  path = "",
): ValidationResult {
  const basePath = path.length > 0 ? path : "";

  if (project === undefined) {
    return createValidationResult([
      createValidationIssue({
        code: "BRIDGE_PROJECT_MISSING",
        severity: "error",
        message: "BridgeProject is required.",
        path: basePath,
      }),
    ]);
  }

  const issues = [];

  if (project.schemaId !== BRIDGE_PROJECT_SCHEMA_ID) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_PROJECT_SCHEMA_ID_INVALID",
        severity: "error",
        message: `schemaId must be "${BRIDGE_PROJECT_SCHEMA_ID}".`,
        path: `${basePath}/schemaId`,
      }),
    );
  }

  if (project.documentKind !== BRIDGE_PROJECT_DOCUMENT_KIND) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_PROJECT_DOCUMENT_KIND_INVALID",
        severity: "error",
        message: `documentKind must be "${BRIDGE_PROJECT_DOCUMENT_KIND}".`,
        path: `${basePath}/documentKind`,
      }),
    );
  }

  if (typeof project.projectId !== "string" || !isValidUuid(project.projectId)) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_PROJECT_ID_INVALID",
        severity: "error",
        message: "projectId must be a valid UUID.",
        path: `${basePath}/projectId`,
      }),
    );
  }

  if (typeof project.name !== "string" || project.name.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_PROJECT_NAME_INVALID",
        severity: "error",
        message: "name must be a non-empty string.",
        path: `${basePath}/name`,
      }),
    );
  }

  if (!isPositiveRevisionId(project.revisionId)) {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_PROJECT_REVISION_INVALID",
        severity: "error",
        message: "revisionId must be a positive integer.",
        path: `${basePath}/revisionId`,
      }),
    );
  }

  const forbiddenKeys = detectForbiddenEmbeddedPayloadKeys(project);
  forbiddenKeys.forEach((key) => {
    issues.push(
      createValidationIssue({
        code: "BRIDGE_PROJECT_EMBEDDED_PAYLOAD_FORBIDDEN",
        severity: "error",
        message: `Embedded domain payload field "${key}" is prohibited on BridgeProject; use references.`,
        path: `${basePath}/${key}`,
      }),
    );
  });

  if (project.status !== undefined) {
    const sections = project.status.sections;
    if (typeof sections !== "object" || sections === null || Array.isArray(sections)) {
      issues.push(
        createValidationIssue({
          code: "BRIDGE_PROJECT_SECTIONS_INVALID",
          severity: "error",
          message: "status.sections must be a section-key -> status record.",
          path: `${basePath}/status/sections`,
        }),
      );
    } else {
      for (const [key, value] of Object.entries(sections)) {
        if (
          !["project", "alignment", "bridgeGeometry", "superstructure", "substructure",
            "analysis", "model3D", "metadata"].includes(key)
        ) {
          issues.push(
            createValidationIssue({
              code: "BRIDGE_PROJECT_SECTION_KEY_INVALID",
              severity: "error",
              message: `Unknown section key "${key}".`,
              path: `${basePath}/status/sections/${key}`,
            }),
          );
        }
        if (
          typeof value === "object" &&
          value !== null &&
          ![
            "ALIGNMENT_OWNER",
            "SUPERSTRUCTURE_OWNER",
            "SUBSTRUCTURE_OWNER",
            "BRIDGE_PROJECT_SHARED",
          ].includes((value as BridgeProjectSectionStatus).owner)
        ) {
          issues.push(
            createValidationIssue({
              code: "BRIDGE_PROJECT_OWNER_INVALID",
              severity: "error",
              message: `Section "${key}" must declare a valid owner.`,
              path: `${basePath}/status/sections/${key}/owner`,
            }),
          );
        }
      }
    }
  }

  if (project.sharedFacts !== undefined) {
    const supports = project.sharedFacts.supports;
    if (supports !== undefined) {
      const seen = new Set<string>();
      supports.forEach((support, index) => {
        if (typeof support?.supportId === "string" && support.supportId.trim().length > 0) {
          if (seen.has(support.supportId)) {
            issues.push(
              createValidationIssue({
                code: "BRIDGE_PROJECT_SUPPORT_DUPLICATE",
                severity: "error",
                message: `Duplicate supportId "${support.supportId}".`,
                path: `${basePath}/sharedFacts/supports/${index}`,
              }),
            );
          } else {
            seen.add(support.supportId);
          }
        } else {
          issues.push(
            createValidationIssue({
              code: "BRIDGE_PROJECT_SUPPORT_ID_INVALID",
              severity: "error",
              message: "supportId must be a non-empty string.",
              path: `${basePath}/sharedFacts/supports/${index}/supportId`,
            }),
          );
        }
      });
    }

    const reactions = project.sharedFacts.reactions;
    if (reactions !== undefined) {
      reactions.forEach((reaction, index) => {
        if (!REACTION_CASE_KINDS.includes(reaction?.caseKind as (typeof REACTION_CASE_KINDS)[number])) {
          issues.push(
            createValidationIssue({
              code: "BRIDGE_PROJECT_REACTION_CASE_KIND_INVALID",
              severity: "error",
              message: `Unknown reaction caseKind.`,
              path: `${basePath}/sharedFacts/reactions/${index}/caseKind`,
            }),
          );
        }
        if (
          typeof reaction?.status !== "string" ||
          !RECONSTRUCTION_STATUSES.includes(reaction.status)
        ) {
          issues.push(
            createValidationIssue({
              code: "BRIDGE_PROJECT_REACTION_STATUS_INVALID",
              severity: "error",
              message: "Reaction status must be a valid BridgeProject value status.",
              path: `${basePath}/sharedFacts/reactions/${index}/status`,
            }),
          );
        }
      });
    }
  }

  if (project.reconstruction !== undefined && project.reconstruction.entries !== undefined) {
    project.reconstruction.entries.forEach((entry, index) => {
      if (
        typeof entry?.status !== "string" ||
        !RECONSTRUCTION_STATUSES.includes(entry.status)
      ) {
        issues.push(
          createValidationIssue({
            code: "BRIDGE_PROJECT_RECONSTRUCTION_STATUS_INVALID",
            severity: "error",
            message: "Reconstruction entry status must be a valid BridgeProject value status.",
            path: `${basePath}/reconstruction/entries/${index}/status`,
          }),
        );
      }
    });
  }

  return mergeValidationResults(
    createValidationResult(issues),
    validateSupportedContractVersion(
      BRIDGE_PROJECT_SCHEMA_ID,
      project.schemaVersion,
      basePath,
    ),
    validateContentChecksum(project.contentChecksum, `${basePath}/contentChecksum`),
    validateProvenance(project.provenance, `${basePath}/provenance`),
    validateExtensions(project.extensions, `${basePath}/extensions`),
    validateRevisionMetadata(
      project.projectRevisionMetadata,
      `${basePath}/projectRevisionMetadata`,
    ),
    project.references === undefined
      ? createValidationResult([])
      : createValidationResult([
          ...(project.references.roadDesign === undefined
            ? []
            : validateDocumentReference(
                project.references.roadDesign,
                `${basePath}/references/roadDesign`,
                "road-design",
              ).issues),
          ...(project.references.commonModel === undefined
            ? []
            : validateDocumentReference(
                project.references.commonModel,
                `${basePath}/references/commonModel`,
                "common-bridge-data-model",
              ).issues),
          ...(project.references.superstructure === undefined
            ? []
            : validateDocumentReference(
                project.references.superstructure,
                `${basePath}/references/superstructure`,
                "bridge-superstructure-design",
              ).issues),
          ...(project.references.substructure === undefined
            ? []
            : validateDocumentReference(
                project.references.substructure,
                `${basePath}/references/substructure`,
                "bridge-project",
              ).issues),
          ...(project.references.analysis === undefined
            ? []
            : validateDocumentReferenceCollection(
                project.references.analysis,
                `${basePath}/references/analysis`,
                "bridge-frame-analysis",
              ).issues),
        ]),
    project.reconstruction === undefined || project.reconstruction.source === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          project.reconstruction.source,
          `${basePath}/reconstruction/source`,
        ),
    project.unknownFieldStoreRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          project.unknownFieldStoreRef,
          `${basePath}/unknownFieldStoreRef`,
          "unknown-field-store",
        ),
    project.migrationProvenanceRef === undefined
      ? createValidationResult([])
      : validateDocumentReference(
          project.migrationProvenanceRef,
          `${basePath}/migrationProvenanceRef`,
          "migration-record",
        ),
  );
}
