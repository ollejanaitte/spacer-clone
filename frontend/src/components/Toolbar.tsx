import { Download, FileText, FolderOpen, LineChart, Play, RotateCcw, Save, ShieldCheck, Waves, Activity } from "lucide-react";

type ToolbarProps = {
  projectName: string;
  appVersion: string;
  dirty: boolean;
  validationStatus: string;
  analysisStatus: string;
  canRun: boolean;
  canExportResults: boolean;
  canExportCsv: boolean;
  canExportPdf: boolean;
  onNew: () => void;
  onOpen: (file: File) => void;
  onSave: () => void;
  onValidate: () => void;
  onRun: () => void;
  onRunEigen: () => void;
  onRunInfluence: () => void;
  onRunResponseSpectrum: () => void;
  onExportResultJson: () => void;
  onExportResultCsv: () => void;
  onExportResultPdf: () => void;
};

export function Toolbar({
  projectName,
  appVersion,
  dirty,
  validationStatus,
  analysisStatus,
  canRun,
  canExportResults,
  canExportCsv,
  canExportPdf,
  onNew,
  onOpen,
  onSave,
  onValidate,
  onRun,
  onRunEigen,
  onRunInfluence,
  onRunResponseSpectrum,
  onExportResultJson,
  onExportResultCsv,
  onExportResultPdf,
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
          <p className="app-version" aria-label="app-version">Version {appVersion}</p>
        </div>
      </div>
      <div className="toolbar-actions">
        <div className="toolbar-group">
          <button type="button" onClick={onNew} title="新しいモデルを作成します。">
            <RotateCcw size={16} />
            新規
          </button>
          <label className="button-like" title="ローカルPC上の project.json を開きます。">
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
          <button type="button" onClick={onSave} title="現在のモデルを project.json として保存します。">
            <Save size={16} />
            保存
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" onClick={onValidate} title="入力データに不足や誤りがないか確認します。">
            <ShieldCheck size={16} />
            入力チェック
          </button>
          <button type="button" onClick={onRun} disabled={!canRun} title="線形静的解析を実行します。">
            <Play size={16} />
            静的解析
          </button>
          <button type="button" onClick={onRunEigen} disabled={!canRun} title="固有値解析を実行します。">
            <Waves size={16} />
            固有値
          </button>
          <button type="button" onClick={onRunResponseSpectrum} disabled={!canRun} title="応答スペクトル解析を実行します。">
            <Activity size={16} />
            応答
          </button>
          <button type="button" onClick={onRunInfluence} disabled={!canRun} title="選択部材の影響線解析を実行します。">
            <LineChart size={16} />
            影響線
          </button>
        </div>
        <div className="toolbar-group output-group" aria-label="結果出力">
          <span className="toolbar-group-label">出力</span>
          <button type="button" onClick={onExportResultCsv} disabled={!canExportCsv} title="解析結果をCSVで保存します。">
            <Download size={16} />
            CSV
          </button>
          <button type="button" onClick={onExportResultPdf} disabled={!canExportPdf} title="解析結果をPDF帳票として出力します。">
            <FileText size={16} />
            PDF帳票
          </button>
          <button type="button" onClick={onExportResultJson} disabled={!canExportResults} title="解析結果をJSONで保存します。">
            <Download size={16} />
            JSON
          </button>
        </div>
      </div>
    </header>
  );
}
