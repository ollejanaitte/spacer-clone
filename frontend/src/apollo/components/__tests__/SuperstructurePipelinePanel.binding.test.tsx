// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SuperstructurePipelinePanel } from "../SuperstructurePipelinePanel";
import { buildMountainDraft } from "../../../liner/samples/mountain-viaduct-500/fixture";
import { withProjectLinerDraft } from "../../../liner/adapters/linerProjectDraft";
import { createDefaultProject } from "../../../data/defaultProject";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
  vi.restoreAllMocks();
});

function mount(panel: React.ReactElement): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(panel);
  });
  mountedRoots.push({ root, container });
  return container;
}

function click(container: HTMLElement, text: string): void {
  const button = Array.from(container.querySelectorAll("button, label")).find((el) =>
    el.textContent?.includes(text),
  ) as HTMLButtonElement | null;
  if (!button) throw new Error(`Missing control: ${text}`);
  act(() => {
    button.click();
  });
}

function mountainProject() {
  const draft = buildMountainDraft();
  return withProjectLinerDraft(createDefaultProject(), draft);
}

describe("SuperstructurePipelinePanel — BridgeProject bound mode", () => {
  it("shows bound summary (supports=9, bridgeLengthM=400) for the mountain sample", () => {
    const container = mount(<SuperstructurePipelinePanel project={mountainProject()} />);
    const summary = container.querySelector("[data-testid=pipeline-bound-summary]");
    expect(summary).toBeTruthy();
    expect(summary!.textContent).toContain("supports=9");
    expect(summary!.textContent).toContain("bridgeLengthM=400");
  });

  it("runs bound Geometry and reports 9 supports on the real alignment", () => {
    const container = mount(<SuperstructurePipelinePanel project={mountainProject()} />);
    click(container, "BridgeProject bound");
    click(container, "Geometry 生成 (bound)");
    const geometryStep = container.querySelector("[data-testid=pipeline-geometry]");
    expect(geometryStep!.textContent).toContain("supports=9");
  });

  it("runs bound 3D and produces solids", () => {
    const container = mount(<SuperstructurePipelinePanel project={mountainProject()} />);
    click(container, "BridgeProject bound");
    click(container, "Geometry 生成 (bound)");
    click(container, "3D モデル生成");
    const solid = container.querySelector("[data-testid=pipeline-solid-count]");
    const count = Number.parseInt(solid!.textContent!.replace("solid=", ""), 10);
    expect(count).toBeGreaterThan(0);
  });

  it("reports bound unavailable when the project has no liner piers", () => {
    const container = mount(<SuperstructurePipelinePanel project={createDefaultProject()} />);
    expect(container.querySelector("[data-testid=pipeline-bound-unavailable]")).toBeTruthy();
  });

  it("keeps the RB-001 SAMPLE mode functional when no project is given", () => {
    const container = mount(<SuperstructurePipelinePanel />);
    click(container, "Geometry 生成");
    const geometryStep = container.querySelector("[data-testid=pipeline-geometry]");
    expect(geometryStep!.textContent).toContain("supports=4");
  });
});
