export const NEXT_APP_ROOT = "/app";
export const NEXT_BUSINESS_LIST_PATH = "/app/business";
export const NEXT_PROJECT_HOME_PATH = "/app/projects";

export function isNextAppPath(pathname: string): boolean {
  return pathname === NEXT_APP_ROOT || pathname.startsWith(`${NEXT_APP_ROOT}/`);
}

export function navigateTo(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const LEGACY_SYSTEM_PATH = "/pro";
export const LEGACY_LOBBY_PATH = "/";
