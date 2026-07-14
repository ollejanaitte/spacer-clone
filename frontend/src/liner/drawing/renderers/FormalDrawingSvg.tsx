import type { CSSProperties, ReactNode } from "react";
import type { DrawingDocument, DrawingSheet, DrawingViewport } from "../model/document";
import type { Point2 } from "../model/geometry";
import type { DrawingPrimitive } from "../model/primitives";
import { transformPoint2 } from "../transforms/affineTransform2";

export type FormalDrawingSvgProps = {
  document: DrawingDocument;
  sheetId: string;
  className?: string;
};

function primitiveStyle(layerId?: string): CSSProperties {
  if (!layerId) {
    return {};
  }
  if (layerId.includes("station")) {
    return { stroke: "#16a34a", fill: "#16a34a" };
  }
  if (layerId.includes("annotation")) {
    return { stroke: "#475569", fill: "#475569" };
  }
  if (layerId.includes("ground")) {
    return { stroke: "#a16207", fill: "#a16207" };
  }
  if (layerId.includes("band")) {
    return { stroke: "#64748b", fill: "#64748b" };
  }
  if (layerId.includes("cross-section")) {
    return { stroke: "#2563eb", fill: "#2563eb" };
  }
  return {};
}

function renderPoint(transformPoint: (point: Point2) => Point2, point: Point2): Point2 {
  return transformPoint(point);
}

function arcPath(viewport: DrawingViewport, primitive: Extract<DrawingPrimitive, { kind: "arc" }>): string {
  const startAngle = primitive.startAngleRad;
  const endAngle = primitive.endAngleRad;
  const start = {
    x: primitive.center.x + Math.cos(startAngle) * primitive.radius,
    y: primitive.center.y + Math.sin(startAngle) * primitive.radius,
  };
  const end = {
    x: primitive.center.x + Math.cos(endAngle) * primitive.radius,
    y: primitive.center.y + Math.sin(endAngle) * primitive.radius,
  };
  const transformedStart = transformPoint2(viewport.transform, start);
  const transformedEnd = transformPoint2(viewport.transform, end);
  const radius = Math.abs(primitive.radius * viewport.transform.a);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = primitive.clockwise ? 1 : 0;
  return `M ${transformedStart.x} ${transformedStart.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${transformedEnd.x} ${transformedEnd.y}`;
}

function renderPrimitive(viewport: DrawingViewport, primitive: DrawingPrimitive): ReactNode {
  const style = primitiveStyle(primitive.layerId);
  if (primitive.kind === "line") {
    const start = transformPoint2(viewport.transform, primitive.start);
    const end = transformPoint2(viewport.transform, primitive.end);
    return <line key={primitive.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} style={style} />;
  }
  if (primitive.kind === "polyline") {
    const points = primitive.points.map((point: Point2) => {
      const transformed = transformPoint2(viewport.transform, point);
      return `${transformed.x},${transformed.y}`;
    });
    return <polyline key={primitive.id} points={points.join(" ")} style={style} fill="none" />;
  }
  if (primitive.kind === "arc") {
    return <path key={primitive.id} d={arcPath(viewport, primitive)} style={style} fill="none" />;
  }
  if (primitive.kind === "circle") {
    const center = transformPoint2(viewport.transform, primitive.center);
    const radius = Math.abs(primitive.radius * viewport.transform.a);
    return <circle key={primitive.id} cx={center.x} cy={center.y} r={radius} style={style} fill="none" />;
  }
  if (primitive.kind === "text") {
    const position = transformPoint2(viewport.transform, primitive.position);
    return (
      <text
        key={primitive.id}
        x={position.x}
        y={position.y}
        fontSize={primitive.heightMm}
        textAnchor={primitive.alignment === "center" ? "middle" : primitive.alignment === "right" ? "end" : "start"}
        style={style}
      >
        {primitive.value}
      </text>
    );
  }
  const start = transformPoint2(viewport.transform, primitive.start);
  const end = transformPoint2(viewport.transform, primitive.end);
  const text = primitive.textPosition ? transformPoint2(viewport.transform, primitive.textPosition) : null;
  return (
    <g key={primitive.id}>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} style={style} />
      {text ? (
        <text x={text.x} y={text.y} fontSize={2.5} textAnchor="middle" style={style}>
          {primitive.text ?? ""}
        </text>
      ) : null}
    </g>
  );
}

function renderViewport(viewport: DrawingViewport): ReactNode {
  const width = viewport.paperBounds.maxX - viewport.paperBounds.minX;
  const height = viewport.paperBounds.maxY - viewport.paperBounds.minY;
  return (
    <svg
      key={viewport.id}
      className="liner-formal-drawing-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={viewport.kind}
      data-testid={`formal-drawing-${viewport.kind}`}
    >
      {viewport.layers.filter((layer) => layer.visible).map((layer) => (
        <g key={layer.id} data-layer-id={layer.id}>
          {layer.primitives.map((primitive) => renderPrimitive(viewport, primitive))}
        </g>
      ))}
    </svg>
  );
}

export function FormalDrawingSvg({ document, sheetId, className }: FormalDrawingSvgProps) {
  const sheet = document.sheets.find((entry) => entry.id === sheetId);
  if (!sheet) {
    return <p className={className}>sheet not found</p>;
  }

  return (
    <section className={className} data-testid={`formal-drawing-sheet-${sheet.id}`}>
      {sheet.viewports.map((viewport) => renderViewport(viewport))}
    </section>
  );
}
