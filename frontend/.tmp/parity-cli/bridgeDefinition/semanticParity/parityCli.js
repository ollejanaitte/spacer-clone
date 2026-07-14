"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runParityCli = runParityCli;
exports.buildParityCliHelpText = helpText;
exports.parseParityCliArgs = parseParityCliArgs;
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_path_2 = require("node:path");
const compare_1 = require("./compare");
const serializer_1 = require("./serializer");
let cachedProjectValidator;
let cachedCliVersion;
function getProjectValidator() {
    if (!cachedProjectValidator) {
        const ajv = new _2020_js_1.default({ allErrors: true, strict: false });
        ajv.addFormat("date-time", true);
        const projectSchemaPath = (0, node_path_2.resolve)(process.cwd(), "../schemas/project.schema.json");
        const projectSchema = JSON.parse((0, node_fs_1.readFileSync)(projectSchemaPath, "utf8"));
        cachedProjectValidator = ajv.compile(projectSchema);
    }
    return cachedProjectValidator;
}
function getCliVersion() {
    if (cachedCliVersion !== undefined) {
        return cachedCliVersion;
    }
    try {
        const packageJsonPath = (0, node_path_2.resolve)(process.cwd(), "package.json");
        const packageJson = JSON.parse((0, node_fs_1.readFileSync)(packageJsonPath, "utf8"));
        cachedCliVersion = typeof packageJson.version === "string" ? packageJson.version : undefined;
    }
    catch {
        cachedCliVersion = undefined;
    }
    return cachedCliVersion;
}
function writeLine(stream, text) {
    if (!stream) {
        return;
    }
    stream.write(text);
}
function helpText() {
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
function usageError(message) {
    return { kind: "usage-error", code: 64, message };
}
function parseParityCliArgs(argv) {
    const args = {
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
                    if (args.left !== undefined)
                        return usageError("Duplicate --left option.");
                    args.left = value;
                }
                else if (token === "--right") {
                    if (args.right !== undefined)
                        return usageError("Duplicate --right option.");
                    args.right = value;
                }
                else if (token === "--output") {
                    if (args.output !== undefined)
                        return usageError("Duplicate --output option.");
                    args.output = value;
                }
                else if (token === "--label-left") {
                    if (args.labelLeft !== undefined)
                        return usageError("Duplicate --label-left option.");
                    args.labelLeft = value;
                }
                else {
                    if (args.labelRight !== undefined)
                        return usageError("Duplicate --label-right option.");
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
async function readProjectModel(path, side, readFileImpl) {
    let text;
    try {
        text = await readFileImpl(path, "utf8");
    }
    catch (error) {
        return { ok: false, message: `${side} input file could not be read: ${path}` };
    }
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
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
    const project = raw;
    const nodeIds = new Set(project.nodes.map((node) => node.id));
    const memberIds = new Set(project.members.map((member) => member.id));
    const loadCaseIds = new Set(project.loadCases.map((loadCase) => loadCase.id));
    const materialIds = new Set(project.materials.map((material) => material.id));
    const sectionIds = new Set(project.sections.map((section) => section.id));
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
function mapStatusToCode(status) {
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
function buildSource(label) {
    return {
        source: "imported",
        label,
        generatorRoute: "parity-cli/local-json",
    };
}
async function runParityCli(argv = process.argv.slice(2), deps = {}) {
    const parsed = parseParityCliArgs(argv);
    const stdout = deps.stdout ?? process.stdout;
    const stderr = deps.stderr ?? process.stderr;
    const readFileImpl = deps.readFile ?? promises_1.readFile;
    const writeFileImpl = deps.writeFile ?? promises_1.writeFile;
    const mkdirImpl = deps.mkdir ?? promises_1.mkdir;
    const compareFn = deps.compareSemanticParity ?? compare_1.compareSemanticParity;
    const createEnvelopeFn = deps.createParityReportEnvelope ?? serializer_1.createParityReportEnvelope;
    const serializeEnvelopeFn = deps.serializeParityReportEnvelope ?? serializer_1.serializeParityReportEnvelope;
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
        });
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
            await mkdirImpl((0, node_path_1.dirname)(args.output), { recursive: true });
            await writeFileImpl(args.output, serialized, "utf8");
            writeLine(stdout, `Saved parity report to ${args.output}\n`);
        }
        else {
            writeLine(stdout, `${serialized}\n`);
        }
        return mapStatusToCode(report.status);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeLine(stderr, `${message}\n`);
        return 4;
    }
}
