// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { buildLinerPreviewFromDraft } from "../adapters/linerPreviewAdapter";
import { createDefaultLinerDraft } from "../adapters/linerUiAdapter";
import { LinerGridPreview } from "./LinerGridPreview";

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

describe("LinerGridPreview", () => {
  it("renders the preview SVG from a projected view model", () => {
    const { viewModel } = buildLinerPreviewFromDraft(createDefaultLinerDraft());

    render(<LinerGridPreview viewModel={viewModel} />);

    expect(document.querySelector("[data-testid=liner-grid-preview]")).not.toBeNull();
    expect(document.querySelector(".liner-grid-preview-axis")).not.toBeNull();
    expect(document.querySelectorAll(".liner-grid-preview-point").length).toBeGreaterThan(0);
  });
});
