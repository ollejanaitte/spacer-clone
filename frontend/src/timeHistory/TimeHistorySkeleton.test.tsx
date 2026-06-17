// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { ja } from "../i18n/ja";
import type { AnalysisResult, ProjectModel } from "../types";
import { ResultsPanel } from "../components/ResultsPanel";
import { H24_WAVEFORM_NAMES } from "./h24GroundMotionImport";
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
        onProjectChange={() => undefined}
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

    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.noResult);
    expect(document.body.textContent).toContain(ja.timeHistory.status.notRun);
  });

  it("renders sampleCount, timeStep, and duration from a mock API result", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.sampleCount}: 3`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.timeStep}: 0.05`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.duration}: 0.1`);
  });
});

describe("Time History basic result table", () => {
  it("renders no-result state", () => {
    render(<TimeHistoryResultViewer result={null} />);

    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.noResult);
  });

  it("renders a displacement table", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    expect(tableText()).toContain(ja.timeHistory.resultViewer.table.time);
    expect(tableText()).toContain(ja.timeHistory.resultViewer.table.value);
    expect(tableText()).toContain("0.05");
    expect(tableText()).toContain("0.100");
  });

  it("renders a velocity table after series selection", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    clickInputByLabel(ja.timeHistory.resultViewer.seriesVelocity);

    expect(tableText()).toContain("0.200");
  });

  it("renders an acceleration table after series selection", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    clickInputByLabel(ja.timeHistory.resultViewer.seriesAcceleration);

    expect(tableText()).toContain("0.300");
  });

  it("changes displayed values from the response key selector", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    changeSelect(ja.timeHistory.resultViewer.responseKeyLabel, "N3_ux");

    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.selectedKey}: N3_ux`);
    expect(tableText()).toContain("2.000");
  });

  it("limits displayed rows to 100", () => {
    render(<TimeHistoryResultViewer result={largeTimeHistoryResult().timeHistoryResult} status="success" />);

    expect(document.querySelectorAll("tbody tr")).toHaveLength(100);
    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.table.showing(100, 150));
  });

  it("shows the displayed sample count", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.totalSamples}: 3`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.displayedSamples}: 3`);
  });

  it("does not crash on invalid data", () => {
    const invalidResult = {
      ...timeHistoryResult().timeHistoryResult!,
      time: [],
      displacements: { N2_ux: [1] },
    };

    expect(() => render(<TimeHistoryResultViewer result={invalidResult} status="success" />)).not.toThrow();
    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.noResult);
  });
});

