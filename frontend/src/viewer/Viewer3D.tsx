import { useEffect, useMemo, useState } from "react";
import type { CameraPreset, Viewer3DProps, ViewerScales, ViewerSelection, ViewerVisibility } from "./types";
import { ThreeViewport } from "./ThreeViewport";
import { ViewerControls } from "./ViewerControls";

const defaultVisibility: ViewerVisibility = {
  nodes: true,
  members: true,
  supports: true,
  loads: true,
  labels: true,
  nodeLabels: true,
  memberLabels: true,
  grid: true,
  axes: true,
  deformedShape: false,
};

const defaultScales: ViewerScales = {
  loadScale: 1,
  deformationScale: 120,
  nodeSize: 0.075,
  labelSize: 0.26,
};

export function Viewer3D({ project, result, selectedSection }: Viewer3DProps) {
  const [visibility, setVisibility] = useState<ViewerVisibility>(defaultVisibility);
  const [scales, setScales] = useState<ViewerScales>(defaultScales);
  const [selection, setSelection] = useState<ViewerSelection>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [cameraRequest, setCameraRequest] = useState<CameraPreset | null>(null);
  const loadCaseIds = useMemo(
    () => project.loadCases.map((loadCase) => loadCase.id).filter(Boolean),
    [project.loadCases],
  );
  const [selectedLoadCaseId, setSelectedLoadCaseId] = useState(loadCaseIds[0] ?? "");
  const hasResult = Boolean(result && result.errors.length === 0 && result.displacements.length > 0);

  useEffect(() => {
    if (!loadCaseIds.includes(selectedLoadCaseId)) {
      setSelectedLoadCaseId(loadCaseIds[0] ?? "");
    }
  }, [loadCaseIds, selectedLoadCaseId]);

  useEffect(() => {
    if (!hasResult && visibility.deformedShape) {
      setVisibility((current) => ({ ...current, deformedShape: false }));
    }
  }, [hasResult, visibility.deformedShape]);

  const runCameraPreset = (preset: CameraPreset) => {
    setCameraRequest(preset);
    setFitRequest((value) => value + 1);
  };

  return (
    <main className="viewer-shell">
      <div className="viewer-header">
        <div>
          <h2>3D Viewer</h2>
          <p>{statusText(selection, hasResult)}</p>
        </div>
        <div className="viewer-stats">
          <span>{project.nodes.length} nodes</span>
          <span>{project.members.length} members</span>
          <span>{project.supports.length} supports</span>
          <span>{project.nodalLoads.length + project.memberLoads.length} loads</span>
        </div>
      </div>
      <section className="viewer-body">
        <ThreeViewport
          project={project}
          result={result}
          selectedSection={selectedSection}
          visibility={visibility}
          scales={scales}
          selectedLoadCaseId={selectedLoadCaseId}
          selection={selection}
          fitRequest={fitRequest}
          cameraRequest={cameraRequest}
          onSelectionChange={setSelection}
        />
        <ViewerControls
          visibility={visibility}
          scales={scales}
          loadCaseIds={loadCaseIds.length > 0 ? loadCaseIds : [""]}
          selectedLoadCaseId={selectedLoadCaseId}
          hasResult={hasResult}
          onVisibilityChange={setVisibility}
          onScalesChange={setScales}
          onLoadCaseChange={setSelectedLoadCaseId}
          onFit={() => setFitRequest((value) => value + 1)}
          onCameraPreset={runCameraPreset}
        />
      </section>
    </main>
  );
}

function statusText(selection: ViewerSelection, hasResult: boolean): string {
  const selected = selection ? `${selection.type} ${selection.id}` : "no selection";
  return `${selected} | ${hasResult ? "result deformation available" : "input model view"}`;
}
