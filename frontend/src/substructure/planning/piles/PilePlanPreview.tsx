// Phase C1 (M2-04) 杭平面プレビュー（SVG）
// フーチング外形・杭サークル・杭ID・中心線・間隔/縁端寸法を表示。
import { useMemo } from "react";
import type { PilePlan } from "./pileLayoutModel";

export interface PilePlanPreviewProps {
  plan: PilePlan;
  footingLength: number;
  footingWidth: number;
  pileDiameter: number;
  showDimensions?: boolean;
}

const W = 640;
const H = 420;
const PAD = 60;

export function PilePlanPreview(props: PilePlanPreviewProps) {
  const { plan, footingLength, footingWidth, pileDiameter, showDimensions = true } = props;

  const scale = useMemo(() => {
    const sx = (W - PAD * 2) / footingLength;
    const sy = (H - PAD * 2) / footingWidth;
    return Math.min(sx, sy);
  }, [footingLength, footingWidth]);

  const cx = W / 2;
  const cy = H / 2;
  const toX = (x: number) => cx + x * scale;
  const toY = (y: number) => cy - y * scale;

  const halfL = footingLength / 2;
  const halfW = footingWidth / 2;
  const radius = pileDiameter / 2 * scale;

  const spacingX = plan.layout.spacingX * scale;
  const spacingY = plan.layout.spacingY * scale;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} data-testid="pile-plan-preview" style={{ width: "100%", height: "auto", background: "#0b1422" }}>
      {/* フーチング外形 */}
      <rect
        x={toX(-halfL)}
        y={toY(halfW)}
        width={footingLength * scale}
        height={footingWidth * scale}
        fill="rgba(122,168,138,0.12)"
        stroke="#7aa88a"
        strokeWidth="1.5"
        data-testid="pile-footing-outline"
      />
      {/* 中心線 */}
      <line x1={toX(0)} y1={toY(-halfW)} x2={toX(0)} y2={toY(halfW)} stroke="#3b82f6" strokeWidth="1" strokeDasharray="6 4" data-testid="pile-centerline" />
      <line x1={toX(-halfL)} y1={toY(0)} x2={toX(halfL)} y2={toY(0)} stroke="#3b82f6" strokeWidth="1" strokeDasharray="6 4" />

      {/* 杭サークル + ID */}
      {plan.positions.map((p) => {
        const label = p.id.split("-").pop() ?? p.id;
        return (
          <g key={p.id} data-testid={`pile-circle-${p.id}`}>
            <circle cx={toX(p.x)} cy={toY(p.y)} r={Math.max(radius, 4)} fill="rgba(176,138,208,0.4)" stroke="#b08ad0" strokeWidth="1.2" />
            <text x={toX(p.x)} y={toY(p.y) + 4} textAnchor="middle" fill="#e2e8f0" fontSize="10">
              {label}
            </text>
          </g>
        );
      })}

      {/* 間隔・縁端寸法 */}
      {showDimensions && (
        <>
          <g stroke="#f97316" strokeWidth="1">
            <line x1={toX(plan.positions[0]?.x ?? 0)} y1={toY(halfW) + 16} x2={toX(plan.positions[1]?.x ?? 0)} y2={toY(halfW) + 16} data-testid="dim-spacing-x" />
            <text x={toX((plan.positions[0]?.x ?? 0) + spacingX / 2)} y={toY(halfW) + 30} textAnchor="middle" fill="#fdba74" fontSize="10">
              {props.plan.layout.spacingX.toFixed(2)}m
            </text>
          </g>
          <g stroke="#f97316" strokeWidth="1">
            <line x1={toX(-halfL)} y1={toY(plan.positions[0]?.y ?? 0) + 22} x2={toX(plan.positions[0]?.x ?? 0)} y2={toY(plan.positions[0]?.y ?? 0) + 22} data-testid="dim-edge-x" />
            <text x={toX(-halfL + plan.edgeX / 2)} y={toY(plan.positions[0]?.y ?? 0) + 36} textAnchor="middle" fill="#fdba74" fontSize="10">
              {plan.edgeX.toFixed(2)}
            </text>
          </g>
          <text x={toX(0)} y={toY(halfW) + 48} textAnchor="middle" fill="#cbd5e1" fontSize="10" data-testid="dim-overall">
            全体 {footingLength.toFixed(1)} × {footingWidth.toFixed(1)} m
          </text>
        </>
      )}
    </svg>
  );
}
