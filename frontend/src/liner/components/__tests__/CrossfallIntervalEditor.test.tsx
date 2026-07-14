// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ja } from "../../../i18n/ja";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { CrossfallIntervalEditor } from "../CrossfallIntervalEditor";

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

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("CrossfallIntervalEditor", () => {
  const draft = createDefaultLinerDraft();

  it("renders required Japanese labels without raw enum values", () => {
    render(
      <CrossfallIntervalEditor
        draft={draft}
        intervals={draft.crossSlopeIntervals ?? []}
        onIntervalsChange={() => undefined}
      />,
    );

    expect(document.body.textContent).toContain(ja.liner.editor.addCrossfallInterval);
    expect(document.body.textContent).toContain(ja.liner.fields.crossfallStartStation);
    expect(document.body.textContent).toContain(ja.liner.fields.crossfallMode);
    expect(document.body.textContent).toContain(ja.liner.fields.crossfallLeftSlopePercent);
    expect(document.body.textContent).not.toContain("one_way_right");
    expect(document.body.textContent).not.toContain("interval add");
  });

  it("uses card layout class hook below 1280 and table layout at desktop widths", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("1280"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    render(
      <CrossfallIntervalEditor
        draft={draft}
        intervals={draft.crossSlopeIntervals ?? []}
        onIntervalsChange={() => undefined}
        layout="fullWidth"
      />,
    );

    const editor = document.querySelector(".liner-crossfall-interval-editor");
    expect(editor?.classList.contains("liner-crossfall-interval-editor--full-width")).toBe(true);
    expect(document.querySelector(".liner-crossfall-interval-table-view")).not.toBeNull();
    expect(document.querySelector(".liner-crossfall-interval-card-view")).not.toBeNull();
    expect(document.querySelector(".liner-crossfall-interval-table-view")?.getAttribute("aria-hidden")).toBe("false");
    expect(document.querySelector(".liner-crossfall-interval-card-view")?.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".liner-crossfall-interval-card-view")?.hasAttribute("inert")).toBe(true);
  });
});
