// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewerDiagnostics } from "./ViewerDiagnostics";
import type { ViewerRuntimeDiagnostics } from "./types";

let root: Root | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

function render(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function buildDiagnostics(overrides: Partial<ViewerRuntimeDiagnostics> = {}): ViewerRuntimeDiagnostics {
  return {
    viewerMode: "three",
    fallbackReason: "none",
    webgl: {
      available: true,
      renderer: "WebGL Renderer",
      vendor: "Vendor",
      version: "WebGL 2.0",
      shadingLanguageVersion: "GLSL ES 3.0",
      unmaskedRenderer: "GPU Renderer",
      unmaskedVendor: "GPU Vendor",
    },
    camera: {
      position: { x: 1, y: 2, z: 3 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      preset: "iso",
    },
    gpuMode: "compat-gpu-blocklist",
    appVersion: "0.3.0-preview",
    currentViewPreset: "iso",
    apolloCounts: {
      lineElementCount: 18,
      solidCount: 80,
      girderCount: 20,
      crossBeamCount: 12,
      bracingCount: 24,
      deckCount: 5,
      bearingCount: 12,
      markerCount: 7,
      warningCount: 0,
    },
    visibility: {
      nodes: true,
      members: true,
      supports: true,
      apolloLineModel: true,
      apolloSolidModel: true,
      apolloGirders: true,
      apolloCrossBeams: true,
      apolloBracings: true,
      apolloDeck: true,
      apolloBearings: true,
      apolloMarkers: false,
      loads: true,
      labels: true,
      nodeLabels: true,
      memberLabels: true,
      grid: true,
      axes: true,
      deformedShape: false,
      reactions: false,
      axialForce: false,
      momentMy: false,
      momentMz: false,
    },
    ...overrides,
  };
}

describe("ViewerDiagnostics", () => {
  it("renders the diagnostics toggle and panel content when open", () => {
    render(<ViewerDiagnostics diagnostics={buildDiagnostics()} open={true} onToggle={() => undefined} />);

    expect(document.querySelector("[data-testid='viewer-diagnostics-toggle']")).not.toBeNull();
    expect(document.querySelector("[data-testid='viewer-diagnostics-panel']")).not.toBeNull();
    expect(document.body.textContent).toContain("WebGL 3D");
    expect(document.body.textContent).toContain("compat-gpu-blocklist");
    expect(document.body.textContent).toContain("80");
  });

  it("hides the panel content when closed and calls onToggle", () => {
    const onToggle = vi.fn();
    render(<ViewerDiagnostics diagnostics={buildDiagnostics()} open={false} onToggle={onToggle} />);

    expect(document.querySelector("[data-testid='viewer-diagnostics-panel']")).toBeNull();

    act(() => {
      (document.querySelector("[data-testid='viewer-diagnostics-toggle']") as HTMLButtonElement).click();
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders fallback and unavailable fields safely", () => {
    render(
      <ViewerDiagnostics
        diagnostics={buildDiagnostics({
          viewerMode: "fallback2d",
          fallbackReason: "webgl-init-failed",
          gpuMode: "Unavailable",
          camera: null,
          apolloCounts: null,
          webgl: {
            available: false,
            renderer: "Unavailable",
            vendor: "Unavailable",
            version: "Unavailable",
            shadingLanguageVersion: "Unavailable",
            unmaskedRenderer: "Unavailable",
            unmaskedVendor: "Unavailable",
          },
        })}
        open={true}
        onToggle={() => undefined}
      />,
    );

    expect(document.body.textContent).toContain("2D fallback");
    expect(document.body.textContent).toContain("WebGL renderer initialization failed");
    expect(document.body.textContent).toContain("Unavailable");
  });
});
