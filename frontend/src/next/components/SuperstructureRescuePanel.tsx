/**
 * Superstructure Rescue Editor (Phase 9-03 WP-A/C).
 *
 * Controlled editor that edits the canonical SuperstructureDocument from the
 * regular /app Superstructure Module. Every change commits atomically to the
 * document (atomic -> validate -> write -> Auto Save). NOT_AUTHORIZED / HOLD
 * areas are rendered as read-only / HOLD so they are never shown as computed.
 *
 * Field mapping follows Phase 9-02 Design Freeze (Apollo field -> document field).
 */

import { useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { readSuperstructureDocument, writeSuperstructureDocument } from "../modules/superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../modules/superstructure/superstructurePersistence";
import { deriveGirderOffsets } from "../modules/superstructure/superstructureDocumentDomain";
import { computeSuperstructureSectionProperties } from "../modules/superstructure/superstructureComponents";
import type { SuperstructureDocument } from "../modules/superstructure/superstructureTypes";

export const SUPERSTRUCTURE_RESCUE_FLAG = "VITE_SUPERSTRUCTURE_RESCUE";
export function isSuperstructureRescueEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.[SUPERSTRUCTURE_RESCUE_FLAG] === "true";
}

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
