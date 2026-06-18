import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClientError, apiClient, resolveApiUrl } from "./api/client";
import { ProjectTree } from "./components/ProjectTree";
import { PropertyPanel } from "./components/PropertyPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { Toolbar } from "./components/Toolbar";
import { createDefaultProject, createSuspendedDeckProject } from "./data/defaultProject";
import { buildResultCsvExports } from "./exports/resultCsvExport";
import { openResultPdfReport } from "./exports/resultPdfReport";
import type { ResponseSpectrumSelection } from "./results/resultViewModel";
import { Viewer3D } from "./viewer/Viewer3D";
import { BridgeWizard } from "./bridge/BridgeWizard";
import type { BridgeFemResponse } from "./bridge/types";
import { bridgeProjectToProjectModel } from "./bridge/conversion";
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
import { ModelComparisonWorkspace } from "./compare/ModelComparisonWorkspace";
import { TimeHistoryModal } from "./timeHistory/TimeHistoryModal";
import { useTimeHistoryAnalysis } from "./timeHistory/useTimeHistoryAnalysis";

type ValidationNotice = {
  kind: "ok" | "ng";
  text: string;
};

export function App() {
  const [appVersion, setAppVersion] = useState<string>("0.0.0");
  const [project, setProject] = useState<ProjectModel>(() => createDefaultProject());
  const [suspendedDeckProject] = useState<ProjectModel>(() => createSuspendedDeckProject());
  const [selectedSection, setSelectedSection] = useState<SectionKey>("nodes");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [activeLoadCase, setActiveLoadCase] = useState<string>(() => createDefaultProject().loadCases[0]?.id ?? "");
  const [bottomTab, setBottomTab] = useState<BottomTab>("results");
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [validationNotice, setValidationNotice] = useState<ValidationNotice | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rightResult, setRightResult] = useState<AnalysisResult | null>(null);
  const [resultExports, setResultExports] = useState<ResultExports | null>(null);
  const [selectedEigenMode, setSelectedEigenMode] = useState<number>(1);
  const [selectedResponseSpectrumResult, setSelectedResponseSpectrumResult] =
    useState<ResponseSpectrumSelection>("SRSS");
  const [apiErrors, setApiErrors] = useState<StructuredMessage[]>([]);
  const [viewerErrors, setViewerErrors] = useState<StructuredMessage[]>([]);
  const [autosaveCandidate, setAutosaveCandidate] = useState<ProjectModel | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["UI initialized."]);
  const [dirty, setDirty] = useState(false);
  const [bridgeWizardOpen, setBridgeWizardOpen] = useState<boolean>(false);
  const [timeHistoryModalOpen, setTimeHistoryModalOpen] = useState<boolean>(false);
  const [timeHistoryNodeOverride, setTimeHistoryNodeOverride] = useState<Map<string, { x: number; y: number; z: number }> | null>(null);
  const [running, setRunning] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname === "/compare",
  );

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
  const timeHistoryAnalysis = useTimeHistoryAnalysis({
    onSuccess: (analysisResult) => {
      setProject((current) => ({
        ...current,
        analysisResults: {
          ...current.analysisResults,
          timeHistory: analysisResult.timeHistoryResult ?? null,
        },
      }));
      setDirty(true);
    },
  });

  const commitProject = (nextProject: ProjectModel) => {
    setProject(nextProject);
    setDirty(true);
    setValidation(null);
    setValidationNotice(null);
    setResult(null);
    setRightResult(null);
    setResultExports(null);
    setSelectedEigenMode(1);
    setSelectedResponseSpectrumResult("SRSS");
    setApiErrors([]);
    setViewerErrors([]);
    setSelectedNode(null);
    setSelectedMember(null);
    setActiveLoadCase(nextProject.loadCases[0]?.id ?? "");
    setTimeHistoryNodeOverride(null);
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
      .catch(() => setAutosaveStatus("Autosave check failed. You can continue normal operation."));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchVersion = () =>
      fetch(resolveApiUrl("/health"))
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (cancelled) return;
          const version = typeof payload?.version === "string" ? payload.version : null;
          if (version) setAppVersion(version);
        })
        .catch(() => {
          /* ignore network errors; fallback version is shown */
        });
    void fetchVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const timer = window.setTimeout(() => {
      void apiClient
        .autosaveProject(project)
        .then(() => setAutosaveStatus("[U+81EA][U+52D5][U+4FDD][U+5B58][U+6E08][U+307F]"))
        .catch(() => setAutosaveStatus("Autosave failed."));
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
          text: "Input check OK. You can run analysis.",
        });
        setBottomTab("results");
        log("Input check OK. You can run analysis.");
      } else {
        setValidationNotice({
          kind: "ng",
          text: "Input check NG. Please review the error list below.",
        });
        setBottomTab("errors");
        log("Input check NG.");
      }
      return response;
    } catch (error) {
      pushApiError(error, "VALIDATION_API_ERROR", setApiErrors);
      setValidationNotice({
        kind: "ng",
          text: "Input check NG (API failure). Please review the error list below.",
      });
      setBottomTab("errors");
        log("Input check request failed.");
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
          text: "Input check NG. Please review the error list below.",
        });
        setBottomTab("errors");
        log("Input check NG. Analysis cannot be run.");
        return;
      }
      const response = await apiClient.runAnalysis(project, true);
      setResult(response.result);
      setResultExports(response.csv);
      setBottomTab(response.result.errors.length > 0 ? "errors" : "results");
      log(`Analysis complete. Status: ${analysisStatusLabel(response.result.analysisSummary.status)}`);
    } catch (error) {
      pushApiError(error, "ANALYSIS_API_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Analysis request failed.");
    } finally {
      setRunning(false);
    }
  };

  const runEigenAnalysis = async () => {
    setRunning(true);
    setApiErrors([]);
    try {
      const validationResponse = validation ?? (await apiClient.validateProject(project));
      setValidation(validationResponse);
      if (!validationResponse.valid) {
        setValidationNotice({
          kind: "ng",
          text: "Input check NG. Please review the error list below.",
        });
        setBottomTab("errors");
        log("Input check NG. Eigenvalue analysis cannot be run.");
        return;
      }
      const [response, suspendedResponse] = await Promise.all([
        apiClient.runEigenAnalysis(project),
        apiClient.runEigenAnalysis(suspendedDeckProject).catch((error) => {
          log(`B-plan (suspended deck) eigen analysis failed: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }),
      ]);
      setResult(response.result);
      setRightResult(suspendedResponse?.result ?? null);
      setResultExports(null);
      setSelectedEigenMode(response.result.eigenResult?.modes[0]?.modeNo ?? 1);
      setBottomTab(response.result.errors.length > 0 ? "errors" : "results");
      log(`Eigen analysis complete. Plan A: ${analysisStatusLabel(response.result.analysisSummary.status)}${suspendedResponse ? ` / Plan B: ${analysisStatusLabel(suspendedResponse.result.analysisSummary.status)}` : ""}`);
    } catch (error) {
      pushApiError(error, "ANALYSIS_API_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Eigenvalue analysis API request failed.");
    } finally {
      setRunning(false);
    }
  };

  const runResponseSpectrumAnalysis = async () => {
    setRunning(true);
    setApiErrors([]);
    try {
      const validationResponse = validation ?? (await apiClient.validateProject(project));
      setValidation(validationResponse);
      if (!validationResponse.valid) {
        setValidationNotice({
          kind: "ng",
          text: "Input check NG. Please review the error list below.",
        });
        setBottomTab("errors");
        log("Input check NG. Response spectrum analysis cannot be run.");
        return;
      }
      const response = await apiClient.runResponseSpectrumAnalysis(project);
      setResult(response.result);
      setResultExports(null);
      setSelectedResponseSpectrumResult("SRSS");
      setBottomTab(response.result.errors.length > 0 ? "errors" : "results");
      log(`Response spectrum analysis complete. Status: ${analysisStatusLabel(response.result.analysisSummary.status)}`);
    } catch (error) {
      pushApiError(error, "ANALYSIS_API_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Response spectrum analysis API request failed.");
    } finally {
      setRunning(false);
    }
  };

  const runTimeHistoryAnalysis = async () => {
    try {
      const response = await timeHistoryAnalysis.run(project);
      setResult(response);
      setResultExports(null);
      setBottomTab(response.errors.length > 0 ? "errors" : "timeHistory");
      log(`Time history analysis complete. Status: ${analysisStatusLabel(response.analysisSummary.status)}`);
    } catch (error) {
      pushApiError(error, "TIME_HISTORY_API_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Time history analysis API request failed.");
    }
  };

  const runInfluenceAnalysis = async () => {
    setRunning(true);
    setApiErrors([]);
    try {
      const validationResponse = validation ?? (await apiClient.validateProject(project));
      setValidation(validationResponse);
      if (!validationResponse.valid) {
        setValidationNotice({
          kind: "ng",
          text: "Input check NG. Please review the error list below.",
        });
        setBottomTab("errors");
        log("Input check NG. Influence line analysis cannot be run.");
        return;
      }
      const memberId =
        selectedMember ??
        project.analysisSettings.influence?.line.memberId ??
        project.members[0]?.id ??
        "";
      const analysisProject =
        memberId && memberId !== project.analysisSettings.influence?.line.memberId
          ? withInfluenceMember(project, memberId)
          : project;
      if (analysisProject !== project) {
        setProject(analysisProject);
        setDirty(true);
      }
      const response = await apiClient.runInfluenceAnalysis(analysisProject);
      setResult(response.result);
      setResultExports(null);
      setBottomTab(response.result.errors.length > 0 ? "errors" : "results");
      log(`Influence line analysis complete. Member: ${memberId || "n/a"}`);
    } catch (error) {
      pushApiError(error, "ANALYSIS_API_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Influence line analysis API request failed.");
    } finally {
      setRunning(false);
    }
  };

  const openFile = async (file: File) => {
    try {
      const loaded = JSON.parse(await file.text()) as ProjectModel;
      commitProject(loaded);
      setDirty(false);
      log(`${file.name} opened.`);
    } catch (error) {
      pushApiError(error, "PROJECT_OPEN_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Failed to open project.json.");
    }
  };

  const saveProject = () => {
    downloadText("project.json", `${JSON.stringify(project, null, 2)}\n`, "application/json");
    setDirty(false);
    log("Current model saved to project.json.");
  };

  const exportResultJson = () => {
    if (!result) return;
    downloadText("result.json", resultExports?.["result.json"] ?? `${JSON.stringify(result, null, 2)}\n`, "application/json");
    log("Result JSON downloaded.");
  };

  const exportResultCsv = () => {
    if (!result) return;
    const csvExports = resultExports ?? buildResultCsvExports(result);
    downloadText("displacements.csv", csvExports["displacements.csv"], "text/csv");
    downloadText("reactions.csv", csvExports["reactions.csv"], "text/csv");
    downloadText("member_section_forces.csv", csvExports["member_section_forces.csv"], "text/csv");
    downloadText("eigen_modes.csv", csvExports["eigen_modes.csv"], "text/csv");
    downloadText("influence_lines.csv", csvExports["influence_lines.csv"], "text/csv");
    log("Result CSV downloaded.");
  };

  const exportResultPdf = () => {
    if (!result) return;
    try {
      openResultPdfReport(project, result, activeLoadCase);
      log("Result PDF report opened.");
    } catch (error) {
      pushApiError(error, "REPORT_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Failed to open result PDF report.");
    }
  };

  const handleViewerSelection = (nextSelection: ViewerSelection) => {
    setSelectedNode(nextSelection?.type === "node" ? nextSelection.id : null);
    setSelectedMember(nextSelection?.type === "member" ? nextSelection.id : null);
  };


  const handleBridgeGenerated = useCallback((fem: BridgeFemResponse) => {
    const converted = bridgeProjectToProjectModel(fem.fem);
    commitProject(converted);
    log("Imported model from bridge wizard FEM.");
    setBottomTab("results");
  }, [commitProject, log]);

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
    log("3D viewer initialization failed; fell back to 2D simplified view.");
  }, []);

  if (comparisonOpen) {
    return (
      <ModelComparisonWorkspace
        modelA={project}
        onClose={() => {
          window.history.pushState({}, "", "/");
          setComparisonOpen(false);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <Toolbar
        projectName={project.project.name}
        appVersion={appVersion}
        dirty={dirty}
        validationStatus={validation ? (validation.valid ? "OK" : "Has errors") : "Not validated"}
        analysisStatus={running ? "Running" : result ? analysisStatusLabel(result.analysisSummary.status) : "Not run"}
        canRun={canRun}
        onNew={() => {
          commitProject(createDefaultProject());
          setDirty(false);
          log("New model created.");
        }}
        onOpen={openFile}
        onSave={saveProject}
        onValidate={() => void validate()}
        onRun={() => void runAnalysis()}
        onRunEigen={() => void runEigenAnalysis()}
        onRunInfluence={() => void runInfluenceAnalysis()}
        onRunResponseSpectrum={() => void runResponseSpectrumAnalysis()}
        onExportResultJson={exportResultJson}
        onExportResultCsv={exportResultCsv}
        onExportResultPdf={exportResultPdf}
        canExportResults={Boolean(result)}
        canExportCsv={Boolean(result)}
        canExportPdf={Boolean(result)}
        onOpenBridgeWizard={() => setBridgeWizardOpen(true)}
        onOpenTimeHistory={() => setTimeHistoryModalOpen(true)}
        onOpenModelComparison={() => {
          window.history.pushState({}, "", "/compare");
          setComparisonOpen(true);
        }}
      />
      {validationNotice && (
        <div className={`validation-notice ${validationNotice.kind}`}>
          {validationNotice.text}
        </div>
      )}
      {autosaveCandidate && (
        <div className="autosave-notice">
          <span>An autosaved model is available.</span>
          <button
            type="button"
            onClick={() => {
              commitProject(autosaveCandidate);
              setAutosaveCandidate(null);
              setDirty(true);
              log("Recovered from autosave.json.");
            }}
          >
            Recover
          </button>
          <button type="button" onClick={() => setAutosaveCandidate(null)}>
            Close
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
          rightResult={rightResult}
          selectedSection={selectedSection}
          selection={selection}
          activeLoadCase={activeLoadCase}
          selectedEigenMode={selectedEigenMode}
          selectedResponseSpectrumResult={selectedResponseSpectrumResult}
          onSelectionChange={handleViewerSelection}
          onActiveLoadCaseChange={setActiveLoadCase}
          onSelectedEigenModeChange={setSelectedEigenMode}
          onSelectedResponseSpectrumResultChange={setSelectedResponseSpectrumResult}
          onViewerError={handleViewerError}
          timeHistoryNodeOverride={timeHistoryNodeOverride}
        />
        <PropertyPanel
          project={project}
          selected={selectedSection}
          validationPaths={validationPaths}
          onChange={commitProject}
        />
      </div>
      <BridgeWizard
        open={bridgeWizardOpen}
        onClose={() => setBridgeWizardOpen(false)}
        onCommit={handleBridgeGenerated}
      />
      <TimeHistoryModal
        open={timeHistoryModalOpen}
        project={project}
        result={
          timeHistoryAnalysis.result?.timeHistoryResult ??
          (result?.analysisSummary.analysisType === "time_history" ? result.timeHistoryResult ?? null : null) ??
          project.analysisResults?.timeHistory ??
          null
        }
        error={timeHistoryAnalysis.error}
        running={timeHistoryAnalysis.loading}
        onClose={() => setTimeHistoryModalOpen(false)}
        onRun={() => void runTimeHistoryAnalysis()}
        onProjectChange={commitProject}
        onAnimationOverrideChange={setTimeHistoryNodeOverride}
      />
      <ResultsPanel
        activeTab={bottomTab}
        project={project}
        result={result}
        errors={errors}
        warnings={warnings}
        activeLoadCase={activeLoadCase}
        selectedEigenMode={selectedEigenMode}
        selectedResponseSpectrumResult={selectedResponseSpectrumResult}
        selectedNode={selectedNode}
        selectedMember={selectedMember}
        logs={logs}
        onTabChange={setBottomTab}
        onProjectChange={commitProject}
        onSelectedEigenModeChange={setSelectedEigenMode}
        onSelectedResponseSpectrumResultChange={setSelectedResponseSpectrumResult}
        onTimeHistoryAnimationOverrideChange={setTimeHistoryNodeOverride}
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
  // Short message for the user; raw exception details can be checked in the log.
  let userMessage: string;
  if (error instanceof ApiClientError) {
    userMessage = error.message;
  } else if (error instanceof Error) {
    if (code === "NETWORK_ERROR") {
      userMessage = "Cannot reach the backend. Please make sure the server is running.";
    } else {
      userMessage = `${fallbackCode}: See logs for details.`;
    }
  } else {
    userMessage = "Unexpected API error.";
  }
  setApiErrors([
    {
      code,
      message: userMessage,
      path: null,
      entityType: null,
      entityId: null,
    },
  ]);
}

function analysisStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    success: "Success",
    warning: "Warning",
    failed: "Failed",
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

function withInfluenceMember(project: ProjectModel, memberId: string): ProjectModel {
  const current = project.analysisSettings.influence;
  return {
    ...project,
    analysisSettings: {
      ...project.analysisSettings,
      influence: {
        caseId: current?.caseId ?? "influence-line-1",
        line: {
          id: current?.line.id ?? `line-${memberId}`,
          memberId,
          stationCount: current?.line.stationCount ?? 21,
          direction: current?.line.direction ?? { x: 0, y: -1, z: 0 },
          magnitude: current?.line.magnitude ?? 1,
        },
        targets: current?.targets ?? [],
      },
    },
  };
}
