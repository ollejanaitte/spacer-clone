import { getUiModeDefault } from "./services/uiModeDefault";
import { LobbyHome } from "./pages/LobbyHome";
import { LearnTop } from "./pages/LearnTop";
import { Level0Top } from "./pages/Level0Top";
import { Level0Lesson } from "./pages/Level0Lesson";
import { Level0Sample } from "./pages/Level0Sample";
import { Level0LessonDetail } from "./pages/Level0LessonDetail";

export type LobbyRoute = "/" | "/learn" | "/level0" | "/level0/lesson" | "/level0/lesson/:lessonId";

export function resolveLobbyRoute(pathname: string): LobbyRoute | null {
  if (pathname === "/") return "/";
  if (pathname === "/learn") return "/learn";
  if (/^\/level0\/lesson\/[^/]+$/.test(pathname)) return "/level0/lesson/:lessonId";
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

function parseLocation(location: string) {
  return new URL(location, "http://localhost");
}

function getCurrentRoute(currentLocation?: string): LobbyRoute {
  if (typeof window === "undefined" && currentLocation === undefined) return "/";
  const location = currentLocation ?? `${window.location.pathname}${window.location.search}`;
  const resolved = resolveLobbyRoute(parseLocation(location).pathname);
  return resolved ?? getInitialRoute();
}

type LobbyAppProps = {
  onNavigate: (path: string) => void;
  initialRoute?: LobbyRoute;
  currentLocation?: string;
};

export function LobbyApp({ onNavigate, initialRoute, currentLocation }: LobbyAppProps) {
  const location = parseLocation(currentLocation ?? (
    typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`
  ));
  const route = initialRoute ?? getCurrentRoute(currentLocation);

  if (route === "/learn") {
    return <LearnTop onNavigate={onNavigate} />;
  }
  if (route === "/level0/lesson/:lessonId") {
    const lessonId = decodeURIComponent(location.pathname.slice("/level0/lesson/".length));
    return <Level0LessonDetail lessonId={lessonId} onNavigate={onNavigate} />;
  }
  if (route === "/level0/lesson") {
    return <Level0Lesson onNavigate={onNavigate} />;
  }
  if (route === "/level0") {
    const sampleId = location.searchParams.get("sample");
    if (sampleId) {
      return <Level0Sample sampleId={sampleId} onNavigate={onNavigate} />;
    }
    return <Level0Top onNavigate={onNavigate} />;
  }
  return <LobbyHome onNavigate={onNavigate} />;
}
