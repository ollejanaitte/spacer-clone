// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultLinerDraft, type LinerDraft, type LinerDraftUpdate } from "../adapters/linerUiAdapter";
import { LinerStationProfilePanel } from "./LinerStationProfilePanel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function inputByTestId(testId: string): HTMLInputElement {
  return document.querySelector(`[data-testid=${testId}]`) as HTMLInputElement;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function renderPanel(initialDraft: LinerDraft = createDefaultLinerDraft()) {
  let currentDraft = initialDraft;
  const onDraftChange = vi.fn((update: LinerDraftUpdate) => {
    currentDraft = typeof update === "function" ? update(currentDraft) : update;
    root?.render(<LinerStationProfilePanel draft={currentDraft} onDraftChange={onDraftChange} />);
  });

  render(<LinerStationProfilePanel draft={currentDraft} onDraftChange={onDraftChange} />);
  return { onDraftChange, getDraft: () => currentDraft };
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("LinerStationProfilePanel", () => {
  it("updates scalar station and profile fields", () => {
    const panel = renderPanel();

    act(() => {
      setInputValue(inputByTestId("liner-origin-displayed-station"), "10");
    });
    act(() => {
      setInputValue(inputByTestId("liner-station-interval"), "25");
    });
    act(() => {
      setInputValue(inputByTestId("liner-sample-interval"), "5");
    });
    act(() => {
      setInputValue(inputByTestId("liner-profile-z"), "12");
    });

    expect(panel.getDraft().stationDefinition.originDisplayedStation).toBe(10);
    expect(panel.getDraft().stationDefinition.interval).toBe(25);
    expect(panel.getDraft().sampleInterval).toBe(5);
    expect(panel.getDraft().z).toBe(12);
  });

  it("adds and edits explicit station rows", () => {
    const panel = renderPanel();

    act(() => {
      (document.querySelector("[data-testid=add-liner-explicit-station]") as HTMLButtonElement).click();
    });
    act(() => {
      setInputValue(inputByTestId("liner-explicit-station-0"), "42");
    });

    expect(panel.getDraft().stationDefinition.explicitStations).toEqual([42]);
    expect(panel.onDraftChange).toHaveBeenCalledTimes(2);
  });

  it("removes explicit station rows", () => {
    const panel = renderPanel();

    act(() => {
      (document.querySelector("[data-testid=add-liner-explicit-station]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=remove-liner-explicit-station-0]") as HTMLButtonElement).click();
    });

    expect(panel.getDraft().stationDefinition.explicitStations).toEqual([]);
  });

  it("adds and edits station equation rows", () => {
    const panel = renderPanel();

    act(() => {
      (document.querySelector("[data-testid=add-liner-station-equation]") as HTMLButtonElement).click();
    });
    act(() => {
      setInputValue(inputByTestId("liner-equation-distance-EQ1"), "30");
    });
    act(() => {
      const select = document.querySelector("[data-testid=liner-equation-type-EQ1]") as HTMLSelectElement;
      select.value = "reset_to_value";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    act(() => {
      setInputValue(inputByTestId("liner-equation-value-EQ1"), "100");
    });

    expect(panel.getDraft().stationDefinition.equations?.[0]).toMatchObject({
      id: "EQ1",
      physicalDistance: 30,
      type: "reset_to_value",
      value: 100,
    });
  });

  it("keeps focus while editing station equation identifiers", () => {
    const panel = renderPanel();

    act(() => {
      (document.querySelector("[data-testid=add-liner-station-equation]") as HTMLButtonElement).click();
    });
    const idInput = inputByTestId("liner-equation-id-EQ1");
    act(() => {
      idInput.focus();
      setInputValue(idInput, "EQ1A");
    });

    expect(panel.getDraft().stationDefinition.equations?.[0]?.id).toBe("EQ1A");
    expect(inputByTestId("liner-equation-id-EQ1A").value).toBe("EQ1A");
    expect(document.activeElement).toBe(inputByTestId("liner-equation-id-EQ1A"));
  });

  it("removes station equation rows", () => {
    const panel = renderPanel();

    act(() => {
      (document.querySelector("[data-testid=add-liner-station-equation]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=remove-liner-station-equation-EQ1]") as HTMLButtonElement).click();
    });

    expect(panel.getDraft().stationDefinition.equations).toEqual([]);
  });

  it("adds, edits, and keeps one offset row", () => {
    const panel = renderPanel();

    act(() => {
      (document.querySelector("[data-testid=add-liner-offset]") as HTMLButtonElement).click();
    });
    act(() => {
      setInputValue(inputByTestId("liner-offset-1"), "5");
    });
    act(() => {
      (document.querySelector("[data-testid=remove-liner-offset-0]") as HTMLButtonElement).click();
    });

    expect(panel.getDraft().offsets).toEqual([5]);
    expect((document.querySelector("[data-testid=remove-liner-offset-0]") as HTMLButtonElement).disabled).toBe(true);
  });
});
