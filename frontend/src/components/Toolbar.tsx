import { Download, FolderOpen, Play, RotateCcw, Save, ShieldCheck } from "lucide-react";

type ToolbarProps = {
  projectName: string;
  dirty: boolean;
  validationStatus: string;
  analysisStatus: string;
  canRun: boolean;
  canExportResults: boolean;
  canExportCsv: boolean;
  onNew: () => void;
  onOpen: (file: File) => void;
  onSave: () => void;
  onValidate: () => void;
  onRun: () => void;
  onExportResultJson: () => void;
  onExportResultCsv: () => void;
};

export function Toolbar({
  projectName,
  dirty,
  validationStatus,
  analysisStatus,
  canRun,
  canExportResults,
  canExportCsv,
  onNew,
  onOpen,
  onSave,
  onValidate,
  onRun,
  onExportResultJson,
  onExportResultCsv,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="project-strip">
        <span className="app-mark">SC</span>
        <div>
          <h1>{projectName}</h1>
          <p>
            {dirty ? "未保存の変更あり" : "保存済み"} / {validationStatus} / {analysisStatus}
          </p>
        </div>
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={onNew} title="新しいモデルを作成します">
          <RotateCcw size={16} />
          新規
        </button>
        <label className="button-like" title="ローカルPC上の project.json を開きます">
          <FolderOpen size={16} />
          開く
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
        <button type="button" onClick={onSave} title="現在のモデルを project.json として保存します">
          <Save size={16} />
          保存
        </button>
        <button type="button" onClick={onValidate} title="入力データに不足や誤りがないか確認します">
          <ShieldCheck size={16} />
          入力チェック
        </button>
        <button type="button" onClick={onRun} disabled={!canRun} title="線形静的解析を実行します">
          <Play size={16} />
          解析実行
        </button>
        <button
          type="button"
          onClick={onExportResultCsv}
          disabled={!canExportCsv}
          title="解析結果をCSVで保存します"
        >
          <Download size={16} />
          結果CSV出力
        </button>
        <button
          type="button"
          onClick={onExportResultJson}
          disabled={!canExportResults}
          title="解析結果をJSONで保存します"
        >
          <Download size={16} />
          結果JSON出力
        </button>
      </div>
    </header>
  );
}
