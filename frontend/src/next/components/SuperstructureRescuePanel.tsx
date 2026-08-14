/**
 * Superstructure Rescue Editor (Phase 9-03 WP-A/C / Phase 9-04R3 S-01/S-07).
 *
 * Controlled editor that edits the canonical SuperstructureDocument from the
 * regular /app Superstructure Module. Every change commits atomically to the
 * document (atomic -> validate -> write -> Auto Save). NOT_AUTHORIZED / HOLD
 * areas are rendered as read-only / HOLD so they are never shown as computed.
 *
 * Field mapping follows Phase 9-02 Design Freeze (Apollo field -> document
 * field). Phase 9-04R3 adds the remaining S-01 fields: cross beams (spacing /
 * depth / width), bearings (type / fixed-or-movable), material configuration
 * (E/G/nu/rho, Phase 7-01C §3.1), and the AUTHORIZED dead-load view.
 */

import { useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { readSuperstructureDocument, writeSuperstructureDocument } from "../modules/superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../modules/superstructure/superstructurePersistence";
import { deriveGirderOffsets } from "../modules/superstructure/superstructureDocumentDomain";
import { computeSuperstructureSectionProperties, buildCrossBeamConfiguration } from "../modules/superstructure/superstructureComponents";
import { buildSuperstructureDxf, downloadSuperstructureDxf } from "../modules/superstructure/superstructureDxf";
import { buildDeadLoads } from "../modules/superstructure/superstructureLoadModel";
import type { BearingSeat, CrossBeamConfiguration, MaterialConfiguration, SuperstructureDocument } from "../modules/superstructure/superstructureTypes";

export const SUPERSTRUCTURE_RESCUE_FLAG = "VITE_SUPERSTRUCTURE_RESCUE";
export function isSuperstructureRescueEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.[SUPERSTRUCTURE_RESCUE_FLAG] === "true";
}

/** Frozen engineering default steel (Phase 7-01C §3.1) shown as the declared baseline. */
export const DEFAULT_MATERIAL_CONFIGURATION: MaterialConfiguration = {
  elasticModulusKN_M2: 205000000,
  shearModulusKN_M2: 80000000,
  poissonRatio: 0.3,
  densityKN_M3: 78.5,
};

interface NumericField {
  readonly label: string;
  readonly unit: string;
  readonly get: (doc: SuperstructureDocument) => number | null;
  readonly set: (doc: SuperstructureDocument, value: number | null) => SuperstructureDocument;
  readonly optional?: boolean;
}

function NumericInput({ label, unit, value, onChange, optional }: {
  label: string; unit: string; value: number | null; onChange: (v: number | null) => void; optional?: boolean;
}) {
  return (
    <label className="next-field">
      <span>{label}（{unit}）</span>
      <input
        type="number"
        step="0.01"
        value={value === null ? "" : String(value)}
        data-testid={`super-field-${label}`}
        onChange={(e) => {
          const text = e.currentTarget.value;
          if (text.trim() === "" && optional) {
            onChange(null);
            return;
          }
          const n = Number(text);
          if (Number.isFinite(n)) {
            onChange(n);
          }
        }}
      />
    </label>
  );
}

