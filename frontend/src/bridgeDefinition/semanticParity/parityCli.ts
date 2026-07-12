import Ajv2020 from "ajv/dist/2020.js";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolve } from "node:path";
import type { ProjectModel } from "../../types";
import { compareSemanticParity } from "./compare";
import { createParityReportEnvelope, serializeParityReportEnvelope } from "./serializer";
import type { CompareSemanticParityOptions, ParityReport, ParityReportEnvelope, ParityReportSource } from "./types";

type CliWriteStream = {
  write(text: string): void;
};

type ParityCliDependencies = {
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  mkdir?: typeof mkdir;
  stdout?: CliWriteStream;
  stderr?: CliWriteStream;
  compareSemanticParity?: typeof compareSemanticParity;
  createParityReportEnvelope?: typeof createParityReportEnvelope;
  serializeParityReportEnvelope?: typeof serializeParityReportEnvelope;
  getVersion?: () => string | undefined;
};

type ParsedParityCliArgs = {
  left?: string;
  right?: string;
  output?: string;
  pretty: boolean;
  labelLeft?: string;
  labelRight?: string;
  help: boolean;
  version: boolean;
};

type CliResult = { kind: "usage-error"; code: 64; message: string };

type ValidationOutcome =
  | { ok: true; project: ProjectModel }
  | { ok: false; message: string };

let cachedProjectValidator: ReturnType<Ajv2020["compile"]> | undefined;
let cachedCliVersion: string | undefined;

function getProjectValidator(): ReturnType<Ajv2020["compile"]> {
  if (!cachedProjectValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    ajv.addFormat("date-time", true);
    const projectSchemaPath = resolve(process.cwd(), "../schemas/project.schema.json");
    const projectSchema = JSON.parse(readFileSync(projectSchemaPath, "utf8"));
    cachedProjectValidator = ajv.compile(projectSchema);
  }
  return cachedProjectValidator;
}

function getCliVersion(): string | undefined {
  if (cachedCliVersion !== undefined) {
    return cachedCliVersion;
  }
  try {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
    cachedCliVersion = typeof packageJson.version === "string" ? packageJson.version : undefined;
  } catch {
    cachedCliVersion = undefined;
  }
  return cachedCliVersion;
}

function writeLine(stream: CliWriteStream | undefined, text: string): void {
  if (!stream) {
    return;
  }
  stream.write(text);
}

function helpText(): string {
  return [
    "Usage: npm run parity:cli -- --left <path> --right <path> [--output <path>] [--pretty] [--label-left <text>] [--label-right <text>]",
    "",
    "Options:",
    "  --left <path>        Local UTF-8 ProjectModel JSON for the left side",
    "  --right <path>       Local UTF-8 ProjectModel JSON for the right side",
    "  --output <path>      Write the parity report JSON to a file",
    "  --pretty             Pretty-print JSON output",
    "  --label-left <text>  Optional label for the left source",
    "  --label-right <text> Optional label for the right source",
    "  --help               Show this help text",
    "  --version            Print the CLI version",
    "",
    "Exit codes:",
    "  0 equivalent",
    "  1 different",
    "  2 indeterminate",
    "  3 invalid input/model/report",
    "  4 unexpected internal tool error",
    "  64 usage error",
  ].join("\n");
}

function usageError(message: string): CliResult {
  return { kind: "usage-error", code: 64, message };
}

function parseParityCliArgs(argv: string[]): CliResult | { kind: "parsed"; args: ParsedParityCliArgs } {
  const args: ParsedParityCliArgs = {
    pretty: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case "--help":
        args.help = true;
        continue;
      case "--version":
        args.version = true;
        continue;
      case "--pretty":
        args.pretty = true;
        continue;
      case "--left":
      case "--right":
      case "--output":
      case "--label-left":
      case "--label-right": {
        const value = argv[index + 1];
        if (!value || value.startsWith("--")) {
          return usageError(`Missing value for ${token}.`);
        }
        if (token === "--left") {
          if (args.left !== undefined) return usageError("Duplicate --left option.");
          args.left = value;
        } else if (token === "--right") {
          if (args.right !== undefined) return usageError("Duplicate --right option.");
          args.right = value;
        } else if (token === "--output") {
          if (args.output !== undefined) return usageError("Duplicate --output option.");
          args.output = value;
        } else if (token === "--label-left") {
          if (args.labelLeft !== undefined) return usageError("Duplicate --label-left option.");
          args.labelLeft = value;
        } else {
          if (args.labelRight !== undefined) return usageError("Duplicate --label-right option.");
          args.labelRight = value;
        }
        index += 1;
        continue;
      }
      default:
        return usageError(`Unknown option: ${token}`);
    }
  }

  return { kind: "parsed", args };
}

