/**
 * Sample fixture loader base (MOUNTAIN-SAMPLE P01).
 *
 * The fixture is stored as a normal BuildIntermediateInput (plus bridge
 * stations / spans / piers / terrain / camera / expected). Loading it follows
 * the normal Project State path: the returned draft is a regular editable
 * LinerDraft, not a read-only sample view.
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import type { MountainSampleFixture } from "./schema";

export interface LoadedMountainSample {
  fixture: MountainSampleFixture;
  draft: BuildIntermediateInput;
}

/** Load a fixture into Project State (normal draft). */
export function loadMountainSample(
  fixture: MountainSampleFixture,
): LoadedMountainSample {
  const draft: BuildIntermediateInput = {
    ...fixture.draft,
    spans: [...fixture.spans],
    piers: [...fixture.piers],
  };
  return { fixture, draft };
}

/** Stub for sample registry: returns the mountain sample fixture. */
export function mountainViaduct500Fixture(): MountainSampleFixture {
  throw new Error(
    "mountain-viaduct-500 fixture is assembled in P02-P05 (alignment/vertical/bridge/terrain).",
  );
}