export function SuperstructureRescuePanel({ projectId }: { projectId: string }) {
  const manager = getProjectManager();
  const [message, setMessage] = useState<string | null>(null);
  const [doc, setDoc] = useState<SuperstructureDocument | null>(() => {
    const raw = readSuperstructureDocument(manager, projectId);
    return raw ? regenerateSuperstructureDerived(manager, projectId, raw) : null;
  });

  const sectionProps = useMemo(() => {
    if (!doc) return null;
    const totalSpan = (doc.spanReferences?.spans ?? []).reduce((s, sp) => s + sp.spanLength, 0);
    return computeSuperstructureSectionProperties(
      doc.girderConfiguration.girderSectionModel,
      totalSpan > 0 ? totalSpan : 30,
    );
  }, [doc]);

  function commit(next: SuperstructureDocument): void {
    const write = writeSuperstructureDocument(manager, projectId, next);
    if (!write.ok) {
      setMessage("保存できませんでした（validation NG・fail-closed）。");
      return;
    }
    setDoc(next);
    setMessage("SuperstructureDocument へ保存しました（Auto Save）。");
    void manager.flushPendingSaves();
  }

  const fields: NumericField[] = [
    {
      label: "主桁本数",
      unit: "本",
      get: (d) => d.girderConfiguration.girderCount,
      set: (d, v) => ({
        ...d,
        girderConfiguration: {
          ...d.girderConfiguration,
          girderCount: Math.max(1, Math.round(v ?? 1)),
          girderLines: v !== null && v >= 1 && d.girderConfiguration.girderSpacingM
            ? buildGirderLines(Math.round(v), d.girderConfiguration.girderSpacingM)
            : d.girderConfiguration.girderLines,
        },
      }),
    },
    {
      label: "主桁間隔",
      unit: "m",
      get: (d) => d.girderConfiguration.girderSpacingM,
      set: (d, v) => ({
        ...d,
        girderConfiguration: {
          ...d.girderConfiguration,
          girderSpacingM: v,
          girderLines: v !== null ? buildGirderLines(d.girderConfiguration.girderCount, v) : d.girderConfiguration.girderLines,
        },
      }),
    },
    {
      label: "主桁高",
      unit: "m",
      get: (d) => d.girderConfiguration.girderSectionModel.depthM,
      set: (d, v) => ({ ...d, girderConfiguration: { ...d.girderConfiguration, girderSectionModel: { ...d.girderConfiguration.girderSectionModel, depthM: v } } }),
    },
    {
      label: "ウェブ厚",
      unit: "m",
      get: (d) => d.girderConfiguration.girderSectionModel.webThicknessM,
      set: (d, v) => ({ ...d, girderConfiguration: { ...d.girderConfiguration, girderSectionModel: { ...d.girderConfiguration.girderSectionModel, webThicknessM: v } } }),
    },
    {
      label: "上フランジ幅",
      unit: "m",
      get: (d) => d.girderConfiguration.girderSectionModel.topFlange?.widthM ?? null,
      set: (d, v) => ({ ...d, girderConfiguration: { ...d.girderConfiguration, girderSectionModel: { ...d.girderConfiguration.girderSectionModel, topFlange: { ...d.girderConfiguration.girderSectionModel.topFlange!, widthM: v ?? 0 } } } }),
    },
    {
      label: "上フランジ厚",
      unit: "m",
      get: (d) => d.girderConfiguration.girderSectionModel.topFlange?.thicknessM ?? null,
      set: (d, v) => ({ ...d, girderConfiguration: { ...d.girderConfiguration, girderSectionModel: { ...d.girderConfiguration.girderSectionModel, topFlange: { ...d.girderConfiguration.girderSectionModel.topFlange!, thicknessM: v ?? 0 } } } }),
    },
    {
      label: "下フランジ幅",
      unit: "m",
      get: (d) => d.girderConfiguration.girderSectionModel.bottomFlange?.widthM ?? null,
      set: (d, v) => ({ ...d, girderConfiguration: { ...d.girderConfiguration, girderSectionModel: { ...d.girderConfiguration.girderSectionModel, bottomFlange: { ...d.girderConfiguration.girderSectionModel.bottomFlange!, widthM: v ?? 0 } } } }),
    },
    {
      label: "下フランジ厚",
      unit: "m",
      get: (d) => d.girderConfiguration.girderSectionModel.bottomFlange?.thicknessM ?? null,
      set: (d, v) => ({ ...d, girderConfiguration: { ...d.girderConfiguration, girderSectionModel: { ...d.girderConfiguration.girderSectionModel, bottomFlange: { ...d.girderConfiguration.girderSectionModel.bottomFlange!, thicknessM: v ?? 0 } } } }),
    },
    {
      label: "床版厚",
      unit: "m",
      get: (d) => d.deckConfiguration.thicknessM,
      set: (d, v) => ({ ...d, deckConfiguration: { ...d.deckConfiguration, thicknessM: v } }),
    },
    {
      label: "RC単位体積重量",
      unit: "kN/m3",
      get: (d) => d.deckConfiguration.unitWeight,
      set: (d, v) => ({ ...d, deckConfiguration: { ...d.deckConfiguration, unitWeight: v } }),
    },
    {
      label: "張出左",
      unit: "m",
      get: (d) => d.deckConfiguration.overhangLeftM,
      set: (d, v) => ({ ...d, deckConfiguration: { ...d.deckConfiguration, overhangLeftM: v } }),
    },
    {
      label: "張出右",
      unit: "m",
      get: (d) => d.deckConfiguration.overhangRightM,
      set: (d, v) => ({ ...d, deckConfiguration: { ...d.deckConfiguration, overhangRightM: v } }),
    },
    // Cross beams (S-02 / crossBeamSpacingM)
    {
      label: "横桁間隔",
      unit: "m",
      get: (d) => d.crossBeamConfiguration?.crossBeamSpacingM ?? null,
      set: (d, v) => {
        const spacing = v ?? null;
        if (spacing === null) return { ...d, crossBeamConfiguration: null };
        return { ...d, crossBeamConfiguration: rebuildCrossBeams(d, spacing) };
      },
    },
    {
      label: "横桁せい",
      unit: "m",
      get: (d) => d.crossBeamConfiguration?.crossBeams.find((c) => c.depthM !== null)?.depthM ?? null,
      set: (d, v) => ({ ...d, crossBeamConfiguration: setCrossBeamDim(d.crossBeamConfiguration, "depthM", v) }),
    },
    {
      label: "横桁幅",
      unit: "m",
      get: (d) => d.crossBeamConfiguration?.crossBeams.find((c) => c.widthM !== null)?.widthM ?? null,
      set: (d, v) => ({ ...d, crossBeamConfiguration: setCrossBeamDim(d.crossBeamConfiguration, "widthM", v) }),
    },
    // Cross frame (Phase 9-02 Freeze convert: swayBracingInterval/lateralBracingEnabled)
    {
      label: "横構（sway）間隔",
      unit: "m",
      get: (d) => d.crossFrameConfiguration?.swayBracing.intervalM ?? null,
      set: (d, v) => ({ ...d, crossFrameConfiguration: setCrossFrameInterval(d.crossFrameConfiguration, "swayBracing", v) }),
    },
    {
      label: "横構（lateral）間隔",
      unit: "m",
      get: (d) => d.crossFrameConfiguration?.lateralBracing.intervalM ?? null,
      set: (d, v) => ({ ...d, crossFrameConfiguration: setCrossFrameInterval(d.crossFrameConfiguration, "lateralBracing", v) }),
    },
    // Material (Phase 7-01C §3.1): E / G / nu / rho
    {
      label: "鋼弾性係数",
      unit: "kN/m2",
      get: (d) => d.materialConfiguration?.elasticModulusKN_M2 ?? null,
      set: (d, v) => ({ ...d, materialConfiguration: setMaterialField(d.materialConfiguration, "elasticModulusKN_M2", v) }),
    },
    {
      label: "鋼せん断弾性係数",
      unit: "kN/m2",
      get: (d) => d.materialConfiguration?.shearModulusKN_M2 ?? null,
      set: (d, v) => ({ ...d, materialConfiguration: setMaterialField(d.materialConfiguration, "shearModulusKN_M2", v) }),
    },
    {
      label: "鋼ポアソン比",
      unit: "—",
      get: (d) => d.materialConfiguration?.poissonRatio ?? null,
      set: (d, v) => ({ ...d, materialConfiguration: setMaterialField(d.materialConfiguration, "poissonRatio", v) }),
    },
    {
      label: "鋼密度",
      unit: "kN/m3",
      get: (d) => d.materialConfiguration?.densityKN_M3 ?? null,
      set: (d, v) => ({ ...d, materialConfiguration: setMaterialField(d.materialConfiguration, "densityKN_M3", v) }),
    },
  ];

  if (!doc) {
    return (
      <div className="next-road-editor-block" data-testid="super-rescue">
        <h3 className="next-hint">上部工Rescue（救出Editor）</h3>
        <p className="next-hint">上部工Documentがありません。「上部工を生成」を先に実行してください。</p>
      </div>
    );
  }

  const deckWidth = doc.deckConfiguration.resolvedWidthM
    ?? Math.max((doc.deckConfiguration.overhangLeftM ?? 0) + (doc.deckConfiguration.overhangRightM ?? 0), 8);

  return (
    <div className="next-road-editor-block" data-testid="super-rescue">
      <h3 className="next-hint">上部工Rescue（救出Editor・Canonical=SuperstructureDocument）</h3>

      <div className="next-form-grid">
        {fields.map((f) => (
          <NumericInput
            key={f.label}
            label={f.label}
            unit={f.unit}
            optional={f.optional}
            value={f.get(doc)}
            onChange={(v) => commit(f.set(doc, v))}
          />
        ))}
      </div>

      {message !== null && <p className="next-hint" data-testid="super-rescue-message">{message}</p>}

      <h4 className="next-hint">断面性能（NOT_AUTHORIZED・計算結果は参考）</h4>
      {sectionProps && (
        <dl className="next-integrity-meta" data-testid="super-section-props">
          <div><dt>総断面積</dt><dd>{sectionProps.totalArea.toFixed(4)} m²</dd></div>
          <div><dt>図心高さ</dt><dd>{sectionProps.centroidFromBottom.toFixed(3)} m</dd></div>
          <div><dt>断面2次モーメント</dt><dd>{sectionProps.secondMomentOfArea.toFixed(4)} m⁴</dd></div>
        </dl>
      )}

      <h4 className="next-hint">2Dプレビュー（主桁配置・横断）</h4>
      <SuperstructureCrossSectionPreview
        doc={doc}
        deckWidth={deckWidth}
        data-testid="super-cross-preview"
      />

      <h4 className="next-hint">支承（Phase 9-02 FROZEN・support×girder）</h4>
      <BearingEditor doc={doc} onChange={(next) => commit(next)} />

      <h4 className="next-hint">AUTHORIZED荷重（DL-STRUCTURAL + DL-DECK・FROZEN load model）</h4>
      <AuthorizedLoadView doc={doc} />

      <SuperstructureOutputs doc={doc} />

      <p className="next-hint">照査・応力度・たわみ等は NOT_AUTHORIZED（HOLD）です。「計算済み」とは表示しません。</p>
    </div>
  );
}

