import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { computeApolloDirtyFingerprint, isApolloProjectDirty } from "../dirtyFingerprint";
import { withApolloPhase1Unit2Draft } from "../unit2Draft";

describe("dirtyFingerprint", () => {
  it("marks a project dirty after editable metadata changes", () => {
    const baseline = createDefaultProject();
    const fingerprint = computeApolloDirtyFingerprint(baseline);
    const edited = withApolloPhase1Unit2Draft(baseline, (draft) => ({
      ...draft,
      metadata: {
        ...draft.metadata,
        name: "Edited bridge name",
      },
    }));
    expect(isApolloProjectDirty(edited, fingerprint)).toBe(true);
  });

  it("clears dirty when the project returns to the saved baseline", () => {
    const baseline = createDefaultProject();
    const fingerprint = computeApolloDirtyFingerprint(baseline);
    const edited = withApolloPhase1Unit2Draft(baseline, (draft) => ({
      ...draft,
      metadata: {
        ...draft.metadata,
        name: "Temporary edit",
      },
    }));
    const restored = withApolloPhase1Unit2Draft(edited, (draft) => ({
      ...draft,
      metadata: {
        ...draft.metadata,
        name: baseline.project.name,
      },
    }));
    expect(isApolloProjectDirty(restored, fingerprint)).toBe(false);
  });
});
