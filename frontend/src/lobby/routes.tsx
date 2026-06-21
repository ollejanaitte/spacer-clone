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
  if (saved === "level0") return "/";
  if (saved === "pro") return "/";
  return "/";
}

type LobbyAppProps = {
  onNavigate: (path: string) => void;
  initialRoute?: LobbyRoute;
};

export function LobbyApp({ onNavigate, initialRoute }: LobbyAppProps) {
  const route = initialRoute ?? getInitialRoute();

  if (route === "/learn") {
    return <LearnTop onNavigate={onNavigate} />;
  }
  return <LobbyHome onNavigate={onNavigate} />;
}
