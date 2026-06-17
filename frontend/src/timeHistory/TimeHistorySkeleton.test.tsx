// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { ja } from "../i18n/ja";
import type { AnalysisResult, ProjectModel } from "../types";
import { ResultsPanel } from "../components/ResultsPanel";
import { GroundMotionManagerPanel } from "./GroundMotionManagerPanel";
import { TimeHistoryResultViewer } from "./TimeHistoryResultViewer";
import { TimeHistorySettingsPanel } from "./TimeHistorySettingsPanel";
import { useTimeHistoryAnalysis } from "./useTimeHistoryAnalysis";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
type TimeHistoryHookController = ReturnType<typeof useTimeHistoryAnalysis>;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Time History UI skeleton", () => {
  it("renders the Time History tab skeleton", () => {
    render(
      <ResultsPanel
        activeTab="timeHistory"
        project={timeHistoryProject()}
        result={null}
        errors={[]}
        warnings={[]}
        activeLoadCase=""
        selectedEigenMode={1}
        selectedResponseSpectrumResult="SRSS"
        selectedNode={null}
        selectedMember={null}
        logs={[]}
        onTabChange={() => undefined}
        onSelectedEigenModeChange={() => undefined}
        onSelectedResponseSpectrumResultChange={() => undefined}
      />,
    );

    expect(document.body.textContent).toContain(ja.timeHistory.settingsHeading);
    expect(document.body.textContent).toContain(ja.timeHistory.groundMotionManager.heading);
    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.heading);
  });

  it("renders settings panel labels from i18n", () => {
    render(<TimeHistorySettingsPanel project={timeHistoryProject()} />);

    expect(document.body.textContent).toContain(ja.timeHistory.fields.massCase);
    expect(document.body.textContent).toContain(ja.timeHistory.fields.groundMotion);
    expect(document.body.textContent).toContain(ja.timeHistory.fields.rayleighAlpha);
    expect(document.body.textContent).toContain(ja.timeHistory.fields.runButton);
  });

  it("renders the Run button enabled when a project exists", () => {
    render(<TimeHistorySettingsPanel project={timeHistoryProject()} onRun={() => undefined} />);

    expect(button(ja.timeHistory.fields.runButton).disabled).toBe(false);
  });

  it("renders the ground motion manager skeleton", () => {
    render(<GroundMotionManagerPanel groundMotions={timeHistoryProject().groundMotions} />);

    expect(document.body.textContent).toContain(ja.timeHistory.groundMotionManager.columns.sampleCount);
    expect(document.body.textContent).toContain("gm-001");
    expect(document.body.textContent).toContain("3");
  });

  it("renders the result viewer skeleton with an empty result", () => {
    render(<TimeHistoryResultViewer />);

    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.empty);
    expect(document.body.textContent).toContain(ja.timeHistory.status.notRun);
  });

  it("renders sampleCount, timeStep, and duration from a mock API result", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.sampleCount}: 3`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.timeStep}: 0.05`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.duration}: 0.1`);
  });
});

describe("Time History connected run button", () => {
  it("calls the time history endpoint with the current project payload", async () => {
    const project = timeHistoryProject();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ result: timeHistoryResult() }));
    renderTimeHistoryPanel(project);

    await clickRun();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { project: ProjectModel };
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analysis/time-history",
      expect.objectContaining({ method: "POST" }),
    );
    expect(body.project.project.id).toBe(project.project.id);
    expect(body.project.groundMotions?.[0]?.id).toBe("gm-001");
    expect(body.project.analysisSettings.timeHistory?.timeStep).toBe(0.05);
  });

  it("disables the Run button while loading", async () => {
    const deferred = createDeferred<Response>();
    vi.spyOn(globalThis, "fetch").mockReturnValue(deferred.promise);
    renderTimeHistoryPanel(timeHistoryProject());

    await act(async () => {
      button(ja.timeHistory.fields.runButton).click();
      await Promise.resolve();
    });
    expect(button(ja.timeHistory.status.running).disabled).toBe(true);

    await act(async () => {
      deferred.resolve(jsonResponse({ result: timeHistoryResult() }));
      await deferred.promise;
    });
  });

  it("updates status and result summary from a success envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ result: timeHistoryResult() }));
    renderTimeHistoryPanel(timeHistoryProject());

    await clickRun();

    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.status}: ${ja.timeHistory.status.success}`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.sampleCount}: 3`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.timeStep}: 0.05`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.duration}: 0.1`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.availableKeysCount}: 3`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.firstKey}: displacements`);
  });

  it("updates status and error summary from a failed envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ result: failedTimeHistoryResult() }));
    renderTimeHistoryPanel(timeHistoryProject());

    await clickRun();

    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.status}: ${ja.timeHistory.status.failed}`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.error.code}: TIME_HISTORY_GROUND_MOTION_MISSING`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.error.path}: /groundMotions`);
  });

  it("updates the error summary on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    renderTimeHistoryPanel(timeHistoryProject());

    await clickRun();

    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.status}: ${ja.timeHistory.status.networkError}`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.error.code}: TIME_HISTORY_NETWORK_ERROR`);
    expect(document.body.textContent).toContain(ja.timeHistory.error.network);
  });

  it("does not mutate the project object during the API call", async () => {
    const project = timeHistoryProject();
    const before = JSON.stringify(project);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ result: timeHistoryResult() }));
    let latest: TimeHistoryHookController | undefined;
    render(<HookProbe onState={(state) => { latest = state; }} />);

    await act(async () => {
      await latest?.run(project);
    });

    expect(JSON.stringify(project)).toBe(before);
  });
});

