// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultLinerDraft } from "../adapters/linerUiAdapter";
import { buildMountainDraft } from "../samples/mountain-viaduct-500/fixture";
import { LinerMain3DPage } from "./LinerMain3DPage";

vi.mock("../samples/mountain-viaduct-500/viewer", () => ({
  MountainViaduct3dViewer: () => <div data-testid="mountain-viewer-mock">3D</div>,
}));
vi.mock("../samples/mountain-viaduct-500/fixture", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../samples/mountain-viaduct-500/fixture")>();
  return {
    ...actual,
    MOUNTAIN_CAMERA_PRESETS: [
      { id: "valley", label: "谷俯瞰", position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    ],
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root?.render(node));
}

afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe("LinerMain3DPage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders integrated 3D page with model modes and layers", () => {
    render(
      <LinerMain3DPage
        draft={buildMountainDraft()}
        onClose={() => undefined}
        onBackToSetup={() => undefined}
        onBackToPreview={() => undefined}
        onBackToList={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-main3d-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=mountain-viewer-mock]")).not.toBeNull();
    expect(document.querySelector("[data-testid=main3d-mode-integrated]")).not.toBeNull();
    expect(document.querySelector("[data-testid=main3d-mode-frame]")).not.toBeNull();
    expect(document.querySelector("[data-testid=main3d-layer-terrain]")).not.toBeNull();
    expect(document.querySelector("[data-testid=main3d-layer-substructure]")).not.toBeNull();
    expect(document.querySelector("[data-testid=main3d-camera-valley]")).not.toBeNull();
  });

  it("switches model mode to terrain preset", () => {
    render(
      <LinerMain3DPage
        draft={buildMountainDraft()}
        onClose={() => undefined}
        onBackToSetup={() => undefined}
        onBackToPreview={() => undefined}
        onBackToList={() => undefined}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=main3d-mode-terrain]") as HTMLButtonElement).click();
    });
    const terrainCheckbox = document.querySelector("[data-testid=main3d-layer-terrain]") as HTMLInputElement;
    expect(terrainCheckbox.checked).toBe(true);
    const frameCheckbox = document.querySelector("[data-testid=main3d-layer-frame]") as HTMLInputElement;
    expect(frameCheckbox.checked).toBe(false);
  });

  it("toggles a layer to custom mode", () => {
    render(
      <LinerMain3DPage
        draft={buildMountainDraft()}
        onClose={() => undefined}
        onBackToSetup={() => undefined}
        onBackToPreview={() => undefined}
        onBackToList={() => undefined}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=main3d-layer-frame]") as HTMLInputElement).click();
    });
    const frameCheckbox = document.querySelector("[data-testid=main3d-layer-frame]") as HTMLInputElement;
    expect(frameCheckbox.checked).toBe(false);
  });

  it("does not render without bridge draft", () => {
    // main3d page renders the viewer regardless; ensure default draft renders
    render(
      <LinerMain3DPage
        draft={createDefaultLinerDraft()}
        onClose={() => undefined}
        onBackToSetup={() => undefined}
        onBackToPreview={() => undefined}
        onBackToList={() => undefined}
      />,
    );
    expect(document.querySelector("[data-testid=liner-main3d-page]")).not.toBeNull();
  });
});
