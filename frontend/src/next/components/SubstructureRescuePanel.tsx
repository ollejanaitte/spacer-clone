/**
 * Substructure Rescue Editor (Phase 9-03 WP-E/F/G / Phase 9-04R3 B-01/B-06).
 *
 * 3-pane CAD integration (B-01): Support list (tree) / 2D-3D viewport /
 * property editor share the same canonical SubstructureDocument and the same
 * selected support id. Every field edit commits atomically to the document
 * (atomic -> validate -> write -> Auto Save). The pile layout grid (B-06)
 * edits rows/cols/spacing/edge canonically; pile coordinates are DERIVED.
 *
 * Design / verification checks remain HOLD_NOT_AVAILABLE (NOT_AUTHORIZED) and
 * are never shown as computed.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getProjectManager } from "../project/projectManagerInstance";
import { readSubstructureDocument, writeSubstructureDocument } from "../modules/substructureModuleAdapter";
import { computeSubstructureQuantity } from "../modules/substructure/substructureDesign";
import { buildSubstructureSceneGroup } from "../modules/substructure/substructureSceneBuilder";
import { buildPileArrangement } from "../modules/substructure/substructureFoundation";
import type { PileConfiguration, SubstructureDocument, SubstructureSupport } from "../modules/substructure/substructureTypes";

export const SUBSTRUCTURE_RESCUE_FLAG = "VITE_SUBSTRUCTURE_RESCUE";
export function isSubstructureRescueEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.[SUBSTRUCTURE_RESCUE_FLAG] === "true";
}

interface DimField {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly get: (s: SubstructureSupport) => number | null;
  readonly set: (s: SubstructureSupport, v: number | null) => SubstructureSupport;
}

function Num({ label, unit, value, onValue }: { label: string; unit: string; value: number | null; onValue: (v: number | null) => void }) {
  return (
    <label className="next-field">
      <span>{label}（{unit}）</span>
      <input
        type="number"
        step="0.05"
        value={value === null ? "" : String(value)}
        data-testid={`sub-field-${label}`}
        onChange={(e) => {
          const text = e.currentTarget.value;
          if (text.trim() === "") {
            onValue(null);
            return;
          }
          const n = Number(text);
          if (Number.isFinite(n)) {
            onValue(n);
          }
        }}
      />
    </label>
  );
}

function pierField(key: string, label: string, path: (p: NonNullable<SubstructureSupport["pier"]>) => number | null, write: (p: NonNullable<SubstructureSupport["pier"]>, v: number | null) => NonNullable<SubstructureSupport["pier"]>): DimField {
  return {
    key,
    label,
    unit: "m",
    get: (s) => (s.pier ? path(s.pier) : null),
    set: (s, v) => {
      const base: NonNullable<SubstructureSupport["pier"]> = s.pier ?? {
        id: `${s.supportId}-pier`,
        formType: "single_column_rect",
        column: { id: "c1", width: 2.0, depth: 2.0, height: 8.0 },
        footing: { id: "ft", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 0 },
      };
      return { ...s, pier: write(base, v) };
    },
  };
}

function abutmentField(key: string, label: string, path: (a: NonNullable<SubstructureSupport["abutment"]>) => number | null, write: (a: NonNullable<SubstructureSupport["abutment"]>, v: number | null) => NonNullable<SubstructureSupport["abutment"]>): DimField {
  return {
    key,
    label,
    unit: "m",
    get: (s) => (s.abutment ? path(s.abutment) : null),
    set: (s, v) => {
      const base: NonNullable<SubstructureSupport["abutment"]> = s.abutment ?? {
        id: `${s.supportId}-abut`,
        formType: "inverted_t",
        backwall: { id: "bw", height: 3.0, thickness: 0.5, width: 5.0, seatElevation: 0 },
        wingWallL: { id: "wl", length: 3.0, height: 2.0, thickness: 0.4 },
        wingWallR: { id: "wr", length: 3.0, height: 2.0, thickness: 0.4 },
        footing: { id: "aft", length: 5.0, width: 5.0, thickness: 1.5, topElevation: 0 },
      };
      return { ...s, abutment: write(base, v) };
    },
  };
}

/** Ensure a canonical PileGroup exists; initializes with defaults when absent. */
function ensurePileGroup(
  pileGroup: { id: string; pileType: string; diameter: number; length: number; pileCount: number; spacing: { x: number; y: number } } | null | undefined,
  defaultId: string,
  patch: Partial<{ diameter: number; length: number; pileCount: number }>,
): NonNullable<SubstructureSupport["pier"]>["pileGroup"] {
  const base = (pileGroup ?? {
    id: defaultId,
    pileType: "bored_pile" as const,
    diameter: 1.2,
    length: 15,
    pileCount: 4,
    spacing: { x: 3.6, y: 3.6 },
  }) as NonNullable<SubstructureSupport["pier"]>["pileGroup"];
  return base ? { ...base, ...patch } : undefined;
}

