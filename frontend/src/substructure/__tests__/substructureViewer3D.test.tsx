// @vitest-environment jsdom
// Phase C1 (M2-01) SubstructureViewer3D コンポーネントレンダーテスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { SubstructureViewer3D, type CameraPreset } from "../viewer3d/SubstructureViewer3D";
import type { SolidGroup } from "../geometryBase";

// R3F Canvas は WebGL を要求するため、テストでは Canvas と useThree をスタブする。
vi.mock("@react-three/fiber", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-three/fiber")>();
  return {
    ...actual,
    Canvas: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="r3f-canvas">{children}</div>
    ),
    useThree: () => ({
      camera: { position: { copy: vi.fn() }, lookAt: vi.fn(), updateProjectionMatrix: vi.fn() },
      gl: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), addEventListener: vi.fn(), removeEventListener: vi.fn() } },
      raycaster: { setFromCamera: vi.fn(), intersectObjects: () => [] },
      scene: { traverse: vi.fn(), add: vi.fn(), remove: vi.fn() },
    }),
  };
});
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));
vi.mock("../../viewer/threeUtils", () => ({
  resolveOrbitControlsBindings: () => ({
    screenSpacePanning: false,
    mouseButtons: { LEFT: 0, MIDDLE: 1, RIGHT: 2 },
    touches: {},
  }),
}));

function group(supportId: string, solidCount: number): SolidGroup {
  const solids = Array.from({ length: solidCount }, (_, i) => ({
    id: `${supportId}-SOLID-${String(i + 1).padStart(2, "0")}`,
    kind: "box" as const,
    localCenter: { x: 0, y: 0, z: 1 },
    localSize: { x: 1, y: 1, z: 1 },
    entity: "pier" as const,
    material: "pier.column",
  }));
  return {
    supportId,
    solids,
    transform: {
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 },
      skewRad: 0,
    },
  };
}

function renderViewer(props: Partial<React.ComponentProps<typeof SubstructureViewer3D>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <SubstructureViewer3D
        groups={[group("P1", 1)]}
        {...props}
      />,
    );
  });
  return { container, root };
}

describe("SubstructureViewer3D", () => {
  it("renders Canvas and toolbar", () => {
    const { container } = renderViewer();
    expect(container.querySelector('[data-testid="substructure-viewer3d"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="r3f-canvas"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="viewer-fit-all"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="viewer-fit-selection"]')).not.toBeNull();
  });

  it("renders all camera preset buttons", () => {
    const { container } = renderViewer();
    for (const p of ["top", "front", "side", "isometric"] as CameraPreset[]) {
      expect(container.querySelector(`[data-testid="viewer-${p}"]`)).not.toBeNull();
    }
  });

  it("fit selection disabled when no selection", () => {
    const { container } = renderViewer({ selectedSupportId: null });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="viewer-fit-selection"]');
    expect(btn?.disabled).toBe(true);
  });

  it("fit selection enabled when a support is selected", () => {
    const { container } = renderViewer({ selectedSupportId: "P1" });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="viewer-fit-selection"]');
    expect(btn?.disabled).toBe(false);
  });

  it("renders empty groups without crash", () => {
    const { container } = renderViewer({ groups: [] });
    expect(container.querySelector('[data-testid="substructure-viewer3d"]')).not.toBeNull();
  });
});