describe("Time History minimal editing", () => {
  it("renders settings fields", () => {
    renderTimeHistoryPanel(timeHistoryProject());

    expect(input(ja.timeHistory.fields.timeStep)).toBeInstanceOf(HTMLInputElement);
    expect(input(ja.timeHistory.fields.duration)).toBeInstanceOf(HTMLInputElement);
    expect(input(ja.timeHistory.fields.rayleighAlpha)).toBeInstanceOf(HTMLInputElement);
    expect(input(ja.timeHistory.fields.rayleighBeta)).toBeInstanceOf(HTMLInputElement);
  });

  it("editing timeStep updates project payload", () => {
    const harness = renderEditingHarness();

    changeInput(ja.timeHistory.fields.timeStep, "0.02");

    expect(harness.current().analysisSettings.timeHistory?.timeStep).toBe(0.02);
  });

  it("editing duration updates project payload", () => {
    const harness = renderEditingHarness();

    changeInput(ja.timeHistory.fields.duration, "1.5");

    expect(harness.current().analysisSettings.timeHistory?.duration).toBe(1.5);
  });

  it("editing Rayleigh alpha and beta updates project payload", () => {
    const harness = renderEditingHarness();

    changeInput(ja.timeHistory.fields.rayleighAlpha, "0.11");
    changeInput(ja.timeHistory.fields.rayleighBeta, "0.22");

    expect(harness.current().analysisSettings.timeHistory?.damping?.alpha).toBe(0.11);
    expect(harness.current().analysisSettings.timeHistory?.damping?.beta).toBe(0.22);
  });

  it("editing ground motion samples updates project payload", () => {
    const harness = renderEditingHarness();

    changeTextarea(ja.timeHistory.groundMotionManager.editor.samples, "0\n1, 2\n3");

    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0, 1, 2, 3]);
  });

  it("invalid sample text shows validation error", () => {
    const harness = renderEditingHarness();

    changeTextarea(ja.timeHistory.groundMotionManager.editor.samples, "0, nope");

    expect(document.body.textContent).toContain(ja.timeHistory.validation.samples);
    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0, 1, 0]);
  });

  it("Run button sends edited project payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ result: timeHistoryResult() }));
    renderEditingHarness();

    changeInput(ja.timeHistory.fields.timeStep, "0.03");
    changeTextarea(ja.timeHistory.groundMotionManager.editor.samples, "0, 4, 8");
    await clickRun();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { project: ProjectModel };
    expect(body.project.analysisSettings.timeHistory?.timeStep).toBe(0.03);
    expect(body.project.groundMotions?.[0]?.samples).toEqual([0, 4, 8]);
  });

  it("saved project JSON keeps time history settings and ground motions", () => {
    const project = timeHistoryProject();
    const loaded = JSON.parse(JSON.stringify(project)) as ProjectModel;

    expect(loaded.analysisSettings.timeHistory?.timeStep).toBe(0.05);
    expect(loaded.groundMotions?.[0]?.samples).toEqual([0, 1, 0]);
  });
});
describe("Time History ground motion CSV import", () => {
  function csvFile(name: string, contents: string): File {
    return new File([contents], name, { type: "text/csv" });
  }

  function inputByLabel(label: string): HTMLInputElement {
    const element = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!element) throw new Error(`Input not found: ${label}`);
    return element;
  }

  function setCsvInputValue(file: File) {
    const fileInput = inputByLabel(ja.timeHistory.groundMotionManager.importFileLabel);
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    });
    act(() => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  it("imports a one-column CSV with a header into the first ground motion", async () => {
    const project = timeHistoryProject();
    const before = JSON.parse(JSON.stringify(project)) as ProjectModel;
    const harness = renderEditingHarness(project);
    setCsvInputValue(csvFile("elcentro.csv", "acceleration\n0.0\n12.3\n-5.2\n0.0\n"));

    await waitFor(() => {
      expect(document.body.textContent).toContain("elcentro.csv");
    });
    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0.0, 12.3, -5.2, 0.0]);
    expect(harness.current().groundMotions?.[0]?.id).toBe(before.groundMotions?.[0]?.id);
    expect(harness.current().groundMotions?.[0]?.timeStep).toBe(before.groundMotions?.[0]?.timeStep);
  });

  it("imports a one-column CSV without a header", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setCsvInputValue(csvFile("noheader.csv", "1.0\n2.0\n3.0"));

    await waitFor(() => {
      expect(harness.current().groundMotions?.[0]?.samples).toEqual([1.0, 2.0, 3.0]);
    });
  });

  it('imports a two-column CSV and estimates the time step', async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setCsvInputValue(csvFile('two_col.csv', 'time,acceleration\n0.00,0.0\n0.05,12.3\n0.10,-5.2\n'));

    await waitFor(() => {
      expect(harness.current().groundMotions?.[0]?.samples).toEqual([0.0, 12.3, -5.2]);
    });
    expect(harness.current().groundMotions?.[0]?.timeStep).toBeCloseTo(0.05, 9);
    expect(harness.current().groundMotions?.[0]?.duration).toBeCloseTo(0.1, 9);
  });

  it("rejects non-numeric tokens and surfaces an error", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setCsvInputValue(csvFile("bad.csv", "time,acceleration\n0.0,1.0\n0.05,NaN\n"));

    await waitFor(() => {
      expect(document.body.textContent).toContain(ja.timeHistory.groundMotionManager.importErrorNonFinite({
        line: 3,
        column: 2,
        token: "NaN",
      }));
    });
    // samples should remain at the original values
    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0, 1, 0]);
  });

  it("rejects inconsistent time steps and surfaces an error", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setCsvInputValue(csvFile("badtimestep.csv", "time,acceleration\n0.0,1.0\n0.05,2.0\n0.5,3.0\n"));

    await waitFor(() => {
      expect(document.body.textContent).toContain("4行目に不一致な時間刻み");
    });
    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0, 1, 0]);
  });

  it("rejects an empty file", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setCsvInputValue(csvFile("empty.csv", ""));

    await waitFor(() => {
      expect(document.body.textContent).toContain(ja.timeHistory.groundMotionManager.importErrorEmpty);
    });
    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0, 1, 0]);
  });

  it("rejects an unsupported column count", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setCsvInputValue(csvFile("threecols.csv", "a,b,c\n1,2,3\n4,5,6\n"));

    await waitFor(() => {
      expect(document.body.textContent).toContain("未サポートの列数です");
    });
    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0, 1, 0]);
  });

  it("sends the imported samples to the API on Run", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ result: timeHistoryResult() }));
    const harness = renderEditingHarness(timeHistoryProject());
    setCsvInputValue(csvFile("two_col.csv", "time,acceleration\n0.0,1.0\n0.05,2.0\n0.10,3.0\n"));

    await waitFor(() => {
      expect(harness.current().groundMotions?.[0]?.samples).toEqual([1.0, 2.0, 3.0]);
    });

    await clickRun();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")) as { project: ProjectModel };
    expect(body.project.groundMotions?.[0]?.samples).toEqual([1.0, 2.0, 3.0]);
  });
});

