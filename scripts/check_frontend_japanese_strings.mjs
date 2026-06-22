// Lightweight lint for the language policy.
//
// Walks a source directory and flags files that contain CJK characters outside
// the allowed locations. Allowed files are:
//   - frontend/src/i18n/ja.ts
//   - frontend/src/i18n/locales/ja.json
//   - frontend/src/i18n/locales/en.json
//   - frontend/src/lobby/data/lobbyStrings.ts (documented exception)
//
// Test files and the h24 parser are allowed to mention Japanese for
// fixtures/specs. The script still flags test files; this list is a hint for
// the reviewer, not an automatic pass.
//
// Run with: node scripts/check_frontend_japanese_strings.mjs <directory>
// Example: node scripts/check_frontend_japanese_strings.mjs frontend/src

import { readdir, readFile } from "node:fs/promises";
import { extname, join, sep, normalize } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Source directory argument is required.");

const JP = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/;

const ALLOWED_FILES = new Set([
  normalize(join("frontend/src/i18n/ja.ts")),
  normalize(join("frontend/src/i18n/locales/ja.json")),
  normalize(join("frontend/src/i18n/locales/en.json")),
  normalize(join("frontend/src/lobby/data/lobbyStrings.ts")),
].map((p) => (process.platform === "win32" ? p.split("/").join(sep) : p)));

// Test files and the h24 parser are allowed to mention Japanese for
// fixtures and assertions. The script still flags them; this list is a hint
// for the reviewer, not an automatic pass.
const REVIEW_OK = [
  /__tests__.*\.test\.(ts|tsx)/,
  /\.test\.(ts|tsx)/,
  /h24GroundMotionImport/,
];

const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", "coverage", "__pycache__"].includes(entry.name)) {
        continue;
      }
      await visit(path);
      continue;
    }
    if (![".ts", ".tsx", ".py", ".json"].includes(extname(entry.name))) continue;
    const rel = process.platform === "win32" ? path.split(sep).join("/") : path;
    if (ALLOWED_FILES.has(path)) continue;
    const lines = (await readFile(path, "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      const m = line.match(JP);
      if (m) {
        violations.push({
          path: rel,
          line: index + 1,
          column: m.index + 1,
          char: m[0],
          content: line.trim().slice(0, 160),
          testLike: REVIEW_OK.some((rx) => rx.test(rel)),
        });
      }
    });
  }
}

await visit(root);
if (violations.length === 0) {
  console.info("No hard-coded Japanese characters found outside allowed files.");
  process.exit(0);
}

for (const v of violations) {
  const tag = v.testLike ? "[review]" : "[fix]";
  const code = v.char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
  console.info(tag + " " + v.path + ":" + v.line + ":" + v.column + "  U+" + code + "  " + v.content);
}
console.info("Total: " + violations.length + " occurrence(s) across " + new Set(violations.map((v) => v.path)).size + " file(s).");
