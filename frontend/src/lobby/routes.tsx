import { getUiModeDefault } from "./services/uiModeDefault";
import { LobbyHome } from "./pages/LobbyHome";
import { LearnTop } from "./pages/LearnTop";
import { Level0Top } from "./pages/Level0Top";
import { Level0Lesson } from "./pages/Level0Lesson";

export type LobbyRoute = "/" | "/learn" | "/level0" | "/level0/lesson";

export function resolveLobbyRoute(pathname: string): LobbyRoute | null {
  if (pathname === "/") return "/";
  if (pathname === "/learn") return "/learn";
  if (pathname === "/level0/lesson") return "/level0/lesson";
  if (pathname === "/level0") return "/level0";
  return null;
}

export function getInitialRoute(): LobbyRoute {
  const saved = getUiModeDefault();
  if (saved === "learn") return "/learn";
  if (saved === "level0") return "/level0";
  if (saved === "pro") return "/";
  return "/";
}

function getCurrentRoute(): LobbyRoute {
  if (typeof window === "undefined") return "/";
  const resolved = resolveLobbyRoute(window.location.pathname);
  return resolved ?? getInitialRoute();
}

type LobbyAppProps = {
  onNavigate: (path: string) => void;
  initialRoute?: LobbyRoute;
};

export function LobbyApp({ onNavigate, initialRoute }: LobbyAppProps) {
  const route = initialRoute ?? getCurrentRoute();

  if (route === "/learn") {
    return <LearnTop onNavigate={onNavigate} />;
  }
  if (route === "/level0/lesson") {
    return <Level0Lesson onNavigate={onNavigate} />;
  }
  if (route === "/level0") {
    return <Level0Top onNavigate={onNavigate} />;
  }
  return <LobbyHome onNavigate={onNavigate} />;
}
