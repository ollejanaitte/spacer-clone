import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectModel } from "../../types";
import { compareSemanticParity } from "../semanticParity/compare";
import { runParityCli } from "../semanticParity/parityCli";
import packageJson from "../../../package.json";

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "../../..");
const repoRoot = resolve(frontendRoot, "..");
const exampleProjectPath = resolve(repoRoot, "examples/project.json");

const tempDirs: string[] = [];
let buildOutputDir: string | undefined;
let builtCli: string | undefined;

beforeAll(() => {
  buildOutputDir = mkdtempSync(join(tmpdir(), "spacer-parity-cli-build-"));
  execFileSync(
    "npx",
    [
      "tsc",
      "-p",
      "tsconfig.parity-cli.json",
      "--outDir",
      buildOutputDir,
      "--tsBuildInfoFile",
      join(buildOutputDir, "tsconfig.parity-cli.tsbuildinfo"),
    ],
    { cwd: frontendRoot, stdio: "inherit" },
  );
  builtCli = resolve(buildOutputDir, "bridgeDefinition/semanticParity/parityCli.entry.js");
  if (!existsSync(builtCli)) {
    throw new Error(`Built parity CLI entrypoint was not found: ${builtCli}`);
  }
});

afterAll(() => {
  if (buildOutputDir) {
    rmSync(buildOutputDir, { recursive: true, force: true });
    buildOutputDir = undefined;
    builtCli = undefined;
  }
});

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "spacer-parity-cli-"));
  tempDirs.push(dir);
  return dir;
}

function writeProject(dir: string, name: string, project: ProjectModel): string {
  const file = join(dir, `${name}.json`);
  writeFileSync(file, `${JSON.stringify(project, null, 2)}\n`, "utf8");
  return file;
}

function loadExampleProject(): ProjectModel {
  return JSON.parse(readFileSync(exampleProjectPath, "utf8")) as ProjectModel;
}

function runBuiltCli(args: string[]) {
  if (!builtCli) {
    throw new Error("Built parity CLI entrypoint is not available.");
  }
  return spawnSync("node", [builtCli, ...args], {
    cwd: frontendRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_PATH: resolve(frontendRoot, "node_modules"),
    },
  });
}

function mutateDifferent(project: ProjectModel): ProjectModel {
  return {
    ...project,
    nodes: project.nodes.map((node, index) =>
      index === 0 ? { ...node, x: node.x + 1 } : node,
    ),
  };
}

function mutateIndeterminate(project: ProjectModel): ProjectModel {
  const duplicatedLoadCase = project.loadCases[0];
  if (!duplicatedLoadCase) {
    throw new Error("Expected at least one load case.");
  }

  return {
    ...project,
    loadCases: [
      ...project.loadCases,
      {
        ...duplicatedLoadCase,
        id: `${duplicatedLoadCase.id}-duplicate`,
      },
    ],
  };
}