function buildGirderLines(girderCount: number, spacingM: number) {
  const offsets = deriveGirderOffsets(girderCount, spacingM) ?? [];
  return offsets.map((offset, index) => ({
    girderId: `G${index + 1}`,
    index,
    label: `G${index + 1}`,
    offsetFromCenterline: offset,
    offsetEndFromCenterline: offset,
    materialRefId: null,
    sectionIntentRefId: null,
  }));
}

/** Rebuild the cross beam configuration from the support stations + spacing. */
function rebuildCrossBeams(doc: SuperstructureDocument, spacingM: number): CrossBeamConfiguration {
  const supports = (doc.supportReferences?.supports ?? []).map((s) => ({
    supportId: s.supportId,
    station: s.station,
    supportType: s.supportType,
  }));
  const previous = doc.crossBeamConfiguration?.crossBeams ?? [];
  if (supports.length === 0) {
    // supportReferences are transient (regenerated from Bridge Layout on
    // restore). Without resolvable stations, preserve the declared beams and
    // only update the spacing (fail-safe; never invent stations).
    return { crossBeamSpacingM: spacingM, crossBeams: previous };
  }
  const config = buildCrossBeamConfiguration(supports, spacingM);
  // preserve declared dimensions from the previous configuration
  const withDims = config.crossBeams.map((beam) => {
    const prev = previous.find((p) => p.crossBeamId === beam.crossBeamId);
    return prev ? { ...beam, depthM: prev.depthM, widthM: prev.widthM } : beam;
  });
  return { crossBeamSpacingM: spacingM, crossBeams: withDims };
}

