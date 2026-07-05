export const IMPORTER_ROUTE_PATH = "/pro/importer";
export const IMPORTER_STARTUP_ROUTE_PATH = `${IMPORTER_ROUTE_PATH}/startup`;

export type ImporterRouteMatch =
  | { kind: "list" }
  | { kind: "startup" }
  | { kind: "lineMaster"; projectId: string; bridgeId: string }
  | { kind: "sectionList"; projectId: string; bridgeId: string }
  | { kind: "sectionEdit"; projectId: string; bridgeId: string; sectionId: string }
  | { kind: "validation"; projectId: string; bridgeId: string }
  | { kind: "export"; projectId: string; bridgeId: string };

export function resolveImporterRoute(pathname: string): boolean {
  return pathname === IMPORTER_ROUTE_PATH || pathname.startsWith(`${IMPORTER_ROUTE_PATH}/`);
}

export function resolveImporterRoutePath(): string {
  return IMPORTER_ROUTE_PATH;
}

export function resolveImporterStartupRoutePath(): string {
  return IMPORTER_STARTUP_ROUTE_PATH;
}

export function resolveImporterLineMasterRoutePath(
  projectId: string,
  bridgeId: string,
): string {
  return `${IMPORTER_ROUTE_PATH}/${projectId}/line-master/${bridgeId}`;
}

export function resolveImporterSectionListRoutePath(
  projectId: string,
  bridgeId: string,
): string {
  return `${IMPORTER_ROUTE_PATH}/${projectId}/sections/${bridgeId}`;
}

export function resolveImporterSectionEditRoutePath(
  projectId: string,
  bridgeId: string,
  sectionId: string,
): string {
  return `${IMPORTER_ROUTE_PATH}/${projectId}/section-edit/${bridgeId}/${sectionId}`;
}

export function resolveImporterValidationRoutePath(
  projectId: string,
  bridgeId: string,
): string {
  return `${IMPORTER_ROUTE_PATH}/${projectId}/validation/${bridgeId}`;
}

export function resolveImporterExportRoutePath(
  projectId: string,
  bridgeId: string,
): string {
  return `${IMPORTER_ROUTE_PATH}/${projectId}/export/${bridgeId}`;
}

export function matchImporterRoute(pathname: string): ImporterRouteMatch {
  if (pathname === IMPORTER_STARTUP_ROUTE_PATH) {
    return { kind: "startup" };
  }

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

  const sectionListMatch = pathname.match(
    /^\/pro\/importer\/([^/]+)\/sections\/([^/]+)\/?$/,
  );
  if (sectionListMatch) {
    return {
      kind: "sectionList",
      projectId: sectionListMatch[1]!,
      bridgeId: sectionListMatch[2]!,
    };
  }

  const sectionEditMatch = pathname.match(
    /^\/pro\/importer\/([^/]+)\/section-edit\/([^/]+)\/([^/]+)\/?$/,
  );
  if (sectionEditMatch) {
    return {
      kind: "sectionEdit",
      projectId: sectionEditMatch[1]!,
      bridgeId: sectionEditMatch[2]!,
      sectionId: sectionEditMatch[3]!,
    };
  }

  const validationMatch = pathname.match(
    /^\/pro\/importer\/([^/]+)\/validation\/([^/]+)\/?$/,
  );
  if (validationMatch) {
    return {
      kind: "validation",
      projectId: validationMatch[1]!,
      bridgeId: validationMatch[2]!,
    };
  }

  const exportMatch = pathname.match(
    /^\/pro\/importer\/([^/]+)\/export\/([^/]+)\/?$/,
  );
  if (exportMatch) {
    return {
      kind: "export",
      projectId: exportMatch[1]!,
      bridgeId: exportMatch[2]!,
    };
  }

  return { kind: "list" };
}
