export const legacyOutputTargetPath = "/th/output-targets";
export const timeHistoryRunPath = "/th/run";

export function resolveTimeHistoryPath(pathname: string): string {
  return pathname === legacyOutputTargetPath ? timeHistoryRunPath : pathname;
}

export function redirectLegacyTimeHistoryRoute(): boolean {
  if (typeof window === "undefined") return false;
  const nextPath = resolveTimeHistoryPath(window.location.pathname);
  if (nextPath === window.location.pathname) return false;
  window.history.replaceState(window.history.state, "", `${nextPath}${window.location.search}${window.location.hash}`);
  return true;
}
