// @vitest-environment jsdom
// Phase C1 (M2-02) 3ペインCAD UI Shell テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { SubstructurePlanningPage } from "../planning/SubstructurePlanningPage";
import { SubstructureTreePanel } from "../planning/SubstructureTreePanel";
import { CoordinateTable } from "../planning/CoordinateTable";
import { StatusArea } from "../planning/StatusArea";
import type { Support } from "../model";

// R3F 依存をスタブ
vi.mock("../viewer3d/SubstructureViewer3D", () => ({
  SubstructureViewer3D: () => <div data-testid="viewer3d-stub" />,
}));
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useThree: () => ({}),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
}));
vi.mock("../../viewer/threeUtils", () => ({
  resolveOrbitControlsBindings: () => ({}),
}));

function support(id: string, type: "pier" | "abutment", station: number): Support {
  return {
    supportId: id,
    supportType: type,
    skewRad: 0,
    placement: { source: "direct_xyz", position: { x: station, y: 0, z: 0 } },
    bearingSeats: [],
    pier: type === "pier" ? {
      id,
      formType: "single_column_rect",
      column: { id: `${id}-COLUMN`, width: 1.2, depth: 1.6, height: 7 },
      cap: { id: `${id}-CAP`, width: 1.6, depth: 8, height: 1.2, overhangL: 0, overhangR: 0 },
      footing: { id: `${id}-FOOTING`, length: 6, width: 8, thickness: 1.8, topElevation: 0 },
    } : undefined,
    abutment: type === "abutment" ? {
      id,
      formType: "inverted_t",
      backwall: { id: `${id}-BW`, height: 5, thickness: 0.8, width: 11, seatElevation: 8 },
      wingWallL: { id: `${id}-WL`, length: 4, height: 5, thickness: 0.5 },
      wingWallR: { id: `${id}-WR`, length: 4, height: 5, thickness: 0.5 },
      footing: { id: `${id}-FOOTING`, length: 9, width: 7, thickness: 1.5, topElevation: 0 },
    } : undefined,
  };
}

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

function coords(supports: readonly Support[]) {
  return new Map(supports.map((s) => [s.supportId, { x: 10, y: 20, z: 5 }]));
}

describe("SubstructurePlanningPage (3ペイン Shell)", () => {
  const supports = [support("P1", "pier", 0), support("A1", "abutment", 100)];

  it("renders toolbar, panels, viewport, status", () => {
    const { container } = render(
      <SubstructurePlanningPage
        supports={supports}
        coordinates={coords(supports)}
        selectedSupportId="P1"
      />,
    );
    expect(container.querySelector('[data-testid="substructure-toolbar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="panel-tree"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="panel-properties"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="panel-bottom"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="status-area"]')).not.toBeNull();
  });

  it("renders empty project without crash", () => {
    const { container } = render(
      <SubstructurePlanningPage supports={[]} coordinates={new Map()} />,
    );
    expect(container.querySelector('[data-testid="substructure-toolbar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tree-panel"]')).not.toBeNull();
  });

  it("view mode switch buttons work (2D/3D)", () => {
    const { container } = render(
      <SubstructurePlanningPage supports={supports} coordinates={coords(supports)} />,
    );
    const btn2d = container.querySelector<HTMLButtonElement>('[data-testid="view-mode-2d"]')!;
    act(() => btn2d.click());
    expect(container.querySelector('[data-testid="plan-preview-svg"]')).not.toBeNull();
  });

  it("toggle panels collapse/expand", () => {
    const { container } = render(
      <SubstructurePlanningPage supports={supports} coordinates={coords(supports)} />,
    );
    const toggleLeft = container.querySelector<HTMLButtonElement>('[data-testid="toggle-panel-left"]')!;
    act(() => toggleLeft.click());
    expect(container.querySelector('[data-testid="panel-tree"]')).toBeNull();
    act(() => toggleLeft.click());
    expect(container.querySelector('[data-testid="panel-tree"]')).not.toBeNull();
  });

  it("selected support shows in property panel", () => {
    const { container } = render(
      <SubstructurePlanningPage
        supports={supports}
        coordinates={coords(supports)}
        selectedSupportId="P1"
      />,
    );
    expect(container.querySelector('[data-testid="property-panel"]')!.textContent).toContain("P1");
  });

  it("validation summary reflects FATAL/WARNING/OK", () => {
    const { container } = render(
      <SubstructurePlanningPage
        supports={supports}
        coordinates={coords(supports)}
        validation={{ fatalCount: 1, warningCount: 2, infoCount: 0, messages: ["test"] }}
      />,
    );
    expect(container.querySelector('[data-testid="status-fatal"]')).not.toBeNull();
    act(() => {});
  });
});

describe("SubstructureTreePanel", () => {
  it("selects support on click", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <SubstructureTreePanel
        supports={[support("P1", "pier", 0)]}
        onSelect={onSelect}
      />,
    );
    const item = container.querySelector('[data-testid="tree-item-P1"]')!;
    act(() => (item as HTMLElement).click());
    expect(onSelect).toHaveBeenCalledWith("P1");
  });
});

describe("CoordinateTable", () => {
  it("renders rows and calls onSelect", () => {
    const onSelect = vi.fn();
    const supports = [support("P1", "pier", 0)];
    const { container } = render(
      <CoordinateTable supports={supports} coordinates={coords(supports)} onSelect={onSelect} />,
    );
    const row = container.querySelector('[data-testid="coord-row-P1"]')!;
    expect(row.textContent).toContain("10.00");
    act(() => (row as HTMLElement).click());
    expect(onSelect).toHaveBeenCalledWith("P1");
  });
});

describe("StatusArea", () => {
  it("shows OK when no validation issues", () => {
    const { container } = render(
      <StatusArea primaryName="P1" validation={{ fatalCount: 0, warningCount: 0, infoCount: 0, messages: [] }} />,
    );
    expect(container.querySelector('[data-testid="status-ok"]')).not.toBeNull();
  });

  it("shows FATAL badge when fatal present", () => {
    const { container } = render(
      <StatusArea primaryName="P1" validation={{ fatalCount: 1, warningCount: 0, infoCount: 0, messages: [] }} />,
    );
    expect(container.querySelector('[data-testid="status-fatal"]')).not.toBeNull();
  });
});
