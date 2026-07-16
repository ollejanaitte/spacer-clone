import type { ReactElement } from "react";
import type { DrawingDocument, DrawingLayer, DrawingViewport } from "../model/document";
import type { DrawingPrimitive } from "../model/primitives";
import { identityAffineTransform2, transformPoint2, type AffineTransform2 } from "../transforms/affineTransform2";
import {
  clampedFontSizeMm,
  inferDrawingTextRole,
  planViewportScreenScale,
  screenTextClampProfile,
  selectReadablePlanTexts,
  type PlanTextLayoutCandidate,
  type ResolvedPlanTextLayout,
} from "./screenTextLayout";

export type DrawingDocumentSvgProps = {
  document: DrawingDocument;
  className?: string;
  screenScale?: number;
  viewportWidthPx?: number;
};

function strokeWidthForLayer(layer: DrawingLayer): number {
  return layer.style?.strokeWidthMm ?? 0.35;
}

function strokeColorForLayer(layer: DrawingLayer): string {
  const color = layer.style?.color;
  if (!color) {
    return "#0f172a";
  }
  if (color.startsWith("#")) {
    return color;
  }
  const aci = Number.parseInt(color, 10);
  switch (aci) {
    case 1:
      return "#cc0000";
    case 3:
      return "#009900";
    case 5:
      return "#0000cc";
    case 6:
      return "#cc00cc";
    case 8:
      return "#808080";
    default:
      return "#0f172a";
  }
}

function strokeDasharrayForLayer(layer: DrawingLayer): string | undefined {
  const lineType = layer.style?.lineType?.toUpperCase();
  if (lineType === "DASHED" || lineType === "HIDDEN") {
    return "4 2";
  }
  if (lineType === "CENTER") {
    return "8 2 2 2";
  }
  return undefined;
}

function transformForLayer(viewport: DrawingViewport, layer: DrawingLayer): AffineTransform2 {
  return layer.coordinateSpace === "paper" ? identityAffineTransform2() : viewport.transform;
}

function resolveFontSizeMm(
  primitive: Extract<DrawingPrimitive, { kind: "text" }>,
  screenScale: number | undefined,
  viewportWidthPx: number | undefined,
  paperWidthMm: number,
): number {
  if (!screenScale || screenScale <= 0) {
    return primitive.heightMm;
  }
  const profile = screenTextClampProfile(viewportWidthPx ?? 1366);
  const effectiveScreenScale = planViewportScreenScale(
    viewportWidthPx ?? 1366,
    paperWidthMm,
    screenScale,
  );
  return clampedFontSizeMm(
    primitive.heightMm,
    effectiveScreenScale,
    inferDrawingTextRole(primitive.id),
    profile,
  );
}

function collectPlanTextCandidates(viewport: DrawingViewport): PlanTextLayoutCandidate[] {
  const candidates: PlanTextLayoutCandidate[] = [];
  for (const layer of viewport.layers) {
    if (!layer.visible) {
      continue;
    }
    const transform = transformForLayer(viewport, layer);
    for (const primitive of layer.primitives) {
      if (primitive.kind !== "text") {
        continue;
      }
      const position = transformPoint2(transform, primitive.position);
      candidates.push({
        id: primitive.id,
        value: primitive.value,
        x: position.x,
        y: position.y,
        heightMm: primitive.heightMm,
        alignment: primitive.alignment,
      });
    }
  }
  return candidates;
}

function shouldFilterPlanViewportTexts(viewport: DrawingViewport): boolean {
  return viewport.kind === "plan" || viewport.kind === "band";
}

