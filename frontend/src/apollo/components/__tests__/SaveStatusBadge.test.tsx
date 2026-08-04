// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SaveStatusBadge } from "../SaveStatusBadge";

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
});

function renderBadge(props: { isDirty: boolean; persisting: "save" | "reload" | null }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(<SaveStatusBadge {...props} />);
  });
  return container;
}

describe("SaveStatusBadge", () => {
  it("shows saved state when not dirty", () => {
    const container = renderBadge({ isDirty: false, persisting: null });
    const badge = container.querySelector('[data-testid="apollo-save-status-badge"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("保存済み");
    expect(badge!.className).toContain("apollo-save-status-saved");
  });

  it("shows unsaved state when dirty", () => {
    const container = renderBadge({ isDirty: true, persisting: null });
    const badge = container.querySelector('[data-testid="apollo-save-status-badge"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("変更あり");
    expect(badge!.className).toContain("apollo-save-status-unsaved");
  });

  it("shows persisting state during save", () => {
    const container = renderBadge({ isDirty: true, persisting: "save" });
    const badge = container.querySelector('[data-testid="apollo-save-status-badge"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("保存中...");
    expect(badge!.className).toContain("apollo-save-status-persisting");
  });

  it("is not clickable", () => {
    const container = renderBadge({ isDirty: false, persisting: null });
    const badge = container.querySelector('[data-testid="apollo-save-status-badge"]');
    expect(badge!.tagName).not.toBe("BUTTON");
    expect(badge!.tagName).toBe("SPAN");
  });
});