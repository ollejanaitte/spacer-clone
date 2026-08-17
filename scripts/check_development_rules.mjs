/**
 * F-6: Development Rules mechanical check.
 *
 * 「人が覚えて守るルール」を機械検知するための policy script。
 * CI / npm scripts から実行する。
 *
 * 対象:
 *   1. 禁止テストパターン: test.skip / test.fixme / describe.skip
 *      (fail-closed。追加は原則禁止。)
 *   2. waitForTimeout 乱用: 既存正当利用は allowlist (理由を明示)。
 *      新規追加は警告 (exit 1)。3D/animation settle 用途は許容。
 *
 * 使い方:
 *   node scripts/check_development_rules.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const SRC = "frontend/src";
const E2E = "frontend/tests/e2e";

// 既存の正当な waitForTimeout 利用 (3D/animation settle 等)。
// 追加する場合は reason を明記すること。新しい用途は waitForTimeout ではなく
// expect(...).toBeVisible / web-first assertions を使う。
const WAIT_FOR_TIMEOUT_ALLOWLIST = new Map([
  ["tests/e2e/adapter-failure-path.spec.ts", "3D view settle after model change"],
  ["tests/e2e/adapter-normal-path.spec.ts", "3D view settle after recompute"],
  ["tests/e2e/camera-presets.spec.ts", "camera transition settle"],
  ["tests/e2e/p4-d02-ldist.spec.ts", "recalc UI settle"],
  ["tests/e2e/phase4-user-acceptance.spec.ts", "drawing render settle"],
  ["tests/e2e/substructure-integration.spec.ts", "3D rebuild settle"],
  ["tests/e2e/substructure-m3-integration.spec.ts", "3D rebuild settle"],
  ["tests/e2e/substructure-superstructure-integration.spec.ts", "3D render settle"],
  ["tests/e2e/th-analysis-revamp.spec.ts", "3D animation frame settle"],
]);

const SKIP_FIXME_PATTERNS = [
  { re: /\btest\.skip\s*\(/, message: "test.skip" },
  { re: /\bdescribe\.skip\s*\(/, message: "describe.skip" },
  { re: /\btest\.fixme\s*\(/, message: "test.fixme" },
  { re: /\bdescribe\.fixme\s*\(/, message: "describe.fixme" },
];

async function walk(dir) {
  const out = [];
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

async function scanPatterns(files, patterns) {
  const violations = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const p of patterns) {
        if (p.re.test(line)) {
          violations.push(`${file}:${index + 1}: ${p.message}`);
        }
      }
    });
  }
  return violations;
}

const results = { fatal: [], warnings: [] };

// 1. skip / fixme (fatal)
const srcFiles = await walk(SRC);
const e2eFiles = await walk(E2E);
const skipFixme = await scanPatterns([...srcFiles, ...e2eFiles], SKIP_FIXME_PATTERNS);
results.fatal.push(...skipFixme);

// 2. waitForTimeout (allowlist)
const wft = await scanPatterns(e2eFiles, [{ re: /\bwaitForTimeout\s*\(/, message: "waitForTimeout" }]);
for (const hit of wft) {
  const rel = relative("frontend", hit.split(":")[0]);
  if (!WAIT_FOR_TIMEOUT_ALLOWLIST.has(rel)) {
    results.warnings.push(`${hit} — 未allowlistのwaitForTimeout。3D/animation settle以外は使わない`);
  }
}

// 3. E2E fixture ルール: UI 初期状態に依存する spec を検出 (fixture helper 未使用の create 経由)
//    `page.goto("/pro")` 直後に開く旧 spec は allowed (基本起動検査)。ここでは
//    fixture helper 未使用の /app/business 新規作成は警告とする。
const businessCreatePattern = /goto\("\/app\/business\/new"\)/;
for (const file of e2eFiles) {
  const content = await readFile(file, "utf8");
  const rel = relative("frontend", file);
  if (businessCreatePattern.test(content) && !content.includes("createProjectViaUi")) {
    results.warnings.push(`${rel}: /app/business/new を直接goto。createProjectViaUi (fixture helper) を使うこと`);
  }
}

// ---- report ----
if (results.fatal.length > 0) {
  console.error("F-6 policy violations (FATAL):");
  console.error(results.fatal.join("\n"));
  process.exitCode = 1;
}
if (results.warnings.length > 0) {
  console.warn("F-6 policy warnings:");
  console.warn(results.warnings.join("\n"));
}
if (results.fatal.length === 0) {
  console.info(`F-6 development rules check passed. (fatal=0 warnings=${results.warnings.length})`);
}
