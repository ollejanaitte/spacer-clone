export type DrawingTextRole = "title" | "major" | "station" | "curve" | "aux";

export type ScreenTextClampProfile = {
  generalMinPx: number;
  titleMinPx: number;
  maxPx: number;
};

export type PlanTextBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const PLAN_TEXT_CHAR_WIDTH_RATIO = 0.55;
const PLAN_TEXT_BASELINE_DESCENT_RATIO = 0.25;

export function screenTextClampProfile(viewportWidthPx: number): ScreenTextClampProfile {
  if (viewportWidthPx >= 1920) {
    return {
      generalMinPx: 10,
      titleMinPx: 12,
      maxPx: 28,
    };
  }
  return {
    generalMinPx: 8,
    titleMinPx: 10,
    maxPx: 24,
  };
}

export function inferDrawingTextRole(primitiveId: string): DrawingTextRole {
  if (
    primitiveId === "plan-north"
    || primitiveId.startsWith("cross-section-title-")
    || primitiveId === "cross-section-centerline-label"
  ) {
    return "title";
  }
  if (
    primitiveId.startsWith("plan-curve-point-")
    || primitiveId.startsWith("profile-grade-break-")
  ) {
    return "major";
  }
  if (
    primitiveId.startsWith("plan-station-text-")
    || primitiveId.startsWith("profile-station-")
  ) {
    return "station";
  }
  if (primitiveId.startsWith("plan-segment-")) {
    return "curve";
  }
  return "aux";
}

export function drawingTextRolePriority(role: DrawingTextRole): number {
  switch (role) {
    case "title":
      return 5;
    case "major":
      return 4;
    case "station":
      return 3;
    case "curve":
      return 2;
    default:
      return 1;
  }
}

export function clampedFontSizeMm(
  heightMm: number,
  screenScale: number,
  role: DrawingTextRole,
  profile: ScreenTextClampProfile,
): number {
  if (!Number.isFinite(screenScale) || screenScale <= 0) {
    return heightMm;
  }
  const renderedPx = heightMm * screenScale;
  const minPx = role === "title" || role === "major" ? profile.titleMinPx : profile.generalMinPx;
  const clampedPx = Math.min(profile.maxPx, Math.max(minPx, renderedPx));
  return clampedPx / screenScale;
}

export function ellipsisToWidth(value: string, maxWidthMm: number, charWidthMm: number): string {
  if (maxWidthMm <= 0 || charWidthMm <= 0) {
    return value;
  }
  const maxChars = Math.max(1, Math.floor(maxWidthMm / charWidthMm));
  if (value.length <= maxChars) {
    return value;
  }
  if (maxChars <= 1) {
    return "…";
  }
  return `${value.slice(0, maxChars - 1)}…`;
}

export function estimateTextWidthMm(
  value: string,
  heightMm: number,
  charWidthRatio = PLAN_TEXT_CHAR_WIDTH_RATIO,
): number {
  return Math.max(value.length, 1) * heightMm * charWidthRatio;
}

export function planStationLabelHalfWidthMm(value: string, textHeightMm: number): number {
  return estimateTextWidthMm(value, textHeightMm) / 2 + 1;
}

export function planStationLabelStaggerOffsetMm(staggerIndex: number, textHeightMm: number): number {
  return staggerIndex * (textHeightMm + 1.5);
}

export function computePlanStationStaggerByPaperX(
  candidates: ReadonlyArray<{ stationId: string; paperX: number; value: string }>,
  textHeightMm: number,
  maxStaggerLevel = 5,
): Map<string, number> {
  const sorted = [...candidates].sort((left, right) => left.paperX - right.paperX);
  const staggerByStationId = new Map<string, number>();
  const occupied: Array<{ left: number; right: number; staggerLevel: number }> = [];

  for (const candidate of sorted) {
    const halfWidth = planStationLabelHalfWidthMm(candidate.value, textHeightMm);
    const left = candidate.paperX - halfWidth;
    const right = candidate.paperX + halfWidth;
    let level = 0;
    while (level <= maxStaggerLevel) {
      const conflicts = occupied.filter(
        (slot) => slot.staggerLevel === level && right > slot.left && left < slot.right,
      );
      if (conflicts.length === 0) {
        break;
      }
      level += 1;
    }
    const staggerLevel = Math.min(level, maxStaggerLevel);
    staggerByStationId.set(candidate.stationId, staggerLevel);
    occupied.push({ left, right, staggerLevel });
  }

  return staggerByStationId;
}

