/**
 * Sample picker hook (MOUNTAIN-SAMPLE P06).
 *
 * Loads a showcase sample fixture into normal Project State as a regular
 * editable LinerDraft (not a read-only sample view). The returned draft flows
 * through the existing pipeline / schematic / 3D path unchanged.
 */
import { useCallback, useMemo, useState } from "react";
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { mountainViaduct500Fixture } from "./loader";
import { loadMountainSample } from "./loader";
import type { MountainSampleFixture } from "./schema";

export interface SamplePickerState {
  loaded: boolean;
  sampleId: string | null;
  draft: BuildIntermediateInput | null;
  fixture: MountainSampleFixture | null;
}

export function useMountainSamplePicker() {
  const [state, setState] = useState<SamplePickerState>({
    loaded: false,
    sampleId: null,
    draft: null,
    fixture: null,
  });

  const loadSample = useCallback((): BuildIntermediateInput => {
    const fixture = mountainViaduct500Fixture();
    const { draft } = loadMountainSample(fixture);
    setState({
      loaded: true,
      sampleId: fixture.metadata.sampleId,
      draft,
      fixture,
    });
    return draft;
  }, []);

  const clearSample = useCallback(() => {
    setState({ loaded: false, sampleId: null, draft: null, fixture: null });
  }, []);

  return useMemo(
    () => ({ ...state, loadSample, clearSample }),
    [state, loadSample, clearSample],
  );
}
