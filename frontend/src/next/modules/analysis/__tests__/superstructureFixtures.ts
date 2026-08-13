/**
 * WP-B test fixtures: a 2-span continuous plate-girder bridge with 2 girders
 * (geometry mirrors the RB-S10-001 grillage shape at a smaller scale).
 */

import type { GeometrySnapshot } from "../../../../apollo/geometry/types";
import type { SuperstructureDocument } from "../../superstructure/superstructureTypes";

export const TEST_SUPERSTRUCTURE_DOCUMENT: SuperstructureDocument = {
  schemaVersion: "0.1.0",
  documentKind: "superstructure-design",
  documentId: "11111111-1111-4111-8111-111111111111",
  projectId: "p-1",
  revisionId: 1,
  status: "VALIDATED",
  provenance: { createdAt: "2026-08-13T00:00:00.000Z", createdBy: "test", producer: "spacer-superstructure-module" },
  timestamps: { updatedAt: "2026-08-13T00:00:00.000Z", derivedAt: null },
  bridgeLayoutReference: { bridgeId: "B-1", moduleId: "bridgeLayout", documentVersion: "1", layoutFingerprint: "f-layout" },
  roadReference: { moduleId: "road", alignmentId: "A-1", stationReferenceId: "SR-1", coordinatePolicyId: null },
  spanReferences: {
    handoffId: "SH-1",
    schemaVersion: "1.0.0",
    generatedAt: "2026-08-13T00:00:00.000Z",
    spans: [
      { spanId: "SPAN-1", index: 1, startSupportId: "A1", endSupportId: "P1", startStation: 0, endStation: 10, spanLength: 10, startSupportSkew: null, endSupportSkew: null },
      { spanId: "SPAN-2", index: 2, startSupportId: "P1", endSupportId: "A2", startStation: 10, endStation: 20, spanLength: 10, startSupportSkew: null, endSupportSkew: null },
    ],
  },
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
  superstructureType: "plate_girder_rc_slab_non_composite",
  structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
  girderConfiguration: {
    girderCount: 2,
    girderSpacingM: 4,
    girderLines: [
      { girderId: "G1", index: 1, label: "G1", offsetFromCenterline: -2, offsetEndFromCenterline: -2, materialRefId: null, sectionIntentRefId: null },
      { girderId: "G2", index: 2, label: "G2", offsetFromCenterline: 2, offsetEndFromCenterline: 2, materialRefId: null, sectionIntentRefId: null },
    ],
    girderSectionModel: {
      depthM: 1.2,
      webThicknessM: 0.02,
      topFlange: { widthM: 0.4, thicknessM: 0.03 },
      bottomFlange: { widthM: 0.4, thicknessM: 0.03 },
      areaM2: null,
      unitWeightPerM: null,
    },
  },
  deckConfiguration: {
    deckId: "DECK-1",
    deckKind: "rc_non_composite",
    thicknessM: 0.23,
    unitWeight: 25,
    overhangLeftM: 0.5,
    overhangRightM: 0.5,
    resolvedWidthM: 8,
  },
  crossBeamConfiguration: {
    crossBeamSpacingM: 10,
    crossBeams: [
      { crossBeamId: "CB-A1", kind: "end", stationM: 0, depthM: 1.0, widthM: 0.3 },
      { crossBeamId: "CB-P1", kind: "support", stationM: 10, depthM: 1.0, widthM: 0.3 },
      { crossBeamId: "CB-A2", kind: "end", stationM: 20, depthM: 1.0, widthM: 0.3 },
    ],
  },
  crossFrameConfiguration: { crossFrameSpacingM: 5, swayBracing: { intervalM: 5 }, lateralBracing: { intervalM: 5 } },
  bearingConfiguration: {
    bearingSupportRelation: [
      { supportId: "A1", girderId: "G1" },
      { supportId: "A1", girderId: "G2" },
      { supportId: "P1", girderId: "G1" },
      { supportId: "P1", girderId: "G2" },
      { supportId: "A2", girderId: "G1" },
      { supportId: "A2", girderId: "G2" },
    ],
    bearingSeats: [
      { seatId: "BRG-A1-G1", supportId: "A1", girderId: "G1", bearingType: "fixed", fixedOrMovable: "FIXED", longitudinalDirection: "+station", transverseDirection: "L" },
      { seatId: "BRG-A1-G2", supportId: "A1", girderId: "G2", bearingType: "fixed", fixedOrMovable: "FIXED", longitudinalDirection: "+station", transverseDirection: "R" },
      { seatId: "BRG-P1-G1", supportId: "P1", girderId: "G1", bearingType: "movable", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "L" },
      { seatId: "BRG-P1-G2", supportId: "P1", girderId: "G2", bearingType: "movable", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "R" },
      { seatId: "BRG-A2-G1", supportId: "A2", girderId: "G1", bearingType: "movable", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "L" },
      { seatId: "BRG-A2-G2", supportId: "A2", girderId: "G2", bearingType: "movable", fixedOrMovable: "MOVABLE", longitudinalDirection: "+station", transverseDirection: "R" },
    ],
  },
  geometryReference: { snapshotFingerprint: "f-snap", snapshotVersion: "6.1.0", generatedAt: null, model3DReference: { solidsDigest: null } },
  loadModel: {
    deadLoads: {
      structuralGirder: { state: "DERIVED", valueKN: 400 },
      structuralSecondary: { state: "MISSING", valueKN: null },
      deck: { state: "DERIVED", valueKN: 920 },
      pavement: { state: "MISSING", valueKN: null },
      appurtenances: { state: "MISSING", valueKN: null },
    },
    liveLoadReference: null,
  },
  analysisModel: { analysisStatus: "NOT_AUTHORIZED", modelReference: { grillageModelDigest: null }, authorization: { numericDesignAuthorization: "NOT_GRANTED", stateReason: "Phase A gate" } },
  designResults: { designStatus: "NOT_AUTHORIZED", checks: [], reactionResultsReference: { reactionDigest: null } },
  reactionResults: { reactionStatus: "NOT_AUTHORIZED", reactionCases: [] },
  validation: { schemaVersion: "0.1.0", validatedAt: null, ok: true, issues: [] },
  extensions: {},
};

