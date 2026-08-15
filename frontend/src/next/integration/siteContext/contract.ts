import type { ProjectModuleKey } from "../../project/schema";

/**
 * Integration contract shared types for absorbing site-context-prototype into
 * the spacer-clone canonical repository.
 *
 * This module declares the boundary (shared interface) only. It does not wire
 * any runtime path into the frozen module registry, Project Data Core, or the
 * /app shell. See docs/integration/site-context-unification/ for the full
 * contract and the phased absorption plan.
 */

export const SITE_CONTEXT_UNIFICATION_CONTRACT_VERSION = "1.0.0" as const;

export const PDC_METADATA_SLOT = "metadata" as const;

export const PDC_MODULE_SLOTS: readonly ProjectModuleKey[] = [
  "road",
  "terrain",
  "bridgeLayout",
  "superstructure",
  "substructure",
  "analysis",
  "cim",
  "deliverables",
] as const;

/** Every slot a site-context concept may be mapped into within Project Data Core. */
export type PdcTargetSlot = ProjectModuleKey | typeof PDC_METADATA_SLOT;

export const SITE_CONTEXT_SOURCE_CONCEPTS = [
  "coordinateContexts",
  "projectCoordinateContextId",
  "siteContext",
  "selectionArea",
  "sourceDatasets",
  "terrain",
  "elevationResource",
  "existingConditions",
] as const;

export type SiteContextSourceConcept = (typeof SITE_CONTEXT_SOURCE_CONCEPTS)[number];

export interface SiteContextMappingEntry {
  /** site-context ProjectV2 concept being absorbed. */
  readonly sourceConcept: SiteContextSourceConcept;
  /** Project Data Core slot that receives the concept. */
  readonly targetSlot: PdcTargetSlot;
  /** Documented location inside the slot payload (informational path). */
  readonly targetLocation: string;
  /** Whether the concept must exist for a site-context import to be accepted. */
  readonly required: boolean;
  /** Mapping rationale and notes. */
  readonly notes: string;
}

export interface SiteContextUnificationContract {
  readonly contractVersion: string;
  /** Repository that becomes the single canonical source after unification. */
  readonly canonicalRepository: string;
  /** The repository being absorbed. */
  readonly absorbedRepository: string;
  /** Short decision statement. */
  readonly decision: string;
  /** Canonical save/load container after unification. */
  readonly packageFormat: string;
  readonly mapKey: string;
  readonly entries: readonly SiteContextMappingEntry[];
}

export function isPdcTargetSlot(value: string): value is PdcTargetSlot {
  return value === PDC_METADATA_SLOT || (PDC_MODULE_SLOTS as readonly string[]).includes(value);
}

export function isSiteContextSourceConcept(value: string): value is SiteContextSourceConcept {
  return (SITE_CONTEXT_SOURCE_CONCEPTS as readonly string[]).includes(value);
}

/** Minimal structural description of the site-context payload crossing the boundary. */
export interface SiteContextImportEnvelope {
  readonly schemaVersion: string;
  readonly projectName: string;
  readonly coordinateContexts: readonly unknown[];
  readonly projectCoordinateContextId: string;
  readonly siteContext: unknown;
  readonly existingConditions: readonly unknown[];
}
