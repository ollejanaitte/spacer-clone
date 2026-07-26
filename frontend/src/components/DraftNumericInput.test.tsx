// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ja } from "../i18n/ja";
import { DraftNumericInput } from "./DraftNumericInput";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

function renderInput(
  props: {
    value?: number;
    onChange?: (value: number) => void;
    onValidityChange?: (isInvalid: boolean) => void;
  } = {},
) {
  const onChange = props.onChange ?? vi.fn();
  const onValidityChange = props.onValidityChange ?? vi.fn();
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(
      <DraftNumericInput
        value={props.value ?? 10}
        onChange={onChange}
        onValidityChange={onValidityChange}
        aria-label="test-numeric"
      />,
    );
  });
  const input = document.querySelector<HTMLInputElement>('input[aria-label="test-numeric"]');
  if (!input) throw new Error("input not found");
  return { input, onChange, onValidityChange };
}

function setDraft(input: HTMLInputElement, value: string) {
  act(() => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function blur(input: HTMLInputElement) {
  act(() => {
    input.blur();
  });
}

describe("DraftNumericInput", () => {
  it("commits valid numbers and does not commit empty drafts", () => {
    const { input, onChange } = renderInput({ value: 5 });
    setDraft(input, "");
    expect(onChange).not.toHaveBeenCalled();
    setDraft(input, "12.34");
    expect(onChange).toHaveBeenCalledWith(12.34);
  });

  it("does not silently commit zero from empty input", () => {
    const { input, onChange } = renderInput({ value: 7 });
    setDraft(input, "");
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("marks invalid drafts and restores the last committed value on blur", () => {
    const onValidityChange = vi.fn();
    const { input } = renderInput({ value: 3, onValidityChange });
    setDraft(input, "abc");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onValidityChange).toHaveBeenCalledWith(true);
    blur(input);
    expect(input.value).toBe("3");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("shows the Japanese invalid message while invalid", () => {
    const { input } = renderInput();
    setDraft(input, "12abc");
    expect(document.body.textContent).toContain(ja.input.numericInvalid);
    blur(input);
    expect(document.body.textContent).not.toContain(ja.input.numericInvalid);
  });

  it("rejects full-width digits as invalid without committing", () => {
    const { input, onChange } = renderInput({ value: 1 });
    setDraft(input, "１２３");
    expect(onChange).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    blur(input);
    expect(input.value).toBe("1");
  });
});