describe("parity CLI", () => {
  it("--help exits 0 and prints usage", () => {
    const result = runBuiltCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: npm run parity:cli");
  });

  it("--version exits 0 and prints the package version", () => {
    const result = runBuiltCli(["--version"]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.trim()).toBe(packageJson.version);
  });

  it("rejects missing required args with exit 64", () => {
    const leftOnly = runBuiltCli(["--left", "/tmp/left.json"]);
    expect(leftOnly.status).toBe(64);
    expect(leftOnly.stderr).toContain("Missing --right");

    const rightOnly = runBuiltCli(["--right", "/tmp/right.json"]);
    expect(rightOnly.status).toBe(64);
    expect(rightOnly.stderr).toContain("Missing --left");
  });

  it("rejects unknown options with exit 64", () => {
    const result = runBuiltCli(["--wat"]);
    expect(result.status).toBe(64);
    expect(result.stderr).toContain("Unknown option");
  });

  it("returns 3 for missing file, malformed JSON, and invalid ProjectModel", () => {
    const dir = createTempDir();
    const valid = loadExampleProject();
    const validPath = writeProject(dir, "valid", valid);
    const malformedPath = join(dir, "malformed.json");
    writeFileSync(malformedPath, "{not-json", "utf8");
    const invalidPath = writeProject(dir, "invalid", {
      ...valid,
      nodes: [],
    } as ProjectModel);

    expect(runBuiltCli(["--left", validPath, "--right", join(dir, "missing.json")]).status).toBe(3);
    expect(runBuiltCli(["--left", malformedPath, "--right", validPath]).status).toBe(3);
    expect(runBuiltCli(["--left", invalidPath, "--right", validPath]).status).toBe(3);
  });

  it("emits equivalent, different, and indeterminate exit codes", async () => {
    const dir = createTempDir();
    const left = loadExampleProject();
    const rightEquivalent = JSON.parse(JSON.stringify(left)) as ProjectModel;
    const rightDifferent = mutateDifferent(JSON.parse(JSON.stringify(left)) as ProjectModel);
    const rightIndeterminate = mutateIndeterminate(JSON.parse(JSON.stringify(left)) as ProjectModel);

    const leftPath = writeProject(dir, "left", left);
    const eqPath = writeProject(dir, "equivalent", rightEquivalent);
    const diffPath = writeProject(dir, "different", rightDifferent);
    const indPath = writeProject(dir, "indeterminate", rightIndeterminate);

    expect(runBuiltCli(["--left", leftPath, "--right", eqPath]).status).toBe(0);
    expect(runBuiltCli(["--left", leftPath, "--right", diffPath]).status).toBe(1);
    expect(runBuiltCli(["--left", leftPath, "--right", indPath]).status).toBe(2);
  });

  it("supports --pretty, --output, stdout/stderr separation, repeated deterministic output, and non-destructive input", () => {
    const dir = createTempDir();
    const left = loadExampleProject();
    const right = JSON.parse(JSON.stringify(left)) as ProjectModel;
    const leftPath = writeProject(dir, "left", left);
    const rightPath = writeProject(dir, "right", right);
    const outputPath = join(dir, "report.json");
    const before = readFileSync(leftPath, "utf8");

    const first = runBuiltCli(["--left", leftPath, "--right", rightPath, "--output", outputPath, "--pretty"]);
    const second = runBuiltCli(["--left", leftPath, "--right", rightPath, "--output", outputPath, "--pretty"]);

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(first.stderr).toBe("");
    expect(second.stderr).toBe("");
    expect(first.stdout).toContain("Saved parity report to");
    expect(second.stdout).toContain("Saved parity report to");
    expect(readFileSync(leftPath, "utf8")).toBe(before);

    const output = readFileSync(outputPath, "utf8");
    expect(output).toContain("\n  \"schemaVersion\": \"1.0.0\"");
    expect(output).toBe(readFileSync(outputPath, "utf8"));
    expect(first.stdout).toBe(second.stdout);
  });

  it("can be exercised through runParityCli with injected failures", async () => {
    const dir = createTempDir();
    const left = loadExampleProject();
    const right = JSON.parse(JSON.stringify(left)) as ProjectModel;
    const leftPath = writeProject(dir, "left", left);
    const rightPath = writeProject(dir, "right", right);

    const exitCode = await runParityCli(["--left", leftPath, "--right", rightPath], {
      compareSemanticParity: () => {
        throw new Error("boom");
      },
      stdout: { write: vi.fn() },
      stderr: { write: vi.fn() },
    });
    expect(exitCode).toBe(4);
  });

  it("treats an invalid report as exit 3 when compare returns invalid", async () => {
    const dir = createTempDir();
    const left = loadExampleProject();
    const right = JSON.parse(JSON.stringify(left)) as ProjectModel;
    const leftPath = writeProject(dir, "left", left);
    const rightPath = writeProject(dir, "right", right);

    const exitCode = await runParityCli(["--left", leftPath, "--right", rightPath], {
      compareSemanticParity: () => ({
        status: "invalid",
        tolerance: compareSemanticParity(left, right).tolerance,
        counts: compareSemanticParity(left, right).counts,
        unmatchedLeft: [],
        unmatchedRight: [],
        mismatches: [],
        ambiguities: [],
        warnings: [],
        errors: [],
        metrics: compareSemanticParity(left, right).metrics,
        summary: compareSemanticParity(left, right).summary,
      }),
      stdout: { write: vi.fn() },
      stderr: { write: vi.fn() },
    });
    expect(exitCode).toBe(3);
  });
});
