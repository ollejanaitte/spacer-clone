// @vitest-environment jsdom
// Phase C1 (M2-03) 入力フォーム・コンポーネントテスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { SubstructureFormPanel, type FormDataBundle } from "../planning/SubstructureFormPanel";
import { StructureTypeSelector } from "../planning/forms/StructureTypeSelector";
import { PlacementFields, type PlacementFormState } from "../planning/forms/PlacementFields";
import { PierInputForm, type PierFormState } from "../planning/forms/PierInputForm";
import { supportToForm } from "../planning/formModel";
import type { Support } from "../model";

function pierSupport(): Support {
  return {
    supportId: "P1",
    supportType: "pier",
    skewRad: 0,
    placement: { source: "liner", alignmentId: "aln", station: 50, offset: 2 },
    bearingSeats: [],
    pier: {
      id: "P1",
      formType: "single_column_rect",
      column: { id: "C", width: 1.2, depth: 1.6, height: 7 },
      cap: { id: "CAP", width: 1.6, depth: 8, height: 1.2, overhangL: 0.5, overhangR: 0.5 },
      footing: { id: "F", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
      pileGroup: { id: "PG", pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 6, spacing: { x: 3, y: 3 } },
    },
  };
}

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

describe("StructureTypeSelector", () => {
  it("renders supported types enabled and unsupported disabled", () => {
    const onChange = vi.fn();
    const { container } = render(
      <StructureTypeSelector category="pier" value="single_column_rect" onChange={onChange} />,
    );
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="type-single_column_rect"]')!;
    expect(btn.disabled).toBe(false);
    const unsupported = container.querySelector<HTMLButtonElement>('[data-testid="type-hammer_head"]')!;
    expect(unsupported.disabled).toBe(true);
    act(() => btn.click());
    expect(onChange).toHaveBeenCalled();
  });
});

describe("PlacementFields", () => {
  it("renders placement + read-only derived values", () => {
    const state: PlacementFormState = {
      alignmentId: "aln",
      station: 50,
      offset: 2,
      skewDeg: 10,
      z: 5,
    };
    const onChange = vi.fn();
    const { container } = render(
      <PlacementFields
        state={state}
        derived={{ x: 100, y: 50, tangent: "1,0,0", transverse: "0,1,0" }}
        onChange={onChange}
      />,
    );
    expect(container.querySelector('[data-testid="placement-station"] input')?.getAttribute("value")).toBe("50");
    const xInput = container.querySelector<HTMLInputElement>('[data-testid="placement-x"] input')!;
    expect(xInput.getAttribute("data-readonly")).toBe("true");
    expect(xInput.value).toBe("100.00");
  });

  it("edits skew in degrees and reports deg value", () => {
    const onChange = vi.fn();
    const onSkew = vi.fn();
    const state: PlacementFormState = { alignmentId: "", station: null, offset: null, skewDeg: 10, z: null };
    const { container } = render(
      <PlacementFields state={state} derived={{ x: null, y: null, tangent: "—", transverse: "—" }} onChange={onChange} onSkewDegChange={onSkew} />,
    );
    const input = container.querySelector<HTMLInputElement>('[data-testid="placement-skew"] input')!;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "15");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalled();
    expect(onSkew).toHaveBeenCalledWith(15);
  });
});

describe("PierInputForm", () => {
  function state(formType: PierFormState["formType"]): PierFormState {
    return {
      formType,
      column: { width: 1.2, depth: 1.6, height: 7, transverseOffset: null },
      cap: { width: 1.6, depth: 8, height: 1.2, overhangL: 0.5, overhangR: 0.5 },
      columns: [
        { width: 1.4, depth: 1.8, height: 8, transverseOffset: -3.5 },
        { width: 1.4, depth: 1.8, height: 8, transverseOffset: 3.5 },
      ],
      beam: { width: 1.6, depth: 9, height: 1.5 },
    };
  }

  it("renders single column form", () => {
    const { container } = render(<PierInputForm state={state("single_column_rect")} onChange={() => {}} />);
    expect(container.querySelector('[data-testid="pier-form"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pier-col-width"] input')!.getAttribute("value")).toBe("1.2");
  });

  it("switches to portal form with 2 columns + beam", () => {
    const { container } = render(<PierInputForm state={state("portal_frame")} onChange={() => {}} />);
    expect(container.querySelector('[data-testid="portal-pier-form"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="portal-col-1-width"] input')!.getAttribute("value")).toBe("1.4");
    expect(container.querySelector('[data-testid="portal-col-2-height"] input')!.getAttribute("value")).toBe("8");
    expect(container.querySelector('[data-testid="portal-beam-height"] input')!.getAttribute("value")).toBe("1.5");
  });

  it("edits propagate to onChange", () => {
    const onChange = vi.fn();
    const { container } = render(<PierInputForm state={state("single_column_rect")} onChange={onChange} />);
    const input = container.querySelector<HTMLInputElement>('[data-testid="pier-col-width"] input')!;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "2.0");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("SubstructureFormPanel", () => {
  it("shows form for selected pier and validation ok", () => {
    const form = supportToForm(pierSupport()) as FormDataBundle;
    const { container } = render(<SubstructureFormPanel form={form} onPatch={() => {}} />);
    expect(container.querySelector('[data-testid="structure-type-selector"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="placement-fields"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pier-form"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="foundation-form"]')).not.toBeNull();
    // validation ok badge
    expect(container.querySelector('[data-testid="validation-ok"]')).not.toBeNull();
  });

  it("shows fatal validation when dimension invalid", () => {
    const form = supportToForm(pierSupport()) as FormDataBundle;
    form.pier!.column.width = 0;
    const { container } = render(<SubstructureFormPanel form={form} onPatch={() => {}} />);
    expect(container.querySelector('[data-testid="validation-fatal"]')).not.toBeNull();
  });

  it("renders null form as hint", () => {
    const { container } = render(<SubstructureFormPanel form={null} />);
    expect(container.textContent).toContain("選択");
  });
});
