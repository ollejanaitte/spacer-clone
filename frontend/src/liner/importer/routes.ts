export const IMPORTER_ROUTE_PATH = "/pro/importer";

export function resolveImporterRoute(pathname: string): boolean {
  return pathname === IMPORTER_ROUTE_PATH;
}

export function resolveImporterRoutePath(): string {
  return IMPORTER_ROUTE_PATH;
}