function waitFor(callback: () => void | Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;
    const check = async () => {
      attempts += 1;
      try {
        await callback();
        resolve();
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          window.setTimeout(check, 10);
        }
      }
    };
    check();
  });
}

describe("Time History ground motion CSV practical improvements", () => {
  it("renders gal label as gal (cm/s^2)", () => {
    const harness = renderTimeHistoryPanel_(timeHistoryProject());
    expect(document.body.textContent).toContain("gal (cm/s²)");
  });
  it("renders m/s^2 label as m/s²", () => {
    const harness = renderTimeHistoryPanel_(timeHistoryProject());
    expect(document.body.textContent).toContain("m/s²");
  });
  it("shows sample status ok when sample count matches", () => {
    const project = timeHistoryProject();
    if (project.groundMotions && project.groundMotions[0]) {
      project.groundMotions[0].timeStep = 0.05;
      project.groundMotions[0].duration = 0.1;
      project.groundMotions[0].samples = [0, 1, 0];
    }
    renderTimeHistoryPanel_(project);
    expect(document.body.textContent).toContain("サンプル数 OK");
  });
  it("shows short warning when sample count is below expected", () => {
    const project = timeHistoryProject();
    if (project.groundMotions && project.groundMotions[0]) {
      project.groundMotions[0].timeStep = 0.05;
      project.groundMotions[0].duration = 0.2;
      project.groundMotions[0].samples = [0, 1, 0];
    }
    renderTimeHistoryPanel_(project);
    expect(document.body.textContent).toContain("サンプル数不足");
    expect(document.body.textContent).toContain("必要 5");
    expect(document.body.textContent).toContain("現在 3");
  });
  it("shows long warning when sample count is above expected", () => {
    const project = timeHistoryProject();
    if (project.groundMotions && project.groundMotions[0]) {
      project.groundMotions[0].timeStep = 0.05;
      project.groundMotions[0].duration = 0.05;
      project.groundMotions[0].samples = [0, 1, 2, 3];
    }
    renderTimeHistoryPanel_(project);
    expect(document.body.textContent).toContain("サンプル数過剰");
  });
  it("shows the preview summary with max / min / abs max", () => {
    const project = timeHistoryProject();
    if (project.groundMotions && project.groundMotions[0]) {
      project.groundMotions[0].samples = [0, 5, -3, 2];
    }
    renderTimeHistoryPanel_(project);
    expect(document.body.textContent).toContain("max:");
    expect(document.body.textContent).toContain("min:");
    expect(document.body.textContent).toContain("abs max:");
  });
  it("parse error includes line and column", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    const file = new File(["time,acceleration\n0.0,1.0\n0.05,NaN\n"], "bad.csv", { type: "text/csv" });
    const fileInput = document.querySelector('input[aria-label="' + ja.timeHistory.groundMotionManager.importFileLabel + '"]');
    if (!fileInput) throw new Error("CSV file input not found");
    Object.defineProperty(fileInput, "files", { configurable: true, value: [file] });
    act(() => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain("3行目2列目");
    });
  });
});
describe("Time History H24 ground motion import", () => {
  function csvFile(name: string, contents: string) {
    return new File([contents], name, { type: "text/csv" });
  }
  function inputByLabel(label: string) {
    const element = document.querySelector('input[aria-label="' + label + '"]');
    if (!element) throw new Error("Input not found: " + label);
    return element;
  }
  function setH24InputValue(file: File) {
    const fileInput = inputByLabel(ja.timeHistory.groundMotionManager.importH24FileLabel);
    Object.defineProperty(fileInput, "files", { configurable: true, value: [file] });
    act(() => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  function buildH24Text() {
    const header = ["時間（秒）", ...H24_WAVEFORM_NAMES].join("\t");
    const rows = [header];
    for (let index = 0; index < 5; index += 1) {
      const time = (index * 0.01).toFixed(2);
      const values = H24_WAVEFORM_NAMES.map((_, waveIndex) => (index * 10 + waveIndex).toFixed(2));
      rows.push([time, ...values].join("\t"));
    }
    return rows.join("\n");
  }
  it("imports an H24 file and lists 9 waveforms", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setH24InputValue(csvFile("h24.tsv", buildH24Text()));
    await waitFor(() => {
      expect(document.body.textContent).toContain("検出波形: 9");
    });
    expect(document.body.textContent).toContain("Ⅱ-Ⅰ-１");
  });
  it("picks an H24 waveform and updates the editable ground motion", async () => {
    const harness = renderEditingHarness(timeHistoryProject());
    setH24InputValue(csvFile("h24.tsv", buildH24Text()));
    await waitFor(() => {
      expect(document.body.textContent).toContain("検出波形: 9");
    });
    const buttons = Array.from(document.querySelectorAll("button")).filter(
      (b) => b.textContent === ja.timeHistory.groundMotionManager.h24PickerPick,
    );
    expect(buttons.length).toBeGreaterThan(0);
    act(() => {
      buttons[0].click();
    });
    await waitFor(() => {
      expect(harness.current().groundMotions?.[0]?.unit).toBe("gal");
    });
    expect(harness.current().groundMotions?.[0]?.samples).toEqual([0, 10, 20, 30, 40]);
    expect(harness.current().groundMotions?.[0]?.timeStep).toBeCloseTo(0.01, 9);
  });
});
describe("Time History deformation animation", () => {
  function animationHeading(): HTMLElement {
    const element = [...document.querySelectorAll("h3")].find(
      (item) => item.textContent === ja.timeHistory.animation.heading,
    );
    if (!element) throw new Error("Animation heading not found");
    return element;
  }

  function slider(): HTMLInputElement {
    const element = document.querySelector<HTMLInputElement>(
      '.time-history-animation-slider input[type="range"]',
    );
    if (!element) throw new Error("Animation slider not found");
    return element;
  }

  function displacementScaleInput(): HTMLInputElement {
    const element = document.querySelector<HTMLInputElement>(
      'input[aria-label="' + ja.timeHistory.animation.displacementScaleLabel + '"]',
    );
    if (!element) throw new Error("Displacement scale input not found");
    return element;
  }

  function setSliderValue(value: number) {
    const element = slider();
    act(() => {
      setNativeValue(element, String(value));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function setDisplacementScale(value: string) {
    const element = displacementScaleInput();
    act(() => {
      setNativeValue(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  it("renders the animation heading even without a result", () => {
    render(<TimeHistoryResultViewer />);
    expect(animationHeading().textContent).toBe(ja.timeHistory.animation.heading);
    expect(document.body.textContent).toContain(ja.timeHistory.animation.disabledNoResult);
  });

  it("enables the controls when a valid result is provided", () => {
    render(
      <TimeHistoryResultViewer
        result={timeHistoryResult().timeHistoryResult}
        project={timeHistoryProject()}
        status="success"
      />,
    );
    expect(slider().disabled).toBe(false);
    expect(displacementScaleInput().disabled).toBe(false);
  });

  it("disables the controls when the result has no displacement data", () => {
    const result = timeHistoryResult();
    const noDisplacement = {
      ...result.timeHistoryResult!,
      displacements: {},
    };
    render(<TimeHistoryResultViewer result={noDisplacement} status="success" />);
    expect(slider().disabled).toBe(true);
    expect(displacementScaleInput().disabled).toBe(true);
  });

  it("changing the slider updates the current time index", () => {
    render(
      <TimeHistoryResultViewer
        result={timeHistoryResult().timeHistoryResult}
        project={timeHistoryProject()}
        status="success"
      />,
    );
    setSliderValue(2);
    expect(slider().value).toBe("2");
  });

  it("reset returns the current time index to zero", () => {
    render(
      <TimeHistoryResultViewer
        result={timeHistoryResult().timeHistoryResult}
        project={timeHistoryProject()}
        status="success"
      />,
    );
    setSliderValue(2);
    act(() => {
      const resetButton = [...document.querySelectorAll("button")]
        .find((b) => b.textContent === ja.timeHistory.animation.reset);
      resetButton?.click();
    });
    expect(slider().value).toBe("0");
  });

  it("changing the displacement scale updates the value", () => {
    render(
      <TimeHistoryResultViewer
        result={timeHistoryResult().timeHistoryResult}
        project={timeHistoryProject()}
        status="success"
      />,
    );
    setDisplacementScale("200");
    expect(displacementScaleInput().value).toBe("200");
  });

  it("reports a deformed position override to the parent", async () => {
    const overrides: Array<Map<string, { x: number; y: number; z: number }> | null> = [];
    render(
      <TimeHistoryResultViewer
        result={timeHistoryResult().timeHistoryResult}
        project={timeHistoryProject()}
        status="success"
        onOverrideChange={(override) => overrides.push(override)}
      />,
    );
    await waitFor(() => {
      const last = overrides[overrides.length - 1];
      expect(last).not.toBeNull();
    });
    const last = overrides[overrides.length - 1];
    expect(last).not.toBeNull();
    // The override is keyed by nodeId; the test project has 10 nodes
    // (G0..G5 + B1..B4) so the override map should be at least 10.
    const map = last as Map<string, { x: number; y: number; z: number }>;
    expect(map.size).toBeGreaterThanOrEqual(10);
  });

  it("reports null when there is no time history result", async () => {
    const overrides: Array<Map<string, { x: number; y: number; z: number }> | null> = [];
    render(
      <TimeHistoryResultViewer
        result={null}
        project={timeHistoryProject()}
        onOverrideChange={(override) => overrides.push(override)}
      />,
    );
    await waitFor(() => {
      const last = overrides[overrides.length - 1];
      expect(last).toBeNull();
    });
  });
});

describe("Time History basic chart", () => {
  it("renders a chart for displacement", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    expect(chartPolyline().dataset.series).toBe("displacement");
    expect(chartPolyline().dataset.responseKey).toBe("N2_ux");
    expect(chartPolyline().getAttribute("points")).not.toBe("");
  });

  it("renders a chart for velocity", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    clickInputByLabel(ja.timeHistory.resultViewer.seriesVelocity);

    expect(chartPolyline().dataset.series).toBe("velocity");
  });

  it("renders a chart for acceleration", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);

    clickInputByLabel(ja.timeHistory.resultViewer.seriesAcceleration);

    expect(chartPolyline().dataset.series).toBe("acceleration");
  });

  it("updates the chart when the response key changes", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);
    const before = chartPolyline().getAttribute("points");

    changeSelect(ja.timeHistory.resultViewer.responseKeyLabel, "N3_ux");

    expect(chartPolyline().dataset.responseKey).toBe("N3_ux");
    expect(chartPolyline().getAttribute("points")).not.toBe(before);
  });

  it("updates the chart when the series changes", () => {
    render(<TimeHistoryResultViewer result={timeHistoryResult().timeHistoryResult} status="success" />);
    const before = chartPolyline().getAttribute("points");

    clickInputByLabel(ja.timeHistory.resultViewer.seriesVelocity);

    expect(chartPolyline().dataset.series).toBe("velocity");
    expect(chartPolyline().getAttribute("points")).not.toBe(before);
  });

  it("does not crash on invalid chart data", () => {
    const invalidResult = {
      ...timeHistoryResult().timeHistoryResult!,
      time: [],
      displacements: { N2_ux: [1] },
    };

    expect(() => render(<TimeHistoryResultViewer result={invalidResult} status="success" />)).not.toThrow();
    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.chart.invalid);
  });

  it("shows chart empty state for an empty result", () => {
    render(<TimeHistoryResultViewer result={null} />);

    expect(document.body.textContent).toContain(ja.timeHistory.resultViewer.chart.empty);
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
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.availableKeysCount}: 2`);
    expect(document.body.textContent).toContain(`${ja.timeHistory.resultViewer.summary.firstKey}: N2_ux`);
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

function renderTimeHistoryPanel_(project: ProjectModel) { renderTimeHistoryPanel(project); }
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
      onProjectChange={() => undefined}
      onSelectedEigenModeChange={() => undefined}
      onSelectedResponseSpectrumResultChange={() => undefined}
    />,
  );
}

function renderEditableTimeHistoryPanel(project: ProjectModel, onProjectChange: (project: ProjectModel) => void) {
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
      onProjectChange={onProjectChange}
      onSelectedEigenModeChange={() => undefined}
      onSelectedResponseSpectrumResultChange={() => undefined}
    />,
  );
}

function renderEditingHarness(initialProject = timeHistoryProject()) {
  let current = initialProject;
  const rerender = (next: ProjectModel) => {
    current = next;
    renderEditableTimeHistoryPanel(current, rerender);
  };
  renderEditableTimeHistoryPanel(current, rerender);
  return { current: () => current };
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

function input(label: string): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
  if (!element) throw new Error(`Input not found: ${label}`);
  return element;
}

function changeInput(label: string, value: string) {
  act(() => {
    const element = input(label);
    setNativeValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function changeTextarea(label: string, value: string) {
  const element = document.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${label}"]`);
  if (!element) throw new Error(`Textarea not found: ${label}`);
  act(() => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
  descriptor?.set?.call(element, value);
}

function clickInputByLabel(label: string) {
  const target = [...document.querySelectorAll("label")].find((item) => item.textContent === label);
  const input = target?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error(`Input not found: ${label}`);
  act(() => {
    input.click();
  });
}

function changeSelect(label: string, value: string) {
  const target = [...document.querySelectorAll("label")].find((item) => item.textContent?.includes(label));
  const select = target?.querySelector("select");
  if (!(select instanceof HTMLSelectElement)) throw new Error(`Select not found: ${label}`);
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function tableText(): string {
  return document.querySelector("table")?.textContent ?? "";
}

function chartPolyline(): SVGPolylineElement {
  const element = document.querySelector<SVGPolylineElement>(".time-history-chart polyline[data-series]");
  if (!element) throw new Error("Chart polyline not found.");
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
      displacements: { N2_ux: [0, 0.1, 0], N3_ux: [1, 2, 0] },
      velocities: { N2_ux: [0, 0.2, 0.1], N3_ux: [1, 3, 0] },
      accelerations: { N2_ux: [0, -0.3, 0.3], N3_ux: [1, 4, 0] },
    },
  };
}

function largeTimeHistoryResult(): AnalysisResult {
  const result = timeHistoryResult();
  const time = Array.from({ length: 150 }, (_, index) => index * 0.05);
  return {
    ...result,
    timeHistoryResult: {
      ...result.timeHistoryResult!,
      meta: {
        ...result.timeHistoryResult!.meta,
        sampleCount: 150,
        duration: 7.45,
      },
      time,
      displacements: { N2_ux: time.map((value) => value * 0.1) },
      velocities: { N2_ux: time.map((value) => value * 0.2) },
      accelerations: { N2_ux: time.map((value) => value * 0.3) },
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
