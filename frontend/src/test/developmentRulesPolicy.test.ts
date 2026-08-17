// F-6: Development Rules mechanical enforcement の policy check テスト。
//
// 1. E2E spec に test.skip / test.fixme / describe.skip が無いこと (fail-closed)。
// 2. waitForTimeout 利用は allowlist 済みであること (新規追加は policy 違反)。
// 3. /app/business/new 直接 goto は fixture helper 経由にすること。
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const E2E_DIR = new URL("../../tests/e2e", import.meta.url).pathname;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(path)));
    } else if (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx") {
      out.push(path);
    }
  }
  return out;
}

const ALLOWLISTED_WAIT_FOR_TIMEOUT = new Set([
  "adapter-failure-path.spec.ts",
  "adapter-normal-path.spec.ts",
  "camera-presets.spec.ts",
  "p4-d02-ldist.spec.ts",
  "phase4-user-acceptance.spec.ts",
  "substructure-integration.spec.ts",
  "substructure-m3-integration.spec.ts",
  "substructure-superstructure-integration.spec.ts",
  "th-analysis-revamp.spec.ts",
]);

describe("F-6 development rules policy", () => {
  it("E2E spec に test.skip / describe.skip / test.fixme が無い (fail-closed)", async () => {
    const files = await walk(E2E_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const pattern of [/\btest\.skip\s*\(/, /\bdescribe\.skip\s*\(/, /\btest\.fixme\s*\(/, /\bdescribe\.fixme\s*\(/]) {
        if (pattern.test(content)) {
          violations.push(`${file.split("/").pop()}: ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("waitForTimeout 利用は allowlist 済み (新規追加は policy 違反)", async () => {
    const files = await walk(E2E_DIR);
    const unallowlisted: string[] = [];
    for (const file of files) {
      const name = file.split("/").pop() ?? "";
      const content = await readFile(file, "utf8");
      if (/\bwaitForTimeout\s*\(/.test(content) && !ALLOWLISTED_WAIT_FOR_TIMEOUT.has(name)) {
        unallowlisted.push(name);
      }
    }
    expect(unallowlisted).toEqual([]);
  });

  it("/app/business/new 直接 goto は fixture helper 経由にすること", async () => {
    const files = await walk(E2E_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf8");
      if (content.includes('goto("/app/business/new")') && !content.includes("createProjectViaUi")) {
        violations.push(file.split("/").pop() ?? "");
      }
    }
    expect(violations).toEqual([]);
  });
});