export const PLAN_LAYOUT_VIEWPORT_PX = {
  narrow: 1366,
  wide: 1920,
} as const;

export type PlanTextLayoutCandidate = {
  id: string;
  value: string;
  x: number;
  y: number;
  heightMm: number;
  alignment?: "center" | "left" | "right";
};

export type ResolvedPlanTextLayout = {
  visible: boolean;
  value: string;
};

export function planViewportScreenScale(
  viewportWidthPx: number,
  paperWidthMm: number,
  zoomScale = 1,
): number {
  if (!Number.isFinite(viewportWidthPx) || viewportWidthPx <= 0) {
    return zoomScale;
  }
  if (!Number.isFinite(paperWidthMm) || paperWidthMm <= 0) {
    return zoomScale;
  }
  return (viewportWidthPx / paperWidthMm) * zoomScale;
}

export function effectiveRenderedTextHeightMm(
  heightMm: number,
  screenScale: number,
  role: DrawingTextRole,
  viewportWidthPx: number,
): number {
  const profile = screenTextClampProfile(viewportWidthPx);
  return clampedFontSizeMm(heightMm, screenScale, role, profile);
}

export function planStationLabelPitchMm(
  textHeightMm: number,
  viewportWidthPx: number,
  paperWidthMm: number,
  sampleLabel = "No.0+00.000",
  zoomScale = 1,
): number {
  const screenScale = planViewportScreenScale(viewportWidthPx, paperWidthMm, zoomScale);
  const effectiveHeight = effectiveRenderedTextHeightMm(
    textHeightMm,
    screenScale,
    "station",
    viewportWidthPx,
  );
  return estimateTextWidthMm(sampleLabel, effectiveHeight) + 2;
}

export function planStationLabelKeepSet(
  stationCount: number,
  viewportWidthPx: number,
  drawableWidthMm: number,
  paperWidthMm: number,
  textHeightMm: number,
  sampleLabel = "No.0+00.000",
  zoomScale = 1,
): Set<number> {
  const keep = new Set<number>();
  if (stationCount <= 0) {
    return keep;
  }
  keep.add(0);
  if (stationCount > 1) {
    keep.add(stationCount - 1);
  }
  const pitchMm = planStationLabelPitchMm(
    textHeightMm,
    viewportWidthPx,
    paperWidthMm,
    sampleLabel,
    zoomScale,
  );
  const capacity = Math.max(keep.size, Math.floor(drawableWidthMm / pitchMm));
  if (stationCount <= capacity) {
    for (let index = 0; index < stationCount; index += 1) {
      keep.add(index);
    }
    return keep;
  }
  const interiorSlots = Math.max(0, capacity - keep.size);
  if (interiorSlots === 0) {
    return keep;
  }
  const stride = (stationCount - 2) / interiorSlots;
  for (let slot = 0; slot < interiorSlots; slot += 1) {
    const index = Math.min(stationCount - 2, Math.max(1, Math.round(1 + slot * stride)));
    keep.add(index);
  }
  return keep;
}

export function shouldThinPlanStationLabel(
  stationIndex: number,
  stationCount: number,
  spanM: number,
  options?: {
    viewportWidthPx?: number;
    drawableWidthMm?: number;
    paperWidthMm?: number;
    textHeightMm?: number;
  },
): boolean {
  if (stationIndex === 0 || stationIndex === stationCount - 1) {
    return false;
  }
  if (
    options?.viewportWidthPx !== undefined
    && options.drawableWidthMm !== undefined
    && options.paperWidthMm !== undefined
    && options.textHeightMm !== undefined
  ) {
    const keep = planStationLabelKeepSet(
      stationCount,
      options.viewportWidthPx,
      options.drawableWidthMm,
      options.paperWidthMm,
      options.textHeightMm,
    );
    return !keep.has(stationIndex);
  }
  const density = stationCount / Math.max(spanM, 1);
  if (density <= 0.1 && stationCount <= 12) {
    return false;
  }
  const thinStride = density > 0.15 ? 3 : 2;
  return stationIndex % thinStride !== 0;
}

