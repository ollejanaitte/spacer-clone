// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, test } from "vitest";
import { LobbyApp, resolveLobbyRoute } from "../routes";

function renderRoute(currentLocation: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<LobbyApp currentLocation={currentLocation} onNavigate={() => {}} />);
  });
  return container;
}

describe("level0 route integration", () => {
  test("resolves the lesson detail path", () => {
    expect(resolveLobbyRoute("/level0/lesson/why-bridge-stands"))
      .toBe("/level0/lesson/:lessonId");
  });

  test.each([
    ["/level0?sample=short", "短い橋"],
    ["/level0?sample=standard", "標準的な橋"],
    ["/level0?sample=tall", "高い橋脚の橋"],
  ])("%sでサンプル別画面を表示する", (location, heading) => {
    const container = renderRoute(location);
    expect(container.querySelector("h1")?.textContent).toBe(heading);
    expect(container.textContent).toContain("確認できること");
  });

  test("renders the lesson list at /level0/lesson", () => {
    const container = renderRoute("/level0/lesson");
    expect(container.querySelector("h1")?.textContent).toBe("教材モード");
  });

  test("renders the lesson detail at /level0/lesson/:id", () => {
    const container = renderRoute("/level0/lesson/why-bridge-stands");
    expect(container.querySelector("h1")?.textContent).toBe("橋はなぜ支えられるのか");
    expect(container.textContent).toContain("地盤へ流れます");
  });
});
