/**
 * FEM Model assembly (Phase 7-01 C FROZEN / Phase 7-02 WP-E).
 *
 * Builds the complete AnalysisDocument FEM model by combining the
 * superstructure fragment (WP-B), substructure fragment (WP-C) and resolving
 * supports/bearings/springs via the BearingSupportResolver (WP-D).
 *
 * The result is finalized (checksums + validation). Load cases are filled by
 * WP-F; analysisStatus starts NOT_RUN.
 */

import type { GeometrySnapshot } from "../../../apollo/geometry/types";
import type { SubstructureDocument } from "../substructure/substructureTypes";
import type { SuperstructureDocument } from "../superstructure/superstructureTypes";
import {
  createEmptyAnalysisDocument,
  finalizeAnalysisDocument,
  type CreateAnalysisDocumentInput,
} from "./analysisDocument";
import type { AnalysisDocument } from "./analysisDocumentTypes";
import { resolveBearingSupport } from "./bearingSpring";
import { buildSubstructureAnalysisFragment } from "./substructureAdapter";
import { buildSuperstructureAnalysisFragment } from "./superstructureAdapter";

export interface BuildAnalysisModelInput {
  readonly projectId: string;
  readonly createdBy: string;
  readonly superstructure: SuperstructureDocument;
  readonly substructure: SubstructureDocument | null;
  readonly snapshot: GeometrySnapshot;
  readonly sourceReferences: CreateAnalysisDocumentInput["sourceReferences"];
  readonly now?: string;
}

export type BuildAnalysisModelResult =
  | {
      readonly ok: true;
      readonly document: AnalysisDocument;
      readonly issues: readonly { path: string; message: string }[];
    }
  | {
      readonly ok: false;
      readonly document: AnalysisDocument;
      readonly issues: readonly { path: string; message: string }[];
    };

/**
 * Assemble the complete AnalysisDocument FEM model deterministically.
 * Always returns a document (with issues) so callers can surface NOT_AVAILABLE.
 */
export function buildAnalysisModel(input: BuildAnalysisModelInput): BuildAnalysisModelResult {
  const superFragment = buildSuperstructureAnalysisFragment(input.superstructure, input.snapshot);
  const issues: { path: string; message: string }[] = [...superFragment.issues];

  let substructureFragment = null;
  if (input.substructure) {
    substructureFragment = buildSubstructureAnalysisFragment(input.substructure);
    issues.push(...substructureFragment.issues);
  }

  const resolved = resolveBearingSupport({
    nodes: superFragment.nodes,
    superBearings: superFragment.bearings,
    subSupports: substructureFragment?.supports ?? [],
    subBearings: substructureFragment?.bearings ?? [],
    foundationSprings: substructureFragment?.foundationSprings ?? [],
  });
  issues.push(...resolved.issues);

  const base = createEmptyAnalysisDocument({
    projectId: input.projectId,
    createdBy: input.createdBy,
    sourceReferences: input.sourceReferences,
    now: input.now,
  });

  const document = finalizeAnalysisDocument({
    ...base,
    nodes: superFragment.nodes,
    members: superFragment.members,
    sections: superFragment.sections,
    materials: superFragment.materials,
    supports: resolved.supports,
    bearings: resolved.bearings,
    springs: resolved.springs,
    foundationSprings: resolved.foundationSprings,
    // releases / rigidLinks / mpc are contract-only in Phase 7-02 (empty).
    releases: [],
    rigidLinks: [],
    mpc: [],
    analysisStatus: "NOT_RUN",
  });

  return { ok: issues.length === 0, document, issues };
}
