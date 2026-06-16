import { useEffect, useState } from "react";
import { ja } from "../../i18n/ja";
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
      <h2>{ja.bridgeSteps.step4.title}</h2>
      <p className="bw-hint">
        {ja.bridgeSteps.step4.hint}
        <br />
        <small>{ja.bridgeSteps.step4.typeHint}</small>
      </p>
      <div className="bw-line-toolbar">
        <label>
          {ja.bridgeSteps.step4.typeLabel}
          <select value={lineType} onChange={(e) => setLineType(e.target.value as BridgeLineType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          {ja.bridgeSteps.step4.nameLabel}
          <input
            type="text"
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            placeholder={ja.bridgeSteps.step4.namePlaceholder}
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
        <h3>{ja.bridgeSteps.step4.listHeading(project.lines.length)}</h3>
        {project.lines.length === 0 && <p className="bw-empty">{ja.bridgeSteps.step4.empty}</p>}
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
              {ja.common.remove}
            </button>
          </div>
        ))}
      </div>
      {selected && (
        <div className="bw-line-detail">
          <h4>{ja.bridgeSteps.step4.selectedHeading}</h4>
          <p>ID: {selected.id}</p>
          <p>{ja.bridgeSteps.step4.typeValue(selected.type)}</p>
          <p>{ja.bridgeSteps.step4.startPoint(selected.points[0].join(", "))}</p>
          <p>{ja.bridgeSteps.step4.endPoint(selected.points[1].join(", "))}</p>
        </div>
      )}
    </div>
  );
}