export const TEST_GEOMETRY_SNAPSHOT: GeometrySnapshot = {
  snapshotVersion: "6.1.0",
  bridgeId: "B-1",
  sourceModelVersion: "test",
  coordinateSystem: {
    handedness: "right",
    lengthUnit: "m",
    angleUnit: "rad",
    verticalAxis: "z",
    globalOrigin: { x: 0, y: 0, z: 0 },
    axisOrder: ["x", "y", "z"],
    axisDirections: { x: 1, y: 1, z: 1 },
    source: "test",
  },
  alignmentReferences: [{ id: "AL-1", alignmentId: "A-1", bridgeLengthM: { state: "CONFIRMED", value: 20 }, spanLengthsM: { state: "CONFIRMED", value: [10, 10] } }],
  supportLines: [
    { id: "SL-1", supportId: "A1", stationM: { state: "CONFIRMED", value: 0 }, skewRad: { state: "CONFIRMED", value: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, elevationM: { state: "CONFIRMED", value: 0 } },
    { id: "SL-2", supportId: "P1", stationM: { state: "CONFIRMED", value: 10 }, skewRad: { state: "CONFIRMED", value: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, elevationM: { state: "CONFIRMED", value: 0 } },
    { id: "SL-3", supportId: "A2", stationM: { state: "CONFIRMED", value: 20 }, skewRad: { state: "CONFIRMED", value: 0 }, transverseAxis: { x: 0, y: 1, z: 0 }, elevationM: { state: "CONFIRMED", value: 0 } },
  ],
  supportPoints: [
    { id: "SP-1", supportId: "A1", girderId: "G1", stationM: 0, offsetM: -2, position: { x: 0, y: -2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "SP-2", supportId: "A1", girderId: "G2", stationM: 0, offsetM: 2, position: { x: 0, y: 2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "SP-3", supportId: "P1", girderId: "G1", stationM: 10, offsetM: -2, position: { x: 10, y: -2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "SP-4", supportId: "P1", girderId: "G2", stationM: 10, offsetM: 2, position: { x: 10, y: 2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "SP-5", supportId: "A2", girderId: "G1", stationM: 20, offsetM: -2, position: { x: 20, y: -2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "SP-6", supportId: "A2", girderId: "G2", stationM: 20, offsetM: 2, position: { x: 20, y: 2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
  ],
  girderLines: [
    { id: "GL-1", girderId: "G1", offsetM: { state: "CONFIRMED", value: -2 }, stationStartM: 0, stationEndM: 20, points: [
      { id: "GP-1", girderId: "G1", stationM: 0, offsetM: -2, position: { x: 0, y: -2, z: 0 }, azimuthRad: 0, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
      { id: "GP-2", girderId: "G1", stationM: 10, offsetM: -2, position: { x: 10, y: -2, z: 0 }, azimuthRad: 0, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
      { id: "GP-3", girderId: "G1", stationM: 20, offsetM: -2, position: { x: 20, y: -2, z: 0 }, azimuthRad: 0, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    ] },
    { id: "GL-2", girderId: "G2", offsetM: { state: "CONFIRMED", value: 2 }, stationStartM: 0, stationEndM: 20, points: [
      { id: "GP-4", girderId: "G2", stationM: 0, offsetM: 2, position: { x: 0, y: 2, z: 0 }, azimuthRad: 0, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
      { id: "GP-5", girderId: "G2", stationM: 10, offsetM: 2, position: { x: 10, y: 2, z: 0 }, azimuthRad: 0, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
      { id: "GP-6", girderId: "G2", stationM: 20, offsetM: 2, position: { x: 20, y: 2, z: 0 }, azimuthRad: 0, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    ] },
  ],
  gridPoints: [],
  crossSectionFrames: [
    { id: "CSF-1", sectionId: "SEC-1", stationM: 0, position: { x: 0, y: 0, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } }, skewRad: 0, transverseAxis: { x: 0, y: 1, z: 0 }, elevationM: 0 },
  ],
  deckReferences: [],
  bearingPoints: [
    { id: "BP-1", supportId: "A1", girderId: "G1", position: { x: 0, y: -2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "BP-2", supportId: "A1", girderId: "G2", position: { x: 0, y: 2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "BP-3", supportId: "P1", girderId: "G1", position: { x: 10, y: -2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "BP-4", supportId: "P1", girderId: "G2", position: { x: 10, y: 2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "BP-5", supportId: "A2", girderId: "G1", position: { x: 20, y: -2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
    { id: "BP-6", supportId: "A2", girderId: "G2", position: { x: 20, y: 2, z: 0 }, localFrame: { tangent: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, binormal: { x: 0, y: 0, z: 1 } } },
  ],
  memberPlacementReferences: [],
  crossGirderReferences: [
    { id: "CG-1", crossGirderId: "CB-A1", stationM: 0, connectedGirderIds: ["G1", "G2"] },
    { id: "CG-2", crossGirderId: "CB-P1", stationM: 10, connectedGirderIds: ["G1", "G2"] },
    { id: "CG-3", crossGirderId: "CB-A2", stationM: 20, connectedGirderIds: ["G1", "G2"] },
  ],
  geometryIssues: [],
  unresolvedGeometry: [],
  traceability: [],
  fingerprint: "f-snap",
};
