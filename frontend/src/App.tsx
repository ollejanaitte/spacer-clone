import { useEffect, useMemo, useState } from "react";
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
  SectionKey,
  StructuredMessage,
  ValidationResponse,
} from "./types";
import type { ViewerSelection } from "./viewer/types";

type ExampleProject = {
  id: string;
  name: string;
  description: string;
  project: ProjectModel;
};

export function App() {
  const [project, setProject] = useState<ProjectModel>(() => createDefaultProject());
  const [selectedSection, setSelectedSection] = useState<SectionKey>("nodes");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [activeLoadCase, setActiveLoadCase] = useState<string>(() => createDefaultProject().loadCases[0]?.id ?? "");
  const [bottomTab, setBottomTab] = useState<BottomTab>("results");
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [apiErrors, setApiErrors] = useState<StructuredMessage[]>([]);
  const [examples, setExamples] = useState<ExampleProject[]>([]);
  const [selectedExampleId, setSelectedExampleId] = useState("");
  const [logs, setLogs] = useState<string[]>(["UI ready."]);
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
  const errors = [...(validation?.errors ?? []), ...(result?.errors ?? []), ...apiErrors];
  const warnings = [...(validation?.warnings ?? []), ...(result?.warnings ?? [])];
  const canRun = !running && validation?.valid !== false;

  const commitProject = (nextProject: ProjectModel) => {
    setProject(nextProject);
    setDirty(true);
    setValidation(null);
    setResult(null);
    setApiErrors([]);
    setSelectedNode(null);
    setSelectedMember(null);
    setActiveLoadCase(nextProject.loadCases[0]?.id ?? "");
  };

  const log = (message: string) => {
    setLogs((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 30));
  };

  useEffect(() => {
    void refreshExamples();
  }, []);

  const refreshExamples = async () => {
    try {
      const loadedExamples = await apiClient.loadExamples();
      setExamples(loadedExamples);
      setSelectedExampleId((current) => current || loadedExamples[0]?.id || "");
      log(`Loaded ${loadedExamples.length} examples.`);
    } catch (error) {
      pushApiError(error, "Examples API", setApiErrors);
      setBottomTab("errors");
      log("Examples request failed.");
    }
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
      pushApiError(error, "Validation Error", setApiErrors);
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
      pushApiError(error, "Analysis Error", setApiErrors);
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
      pushApiError(error, "Validation Error", setApiErrors);
      setBottomTab("errors");
      log("Open failed.");
    }
  };

  const saveToApi = async () => {
    setApiErrors([]);
    try {
      const fileName = projectFileName(project);
      await apiClient.saveProject(fileName, project);
      setDirty(false);
      log(`Saved ${fileName} through API.`);
    } catch (error) {
      pushApiError(error, "Save Error", setApiErrors);
      setBottomTab("errors");
      log("Save request failed.");
    }
  };

  const loadFromApi = async () => {
    setApiErrors([]);
    try {
      const fileName = projectFileName(project);
      const loaded = await apiClient.loadProject(fileName);
      commitProject(loaded);
      setDirty(false);
      log(`Loaded ${fileName} through API.`);
    } catch (error) {
      pushApiError(error, "Load Error", setApiErrors);
      setBottomTab("errors");
      log("Load request failed.");
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

  const loadExample = (exampleId: string) => {
    const example = examples.find((item) => item.id === exampleId);
    if (example) {
      setSelectedExampleId(example.id);
      commitProject(example.project);
      setDirty(false);
      log(`Loaded example ${example.name}.`);
    }
  };

  const handleViewerSelection = (nextSelection: ViewerSelection) => {
    setSelectedNode(nextSelection?.type === "node" ? nextSelection.id : null);
    setSelectedMember(nextSelection?.type === "member" ? nextSelection.id : null);
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
        onSave={() => void saveToApi()}
        onLoad={() => void loadFromApi()}
        onValidate={() => void validate()}
        onRun={() => void runAnalysis()}
        onExportJson={exportJson}
        examples={examples}
        selectedExampleId={selectedExampleId}
        onLoadExample={loadExample}
      />
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
        ? "Network Error"
        : fallbackCode
      : fallbackCode;
  setApiErrors([
    {
      code,
      message: error instanceof Error ? error.message : "Unexpected API error.",
      path: null,
      entityType: null,
      entityId: null,
    },
  ]);
}

function projectFileName(project: ProjectModel): string {
  const safeId = (project.project.id || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safeId}.project.json`;
}
