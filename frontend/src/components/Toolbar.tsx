import {
  Download,
  FileJson,
  FolderOpen,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

type ToolbarProps = {
  projectName: string;
  dirty: boolean;
  validationStatus: string;
  analysisStatus: string;
  canRun: boolean;
  onNew: () => void;
  onOpen: (file: File) => void;
  onSave: () => void;
  onValidate: () => void;
  onRun: () => void;
  onExportJson: () => void;
  onLoadSample: () => void;
};

export function Toolbar({
  projectName,
  dirty,
  validationStatus,
  analysisStatus,
  canRun,
  onNew,
  onOpen,
  onSave,
  onValidate,
  onRun,
  onExportJson,
  onLoadSample,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="project-strip">
        <span className="app-mark">SC</span>
        <div>
          <h1>{projectName}</h1>
          <p>{dirty ? "Unsaved changes" : "Saved"} · {validationStatus} · {analysisStatus}</p>
        </div>
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={onNew} title="New project">
          <RotateCcw size={16} />
          New
        </button>
        <label className="button-like" title="Open project JSON">
          <FolderOpen size={16} />
          Open
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onOpen(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button type="button" onClick={onSave} title="Mark project as saved">
          <Save size={16} />
          Save
        </button>
        <button type="button" onClick={onValidate} title="Validate project">
          <ShieldCheck size={16} />
          Validate
        </button>
        <button type="button" onClick={onRun} disabled={!canRun} title="Run analysis">
          <Play size={16} />
          Run
        </button>
        <button type="button" onClick={onExportJson} title="Export project JSON">
          <Download size={16} />
          JSON
        </button>
        <button type="button" onClick={onLoadSample} title="Load backend sample">
          <FileJson size={16} />
          Sample
        </button>
      </div>
    </header>
  );
}
