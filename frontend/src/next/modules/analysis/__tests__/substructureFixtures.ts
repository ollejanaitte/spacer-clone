/**
 * WP-C test fixtures: a SubstructureDocument for the 2-span bridge.
 */

import type { SubstructureDocument } from "../../substructure/substructureTypes";

export const TEST_SUBSTRUCTURE_DOCUMENT: SubstructureDocument = {
  schemaVersion: "0.1.0",
  documentKind: "substructure-design",
  documentId: "22222222-2222-4222-8222-222222222222",
  projectId: "p-1",
  revisionId: 1,
  status: "VALIDATED",
  provenance: { createdAt: "2026-08-13T00:00:00.000Z", createdBy: "test", producer: "spacer-substructure-module" },
  timestamps: { updatedAt: "2026-08-13T00:00:00.000Z", derivedAt: null },
  bridgeLayoutReference: { bridgeId: "B-1", moduleId: "bridgeLayout", documentVersion: "1", layoutFingerprint: "f-layout" },
  superstructureReference: {
    bridgeId: "B-1",
    moduleId: "superstructure",
    documentVersion: "1",
    superstructureDocumentId: "11111111-1111-4111-8111-111111111111",
    handoffSchemaVersion: "1.0.0",
  },
  roadReference: { moduleId: "road", alignmentId: "A-1", stationReferenceId: "SR-1", coordinatePolicyId: null },
  supportReferences: {
    handoffId: "SUPP-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-13T00:00:00.000Z",
    supports: [
      { supportId: "A1", supportType: "abutment", label: "A1", station: 0, position: { domainX: 0, domainY: 0, elevation: 0 }, tangentAzimuthRad: 0, skewAngleRad: 0, terrainElevation: 0, roadReferenceId: "SR-1", coordinateContextId: null },
      { supportId: "P1", supportType: "pier", label: "P1", station: 10, position: { domainX: 10, domainY: 0, elevation: 0 }, tangentAzimuthRad: 0, skewAngleRad: 0, terrainElevation: 0, roadReferenceId: "SR-1", coordinateContextId: null },
      { supportId: "A2", supportType: "abutment", label: "A2", station: 20, position: { domainX: 20, domainY: 0, elevation: 0 }, tangentAzimuthRad: 0, skewAngleRad: 0, terrainElevation: 0, roadReferenceId: "SR-1", coordinateContextId: null },
    ],
  },
  bearingReactionReferences: {
    handoffId: "SH-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-13T00:00:00.000Z",
    bearingSeats: [
      { seatId: "BRG-A1-G1", supportId: "A1", girderId: "G1", position: { x: 0, y: -2, z: 0 }, elevation: 0, localOffset: { longitudinalM: 0, transverseM: -2 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "fixed", fixedOrMovable: "FIXED", longitudinalDirection: "+station", transverseDirection: "L" },
      { seatId: "BRG-A1-G2", supportId: "A1", girderId: "G2", position: { x: 0, y: 2, z: 0 }, elevation: 0, localOffset: { longitudinalM: 0, transverseM: 2 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "fixed", fixedOrMovable: "FIXED", longitudinalDirection: "+station", transverseDirection: "R" },
      { seatId: "BRG-P1-G1", supportId: "P1", girderId: "G1", position: { x: 10, y: -2, z: 0 }, elevation: 0, localOffset: { longitudinalM: 0, transverseM: -2 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "elastomeric", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "L" },
      { seatId: "BRG-P1-G2", supportId: "P1", girderId: "G2", position: { x: 10, y: 2, z: 0 }, elevation: 0, localOffset: { longitudinalM: 0, transverseM: 2 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "elastomeric", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "R" },
      { seatId: "BRG-A2-G1", supportId: "A2", girderId: "G1", position: { x: 20, y: -2, z: 0 }, elevation: 0, localOffset: { longitudinalM: 0, transverseM: -2 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "elastomeric", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "L" },
      { seatId: "BRG-A2-G2", supportId: "A2", girderId: "G2", position: { x: 20, y: 2, z: 0 }, elevation: 0, localOffset: { longitudinalM: 0, transverseM: 2 }, orientation: { longitudinalAxis: { x: 1, y: 0, z: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, verticalAxis: { x: 0, y: 0, z: 1 } }, bearingType: "elastomeric", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "R" },
    ],
    reactionCases: [],
    girderBottomElevation: { A1: 0, P1: 0, A2: 0 },
    deckElevation: { A1: 0, P1: 0, A2: 0 },
    superstructureEnvelope: null,
    selfWeight: null,
    reactionStatus: "NOT_AUTHORIZED",
    authorizationStatus: "NOT_AUTHORIZED",
  },
  supports: [],
  bearingSeatReferences: [],
  footingConfigurations: [
    { id: "FT-1", length: 6, width: 6, thickness: 1.2, topElevation: -1 },
    { id: "FT-2", length: 6, width: 6, thickness: 1.2, topElevation: -1 },
    { id: "FT-3", length: 6, width: 6, thickness: 1.2, topElevation: -1 },
  ],
  foundationConfigurations: [
    { id: "FD-1", formType: "piled", footingRefId: "FT-1", pileGroupRefId: "PG-1" },
    { id: "FD-2", formType: "piled", footingRefId: "FT-2", pileGroupRefId: "PG-2" },
    { id: "FD-3", formType: "piled", footingRefId: "FT-3", pileGroupRefId: "PG-3" },
  ],
  pileConfigurations: [
    { id: "PG-1", pileType: "bored_pile", diameter: 1.2, length: 15, pileCount: 4, spacing: { x: 2.4, y: 2.4 }, rows: 2, cols: 2, edgeX: null, edgeY: null },
    { id: "PG-2", pileType: "bored_pile", diameter: 1.2, length: 15, pileCount: 4, spacing: { x: 2.4, y: 2.4 }, rows: 2, cols: 2, edgeX: null, edgeY: null },
    { id: "PG-3", pileType: "bored_pile", diameter: 1.2, length: 15, pileCount: 4, spacing: { x: 2.4, y: 2.4 }, rows: 2, cols: 2, edgeX: null, edgeY: null },
  ],
  terrainReferences: { moduleId: "terrain", surfaceReference: null, coordinateContextId: null },
  existingReferences: { moduleId: "existingConditions", documentReferenceId: null },
  geometryReference: { snapshotFingerprint: null, snapshotVersion: null, generatedAt: null, model3DReference: { solidsDigest: null } },
  designInputs: { superstructureReactions: [] },
  designResults: { designStatus: "NOT_AUTHORIZED", checks: [], reactionStatus: "NOT_AUTHORIZED" },
  quantityResults: { quantityStatus: "NOT_AVAILABLE", totalConcreteVolumeM3: null, totalPileLengthM: null, units: "m3" },
  validation: { schemaVersion: "0.1.0", validatedAt: null, ok: true, issues: [] },
  extensions: {},
};
