// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ja } from "../../i18n/ja";
import { createDefaultLinerDraft } from "../adapters/linerUiAdapter";
import { LinerPreviewPage } from "./LinerPreviewPage";

vi.mock("../samples/mountain-viaduct-500/viewer", () => ({
  MountainViaduct3dViewer: () => <div data-testid="mountain-viewer-mock">3D</div>,
}));
vi.mock("../samples/mountain-viaduct-500/fixture", () => ({
  MOUNTAIN_CAMERA_PRESETS: [
    { id: "overview", label: "全景", position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
  ],
}));

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

describe("LinerPreviewPage", () => {
  it("renders preview summary and diagnostics panel", () => {
    render(
      <LinerPreviewPage
        draft={createDefaultLinerDraft()}
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-preview-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-grid-preview]")).not.toBeNull();
    expect(host?.textContent).toContain("100 m");
  });

  it("wires preview navigation callbacks", () => {
    const onClose = vi.fn();
    const onBackToList = vi.fn();
    const onBackToSetup = vi.fn();
    const onOpenMappingReview = vi.fn();
    render(
      <LinerPreviewPage
        draft={createDefaultLinerDraft()}
        onClose={onClose}
        onBackToList={onBackToList}
        onBackToSetup={onBackToSetup}
        onOpenMappingReview={onOpenMappingReview}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=close-liner-preview]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=back-to-liner-setup]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=back-to-liner-list]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=open-liner-mapping-review]") as HTMLButtonElement).click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBackToSetup).toHaveBeenCalledTimes(1);
    expect(onBackToList).toHaveBeenCalledTimes(1);
    expect(onOpenMappingReview).toHaveBeenCalledTimes(1);
  });

  it("shows formal drawing notice and wires secondary entry (D05-C06)", () => {
    const onOpenDrawings = vi.fn();
    render(
      <LinerPreviewPage
        draft={createDefaultLinerDraft()}
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
        onOpenDrawings={onOpenDrawings}
      />,
    );

    const notice = document.querySelector("[data-testid=liner-preview-formal-drawing-notice]");
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain(ja.liner.preview.formalDrawingNotice);
    expect(document.querySelector("[data-testid=open-liner-drawings]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-preview-open-formal-drawings]")).not.toBeNull();

    act(() => {
      (document.querySelector("[data-testid=liner-preview-open-formal-drawings]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=open-liner-drawings]") as HTMLButtonElement).click();
    });

    expect(onOpenDrawings).toHaveBeenCalledTimes(2);
  });

  it("omits formal drawing notice when open handler is not provided", () => {
    render(
      <LinerPreviewPage
        draft={createDefaultLinerDraft()}
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-preview-formal-drawing-notice]")).toBeNull();
  });

  it("renders road export controls and downloads HTML report (D06-C05)", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-report");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(
      <LinerPreviewPage
        draft={createDefaultLinerDraft()}
        projectName="preview-project"
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-preview-road-export-html]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-preview-road-export-csv]")).not.toBeNull();

    act(() => {
      (document.querySelector("[data-testid=liner-preview-road-export-html]") as HTMLButtonElement).click();
    });

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(document.querySelector("[data-testid=liner-preview-road-export-message]")?.textContent).toContain(
      ja.liner.reportExport.successHtml,
    );

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    clickSpy.mockRestore();
  });

  it("shows the 3D viewer panel when the draft has piers/spans (mountain sample)", () => {
    const draft = createDefaultLinerDraft();
    draft.piers = [
      { id: "A1", physicalDistance: 50, kind: "abutment" },
      { id: "P1", physicalDistance: 100, kind: "pier" },
    ];
    draft.spans = [
      { id: "SPAN-1", startPhysicalDistance: 50, endPhysicalDistance: 100, pierIdStart: "A1", pierIdEnd: "P1" },
    ];

    render(
      <LinerPreviewPage
        draft={draft}
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-preview-3d-panel]")).not.toBeNull();
    expect(document.querySelector("[data-testid=mountain-viewer-mock]")).not.toBeNull();
    expect(document.querySelector("[data-testid=mountain-viewer-preset-overview]")).not.toBeNull();
  });
});
