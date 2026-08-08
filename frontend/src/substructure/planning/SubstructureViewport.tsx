// Phase C1 (M2-02) 中央ペイン: Viewport（2D/3D 切替）
import { useMemo } from "react";
import { ja } from "../../i18n/ja";
import { buildAllSupportSolids, type SolidGroup } from "../SubstructureSolidGenerator";
import { projectAll, type PlanProjection } from "../PlanProjection";
import { SubstructureViewer3D } from "../viewer3d/SubstructureViewer3D";
import type { Support } from "../model";
import styles from "./SubstructurePlanningPage.module.css";
import type { ViewMode } from "./SubstructurePlanningPage";

export interface SubstructureViewportProps {
  viewMode: ViewMode;
  supports: readonly Support[];
  coordinates: ReadonlyMap<string, { x: number; y: number; z: number }>;
  selectedSupportId?: string | null;
  onSelect?: (supportId: string) => void;
  /** M2-05: リアルタイムフックが計算済みの3Dグループ（未指定なら内部計算） */
  groups?: SolidGroup[];
  /** M2-05: リアルタイムフックが計算済みの2D投影（未指定なら内部計算） */
  projections?: PlanProjection[];
  /** 3D生成停止中（FATAL）表示 */
  generationBlocked?: boolean;
}

function makeSnapshots(
  supports: readonly Support[],
  coordinates: ReadonlyMap<string, { x: number; y: number; z: number }>,
): Map<string, import("../model").SupportPlacementSnapshot> {
  const map = new Map<string, import("../model").SupportPlacementSnapshot>();
  for (const s of supports) {
    const c = coordinates.get(s.supportId);
    map.set(s.supportId, {
      source: s.placement.source,
      position: c ?? { x: 0, y: 0, z: 0 },
      tangent: { x: 1, y: 0, z: 0 },
      transverse: { x: 0, y: 1, z: 0 },
      vertical: { x: 0, y: 0, z: 1 },
      azimuthRad: 0,
      skewRad: s.skewRad,
    });
  }
  return map;
}

/** 2D 平面表示（SVG）。plan projection の primitive を元に汎用描画。 */
export function PlanPreviewSvg({ projections }: { projections: PlanProjection[] }) {
  const { minX, minY, span } = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const visit = (x: number, y: number) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    for (const p of projections) {
      visit(p.supportCenter.x, p.supportCenter.y);
      for (const prim of p.primitives) {
        const g = prim.geometry;
        if ("polygon" in g) {
          for (const v of g.polygon) visit(v.x, v.y);
        } else if ("circle" in g) {
          visit(g.circle.center.x - g.circle.radius, g.circle.center.y - g.circle.radius);
          visit(g.circle.center.x + g.circle.radius, g.circle.center.y + g.circle.radius);
        } else if ("line" in g) {
          visit(g.line.a.x, g.line.a.y);
          visit(g.line.b.x, g.line.b.y);
        } else if ("text" in g || "center" in g) {
          const pos = "text" in g ? g.text.position : ("center" in g ? g.center.position : null);
          if (pos) visit(pos.x, pos.y);
        }
      }
    }
    if (!Number.isFinite(minX)) return { minX: 0, minY: 0, span: 100 };
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    return { minX, minY, span: Math.max(spanX, spanY) };
  }, [projections]);

  const toSvg = (x: number, y: number): [number, number] => {
    const pad = 40;
    const w = 800;
    const h = 600;
    return [
      ((x - minX) / span) * (w - pad * 2) + pad,
      h - (((y - minY) / span) * (h - pad * 2) + pad),
    ];
  };

  return (
    <svg className={styles.planSvg} viewBox="0 0 800 600" data-testid="plan-preview-svg">
      <rect x="0" y="0" width="800" height="600" fill="#0b1422" />
      {projections.map((p) =>
        p.primitives.map((prim) => {
          const g = prim.geometry;
          if ("polygon" in g) {
            const pts = g.polygon.map((v) => toSvg(v.x, v.y).join(",")).join(" ");
            return (
              <polygon
                key={prim.sourceObjectId}
                points={pts}
                fill="rgba(122,168,138,0.35)"
                stroke="#7aa88a"
                strokeWidth="1"
                data-source-id={prim.sourceObjectId}
                onClick={() => undefined}
              />
            );
          }
          if ("circle" in g) {
            const [cx, cy] = toSvg(g.circle.center.x, g.circle.center.y);
            const r = (g.circle.radius / span) * 600 * 0.85;
            return (
              <circle
                key={prim.sourceObjectId}
                cx={cx}
                cy={cy}
                r={Math.max(r, 2)}
                fill="none"
                stroke="#b08ad0"
                strokeWidth="1"
                data-source-id={prim.sourceObjectId}
              />
            );
          }
          if ("line" in g) {
            const [ax, ay] = toSvg(g.line.a.x, g.line.a.y);
            const [bx, by] = toSvg(g.line.b.x, g.line.b.y);
            return (
              <line
                key={prim.sourceObjectId}
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke="#f97316"
                strokeWidth="1.5"
                data-source-id={prim.sourceObjectId}
              />
            );
          }
          if ("text" in g) {
            const [tx, ty] = toSvg(g.text.position.x, g.text.position.y);
            return (
              <text
                key={prim.sourceObjectId}
                x={tx}
                y={ty}
                fill="#cbd5e1"
                fontSize="12"
                data-source-id={prim.sourceObjectId}
              >
                {g.text.content}
              </text>
            );
          }
          if ("center" in g) {
            const [cx, cy] = toSvg(g.center.position.x, g.center.position.y);
            return (
              <g key={prim.sourceObjectId} data-source-id={prim.sourceObjectId}>
                <circle cx={cx} cy={cy} r="3" fill="#3b82f6" />
              </g>
            );
          }
          return null;
        }),
      )}
    </svg>
  );
}

export function SubstructureViewport(props: SubstructureViewportProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);

  const groups = useMemo<SolidGroup[]>(() => {
    if (props.groups) return props.groups;
    const snapshots = makeSnapshots(props.supports, props.coordinates);
    try {
      return buildAllSupportSolids(props.supports as never, snapshots);
    } catch {
      return [];
    }
  }, [props.supports, props.coordinates, props.groups]);

  const projections = useMemo(() => {
    if (props.projections) return props.projections;
    return projectAll(groups);
  }, [groups, props.projections]);

  return (
    <div className={styles.viewportWrap} data-testid="substructure-viewport">
      {props.viewMode === "2d" ? (
        <div className={styles.viewportCanvas}>
          {projections.length === 0 ? (
            <div className={styles.planHint}>{t.emptyViewport ?? "表示する部材がありません"}</div>
          ) : (
            <PlanPreviewSvg projections={projections} />
          )}
        </div>
      ) : (
        <div className={styles.viewportCanvas}>
          {props.generationBlocked ? (
            <div className={styles.planHint} data-testid="viewport-blocked">
              {t.generationBlocked ?? "入力エラーのため3Dを生成停止中"}
            </div>
          ) : (
            <SubstructureViewer3D
              groups={groups}
              selectedSupportId={props.selectedSupportId}
              onSelect={props.onSelect}
              height={undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
