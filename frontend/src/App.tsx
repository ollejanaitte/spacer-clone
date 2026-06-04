import { useMemo, useState } from "react";
import { apiClient } from "./api/client";
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
  SectionKey,
  StructuredMessage,
  ValidationResponse,
} from "./types";

export function App() {
  const [project, setProject] = useState<ProjectModel>(() => createDefaultProject());
  const [selectedSection, setSelectedSection] = useState<SectionKey>("nodes");
  const [bottomTab, setBottomTab] = useState<BottomTab>("results");
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiErrors, setApiErrors] = useState<StructuredMessage[]>([]);
  const [logs, setLogs] = useState<string[]>(["UI ready."]);
  const [dirty, setDirty] = useState(false);
  const [running, setRunning] = useState(false);

  const validationPaths = useMemo(
    () => new Set((validation?.errors ?? []).map((error) => error.path).filter(Boolean) as string[]),
    [validation],
  );
  const errors = [...(validation?.errors ?? []), ...(result?.errors ?? []), ...apiErrors];
  const warnings = [...(validation?.warnings ?? []), ...(result?.warnings ?? [])];
  const canRun = !running && validation?.valid !== false;

  const commitProject = (nextProject: ProjectModel) => {
    setProject(nextProject);
    setDirty(true);
    setValidation(null);
    setResult(null);
  };

  const log = (message: string) => {
    setLogs((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 30));
  };

  const validate = async (): Promise<ValidationResponse | null> => {
    setApiErrors([]);
    try {
      const response = await apiClient.validateProject(project);
      setValidation(response);
      setBottomTab(response.valid ? "results" : "errors");
      log(response.valid ? "Validation passed." : "Validation failed.");
      return response;
    } catch (error) {
      pushApiError(error, setApiErrors);
      setBottomTab("errors");
      log("Validation request failed.");
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
        setBottomTab("errors");
        log("Analysis blocked by validation errors.");
        return;
      }
      const response = await apiClient.runAnalysis(project);
      setResult(response.result);
      setBottomTab(response.result.errors.length > 0 ? "errors" : "results");
      log(`Analysis finished with status ${response.result.analysisSummary.status}.`);
    } catch (error) {
      pushApiError(error, setApiErrors);
      setBottomTab("errors");
      log("Analysis request failed.");
    } finally {
      setRunning(false);
    }
  };

  const openFile = async (file: File) => {
    try {
      const loaded = JSON.parse(await file.text()) as ProjectModel;
      commitProject(loaded);
      setDirty(false);
      log(`Opened ${file.name}.`);
    } catch (error) {
      pushApiError(error, setApiErrors);
      setBottomTab("errors");
      log("Open failed.");
    }
  };

  const exportJson = () => {
    const blob = new Blob([`${JSON.stringify(project, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.project.id || "project"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    log("Project JSON exported.");
  };

  const loadSample = async () => {
    try {
      const examples = await apiClient.loadExamples();
      if (examples[0]) {
        commitProject(examples[0].project);
        setDirty(false);
        log(`Loaded sample ${examples[0].name}.`);
      }
    } catch (error) {
      pushApiError(error, setApiErrors);
      setBottomTab("errors");
      log("Sample load failed.");
    }
  };

  return (
    <div className="app-shell">
      <Toolbar
        projectName={project.project.name}
        dirty={dirty}
        validationStatus={validation ? (validation.valid ? "valid" : "invalid") : "not validated"}
        analysisStatus={running ? "running" : result?.analysisSummary.status ?? "not run"}
        canRun={canRun}
        onNew={() => {
          commitProject(createDefaultProject());
          setDirty(false);
          log("New project created.");
        }}
        onOpen={openFile}
        onSave={() => {
          setDirty(false);
          log("Project marked saved locally.");
        }}
        onValidate={() => void validate()}
        onRun={() => void runAnalysis()}
        onExportJson={exportJson}
        onLoadSample={() => void loadSample()}
      />
      <div className="workspace">
        <ProjectTree project={project} selected={selectedSection} onSelect={setSelectedSection} />
        <Viewer3D project={project} result={result} selectedSection={selectedSection} />
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
        logs={logs}
        onTabChange={setBottomTab}
      />
    </div>
  );
}

function pushApiError(
  error: unknown,
  setApiErrors: (messages: StructuredMessage[]) => void,
) {
  setApiErrors([
    {
      code: "API_ERROR",
      message: error instanceof Error ? error.message : "Unexpected API error.",
      path: null,
      entityType: null,
      entityId: null,
    },
  ]);
}
