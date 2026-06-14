import { useEffect, useState } from "react";
import type { BridgeLine, BridgeLineType, BridgeProject } from "../types";
import { BridgeThreeViewer, type ViewerMode } from "../viewer/BridgeThreeViewer";
import { appendLine, removeLine } from "../BridgeWizardState";
import type { ViewerModelPayload } from "../types";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
  femModel?: ViewerModelPayload | null;
};

const TYPES: BridgeLineType[] = ["traffic", "load", "reference"];

export function Step4LineSetting({ project, onChange, femModel }: Props) {
  const [mode, setMode] = useState<ViewerMode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lineType, setLineType] = useState<BridgeLineType>("traffic");
  const [lineName, setLineName] = useState("");

  // Listen for delete requests from inside the viewer
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id) {
        onChange(removeLine(project, detail.id));
        setSelectedId(null);
      }
    };
    window.addEventListener("bw:request-delete-line", handler);
    return () => window.removeEventListener("bw:request-delete-line", handler);
  }, [onChange, project]);

  const handleCreate = (line: Omit<BridgeLine, "id">) => {
    const final: Omit<BridgeLine, "id"> = {
      ...line,
      type: lineType,
      name: lineName || line.name,
    };
    const id = `line-${project.lines.length + 1}-${Date.now().toString(36)}`;
    onChange(appendLine(project, { id, ...final }));
    setLineName("");
  };

  const selected = project.lines.find((l) => l.id === selectedId) || null;

  return (
    <div className="bw-step bw-step-line">
      <h2>Step 4 / 6 ライン設定 3D</h2>
      <p className="bw-hint">
        3D ビューでラインを引き、荷重・走行・参照ラインを設定します。
        <br />
        <small>種別: traffic=緑, load=赤, reference=灰, selected=黄</small>
      </p>
      <div className="bw-line-toolbar">
        <label>
          種別:
          <select value={lineType} onChange={(e) => setLineType(e.target.value as BridgeLineType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          名前:
          <input
            type="text"
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            placeholder="ライン名（任意）"
          />
        </label>
        <div className="bw-mode-buttons">
          {(["view", "draw_line", "select", "delete"] as ViewerMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? "bw-mode active" : "bw-mode"}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="bw-viewer-wrap">
        <BridgeThreeViewer
          project={project}
          mode={mode}
          selectedLineId={selectedId}
          onSelectLine={setSelectedId}
          onCreateLine={handleCreate}
          femModel={femModel || null}
        />
      </div>
      <div className="bw-line-list">
        <h3>ライン一覧 ({project.lines.length})</h3>
        {project.lines.length === 0 && <p className="bw-empty">ラインはまだありません。</p>}
        {project.lines.map((ln) => (
          <div
            key={ln.id}
            className={`bw-line-row ${selectedId === ln.id ? "selected" : ""}`}
            onClick={() => setSelectedId(ln.id)}
          >
            <span className={`bw-pill bw-pill-${ln.type}`}>{ln.type}</span>
            <span className="bw-line-name">{ln.name}</span>
            <span className="bw-line-coords">
              {ln.points[0].map((v) => v.toFixed(2)).join(", ")} → {ln.points[1].map((v) => v.toFixed(2)).join(", ")}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(removeLine(project, ln.id));
                if (selectedId === ln.id) setSelectedId(null);
              }}
            >
              削除
            </button>
          </div>
        ))}
      </div>
      {selected && (
        <div className="bw-line-detail">
          <h4>選択中ライン</h4>
          <p>ID: {selected.id}</p>
          <p>種別: {selected.type}</p>
          <p>始点: {selected.points[0].join(", ")}</p>
          <p>終点: {selected.points[1].join(", ")}</p>
        </div>
      )}
    </div>
  );
}
