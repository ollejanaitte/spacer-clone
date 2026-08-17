export const NEXT_APP_ROOT = "/app";
export const NEXT_HOME_PATH = "/app";
export const NEXT_BUSINESS_LIST_PATH = "/app/business";
export const NEXT_NEW_PROJECT_PATH = "/app/business/new";
export const NEXT_EDIT_PROJECT_PATH_PREFIX = "/app/business";
export const NEXT_EDIT_PROJECT_PATH_SUFFIX = "/edit";
export const NEXT_PROJECT_HOME_PATH = "/app/projects";
export const NEXT_MODULE_PATH_PREFIX = "/app/projects";
export const NEXT_MODULE_PATH_SUFFIX = "/modules";

export function modulePath(projectId: string, moduleId: string): string {
  return `${NEXT_MODULE_PATH_PREFIX}/${encodeURIComponent(projectId)}${NEXT_MODULE_PATH_SUFFIX}/${encodeURIComponent(moduleId)}`;
}

export function isModulePath(pathname: string): boolean {
  return pathname.includes(NEXT_MODULE_PATH_SUFFIX);
}

export function parseModulePath(pathname: string): { projectId: string; moduleId: string } | undefined {
  const marker = NEXT_MODULE_PATH_SUFFIX;
  const index = pathname.indexOf(marker);
  if (index < 0) return undefined;
  const projectPart = pathname.slice(NEXT_MODULE_PATH_PREFIX.length + 1, index);
  const modulePart = pathname.slice(index + marker.length + 1);
  if (projectPart.length === 0 || modulePart.length === 0) return undefined;
  return { projectId: decodeURIComponent(projectPart), moduleId: decodeURIComponent(modulePart) };
}

export function isNextAppPath(pathname: string): boolean {
  return pathname === NEXT_APP_ROOT || pathname.startsWith(`${NEXT_APP_ROOT}/`);
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
