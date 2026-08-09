import { describe, expect, it } from "vitest";
import {
  createInMemoryBusinessRegistry,
  createLocalStorageBusinessRegistry,
  isDesignStage,
  parseBusinessList,
  serializeBusinessList,
} from "./businessRegistry";

describe("businessRegistry", () => {
  it("creates a business summary with a stable UUID id", () => {
    const registry = createInMemoryBusinessRegistry();
    const created = registry.create({
      projectNumber: "H620164A",
      projectName: "テスト道路設計業務",
      designStage: "road_design",
    });
    expect(created.businessId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(created.projectNumber).toBe("H620164A");
    expect(created.projectName).toBe("テスト道路設計業務");
    expect(created.designStage).toBe("road_design");
    expect(registry.find(created.businessId)?.businessId).toBe(created.businessId);
  });

  it("lists newest-first by updatedAt", () => {
    let tick = 0;
    const clock = () => new Date(1_000_000 + tick++).toISOString();
    const registry = createInMemoryBusinessRegistry([], clock);
    const a = registry.create({
      projectNumber: "A",
      projectName: "A",
      designStage: "road_design",
    });
    const b = registry.create({
      projectNumber: "B",
      projectName: "B",
      designStage: "superstructure",
    });
    expect(registry.list()[0]!.businessId).toBe(b.businessId);
    expect(registry.list()[1]!.businessId).toBe(a.businessId);
  });

  it("touch updates updatedAt", () => {
    const registry = createInMemoryBusinessRegistry();
    const created = registry.create({
      projectNumber: "N",
      projectName: "Name",
      designStage: "analysis",
    });
    const before = registry.find(created.businessId)!.updatedAt;
    registry.touch(created.businessId);
    expect(registry.find(created.businessId)!.updatedAt >= before).toBe(true);
  });

  it("validates design stages", () => {
    expect(isDesignStage("road_design")).toBe(true);
    expect(isDesignStage("complete")).toBe(true);
    expect(isDesignStage("bogus")).toBe(false);
  });

  it("round-trips serialization", () => {
    const registry = createInMemoryBusinessRegistry();
    const created = registry.create({
      projectNumber: "X",
      projectName: "Y",
      designStage: "substructure",
    });
    const restored = parseBusinessList(serializeBusinessList(registry.list()));
    expect(restored.length).toBe(1);
    expect(restored[0]!.businessId).toBe(created.businessId);
    expect(restored[0]!.designStage).toBe("substructure");
  });

  it("persists across registry instances via localStorage", () => {
    const storage = new Map<string, string>();
    const fakeStorage: Pick<Storage, "getItem" | "setItem"> = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    };
    const a = createLocalStorageBusinessRegistry(fakeStorage);
    const created = a.create({
      projectNumber: "LS",
      projectName: "LocalStorage",
      designStage: "road_design",
    });
    const b = createLocalStorageBusinessRegistry(fakeStorage);
    expect(b.find(created.businessId)?.projectName).toBe("LocalStorage");
  });
});