async function readProjectModel(path: string, side: "left" | "right", readFileImpl: typeof readFile): Promise<ValidationOutcome> {
  let text: string;
  try {
    text = await readFileImpl(path, "utf8");
  } catch (error) {
    return { ok: false, message: `${side} input file could not be read: ${path}` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, message: `${side} input file is not valid JSON: ${path}` };
  }

  const validator = getProjectValidator();
  const valid = validator(raw);
  if (!valid) {
    const details = (validator.errors ?? []).map((error) => {
      const location = error.instancePath.length > 0 ? error.instancePath : "/";
      return `${location} ${error.message ?? "is invalid"}`;
    });
    return { ok: false, message: `${side} input does not match ProjectModel schema: ${details.join("; ") || "unknown schema error"}` };
  }

  const project = raw as ProjectModel;
  const nodeIds = new Set<string>(project.nodes.map((node: ProjectModel["nodes"][number]) => node.id));
  const memberIds = new Set<string>(project.members.map((member: ProjectModel["members"][number]) => member.id));
  const loadCaseIds = new Set<string>(project.loadCases.map((loadCase: ProjectModel["loadCases"][number]) => loadCase.id));
  const materialIds = new Set<string>(project.materials.map((material: ProjectModel["materials"][number]) => material.id));
  const sectionIds = new Set<string>(project.sections.map((section: ProjectModel["sections"][number]) => section.id));

  for (const member of project.members) {
    if (!nodeIds.has(member.nodeI) || !nodeIds.has(member.nodeJ)) {
      return { ok: false, message: `${side} input has a member that references a missing node.` };
    }
    if (!materialIds.has(member.materialId) || !sectionIds.has(member.sectionId)) {
      return { ok: false, message: `${side} input has a member that references a missing material or section.` };
    }
  }

  for (const support of project.supports) {
    if (!nodeIds.has(support.nodeId)) {
      return { ok: false, message: `${side} input has a support that references a missing node.` };
    }
  }

  for (const load of project.nodalLoads) {
    if (!nodeIds.has(load.nodeId) || !loadCaseIds.has(load.loadCaseId)) {
      return { ok: false, message: `${side} input has a nodal load that references a missing node or load case.` };
    }
  }

  for (const load of project.memberLoads) {
    if (!memberIds.has(load.memberId) || !loadCaseIds.has(load.loadCaseId)) {
      return { ok: false, message: `${side} input has a member load that references a missing member or load case.` };
    }
  }

  return { ok: true, project };
}

function mapStatusToCode(status: ParityReport["status"]): 0 | 1 | 2 | 3 {
  switch (status) {
    case "equivalent":
      return 0;
    case "different":
      return 1;
    case "indeterminate":
      return 2;
    case "invalid":
      return 3;
  }
}

function buildSource(label: string | undefined): ParityReportSource {
  return {
    source: "imported",
    label,
    generatorRoute: "parity-cli/local-json",
  };
}

export async function runParityCli(
  argv: string[] = process.argv.slice(2),
  deps: ParityCliDependencies = {},
): Promise<number> {
  const parsed = parseParityCliArgs(argv);
  const stdout = deps.stdout ?? process.stdout;
  const stderr = deps.stderr ?? process.stderr;
  const readFileImpl = deps.readFile ?? readFile;
  const writeFileImpl = deps.writeFile ?? writeFile;
  const mkdirImpl = deps.mkdir ?? mkdir;
  const compareFn = deps.compareSemanticParity ?? compareSemanticParity;
  const createEnvelopeFn = deps.createParityReportEnvelope ?? createParityReportEnvelope;
  const serializeEnvelopeFn = deps.serializeParityReportEnvelope ?? serializeParityReportEnvelope;
  const getVersion = deps.getVersion ?? getCliVersion;
  const toolVersion = getVersion();

  if (parsed.kind === "usage-error") {
    writeLine(stderr, `${parsed.message}\n`);
    return parsed.code;
  }

  const { args } = parsed;
  if (args.help) {
    writeLine(stdout, `${helpText()}\n`);
    return 0;
  }
  if (args.version) {
    if (typeof toolVersion === "string" && toolVersion.length > 0) {
      writeLine(stdout, `${toolVersion}\n`);
      return 0;
    }
    writeLine(stderr, "Version source is unavailable.\n");
    return 64;
  }
  if (!args.left) {
    writeLine(stderr, "Missing --left.\n");
    return 64;
  }
  if (!args.right) {
    writeLine(stderr, "Missing --right.\n");
    return 64;
  }

  try {
    const [leftOutcome, rightOutcome] = await Promise.all([
      readProjectModel(args.left, "left", readFileImpl),
      readProjectModel(args.right, "right", readFileImpl),
    ]);

    if (!leftOutcome.ok) {
      writeLine(stderr, `${leftOutcome.message}\n`);
      return 3;
    }
    if (!rightOutcome.ok) {
      writeLine(stderr, `${rightOutcome.message}\n`);
      return 3;
    }

    const report = compareFn(leftOutcome.project, rightOutcome.project, {
      leftSource: "imported",
      rightSource: "imported",
      leftLabel: args.labelLeft,
      rightLabel: args.labelRight,
    } satisfies CompareSemanticParityOptions);

    if (report.status === "invalid") {
      writeLine(stderr, "Parity report is invalid.\n");
      return 3;
    }

    const envelope = createEnvelopeFn(report, {
      sources: {
        left: buildSource(args.labelLeft ?? "left"),
        right: buildSource(args.labelRight ?? "right"),
      },
      schemaVersion: "1.0.0",
      toolVersion,
    });
    const serialized = serializeEnvelopeFn(envelope, {
      pretty: args.pretty,
    });

    if (args.output) {
      await mkdirImpl(dirname(args.output), { recursive: true });
      await writeFileImpl(args.output, serialized, "utf8");
      writeLine(stdout, `Saved parity report to ${args.output}\n`);
    } else {
      writeLine(stdout, `${serialized}\n`);
    }

    return mapStatusToCode(report.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeLine(stderr, `${message}\n`);
    return 4;
  }
}

export {
  helpText as buildParityCliHelpText,
  parseParityCliArgs,
  type ParityCliDependencies,
  type ParsedParityCliArgs,
};
