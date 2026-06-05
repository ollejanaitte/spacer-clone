import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClientError, apiClient } from "./api/client";
import { ProjectTree } from "./components/ProjectTree";
import { PropertyPanel } from "./components/PropertyPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { Toolbar } from "./components/Toolbar";
import { createDefaultProject } from "./data/defaultProject";
import { Viewer3D } from "./viewer/Viewer3D";
import type {
  AnalysisResult,
  BottomTab,
  ProjectModel,
  ResultExports,
  SectionKey,
  StructuredMessage,
  ValidationResponse,
} from "./types";
import type { ViewerSelection } from "./viewer/types";

type ValidationNotice = {
  kind: "ok" | "ng";
  text: string;
};

export function App() {
  const [project, setProject] = useState<ProjectModel>(() => createDefaultProject());
  const [selectedSection, setSelectedSection] = useState<SectionKey>("nodes");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [activeLoadCase, setActiveLoadCase] = useState<string>(() => createDefaultProject().loadCases[0]?.id ?? "");
  const [bottomTab, setBottomTab] = useState<BottomTab>("results");
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [validationNotice, setValidationNotice] = useState<ValidationNotice | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultExports, setResultExports] = useState<ResultExports | null>(null);
  const [apiErrors, setApiErrors] = useState<StructuredMessage[]>([]);
  const [viewerErrors, setViewerErrors] = useState<StructuredMessage[]>([]);
  const [autosaveCandidate, setAutosaveCandidate] = useState<ProjectModel | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["UIを起動しました。"]);
  const [dirty, setDirty] = useState(false);
  const [running, setRunning] = useState(false);

  const selection: ViewerSelection = selectedNode
    ? { type: "node", id: selectedNode }
    : selectedMember
      ? { type: "member", id: selectedMember }
      : null;
  const validationPaths = useMemo(
    () => new Set((validation?.errors ?? []).map((error) => error.path).filter(Boolean) as string[]),
    [validation],
  );
  const errors = [...(validation?.errors ?? []), ...(result?.errors ?? []), ...apiErrors, ...viewerErrors];
  const warnings = [...(validation?.warnings ?? []), ...(result?.warnings ?? [])];
  const canRun = !running && validation?.valid !== false;

  const commitProject = (nextProject: ProjectModel) => {
    setProject(nextProject);
    setDirty(true);
    setValidation(null);
    setValidationNotice(null);
    setResult(null);
    setResultExports(null);
    setApiErrors([]);
    setViewerErrors([]);
    setSelectedNode(null);
    setSelectedMember(null);
    setActiveLoadCase(nextProject.loadCases[0]?.id ?? "");
  };

  const log = (message: string) => {
    setLogs((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 30));
  };

  useEffect(() => {
    void apiClient
      .loadAutosaveCandidate()
      .then((response) => {
        if (response.exists && response.project) {
          setAutosaveCandidate(response.project);
        }
      })
      .catch(() => {
        setAutosaveStatus("自動保存の確認に失敗しました。通常の操作は継続できます。");
      });
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const timer = window.setTimeout(() => {
      void apiClient
        .autosaveProject(project)
        .then(() => setAutosaveStatus("自動保存済み"))
        .catch(() => setAutosaveStatus("自動保存に失敗しました。"));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [dirty, project]);

  const validate = async (): Promise<ValidationResponse | null> => {
    setApiErrors([]);
    try {
      const response = await apiClient.validateProject(project);
      setValidation(response);
      if (response.valid) {
        setValidationNotice({
          kind: "ok",
          text: "入力チェックOK：解析を実行できます。",
        });
        setBottomTab("results");
        log("入力チェックOK：解析を実行できます。");
      } else {
        setValidationNotice({
          kind: "ng",
          text: "入力チェックNG：不足または誤りがあります。下部のエラー一覧を確認してください。",
        });
        setBottomTab("errors");
        log("入力チェックNG：不足または誤りがあります。");
      }
      return response;
    } catch (error) {
      pushApiError(error, "VALIDATION_API_ERROR", setApiErrors);
      setValidationNotice({
        kind: "ng",
        text: "入力チェックNG：APIとの通信に失敗しました。下部のエラー一覧を確認してください。",
      });
      setBottomTab("errors");
      log("入力チェックのリクエストに失敗しました。");
      return null;
    }
  };

  const runAnalysis = async () => {
    setRunning(true);
    setApiErrors([]);
    try {
      const validationResponse = validation ?? (await apiClient.validateProject(project));
      setValidation(validationResponse);
      if (!validationResponse.valid) {
        setValidationNotice({
          kind: "ng",
          text: "入力チェックNG：不足または誤りがあります。下部のエラー一覧を確認してください。",
        });
        setBottomTab("errors");
        log("入力チェックNGのため解析を実行できません。");
        return;
      }
      const response = await apiClient.runAnalysis(project, true);
      setResult(response.result);
      setResultExports(response.csv);
      setBottomTab(response.result.errors.length > 0 ? "errors" : "results");
      log(`解析が完了しました。状態: ${analysisStatusLabel(response.result.analysisSummary.status)}`);
    } catch (error) {
      pushApiError(error, "ANALYSIS_API_ERROR", setApiErrors);
      setBottomTab("errors");
      log("解析実行のリクエストに失敗しました。");
    } finally {
      setRunning(false);
    }
  };

  const openFile = async (file: File) => {
    try {
      const loaded = JSON.parse(await file.text()) as ProjectModel;
      commitProject(loaded);
      setDirty(false);
      log(`${file.name} を開きました。`);
    } catch (error) {
      pushApiError(error, "PROJECT_OPEN_ERROR", setApiErrors);
      setBottomTab("errors");
      log("project.json を開けませんでした。");
    }
  };

  const saveProject = () => {
    downloadText("project.json", `${JSON.stringify(project, null, 2)}\n`, "application/json");
    setDirty(false);
    log("現在のモデルを project.json として保存しました。");
  };

  const exportResultJson = () => {
    if (!result) return;
    downloadText("result.json", resultExports?.["result.json"] ?? `${JSON.stringify(result, null, 2)}\n`, "application/json");
    log("解析結果JSONを出力しました。");
  };

  const exportResultCsv = () => {
    if (!resultExports) return;
    downloadText("displacements.csv", resultExports["displacements.csv"], "text/csv");
    downloadText("reactions.csv", resultExports["reactions.csv"], "text/csv");
    downloadText("member_end_forces.csv", resultExports["member_end_forces.csv"], "text/csv");
    log("解析結果CSVを出力しました。");
  };

  const handleViewerSelection = (nextSelection: ViewerSelection) => {
    setSelectedNode(nextSelection?.type === "node" ? nextSelection.id : null);
    setSelectedMember(nextSelection?.type === "member" ? nextSelection.id : null);
  };

  const handleViewerError = useCallback((message: string) => {
    setViewerErrors([
      {
        code: "WEBGL_INIT_FAILED",
        message,
        path: null,
        entityType: "viewer",
        entityId: null,
      },
    ]);
    setBottomTab("errors");
    log("3D表示の初期化に失敗したため、2D簡易表示に切り替えました。");
  }, []);

  return (
    <div className="app-shell">
      <Toolbar
        projectName={project.project.name}
        dirty={dirty}
        validationStatus={validation ? (validation.valid ? "チェックOK" : "エラーあり") : "未チェック"}
        analysisStatus={running ? "解析中" : result ? analysisStatusLabel(result.analysisSummary.status) : "未実行"}
        canRun={canRun}
        onNew={() => {
          commitProject(createDefaultProject());
          setDirty(false);
          log("新規モデルを作成しました。");
        }}
        onOpen={openFile}
        onSave={saveProject}
        onValidate={() => void validate()}
        onRun={() => void runAnalysis()}
        onExportResultJson={exportResultJson}
        onExportResultCsv={exportResultCsv}
        canExportResults={Boolean(result)}
        canExportCsv={Boolean(resultExports)}
      />
      {validationNotice && (
        <div className={`validation-notice ${validationNotice.kind}`}>
          {validationNotice.text}
        </div>
      )}
      {autosaveCandidate && (
        <div className="autosave-notice">
          <span>自動保存されたモデルがあります。</span>
          <button
            type="button"
            onClick={() => {
              commitProject(autosaveCandidate);
              setAutosaveCandidate(null);
              setDirty(true);
              log("autosave.json から復元しました。");
            }}
          >
            復元する
          </button>
          <button type="button" onClick={() => setAutosaveCandidate(null)}>
            閉じる
          </button>
        </div>
      )}
      {autosaveStatus && !autosaveCandidate && (
        <div className="autosave-status">{autosaveStatus}</div>
      )}
      <div className="workspace">
        <ProjectTree project={project} selected={selectedSection} onSelect={setSelectedSection} />
        <Viewer3D
          project={project}
          result={result}
          selectedSection={selectedSection}
          selection={selection}
          activeLoadCase={activeLoadCase}
          onSelectionChange={handleViewerSelection}
          onActiveLoadCaseChange={setActiveLoadCase}
          onViewerError={handleViewerError}
        />
        <PropertyPanel
          project={project}
          selected={selectedSection}
          validationPaths={validationPaths}
          onChange={commitProject}
        />
      </div>
      <ResultsPanel
        activeTab={bottomTab}
        result={result}
        errors={errors}
        warnings={warnings}
        activeLoadCase={activeLoadCase}
        selectedNode={selectedNode}
        selectedMember={selectedMember}
        logs={logs}
        onTabChange={setBottomTab}
      />
    </div>
  );
}

function pushApiError(
  error: unknown,
  fallbackCode: string,
  setApiErrors: (messages: StructuredMessage[]) => void,
) {
  const code =
    error instanceof ApiClientError
      ? error.code === "NETWORK_ERROR"
        ? "NETWORK_ERROR"
        : fallbackCode
      : fallbackCode;
  setApiErrors([
    {
      code,
      message: error instanceof Error ? error.message : "予期しないAPIエラーです。",
      path: null,
      entityType: null,
      entityId: null,
    },
  ]);
}

function analysisStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    success: "成功",
    warning: "警告あり",
    failed: "失敗",
  };
  return labels[status] ?? status;
}

function downloadText(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
