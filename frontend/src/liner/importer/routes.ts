export const IMPORTER_ROUTE_PATH = "/pro/importer";

export type ImporterRouteMatch =
  | { kind: "list" }
  | { kind: "lineMaster"; projectId: string; bridgeId: string };

export function resolveImporterRoute(pathname: string): boolean {
  return pathname === IMPORTER_ROUTE_PATH || pathname.startsWith(`${IMPORTER_ROUTE_PATH}/`);
}

export function resolveImporterRoutePath(): string {
  return IMPORTER_ROUTE_PATH;
}

export function resolveImporterLineMasterRoutePath(
  projectId: string,
  bridgeId: string,
): string {
  return `${IMPORTER_ROUTE_PATH}/${projectId}/line-master/${bridgeId}`;
}

export function matchImporterRoute(pathname: string): ImporterRouteMatch {
  if (pathname === IMPORTER_ROUTE_PATH) {
    return { kind: "list" };
  }

  const lineMasterMatch = pathname.match(
    /^\/pro\/importer\/([^/]+)\/line-master\/([^/]+)\/?$/,
  );
  if (lineMasterMatch) {
    return {
      kind: "lineMaster",
      projectId: lineMasterMatch[1]!,
      bridgeId: lineMasterMatch[2]!,
    };
  }

  return { kind: "list" };
}
