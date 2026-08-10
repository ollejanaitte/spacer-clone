export const NEXT_APP_ROOT = "/app";
export const NEXT_HOME_PATH = "/app";
export const NEXT_QUICK_PATH = "/app/quick";
export const NEXT_BUSINESS_LIST_PATH = "/app/business";
export const NEXT_NEW_PROJECT_PATH = "/app/business/new";
export const NEXT_EDIT_PROJECT_PATH_PREFIX = "/app/business";
export const NEXT_EDIT_PROJECT_PATH_SUFFIX = "/edit";
export const NEXT_PROJECT_HOME_PATH = "/app/projects";

export function isNextAppPath(pathname: string): boolean {
  return pathname === NEXT_APP_ROOT || pathname.startsWith(`${NEXT_APP_ROOT}/`);
}

export function isQuickPath(pathname: string): boolean {
  return pathname === NEXT_QUICK_PATH || pathname.startsWith(`${NEXT_QUICK_PATH}/`);
}

export function isNewProjectPath(pathname: string): boolean {
  return pathname === NEXT_NEW_PROJECT_PATH;
}

export function editProjectPath(projectId: string): string {
  return `${NEXT_EDIT_PROJECT_PATH_PREFIX}/${encodeURIComponent(projectId)}${NEXT_EDIT_PROJECT_PATH_SUFFIX}`;
}

export function isEditProjectPath(pathname: string): boolean {
  return (
    pathname.startsWith(`${NEXT_EDIT_PROJECT_PATH_PREFIX}/`) &&
    pathname.endsWith(NEXT_EDIT_PROJECT_PATH_SUFFIX)
  );
}

export function parseEditProjectId(pathname: string): string | undefined {
  if (!isEditProjectPath(pathname)) return undefined;
  const id = pathname.slice(
    NEXT_EDIT_PROJECT_PATH_PREFIX.length + 1,
    pathname.length - NEXT_EDIT_PROJECT_PATH_SUFFIX.length,
  );
  return id.length > 0 ? decodeURIComponent(id) : undefined;
}

export function navigateTo(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const LEGACY_SYSTEM_PATH = "/pro";
export const LEGACY_LOBBY_PATH = "/";
