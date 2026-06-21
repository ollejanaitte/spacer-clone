// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LearnTop } from "../pages/LearnTop";
import { clearLearnLinksCache } from "../services/learnLinksLoader";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return { container, root };
}

describe("LearnTop", () => {
  beforeEach(() => {
    clearLearnLinksCache();
    window.localStorage.clear();
  });

  test("タイトルが表示される", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ version: "1.0.0", links: [] }),
    } as Response);
    const { container } = renderComponent(<LearnTop onNavigate={() => {}} />);
    await act(async () => {});
    expect(container.textContent).toContain("学習編");
  });

  test("ホームに戻るが表示される", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ version: "1.0.0", links: [] }),
    } as Response);
    const { container } = renderComponent(<LearnTop onNavigate={() => {}} />);
    await act(async () => {});
    expect(container.textContent).toContain("ホームに戻る");
  });

  test("外部リンクカードが表示される", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        version: "1.0.0",
        links: [{ id: "test", title: "テストリンク", description: "テスト", url: "https://example.com", category: "test", targetAudience: [] }],
      }),
    } as Response);
    const { container } = renderComponent(<LearnTop onNavigate={() => {}} />);
    await act(async () => {});
    expect(container.textContent).toContain("テストリンク");
  });

  test("外部リンクがtarget=_blankを持つ", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        version: "1.0.0",
        links: [{ id: "test", title: "テスト", description: "テスト", url: "https://example.com", category: "test", targetAudience: [] }],
      }),
    } as Response);
    const { container } = renderComponent(<LearnTop onNavigate={() => {}} />);
    await act(async () => {});
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toContain("noopener");
    expect(link?.rel).toContain("noreferrer");
  });
});