/** Apply a declared dimension (depthM/widthM) to every cross beam. */
function setCrossBeamDim(
  config: CrossBeamConfiguration | null,
  key: "depthM" | "widthM",
  value: number | null,
): CrossBeamConfiguration | null {
  if (config === null) return null;
  return {
    ...config,
    crossBeams: config.crossBeams.map((beam) => ({ ...beam, [key]: value })),
  };
}

/** Apply a cross frame interval; initializes the configuration when absent. */
function setCrossFrameInterval(
  config: SuperstructureDocument["crossFrameConfiguration"],
  key: "swayBracing" | "lateralBracing",
  value: number | null,
): SuperstructureDocument["crossFrameConfiguration"] {
  if (value === null || !(value > 0)) return config;
  const base = config ?? {
    crossFrameSpacingM: value,
    swayBracing: { intervalM: 8 },
    lateralBracing: { intervalM: 8 },
  };
  return {
    ...base,
    crossFrameSpacingM: base.crossFrameSpacingM,
    swayBracing: { intervalM: key === "swayBracing" ? value : base.swayBracing.intervalM },
    lateralBracing: { intervalM: key === "lateralBracing" ? value : base.lateralBracing.intervalM },
  };
}

/** Apply a material field; initializes the configuration with the frozen default when absent. */
function setMaterialField(
  config: MaterialConfiguration | null,
  key: keyof MaterialConfiguration,
  value: number | null,
): MaterialConfiguration | null {
  const base = config ?? DEFAULT_MATERIAL_CONFIGURATION;
  return { ...base, [key]: value };
}

