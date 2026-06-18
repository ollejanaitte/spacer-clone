// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { ModelComparisonWorkspace } from "./ModelComparisonWorkspace";

vi.mock("../viewer/Viewer3D", () => ({
  Viewer3D: ({ project }: { project: { project: { name: string } } }) => (
    <div data-testid="mock-viewer">{project.project.name}</div>
  ),
}));

describe("ModelComparisonWorkspace", () => {
  it("keeps A read-only and creates an editable B copy", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(<ModelComparisonWorkspace modelA={createDefaultProject()} onClose={() => undefined} />));

    expect(host.querySelector("[data-testid=model-a-pane]")?.textContent).toContain("読取専用");
    expect(host.querySelector("[data-testid=model-b-pane]")?.textContent).toContain("編集可能");
    expect(host.querySelectorAll("[data-testid=mock-viewer]")).toHaveLength(1);
    act(() => (host.querySelector("[data-testid=copy-a-to-b]") as HTMLButtonElement).click());
    expect(host.querySelectorAll("[data-testid=mock-viewer]")).toHaveLength(2);
    expect(host.querySelector("[data-testid=model-a-pane] .property-panel")).toBeNull();
    expect(host.querySelector("[data-testid=model-b-pane] .property-panel")).not.toBeNull();
    act(() => root.unmount());
  });
});
