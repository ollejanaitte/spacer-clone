// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import type { ProjectModel } from "../types";
import { PropertyPanel } from "./PropertyPanel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

describe("PropertyPanel response spectrum settings", () => {
  it("shows API-compatible defaults without changing an old project", () => {
    const project = createDefaultProject();
    const changes: ProjectModel[] = [];

    renderPanel(project, (next) => changes.push(next));

    expect(input("モード数").value).toBe("3");
    expect(select("方向").value).toBe("X");
    expect(input("減衰比").value).toBe("0.05");
    expect(input("目標累積有効質量比").value).toBe("0.9");
    expect(input("スペクトルケースID").value).toBe("spec-1");
    expect(spectrumRows()).toHaveLength(3);
    expect(project.analysisSettings.responseSpectrum).toBeUndefined();
    expect(changes).toEqual([]);
  });

  it("edits scalar response spectrum settings and selects an existing mass case", () => {
    const project = createDefaultProject();
    project.massCases = [
      ...(project.massCases ?? []),
      {
        id: "mass-2",
        name: "Second mass",
        method: "lumped",
        source: "manual",
        items: [],
      },
    ];
    let current = project;
    const onChange = (next: ProjectModel) => {
      current = next;
    };

    renderPanel(current, onChange);

    change(input("モード数"), "5");
    renderPanel(current, onChange);
    change(select("方向"), "Z");
    renderPanel(current, onChange);
    change(input("減衰比"), "0.03");
    renderPanel(current, onChange);
    change(input("目標累積有効質量比"), "0.95");
    renderPanel(current, onChange);
    change(input("スペクトルケースID"), "design-spectrum");
    renderPanel(current, onChange);
    change(select("質量ケース"), "mass-2");

    expect(current.analysisSettings.responseSpectrum).toMatchObject({
      massCaseId: "mass-2",
      modeCount: 5,
      direction: "Z",
      dampingRatio: 0.03,
      targetCumulativeMassRatio: 0.95,
      spectrumCaseId: "design-spectrum",
    });
    expect(current.massCases).toHaveLength(2);
  });

  it("adds, edits, and deletes spectrum points", () => {
    let current = createDefaultProject();
    const onChange = (next: ProjectModel) => {
      current = next;
    };
    renderPanel(current, onChange);

    click(button("行を追加"));
    renderPanel(current, onChange);
    expect(spectrumRows()).toHaveLength(4);

    const lastRow = spectrumRows().at(-1);
    if (!lastRow) throw new Error("Spectrum row not found");
    const lastInputs = lastRow.querySelectorAll<HTMLInputElement>('input[type="number"]');
    change(lastInputs[0], "2");
    renderPanel(current, onChange);
    const editedLastRow = spectrumRows().at(-1);
    const editedInputs = editedLastRow?.querySelectorAll<HTMLInputElement>('input[type="number"]');
    if (!editedInputs) throw new Error("Edited spectrum row not found");
    change(editedInputs[1], "0.4");
    renderPanel(current, onChange);

    const deleteButtons = document.querySelectorAll<HTMLButtonElement>(
      '.response-spectrum-settings button[title="行を削除"]',
    );
    click(deleteButtons[1]);

    expect(current.analysisSettings.responseSpectrum?.spectrumPoints).toEqual([
      { period: 0, value: 1 },
      { period: 1, value: 1 },
      { period: 2, value: 0.4 },
    ]);
  });

  it("disables mass selection when no mass case exists", () => {
    const project = createDefaultProject();
    project.massCases = [];

    renderPanel(project, () => undefined);

    expect(select("質量ケース").disabled).toBe(true);
    expect(document.body.textContent).toContain("先に質量ケースを登録してください。");
  });
});

function renderPanel(project: ProjectModel, onChange: (project: ProjectModel) => void) {
  if (!root) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  act(() => {
    root?.render(
      <PropertyPanel
        project={project}
        selected="analysisSettings"
        validationPaths={new Set()}
        onChange={onChange}
      />,
    );
  });
}

function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}

function click(element: HTMLElement | undefined) {
  if (!element) throw new Error("Element not found");
  act(() => {
    element.click();
  });
}

function input(label: string): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
  if (!element) throw new Error(`Input not found: ${label}`);
  return element;
}

function select(label: string): HTMLSelectElement {
  const element = document.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`);
  if (!element) throw new Error(`Select not found: ${label}`);
  return element;
}

function button(label: string): HTMLButtonElement {
  const element = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) => item.textContent?.trim() === label,
  );
  if (!element) throw new Error(`Button not found: ${label}`);
  return element;
}

function spectrumRows(): HTMLTableRowElement[] {
  return [
    ...document.querySelectorAll<HTMLTableRowElement>(
      ".response-spectrum-settings tbody tr",
    ),
  ];
}
