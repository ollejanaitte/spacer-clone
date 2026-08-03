/**
 * Step 3-C views: G-05 support/bearing, G-06 girder elevation/section schedule, G-07 member schedule table view.
 */

import type { DrawingSetEntity, DrawingSetLayerId, DrawingSetModel, ViewModel } from "./drawingSetModel";
import type { MemberScheduleModel } from "./memberScheduleModel";

type Layout = DrawingSetModel["layout"];

const LAYERS: readonly DrawingSetLayerId[] = [
  "APOLLO_BORDER",
  "APOLLO_TITLE",
  "APOLLO_DECK",
  "APOLLO_GIRDER",
  "APOLLO_CROSSBEAM",
  "APOLLO_BRACING",
  "APOLLO_STIFFENER",
  "APOLLO_SUPPORT",
  "APOLLO_BEARING",
  "APOLLO_CENTERLINE",
  "APOLLO_STATION",
  "APOLLO_DIMENSION",
  "APOLLO_TEXT",
  "APOLLO_MEMBER_MARK",
  "APOLLO_TABLE",
  "APOLLO_WARNING",
  "APOLLO_OPTIONAL",
];

function boundsOf(entities: readonly DrawingSetEntity[]): ViewModel["bounds"] {
  const coords: number[] = [];
  for (const e of entities) {
    for (const v of Object.values(e.geometry)) {
      if (typeof v === "number") coords.push(v);
      if (Array.isArray(v)) coords.push(...v.filter((n): n is number => typeof n === "number"));
    }
  }
  if (coords.length === 0) return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  return {
    minX: Math.min(...coords) - 0.5,
    minY: Math.min(...coords) - 0.5,
    maxX: Math.max(...coords) + 0.5,
    maxY: Math.max(...coords) + 0.5,
  };
}