function SuperstructureCrossSectionPreview({ doc, deckWidth }: { doc: SuperstructureDocument; deckWidth: number }) {
  const W = 320;
  const H = 180;
  const center = W / 2;
  const scale = (W - 40) / Math.max(deckWidth, 6);
  const deckHalf = (deckWidth / 2) * scale;
  const girderDepth = Math.max(doc.girderConfiguration.girderSectionModel.depthM ?? 1, 0.2) * scale * 0.15;
  const lines = doc.girderConfiguration.girderLines;

  return (
    <svg width={W} height={H} className="next-preview-svg" data-testid="super-cross-section-preview">
      <rect width={W} height={H} fill="#f8fafc" stroke="#e2e8f0" />
      {/* deck */}
      <rect x={center - deckHalf} y={40} width={deckHalf * 2} height={12} fill="#9aa5b1" stroke="#64748b" />
      {/* girders */}
      {lines.map((line) => {
        const x = center + line.offsetFromCenterline * scale;
        return (
          <rect key={line.girderId} x={x - 4} y={52} width={8} height={girderDepth} fill="#4a6fa5" stroke="#1e3a5f" />
        );
      })}
      {/* labels */}
      {lines.map((line) => (
        <text key={`${line.girderId}-t`} x={center + line.offsetFromCenterline * scale} y={H - 10} fontSize="9" textAnchor="middle" fill="#334155">
          {line.label}
        </text>
      ))}
      <text x={center} y={24} fontSize="10" textAnchor="middle" fill="#475569">床版厚 {doc.deckConfiguration.thicknessM ?? "—"}m / 幅 {deckWidth}m</text>
    </svg>
  );
}

/**
 * Bearing editor: per-support bearing type + fixed/movable selection applied to
 * every bearing seat of that support (support x girder). Canonical commit via
 * the panel onChange (validate -> write -> Auto Save).
 */
