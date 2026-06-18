import { useState } from "react";
import { apiClient } from "../api/client";
import { PropertyPanel } from "../components/PropertyPanel";
import { ProjectTree } from "../components/ProjectTree";
import type { AnalysisResult, ProjectModel, SectionKey } from "../types";
import { Viewer3D } from "../viewer/Viewer3D";
import {
  loadViewerDisplaySize,
  type ViewerDisplaySizeSettings,
} from "../viewer/settings/displaySize";
import { copyModelAToB, createModelComparisonState } from "./modelComparisonState";

type ModelComparisonWorkspaceProps = {
  modelA: ProjectModel;
  onClose: () => void;
};

/** Pattern-A comparison workspace: A is read-only and B is an editable deep copy. */
export function ModelComparisonWorkspace({ modelA, onClose }: ModelComparisonWorkspaceProps) {
  const [models, setModels] = useState(() => createModelComparisonState(modelA));
  const [resultA, setResultA] = useState<AnalysisResult | null>(null);
  const [resultB, setResultB] = useState<AnalysisResult | null>(null);
  const [running, setRunning] = useState<"A" | "B" | null>(null);
  const [selectedBSection, setSelectedBSection] = useState<SectionKey>("nodes");
  const [displaySize, setDisplaySize] =
    useState<ViewerDisplaySizeSettings>(loadViewerDisplaySize);

  const run = async (side: "A" | "B") => {
    const project = side === "A" ? models.modelA : models.modelB;
    if (!project) return;
    setRunning(side);
    try {
      const response = await apiClient.runAnalysis(project);
      if (side === "A") setResultA(response.result);
      else setResultB(response.result);
    } finally {
      setRunning(null);
    }
  };

  const viewerProps = {
    selectedSection: "nodes" as const,
    selection: null,
    onSelectionChange: () => undefined,
    onActiveLoadCaseChange: () => undefined,
    displaySizeSettings: displaySize,
    onDisplaySizeSettingsChange: setDisplaySize,
  };

  return (
    <main className="model-comparison-workspace" data-testid="model-comparison-workspace">
      <header className="comparison-workspace-header">
        <div>
          <h1>A/B 比較</h1>
          <p>Aは読取専用、Bのみ編集可能です。</p>
        </div>
        <div>
          <button
            type="button"
            data-testid="copy-a-to-b"
            onClick={() => {
              setModels((current) => copyModelAToB(current));
              setResultB(null);
            }}
          >
            AをBにコピー
          </button>
          <button type="button" onClick={onClose}>通常画面へ戻る</button>
        </div>
      </header>
      <div className="comparison-split-pane">
        <section className="comparison-model-pane" data-testid="model-a-pane">
          <header><h2>モデルA</h2><strong>読取専用</strong></header>
          <button type="button" disabled={running !== null} onClick={() => void run("A")}>
            {running === "A" ? "解析中..." : "Aを解析"}
          </button>
          <Viewer3D
            {...viewerProps}
            project={models.modelA}
            result={resultA}
            activeLoadCase={models.modelA.loadCases[0]?.id ?? ""}
          />
        </section>
        <section className="comparison-model-pane" data-testid="model-b-pane">
          <header><h2>モデルB</h2><strong>編集可能</strong></header>
          {!models.modelB ? (
            <div className="comparison-empty">「AをBにコピー」で比較モデルを作成してください。</div>
          ) : (
            <>
              <button type="button" disabled={running !== null} onClick={() => void run("B")}>
                {running === "B" ? "解析中..." : "Bを解析"}
              </button>
              <Viewer3D
                {...viewerProps}
                project={models.modelB}
                result={resultB}
                activeLoadCase={models.modelB.loadCases[0]?.id ?? ""}
              />
              <div className="comparison-editor">
                <ProjectTree
                  project={models.modelB}
                  selected={selectedBSection}
                  onSelect={setSelectedBSection}
                />
                <PropertyPanel
                  project={models.modelB}
                  selected={selectedBSection}
                  validationPaths={new Set()}
                  onChange={(modelB) => {
                    setModels((current) => ({ ...current, modelB }));
                    setResultB(null);
                  }}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
