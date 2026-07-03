import { useCallback, useEffect, useMemo, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ApiClientError, apiClient, resolveApiUrl } from "./api/client";
import { ProjectTree } from "./components/ProjectTree";
import { PropertyPanel } from "./components/PropertyPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { Toolbar } from "./components/Toolbar";
import { createDefaultProject, createSuspendedDeckProject } from "./data/defaultProject";
import { resetProjectModelContents } from "./modelReset";
import { migrateProject } from "./projectMigration";
import { buildResultCsvExports } from "./exports/resultCsvExport";
import { buildMemberForceReportCsv } from "./exports/memberForceReport";
import { openResultPdfReport } from "./exports/resultPdfReport";
import type { ResponseSpectrumSelection } from "./results/resultViewModel";
import { Viewer3D } from "./viewer/Viewer3D";
import { BridgeWizard } from "./bridge/BridgeWizard";
import type { BridgeFemResponse } from "./bridge/types";
import { bridgeProjectToProjectModel } from "./bridge/conversion";
import type {
  AnalysisResult,
  BottomTab,
  MovingLoadCase,
  ProjectModel,
  ResultExports,
  SectionKey,
  StructuredMessage,
  ValidationResponse,
} from "./types";
import type { ViewerSelection } from "./viewer/types";
import { ModelComparisonWorkspace } from "./compare/ModelComparisonWorkspace";
import { ResultSummaryCard } from "./timeHistory/wizard/ResultSummaryCard";
import { StatusBadge } from "./timeHistory/wizard/StatusBadge";
import { TimeHistoryWizardModal } from "./timeHistory/wizard/TimeHistoryWizardModal";
import { redirectLegacyRoutes } from "./timeHistory/routeRedirect";
import { selectTimeHistoryMainStatus } from "./timeHistory/wizard/wizardState";
import { useTimeHistoryAnalysis } from "./timeHistory/useTimeHistoryAnalysis";
import { LinerEditPage } from "./liner/pages/LinerEditPage";
import { LinerListPage } from "./liner/pages/LinerListPage";
import { LinerMappingReviewPage } from "./liner/pages/LinerMappingReviewPage";
import { LinerPreviewPage } from "./liner/pages/LinerPreviewPage";
import { createDefaultLinerDraft, type LinerDraftUpdate } from "./liner/adapters/linerUiAdapter";
import { linerDraftFromProject, withProjectLinerDraft } from "./liner/adapters/linerProjectDraft";
import { buildLinerPlanDxf } from "./liner/exports/linerPlanDxf";
import { buildLinerProfileDxf } from "./liner/exports/linerProfileDxf";
import { buildLinerFrameStl } from "./liner/exports/linerFrameStl";
import { resolveLinerUiRouteId, resolveLinerUiRoutePath } from "./liner/uiPreparation";
import { ImporterProjectListPage } from "./liner/importer/project-list/ImporterProjectListPage";
import { LineMasterPage } from "./liner/importer/line-master/LineMasterPage";
import {
  matchImporterRoute,
  resolveImporterLineMasterRoutePath,
  resolveImporterRoute,
} from "./liner/importer/routes";
import { ja } from "./i18n/ja";

type ValidationNotice = {
  kind: "ok" | "ng";
  text: string;
};

// Temporary freeze: autosave recovery/write paths are disabled while model reset
// and coordinate-mode interactions are being stabilized. Keep the code paths in
// place so the feature can be restored by flipping this flag.
const AUTOSAVE_ENABLED = false;