function BearingEditor({ doc, onChange }: { doc: SuperstructureDocument; onChange: (next: SuperstructureDocument) => void }) {
  const relationSupports = doc.bearingConfiguration.bearingSupportRelation;
  const supportIds = [...new Set(relationSupports.map((r) => r.supportId))];
  if (supportIds.length === 0) {
    return <p className="next-hint">支承配置には Bridge Layout の support が必要です。</p>;
  }
  return (
    <div className="cim-layer-list" data-testid="super-bearing-editor">
      {supportIds.map((supportId) => {
        const seats = doc.bearingConfiguration.bearingSeats.filter((s) => s.supportId === supportId);
        if (seats.length === 0) return null;
        const seat = seats[0]!;
        return (
          <div key={supportId} className="next-form-grid" data-testid={`super-bearing-${supportId}`}>
            <span className="next-hint">{supportId}（seat {seats.length}件）</span>
            <label className="next-field">
              <span>支承種別</span>
              <select
                data-testid={`super-bearing-type-${supportId}`}
                value={seat.bearingType ?? ""}
                onChange={(e) => {
                  const bearingType = (e.currentTarget.value === "" ? null : e.currentTarget.value) as BearingSeat["bearingType"];
                  onChange(updateSeats(doc, supportId, { bearingType }));
                }}
              >
                <option value="">未指定</option>
                <option value="rubber">ゴム支承</option>
                <option value="fixed">固定支承</option>
                <option value="movable">可動支承</option>
              </select>
            </label>
            <label className="next-field">
              <span>固定/可動</span>
              <select
                data-testid={`super-bearing-fixed-${supportId}`}
                value={seat.fixedOrMovable}
                onChange={(e) => {
                  const fixedOrMovable = e.currentTarget.value as BearingSeat["fixedOrMovable"];
                  onChange(updateSeats(doc, supportId, { fixedOrMovable }));
                }}
              >
                <option value="FIXED">FIXED</option>
                <option value="MOVABLE">MOVABLE</option>
                <option value="UNDECIDED">UNDECIDED</option>
              </select>
            </label>
          </div>
        );
      })}
    </div>
  );
}

function updateSeats(
  doc: SuperstructureDocument,
  supportId: string,
  patch: Partial<Pick<BearingSeat, "bearingType" | "fixedOrMovable">>,
): SuperstructureDocument {
  return {
    ...doc,
    bearingConfiguration: {
      ...doc.bearingConfiguration,
      bearingSeats: doc.bearingConfiguration.bearingSeats.map((seat) =>
        seat.supportId === supportId ? { ...seat, ...patch } : seat,
      ),
    },
  };
}

/** AUTHORIZED dead-load view: DL-STRUCTURAL + DL-DECK from the FROZEN load model. */
function AuthorizedLoadView({ doc }: { doc: SuperstructureDocument }) {
  const dead = buildDeadLoads(doc);
  const rows = [
    { name: "DL-STRUCTURAL（主桁自重）", entry: dead.structuralGirder },
    { name: "DL-STRUCTURAL（二次部材）", entry: dead.structuralSecondary },
    { name: "DL-DECK（床版自重）", entry: dead.deck },
    { name: "DL-PAVEMENT", entry: dead.pavement },
    { name: "DL-APPURTENANCE", entry: dead.appurtenances },
  ];
  return (
    <dl className="next-integrity-meta" data-testid="super-authorized-load">
      {rows.map((row) => (
        <div key={row.name}>
          <dt>{row.name}</dt>
          <dd data-testid={`super-load-${row.name}`}>
            {row.entry.valueKN !== null ? `${row.entry.valueKN.toFixed(1)} kN` : "—"}
            <span className="next-hint">（{row.entry.state}）</span>
          </dd>
        </div>
      ))}
      <p className="next-hint">AUTHORIZED範囲は DL-STRUCTURAL + DL-DECK のみ。未認可荷重は生成しません。</p>
    </dl>
  );
}

