import { describe, expect, it } from "vitest";
import { buildMountainDraft } from "../mountain-viaduct-500/fixture";
import {
  SUPPORT_IDS,
  scenesEqual,
  selectionLabel,
  substructureElementForSelection,
  supportObjectId,
  terrainIdentity,
} from "../mountain-viaduct-500/selection";

describe("mountain 3D selection / save-reload", () => {
  it("has 9 stable support ids", () => {
    expect(SUPPORT_IDS).toEqual(["A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2"]);
  });

  it("maps support selection to substructure element", () => {
    const draft = buildMountainDraft();
    const hit = substructureElementForSelection(draft, { kind: "support", id: "P4" });
    expect(hit?.id).toBe("P4");
    expect(hit?.index).toBeGreaterThanOrEqual(0);
    const miss = substructureElementForSelection(draft, { kind: "girder", id: "G1" });
    expect(miss).toBeNull();
  });

  it("selection label shows entity name", () => {
    expect(selectionLabel({ kind: "support", id: "A1" })).toContain("A1");
    expect(selectionLabel(null)).toBe("選択なし");
    expect(supportObjectId("P3")).toBe("P3");
  });

  it("terrain identity is deterministic", () => {
    const a = terrainIdentity();
    const b = terrainIdentity();
    expect(a.seed).toBe(b.seed);
    expect(a.hash).toBe(b.hash);
  });

  it("save/reload reproduces the same scene", () => {
    const draft = buildMountainDraft();
    const reloaded = structuredClone(draft);
    expect(scenesEqual(draft, reloaded)).toBe(true);
    // editing a radius changes the scene
    const edited = structuredClone(draft);
    const arc = edited.alignment.elements.find((e) => e.type === "arc");
    if (arc && arc.type === "arc") arc.radius += 5;
    expect(scenesEqual(draft, edited)).toBe(false);
  });
});
