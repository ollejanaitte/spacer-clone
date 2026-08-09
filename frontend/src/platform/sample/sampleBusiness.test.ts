import { describe, expect, it } from "vitest";
import { createInMemoryBusinessRegistry } from "../business/businessRegistry";
import { parseUuid } from "../../contracts/uuid";

function requireUuid(value: string) {
  const parsed = parseUuid(value);
  if (parsed === undefined) throw new Error("invalid uuid");
  return parsed;
}
import { createBusinessProjectPersistence } from "../storage/businessProjectPersistence";
import {
  SAMPLE_BUSINESS_NAME,
  SAMPLE_BUSINESS_NUMBER,
  createSampleBusiness,
  isSampleBusiness,
} from "./sampleBusiness";

function fakeStorage(): Pick<Storage, "getItem" | "setItem"> {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("createSampleBusiness", () => {
  it("clones the sample template into a new business", () => {
    const registry = createInMemoryBusinessRegistry();
    const persistence = createBusinessProjectPersistence(fakeStorage());
    const business = createSampleBusiness(registry, persistence);

    expect(business.projectName).toBe(SAMPLE_BUSINESS_NAME);
    expect(business.projectNumber).toBe(SAMPLE_BUSINESS_NUMBER);
    expect(isSampleBusiness(business)).toBe(true);
    expect(registry.find(business.businessId)?.projectName).toBe(SAMPLE_BUSINESS_NAME);
  });

  it("each create produces a distinct business id (no overwrite)", () => {
    const registry = createInMemoryBusinessRegistry();
    const persistence = createBusinessProjectPersistence(fakeStorage());
    const a = createSampleBusiness(registry, persistence);
    const b = createSampleBusiness(registry, persistence);
    expect(a.businessId).not.toBe(b.businessId);
    expect(registry.list()).toHaveLength(2);
  });

  it("persists the sample manifest for save/load", () => {
    const storage = fakeStorage();
    const registry = createInMemoryBusinessRegistry();
    const persistence = createBusinessProjectPersistence(storage);
    const business = createSampleBusiness(registry, persistence);

    const manifest = persistence.load(business.businessId);
    expect(manifest).not.toBeNull();
    expect(manifest?.projectName).toBe(SAMPLE_BUSINESS_NAME);
    expect(manifest?.roadRefs.length).toBeGreaterThan(0);
    expect(manifest?.bridgeProjectRefs.length).toBeGreaterThan(0);
    expect(manifest?.analysisRefs.length).toBeGreaterThan(0);
  });
});

describe("isSampleBusiness", () => {
  it("recognizes the sample by project number", () => {
    expect(
      isSampleBusiness({
        businessId: requireUuid("11111111-1111-4111-8111-111111111111"),
        projectNumber: SAMPLE_BUSINESS_NUMBER,
        projectName: SAMPLE_BUSINESS_NAME,
        designStage: "road_design",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isSampleBusiness({
        businessId: requireUuid("11111111-1111-4111-8111-111111111111"),
        projectNumber: "REAL-001",
        projectName: "実業務",
        designStage: "road_design",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
