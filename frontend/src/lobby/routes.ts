import { getUiModeDefault } from "./services/uiModeDefault";

export type LobbyRoute = "/" | "/learn";

export function resolveLobbyRoute(pathname: string): LobbyRoute | null {
  if (pathname === "/") return "/";
  if (pathname === "/learn") return "/learn";
  return null;
}

export function getInitialRoute(): LobbyRoute {
  const saved = getUiModeDefault();
  if (saved === "learn") return "/learn";
  if (saved === "level0") {
    if (typeof window !== "undefined") window.location.href = "/level0";
    return "/";
  }
  if (saved === "pro") {
    if (typeof window !== "undefined") window.location.href = "/pro";
    return "/";
  }
  return "/";
}

export function navigateTo(path: string): void {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
