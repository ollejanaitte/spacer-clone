import { useEffect, useMemo, useRef, useState } from "react";
import type { BridgeProject, CrossSection, RoadAlignmentInputMode } from "../types";
import { yPositionsFor } from "../BridgeWizardState";
import {
  RoadAlignmentCsvError,
  alignmentEnd,
  alignmentStart,
  defaultStraightRoadAlignment,
  importRoadAlignmentCsv,
  roadAlignmentTemplateCsv,
  setRoadAlignment,
  totalAlignmentLength,
} from "../roadAlignment";
import { BridgeAlignmentViewer } from "../../components/viewer/BridgeAlignmentViewer";
import {
  loadAlignmentCoordinateMode,
  saveAlignmentCoordinateMode,
  type AlignmentCoordinateMode,
} from "../../components/viewer/alignmentCoordinateTransform";
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

type FieldProps = {
  label: string;
  unit: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  description?: string;
  onChange: (n: number) => void;
};

function Field({ label, unit, value, step, min, max, integer, description, onChange }: FieldProps) {
  return (
    <label className="bw-field">
      <span>
        {label} <small>({unit})</small>
      </span>
      {description && <small className="bw-field-help">{description}</small>}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step ?? 0.1}
        min={min}
        max={max}
        onChange={(e) => {
          const v = integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
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
  const [fitRequest, setFitRequest] = useState(0);
  // SPACER 座標系表示トグル (Step1 3D プレビュー専用)。初期値は localStorage から。
  const [coordMode, setCoordMode] = useState<AlignmentCoordinateMode>(() => loadAlignmentCoordinateMode());
  useEffect(() => {
    saveAlignmentCoordinateMode(coordMode);
  }, [coordMode]);
  const handleCoordModeChange = (next: AlignmentCoordinateMode) => {
    setCoordMode(next);
    // モード切替時に 3D ビューを再フィットさせる
    setFitRequest((v) => v + 1);
  };

  const setMode = (mode: RoadAlignmentInputMode) => {
    if (mode === "simple") {
      const total = alignment.points.length
        ? totalAlignmentLength(alignment)
        : project.spans.reduce((acc, s) => acc + (s.length || 0), 0) || 30;
      onChange(setRoadAlignment(project, defaultStraightRoadAlignment(total)));
    } else {
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
      // 3D ビューに再フィットを通知
      setFitRequest((v) => v + 1);
      window.dispatchEvent(new CustomEvent("bw:align-fit"));
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

  return (
    <div className="bw-step bw-step-road">
      <h2>Step 1 / 6 道路条件</h2>
      <p className="bw-hint">
        道路の <strong>横断構成</strong> と <strong>中心線形</strong> を入力します。
        右側の 3D ビューで即時に確認できます (X=橋軸方向、Y=横断方向、Z=標高)。
      </p>
      <div className="bw-road-split">
        {/* 左ペイン: 入力フォーム */}
        <div className="bw-road-form">
          <section className="bw-form-card">
            <h3>道路条件</h3>
            <p className="bw-hint">橋梁の横断構成を入力してください。</p>
            <div className="bw-grid">
              <Field
                label="車線数"
                unit="lane"
                value={cross.lane_count}
                integer
                min={1}
                max={6}
                description="片側ではなく全体の車線数"
                onChange={(v) => onChange(updateCross(project, { lane_count: Math.max(1, Math.min(6, v)) }))}
              />
              <Field
                label="車線幅"
                unit="m"
                value={cross.lane_width}
                step={0.1}
                min={0.1}
                description="1 車線あたりの幅員"
                onChange={(v) => onChange(updateCross(project, { lane_width: Math.max(0.1, v) }))}
              />
              <Field
                label="中央分離帯幅"
                unit="m"
                value={cross.median_width}
                step={0.1}
                min={0}
                description="中央分離帯の幅 (0 でなし)"
                onChange={(v) => onChange(updateCross(project, { median_width: Math.max(0, v) }))}
              />
              <Field
                label="歩道幅"
                unit="m"
                value={cross.sidewalk_width}
                step={0.1}
                min={0}
                description="片側歩道の幅員"
                onChange={(v) => onChange(updateCross(project, { sidewalk_width: Math.max(0, v) }))}
              />
              <Field
                label="高欄幅"
                unit="m"
                value={cross.barrier_width}
                step={0.05}
                min={0}
                description="外側高欄のオフセット幅"
                onChange={(v) => onChange(updateCross(project, { barrier_width: Math.max(0, v) }))}
              />
            </div>
            <div className="bw-preview">
              <h4>横断プレビュー（y 座標の概算）</h4>
              <pre>{ys.map((y) => y.toFixed(3)).join(" m\n") + " m"}</pre>
              <small>左端が高欄外端、末尾が右端。中央 0 が道路中心です。</small>
            </div>
          </section>

          <section className="bw-form-card">
            <h3>道路中心線形</h3>
            <p className="bw-hint">
              橋軸方向の中心線形を入力します。CSV を読込めば 3D でそのまま確認できます。
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
              <button type="button" className="bw-button-secondary" onClick={handleDownloadTemplate}>
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
                <AlignmentPreview alignment={alignment} height={160} />
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
              </div>
            )}
          </section>
        </div>

        {/* 右ペイン: 3D プレビュー */}
        <div className="bw-road-viewer">
          <div className="bw-road-viewer-header">
            <div className="bw-road-viewer-title-row">
              <h3>3D プレビュー</h3>
              <button
                type="button"
                className={coordMode === "spacer" ? "bw-align-toggle active" : "bw-align-toggle"}
                aria-pressed={coordMode === "spacer"}
                onClick={() => handleCoordModeChange(coordMode === "spacer" ? "world" : "spacer")}
                title="表示のみ Y/Z を入れ替えます。解析データは変更されません。"
              >
                SPACER座標系表示 {coordMode === "spacer" ? "ON" : "OFF"}
              </button>
            </div>
            <p className="bw-hint">
              マウス左ドラッグ: 回転 / 右ドラッグ: パン / ホイール: ズーム
            </p>
          </div>
          <BridgeAlignmentViewer
            alignment={alignment}
            height={520}
            fitRequest={fitRequest}
            mode={coordMode}
            onModeChange={handleCoordModeChange}
          />
        </div>
      </div>
    </div>
  );
}

// BridgeProject 側の RoadAlignment エラー型を re-export して import 元を安定させる
export { RoadAlignmentCsvError };
