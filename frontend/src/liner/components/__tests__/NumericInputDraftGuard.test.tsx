// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { CrossSectionTemplateEditor } from "../CrossSectionTemplateEditor";
import { CurveSamplingControl } from "../CurveSamplingControl";
import { LinerStationProfilePanel } from "../LinerStationProfilePanel";
import { VerticalElementEditor } from "../VerticalElementEditor";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root?.render(node));
}

function setInputValue(testId: string, value: string) {
  const input = document.querySelector(`[data-testid=${testId}]`) as HTMLInputElement;
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("liner numeric input draft guards", () => {
  it("guards station inputs until a finite value is entered", () => {
    const onDraftChange = vi.fn();
    render(<LinerStationProfilePanel draft={createDefaultLinerDraft()} onDraftChange={onDraftChange} />);

    act(() => setInputValue("liner-station-interval", ""));
    expect(onDraftChange).not.toHaveBeenCalled();
    act(() => setInputValue("liner-station-interval", "25"));
    expect(onDraftChange).toHaveBeenCalledTimes(1);
  });

  it("guards vertical inputs until a finite value is entered", () => {
    const draft = createDefaultLinerDraft();
    const onVerticalAlignmentChange = vi.fn();
    render(
      <VerticalElementEditor
        verticalAlignment={draft.verticalAlignment!}
        onVerticalAlignmentChange={onVerticalAlignmentChange}
      />,
    );

    act(() => setInputValue("liner-vertical-element-start-station-VG-default", ""));
    expect(onVerticalAlignmentChange).not.toHaveBeenCalled();
    act(() => setInputValue("liner-vertical-element-start-station-VG-default", "10"));
    expect(onVerticalAlignmentChange).toHaveBeenCalledTimes(1);
  });

  it("guards cross-section offsets until a finite value is entered", () => {
    const draft = createDefaultLinerDraft();
    const onTemplateChange = vi.fn();
    render(
      <CrossSectionTemplateEditor
        template={draft.crossSections![0]!}
        onTemplateChange={onTemplateChange}
      />,
    );

    act(() => setInputValue("cross-section-offset-line-offset-OL-alignment-1-0", ""));
    expect(onTemplateChange).not.toHaveBeenCalled();
    act(() => setInputValue("cross-section-offset-line-offset-OL-alignment-1-0", "2.5"));
    expect(onTemplateChange).toHaveBeenCalledTimes(1);
  });

  it("guards sampling input until a finite value is entered", () => {
    const onDraftChange = vi.fn();
    render(<CurveSamplingControl draft={createDefaultLinerDraft()} onDraftChange={onDraftChange} />);

    act(() => setInputValue("liner-display-sampling-interval", ""));
    expect(onDraftChange).not.toHaveBeenCalled();
    act(() => setInputValue("liner-display-sampling-interval", "5"));
    expect(onDraftChange).toHaveBeenCalledTimes(1);
  });
});
