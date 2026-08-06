// 既定プロジェクト（単柱式RC橋脚・矩形フーチング・場所打ち杭・逆T橋台のサンプル）
import type { Project } from "./model";
import { SCHEMA_VERSION, COORDINATE_SYSTEM, UNIT_SYSTEM } from "./model";

export { SCHEMA_VERSION, COORDINATE_SYSTEM, UNIT_SYSTEM };

export function defaultProject(): Project {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId: "lab-0002",
    bridgeId: "bridge-sample-001",
    name: "デモ橋梁 下部工",
    source: "substructure-planning-lab-prototype",
    coordinateSystem: COORDINATE_SYSTEM,
    unitSystem: UNIT_SYSTEM,
    origin: { x: 0, y: 0, z: 0 },
    alignmentRefs: [
      { alignmentId: "aln-001", originStation: 0, totalLength: 45 },
    ],
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        longitudinalAxis: { x: 1, y: 0, z: 0 },
        transverseAxis: { x: 0, y: 1, z: 0 },
        verticalAxis: { x: 0, y: 0, z: 1 },
        skewAngle: 0,
        position: { x: 0, y: 0, z: 0 },
        bearingSeats: [
          {
            seatId: "P1-SEAT-01",
            position: { x: 0.6, y: -3.25, z: 7.6 },
            dimensions: { w: 0.6, d: 0.6, h: 0.15 },
            bearing: { id: "P1-BEARING-01", height: 0.25, type: "elastomeric" },
          },
          {
            seatId: "P1-SEAT-02",
            position: { x: 0.6, y: 3.25, z: 7.6 },
            dimensions: { w: 0.6, d: 0.6, h: 0.15 },
            bearing: { id: "P1-BEARING-02", height: 0.25, type: "elastomeric" },
          },
        ],
        pier: {
          id: "P1",
          formType: "single_column_rect",
          column: { id: "P1-COLUMN-01", width: 2.0, depth: 2.2, height: 6.0 },
          cap: {
            id: "P1-CAP",
            width: 1.6,
            depth: 7.5,
            height: 1.6,
            overhangL: 0,
            overhangR: 0,
          },
          footing: { id: "P1-FOOTING", length: 6.0, width: 8.0, thickness: 1.8, topElevation: 0 },
          piles: {
            id: "P1-PILEGROUP",
            pileType: "bored_pile",
            diameter: 1.2,
            length: 20.0,
            pileCount: 4,
            spacing: { x: 3.0, y: 3.0 },
          },
        },
      },
      {
        supportId: "A1",
        supportType: "abutment",
        longitudinalAxis: { x: 1, y: 0, z: 0 },
        transverseAxis: { x: 0, y: 1, z: 0 },
        verticalAxis: { x: 0, y: 0, z: 1 },
        skewAngle: 0,
        position: { x: 45, y: 0, z: 0 },
        bearingSeats: [],
        abutment: {
          id: "A1",
          formType: "inverted_t",
          backwall: { id: "A1-BACKWALL", height: 5.5, thickness: 0.8, width: 11.0, seatElevation: 8.0 },
          wingWallL: { id: "A1-WING-L", length: 4.0, height: 5.5, thickness: 0.5 },
          wingWallR: { id: "A1-WING-R", length: 4.0, height: 5.5, thickness: 0.5 },
        },
      },
    ],
    metadata: {
      sourceApplication: "substructure-planning-lab",
      sourceVersion: "0.1.0",
      sourceRevision: "prototype-001",
      createdAt: now,
      updatedAt: now,
    },
  };
}