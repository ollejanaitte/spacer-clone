import { useMemo, useRef } from "react";
import type {
  BridgeProject,
  Span,
  SpanLayoutInputMode,
  SupportPoint,
  SupportPointKind,
} from "../types";
import { addSpan, removeSpan, totalLength } from "../BridgeWizardState";
import {
  SpanLayoutCsvError,
  SpanLayoutError,
  SUPPORT_KIND_LABELS,
  addSupport,
  buildSpansFromSupports,
  defaultSpanLayoutFromSpans,
  ensureSpanLayout,
  parseSpanLayoutCsv,
  removeSupport,
  setSpanLayout,
  spanLayoutTemplateCsv,
  syncProjectSpansFromLayout,
  updateSupport,
} from "../spanLayout";
import { ensureRoadAlignment } from "../roadAlignment";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
};

function updateSpan(
  project: BridgeProject,
  index: number,
  patch: Partial<Span>,
): BridgeProject {
  const spans = project.spans.map((s) => (s.index === index ? { ...s, ...patch } : s));
  return { ...project, spans };
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const SUPPORT_KINDS: SupportPointKind[] = ["abutment", "pier"];

function isSupportKind(v: string): v is SupportPointKind {
  return (SUPPORT_KINDS as string[]).includes(v);
}

export function Step2SpanSetting({ project, onChange }: Props) {
  const total = totalLength(project.spans);
  const layout = useMemo(() => ensureSpanLayout(project), [project]);
  const alignment = useMemo(() => ensureRoadAlignment(project), [project]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputMode: SpanLayoutInputMode = layout.inputMode;

  const setInputMode = (mode: SpanLayoutInputMode) => {
    if (mode === "simple") {
      const next = defaultSpanLayoutFromSpans(project.spans, "simple");
      onChange(syncProjectSpansFromLayout(setSpanLayout(project, next), next));
    } else {
      const next = {
        ...layout,
        inputMode: "station" as SpanLayoutInputMode,
      };
      onChange(setSpanLayout(project, next));
    }
  };

  const handleAdd = () => {
    try {
      const lastStation = layout.supports[layout.supports.length - 1]?.station ?? 0;
      const totalLen = alignment.points.length
        ? Math.max(
            alignment.points[alignment.points.length - 1].station,
            lastStation + 10,
          )
        : lastStation + 10;
      const newName = `P${layout.supports.filter((s) => s.type === "pier").length + 1}`;
      const next = addSupport(layout, {
        name: newName,
        type: "pier",
        station: Math.min(lastStation + 10, totalLen - 0.001),
      });
      onChange(setSpanLayout(project, next));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleUpdate = (name: string, patch: Partial<SupportPoint>) => {
    try {
      const next = updateSupport(layout, name, patch);
      onChange(setSpanLayout(project, next));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRemove = (name: string) => {
    try {
      const next = removeSupport(layout, name);
      onChange(setSpanLayout(project, next));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDownloadTemplate = () => {
    downloadText("support_layout_template.csv", spanLayoutTemplateCsv());
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const supports = parseSpanLayoutCsv(text, alignment);
      const next = { ...layout, supports, spans: buildSpansFromSupports(supports) };
      onChange(syncProjectSpansFromLayout(setSpanLayout(project, next), next));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`支点位置 CSV の読込に失敗しました: ${msg}`);
    }
  };

  return (
    <div className="bw-step bw-step-span">
      <h2>Step 2 / 6 支間設定</h2>
      <p className="bw-hint">橋軸方向の支間長さを設定してください。支間の追加・削除ができます。</p>
      <table className="bw-table">
        <thead>
          <tr>
            <th>支間</th>
            <th>支間長 (m)</th>
            <th>オフセット (m)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {project.spans.map((sp) => (
            <tr key={sp.index}>
              <td>P{sp.index}</td>
              <td>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={sp.length}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onChange(
                      updateSpan(project, sp.index, {
                        length: Number.isFinite(v) ? Math.max(0.1, v) : 0.1,
                      }),
                    );
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={sp.offset}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onChange(
                      updateSpan(project, sp.index, {
                        offset: Number.isFinite(v) ? Math.max(0, v) : 0,
                      }),
                    );
                  }}
                />
              </td>
              <td>
                {project.spans.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...project, spans: removeSpan(project.spans, sp.index) })}
                  >
                    削除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="bw-button-primary"
        onClick={() => {
          const nextSpans = addSpan(project.spans);
          const updated = { ...project, spans: nextSpans };
          const refreshed = syncProjectSpansFromLayout(
            updated,
            defaultSpanLayoutFromSpans(nextSpans, "simple"),
          );
          onChange(refreshed);
        }}
      >
        + 支間追加
      </button>
      <div className="bw-summary">
        <strong>合計橋長: {total.toFixed(3)} m</strong>
        <span>（{project.spans.length} 支間）</span>
      </div>

      <section className="bw-support-layout">
        <h3>支点・橋脚位置</h3>
        <p className="bw-hint">
          中心線形 (Step1) の station 位置で A1 / P1.. / A2 を定義します。Step1 で「座標入力」を選んでいる場合は、CSV 読込で station を直接指定できます。
        </p>
        <div className="bw-mode-buttons" role="tablist" aria-label="支点位置 入力方式">
          {(["simple", "station"] as SpanLayoutInputMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={inputMode === m}
              className={inputMode === m ? "bw-mode active" : "bw-mode"}
              onClick={() => setInputMode(m)}
            >
              {m === "simple" ? "簡易入力" : "座標入力 / 中心線測点"}
            </button>
          ))}
          <button type="button" className="bw-button-secondary" onClick={handleDownloadTemplate}>
            支点位置CSV様式ダウンロード
          </button>
          <label className="bw-file">
            支点位置CSV読込
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <table className="bw-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>種別</th>
              <th>station (m)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {layout.supports.map((sp) => (
              <tr key={sp.name}>
                <td>{sp.name}</td>
                <td>
                  <select
                    value={sp.type}
                    onChange={(e) => {
                      if (!isSupportKind(e.target.value)) return;
                      handleUpdate(sp.name, { type: e.target.value });
                    }}
                    disabled={sp === layout.supports[0] || sp === layout.supports[layout.supports.length - 1]}
                  >
                    {SUPPORT_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {SUPPORT_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    value={sp.station}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      handleUpdate(sp.name, { station: Number.isFinite(v) ? Math.max(0, v) : 0 });
                    }}
                  />
                </td>
                <td>
                  {layout.supports.length > 2 &&
                    sp !== layout.supports[0] &&
                    sp !== layout.supports[layout.supports.length - 1] && (
                      <button type="button" onClick={() => handleRemove(sp.name)}>
                        削除
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="bw-button-secondary" onClick={handleAdd}>
          + 支点追加 (Pier)
        </button>

        <div className="bw-summary">
          <strong>支間割:</strong>
          <ul>
            {layout.spans.map((seg, i) => (
              <li key={i}>
                {seg.from} → {seg.to}: {seg.length.toFixed(3)} m
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

// エラー型をre-export
export { SpanLayoutCsvError, SpanLayoutError };
