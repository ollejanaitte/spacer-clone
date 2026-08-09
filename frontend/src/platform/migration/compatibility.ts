/**
 * Step 4-6-4 compatibility helpers:
 * - relative ref path normalization (POSIX-style, portable)
 * - Japanese / Unicode path safety
 * - platform detection (Electron native fs vs browser download/in-memory)
 */

export type PlatformKind = "electron-native" | "browser";

export function detectPlatformKind(
  environment: {
    readonly processPlatform?: string;
    readonly navigator?: { readonly userAgent?: string };
    readonly electronVersion?: string;
  } = {
    navigator:
      typeof window !== "undefined" && window.navigator !== undefined
        ? { userAgent: window.navigator.userAgent }
        : undefined,
  },
): PlatformKind {
  const userAgent = environment.navigator?.userAgent ?? "";
  if (
    userAgent.includes("Electron") ||
    environment.electronVersion !== undefined ||
    (typeof process !== "undefined" &&
      (process as { versions?: { electron?: string } }).versions?.electron !== undefined)
  ) {
    return "electron-native";
  }
  return "browser";
}

/**
 * Normalizes a project-relative ref uri to a POSIX-style relative path.
 * Rejects absolute paths, drive letters, and traversal outside the project.
 */
export function normalizeRelativeRefUri(uri: string): string | null {
  if (uri.length === 0) {
    return null;
  }
  const normalized = uri.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return null;
  }
  if (/^[a-zA-Z]:/.test(normalized)) {
    return null;
  }
  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "..")) {
    return null;
  }
  return segments.join("/");
}

export function isJapaneseSafePath(uri: string): boolean {
  const forbidden = /[\x00-\x1f]/;
  return !forbidden.test(uri);
}

export interface CompatibilityProbe {
  readonly platform: PlatformKind;
  readonly normalizedUri: string | null;
  readonly japaneseSafe: boolean;
  readonly reason: string;
}

export function probeRefCompatibility(uri: string, platform: PlatformKind): CompatibilityProbe {
  const normalizedUri = normalizeRelativeRefUri(uri);
  if (normalizedUri === null) {
    return {
      platform,
      normalizedUri: null,
      japaneseSafe: false,
      reason: "Rejected absolute / drive-letter / traversal path.",
    };
  }
  const japaneseSafe = isJapaneseSafePath(normalizedUri);
  return {
    platform,
    normalizedUri,
    japaneseSafe,
    reason: japaneseSafe ? "Compatible relative ref." : "Control characters present in path.",
  };
}

export interface StorageAvailability {
  readonly nativeFolderWrite: boolean;
  readonly nativeFolderRead: boolean;
  readonly downloadFallback: boolean;
  readonly inMemoryFallback: boolean;
}

export function evaluateStorageAvailability(platform: PlatformKind): StorageAvailability {
  if (platform === "electron-native") {
    return {
      nativeFolderWrite: true,
      nativeFolderRead: true,
      downloadFallback: false,
      inMemoryFallback: false,
    };
  }
  return {
    nativeFolderWrite: false,
    nativeFolderRead: false,
    downloadFallback: true,
    inMemoryFallback: true,
  };
}

export function isWindowsLikePath(uri: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(uri) || uri.includes("\\");
}
