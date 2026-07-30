import { describe, expect, it } from "vitest";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";
import { applyApolloBulkEdit, resolveApolloBulkEditSelection } from "../bulkEdit";
import { filterApolloRefsToVisible } from "../selection";
import { getApolloPhase1Unit2Draft } from "../unit2Draft";

describe("bulkEdit", () => {
  it("rejects mixed-kind selections fail-closed", () => {
    const selection = resolveApolloBulkEditSelection([
      { kind: "node", id: "N-A1" },
      { kind: "member", id: "M-01" },
    ]);
    expect(selection.ok).toBe(false);
    if (!selection.ok) {
      expect(selection.message).toContain("異なる種類");
    }
  });

  it("applies allowed fields atomically to homogeneous selections", () => {
    const draft = getApolloPhase1Unit2Draft(createApollo200mContinuousBridgeSample());
    const result = applyApolloBulkEdit(
      draft,
      [
        { kind: "node", id: "N-A1" },
        { kind: "node", id: "N-P1" },
      ],
      { field: "label", value: "新河川橋" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.affectedCount).toBe(2);
      expect(result.draft.nodes[0]!.label).toBe("新河川橋");
      expect(result.draft.nodes[1]!.label).toBe("新河川橋");
      expect(result.draft.nodes[2]!.label).toBe("P2");
    }
  });

  it("rejects invalid text values without partial apply", () => {
    const draft = getApolloPhase1Unit2Draft(createApollo200mContinuousBridgeSample());
    draft.materialReferences.push({
      ...draft.materialReferences[0]!,
      id: "MAT-BRIDGE-2",
    });
    const result = applyApolloBulkEdit(
      draft,
      [
        { kind: "material", id: "MAT-BRIDGE" },
        { kind: "material", id: "MAT-BRIDGE-2" },
      ],
      { field: "displayName", value: "   " },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("空");
    }
    expect(draft.materialReferences[0]!.displayName).toBe("標準材料参照");
  });

  it("applies bulk edit only to visible selected refs", () => {
    const draft = getApolloPhase1Unit2Draft(createApollo200mContinuousBridgeSample());
    const selected = [
      { kind: "node" as const, id: "N-A1" },
      { kind: "node" as const, id: "N-P1" },
      { kind: "node" as const, id: "N-P2" },
    ];
    const visible = [
      { kind: "node" as const, id: "N-A1" },
      { kind: "node" as const, id: "N-P1" },
    ];
    const visibleSelected = filterApolloRefsToVisible(selected, visible);
    const selection = resolveApolloBulkEditSelection(visibleSelected);

    expect(selection.ok).toBe(true);
    expect(visibleSelected).toHaveLength(2);

    const result = applyApolloBulkEdit(draft, visibleSelected, { field: "label", value: "新河川橋" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.affectedCount).toBe(2);
      expect(result.draft.nodes[0]!.label).toBe("新河川橋");
      expect(result.draft.nodes[1]!.label).toBe("新河川橋");
      expect(result.draft.nodes[2]!.label).toBe("P2");
    }
  });
});
