/**
 * Superstructure pipeline panel (STEP 3).
 *
 * Wires the STEP 2 entries into one operational panel:
 *   Geometry -> 3D -> Analysis -> Design -> Replay -> Output
 * Uses the STEP 2 production modules (geometry / visualization / design / replay)
 * and the backend /api/design/analyze for grillage analysis. Numeric results stay
 * NOT_AUTHORIZED (Phase A gate); unresolved states are displayed, never fabricated.
 */

import { useState, useMemo, type ReactElement } from "react";
import { DefaultGeometryEngine } from "../geometry/engine";
import type { GeometrySnapshot } from "../geometry";
import { RB001_GRID_PANEL_SPECS } from "../geometry/gridPoints";
import { RB001_DECK_SPEC } from "../geometry/deck";
import { RB001_CROSS_GIRDER_SPECS } from "../geometry/members";
import type { GeometryEngineInput } from "../geometry/contracts";
import type { LinearAlignment } from "../../liner/core/types";
import { buildSnapshotVisualizationModel } from "../visualization/snapshotVisualizationModel";
import { exportApolloBinaryStl, downloadApolloBinaryStlBundle } from "../export/apolloStlExport";
import { buildGrillageModel } from "../design/grillageModel";
import { runDesignIteration } from "../design/autoDesign";
import { runChecks } from "../design/checkFramework";
import { quantityRowsFromSnapshot, outputFileName } from "../design/designOutput";
import { classifyGeometryReplay } from "../replay/replay";
import { apiClient } from "../../api/client";
import { AuthorizationBanner } from "./AuthorizationBanner";
import { downloadTextFile } from "../quantity/quantityExport";
import type { ProjectModel } from "../../types";
import { linerDraftFromProject } from "../../liner/adapters/linerProjectDraft";
import { buildBridgeProjectAlignment } from "../../bridgeProject/alignmentAdapter";
import { buildBridgeProjectGeometry } from "../../bridgeProject/bridgeGeometryGenerator";
import { buildCommonBridgeModel } from "../../bridgeProject/cbdmDocument";
import { buildBoundGeometryInput } from "../../bridgeProject/superstructureBinding";

const RB001_ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

/** RB-001 full GeometryEngineInput (golden-derived). */
export function buildRb001GeometryInput(): GeometryEngineInput {
  return {
    sourceModelVersion: "1.0.0",
    bridgeId: "RB-S10-001",
    alignmentIds: ["ALN-ACL"],
    supports: [
      { id: "SUP-AR2", state: "CONFIRMED" },
      { id: "SUP-PR1", state: "CONFIRMED" },
      { id: "SUP-PR2", state: "CONFIRMED" },
      { id: "SUP-PU15", state: "CONFIRMED" },
    ],
    girders: [
      { id: "GIRDER-AG1", state: "CONFIRMED" },
      { id: "GIRDER-AG2", state: "CONFIRMED" },
    ],
    gridPointIds: ["GRID-1001", "GRID-1027", "GRID-2001", "GRID-2027"],
    deckIds: ["DECK-01"],
    sectionIds: ["SECTION-DECK"],
    spanLengthsM: [40.201, 51.0, 40.2],
    bridgeLengthM: 134.001,
    girderOffsetsM: {
      "GIRDER-AG1": 1.47689,
      "GIRDER-AG1:end": 1.55372,
      "GIRDER-AG2": -3.02859,
      "GIRDER-AG2:end": -2.94155,
    },
    gridPanelSpecs: RB001_GRID_PANEL_SPECS,
    deckSpecs: [RB001_DECK_SPEC],
    crossGirderSpecs: RB001_CROSS_GIRDER_SPECS,
    unresolved: [],
  };
}

