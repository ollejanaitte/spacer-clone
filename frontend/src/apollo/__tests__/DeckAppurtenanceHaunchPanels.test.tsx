// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createDefaultProject } from "../../data/defaultProject";
import type { ProjectModel } from "../../types";
import { DeckAppurtenanceInputPanel } from "../components/DeckAppurtenanceInputPanel";
import { RcDeckHaunchInputPanel } from "../components/RcDeckHaunchInputPanel";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
});

function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(node);
  });
  return container;
}

describe("DeckAppurtenanceInputPanel UI", () => {
  it("renders slots, CRS warning, and presence controls", () => {
    const project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const container = mount(
      <DeckAppurtenanceInputPanel project={project} onProjectChange={() => undefined} />,
    );
    expect(container.querySelector('[data-testid="apollo-appurtenance-panel"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="apollo-appurtenance-local-crs-warning"]')?.textContent,
    ).toMatch(/local CRS/);
    expect(
      container.querySelector('[data-testid="apollo-appurtenance-presence-LEFT_CURB"]'),
    ).toBeTruthy();
    expect(container.querySelector('[data-testid="apollo-appurtenance-all-none"]')).toBeTruthy();
  });
});

describe("RcDeckHaunchInputPanel UI", () => {
  it("renders girder rows and apply-all controls", () => {
    let project: ProjectModel = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const container = mount(
      <RcDeckHaunchInputPanel
        project={project}
        onProjectChange={(next) => {
          project = next;
        }}
      />,
    );
    expect(container.querySelector('[data-testid="apollo-haunch-panel"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="apollo-haunch-datum"]')?.textContent).toMatch(
      /上フランジ/,
    );
    expect(container.querySelector('[data-testid="apollo-haunch-apply-all-button"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="apollo-haunch-girder-girder-0"]')).toBeTruthy();
  });
});
