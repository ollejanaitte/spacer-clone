﻿// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewerControls } from "./ViewerControls";
import type { CameraPreset, ViewerScales, ViewerVisibility } from "./types";
import type { SpacerAxisSwap } from "./coordinateTransform";
import { DEFAULT_ANIMATION_OPTIONS, type AnimationOptions } from "./animation";
import type { ResponseSpectrumSelection } from "../results/resultViewModel";


function setChecked(input: HTMLInputElement, checked: boolean) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
  valueSetter?.call(input, checked);
  input.dispatchEvent(new Event("click", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function setValue(element: HTMLSelectElement | HTMLInputElement, value: string) {
  const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  valueSetter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function buildProps(overrides: Partial<{
  visibility: ViewerVisibility;
  scales: ViewerScales;
  loadCaseIds: string[];
  selectedLoadCaseId: string;
  eigenModeNos: number[];
  selectedEigenMode: number;
  responseSpectrumOptions: Array<{ key: ResponseSpectrumSelection; label: string }>;
  selectedResponseSpectrumResult: ResponseSpectrumSelection;
  hasResult: boolean;
  spacerAxisSwap: SpacerAxisSwap;
  animationOptions: AnimationOptions;
  compareMode: boolean;
  cameraSync: boolean;
  forceColorMap: boolean;
  forceColorComponent: import("./memberForceColorMap").ForceColorComponent;
  forceColorValueType: import("./memberForceColorMap").ForceColorValueType;
  onVisibilityChange: (visibility: ViewerVisibility) => void;
  onScalesChange: (scales: ViewerScales) => void;
  onLoadCaseChange: (loadCaseId: string) => void;
  onEigenModeChange: (modeNo: number) => void;
  onResponseSpectrumResultChange: (resultKey: ResponseSpectrumSelection) => void;
  onSpacerAxisSwapChange: (swap: SpacerAxisSwap) => void;
  onAnimationOptionsChange: (options: AnimationOptions) => void;
  onCompareModeChange: (next: boolean) => void;
  onCameraSyncChange: (next: boolean) => void;
  onForceColorMapChange: (enabled: boolean) => void;
  onForceColorComponentChange: (component: import("./memberForceColorMap").ForceColorComponent) => void;
  onForceColorValueTypeChange: (valueType: import("./memberForceColorMap").ForceColorValueType) => void;
  onFit: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
}> = {}) {
  return {
    visibility: {
      nodes: true,
      members: true,
      supports: true,
      loads: true,
      labels: true,
      nodeLabels: true,
      memberLabels: true,
      grid: true,
      axes: true,
      deformedShape: false,
      reactions: false,
      axialForce: false,
      shearQy: false,
      shearQz: false,
      momentMy: false,
      momentMz: false,
    },
    scales: {
      loadScale: 1,
      deformationScale: 1,
      modeScale: 1,
      resultScale: 1,
      nodeSize: 1,
      labelSize: 1,
    },
    loadCaseIds: ["LC1"],
    selectedLoadCaseId: "LC1",
    eigenModeNos: [1, 2, 3],
    selectedEigenMode: 1,
    responseSpectrumOptions: [] as Array<{ key: ResponseSpectrumSelection; label: string }>,
    selectedResponseSpectrumResult: "SRSS" as ResponseSpectrumSelection,
    hasResult: true,
    spacerAxisSwap: "off" as SpacerAxisSwap,
    animationOptions: { ...DEFAULT_ANIMATION_OPTIONS },
    compareMode: false,
    cameraSync: true,
    forceColorMap: false,
    forceColorComponent: "N" as import("./memberForceColorMap").ForceColorComponent,
    forceColorValueType: "absMax" as import("./memberForceColorMap").ForceColorValueType,
    onVisibilityChange: () => undefined,
    onScalesChange: () => undefined,
    onLoadCaseChange: () => undefined,
    onEigenModeChange: () => undefined,
    onResponseSpectrumResultChange: () => undefined,
    onSpacerAxisSwapChange: () => undefined,
    onAnimationOptionsChange: () => undefined,
    onCompareModeChange: () => undefined,
    onCameraSyncChange: () => undefined,
    onForceColorMapChange: () => undefined,
    onForceColorComponentChange: () => undefined,
    onForceColorValueTypeChange: () => undefined,
    onFit: () => undefined,
    onCameraPreset: () => undefined,
    ...overrides,
  };
}

describe("ViewerControls UI surface", () => {
  it("renders all five view buttons (Fit / Iso / XY / YZ / XZ)", () => {
    render(<ViewerControls {...buildProps()} />);
    expect(document.querySelector('[data-testid="view-fit"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="view-iso"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="view-xy"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="view-yz"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="view-xz"]')).not.toBeNull();
  });

  it("renders the Compare View and Camera Sync checkboxes", () => {
    render(<ViewerControls {...buildProps()} />);
    expect(document.querySelector('[data-testid="compare-view-toggle"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="camera-sync-toggle"]')).not.toBeNull();
  });

  it("renders the Animation / Demo Shape / Mode / Direction / Scale / Speed controls", () => {
    render(<ViewerControls {...buildProps()} />);
    expect(document.querySelector('[data-testid="animation-toggle"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="animation-demo-toggle"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="animation-mode"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="animation-direction"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="animation-scale"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="animation-speed"]')).not.toBeNull();
  });

  it("renders the SPACER Axis Swap checkbox", () => {
    render(<ViewerControls {...buildProps()} />);
    expect(document.querySelector('[data-testid="spacer-axis-swap-toggle"]')).not.toBeNull();
  });
});

describe("ViewerControls wiring", () => {
  it("toggles Compare View and calls onCompareModeChange", () => {
    const onCompareModeChange = vi.fn();
    render(<ViewerControls {...buildProps({ onCompareModeChange })} />);
    const input = document.querySelector('[data-testid="compare-view-toggle"]') as HTMLInputElement;
    act(() => {
      setChecked(input, true);
    });
    expect(onCompareModeChange).toHaveBeenCalledWith(true);
  });

  it("toggles Animation and calls onAnimationOptionsChange with enabled=true", () => {
    const onAnimationOptionsChange = vi.fn();
    render(<ViewerControls {...buildProps({ onAnimationOptionsChange })} />);
    const input = document.querySelector('[data-testid="animation-toggle"]') as HTMLInputElement;
    act(() => {
      setChecked(input, true);
    });
    expect(onAnimationOptionsChange).toHaveBeenCalledTimes(1);
    const arg = onAnimationOptionsChange.mock.calls[0][0] as AnimationOptions;
    expect(arg.enabled).toBe(true);
  });

  it("toggles Demo Shape and forwards useDemo through onAnimationOptionsChange", () => {
    const onAnimationOptionsChange = vi.fn();
    render(
      <ViewerControls
        {...buildProps({
          onAnimationOptionsChange,
          animationOptions: { ...DEFAULT_ANIMATION_OPTIONS, useDemo: false },
        })}
      />,
    );
    const input = document.querySelector('[data-testid="animation-demo-toggle"]') as HTMLInputElement;
    act(() => {
      setChecked(input, true);
    });
    expect(onAnimationOptionsChange).toHaveBeenCalledTimes(1);
    const arg = onAnimationOptionsChange.mock.calls[0][0] as AnimationOptions;
    expect(arg.useDemo).toBe(true);
    expect(arg.enabled).toBe(DEFAULT_ANIMATION_OPTIONS.enabled);
  });

  it("changing the Mode select emits the new modeNo via onAnimationOptionsChange", () => {
    const onAnimationOptionsChange = vi.fn();
    render(<ViewerControls {...buildProps({ onAnimationOptionsChange })} />);
    const select = document.querySelector('[data-testid="animation-mode"]') as HTMLSelectElement;
    act(() => {
      setValue(select, "2");
    });
    expect(onAnimationOptionsChange).toHaveBeenCalledTimes(1);
    const arg = onAnimationOptionsChange.mock.calls[0][0] as AnimationOptions;
    expect(arg.modeNo).toBe(2);
  });

  it("changing the Direction select emits demoDirection", () => {
    const onAnimationOptionsChange = vi.fn();
    render(<ViewerControls {...buildProps({ onAnimationOptionsChange })} />);
    const select = document.querySelector('[data-testid="animation-direction"]') as HTMLSelectElement;
    act(() => {
      setValue(select, "transverse");
    });
    expect(onAnimationOptionsChange).toHaveBeenCalledTimes(1);
    const arg = onAnimationOptionsChange.mock.calls[0][0] as AnimationOptions;
    expect(arg.demoDirection).toBe("transverse");
  });

  it("toggles SPACER Axis Swap and calls onSpacerAxisSwapChange with 'on'", () => {
    const onSpacerAxisSwapChange = vi.fn();
    render(<ViewerControls {...buildProps({ onSpacerAxisSwapChange })} />);
    const input = document.querySelector('[data-testid="spacer-axis-swap-toggle"]') as HTMLInputElement;
    act(() => {
      setChecked(input, true);
    });
    expect(onSpacerAxisSwapChange).toHaveBeenCalledWith("on");
  });

  it("toggles SPACER Axis Swap off and calls onSpacerAxisSwapChange with 'off'", () => {
    const onSpacerAxisSwapChange = vi.fn();
    render(
      <ViewerControls
        {...buildProps({ onSpacerAxisSwapChange, spacerAxisSwap: "on" as SpacerAxisSwap })}
      />,
    );
    const input = document.querySelector('[data-testid="spacer-axis-swap-toggle"]') as HTMLInputElement;
    act(() => {
      setChecked(input, false);
    });
    expect(onSpacerAxisSwapChange).toHaveBeenCalledWith("off");
  });

  it("toggles Qy and Qz diagram visibility", () => {
    const onVisibilityChange = vi.fn();
    render(<ViewerControls {...buildProps({ onVisibilityChange })} />);

    act(() => {
      setChecked(document.querySelector('[data-testid="shear-qy-toggle"]') as HTMLInputElement, true);
    });
    act(() => {
      setChecked(document.querySelector('[data-testid="shear-qz-toggle"]') as HTMLInputElement, true);
    });

    expect(onVisibilityChange).toHaveBeenCalledWith(expect.objectContaining({ shearQy: true }));
    expect(onVisibilityChange).toHaveBeenCalledWith(expect.objectContaining({ shearQz: true }));
  });

  it("invokes onCameraPreset for the Iso / XY / YZ / XZ buttons (Fit uses onFit)", () => {
    const onCameraPreset = vi.fn();
    const onFit = vi.fn();
    render(<ViewerControls {...buildProps({ onCameraPreset, onFit })} />);
    const cases: Array<[string, CameraPreset]> = [
      ["view-iso", "iso"],
      ["view-xy", "xy"],
      ["view-yz", "yz"],
      ["view-xz", "xz"],
    ];
    for (const [testid, preset] of cases) {
      const btn = document.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement;
      act(() => {
        btn.click();
      });
      expect(onCameraPreset).toHaveBeenCalledWith(preset);
    }
    // Fit button uses onFit, not onCameraPreset
    const fitBtn = document.querySelector('[data-testid="view-fit"]') as HTMLButtonElement;
    act(() => {
      fitBtn.click();
    });
    expect(onFit).toHaveBeenCalledTimes(1);
    expect(onCameraPreset).toHaveBeenCalledTimes(cases.length);
  });
});

describe("ViewerControls animation scale and speed", () => {
  it("changing the Deformation Scale slider emits the new scale via onAnimationOptionsChange", () => {
    const onAnimationOptionsChange = vi.fn();
    render(<ViewerControls {...buildProps({ onAnimationOptionsChange })} />);
    const slider = document.querySelector('[data-testid="animation-scale"]') as HTMLInputElement;
    act(() => {
      setValue(slider, "7.5");
    });
    expect(onAnimationOptionsChange).toHaveBeenCalledTimes(1);
    const arg = onAnimationOptionsChange.mock.calls[0][0] as AnimationOptions;
    expect(arg.scale).toBe(7.5);
  });

  it("changing the Speed slider emits the new speed via onAnimationOptionsChange", () => {
    const onAnimationOptionsChange = vi.fn();
    render(<ViewerControls {...buildProps({ onAnimationOptionsChange })} />);
    const slider = document.querySelector('[data-testid="animation-speed"]') as HTMLInputElement;
    act(() => {
      setValue(slider, "2.5");
    });
    expect(onAnimationOptionsChange).toHaveBeenCalledTimes(1);
    const arg = onAnimationOptionsChange.mock.calls[0][0] as AnimationOptions;
    expect(arg.speed).toBe(2.5);
  });
});
