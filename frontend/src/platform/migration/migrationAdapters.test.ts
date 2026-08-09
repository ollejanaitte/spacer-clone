import { describe, expect, it } from "vitest";
import {
  adaptBridgeProjectToBusinessRef,
  adaptProjectJsonToBusinessRefs,
  adaptRoadDesignToBusinessRef,
} from "./migrationAdapters";

const checksum = { algorithm: "sha256" as const, hexDigest: "a".repeat(64) };

function validBridge(): any {
  return {
    schemaId: "spacer.contracts.bridge-project",
    schemaVersion: "0.1.0",
    documentKind: "bridge-project",
    documentId: "11111111-1111-4111-8111-111111111111",
    revisionId: 1,
    contentChecksum: checksum,
    name: "Test Bridge",
  };
}

function validRoad(): any {
  return {
    schemaId: "spacer.contracts.road-design-document",
    schemaVersion: "0.1.0",
    documentKind: "road-design",
    documentId: "22222222-2222-4222-8222-222222222222",
    revisionId: 2,
    contentChecksum: checksum,
    name: "Test Road",
  };
}

describe("adaptBridgeProjectToBusinessRef", () => {
  it("produces a verbatim child ref", () => {
    const result = adaptBridgeProjectToBusinessRef(validBridge(), "bridges/b1/manifest.json");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verbatim).toBe(true);
      expect(result.ref.documentKind).toBe("bridge-project");
      expect(result.ref.documentId).toBe("11111111-1111-4111-8111-111111111111");
      expect(result.ref.revisionId).toBe(1);
      expect(result.ref.uri).toBe("bridges/b1/manifest.json");
    }
  });

  it("rejects a bridge with an invalid revision", () => {
    const result = adaptBridgeProjectToBusinessRef(
      { ...validBridge(), revisionId: 0 },
      "bridges/b1/manifest.json",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("revisionId");
    }
  });
});

describe("adaptRoadDesignToBusinessRef", () => {
  it("produces a road-design child ref verbatim", () => {
    const result = adaptRoadDesignToBusinessRef(validRoad(), "roads/r1.road.json");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ref.documentKind).toBe("road-design");
      expect(result.ref.documentId).toBe("22222222-2222-4222-8222-222222222222");
      expect(result.ref.revisionId).toBe(2);
    }
  });
});

describe("adaptProjectJsonToBusinessRefs", () => {
  it("extracts a recognized bridgeProject without fabrication", () => {
    const result = adaptProjectJsonToBusinessRefs({
      raw: { bridgeProject: validBridge() },
      sourceUri: "bridges/b1/manifest.json",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.refs).toHaveLength(1);
      expect(result.notes).toHaveLength(0);
    }
  });

  it("skips an unrecognized bridgeProject with a note (no fabrication)", () => {
    const result = adaptProjectJsonToBusinessRefs({
      raw: { bridgeProject: { documentId: "x" } },
      sourceUri: "bridges/b1/manifest.json",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.refs).toHaveLength(0);
      expect(result.notes.length).toBeGreaterThan(0);
    }
  });

  it("rejects a non-object payload", () => {
    const result = adaptProjectJsonToBusinessRefs({
      raw: "nope",
      sourceUri: "bridges/b1/manifest.json",
    });
    expect(result.ok).toBe(false);
  });
});
