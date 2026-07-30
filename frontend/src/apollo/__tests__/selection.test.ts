import { describe, expect, it } from "vitest";
import {
  createApolloSelectionState,
  filterApolloRefsToVisible,
  isApolloSelectionHomogeneous,
  primaryApolloSelection,
  replaceApolloSelection,
  selectAllVisibleApolloRefs,
  selectApolloRange,
  toggleApolloSelection,
} from "../selection";

describe("apollo selection", () => {
  it("toggles additive selection while preserving order", () => {
    let state = createApolloSelectionState();
    state = toggleApolloSelection(state, { kind: "node", id: "N1" });
    state = toggleApolloSelection(state, { kind: "node", id: "N3" });

    expect(state.orderedRefs).toEqual([
      { kind: "node", id: "N1" },
      { kind: "node", id: "N3" },
    ]);
  });

  it("selects a visible range from anchor to target", () => {
    const visible = [
      { kind: "node" as const, id: "N1" },
      { kind: "node" as const, id: "N2" },
      { kind: "node" as const, id: "N3" },
      { kind: "node" as const, id: "N4" },
    ];
    const state = selectApolloRange(
      replaceApolloSelection({ kind: "node", id: "N2" }),
      { kind: "node", id: "N4" },
      visible,
    );

    expect(state.orderedRefs).toEqual([
      { kind: "node", id: "N2" },
      { kind: "node", id: "N3" },
      { kind: "node", id: "N4" },
    ]);
  });

  it("selects all visible rows in order", () => {
    const state = selectAllVisibleApolloRefs([
      { kind: "member" as const, id: "M1" },
      { kind: "member" as const, id: "M2" },
    ]);
    expect(state.orderedRefs).toHaveLength(2);
    expect(primaryApolloSelection(state.orderedRefs)).toEqual({ kind: "member", id: "M2" });
  });

  it("detects mixed-kind selections", () => {
    expect(
      isApolloSelectionHomogeneous([
        { kind: "node", id: "N1" },
        { kind: "member", id: "M1" },
      ]),
    ).toBe(false);
  });

  it("keeps only refs that are currently visible", () => {
    const selected = [
      { kind: "node" as const, id: "N1" },
      { kind: "node" as const, id: "N2" },
      { kind: "node" as const, id: "N3" },
    ];
    const visible = [
      { kind: "node" as const, id: "N1" },
      { kind: "node" as const, id: "N3" },
    ];

    expect(filterApolloRefsToVisible(selected, visible)).toEqual([
      { kind: "node", id: "N1" },
      { kind: "node", id: "N3" },
    ]);
  });
});
