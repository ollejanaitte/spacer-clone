import { useMemo } from "react";
import { buildRoadIntermediate } from "../modules/road/intermediateResult";
import type { LinearAlignment } from "../../liner/core/types";
import type { VerticalElement } from "../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../liner/schema/types";

export interface RoadPreviewProps {
  readonly horizontal: LinearAlignment | undefined;
  readonly vertical: readonly VerticalElement[];
  readonly crossSections: readonly CrossSectionTemplateDraft[];
  readonly widthChangePoints: readonly { id: string; physicalDistance: number; leftOffset: number; rightOffset: number }[];
  readonly crossSlopeIntervals: readonly unknown[];
}

const W = 320;
const H = 160;

export function RoadPlanPreview({ horizontal, vertical, crossSections, widthChangePoints, crossSlopeIntervals }: RoadPreviewProps) {
  const points = useMemo(() => {
    if (!horizontal) return [];
    const result = buildRoadIntermediate({
      horizontal,
      vertical,
      crossSections,
      widthChangePoints,
      crossSlopeIntervals,
      stationDefinition: { originDisplayedStation: 0, equations: [] },
    }, { sampleInterval: 5 });
    return result.samplePoints.map((p) => ({ x: p.x, y: p.y }));
  }, [horizontal, vertical, crossSections, widthChangePoints, crossSlopeIntervals]);

  if (points.length < 2) {
    return <div className="next-hint" data-testid="road-plan-empty">平面線形が未入力です。</div>;
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((W - 20) / spanX, (H - 20) / spanY);
  const toSvg = (x: number, y: number) => {
    const sx = 10 + (x - minX) * scale;
    const sy = H - 10 - (y - minY) * scale;
    return `${sx.toFixed(2)},${sy.toFixed(2)}`;
  };
  const polyline = points.map((p) => toSvg(p.x, p.y)).join(" ");

  return (
    <svg width={W} height={H} className="next-preview-svg" data-testid="road-plan-preview">
      <rect width={W} height={H} fill="#f8fafc" stroke="#e2e8f0" />
      <polyline points={polyline} fill="none" stroke="#2563eb" strokeWidth="2" />
      <circle cx={Number(polyline.split(" ")[0]?.split(",")[0])} cy={Number(polyline.split(" ")[0]?.split(",")[1])} r="3" fill="#16a34a" />
      <circle cx={Number(polyline.split(" ").at(-1)?.split(",")[0])} cy={Number(polyline.split(" ").at(-1)?.split(",")[1])} r="3" fill="#dc2626" />
    </svg>
  );
}

export function RoadProfilePreview({ horizontal, vertical }: { horizontal: LinearAlignment | undefined; vertical: readonly VerticalElement[] }) {
  const points = useMemo(() => {
    if (!horizontal || vertical.length === 0) return [];
    const result = buildRoadIntermediate({
      horizontal,
      vertical,
      crossSections: [],
      widthChangePoints: [],
      crossSlopeIntervals: [],
      stationDefinition: { originDisplayedStation: 0, equations: [] },
    }, { sampleInterval: 5 });
    return result.samplePoints.map((p) => ({ d: p.physicalDistance, z: p.z }));
  }, [horizontal, vertical]);

  if (points.length < 2) {
    return <div className="next-hint" data-testid="road-profile-empty">縦断が未入力です。</div>;
  }

  const ds = points.map((p) => p.d);
  const zs = points.map((p) => p.z);
  const minD = Math.min(...ds);
  const maxD = Math.max(...ds);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spanD = Math.max(maxD - minD, 1e-9);
  const spanZ = Math.max(maxZ - minZ, 1e-9);
  const toSvg = (d: number, z: number) => {
    const sx = 10 + ((d - minD) / spanD) * (W - 20);
    const sy = H - 10 - ((z - minZ) / spanZ) * (H - 20);
    return `${sx.toFixed(2)},${sy.toFixed(2)}`;
  };
  const polyline = points.map((p) => toSvg(p.d, p.z)).join(" ");

  return (
    <svg width={W} height={H} className="next-preview-svg" data-testid="road-profile-preview">
      <rect width={W} height={H} fill="#f8fafc" stroke="#e2e8f0" />
      <polyline points={polyline} fill="none" stroke="#0f766e" strokeWidth="2" />
    </svg>
  );
}

export function RoadCrossSectionPreview({ crossSection }: { crossSection: CrossSectionTemplateDraft | undefined }) {
  if (!crossSection || crossSection.offsetLines.length === 0) {
    return <div className="next-hint" data-testid="road-cross-empty">横断が未入力です。</div>;
  }
  const offsets = crossSection.offsetLines.map((l: { offset: number }) => l.offset);
  const elevs = crossSection.offsetLines.map((l: { elevation: number }) => l.elevation);
  const minO = Math.min(...offsets);
  const maxO = Math.max(...offsets);
  const minE = Math.min(...elevs);
  const maxE = Math.max(...elevs);
  const spanO = Math.max(maxO - minO, 1e-9);
  const spanE = Math.max(maxE - minE, 1e-9);
  const toSvg = (o: number, e: number) => {
    const sx = 10 + ((o - minO) / spanO) * (W - 20);
    const sy = H - 10 - ((e - minE) / spanE) * (H - 20);
    return `${sx.toFixed(2)},${sy.toFixed(2)}`;
  };
  const polyline = crossSection.offsetLines.map((l: { offset: number; elevation: number }) => toSvg(l.offset, l.elevation)).join(" ");

  return (
    <svg width={W} height={H} className="next-preview-svg" data-testid="road-cross-preview">
      <rect width={W} height={H} fill="#f8fafc" stroke="#e2e8f0" />
      <line x1={toSvg(0, minE).split(",")[0]} y1="10" x2={toSvg(0, minE).split(",")[0]} y2={String(H - 10)} stroke="#cbd5e1" strokeDasharray="4" />
      <polyline points={polyline} fill="none" stroke="#7c3aed" strokeWidth="2" />
    </svg>
  );
}