export function SubstructureRescuePanel({ projectId }: { projectId: string }) {
  const manager = getProjectManager();
  const [message, setMessage] = useState<string | null>(null);
  const [doc, setDoc] = useState<SubstructureDocument | null>(() => readSubstructureDocument(manager, projectId) ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!doc || !selectedId) return null;
    return doc.supports.find((s) => s.supportId === selectedId) ?? null;
  }, [doc, selectedId]);

  function commit(next: SubstructureDocument): void {
    const write = writeSubstructureDocument(manager, projectId, next);
    if (!write.ok) {
      setMessage("保存できませんでした（validation NG・fail-closed）。");
      return;
    }
    setDoc(next);
    setMessage("SubstructureDocument へ保存しました（Auto Save）。");
    void manager.flushPendingSaves();
  }

  function updateSupport(next: SubstructureSupport): void {
    if (!doc) return;
    commit({
      ...doc,
      supports: doc.supports.map((s) => (s.supportId === next.supportId ? next : s)),
    });
  }

  const pierFields: DimField[] = [
    pierField("column-width", "柱幅", (p) => p.column?.width ?? null, (p, v) => ({ ...p, column: { id: p.column?.id ?? "c1", width: v ?? 0, depth: p.column?.depth ?? 1, height: p.column?.height ?? 5 } })),
    pierField("column-depth", "柱深さ", (p) => p.column?.depth ?? null, (p, v) => ({ ...p, column: { id: p.column?.id ?? "c1", width: p.column?.width ?? 1, depth: v ?? 0, height: p.column?.height ?? 5 } })),
    pierField("column-height", "柱高", (p) => p.column?.height ?? null, (p, v) => ({ ...p, column: { id: p.column?.id ?? "c1", width: p.column?.width ?? 1, depth: p.column?.depth ?? 1, height: v ?? 0 } })),
    pierField("footing-length", "フーチング長", (p) => p.footing?.length ?? null, (p, v) => ({ ...p, footing: { id: p.footing?.id ?? "ft", length: v ?? 0, width: p.footing?.width ?? 5, thickness: p.footing?.thickness ?? 1.5, topElevation: p.footing?.topElevation ?? 0 } })),
    pierField("footing-width", "フーチング幅", (p) => p.footing?.width ?? null, (p, v) => ({ ...p, footing: { id: p.footing?.id ?? "ft", length: p.footing?.length ?? 5, width: v ?? 0, thickness: p.footing?.thickness ?? 1.5, topElevation: p.footing?.topElevation ?? 0 } })),
    pierField("footing-thickness", "フーチング厚", (p) => p.footing?.thickness ?? null, (p, v) => ({ ...p, footing: { id: p.footing?.id ?? "ft", length: p.footing?.length ?? 5, width: p.footing?.width ?? 5, thickness: v ?? 0, topElevation: p.footing?.topElevation ?? 0 } })),
    pierField("pile-diameter", "杭径", (p) => p.pileGroup?.diameter ?? null, (p, v) => ({ ...p, pileGroup: ensurePileGroup(p.pileGroup, p.footing?.id ?? "pg", { diameter: v ?? 0 }) })),
    pierField("pile-length", "杭長", (p) => p.pileGroup?.length ?? null, (p, v) => ({ ...p, pileGroup: ensurePileGroup(p.pileGroup, p.footing?.id ?? "pg", { length: v ?? 0 }) })),
    pierField("pile-count", "杭本数", (p) => p.pileGroup?.pileCount ?? null, (p, v) => ({ ...p, pileGroup: ensurePileGroup(p.pileGroup, p.footing?.id ?? "pg", { pileCount: Math.max(1, Math.round(v ?? 1)) }) })),
  ];

  const abutmentFields: DimField[] = [
    abutmentField("backwall-height", "背壁高", (a) => a.backwall?.height ?? null, (a, v) => ({ ...a, backwall: { id: a.backwall?.id ?? "bw", height: v ?? 0, thickness: a.backwall?.thickness ?? 0.5, width: a.backwall?.width ?? 5, seatElevation: a.backwall?.seatElevation ?? 0 } })),
    abutmentField("backwall-thickness", "背壁厚", (a) => a.backwall?.thickness ?? null, (a, v) => ({ ...a, backwall: { id: a.backwall?.id ?? "bw", height: a.backwall?.height ?? 3, thickness: v ?? 0, width: a.backwall?.width ?? 5, seatElevation: a.backwall?.seatElevation ?? 0 } })),
    abutmentField("abutment-footing-length", "フーチング長", (a) => a.footing?.length ?? null, (a, v) => ({ ...a, footing: { id: a.footing?.id ?? "aft", length: v ?? 0, width: a.footing?.width ?? 5, thickness: a.footing?.thickness ?? 1.5, topElevation: a.footing?.topElevation ?? 0 } })),
    abutmentField("abutment-pile-diameter", "杭径", (a) => a.pileGroup?.diameter ?? null, (a, v) => ({ ...a, pileGroup: ensurePileGroup(a.pileGroup, a.footing?.id ?? "pg", { diameter: v ?? 0 }) })),
    abutmentField("abutment-pile-length", "杭長", (a) => a.pileGroup?.length ?? null, (a, v) => ({ ...a, pileGroup: ensurePileGroup(a.pileGroup, a.footing?.id ?? "pg", { length: v ?? 0 }) })),
    abutmentField("abutment-pile-count", "杭本数", (a) => a.pileGroup?.pileCount ?? null, (a, v) => ({ ...a, pileGroup: ensurePileGroup(a.pileGroup, a.footing?.id ?? "pg", { pileCount: Math.max(1, Math.round(v ?? 1)) }) })),
  ];

  if (!doc) {
    return (
      <div className="next-road-editor-block" data-testid="sub-rescue">
        <h3 className="next-hint">下部工Rescue（救出Editor）</h3>
        <p className="next-hint">下部工Documentがありません。「下部工を生成」を先に実行してください。</p>
      </div>
    );
  }

  const selectedFields = selected
    ? selected.supportType === "pier" ? pierFields : abutmentFields
    : [];

  return (
    <div className="next-road-editor-block" data-testid="sub-rescue">
      <h3 className="next-hint">下部工Rescue（救出Editor・Canonical=SubstructureDocument・3ペインCAD）</h3>

      <div className="sub-3pane" data-testid="sub-3pane-layout">
        {/* Pane 1: Support tree */}
        <aside className="sub-pane-tree" data-testid="sub-pane-tree">
          <h4 className="next-hint">Support（tree）</h4>
          <div className="cim-layer-list">
            {doc.supports.map((s) => (
              <label key={s.supportId} className="cim-layer-toggle">
                <input
                  type="radio"
                  name="support"
                  data-testid={`sub-support-${s.supportId}`}
                  checked={selectedId === s.supportId}
                  onChange={() => setSelectedId(s.supportId)}
                />
                <span className={selectedId === s.supportId ? "sub-tree-selected" : undefined}>
                  {s.supportId}（{s.supportType}）station {s.placement.station ?? "—"} m
                </span>
              </label>
            ))}
          </div>
        </aside>

        {/* Pane 2: 2D plan + 3D viewport */}
        <section className="sub-pane-viewport" data-testid="sub-pane-viewport">
          <h4 className="next-hint">2D plan（選択Supportハイライト）</h4>
          <SubSupportPlanView doc={doc} selectedId={selectedId} />
          <h4 className="next-hint">3D preview（選択Supportハイライト）</h4>
          <Substructure3DPreview doc={doc} selectedId={selectedId} />
        </section>

        {/* Pane 3: Property editor */}
        <aside className="sub-pane-properties" data-testid="sub-pane-properties">
          <h4 className="next-hint">Property（選択Supportの設計寸法）</h4>
          {selected ? (
            <>
              <h5 className="next-hint">{selected.supportId}（{selected.supportType}）</h5>
              <div className="next-form-grid">
                {selectedFields.map((f) => (
                  <Num
                    key={f.key}
                    label={f.label}
                    unit={f.unit}
                    value={f.get(selected)}
                    onValue={(v) => updateSupport(f.set(selected, v))}
                  />
                ))}
              </div>
              <PileGridEditor support={selected} onUpdate={(next) => updateSupport(next)} />
            </>
          ) : (
            <p className="next-hint">Supportを選択してください。</p>
          )}
        </aside>
      </div>

      {message !== null && <p className="next-hint" data-testid="sub-rescue-message">{message}</p>}

      <SubSupportOutputs doc={doc} selectedId={selectedId} />

      <p className="next-hint" data-testid="sub-rescue-hold">
        安定・断面力・応力・照査・配筋・耐震は HOLD_NOT_AVAILABLE（NOT_AUTHORIZED）です。
        「計算済み」とは表示しません。
      </p>
    </div>
  );
}

