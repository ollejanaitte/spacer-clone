import { describe, expect, it } from "vitest";
import {
  VIEWER_MODEL_MODES,
  layerLabel,
  layerStateForMode,
  modelModeLabel,
  toggleLayer,
  visibleLayerCount,
} from "../mountain-viaduct-500/viewerSwitch";

describe("viewer model/layer switch", () => {
  it("has 5 model modes", () => {
    expect(VIEWER_MODEL_MODES).toEqual([
      "frame",
      "road",
      "bridge",
      "terrain",
      "integrated",
    ]);
  });

  it("model modes map to canonical layer presets", () => {
    expect(layerStateForMode("frame")).toEqual({
      terrain: false,
      road: false,
      superstructure: false,
      substructure: false,
      frame: true,
    });
    expect(layerStateForMode("bridge")).toEqual({
      terrain: false,
      road: false,
      superstructure: true,
      substructure: true,
      frame: false,
    });
    expect(layerStateForMode("integrated").terrain).toBe(true);
    expect(layerStateForMode("integrated").frame).toBe(true);
  });

  it("toggle flips a single layer immutably", () => {
    const base = layerStateForMode("integrated");
    const next = toggleLayer(base, "frame");
    expect(next.frame).toBe(false);
    expect(base.frame).toBe(true); // original unchanged
  });

  it("visible layer count", () => {
    expect(visibleLayerCount(layerStateForMode("terrain"))).toBe(1);
    expect(visibleLayerCount(layerStateForMode("integrated"))).toBe(5);
  });

  it("labels", () => {
    expect(modelModeLabel("integrated")).toBe("統合モデル");
    expect(layerLabel("substructure")).toBe("下部工（橋脚・橋台）");
  });
});
