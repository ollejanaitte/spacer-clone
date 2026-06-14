import { useMemo, useRef } from "react";
import type { BridgeProject, CrossSection, RoadAlignmentInputMode } from "../types";
import { yPositionsFor } from "../BridgeWizardState";
import {
  RoadAlignmentCsvError,
  alignmentEnd,
  alignmentStart,
  defaultStraightRoadAlignment,
  importRoadAlignmentCsv,
  pointAtStation,
  roadAlignmentTemplateCsv,
  setRoadAlignment,
  totalAlignmentLength,
} from "../roadAlignment";
import { AlignmentPreview } from "../viewer/AlignmentPreview";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
};

function updateCross(
  project: BridgeProject,
  patch: Partial<CrossSection>,
): BridgeProject {
  return { ...project, crossSection: { ...project.crossSection, ...patch } };
}

function Field(props: {
  label: string;
  unit: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label className="bw-field">
      <span>
        {props.label} <small>({props.unit})</small>
      </span>
      <input
        type="number"
        value={Number.isFinite(props.value) ? props.value : 0}
        step={props.step ?? 0.1}
        min={props.min}
        max={props.max}
        onChange={(e) => {
          const v = props.integer
            ? parseInt(e.target.value, 10)
            : parseFloat(e.target.value);
          props.onChange(Number.isFinite(v) ? v : 0);
        }}
      />
    </label>
  );
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

export function Step1RoadCondition({ project, onChange }: Props) {
  const cross = project.crossSection;
  const ys = yPositionsFor(cross);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputMode: RoadAlignmentInputMode = project.roadAlignment?.inputMode ?? "simple";
  const alignment = project.roadAlignment ?? defaultStraightRoadAlignment(30);
  const totalLen = useMemo(() => totalAlignmentLength(alignment), [alignment]);
  const start = alignmentStart(alignment);
  const end = alignmentEnd(alignment);
  const isCsv = inputMode === "csv";

  const setMode = (mode: RoadAlignmentInputMode) => {
    if (mode === "simple") {
      const total = alignment.points.length
        ? totalAlignmentLength(alignment)
        : project.spans.reduce((acc, s) => acc + (s.length || 0), 0) || 30;
      onChange(setRoadAlignment(project, defaultStraightRoadAlignment(total)));
    } else {
      // csv モード: 現在の simple 値から折れ線を作る
      const simple = project.roadAlignment ?? defaultStraightRoadAlignment(30);
      onChange(setRoadAlignment(project, { ...simple, inputMode: "csv" }));
    }
  };

  const handleDownloadTemplate = () => {
    downloadText("road_alignment_template.csv", roadAlignmentTemplateCsv());
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const next = importRoadAlignmentCsv(text, "csv");
      onChange(setRoadAlignment(project, next));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`中心線 CSV の読込に失敗しました: ${msg}`);
    }
  };

  const handleBridgeLength = (n: number) => {
    onChange(
      setRoadAlignment(
        project,
        defaultStraightRoadAlignment(Math.max(1, n)),
      ),
    );
  };

  // 補間サンプルの表示 (先頭 / 中間 / 末尾)
  const samples = useMemo(() => {
    if (alignment.points.length < 2) return [];
    const len = totalLen;
    const at = (s: number) => pointAtStation(alignment, s);
    return [
      at(0),
      at(len / 4),
      at(len / 2),
      at((3 * len) / 4),
      at(len),
    ].filter((p): p is NonNullable<typeof p> => p != null);
  }, [alignment, totalLen]);

  return (
    <div className="bw-step bw-step-road">
      <h2>Step 1 / 6 道路条件</h2>
      <p className="bw-hint">
        橋梁の横断構成を入力してください。主桁候補 y 座標が自動で計算されます。
      </p>
      <div className="bw-grid">
        <Field
          label="車線数"
          unit="lane"
          value={cross.lane_count}
          integer
          min={1}
          max={6}
          onChange={(v) => onChange(updateCross(project, { lane_count: Math.max(1, Math.min(6, v)) }))}
        />
        <Field
          label="車線幅"
          unit="m"
          value={cross.lane_width}
          step={0.1}
          min={0.1}
          onChange={(v) => onChange(updateCross(project, { lane_width: Math.max(0.1, v) }))}
        />
        <Field
          label="中央分離帯幅"
          unit="m"
          value={cross.median_width}
          step={0.1}
          min={0}
          onChange={(v) => onChange(updateCross(project, { median_width: Math.max(0, v) }))}
        />
        <Field
          label="歩道幅"
          unit="m"
          value={cross.sidewalk_width}
          step={0.1}
          min={0}
          onChange={(v) => onChange(updateCross(project, { sidewalk_width: Math.max(0, v) }))}
        />
        <Field
          label="高欄幅"
          unit="m"
          value={cross.barrier_width}
          step={0.05}
          min={0}
          onChange={(v) => onChange(updateCross(project, { barrier_width: Math.max(0, v) }))}
        />
      </div>
      <div className="bw-preview">
        <h3>横断プレビュー（y 座標の概算）</h3>
        <pre>{ys.map((y) => y.toFixed(3)).join(" m\n") + " m"}</pre>
        <small>左端が高欄外端、末尾が右端。中央 0 が道路中心です。</small>
      </div>

      <section className="bw-alignment">
        <h3>道路中心線形</h3>
        <p className="bw-hint">
          橋面上の活荷重走行ライン設定 (Step4) や FEM モデル生成 (Step6) で使う、橋軸方向の中心線形を入力します。
        </p>
        <div className="bw-mode-buttons" role="tablist" aria-label="中心線形 入力方式">
          {(["simple", "csv"] as RoadAlignmentInputMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={inputMode === m}
              className={inputMode === m ? "bw-mode active" : "bw-mode"}
              onClick={() => setMode(m)}
            >
              {m === "simple" ? "簡易入力" : "座標入力"}
            </button>
          ))}
          <button
            type="button"
            className="bw-button-secondary"
            onClick={handleDownloadTemplate}
          >
            中心線CSV様式ダウンロード
          </button>
          <label className="bw-file">
            中心線CSV読込
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

        {isCsv ? (
          <div className="bw-alignment-summary">
            <p>
              <strong>中心線点数:</strong> {alignment.points.length} 点
            </p>
            <p>
              <strong>中心線長:</strong> {totalLen.toFixed(3)} m
            </p>
            <p>
              <strong>始点:</strong>{" "}
              {start ? `(${start.x.toFixed(3)}, ${start.y.toFixed(3)}, ${start.z.toFixed(3)})` : "-"}
            </p>
            <p>
              <strong>終点:</strong>{" "}
              {end ? `(${end.x.toFixed(3)}, ${end.y.toFixed(3)}, ${end.z.toFixed(3)})` : "-"}
            </p>
            <details>
              <summary>補間サンプルを表示</summary>
              <ul>
                {samples.map((p, idx) => (
                  <li key={idx}>
                    s={p.station.toFixed(3)} m → ({p.x.toFixed(3)}, {p.y.toFixed(3)}, {p.z.toFixed(3)})
                  </li>
                ))}
              </ul>
            </details>
            <AlignmentPreview alignment={alignment} height={220} />
          </div>
        ) : (
          <div className="bw-alignment-summary">
            <Field
              label="橋長"
              unit="m"
              value={alignment.bridgeLength || 30}
              min={1}
              step={0.1}
              onChange={handleBridgeLength}
            />
            <p className="bw-hint">
              簡易入力では中心線を X 方向の直線 {(alignment.points[0] ? `(${alignment.points[0].x.toFixed(1)}, 0, 0)` : "")} →{" "}
              {(alignment.points[1] ? `(${alignment.points[1].x.toFixed(1)}, 0, 0)` : "")} として扱います。
            </p>
            <AlignmentPreview alignment={alignment} height={180} />
          </div>
        )}
      </section>
    </div>
  );
}

// BridgeProject 側の RoadAlignment エラー型を re-export して import 元を安定させる
export { RoadAlignmentCsvError };
