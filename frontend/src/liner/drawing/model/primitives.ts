import type { Point2 } from "./geometry";

export type DrawingStyle = {
  id?: string;
  strokeWidthMm?: number;
  lineType?: string;
  textHeightMm?: number;
  color?: string;
};

export type DrawingLine = {
  kind: "line";
  id: string;
  start: Point2;
  end: Point2;
  layerId?: string;
  styleId?: string;
};

export type DrawingPolyline = {
  kind: "polyline";
  id: string;
  points: Point2[];
  closed?: boolean;
  layerId?: string;
  styleId?: string;
};

export type DrawingArc = {
  kind: "arc";
  id: string;
  center: Point2;
  radius: number;
  startAngleRad: number;
  endAngleRad: number;
  clockwise?: boolean;
  layerId?: string;
  styleId?: string;
};

export type DrawingText = {
  kind: "text";
  id: string;
  position: Point2;
  value: string;
  heightMm: number;
  rotationRad?: number;
  alignment?: "left" | "center" | "right";
  layerId?: string;
  styleId?: string;
};

export type DrawingDimension = {
  kind: "dimension";
  id: string;
  start: Point2;
  end: Point2;
  offset: number;
  text?: string;
  textPosition?: Point2;
  layerId?: string;
  styleId?: string;
};

export type DrawingPrimitive =
  | DrawingLine
  | DrawingPolyline
  | DrawingArc
  | DrawingText
  | DrawingDimension;