export function App() {
  redirectLegacyRoutes();
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
  const [timeHistoryWizardOpen, setTimeHistoryWizardOpen] = useState<boolean>(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/pro/th/"),
  );
  const [timeHistoryNodeOverride, setTimeHistoryNodeOverride] = useState<Map<string, { x: number; y: number; z: number }> | null>(null);
  const [running, setRunning] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(
    () => typeof window !== "undefined" && window.location.pathname === "/pro/compare",
  );
  const [currentPathname, setCurrentPathname] = useState(
    () => (typeof window !== "undefined" ? window.location.pathname : "/pro"),
  );
  const [viewPanelOpen, setViewPanelOpen] = useState<boolean>(false);
  const [dataPanelOpen, setDataPanelOpen] = useState<boolean>(false);
  const linerDraft = useMemo(() => linerDraftFromProject(project), [project]);
  const linerRouteId = resolveLinerUiRouteId(currentPathname);
  const importerRouteActive = resolveImporterRoute(currentPathname);
  const importerRoute = matchImporterRoute(currentPathname);

  const selection: ViewerSelection = selectedNode
    ? { type: "node", id: selectedNode }
    : selectedMember
      ? { type: "member", id: selectedMember }
      : null;
  const handleViewPanelToggle = useCallback(() => setViewPanelOpen((v) => !v), []);
  const handleDataPanelToggle = useCallback(() => setDataPanelOpen((v) => !v), []);
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
  const commitLinerDraft = useCallback((update: LinerDraftUpdate) => {
    setProject((currentProject) => {
      const currentDraft = linerDraftFromProject(currentProject);
      if (typeof update === "function") {
        if (!currentDraft) {
          return currentProject;
        }
        return withProjectLinerDraft(currentProject, update(currentDraft));
      }
      return withProjectLinerDraft(currentProject, update);
    });
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
    setTimeHistoryNodeOverride(null);
  }, []);

  const log = (message: string) => {
    setLogs((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 30));
  };

  useEffect(() => {
    if (!AUTOSAVE_ENABLED) return undefined;
    void apiClient
      .loadAutosaveCandidate()
      .then((response) => {
        if (response.exists && response.project) {
          setAutosaveCandidate(response.project);
        }
      })
      .catch(() => setAutosaveStatus("Autosave check failed. You can continue normal operation."));
    return undefined;
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
    if (!AUTOSAVE_ENABLED) return undefined;
    if (!dirty) return undefined;
    const timer = window.setTimeout(() => {
      void apiClient
        .autosaveProject(project)
        .then(() => setAutosaveStatus("[U+81EA][U+52D5][U+4FDD][U+5B58][U+6E08][U+307F]"))
        .catch(() => setAutosaveStatus("Autosave failed."));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [dirty, project]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPathname(window.location.pathname);
      setComparisonOpen(window.location.pathname === "/pro/compare");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigatePro = useCallback((path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPathname(path);
  }, []);

  const navigateTop = useCallback(() => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const createLinerModel = useCallback(() => {
    const draft = createDefaultLinerDraft();
    commitProject(withProjectLinerDraft(project, draft));
    navigatePro(resolveLinerUiRoutePath("liner.setup"));
    log(`LINER model ${draft.alignment.linerModelId} created.`);
  }, [project, navigatePro]);

  const deleteLinerModel = useCallback((modelId: string) => {
    if (!window.confirm(ja.liner.list.deleteConfirm)) return;
    commitProject({ ...project, liner: undefined, linerTrace: [] });
    navigatePro(resolveLinerUiRoutePath("liner.list"));
    log(`LINER model ${modelId} deleted.`);
  }, [project, navigatePro]);

  const resetModelContents = useCallback(() => {
    if (!window.confirm(ja.toolbar.resetConfirm)) return;
    commitProject(resetProjectModelContents(project));
    setBottomTab("results");
    log("Model contents reset.");
  }, [project]);

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

  const runMovingLoadAnalysis = async () => {
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
        log("Input check NG. Moving load analysis cannot be run.");
        return;
      }
      const memberId = selectedMember ?? project.analysisSettings.influence?.line.memberId ?? project.members[0]?.id ?? "";
      const movingLoadCase = buildDefaultMovingLoadCase(project, memberId);
      const response = await apiClient.runMovingLoadAnalysis(project, movingLoadCase);
      setResult(response.result);
      setResultExports(response.csv);
      setBottomTab(response.result.errors.length > 0 ? "errors" : "results");
      log(`Moving load analysis complete. Member: ${memberId || "n/a"}`);
    } catch (error) {
      pushApiError(error, "MOVING_LOAD_API_ERROR", setApiErrors);
      setBottomTab("errors");
      log("Moving load analysis API request failed.");
    } finally {
      setRunning(false);
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
      const loaded = migrateProject(JSON.parse(await file.text()));
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
    if (csvExports["moving_load.csv"]) {
      downloadText("moving_load.csv", csvExports["moving_load.csv"], "text/csv");
    }
    downloadText("member_force_report.csv", buildMemberForceReportCsv(result), "text/csv");
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

  const exportLinerPlanDxf = () => {
    if (!linerDraft) return;
    downloadText("liner_plan.dxf", buildLinerPlanDxf(linerDraft), "application/dxf");
    log("LINER plan DXF downloaded.");
  };

  const exportLinerProfileDxf = () => {
    if (!linerDraft) return;
    downloadText("liner_profile.dxf", buildLinerProfileDxf(linerDraft), "application/dxf");
    log("LINER profile DXF downloaded.");
  };

  const exportLinerFrameStl = () => {
    downloadText("liner_frame.stl", buildLinerFrameStl(project), "model/stl");
    log("LINER frame STL downloaded.");
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
          navigatePro("/pro");
          setComparisonOpen(false);
        }}
      />
    );
  }

  if (importerRouteActive) {
    if (importerRoute.kind === "lineMaster") {
      return (
        <LineMasterPage
          projectId={importerRoute.projectId}
          bridgeId={importerRoute.bridgeId}
          onBack={() => navigatePro("/pro/importer")}
        />
      );
    }

    return (
      <ImporterProjectListPage
        onClose={() => navigatePro("/pro")}
        onOpenProject={(projectId, bridgeId) =>
          navigatePro(resolveImporterLineMasterRoutePath(projectId, bridgeId))
        }
      />
    );
  }

  if (linerRouteId === "liner.list") {
    return (
      <LinerListPage
        project={project}
        onClose={() => navigatePro("/pro")}
        onCreate={createLinerModel}
        onOpenSetup={() => navigatePro(resolveLinerUiRoutePath("liner.setup"))}
        onDelete={deleteLinerModel}
      />
    );
  }

  if (linerRouteId === "liner.setup") {
    if (!linerDraft) {
      return (
        <LinerListPage
          project={project}
          onClose={() => navigatePro("/pro")}
          onCreate={createLinerModel}
          onOpenSetup={() => navigatePro(resolveLinerUiRoutePath("liner.setup"))}
          onDelete={deleteLinerModel}
        />
      );
    }

    return (
      <LinerEditPage
        draft={linerDraft}
        onDraftChange={commitLinerDraft}
        onOpenPreview={() => navigatePro(resolveLinerUiRoutePath("liner.preview"))}
        onOpenMappingReview={() => navigatePro(resolveLinerUiRoutePath("liner.mappingReview"))}
        onClose={() => navigatePro("/pro")}
        onBackToList={() => navigatePro(resolveLinerUiRoutePath("liner.list"))}
      />
    );
  }

  if (linerRouteId === "liner.preview") {
    if (!linerDraft) {
      return (
        <LinerListPage
          project={project}
          onClose={() => navigatePro("/pro")}
          onCreate={createLinerModel}
          onOpenSetup={() => navigatePro(resolveLinerUiRoutePath("liner.setup"))}
          onDelete={deleteLinerModel}
        />
      );
    }

    return (
      <LinerPreviewPage
        draft={linerDraft}
        onClose={() => navigatePro("/pro")}
        onBackToList={() => navigatePro(resolveLinerUiRoutePath("liner.list"))}
        onBackToSetup={() => navigatePro(resolveLinerUiRoutePath("liner.setup"))}
        onOpenMappingReview={() => navigatePro(resolveLinerUiRoutePath("liner.mappingReview"))}
      />
    );
  }

  if (linerRouteId === "liner.mappingReview") {
    if (!linerDraft) {
      return (
        <LinerListPage
          project={project}
          onClose={() => navigatePro("/pro")}
          onCreate={createLinerModel}
          onOpenSetup={() => navigatePro(resolveLinerUiRoutePath("liner.setup"))}
          onDelete={deleteLinerModel}
        />
      );
    }

    return (
      <LinerMappingReviewPage
        draft={linerDraft}
        project={project}
        onClose={() => navigatePro("/pro")}
        onBackToList={() => navigatePro(resolveLinerUiRoutePath("liner.list"))}
        onBackToSetup={() => navigatePro(resolveLinerUiRoutePath("liner.setup"))}
        onBackToPreview={() => navigatePro(resolveLinerUiRoutePath("liner.preview"))}
        onConfirmProject={(nextProject) => {
          commitProject(withProjectLinerDraft(nextProject, linerDraft));
          navigatePro(resolveLinerUiRoutePath("liner.list"));
        }}
        onOpenProjectInViewer={(nextProject) => {
          commitProject(withProjectLinerDraft(nextProject, linerDraft));
          navigatePro("/pro");
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
        onBackToTop={navigateTop}
        onNew={() => {
          commitProject(createDefaultProject());
          setDirty(false);
          log("New model created.");
        }}
        onResetModel={resetModelContents}
        onOpen={openFile}
        onSave={saveProject}
        onValidate={() => void validate()}
        onRun={() => void runAnalysis()}
        onRunEigen={() => void runEigenAnalysis()}
        onRunInfluence={() => void runInfluenceAnalysis()}
        onRunMovingLoad={() => void runMovingLoadAnalysis()}
        onRunResponseSpectrum={() => void runResponseSpectrumAnalysis()}
        onExportResultJson={exportResultJson}
        onExportResultCsv={exportResultCsv}
        onExportResultPdf={exportResultPdf}
        onExportLinerPlanDxf={exportLinerPlanDxf}
        onExportLinerProfileDxf={exportLinerProfileDxf}
        onExportLinerFrameStl={exportLinerFrameStl}
        canExportResults={Boolean(result)}
        canExportCsv={Boolean(result)}
        canExportPdf={Boolean(result)}
        onOpenBridgeWizard={() => setBridgeWizardOpen(true)}
        onOpenTimeHistoryWizard={() => setTimeHistoryWizardOpen(true)}
        onOpenModelComparison={() => {
          navigatePro("/pro/compare");
          setComparisonOpen(true);
        }}
        onOpenLinerList={() => navigatePro(resolveLinerUiRoutePath("liner.list"))}
      />
      <div className="time-history-wizard-entry" aria-label={ja.appShell.timeHistoryEntryAriaLabel}>
        <StatusBadge
          status={selectTimeHistoryMainStatus(project, project.analysisResults?.timeHistory ?? null, {
            running: timeHistoryAnalysis.loading,
            hasResult: Boolean(project.analysisResults?.timeHistory),
            error: timeHistoryAnalysis.error,
          })}
        />
        <ResultSummaryCard result={project.analysisResults?.timeHistory ?? null} />
        <p className="time-history-wizard-description">
          {ja.appShell.timeHistoryEntryDescription}
        </p>
      </div>
      {validationNotice && (
        <div className={`validation-notice ${validationNotice.kind}`}>
          {validationNotice.text}
        </div>
      )}
      {AUTOSAVE_ENABLED && autosaveCandidate && (
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
      {AUTOSAVE_ENABLED && autosaveStatus && !autosaveCandidate && (
        <div className="autosave-status">{autosaveStatus}</div>
      )}
      <div className={`workspace ${dataPanelOpen ? "data-panel-open" : "data-panel-closed"}`}>
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
          viewPanelOpen={viewPanelOpen}
          onViewPanelToggle={handleViewPanelToggle}
        />
        {dataPanelOpen ? (
          <>
            <PropertyPanel
              project={project}
              selected={selectedSection}
              validationPaths={validationPaths}
              onChange={commitProject}
            />
            <button
              type="button"
              className="drawer-toggle data-drawer-toggle data-drawer-close"
              aria-label={ja.workspace.dataPanel.closeAriaLabel}
              aria-expanded={true}
              title={ja.workspace.dataPanel.closeLabel}
              data-testid="close-data-panel"
              onClick={handleDataPanelToggle}
            >
              <PanelLeftClose size={16} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="drawer-toggle data-drawer-toggle data-drawer-open"
            aria-label={ja.workspace.dataPanel.openAriaLabel}
            aria-expanded={false}
            title={ja.workspace.dataPanel.openLabel}
            data-testid="open-data-panel"
            onClick={handleDataPanelToggle}
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>
      <BridgeWizard
        open={bridgeWizardOpen}
        onClose={() => setBridgeWizardOpen(false)}
        onCommit={handleBridgeGenerated}
      />
      <TimeHistoryWizardModal
        open={timeHistoryWizardOpen}
        project={project}
        result={
          timeHistoryAnalysis.result?.timeHistoryResult ??
          (result?.analysisSummary.analysisType === "time_history" ? result.timeHistoryResult ?? null : null) ??
          project.analysisResults?.timeHistory ??
          null
        }
        error={timeHistoryAnalysis.error}
        running={timeHistoryAnalysis.loading}
        onClose={() => setTimeHistoryWizardOpen(false)}
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

function buildDefaultMovingLoadCase(project: ProjectModel, memberId: string): MovingLoadCase {
  const influence = project.analysisSettings.influence;
  const direction = influence?.line.direction ?? { x: 0, y: -1, z: 0 };
  const targets = influence?.targets?.length
    ? influence.targets
    : [
        {
          id: `moving-${memberId}-mz-i`,
          type: "memberEndForce" as const,
          memberId,
          component: "Mz",
          end: "i" as const,
        },
      ];
  return {
    id: "moving-load-1",
    name: ja.defaults.movingLoadCaseName,
    line: {
      id: influence?.line.id ?? `line-${memberId}`,
      memberId,
      stationCount: influence?.line.stationCount ?? 21,
      direction,
    },
    liveLoad: {
      id: "P1",
      type: "singlePoint",
      name: ja.defaults.movingLoadPointName,
      magnitude: 100,
      unit: "kN",
      direction,
    },
    targets,
    options: { includeInfluenceResult: true, includeHistory: true, returnCsv: true },
  };
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