/**
 * Pile layout grid editor (B-06): rows / cols / spacing / edge edited
 * canonically. pileCount === rows*cols is the consistency rule; the coordinate
 * table is DERIVED from the grid definition (never a second source of truth).
 */
function PileGridEditor({ support, onUpdate }: { support: SubstructureSupport; onUpdate: (s: SubstructureSupport) => void }) {
  const pile = support.pier?.pileGroup ?? support.abutment?.pileGroup ?? null;
  const footing = support.pier?.footing ?? support.abutment?.footing ?? null;
  if (!pile || !footing) {
    return (
      <div data-testid="pile-grid-editor">
        <h5 className="next-hint">杭配置grid（B-06）</h5>
        <p className="next-hint">杭（pileGroup）が未設定です。柱/背壁の編集で杭を設定してください。</p>
      </div>
    );
  }
  const currentPile = pile;
  const currentFooting = footing;
  const rows = currentPile.rows ?? Math.max(1, Math.round(Math.sqrt(currentPile.pileCount)));
  const cols = currentPile.cols ?? Math.max(1, Math.round(currentPile.pileCount / rows));

  function commit(next: PileGroupPatch) {
    const pileGroup = {
      id: currentPile.id,
      pileType: currentPile.pileType,
      diameter: currentPile.diameter,
      length: currentPile.length,
      pileCount: (next.rows ?? rows) * (next.cols ?? cols),
      spacing: { x: next.spacingX ?? currentPile.spacing.x, y: next.spacingY ?? currentPile.spacing.y },
      rows: next.rows ?? rows,
      cols: next.cols ?? cols,
      edgeX: next.edgeX,
      edgeY: next.edgeY,
    };
    if (support.pier) {
      onUpdate({ ...support, pier: { ...support.pier, pileGroup } });
    } else if (support.abutment) {
      onUpdate({ ...support, abutment: { ...support.abutment, pileGroup } });
    }
  }

  const config: PileConfiguration = {
    id: currentPile.id,
    pileType: currentPile.pileType,
    diameter: currentPile.diameter,
    length: currentPile.length,
    pileCount: rows * cols,
    spacing: currentPile.spacing,
    rows,
    cols,
    edgeX: currentPile.edgeX ?? null,
    edgeY: currentPile.edgeY ?? null,
  };
  const { positions } = buildPileArrangement(config, { id: currentFooting.id, length: currentFooting.length, width: currentFooting.width, thickness: currentFooting.thickness, topElevation: currentFooting.topElevation }, support.supportId);

  return (
    <div data-testid="pile-grid-editor">
      <h5 className="next-hint">杭配置grid（B-06）</h5>
      <div className="next-form-grid">
        <Num label="X方向本数（rows）" unit="本" value={rows} onValue={(v) => v !== null && commit({ rows: Math.max(1, Math.round(v)) })} />
        <Num label="Y方向本数（cols）" unit="本" value={cols} onValue={(v) => v !== null && commit({ cols: Math.max(1, Math.round(v)) })} />
        <Num label="X間隔" unit="m" value={currentPile.spacing.x} onValue={(v) => commit({ spacingX: v ?? 0 })} />
        <Num label="Y間隔" unit="m" value={currentPile.spacing.y} onValue={(v) => commit({ spacingY: v ?? 0 })} />
        <Num label="X縁端" unit="m" value={currentPile.edgeX ?? null} onValue={(v) => commit({ edgeX: v })} />
        <Num label="Y縁端" unit="m" value={currentPile.edgeY ?? null} onValue={(v) => commit({ edgeY: v })} />
      </div>
      <p className="next-hint">杭本数 = rows × cols = {rows * cols} 本（整合規則・fail-closed）</p>
      <table className="next-table" data-testid="pile-coordinate-table">
        <thead>
          <tr><th>No</th><th>ID</th><th>X(m)</th><th>Y(m)</th></tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={p.id} data-testid={`pile-coord-${i + 1}`}>
              <td>{i + 1}</td>
              <td>{p.id}</td>
              <td>{p.x.toFixed(3)}</td>
              <td>{p.y.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PileGroupPatch {
  readonly rows?: number;
  readonly cols?: number;
  readonly spacingX?: number;
  readonly spacingY?: number;
  readonly edgeX?: number | null;
  readonly edgeY?: number | null;
}

/** Outputs: support coordinate table, quantity, 2D plan view (B-02/07/08). */
function SubSupportOutputs({ doc, selectedId }: { doc: SubstructureDocument; selectedId: string | null }) {
  const quantity = useMemo(() => computeSubstructureQuantity(doc), [doc]);
  return (
    <>
      <h4 className="next-hint">2D平面ビュー（Support配置・plan）</h4>
      <SubSupportPlanView doc={doc} selectedId={selectedId} />

      <h4 className="next-hint">座標表（Support / station / XYZ）</h4>
      <table className="next-table" data-testid="sub-coordinate-table">
        <thead>
          <tr>
            <th>Support</th>
            <th>種別</th>
            <th>測点(m)</th>
            <th>X</th>
            <th>Y</th>
            <th>Z</th>
            <th>スキュー(rad)</th>
          </tr>
        </thead>
        <tbody>
          {doc.supports.map((s) => {
            const snap = s.placementSnapshot ?? s.placement;
            const pos = snap && "position" in snap && snap.position ? snap.position : undefined;
            return (
              <tr key={s.supportId} data-testid={`sub-coord-${s.supportId}`}>
                <td>{s.supportId}</td>
                <td>{s.supportType}</td>
                <td>{s.placement.station ?? "—"}</td>
                <td>{pos ? pos.x.toFixed(2) : "—"}</td>
                <td>{pos ? pos.y.toFixed(2) : "—"}</td>
                <td>{pos ? pos.z.toFixed(2) : "—"}</td>
                <td>{s.skewRad?.toFixed(3) ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h4 className="next-hint">Quantity（DERIVED・実計算）</h4>
      <dl className="next-integrity-meta" data-testid="sub-quantity">
        <div><dt>コンクリート体積</dt><dd>{quantity.totalConcreteVolumeM3?.toFixed(2) ?? "—"} m³</dd></div>
        <div><dt>杭長合計</dt><dd>{quantity.totalPileLengthM?.toFixed(1) ?? "—"} m</dd></div>
        <div><dt>status</dt><dd>{quantity.quantityStatus}</dd></div>
      </dl>

      <h4 className="next-hint">3Dビュー（Substructure solids）</h4>
      <Substructure3DPreview doc={doc} selectedId={selectedId} />
    </>
  );
}

/** 2D plan SVG: supports placed along the alignment (plan view) with the
 * selected support highlighted (B-02/B-01 selection sync). */
function SubSupportPlanView({ doc, selectedId }: { doc: SubstructureDocument; selectedId: string | null }) {
  const W = 480;
  const H = 120;
  const supports = doc.supports;
  const stations = supports.map((s) => s.placement.station ?? 0);
  const minS = Math.min(...stations, 0);
  const maxS = Math.max(...stations, 1);
  const span = Math.max(maxS - minS, 1);
  const toX = (s: number) => 20 + ((s - minS) / span) * (W - 40);
  return (
    <svg width={W} height={H} className="next-preview-svg" data-testid="sub-plan-view">
      <rect width={W} height={H} fill="#f8fafc" stroke="#e2e8f0" />
      {/* alignment line */}
      <line x1={10} y1={H / 2} x2={W - 10} y2={H / 2} stroke="#94a3b8" strokeDasharray="4 4" />
      {supports.map((s) => {
        const x = toX(s.placement.station ?? 0);
        const w = s.supportType === "abutment" ? 14 : 8;
        const selected = selectedId === s.supportId;
        return (
          <g key={s.supportId}>
            <rect x={x - w / 2} y={H / 2 - 16} width={w} height={32}
              fill={selected ? "#f59e0b" : s.supportType === "abutment" ? "#8a6d3b" : "#6b7d99"}
              stroke={selected ? "#b45309" : "#334155"}
              strokeWidth={selected ? 2 : 1}
              data-testid={`sub-plan-support-${s.supportId}`} />
            <text x={x} y={H / 2 + 22} fontSize="9" textAnchor="middle" fill="#334155">{s.supportId}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** 3D preview of the substructure solids (B-09) with selected highlight. */
function Substructure3DPreview({ doc, selectedId }: { doc: SubstructureDocument; selectedId: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let frameId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xe8eef4);
      camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200000);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      scene.add(new THREE.DirectionalLight(0xffffff, 1.1));

      const built = buildSubstructureSceneGroup(withFallbackSnapshots(doc), { localOrigin: null });
      scene.add(built.group);
      // highlight the selected support (B-01 selection sync)
      if (selectedId) {
        built.group.traverse((obj) => {
          const selectionId = (obj as THREE.Mesh & { userData?: { selectionId?: string } }).userData?.selectionId;
          if (selectionId === `sub:${selectedId}` && obj instanceof THREE.Mesh) {
            (obj.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xf59e0b);
            (obj.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
          }
        });
      }
      const box = new THREE.Box3().setFromObject(built.group);
      if (box.isEmpty()) {
        box.set(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 10, 10));
      }
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) * 0.6;
      camera.near = Math.max(0.01, radius / 1000);
      camera.far = Math.max(100, radius * 100);
      camera.position.set(center.x + size.x, center.y + size.y, center.z + size.z + radius);
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();

      const resize = () => {
        if (!renderer || !camera) return;
        const w = container.clientWidth || 300;
        const h = container.clientHeight || 260;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(container);
      const animate = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);
        controls?.update();
        renderer?.render(scene, camera!);
      };
      animate();
      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        ro.disconnect();
        renderer?.dispose();
        controls?.dispose();
        if (renderer?.domElement.parentNode === container) container.removeChild(renderer.domElement);
      };
    } catch (error) {
      setRenderError(String(error));
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, selectedId]);

  return (
    <div style={{ height: 260, position: "relative" }} data-testid="sub-3d-preview">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {renderError !== null && <div className="next-error">{renderError}</div>}
    </div>
  );
}

/**
 * Display-only fallback: synthesize placement snapshots for supports missing
 * them (straight-alignment approximation along the station axis). Never
 * persisted; exact alignment positions come from the road context / CIM.
 */
function withFallbackSnapshots(doc: SubstructureDocument): SubstructureDocument {
  const hasMissing = doc.supports.some((s) => !s.placementSnapshot);
  if (!hasMissing) {
    return doc;
  }
  return {
    ...doc,
    supports: doc.supports.map((s) => {
      if (s.placementSnapshot) return s;
      const station = s.placement.station ?? 0;
      const offset = s.placement.offset ?? 0;
      const z = s.zOverride ?? 0;
      return {
        ...s,
        placementSnapshot: {
          source: "liner",
          position: { x: station, y: offset, z },
          tangent: { x: 1, y: 0, z: 0 },
          transverse: { x: 0, y: 1, z: 0 },
          vertical: { x: 0, y: 0, z: 1 },
          azimuthRad: 0,
          skewRad: s.skewRad ?? 0,
        },
      };
    }),
  };
}
