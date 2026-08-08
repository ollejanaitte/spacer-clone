/**
 * 3D geometry payload contract (STEP-3 S3-UX09).
 *
 * TS mirror of the Step2 backend geometry3d payload
 * (backend/rule_engine/geometry3d/model.py) so the UI can consume the same
 * JSON shape for Three.js rendering without any UI-side geometry solver.
 *
 * All coordinates are meters in the global coordinate system; the payload is
 * immutable and JSON-compatible.
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface CenterlinePoint3d extends Point3 {
  station: number;
  heading: number;
  curvature: number;
  elementId: string;
}

export interface EdgePoint3d extends Point3 {
  station: number;
}

export interface Centerline3d {
  points: CenterlinePoint3d[];
  units: "m";
}

export interface Edge3d {
  points: EdgePoint3d[];
  units: "m";
}

export interface CrossSectionPoint3d extends Point3 {
  pointId: string;
  side: string;
  offset: number;
  segmentId: string;
}

export interface CrossSection3d {
  station: number;
  points: CrossSectionPoint3d[];
}

export interface SupportPoint3d extends Point3 {
  nodeId: string;
}

export interface Pier3d {
  pierId: string;
  station: number;
  skewDeg: number;
  supports: SupportPoint3d[];
}

export interface GirderNode3d extends Point3 {
  nodeId: string;
}

export interface Girder3d {
  girderId: string;
  lineSide: string;
  transverseOffset: number;
  nodes: GirderNode3d[];
}

export interface Node3d {
  nodeId: string;
  girderId: string;
  pierId: string;
  station: number;
  x: number;
  y: number;
  z: number;
}

export interface BridgeGeometry3dPayload {
  coordinateSystem: "global";
  units: "m";
  alignmentId: string;
  centerline: Centerline3d | null;
  edges: { left: Edge3d; right: Edge3d } | null;
  sections: CrossSection3d[];
  piers: Pier3d[];
  girders: Girder3d[];
  nodes: Node3d[];
  provenance: Record<string, unknown>;
}