function buildSnapshot(): GeometrySnapshot {
  const engine = new DefaultGeometryEngine({
    alignment: RB001_ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
  return engine.generateSnapshot(buildRb001GeometryInput());
}

type StepState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; detail: string }
  | { status: "error"; message: string };

const IDLE: StepState = { status: "idle" };

function describeSnapshot(s: GeometrySnapshot): string {
  const hold = s.gridPoints.filter((g) => g.state === "HOLD_INSUFFICIENT_SOURCE").length;
  return [
    `supports=${s.supportLines.length}`,
    `girders=${s.girderLines.length}`,
    `grid=${s.gridPoints.length} (hold=${hold})`,
    `deck=${s.deckReferences.length}`,
    `fingerprint=${s.fingerprint}`,
  ].join(" / ");
}

export type SuperstructurePipelinePanelProps = {
  /**
   * When present and carrying a Liner draft with piers/spans, the pipeline runs
   * in BridgeProject-bound mode: the geometry is derived from the road alignment
   * through the shared BridgeProject contract. Girder arrangement below is
   * SUPERSTRUCTURE-OWNED demo input (not a bridge-geometry fact).
   */
  project?: ProjectModel;
};

const BOUND_DEMO_GIRDERS = { "GIRDER-1": -4.0, "GIRDER-2": 4.0 } as const;

type BoundGeometry =
  | { ok: true; input: GeometryEngineInput; bridgeId: string; supports: number; bridgeLengthM: number }
  | { ok: false; message: string };

function buildBoundGeometry(project: ProjectModel | undefined): BoundGeometry | undefined {
  if (!project) {
    return undefined;
  }
  try {
    const linerDraft = linerDraftFromProject(project);
    const piers = linerDraft?.piers ?? [];
    if (!linerDraft || piers.length === 0) {
      return undefined;
    }
    const alignment = buildBridgeProjectAlignment(linerDraft);
    const geometry = buildBridgeProjectGeometry(alignment, piers, linerDraft.spans);
    const commonModel = buildCommonBridgeModel(alignment, geometry);
    const input = buildBoundGeometryInput(commonModel, {
      girderOffsetsM: { ...BOUND_DEMO_GIRDERS },
      girderIds: Object.keys(BOUND_DEMO_GIRDERS),
    });
    return {
      ok: true,
      input,
      bridgeId: geometry.bridgeId,
      supports: geometry.supports.length,
      bridgeLengthM: geometry.bridgeLengthM.value ?? 0,
    };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export function SuperstructurePipelinePanel({
  project,
}: SuperstructurePipelinePanelProps): ReactElement {
  const [mode, setMode] = useState<"sample" | "bound">("sample");
  const [geometry, setGeometry] = useState<StepState>(IDLE);
  const [threeD, setThreeD] = useState<StepState>(IDLE);
  const [analysis, setAnalysis] = useState<StepState>(IDLE);
  const [design, setDesign] = useState<StepState>(IDLE);
  const [replay, setReplay] = useState<StepState>(IDLE);
  const [output, setOutput] = useState<StepState>(IDLE);
  const [snapshot, setSnapshot] = useState<GeometrySnapshot | null>(null);
  const [solidCount, setSolidCount] = useState<number | null>(null);

  const boundGeometry = useMemo(() => buildBoundGeometry(project), [project]);
  const boundAvailable = boundGeometry !== undefined;

  const buildActiveSnapshot = (): GeometrySnapshot => {
    if (mode === "bound" && boundGeometry?.ok) {
      const linerDraft = linerDraftFromProject(project!);
      if (!linerDraft) {
        throw new Error("BridgeProject bound mode requires a Liner draft in the project.");
      }
      return new DefaultGeometryEngine(linerDraft).generateSnapshot(boundGeometry.input);
    }
    return buildSnapshot();
  };

  const runGeometry = (): void => {
    setGeometry({ status: "running" });
    try {
      const snap = buildActiveSnapshot();
      setSnapshot(snap);
      setGeometry({ status: "ok", detail: describeSnapshot(snap) });
    } catch (e) {
      setGeometry({ status: "error", message: (e as Error).message });
    }
  };

  const run3D = (): void => {
    if (!snapshot) {
      setThreeD({ status: "error", message: "先に Geometry 生成を実行してください。" });
      return;
    }
    setThreeD({ status: "running" });
    try {
      const model = buildSnapshotVisualizationModel(snapshot, { bridgeName: "RB-S10-001" });
      setSolidCount(model.solidGeometryParameters.length);
      setThreeD({ status: "ok", detail: `solid parameters=${model.solidGeometryParameters.length}` });
    } catch (e) {
      setThreeD({ status: "error", message: (e as Error).message });
    }
  };

  const runAnalysis = async (): Promise<void> => {
    if (!snapshot) {
      setAnalysis({ status: "error", message: "先に Geometry 生成を実行してください。" });
      return;
    }
    setAnalysis({ status: "running" });
    try {
      const grillage = buildGrillageModel(snapshot);
      const result = await apiClient.analyzeGrillage(grillage);
      setAnalysis({
        status: "ok",
        detail: `authorization=${result.authorization}`,
      });
    } catch (e) {
      setAnalysis({ status: "error", message: (e as Error).message });
    }
  };

  const runDesign = (): void => {
    if (!snapshot) {
      setDesign({ status: "error", message: "先に Geometry 生成を実行してください。" });
      return;
    }
    setDesign({ status: "running" });
    try {
      const iteration = runDesignIteration({ snapshot });
      const checks = runChecks({ snapshot });
      setDesign({
        status: "ok",
        detail: `decision=${iteration.state.decision} / checks=${checks.checks.length} (${checks.authorization})`,
      });
    } catch (e) {
      setDesign({ status: "error", message: (e as Error).message });
    }
  };

  const runReplay = (): void => {
    if (!snapshot) {
      setReplay({ status: "error", message: "先に Geometry 生成を実行してください。" });
      return;
    }
    setReplay({ status: "running" });
    try {
      const report = classifyGeometryReplay(snapshot, {
        expectedSupportStationsM: [0, 40.201, 91.201, 134.001],
        expectedGirderOffsetsM: { "GIRDER-AG1": 1.47689, "GIRDER-AG2": -3.02859 },
        expectedGridPanelCount: 54,
        expectedGridHoldCount: 50,
      });
      setReplay({ status: "ok", detail: `verdict=${report.verdict} / entries=${report.entries.length}` });
    } catch (e) {
      setReplay({ status: "error", message: (e as Error).message });
    }
  };

  const exportQuantityCsv = (): void => {
    if (!snapshot) {
      setOutput({ status: "error", message: "先に Geometry 生成を実行してください。" });
      return;
    }
    const rows = quantityRowsFromSnapshot(snapshot);
    const csv =
      "item,unit,value,basis\n" +
      rows.map((r) => `${r.item},${r.unit},${r.value},${r.basis}`).join("\n");
    downloadTextFile(`${outputFileName("quantity", "RB-S10-001")}.csv`, csv, "text/csv;charset=utf-8");
    setOutput({ status: "ok", detail: `quantity rows=${rows.length} (CSV download)` });
  };

  const exportStl = (): void => {
    if (!snapshot) {
      setOutput({ status: "error", message: "先に Geometry 生成を実行してください。" });
      return;
    }
    const model = buildSnapshotVisualizationModel(snapshot, { bridgeName: "RB-S10-001" });
    exportApolloBinaryStl(model, { includeBearings: true });
    downloadApolloBinaryStlBundle(model, { includeBearings: true });
    setOutput({ status: "ok", detail: "STL (.stl + .apollo.json) download" });
  };

  const renderStep = (title: string, state: StepState, run: () => void, actionLabel: string) => (
    <section data-testid={`pipeline-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <h4>{title}</h4>
      <button type="button" onClick={run} disabled={state.status === "running"}>
        {actionLabel}
      </button>
      {state.status === "running" && <p className="pipeline-loading">実行中…</p>}
      {state.status === "ok" && <p className="pipeline-ok">{state.detail}</p>}
      {state.status === "error" && <p className="pipeline-error">{state.message}</p>}
    </section>
  );

  return (
    <div className="apollo-pipeline" data-testid="apollo-superstructure-pipeline">
      <AuthorizationBanner keys={["UNVERIFIED_DEVELOPMENT_ONLY", "NOT_GRANTED", "PROHIBITED"]} />
      <h3>上部工一気通貫パイプライン</h3>
      <section data-testid="pipeline-mode">
        <label>
          <input
            type="radio"
            name="pipeline-mode"
            checked={mode === "sample"}
            onChange={() => setMode("sample")}
            data-testid="pipeline-mode-sample"
          />
          SAMPLE（RB-001）
        </label>
        <label>
          <input
            type="radio"
            name="pipeline-mode"
            checked={mode === "bound"}
            disabled={!boundAvailable}
            onChange={() => setMode("bound")}
            data-testid="pipeline-mode-bound"
          />
          BridgeProject bound
        </label>
        {boundGeometry?.ok ? (
          <p className="pipeline-ok" data-testid="pipeline-bound-summary">
            bound: bridgeId={boundGeometry.bridgeId} supports={boundGeometry.supports}
            bridgeLengthM={boundGeometry.bridgeLengthM}
          </p>
        ) : boundGeometry === undefined ? (
          <p className="pipeline-error" data-testid="pipeline-bound-unavailable">
            BridgeProject bound は道路線形（pier 配置）がある場合に利用できます。
          </p>
        ) : (
          <p className="pipeline-error" data-testid="pipeline-bound-error">
            bound error: {boundGeometry.message}
          </p>
        )}
      </section>
      {renderStep("Geometry", geometry, runGeometry, mode === "bound" ? "Geometry 生成 (bound)" : "Geometry 生成")}
      {renderStep("3D", threeD, run3D, "3D モデル生成")}
      {renderStep("Analysis", analysis, runAnalysis, "解析実行")}
      {renderStep("Design", design, runDesign, "設計実行")}
      {renderStep("Replay", replay, runReplay, "Replay 実行")}
      <section data-testid="pipeline-output">
        <h4>Output</h4>
        <button type="button" onClick={exportQuantityCsv}>数量 CSV 出力</button>
        <button type="button" onClick={exportStl}>STL 出力</button>
        {output.status === "ok" && <p className="pipeline-ok">{output.detail}</p>}
        {output.status === "error" && <p className="pipeline-error">{output.message}</p>}
      </section>
      {solidCount !== null && <p data-testid="pipeline-solid-count">solid={solidCount}</p>}
    </div>
  );
}