/** Outputs: 2D plan, quantity, DXF export (S-04/05/06). */
function SuperstructureOutputs({ doc }: { doc: SuperstructureDocument }) {
  const [dxfMsg, setDxfMsg] = useState<string | null>(null);
  const totalSpan = (doc.spanReferences?.spans ?? []).reduce((s, sp) => s + sp.spanLength, 0) || 30;
  const girderOffsets = deriveGirderOffsets(doc.girderConfiguration.girderCount, doc.girderConfiguration.girderSpacingM) ?? [0];
  const section = doc.girderConfiguration.girderSectionModel;

  // Quantity (S-06): steel weight + deck volume from canonical inputs.
  const totalArea = computeSuperstructureSectionProperties(section, totalSpan)?.totalArea ?? 0;
  const steelWeight = totalArea * (section.unitWeightPerM ?? 77.0) * totalSpan * doc.girderConfiguration.girderCount;
  const deckVolume = (doc.deckConfiguration.resolvedWidthM ?? 12) * (doc.deckConfiguration.thicknessM ?? 0.24) * totalSpan;

  function handleDxf() {
    try {
      const dxf = buildSuperstructureDxf(doc, { view: "plan" });
      downloadSuperstructureDxf(dxf);
      setDxfMsg("DXF（plan）を書き出しました。");
    } catch (error) {
      setDxfMsg(`DXF書き出し失敗: ${String(error)}`);
    }
  }

  return (
    <>
      <h4 className="next-hint">2D General Arrangement（plan・主桁/床版/横桁）</h4>
      <SuperstructurePlanView doc={doc} totalSpan={totalSpan} deckWidth={doc.deckConfiguration.resolvedWidthM ?? 12} girderOffsets={girderOffsets} />

      <h4 className="next-hint">Quantity（DERIVED・canonicalから導出）</h4>
      <dl className="next-integrity-meta" data-testid="super-quantity">
        <div><dt>主桁本数</dt><dd>{doc.girderConfiguration.girderCount} 本</dd></div>
        <div><dt>鋼材重量（概算）</dt><dd>{steelWeight.toFixed(1)} kN</dd></div>
        <div><dt>床版体積</dt><dd>{deckVolume.toFixed(1)} m³</dd></div>
        <div><dt>桁長（span合計）</dt><dd>{totalSpan.toFixed(1)} m</dd></div>
      </dl>

      <div className="next-form-actions">
        <button type="button" className="next-secondary" data-testid="super-dxf-export" onClick={handleDxf}>
          DXF（plan）書き出し
        </button>
        {dxfMsg && <span className="next-hint" data-testid="super-dxf-message">{dxfMsg}</span>}
      </div>
    </>
  );
}

function SuperstructurePlanView({ doc, totalSpan, deckWidth, girderOffsets }: {
  doc: SuperstructureDocument; totalSpan: number; deckWidth: number; girderOffsets: number[];
}) {
  const W = 480;
  const H = 140;
  const sx = (v: number) => 30 + (v / Math.max(totalSpan, 1)) * (W - 60);
  const sy = (v: number) => H / 2 - (v / Math.max(deckWidth, 6)) * 40;
  return (
    <svg width={W} height={H} className="next-preview-svg" data-testid="super-plan-view">
      <rect width={W} height={H} fill="#f8fafc" stroke="#e2e8f0" />
      {/* deck edges */}
      <line x1={sx(0)} y1={sy(-deckWidth / 2)} x2={sx(totalSpan)} y2={sy(-deckWidth / 2)} stroke="#9aa5b1" strokeWidth="2" />
      <line x1={sx(0)} y1={sy(deckWidth / 2)} x2={sx(totalSpan)} y2={sy(deckWidth / 2)} stroke="#9aa5b1" strokeWidth="2" />
      {/* girders */}
      {girderOffsets.map((offset, i) => (
        <line key={i} x1={sx(0)} y1={sy(offset)} x2={sx(totalSpan)} y2={sy(offset)} stroke="#4a6fa5" strokeWidth="2" />
      ))}
      {/* cross beams */}
      {Array.from({ length: 5 }, (_, i) => i * totalSpan / 4).map((s) => (
        <line key={s} x1={sx(s)} y1={sy(-deckWidth / 2)} x2={sx(s)} y2={sy(deckWidth / 2)} stroke="#6b7d99" strokeWidth="1" />
      ))}
      <text x={W / 2} y={H - 8} fontSize="10" textAnchor="middle" fill="#475569">
        span {totalSpan.toFixed(1)}m / girder {doc.girderConfiguration.girderCount}本 / spacing {doc.girderConfiguration.girderSpacingM ?? "—"}m
      </text>
    </svg>
  );
}