function renderPrimitive(
  primitive: DrawingPrimitive,
  viewport: DrawingViewport,
  layer: DrawingLayer,
  screenScale: number | undefined,
  viewportWidthPx: number | undefined,
  paperWidthMm: number,
  planTextLayout?: Map<string, ResolvedPlanTextLayout>,
): ReactElement | null {
  const stroke = strokeColorForLayer(layer);
  const strokeWidth = strokeWidthForLayer(layer);
  const strokeDasharray = strokeDasharrayForLayer(layer);
  const transform = transformForLayer(viewport, layer);
  if (primitive.kind === "line") {
    const start = transformPoint2(transform, primitive.start);
    const end = transformPoint2(transform, primitive.end);
    return (
      <line
        key={primitive.id}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
    );
  }
  if (primitive.kind === "polyline") {
    const points = primitive.points
      .map((point) => transformPoint2(transform, point))
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
    return (
      <polyline
        key={primitive.id}
        points={points}
        fill={primitive.closed ? "rgba(15, 23, 42, 0.04)" : "none"}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
    );
  }
  if (primitive.kind === "arc") {
    const center = transformPoint2(transform, primitive.center);
    const radius = primitive.radius * Math.abs(transform.a);
    return (
      <circle
        key={primitive.id}
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray="2 2"
      />
    );
  }
  if (primitive.kind === "circle") {
    const center = transformPoint2(transform, primitive.center);
    const radius = Math.abs(primitive.radius * transform.a);
    return (
      <circle
        key={primitive.id}
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        data-testid={primitive.id}
      />
    );
  }
  if (primitive.kind === "text") {
    const layout = planTextLayout?.get(primitive.id);
    if (layout && !layout.visible) {
      return null;
    }
    const position = transformPoint2(transform, primitive.position);
    const fontSize = resolveFontSizeMm(primitive, screenScale, viewportWidthPx, paperWidthMm);
    const value = layout?.value ?? primitive.value;
    return (
      <text
        key={primitive.id}
        x={position.x}
        y={position.y}
        fill={stroke}
        fontSize={fontSize}
        dominantBaseline="alphabetic"
        textAnchor={primitive.alignment === "center" ? "middle" : primitive.alignment === "right" ? "end" : "start"}
        data-text-role={inferDrawingTextRole(primitive.id)}
      >
        {value}
      </text>
    );
  }
  const start = transformPoint2(transform, primitive.start);
  const end = transformPoint2(transform, primitive.end);
  const textPosition = primitive.textPosition
    ? transformPoint2(transform, primitive.textPosition)
    : {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2 - 2,
      };
  return (
    <g key={primitive.id}>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
      {primitive.text && (
        <text x={textPosition.x} y={textPosition.y} fill={stroke} fontSize={2.5} textAnchor="middle">
          {primitive.text}
        </text>
      )}
    </g>
  );
}

function renderViewport(
  viewport: DrawingViewport,
  screenScale: number | undefined,
  viewportWidthPx: number | undefined,
  paperWidthMm: number,
): ReactElement {
  const clipId = `clip-${viewport.id}`;
  const isSheetOverlay = viewport.kind === "sheet";
  const planTextLayout = shouldFilterPlanViewportTexts(viewport)
    ? selectReadablePlanTexts(collectPlanTextCandidates(viewport), {
        viewportWidthPx: viewportWidthPx ?? 1366,
        paperWidthMm,
        screenScale,
      })
    : undefined;
  return (
    <g key={viewport.id} data-testid={`drawing-viewport-${viewport.id}`}>
      {!isSheetOverlay ? (
        <>
          <clipPath id={clipId}>
            <rect
              x={viewport.paperBounds.minX}
              y={viewport.paperBounds.minY}
              width={viewport.paperBounds.maxX - viewport.paperBounds.minX}
              height={viewport.paperBounds.maxY - viewport.paperBounds.minY}
            />
          </clipPath>
          <rect
            x={viewport.paperBounds.minX}
            y={viewport.paperBounds.minY}
            width={viewport.paperBounds.maxX - viewport.paperBounds.minX}
            height={viewport.paperBounds.maxY - viewport.paperBounds.minY}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={0.4}
          />
        </>
      ) : null}
      <g clipPath={isSheetOverlay ? undefined : `url(#${clipId})`}>
        {viewport.layers.filter((layer) => layer.visible).map((layer) => (
          <g key={layer.id}>
            {layer.primitives.map((primitive) =>
              renderPrimitive(
                primitive,
                viewport,
                layer,
                screenScale,
                viewportWidthPx,
                paperWidthMm,
                planTextLayout,
              ),
            )}
          </g>
        ))}
      </g>
    </g>
  );
}

export function DrawingDocumentSvg({
  document,
  className,
  screenScale,
  viewportWidthPx,
}: DrawingDocumentSvgProps) {
  return (
    <div className={className ?? "drawing-document-svg"} data-testid="drawing-document-svg">
      {document.sheets.map((sheet) => (
        <svg
          key={sheet.id}
          className="drawing-sheet-svg"
          viewBox={`0 0 ${sheet.paper.widthMm} ${sheet.paper.heightMm}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={sheet.name}
          data-testid={`drawing-sheet-${sheet.id}`}
        >
          <rect x={0} y={0} width={sheet.paper.widthMm} height={sheet.paper.heightMm} fill="#f8fafc" />
          {sheet.viewports.map((viewport) =>
            renderViewport(viewport, screenScale, viewportWidthPx, sheet.paper.widthMm),
          )}
        </svg>
      ))}
    </div>
  );
}
