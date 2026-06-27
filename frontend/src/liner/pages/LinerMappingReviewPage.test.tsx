// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { createDefaultLinerDraft } from "../adapters/linerUiAdapter";
import { LinerMappingReviewPage } from "./LinerMappingReviewPage";

vi.mock("../../viewer/Viewer3D", () => ({
  Viewer3D: ({ project }: { project: { nodes: unknown[]; members: unknown[] } }) => (
    <div data-testid="mock-viewer3d">
      {project.nodes.length}/{project.members.length}
    </div>
  ),
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

describe("LinerMappingReviewPage", () => {
  it("renders mapping summary and Viewer3D preview", () => {
    render(
      <LinerMappingReviewPage
        draft={createDefaultLinerDraft()}
        project={createDefaultProject()}
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
        onBackToPreview={() => undefined}
        onConfirmProject={() => undefined}
        onOpenProjectInViewer={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-mapping-review-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=mock-viewer3d]")).not.toBeNull();
    expect(host?.textContent).toContain("プロジェクトへ反映");
  });

  it("commits only when the user confirms or opens in viewer", () => {
    const onConfirmProject = vi.fn();
    const onOpenProjectInViewer = vi.fn();
    render(
      <LinerMappingReviewPage
        draft={createDefaultLinerDraft()}
        project={createDefaultProject()}
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
        onBackToPreview={() => undefined}
        onConfirmProject={onConfirmProject}
        onOpenProjectInViewer={onOpenProjectInViewer}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=confirm-liner-mapping]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=open-liner-viewer]") as HTMLButtonElement).click();
    });

    expect(onConfirmProject).toHaveBeenCalledTimes(1);
    expect(onOpenProjectInViewer).toHaveBeenCalledTimes(1);
  });
});