export function planBandValueThinStride(
  cellWidthMm: number,
  valueHeightMm: number,
  stationCount = 1,
  options?: {
    viewportWidthPx?: number;
    drawableWidthMm?: number;
    paperWidthMm?: number;
  },
): number {
  if (
    options?.viewportWidthPx !== undefined
    && options.drawableWidthMm !== undefined
    && options.paperWidthMm !== undefined
  ) {
    const keep = planStationLabelKeepSet(
      stationCount,
      options.viewportWidthPx,
      options.drawableWidthMm,
      options.paperWidthMm,
      valueHeightMm,
    );
    if (keep.size >= stationCount) {
      return 1;
    }
    const stride = Math.max(1, Math.ceil(stationCount / Math.max(keep.size, 1)));
    return stride;
  }
  const readableCell = estimateTextWidthMm("No.0+00.000", valueHeightMm) + 3;
  if (cellWidthMm >= readableCell + 2) {
    return 1;
  }
  if (stationCount >= 14 && cellWidthMm < readableCell * 1.15) {
    return 2;
  }
  if (cellWidthMm >= readableCell * 0.65) {
    return 2;
  }
  if (cellWidthMm >= readableCell * 0.4) {
    return 3;
  }
  return Math.max(4, Math.ceil(readableCell / Math.max(cellWidthMm, 1)));
}

function planBandRowPriority(primitiveId: string): number {
  const match = /^plan-band-value-[^-]+-(\d+)$/.exec(primitiveId);
  if (!match) {
    return 0;
  }
  const rowIndex = Number(match[1]);
  if (rowIndex === 0) {
    return 3;
  }
  if (rowIndex === 2) {
    return 2;
  }
  return 1;
}

export function inferPlanTextScreenPriority(
  primitiveId: string,
  context?: {
    endpointStationTextIds?: ReadonlySet<string>;
  },
): number {
  if (primitiveId === "plan-north" || primitiveId === "plan-scale") {
    return 100;
  }
  if (primitiveId.startsWith("plan-band-row-label-")) {
    return 95;
  }
  if (primitiveId.startsWith("plan-curve-point-")) {
    return 90;
  }
  if (primitiveId.startsWith("plan-station-text-")) {
    if (context?.endpointStationTextIds?.has(primitiveId)) {
      return 85;
    }
    return 60;
  }
  if (primitiveId.startsWith("plan-segment-")) {
    return 75;
  }
  if (primitiveId.startsWith("plan-band-value-")) {
    return 45 + planBandRowPriority(primitiveId) * 5;
  }
  return drawingTextRolePriority(inferDrawingTextRole(primitiveId));
}

export function selectReadablePlanTexts(
  candidates: readonly PlanTextLayoutCandidate[],
  options: {
    viewportWidthPx: number;
    paperWidthMm: number;
    screenScale?: number;
    marginMm?: number;
  },
): Map<string, ResolvedPlanTextLayout> {
  const screenScale = planViewportScreenScale(
    options.viewportWidthPx,
    options.paperWidthMm,
    options.screenScale ?? 1,
  );
  const marginMm = options.marginMm ?? 1;
  const endpointStationTextIds = new Set<string>();
  const stationTexts = candidates.filter((candidate) => candidate.id.startsWith("plan-station-text-"));
  if (stationTexts.length > 0) {
    const sortedByX = [...stationTexts].sort((left, right) => left.x - right.x);
    endpointStationTextIds.add(sortedByX[0]!.id);
    endpointStationTextIds.add(sortedByX[sortedByX.length - 1]!.id);
  }

  const ranked = [...candidates].sort((left, right) => {
    const priorityDelta =
      inferPlanTextScreenPriority(right.id, { endpointStationTextIds })
      - inferPlanTextScreenPriority(left.id, { endpointStationTextIds });
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return left.x - right.x;
  });

  const resolved = new Map<string, ResolvedPlanTextLayout>();
  const placed: PlanTextBox[] = [];

  for (const candidate of ranked) {
    const role = inferDrawingTextRole(candidate.id);
    const alignment = candidate.alignment ?? "center";
    const effectiveHeight = effectiveRenderedTextHeightMm(
      candidate.heightMm,
      screenScale,
      role,
      options.viewportWidthPx,
    );
    let value = candidate.value;
    let box = planTextBoxFromAnchor(candidate.x, candidate.y, value, effectiveHeight, alignment);
    if (placed.some((existing) => planTextBoxesOverlap(box, existing, marginMm))) {
      if (role === "station" || candidate.id.startsWith("plan-band-value-")) {
        const maxWidthMm = Math.max(
          effectiveHeight * 2,
          estimateTextWidthMm(value, effectiveHeight) * 0.55,
        );
        const ellipsized = ellipsisToWidth(
          value,
          maxWidthMm,
          effectiveHeight * PLAN_TEXT_CHAR_WIDTH_RATIO,
        );
        if (ellipsized !== value) {
          value = ellipsized;
          box = planTextBoxFromAnchor(candidate.x, candidate.y, value, effectiveHeight, alignment);
        }
      }
    }
    if (placed.some((existing) => planTextBoxesOverlap(box, existing, marginMm))) {
      resolved.set(candidate.id, { visible: false, value: candidate.value });
      continue;
    }
    placed.push(box);
    resolved.set(candidate.id, { visible: true, value });
  }

  for (const candidate of candidates) {
    if (!resolved.has(candidate.id)) {
      resolved.set(candidate.id, { visible: true, value: candidate.value });
    }
  }

  return resolved;
}

