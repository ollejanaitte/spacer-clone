import type { SpacerProjPackage } from "./projectPackage";

const UNSAFE_PATTERNS = [
  /(^|[\\/])\.\.([\\/]|$)/,
  /^[A-Za-z]:/,
  /^[\\/]/,
  /:[\\/]/,
];

export function isUnsafeRelativePath(relativePath: string): boolean {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    return true;
  }
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(relativePath)) {
      return true;
    }
  }
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.startsWith("../") || normalized.includes("/../")) {
    return true;
  }
  if (normalized.includes("\0")) {
    return true;
  }
  return false;
}

export function hasUnsafePathInPackage(pkg: SpacerProjPackage): boolean {
  for (const entry of pkg.manifest.files ?? []) {
    if (isUnsafeRelativePath(entry.path)) {
      return true;
    }
  }
  for (const file of pkg.files ?? []) {
    if (isUnsafeRelativePath(file.path)) {
      return true;
    }
  }
  return false;
}
