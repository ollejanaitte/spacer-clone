import { getUiModeDefault } from "./services/uiModeDefault";
import { LobbyHome } from "./pages/LobbyHome";
import { LearnTop } from "./pages/LearnTop";

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

type LobbyAppProps = {
  initialRoute?: LobbyRoute;
};

export function LobbyApp({ initialRoute }: LobbyAppProps) {
  const route = initialRoute ?? getInitialRoute();
  const handleNavigate = (path: string) => navigateTo(path);

  if (route === "/learn") {
    return <LearnTop onNavigate={handleNavigate} />;
  }
  return <LobbyHome onNavigate={handleNavigate} />;
}
