import { describe, expect, it } from "vitest";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";
import { getApolloPhase1Unit2Draft } from "../unit2Draft";
import {
  buildApolloVisibleRefs,
  createApolloSearchFilterState,
  matchesApolloSearchFilter,
} from "../searchFilter";

describe("searchFilter", () => {
  it("matches query with trim, NFKC, and case-insensitive comparison only", () => {
    expect(
      matchesApolloSearchFilter(
        { query: "  g1  ", entityType: "all" },
        "member",
        ["主桁Ｇ１", "bridge-abc"],
      ),
    ).toBe(true);
    expect(
      matchesApolloSearchFilter(
        { query: "a1", entityType: "all" },
        "node",
        ["Ａ１橋台"],
      ),
    ).toBe(true);
    expect(
      matchesApolloSearchFilter(
        { query: "123", entityType: "all" },
        "material",
        ["１２３"],
      ),
    ).toBe(true);
  });

  it("applies exact entity type filtering without mutating source data", () => {
    const sample = createApollo200mContinuousBridgeSample();
    const draft = getApolloPhase1Unit2Draft(sample);
    draft.nodes[0]!.label = "Ａ１橋台";
    draft.members[0]!.label = "主桁Ｇ１";

    const refs = buildApolloVisibleRefs(draft, {
      query: "g1",
      entityType: "member",
    });

    expect(refs).toEqual([{ kind: "member", id: draft.members[0]!.id }]);
    expect(draft.members[0]!.label).toBe("主桁Ｇ１");
  });

  it("returns every entity when the filter is empty", () => {
    const draft = getApolloPhase1Unit2Draft(createApollo200mContinuousBridgeSample());
    const refs = buildApolloVisibleRefs(draft, createApolloSearchFilterState());
    expect(refs).toHaveLength(
      draft.nodes.length + draft.members.length + draft.supports.length + draft.materialReferences.length,
    );
  });
});
