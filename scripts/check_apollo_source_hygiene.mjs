import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultApolloRoot = join(repoRoot, "frontend/src/apollo");

function resolveApolloRoot(arg) {
  if (!arg) return defaultApolloRoot;
  return isAbsolute(arg) ? arg : resolve(process.cwd(), arg);
}

const apolloRoot = resolveApolloRoot(process.argv[2]);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const FIXTURE_SCAN_DIRS = ["testing", "__tests__"];

/** Positive Analyzer parity claims forbidden in Apollo production sources. */
const PARITY_CLAIM_RULES = [
  {
    pattern: /\banalyzer\s+parity\b/i,
    allow: /\b(no|without|not)\s+analyzer\s+parity\b/i,
    message: "Forbidden Analyzer parity claim",
  },
  {
    pattern: /\bparity\s+with\s+(the\s+)?analyzer\b/i,
    message: "Forbidden Analyzer parity claim",
  },
  {
    pattern: /\bcompatible\s+with\s+(the\s+)?analyzer\b/i,
    message: "Forbidden Analyzer compatibility claim",
  },
  {
    pattern: /\bequivalent\s+to\s+(the\s+)?analyzer\b/i,
    message: "Forbidden Analyzer equivalence claim",
  },
  {
    pattern: /\bround-?trip\b.*\.mdb\b/i,
    message: "Forbidden legacy .mdb round-trip claim",
  },
  {
    pattern: /\.mdb\b.*\bround-?trip\b/i,
    message: "Forbidden legacy .mdb round-trip claim",
  },
  {
    pattern: /\bsuperdesigner\s+wire\s+format\s+parity\b/i,
    message: "Forbidden SuperDesigner wire format parity claim",
  },
];

const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(extname(entry.name))) continue;
    await scanFile(path);
  }
}

async function scanFile(path) {
  const rel = relative(apolloRoot, path);
  const inFixtureTree = FIXTURE_SCAN_DIRS.some(
    (segment) => rel === segment || rel.startsWith(`${segment}/`),
  );
  const content = await readFile(path, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const rule of PARITY_CLAIM_RULES) {
      if (!rule.pattern.test(line)) continue;
      if (rule.allow?.test(line)) continue;
      violations.push(`${path}:${index + 1}: ${rule.message}`);
    }
  });

  if (!inFixtureTree) return;

  const hasAdoptedAuthority =
    /\bNumericAuthority\.ADOPTED\b/.test(content) || /\bauthority:\s*["']ADOPTED["']/.test(content);
  if (!hasAdoptedAuthority) return;

  const hasDecisionId =
    /\bdecisionId:\s*["'][^"']+["']/.test(content) ||
    /\bdecision_id:\s*["'][^"']+["']/.test(content);
  if (!hasDecisionId) {
    violations.push(
      `${path}: ADOPTED numeric fixture without decisionId — use PLACEHOLDER or include governance metadata`,
    );
  }
}

await visit(apolloRoot);

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.info(`Apollo source hygiene check passed (${apolloRoot}).`);
}