export function planTextBoxFromAnchor(
  x: number,
  y: number,
  value: string,
  heightMm: number,
  alignment: "center" | "left" | "right" = "center",
): PlanTextBox {
  const width = estimateTextWidthMm(value, heightMm);
  const left = alignment === "center" ? x - width / 2 : alignment === "right" ? x - width : x;
  return {
    left,
    right: left + width,
    top: y - heightMm,
    bottom: y + heightMm * PLAN_TEXT_BASELINE_DESCENT_RATIO,
  };
}

export function planTextBoxesOverlap(left: PlanTextBox, right: PlanTextBox, marginMm = 1): boolean {
  return (
    left.left < right.right + marginMm
    && left.right + marginMm > right.left
    && left.top < right.bottom + marginMm
    && left.bottom + marginMm > right.top
  );
}

export function resolvePlanTextBaselineY(
  x: number,
  preferredY: number,
  value: string,
  heightMm: number,
  placed: readonly PlanTextBox[],
  yStepMm: number,
  maxAttempts = 8,
  alignment: "center" | "left" | "right" = "center",
): number {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidateY = preferredY + attempt * yStepMm;
    const candidateBox = planTextBoxFromAnchor(x, candidateY, value, heightMm, alignment);
    if (!placed.some((existing) => planTextBoxesOverlap(candidateBox, existing))) {
      return candidateY;
    }
  }
  return preferredY + (maxAttempts - 1) * yStepMm;
}

export function clampPlanTextBaselineY(
  x: number,
  y: number,
  value: string,
  heightMm: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  alignment: "center" | "left" | "right" = "center",
  insetMm = 1,
): number {
  let nextY = y;
  let box = planTextBoxFromAnchor(x, nextY, value, heightMm, alignment);
  if (box.top < bounds.minY + insetMm) {
    nextY += bounds.minY + insetMm - box.top;
  }
  box = planTextBoxFromAnchor(x, nextY, value, heightMm, alignment);
  if (box.bottom > bounds.maxY - insetMm) {
    nextY -= box.bottom - (bounds.maxY - insetMm);
  }
  return nextY;
}

export function bandRowTextBaselineY(rowTopY: number, rowHeightMm: number, textHeightMm: number): number {
  const verticalSpan = textHeightMm * (1 + PLAN_TEXT_BASELINE_DESCENT_RATIO);
  const topInset = Math.max((rowHeightMm - verticalSpan) / 2, 0);
  return rowTopY + topInset + textHeightMm;
}

export function clampPlanTextAnchorX(
  x: number,
  y: number,
  value: string,
  heightMm: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  alignment: "center" | "left" | "right" = "center",
  insetMm = 1,
): number {
  const box = planTextBoxFromAnchor(x, y, value, heightMm, alignment);
  if (box.left < bounds.minX + insetMm) {
    return x + (bounds.minX + insetMm - box.left);
  }
  if (box.right > bounds.maxX - insetMm) {
    return x - (box.right - (bounds.maxX - insetMm));
  }
  return x;
}
