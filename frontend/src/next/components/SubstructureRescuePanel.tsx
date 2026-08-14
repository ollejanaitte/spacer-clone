/**
 * Substructure Rescue Editor (Phase 9-03 WP-E/F/G).
 *
 * Controlled editor that edits the canonical SubstructureDocument from the
 * regular /app Substructure Module. Supports (A1/P1..Pn/A2), pier / abutment
 * shapes, footing and pile groups are edited per-support and committed
 * atomically to the document (atomic -> validate -> write -> Auto Save).
 *
 * Design / verification checks remain HOLD_NOT_AVAILABLE (NOT_AUTHORIZED) and
 * are never shown as computed.
 */

import { useMemo, useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { readSubstructureDocument, writeSubstructureDocument } from "../modules/substructureModuleAdapter";
import type { SubstructureDocument, SubstructureSupport } from "../modules/substructure/substructureTypes";

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
    set: (s, v) => s.pier ? ({ ...s, pier: write(s.pier, v) }) : s,
  };
}

function abutmentField(key: string, label: string, path: (a: NonNullable<SubstructureSupport["abutment"]>) => number | null, write: (a: NonNullable<SubstructureSupport["abutment"]>, v: number | null) => NonNullable<SubstructureSupport["abutment"]>): DimField {
  return {
    key,
    label,
    unit: "m",
    get: (s) => (s.abutment ? path(s.abutment) : null),
    set: (s, v) => s.abutment ? ({ ...s, abutment: write(s.abutment, v) }) : s,
  };
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
    pierField("pile-diameter", "杭径", (p) => p.pileGroup?.diameter ?? null, (p, v) => ({ ...p, pileGroup: p.pileGroup ? { ...p.pileGroup, diameter: v ?? 0 } : undefined })),
    pierField("pile-length", "杭長", (p) => p.pileGroup?.length ?? null, (p, v) => ({ ...p, pileGroup: p.pileGroup ? { ...p.pileGroup, length: v ?? 0 } : undefined })),
    pierField("pile-count", "杭本数", (p) => p.pileGroup?.pileCount ?? null, (p, v) => ({ ...p, pileGroup: p.pileGroup ? { ...p.pileGroup, pileCount: Math.max(1, Math.round(v ?? 1)) } : undefined })),
  ];

  const abutmentFields: DimField[] = [
    abutmentField("backwall-height", "背壁高", (a) => a.backwall?.height ?? null, (a, v) => ({ ...a, backwall: { id: a.backwall?.id ?? "bw", height: v ?? 0, thickness: a.backwall?.thickness ?? 0.5, width: a.backwall?.width ?? 5, seatElevation: a.backwall?.seatElevation ?? 0 } })),
    abutmentField("backwall-thickness", "背壁厚", (a) => a.backwall?.thickness ?? null, (a, v) => ({ ...a, backwall: { id: a.backwall?.id ?? "bw", height: a.backwall?.height ?? 3, thickness: v ?? 0, width: a.backwall?.width ?? 5, seatElevation: a.backwall?.seatElevation ?? 0 } })),
    abutmentField("abutment-footing-length", "フーチング長", (a) => a.footing?.length ?? null, (a, v) => ({ ...a, footing: { id: a.footing?.id ?? "aft", length: v ?? 0, width: a.footing?.width ?? 5, thickness: a.footing?.thickness ?? 1.5, topElevation: a.footing?.topElevation ?? 0 } })),
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
      <h3 className="next-hint">下部工Rescue（救出Editor・Canonical=SubstructureDocument）</h3>

      <h4 className="next-hint">Support選択</h4>
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
            <span>{s.supportId}（{s.supportType}）station {s.placement.station ?? "—"} m</span>
          </label>
        ))}
      </div>

      {selected && (
        <>
          <h4 className="next-hint">{selected.supportId} の設計寸法（{selected.supportType}）</h4>
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
        </>
      )}

      {message !== null && <p className="next-hint" data-testid="sub-rescue-message">{message}</p>}

      <p className="next-hint" data-testid="sub-rescue-hold">
        安定・断面力・応力・照査・配筋・耐震は HOLD_NOT_AVAILABLE（NOT_AUTHORIZED）です。
        「計算済み」とは表示しません。
      </p>
    </div>
  );
}
