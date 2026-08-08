import { describe, expect, it } from "vitest";
import {
  centerlineGeometry,
  edgesGeometry,
  girderGeometry,
  nodePositions,
  pierPositions,
  polylineIndices,
  polylinePositions,
} from "../geometry3d/builders";
import type { BridgeGeometry3dPayload, Girder3d, Pier3d } from "../geometry3d/types";

function payload(): BridgeGeometry3dPayload {
  return {
    coordinateSystem: "global",
    units: "m",
    alignmentId: "road",
    centerline: {
      points: [
        { station: 0, x: 0, y: 0, z: 10, heading: 0, curvature: 0, elementId: "e0" },
        { station: 50, x: 50, y: 0, z: 10, heading: 0, curvature: 0, elementId: "e0" },
      ],
      units: "m",
    },
    edges: {
      left: { points: [{ station: 0, x: 0, y: -3, z: 10 }, { station: 50, x: 50, y: -3, z: 10 }], units: "m" },
      right: { points: [{ station: 0, x: 0, y: 3, z: 10 }, { station: 50, x: 50, y: 3, z: 10 }], units: "m" },
    },
    sections: [],
    piers: [],
    girders: [],
    nodes: [],
    provenance: {},
  };
}

describe("geometry3d builders", () => {
  it("polyline positions", () => {
    const positions = polylinePositions([{ x: 0, y: 1, z: 2 }, { x: 3, y: 4, z: 5 }]);
    expect(Array.from(positions)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("polyline indices", () => {
    expect(Array.from(polylineIndices(3))).toEqual([0, 1, 1, 2]);
    expect(polylineIndices(1).length).toBe(0);
  });

  it("centerline geometry", () => {
    const geo = centerlineGeometry(payload());
    expect(geo?.positions).toHaveLength(6);
    expect(geo?.indices).toHaveLength(2);
  });

  it("edges geometry", () => {
    const edges = edgesGeometry(payload());
    expect(edges.left?.positions[1]).toBe(-3);
    expect(edges.right?.positions[4]).toBe(3);
  });

  it("pier positions", () => {
    const pier: Pier3d = {
      pierId: "K1", station: 0, skewDeg: 90,
      supports: [{ nodeId: "K1-0", x: 0, y: 0, z: 10 }],
    };
    expect(Array.from(pierPositions(pier))).toEqual([0, 0, 10]);
  });

  it("girder geometry", () => {
    const girder: Girder3d = {
      girderId: "G1", lineSide: "center", transverseOffset: 0,
      nodes: [{ nodeId: "G1-K1", x: 0, y: 0, z: 10 }, { nodeId: "G1-K2", x: 50, y: 0, z: 10 }],
    };
    expect(girderGeometry(girder)?.positions).toHaveLength(6);
  });

  it("node positions", () => {
    const positions = nodePositions([{ nodeId: "n", girderId: "G", pierId: "K", station: 0, x: 1, y: 2, z: 3 }]);
    expect(Array.from(positions)).toEqual([1, 2, 3]);
  });
});
