// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetProjectManagerForTest } from "../../project/projectManagerInstance";
import { HomePage } from "../HomePage";

async function render(node: ReactNode): Promise<Root> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return root;
}

beforeEach(() => {
  document.body.innerHTML = "";
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("P1-01 旧/新導線整理", () => {
  it("HomePage marks /app as production and exposes legacy /pro as reference-only", async () => {
    const root = await render(<HomePage />);
    expect(document.querySelector('[data-testid="home-production-note"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-production-note"]')?.textContent).toContain("production正");
    expect(document.querySelector('[data-testid="home-legacy-reference"]')?.textContent).toContain("legacy /pro");
    expect(document.querySelector('[data-testid="home-production-note"]')?.textContent).toContain("参照");
    root.unmount();
  });
});
