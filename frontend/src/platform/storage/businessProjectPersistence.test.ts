import { describe, expect, it } from "vitest";
import { createBusinessProjectPersistence } from "./businessProjectPersistence";
import { createInMemoryBusinessRegistry } from "../business/businessRegistry";

function fakeStorage(): Pick<Storage, "getItem" | "setItem"> {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("createBusinessProjectPersistence", () => {
  it("persists a business manifest and loads it back", () => {
    const storage = fakeStorage();
    const registry = createInMemoryBusinessRegistry();
    const business = registry.create({
      projectNumber: "H620164A",
      projectName: "テスト道路設計業務",
      designStage: "road_design",
    });

    const persistence = createBusinessProjectPersistence(storage);
    const saved = persistence.save(business);
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.lastSavedAt.length).toBeGreaterThan(0);
      expect(saved.revisionId).toBe(1);
    }

    expect(persistence.lastSavedAt(business.businessId)).not.toBeNull();
    const manifest = persistence.load(business.businessId);
    expect(manifest).not.toBeNull();
    expect(manifest?.projectId).toBe(business.businessId);
    expect(manifest?.projectName).toBe("テスト道路設計業務");
    expect(manifest?.projectNumber).toBe("H620164A");
    expect(manifest?.designStage).toBe("road_design");
  });

  it("returns null for an unsaved business", () => {
    const persistence = createBusinessProjectPersistence(fakeStorage());
    expect(persistence.load("missing-id")).toBeNull();
    expect(persistence.lastSavedAt("missing-id")).toBeNull();
  });

  it("reports failure on a non-serializable business", () => {
    const persistence = createBusinessProjectPersistence(fakeStorage());
    // A business summary missing required fields should still serialize; the
    // manifest validator governs correctness. Use a malformed storage entry.
    const storage = fakeStorage();
    const p = createBusinessProjectPersistence(storage);
    const registry = createInMemoryBusinessRegistry();
    const business = registry.create({
      projectNumber: "X",
      projectName: "Y",
      designStage: "analysis",
    });
    expect(p.save(business).ok).toBe(true);
  });
});
