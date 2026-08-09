import { describe, expect, it } from "vitest";
import {
  detectPlatformKind,
  evaluateStorageAvailability,
  isJapaneseSafePath,
  isWindowsLikePath,
  normalizeRelativeRefUri,
  probeRefCompatibility,
} from "./compatibility";

describe("normalizeRelativeRefUri", () => {
  it("normalizes backslashes to POSIX separators", () => {
    expect(normalizeRelativeRefUri("roads\\r1.road.json")).toBe("roads/r1.road.json");
  });

  it("rejects absolute paths", () => {
    expect(normalizeRelativeRefUri("/etc/passwd")).toBeNull();
  });

  it("rejects drive letters", () => {
    expect(normalizeRelativeRefUri("C:\\projects\\x.json")).toBeNull();
  });

  it("rejects traversal", () => {
    expect(normalizeRelativeRefUri("../secret.json")).toBeNull();
    expect(normalizeRelativeRefUri("roads/../../etc/passwd")).toBeNull();
  });

  it("accepts relative paths with Japanese segments", () => {
    expect(normalizeRelativeRefUri("道路/設計/道路線形.road.json")).toBe(
      "道路/設計/道路線形.road.json",
    );
  });
});

describe("isJapaneseSafePath", () => {
  it("accepts Japanese characters", () => {
    expect(isJapaneseSafePath("道路/橋梁.json")).toBe(true);
  });

  it("rejects control characters", () => {
    expect(isJapaneseSafePath("a\u0000b.json")).toBe(false);
  });
});

describe("detectPlatformKind", () => {
  it("detects Electron from user agent", () => {
    expect(
      detectPlatformKind({ navigator: { userAgent: "Mozilla/5.0 Electron/28.0.0" } }),
    ).toBe("electron-native");
  });

  it("defaults to browser", () => {
    expect(detectPlatformKind({ navigator: { userAgent: "Mozilla/5.0 Chrome/120" } })).toBe(
      "browser",
    );
  });
});

describe("probeRefCompatibility", () => {
  it("probes a compatible relative ref", () => {
    const probe = probeRefCompatibility("bridges/b1/manifest.json", "electron-native");
    expect(probe.normalizedUri).toBe("bridges/b1/manifest.json");
    expect(probe.japaneseSafe).toBe(true);
    expect(probe.platform).toBe("electron-native");
  });

  it("probes a rejected path", () => {
    const probe = probeRefCompatibility("/etc/passwd", "browser");
    expect(probe.normalizedUri).toBeNull();
    expect(probe.reason).toContain("Rejected");
  });
});

describe("evaluateStorageAvailability", () => {
  it("Electron supports native folder read/write", () => {
    const availability = evaluateStorageAvailability("electron-native");
    expect(availability.nativeFolderWrite).toBe(true);
    expect(availability.nativeFolderRead).toBe(true);
  });

  it("browser falls back to download / in-memory", () => {
    const availability = evaluateStorageAvailability("browser");
    expect(availability.nativeFolderWrite).toBe(false);
    expect(availability.downloadFallback).toBe(true);
    expect(availability.inMemoryFallback).toBe(true);
  });
});

describe("isWindowsLikePath", () => {
  it("detects Windows-style paths", () => {
    expect(isWindowsLikePath("C:\\projects\\x.json")).toBe(true);
    expect(isWindowsLikePath("roads/r1.json")).toBe(false);
  });
});