describe("useTimeHistoryAnalysis", () => {
  it("handles a success envelope", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ result: timeHistoryResult() }));
    let latest: TimeHistoryHookController | undefined;
    render(<HookProbe onState={(state) => { latest = state; }} />);

    await act(async () => {
      await latest?.run(timeHistoryProject());
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analysis/time-history",
      expect.objectContaining({ method: "POST" }),
    );
    const state = requireLatest(latest);
    expect(state.loading).toBe(false);
    expect(state.result?.analysisSummary.status).toBe("success");
    expect(state.error).toBeNull();
  });

  it("handles a failed envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ result: failedTimeHistoryResult() }));
    let latest: TimeHistoryHookController | undefined;
    render(<HookProbe onState={(state) => { latest = state; }} />);

    await act(async () => {
      await latest?.run(timeHistoryProject());
    });

    const state = requireLatest(latest);
    expect(state.loading).toBe(false);
    expect(state.result?.analysisSummary.status).toBe("failed");
    expect(state.error?.code).toBe("TIME_HISTORY_GROUND_MOTION_MISSING");
  });
});

function HookProbe({ onState }: { onState: (state: ReturnType<typeof useTimeHistoryAnalysis>) => void }) {
  const state = useTimeHistoryAnalysis();
  onState(state);
  return null;
}

function requireLatest(state: TimeHistoryHookController | undefined): TimeHistoryHookController {
  if (!state) throw new Error("Hook state was not captured.");
  return state;
}

function render(node: ReactNode) {
  if (!root) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  act(() => {
    root?.render(node);
  });
}

function renderTimeHistoryPanel(project: ProjectModel) {
  render(
    <ResultsPanel
      activeTab="timeHistory"
      project={project}
      result={null}
      errors={[]}
      warnings={[]}
      activeLoadCase=""
      selectedEigenMode={1}
      selectedResponseSpectrumResult="SRSS"
      selectedNode={null}
      selectedMember={null}
      logs={[]}
      onTabChange={() => undefined}
      onSelectedEigenModeChange={() => undefined}
      onSelectedResponseSpectrumResultChange={() => undefined}
    />,
  );
}

async function clickRun() {
  await act(async () => {
    button(ja.timeHistory.fields.runButton).click();
  });
}

function button(label: string): HTMLButtonElement {
  const element = [...document.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  );
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Button not found: ${label}`);
  return element;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as Response;
}

function timeHistoryProject(): ProjectModel {
  const project = createDefaultProject();
  return {
    ...project,
    analysisSettings: {
      ...project.analysisSettings,
      timeHistory: {
        enabled: true,
        method: "newmark-beta",
        timeStep: 0.05,
        duration: 0.1,
        beta: 0.25,
        gamma: 0.5,
        damping: { type: "rayleigh", alpha: 0, beta: 0 },
        massCaseId: "mass-1",
        groundMotionId: "gm-001",
        direction: "X",
      },
    },
    groundMotions: [
      {
        id: "gm-001",
        name: "Test motion",
        direction: "X",
        timeStep: 0.05,
        duration: 0.1,
        unit: "m/s2",
        samples: [0, 1, 0],
      },
    ],
  };
}

function timeHistoryResult(): AnalysisResult {
  return {
    projectId: "p1",
    schemaVersion: "1.0.0",
    analysisSummary: {
      analysisType: "time_history",
      status: "success",
      startedAt: "2026-06-17T00:00:00Z",
      finishedAt: "2026-06-17T00:00:00Z",
      durationMs: 1,
      nodeCount: 2,
      memberCount: 1,
      loadCaseCount: 1,
      totalDof: 12,
      freeDof: 1,
      constrainedDof: 11,
      solver: "newmark_beta",
    },
    displacements: [],
    reactions: [],
    memberEndForces: [],
    warnings: [],
    errors: [],
    timeHistoryResult: {
      meta: {
        analysisId: "th-mock",
        status: "success",
        method: "newmark-beta",
        timeStep: 0.05,
        duration: 0.1,
        sampleCount: 3,
      },
      time: [0, 0.05, 0.1],
      displacements: { N2: [0, 0.1, 0] },
      velocities: { N2: [0, 0.2, 0] },
      accelerations: { N2: [0, 0.3, 0] },
    },
  };
}

function failedTimeHistoryResult(): AnalysisResult {
  return {
    ...timeHistoryResult(),
    analysisSummary: {
      ...timeHistoryResult().analysisSummary,
      status: "failed",
    },
    errors: [
      {
        code: "TIME_HISTORY_GROUND_MOTION_MISSING",
        message: "Time history analysis requires a single ground motion record.",
        path: "/groundMotions",
        entityType: null,
        entityId: null,
      },
    ],
    timeHistoryResult: null,
  };
}
