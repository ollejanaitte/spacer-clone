import { useEffect, useMemo, useRef, useState } from "react";
import { ja } from "../../i18n/ja";
import { ThreeViewport } from "../../viewer/ThreeViewport";
import { defaultScales, defaultVisibility, type CameraPreset } from "../../viewer/types";
import type { AnalysisResult, ProjectModel, TimeHistoryResult } from "../../types";
import { useTimeHistoryAnimation } from "../TimeHistoryAnimationContext";

type TimeHistoryAnimationViewerPanelProps = {
  project: ProjectModel;
  result: TimeHistoryResult | null | undefined;
};

/**
 * Embedded 3D viewer for the Time History animation tab. The
 * component reuses the existing `ThreeViewport`. The viewer reads
 * its state from the surrounding `TimeHistoryAnimationProvider` so
 * the same controls drive the same deformation.
 *
 * The viewer is display-only: it never mutates the project
 * payload, the analysis result, or the API contract. The
 * synthetic `AnalysisResult` is built locally and is not
 * persisted anywhere.
 */
export function TimeHistoryAnimationViewerPanel({ project, result }: TimeHistoryAnimationViewerPanelProps) {
  const labels = ja.timeHistoryWizard.animation;
  const animation = useTimeHistoryAnimation();
  const hasDisplacementData = Boolean(
    result && result.displacements && Object.keys(result.displacements).length > 0,
  );
  const enabled = animation.enabled && hasDisplacementData;
  const fitRequestRef = useRef(0);
  const [fitRequest, setFitRequest] = useState(0);
  const [cameraRequest, setCameraRequest] = useState<CameraPreset | null>(null);
  useEffect(() => {
    if (enabled) {
      fitRequestRef.current += 1;
      setFitRequest(fitRequestRef.current);
    }
  }, [result?.meta?.analysisId, enabled]);
  const syntheticResult = useMemo<AnalysisResult | null>(() => {
    if (!result) return null;
    const now = new Date().toISOString();
    return {
      projectId: project.project.id,
      schemaVersion: "1.0.0",
      analysisSummary: {
        analysisType: "time_history",
        status: "success",
        startedAt: now,
        finishedAt: now,
        durationMs: 0,
        nodeCount: project.nodes.length,
        memberCount: project.members.length,
        loadCaseCount: project.loadCases.length,
        totalDof: 0,
        freeDof: 0,
        constrainedDof: 0,
        solver: "newmark_beta",
      },
      displacements: [],
      reactions: [],
      memberEndForces: [],
      timeHistoryResult: result,
      warnings: [],
      errors: [],
    };
  }, [project, result]);
  if (!enabled || !syntheticResult) {
    return (
      <div className="time-history-animation-viewer-panel" aria-label={labels.embeddingHeading}>
        <h3>{labels.embeddingHeading}</h3>
        <p className="time-history-wizard-help">{labels.embeddingHelp}</p>
        <div className="empty-state">{result ? labels.placeholder : labels.emptyResult}</div>
      </div>
    );
  }
  return (
    <div className="time-history-animation-viewer-panel" aria-label={labels.embeddingHeading}>
      <h3>{labels.embeddingHeading}</h3>
      <p className="time-history-wizard-help">{labels.embeddingHelp}</p>
      <div className="time-history-animation-viewer-host">
        <ThreeViewport
          project={project}
          result={syntheticResult}
          selectedSection="nodes"
          selection={null}
          activeLoadCase={project.loadCases[0]?.id ?? ""}
          selectedEigenMode={1}
          selectedResponseSpectrumResult="SRSS"
          onSelectionChange={() => undefined}
          onActiveLoadCaseChange={() => undefined}
          onSelectedEigenModeChange={() => undefined}
          onSelectedResponseSpectrumResultChange={() => undefined}
          onViewerError={() => undefined}
          timeHistoryNodeOverride={animation.override}
          visibility={{ ...defaultVisibility, deformedShape: true, reactions: false, axialForce: false, momentMy: false, momentMz: false }}
          scales={{ ...defaultScales, deformationScale: animation.displacementScale }}
          selectedLoadCaseId={project.loadCases[0]?.id ?? ""}
          fitRequest={fitRequest}
          cameraRequest={cameraRequest}
          onInitializationError={() => undefined}
        />
      </div>
      <div className="summary-list">
        <button type="button" onClick={() => { fitRequestRef.current += 1; setFitRequest(fitRequestRef.current); }}>{"fit"}</button>
        <button type="button" onClick={() => setCameraRequest("iso")}>{"iso"}</button>
        <button type="button" onClick={() => setCameraRequest("xy")}>{"xy"}</button>
        <button type="button" onClick={() => setCameraRequest("yz")}>{"yz"}</button>
        <button type="button" onClick={() => setCameraRequest("xz")}>{"xz"}</button>
      </div>
    </div>
  );
}
