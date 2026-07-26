// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ApolloPhase1Shell } from "../ApolloPhase1Shell";

function renderShell(onReturnToPro: () => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<ApolloPhase1Shell onReturnToPro={onReturnToPro} />);
  });
  return { container };
}

describe("ApolloPhase1Shell", () => {
  it("shows guarded placeholder only", () => {
    const { container } = renderShell(() => undefined);
    expect(container.querySelector("[data-testid='apollo-phase1-shell']")).not.toBeNull();
    expect(container.textContent).toContain("Phase 1 foundation");
    expect(container.textContent).not.toMatch(/BSDD|bridge type|analysis/i);
  });

  it("returns to pro workspace", () => {
    const onReturnToPro = vi.fn();
    const { container } = renderShell(onReturnToPro);
    const button = container.querySelector("[data-testid='apollo-return-to-pro']") as HTMLButtonElement;
    button.click();
    expect(onReturnToPro).toHaveBeenCalledOnce();
  });
});
