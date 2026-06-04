import { describe, expect, it } from "vitest";
import { getGpuSwitches, resolveGpuMode, resolveGpuModeFromArgs } from "./gpuMode";

describe("GPU mode selection", () => {
  it("uses normal mode by default", () => {
    expect(resolveGpuMode(undefined)).toBe("normal");
  });

  it("falls back to normal for invalid values", () => {
    expect(resolveGpuMode("legacy-but-not-valid")).toBe("normal");
  });

  it("does not make legacy-desktop-gl the default", () => {
    expect(resolveGpuMode(undefined)).not.toBe("legacy-desktop-gl");
  });

  it("returns no switches for normal mode", () => {
    expect(getGpuSwitches("normal")).toEqual([]);
  });

  it("returns ignore-gpu-blocklist for compat-gpu-blocklist", () => {
    expect(getGpuSwitches("compat-gpu-blocklist")).toEqual([{ name: "ignore-gpu-blocklist" }]);
  });

  it("returns ANGLE GL switches for compat-angle-gl", () => {
    expect(getGpuSwitches("compat-angle-gl")).toEqual([
      { name: "ignore-gpu-blocklist" },
      { name: "use-angle", value: "gl" },
    ]);
  });

  it("returns desktop GL switches for legacy-desktop-gl", () => {
    expect(getGpuSwitches("legacy-desktop-gl")).toEqual([
      { name: "ignore-gpu-blocklist" },
      { name: "use-gl", value: "desktop" },
    ]);
  });

  it("can resolve mode from an environment value", () => {
    expect(resolveGpuModeFromArgs(["electron", "main.js"], "compat-angle-gl")).toBe("compat-angle-gl");
  });

  it("can resolve mode from a --gpu-mode argument", () => {
    expect(resolveGpuModeFromArgs(["electron", "main.js", "--gpu-mode=compat-gpu-blocklist"], undefined)).toBe(
      "compat-gpu-blocklist",
    );
  });
});