export function buildSupportBearingPlanView(layout: Layout): ViewModel {
  const L = layout.bridgeLength;
  const halfW = layout.width / 2;
  const entities: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  const dimensions: DrawingSetEntity[] = [];
  const sourceEntityIds: string[] = [];

  entities.push({
    entityId: "g05-outline",
    sourceEntityId: "rcDeck",
    type: "RECT",
    layerId: "APOLLO_DECK",
    geometry: { x: 0, y: -halfW, w: L, h: layout.width },
  });

  layout.girderCentersY.forEach((gy, gi) => {
    entities.push({
      entityId: `g05-girder-${gi + 1}`,
      sourceEntityId: `G${gi + 1}`,
      type: "LINE",
      layerId: "APOLLO_GIRDER",
      geometry: { x1: 0, y1: gy, x2: L, y2: gy },
    });
  });

  let bearingIndex = 0;
  layout.supportStations.forEach((sx, si) => {
    const sid = `SUP-${si + 1}`;
    sourceEntityIds.push(sid);
    entities.push({
      entityId: `g05-support-line-${si}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_SUPPORT",
      geometry: { x1: sx, y1: -halfW - 0.3, x2: sx, y2: halfW + 0.3 },
    });
    labels.push({
      entityId: `g05-support-label-${si}`,
      sourceEntityId: sid,
      type: "TEXT",
      layerId: "APOLLO_MEMBER_MARK",
      geometry: { x: sx, y: halfW + 0.55, text: sid, height: 0.22 },
    });
    layout.girderCentersY.forEach((gy, gi) => {
      bearingIndex += 1;
      const bid = `BRG-${bearingIndex}`;
      sourceEntityIds.push(bid);
      // generic bearing symbol (small rectangle)
      entities.push({
        entityId: `g05-bearing-${bearingIndex}`,
        sourceEntityId: bid,
        type: "RECT",
        layerId: "APOLLO_BEARING",
        geometry: { x: sx - 0.15, y: gy - 0.15, w: 0.3, h: 0.3 },
        metadata: {
          type: "NOT_SPECIFIED",
          size: "NOT_SPECIFIED",
          fixedMovable: "NOT_SPECIFIED",
          supportId: sid,
          girderId: `G${gi + 1}`,
        },
      });
      labels.push({
        entityId: `g05-bearing-mark-${bearingIndex}`,
        sourceEntityId: bid,
        type: "TEXT",
        layerId: "APOLLO_MEMBER_MARK",
        geometry: { x: sx + 0.35, y: gy, text: bid, height: 0.14 },
      });
    });
  });

  labels.push({
    entityId: "g05-type-note",
    sourceEntityId: "bearing-type",
    type: "TEXT",
    layerId: "APOLLO_WARNING",
    geometry: {
      x: L / 2,
      y: -halfW - 1.0,
      text: "bearing type/size/fixed-movable = NOT_SPECIFIED — generic symbol only; substructure detail NOT drawn",
      height: 0.18,
    },
  });
  labels.push({
    entityId: "g05-count",
    sourceEntityId: "bearing-count",
    type: "TEXT",
    layerId: "APOLLO_TEXT",
    geometry: {
      x: L / 2,
      y: halfW + 1.0,
      text: `bearings=${layout.girderCount * layout.supportStations.length} (= girders × supports)`,
      height: 0.2,
    },
  });
  dimensions.push({
    entityId: "g05-dim-span",
    sourceEntityId: "spanLength",
    type: "DIMENSION",
    layerId: "APOLLO_DIMENSION",
    geometry: { x1: 0, y1: halfW + 1.4, x2: layout.spanLength, y2: halfW + 1.4, text: `L=${layout.spanLength} m` },
  });

  const all = [...entities, ...dimensions, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-support-bearing",
    viewType: "SUPPORT_BEARING_PLAN",
    sourceEntityIds,
    localOrigin: [0, 0],
    viewport: b,
    scale: "FIT",
    layers: LAYERS,
    entities,
    dimensions,
    labels,
    bounds: b,
  };
}

export function buildMainGirderElevationScheduleView(layout: Layout): ViewModel {
  const L = layout.bridgeLength;
  const H = layout.girderDepth;
  const entities: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  const dimensions: DrawingSetEntity[] = [];
  const sourceEntityIds: string[] = ["mainGirder"];

  entities.push({
    entityId: "g06-girder",
    sourceEntityId: "mainGirder",
    type: "RECT",
    layerId: "APOLLO_GIRDER",
    geometry: { x: 0, y: 0, w: L, h: H },
  });

  layout.supportStations.forEach((sx, i) => {
    entities.push({
      entityId: `g06-support-${i}`,
      sourceEntityId: `SUP-${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_SUPPORT",
      geometry: { x1: sx, y1: -0.3, x2: sx, y2: H + 0.2 },
    });
  });
  layout.crossBeamStations.forEach((cx, i) => {
    entities.push({
      entityId: `g06-cb-${i + 1}`,
      sourceEntityId: `C${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_CROSSBEAM",
      geometry: { x1: cx, y1: H * 0.25, x2: cx, y2: H * 0.75 },
    });
  });
  layout.stiffenerStations.forEach((sx, i) => {
    entities.push({
      entityId: `g06-st-${i + 1}`,
      sourceEntityId: `ST-${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_STIFFENER",
      geometry: { x1: sx, y1: 0.05, x2: sx, y2: H - 0.05 },
    });
  });
  layout.swayStations.forEach((sx, i) => {
    entities.push({
      entityId: `g06-sw-${i + 1}`,
      sourceEntityId: `SW-${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_BRACING",
      geometry: { x1: sx, y1: 0.1, x2: sx, y2: H - 0.1 },
      style: { strokeDasharray: "2 2" },
    });
  });

  labels.push(
    {
      entityId: "g06-section-range",
      sourceEntityId: "section-schedule",
      type: "TEXT",
      layerId: "APOLLO_TABLE",
      geometry: {
        x: L / 2,
        y: H + 0.6,
        text: `SECTION SCHEDULE: START=0 END=${L} SECTION=constant input section (no fabricated haunch/variable)`,
        height: 0.18,
      },
    },
    {
      entityId: "g06-splice",
      sourceEntityId: "splice",
      type: "TEXT",
      layerId: "APOLLO_WARNING",
      geometry: { x: L / 2, y: -0.7, text: "SPLICE LOCATIONS NOT PROVIDED", height: 0.18 },
    },
    {
      entityId: "g06-camber",
      sourceEntityId: "camber",
      type: "TEXT",
      layerId: "APOLLO_WARNING",
      geometry: { x: L / 2, y: -1.0, text: "CAMBER NOT PROVIDED", height: 0.18 },
    },
    {
      entityId: "g06-member",
      sourceEntityId: "G*",
      type: "TEXT",
      layerId: "APOLLO_TEXT",
      geometry: {
        x: L / 2,
        y: H + 1.0,
        text: `member IDs G1..G${layout.girderCount} length=${L}m constant depth=${H}m`,
        height: 0.18,
      },
    },
  );

  dimensions.push({
    entityId: "g06-dim-L",
    sourceEntityId: "bridgeLength",
    type: "DIMENSION",
    layerId: "APOLLO_DIMENSION",
    geometry: { x1: 0, y1: H + 1.4, x2: L, y2: H + 1.4, text: `L=${L} m` },
  });

  const all = [...entities, ...dimensions, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-girder-elevation-schedule",
    viewType: "GIRDER_ELEVATION",
    sourceEntityIds,
    localOrigin: [0, 0],
    viewport: b,
    scale: "FIT",
    layers: LAYERS,
    entities,
    dimensions,
    labels,
    bounds: b,
  };
}

export function buildMemberScheduleView(schedule: MemberScheduleModel): ViewModel {
  const entities: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  labels.push({
    entityId: "g07-title",
    sourceEntityId: "memberSchedule",
    type: "TEXT",
    layerId: "APOLLO_TITLE",
    geometry: { x: 0, y: 0, text: "MEMBER SCHEDULE / QUANTITY SUMMARY", height: 0.3 },
  });
  schedule.rows.forEach((row, i) => {
    labels.push({
      entityId: `g07-row-${i}`,
      sourceEntityId: row.memberId,
      type: "TEXT",
      layerId: "APOLLO_TABLE",
      geometry: {
        x: 0,
        y: -0.4 * (i + 1),
        text: `${row.memberId} | ${row.category} | count=${row.count} | vol=${row.volume} | wt=${row.weight} | ${row.notes}`,
        height: 0.16,
      },
    });
  });
  labels.push({
    entityId: "g07-warn",
    sourceEntityId: "warning",
    type: "TEXT",
    layerId: "APOLLO_WARNING",
    geometry: {
      x: 0,
      y: -0.4 * (schedule.rows.length + 2),
      text: "Derived from QuantityModel — NOT FOR DESIGN/FABRICATION/CONSTRUCTION",
      height: 0.18,
    },
  });
  const all = [...entities, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-member-schedule",
    viewType: "MEMBER_SCHEDULE",
    sourceEntityIds: schedule.rows.map((r) => r.sourceEntityId),
    localOrigin: [0, 0],
    viewport: b,
    scale: "FIT",
    layers: LAYERS,
    entities,
    dimensions: [],
    labels,
    bounds: b,
  };
}
