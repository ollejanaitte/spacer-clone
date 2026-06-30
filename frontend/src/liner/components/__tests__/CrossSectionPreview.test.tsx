// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CrossSectionPreview } from "../CrossSectionPreview";
import type { CrossSectionTemplateDraft } from "../../schema/types";

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

describe("CrossSectionPreview (PR-D)", () => {
  it("reflects auto-computed elevation for offset and slope (case 2)", () => {
    const template: CrossSectionTemplateDraft = {
      id: "CS-preview",
      name: "Preview",
      crossSlope: {
        signConvention: "right_down_positive",
        valuePercent: 2,
      },
      offsetLines: [
        { id: "right", offset: 5, elevation: 0 },
        { id: "center", offset: 0, elevation: 0 },
      ],
    };

    render(<CrossSectionPreview template={template} />);

    const rightPoint = document.querySelector("[data-testid=cross-section-preview-point-right]");
    expect(rightPoint).not.toBeNull();
    expect(rightPoint?.querySelector("title")?.textContent).toContain("-0.10");
  });
});
