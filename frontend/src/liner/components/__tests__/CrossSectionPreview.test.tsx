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
  it("does not render SVG geometry when an offset is not finite", () => {
    const template: CrossSectionTemplateDraft = {
      id: "CS-invalid",
      name: "Invalid",
      offsetLines: [{ id: "invalid", offset: Number.NaN, elevation: 0 }],
    };

    render(<CrossSectionPreview template={template} />);

    expect(document.querySelector("[data-testid=cross-section-preview-invalid-offset]")).not.toBeNull();
    expect(document.querySelector("[data-testid=cross-section-preview-canvas]")).toBeNull();
    expect(document.body.innerHTML).not.toContain("NaN");
  });

  it("reflects template elevation and crossfall interval in preview coordinates", () => {
    const template = {
      id: "CS-preview",
      name: "Preview",
      offsetLines: [
        { id: "right", offset: 5, elevation: 0.5 },
        { id: "center", offset: 0, elevation: 0 },
      ],
    };
    const intervals = [
      {
        id: "CF-1",
        startPhysicalDistance: 0,
        endPhysicalDistance: 100,
        mode: "one_way_right" as const,
        leftSlopePercent: 2,
        rightSlopePercent: 2,
        pivotDistance: 0,
      },
    ];

    render(<CrossSectionPreview template={template} crossSlopeIntervals={intervals} previewPhysicalDistance={0} />);

    const rightPoint = document.querySelector("[data-testid=cross-section-preview-point-right]");
    expect(rightPoint).not.toBeNull();
    expect(rightPoint?.querySelector("title")?.textContent).toContain("0.40");
  });
});
