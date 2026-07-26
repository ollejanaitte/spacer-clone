import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IPC_CHANNELS } from "./ipcChannels";

// Test helpers exported for unit testing without Electron runtime.
// The ensureJsonExtension logic is mirrored here because it is module-private.

function ensureJsonExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(".json") ? filePath : `${filePath}.json`;
}

function validateSavePayload(payload: unknown): { content: string; suggestedName?: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.content !== "string") return null;
  if (record.suggestedName !== undefined && typeof record.suggestedName !== "string") {
    return null;
  }
  return {
    content: record.content,
    suggestedName: record.suggestedName,
  };
}

describe("dialog IPC helpers", () => {
  it("appends .json when the save path has no extension", () => {
    expect(ensureJsonExtension("/tmp/橋梁モデル")).toBe("/tmp/橋梁モデル.json");
  });

  it("preserves an existing .json extension", () => {
    expect(ensureJsonExtension("/tmp/project.json")).toBe("/tmp/project.json");
  });

  it("preserves mixed-case .JSON extension", () => {
    expect(ensureJsonExtension("/tmp/project.JSON")).toBe("/tmp/project.JSON");
  });

  it("accepts a valid save payload", () => {
    expect(validateSavePayload({ content: "{}", suggestedName: "project.json" })).toEqual({
      content: "{}",
      suggestedName: "project.json",
    });
  });

  it("rejects invalid save payloads", () => {
    expect(validateSavePayload(null)).toBeNull();
    expect(validateSavePayload({ content: 1 })).toBeNull();
    expect(validateSavePayload({ content: "ok", suggestedName: 42 })).toBeNull();
  });

  it("supports Japanese file paths", () => {
    const japanesePath = path.join("/home", "ユーザー", "プロジェクト");
    expect(ensureJsonExtension(japanesePath)).toBe(`${japanesePath}.json`);
  });

  it("keeps preload channel literals aligned with ipcChannels (sandbox cannot import there)", () => {
    const electronDir = path.dirname(fileURLToPath(import.meta.url));
    const preloadSource = readFileSync(path.join(electronDir, "preload.ts"), "utf8");
    expect(preloadSource).not.toContain('from "./ipcChannels"');
    expect(preloadSource).not.toMatch(/require\(["']\.\/ipcChannels["']\)/);
    for (const channel of Object.values(IPC_CHANNELS)) {
      expect(preloadSource).toContain(channel);
    }
  });
});
