import { describe, expect, it } from "vitest";
import {
  GEOMETRY_SNAPSHOT_VERSION,
  type AlignmentConnector,
  type CoordinateSystem,
  type GeometryEngine,
  type GeometryEngineInput,
  type GeometryInputAdapter,
  type GeometrySnapshot,
  type LocalFrame3,
  type ResolvedValue,
  type Vec3,
} from "./index";

const FRAME: LocalFrame3 = {
  tangent: { x: 1, y: 0, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
  binormal: { x: 0, y: 0, z: 1 },
};

const COORDINATE_SYSTEM: CoordinateSystem = {
  handedness: "right",
  lengthUnit: "m",
  angleUnit: "rad",
  verticalAxis: "z",
  globalOrigin: { x: 0, y: 0, z: 0 },
  axisOrder: ["x", "y", "z"],
  axisDirections: { x: 1, y: 1, z: 1 },
  source: "test",
};

function buildMinimalSnapshot(): GeometrySnapshot {
  return {
    snapshotVersion: GEOMETRY_SNAPSHOT_VERSION,
    bridgeId: "RB-S10-001",
    sourceModelVersion: "1.0.0",
    coordinateSystem: COORDINATE_SYSTEM,
    alignmentReferences: [],
    supportLines: [],
    supportPoints: [],
    girderLines: [],
    gridPoints: [],
    crossSectionFrames: [],
    deckReferences: [],
    bearingPoints: [],
    memberPlacementReferences: [],
    crossGirderReferences: [],
    geometryIssues: [],
    unresolvedGeometry: [],
    traceability: [],
    fingerprint: "fingerprint:test",
  };
}

describe("GeometrySnapshot contract (Phase 6-1A)", () => {
  it("defines the frozen snapshot version", () => {
    expect(GEOMETRY_SNAPSHOT_VERSION).toBe("6.1.0");
  });

  it("has every required collection present", () => {
    const s = buildMinimalSnapshot();
    expect(s.bridgeId).toBe("RB-S10-001");
    expect(s.sourceModelVersion).toBe("1.0.0");
    for (const key of [
      "alignmentReferences",
      "supportLines",
      "supportPoints",
      "girderLines",
      "gridPoints",
      "crossSectionFrames",
      "deckReferences",
      "bearingPoints",
      "memberPlacementReferences",
      "geometryIssues",
      "unresolvedGeometry",
      "traceability",
    ]) {
      expect(Array.isArray(s[key as keyof GeometrySnapshot])).toBe(true);
    }
    expect(typeof s.fingerprint).toBe("string");
  });

  it("records the canonical coordinate system", () => {
    const s = buildMinimalSnapshot();
    expect(s.coordinateSystem.handedness).toBe("right");
    expect(s.coordinateSystem.lengthUnit).toBe("m");
    expect(s.coordinateSystem.angleUnit).toBe("rad");
    expect(s.coordinateSystem.verticalAxis).toBe("z");
    expect(s.coordinateSystem.axisOrder).toEqual(["x", "y", "z"]);
  });

  it("propagates resolution states without silent defaults", () => {
    const confirmed: ResolvedValue<number> = {
      state: "CONFIRMED",
      value: 134.001,
      unit: "m",
      goldenId: "G-GEO-0001",
    };
    const hold: ResolvedValue<number> = {
      state: "HOLD_INSUFFICIENT_SOURCE",
      stateReason: "intermediate panel point not extracted",
    };
    expect(confirmed.state).toBe("CONFIRMED");
    expect(confirmed.value).toBe(134.001);
    expect(hold.state).toBe("HOLD_INSUFFICIENT_SOURCE");
    expect(hold.value).toBeUndefined();
    expect(hold.stateReason).toBeTruthy();
  });

  it("supports conflict with candidates and no selection", () => {
    const conflict: ResolvedValue<number> = {
      state: "CONFLICT",
      conflictId: "CONF-P2II-001",
      candidates: [680, 700],
    };
    expect(conflict.state).toBe("CONFLICT");
    expect(conflict.value).toBeUndefined();
    expect(conflict.candidates).toEqual([680, 700]);
  });

  it("supports HCR propagation", () => {
    const hcr: ResolvedValue<number> = {
      state: "HUMAN_CONFIRMATION_REQUIRED",
      value: 10.0,
      unit: "m",
      humanConfirmationId: "HCR-001",
    };
    expect(hcr.humanConfirmationId).toBe("HCR-001");
  });

  it("is derived and immutable per generation (Object.freeze)", () => {
    const s = buildMinimalSnapshot();
    Object.freeze(s);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it("defines vec3 and local frame in canonical units", () => {
    const p: Vec3 = { x: 0, y: 1.47689, z: 10.2 };
    expect(Number.isFinite(p.x)).toBe(true);
    expect(FRAME.tangent.x).toBe(1);
    expect(FRAME.normal.y).toBe(1);
    expect(FRAME.binormal.z).toBe(1);
  });

  it("defines engine interfaces the engine must satisfy", () => {
    const engine: GeometryEngine = {
      generateSnapshot(input: GeometryEngineInput) {
        return { ...buildMinimalSnapshot(), bridgeId: input.bridgeId };
      },
    };
    const snap = engine.generateSnapshot({
      bridgeId: "RB-S10-001",
      alignmentIds: [],
      supports: [],
      girders: [],
      gridPointIds: [],
      deckIds: [],
      sectionIds: [],
      unresolved: [],
      sourceModelVersion: "1.0.0",
    });
    expect(snap.bridgeId).toBe("RB-S10-001");
  });

  it("defines the AlignmentConnector sample contract", () => {
    const connector: AlignmentConnector = {
      samplePoint(request) {
        return {
          position: { x: request.stationM, y: request.offsetM, z: 0 },
          azimuthRad: 0,
          curvature: 0,
          grade: 0,
          crossfallPercent: 0,
          tangent: { x: 1, y: 0, z: 0 },
          transverse: { x: 0, y: 1, z: 0 },
          vertical: { x: 0, y: 0, z: 1 },
          sourceStation: request.stationM,
          sourceOffset: request.offsetM,
          localFrame: FRAME,
        };
      },
      sampleSection(request) {
        return request.offsetsM.map((o) =>
          this.samplePoint({ alignmentId: request.alignmentId, stationM: request.stationM, offsetM: o }),
        );
      },
    };
    const sample = connector.samplePoint({ alignmentId: "ALN-ACL", stationM: 40.201, offsetM: 0 });
    expect(sample.position.x).toBe(40.201);
    expect(sample.sourceStation).toBe(40.201);
    expect(sample.crossfallPercent).toBe(0);
  });

  it("defines the GeometryInputAdapter contract", () => {
    const adapter: GeometryInputAdapter = {
      adapt() {
        return {
          sourceModelVersion: "1.0.0",
          bridgeId: "RB-S10-001",
          alignmentIds: ["ALN-ACL"],
          supports: [],
          girders: [],
          gridPointIds: [],
          deckIds: [],
          sectionIds: [],
          unresolved: [],
        };
      },
    };
    expect(adapter.adapt({}).alignmentIds).toEqual(["ALN-ACL"]);
  });
});
