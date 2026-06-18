import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Source directory argument is required.");

const forbidden = [
  { pattern: /\bconsole\.log\s*\(/, message: "console.log is not allowed" },
  { pattern: /\bTODO\b/, message: "TODO markers are not allowed" },
];

const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (![".ts", ".tsx"].includes(extname(entry.name))) continue;
    const lines = (await readFile(path, "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of forbidden) {
        if (rule.pattern.test(line)) violations.push(`${path}:${index + 1}: ${rule.message}`);
      }
    });
  }
}

await visit(root);
if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.info("Frontend source hygiene check passed.");
}
