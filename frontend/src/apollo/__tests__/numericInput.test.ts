// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { commitApolloNumericDraft, normalizeApolloNumericDraft } from "../numericInput";
import { ApolloNumericInput } from "../components/ApolloNumericInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("numericInput", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("accepts fullwidth digits on commit", () => {
    expect(normalizeApolloNumericDraft("　１２．５　")).toBe("12.5");
    expect(commitApolloNumericDraft("１２．５")).toEqual({ ok: true, value: 12.5 });
  });

  it("rejects kanji numerals and unit suffixes", () => {
    expect(commitApolloNumericDraft("百二十三").ok).toBe(false);
    expect(commitApolloNumericDraft("１２３ｍ").ok).toBe(false);
    expect(commitApolloNumericDraft("1,234.5").ok).toBe(false);
  });

  it("does not coerce incomplete tokens to zero", () => {
    expect(commitApolloNumericDraft("-").ok).toBe(false);
    expect(commitApolloNumericDraft(".").ok).toBe(false);
    expect(commitApolloNumericDraft("").ok).toBe(false);
  });

  it("commits a valid draft on blur through ApolloNumericInput", () => {
    const onCommit = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(createElement(ApolloNumericInput, { value: 0, onCommit }));
    });

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();

    act(() => {
      input.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(input, "１２．５");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.blur();
    });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(12.5);

    act(() => {
      root.unmount();
    });
  });
});
