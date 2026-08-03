/**
 * Step 3-B member arrangement views (G-02 / G-03 / G-04).
 * SCHEMATIC / APPROXIMATE where member sections are undefined.
 * NOT A FABRICATION DRAWING — NOT FOR CONSTRUCTION
 */

import type { DrawingSetEntity, DrawingSetModel, DrawingSetLayerId, ViewModel } from "./drawingSetModel";

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

/** G-02 FLOOR_SYSTEM_PLAN — main girder / cross beam arrangement */
export function buildGirderCrossBeamArrangementView(layout: Layout): ViewModel {
  const L = layout.bridgeLength;
  const halfW = layout.width / 2;
  const entities: DrawingSetEntity[] = [];
  const dimensions: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  const sourceEntityIds: string[] = ["deck-outline"];

  entities.push({
    entityId: "g02-outline",
    sourceEntityId: "rcDeck",
    type: "RECT",
    layerId: "APOLLO_DECK",
    geometry: { x: 0, y: -halfW, w: L, h: layout.width },
  });

  layout.supportStations.forEach((sx, i) => {
    const sid = `SUP-${i + 1}`;
    sourceEntityIds.push(sid);
    entities.push({
      entityId: `g02-support-${i}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_SUPPORT",
      geometry: { x1: sx, y1: -halfW - 0.2, x2: sx, y2: halfW + 0.2 },
    });
  });

  layout.girderCentersY.forEach((gy, i) => {
    const gid = `G${i + 1}`;
    sourceEntityIds.push(gid);
    entities.push({
      entityId: `g02-girder-${i + 1}`,
      sourceEntityId: gid,
      type: "LINE",
      layerId: "APOLLO_GIRDER",
      geometry: { x1: 0, y1: gy, x2: L, y2: gy },
    });
    labels.push({
      entityId: `g02-girder-mark-${i + 1}`,
      sourceEntityId: gid,
      type: "TEXT",
      layerId: "APOLLO_MEMBER_MARK",
      geometry: { x: -0.7, y: gy, text: gid, height: 0.28 },
    });
  });

  layout.crossBeamStations.forEach((cx, i) => {
    const cid = `C${i + 1}`;
    sourceEntityIds.push(cid);
    entities.push({
      entityId: `g02-cb-${i + 1}`,
      sourceEntityId: cid,
      type: "LINE",
      layerId: "APOLLO_CROSSBEAM",
      geometry: {
        x1: cx,
        y1: layout.girderCentersY[0] ?? -halfW,
        x2: cx,
        y2: layout.girderCentersY[layout.girderCentersY.length - 1] ?? halfW,
      },
    });
    labels.push({
      entityId: `g02-cb-mark-${i + 1}`,
      sourceEntityId: cid,
      type: "TEXT",
      layerId: "APOLLO_MEMBER_MARK",
      geometry: { x: cx, y: -halfW - 0.5, text: cid, height: 0.2 },
    });
    labels.push({
      entityId: `g02-cb-station-${i + 1}`,
      sourceEntityId: cid,
      type: "TEXT",
      layerId: "APOLLO_STATION",
      geometry: { x: cx, y: halfW + 0.45, text: `sta=${cx}`, height: 0.16 },
    });
  });

  labels.push({
    entityId: "g02-cb-section-note",
    sourceEntityId: "crossBeamSection",
    type: "TEXT",
    layerId: "APOLLO_WARNING",
    geometry: {
      x: L / 2,
      y: -halfW - 1.2,
      text: "CROSS BEAM SECTION NOT DEFINED — arrangement lines / member marks only (SCHEMATIC)",
      height: 0.2,
    },
  });
  labels.push({
    entityId: "g02-count",
    sourceEntityId: "counts",
    type: "TEXT",
    layerId: "APOLLO_TEXT",
    geometry: {
      x: L / 2,
      y: halfW + 1.0,
      text: `girders=${layout.girderCount} crossBeams=${layout.crossBeamStations.length} spacing=${layout.girderSpacing}m`,
      height: 0.2,
    },
  });

  dimensions.push(
    {
      entityId: "g02-dim-spacing",
      sourceEntityId: "girderSpacing",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: L + 0.5,
        y1: layout.girderCentersY[0] ?? 0,
        x2: L + 0.5,
        y2: layout.girderCentersY[Math.min(1, layout.girderCentersY.length - 1)] ?? 0,
        text: `s=${layout.girderSpacing} m`,
      },
    },
  );
  if (layout.crossBeamStations.length >= 2) {
    dimensions.push({
      entityId: "g02-dim-cb",
      sourceEntityId: "crossBeamSpacing",
      type: "DIMENSION",
      layerId: "APOLLO_DIMENSION",
      geometry: {
        x1: layout.crossBeamStations[0]!,
        y1: -halfW - 1.6,
        x2: layout.crossBeamStations[1]!,
        y2: -halfW - 1.6,
        text: `cb=${layout.crossBeamStations[1]! - layout.crossBeamStations[0]!} m`,
      },
    });
  }

  const all = [...entities, ...dimensions, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-girder-crossbeam",
    viewType: "FLOOR_SYSTEM_PLAN",
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

/** G-03 BRACING_LAYOUT — sway / upper / lower lateral */
export function buildBracingArrangementView(layout: Layout): ViewModel {
  const L = layout.bridgeLength;
  const halfW = layout.width / 2;
  const entities: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  const dimensions: DrawingSetEntity[] = [];
  const sourceEntityIds: string[] = [];

  layout.girderCentersY.forEach((gy, i) => {
    entities.push({
      entityId: `g03-girder-${i + 1}`,
      sourceEntityId: `G${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_GIRDER",
      geometry: { x1: 0, y1: gy, x2: L, y2: gy },
    });
  });

  layout.crossBeamStations.forEach((cx, i) => {
    entities.push({
      entityId: `g03-cb-${i + 1}`,
      sourceEntityId: `C${i + 1}`,
      type: "LINE",
      layerId: "APOLLO_CROSSBEAM",
      geometry: {
        x1: cx,
        y1: layout.girderCentersY[0] ?? -halfW,
        x2: cx,
        y2: layout.girderCentersY[layout.girderCentersY.length - 1] ?? halfW,
      },
    });
  });

  const yTop = layout.girderCentersY[0] ?? -halfW;
  const yBot = layout.girderCentersY[layout.girderCentersY.length - 1] ?? halfW;
  layout.swayStations.forEach((sx, i) => {
    const bayId = `BAY-SW-${i + 1}`;
    const sid = `SW-${i + 1}`;
    sourceEntityIds.push(sid, bayId);
    // V-type schematic between outer girders
    const midY = (yTop + yBot) / 2;
    entities.push({
      entityId: `g03-sway-v1-${i + 1}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_BRACING",
      geometry: { x1: sx - 0.4, y1: yTop, x2: sx, y2: midY },
      metadata: { schematic: true, approximate: true, bayId },
    });
    entities.push({
      entityId: `g03-sway-v2-${i + 1}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_BRACING",
      geometry: { x1: sx + 0.4, y1: yTop, x2: sx, y2: midY },
      metadata: { schematic: true, approximate: true, bayId },
    });
    entities.push({
      entityId: `g03-sway-v3-${i + 1}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_BRACING",
      geometry: { x1: sx - 0.4, y1: yBot, x2: sx, y2: midY },
      metadata: { schematic: true, approximate: true, bayId },
    });
    entities.push({
      entityId: `g03-sway-v4-${i + 1}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_BRACING",
      geometry: { x1: sx + 0.4, y1: yBot, x2: sx, y2: midY },
      metadata: { schematic: true, approximate: true, bayId },
    });
    labels.push({
      entityId: `g03-sway-mark-${i + 1}`,
      sourceEntityId: sid,
      type: "TEXT",
      layerId: "APOLLO_MEMBER_MARK",
      geometry: { x: sx, y: yBot + 0.5, text: `${sid}/${bayId}`, height: 0.18 },
    });
  });

  // Upper / lower lateral status — centerline schematic when enabled
  if (layout.upperLateralBracingEnabled && layout.girderCentersY.length >= 2) {
    for (let i = 0; i < layout.girderCentersY.length - 1; i += 1) {
      const y1 = layout.girderCentersY[i]!;
      const y2 = layout.girderCentersY[i + 1]!;
      entities.push({
        entityId: `g03-upper-lat-${i + 1}`,
        sourceEntityId: `UL-${i + 1}`,
        type: "LINE",
        layerId: "APOLLO_BRACING",
        geometry: { x1: 0, y1: (y1 + y2) / 2 + 0.15, x2: L, y2: (y1 + y2) / 2 + 0.15 },
        style: { strokeDasharray: "3 2" },
        metadata: { schematic: true, kind: "UPPER_LATERAL" },
      });
      sourceEntityIds.push(`UL-${i + 1}`);
    }
  }
  if (layout.lowerLateralBracingEnabled && layout.girderCentersY.length >= 2) {
    for (let i = 0; i < layout.girderCentersY.length - 1; i += 1) {
      const y1 = layout.girderCentersY[i]!;
      const y2 = layout.girderCentersY[i + 1]!;
      entities.push({
        entityId: `g03-lower-lat-${i + 1}`,
        sourceEntityId: `LL-${i + 1}`,
        type: "LINE",
        layerId: "APOLLO_BRACING",
        geometry: { x1: 0, y1: (y1 + y2) / 2 - 0.15, x2: L, y2: (y1 + y2) / 2 - 0.15 },
        style: { strokeDasharray: "1 2" },
        metadata: { schematic: true, kind: "LOWER_LATERAL" },
      });
      sourceEntityIds.push(`LL-${i + 1}`);
    }
  }

  labels.push({
    entityId: "g03-status",
    sourceEntityId: "bracing-status",
    type: "TEXT",
    layerId: "APOLLO_TEXT",
    geometry: {
      x: L / 2,
      y: -halfW - 0.9,
      text: `swayStations=${layout.swayStations.length} | upperLateral=${layout.upperLateralBracingEnabled ? "ENABLED" : "DISABLED"} | lowerLateral=${layout.lowerLateralBracingEnabled ? "ENABLED" : "DISABLED"}`,
      height: 0.2,
    },
  });
  labels.push({
    entityId: "g03-schematic-warn",
    sourceEntityId: "bracing-section",
    type: "TEXT",
    layerId: "APOLLO_WARNING",
    geometry: {
      x: L / 2,
      y: halfW + 0.9,
      text: "BRACING SECTION NOT DEFINED — centerline SCHEMATIC only; 3D visualization assumptions NOT used as design dimensions",
      height: 0.18,
    },
  });

  const all = [...entities, ...dimensions, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-bracing-layout",
    viewType: "BRACING_LAYOUT",
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

/** G-04 STIFFENER_LAYOUT — girder side elevation stations */
export function buildStiffenerArrangementView(layout: Layout): ViewModel {
  const L = layout.bridgeLength;
  const H = layout.girderDepth;
  const entities: DrawingSetEntity[] = [];
  const labels: DrawingSetEntity[] = [];
  const dimensions: DrawingSetEntity[] = [];
  const sourceEntityIds: string[] = ["girder-elevation"];

  entities.push({
    entityId: "g04-girder",
    sourceEntityId: "mainGirder",
    type: "RECT",
    layerId: "APOLLO_GIRDER",
    geometry: { x: 0, y: 0, w: L, h: H },
  });

  layout.supportStations.forEach((sx, i) => {
    const sid = `SUP-${i + 1}`;
    sourceEntityIds.push(sid);
    entities.push({
      entityId: `g04-support-${i}`,
      sourceEntityId: sid,
      type: "LINE",
      layerId: "APOLLO_SUPPORT",
      geometry: { x1: sx, y1: -0.3, x2: sx, y2: H + 0.2 },
    });
    labels.push({
      entityId: `g04-support-note-${i}`,
      sourceEntityId: sid,
      type: "TEXT",
      layerId: "APOLLO_TEXT",
      geometry: {
        x: sx,
        y: -0.55,
        text: `${sid} support stiffener: NOT_DEFINED (not auto-added)`,
        height: 0.14,
      },
    });
  });

  if (layout.stiffenerStations.length === 0) {
    labels.push({
      entityId: "g04-no-stiff",
      sourceEntityId: "stiffener",
      type: "TEXT",
      layerId: "APOLLO_WARNING",
      geometry: { x: L / 2, y: H / 2, text: "STIFFENER SPACING NOT_PROVIDED", height: 0.25 },
    });
  } else {
    layout.stiffenerStations.forEach((sx, i) => {
      const mid = `ST-${i + 1}`;
      sourceEntityIds.push(mid);
      entities.push({
        entityId: `g04-stiff-${i + 1}`,
        sourceEntityId: mid,
        type: "LINE",
        layerId: "APOLLO_STIFFENER",
        geometry: { x1: sx, y1: 0.05, x2: sx, y2: H - 0.05 },
        metadata: { schematic: true },
      });
      labels.push({
        entityId: `g04-stiff-mark-${i + 1}`,
        sourceEntityId: mid,
        type: "TEXT",
        layerId: "APOLLO_MEMBER_MARK",
        geometry: { x: sx, y: H + 0.25, text: mid, height: 0.14 },
      });
    });
    if (layout.stiffenerStations.length >= 2) {
      dimensions.push({
        entityId: "g04-dim-spacing",
        sourceEntityId: "stiffenerSpacing",
        type: "DIMENSION",
        layerId: "APOLLO_DIMENSION",
        geometry: {
          x1: layout.stiffenerStations[0]!,
          y1: -0.9,
          x2: layout.stiffenerStations[1]!,
          y2: -0.9,
          text: `st=${layout.stiffenerStations[1]! - layout.stiffenerStations[0]!} m`,
        },
      });
    }
  }

  labels.push({
    entityId: "g04-plate-warn",
    sourceEntityId: "stiffenerPlate",
    type: "TEXT",
    layerId: "APOLLO_WARNING",
    geometry: {
      x: L / 2,
      y: H + 0.7,
      text: "STIFFENER PLATE SIZE NOT DEFINED — station marks only (NOT a fabrication detail)",
      height: 0.18,
    },
  });
  labels.push({
    entityId: "g04-count",
    sourceEntityId: "stiffenerCount",
    type: "TEXT",
    layerId: "APOLLO_TEXT",
    geometry: {
      x: L / 2,
      y: -1.3,
      text: `stiffenerStations=${layout.stiffenerStations.length} (per girder line) × girders=${layout.girderCount}`,
      height: 0.18,
    },
  });

  const all = [...entities, ...dimensions, ...labels];
  const b = boundsOf(all);
  return {
    viewId: "view-stiffener-layout",
    viewType: "STIFFENER_LAYOUT",
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
