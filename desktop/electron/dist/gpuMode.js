"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPU_MODES = void 0;
exports.resolveGpuMode = resolveGpuMode;
exports.getGpuSwitches = getGpuSwitches;
exports.resolveGpuModeFromArgs = resolveGpuModeFromArgs;
exports.GPU_MODES = [
    "normal",
    "compat-gpu-blocklist",
    "compat-angle-gl",
    "legacy-desktop-gl",
];
const DEFAULT_GPU_MODE = "normal";
function resolveGpuMode(input) {
    if (input === undefined) {
        return DEFAULT_GPU_MODE;
    }
    return exports.GPU_MODES.includes(input) ? input : DEFAULT_GPU_MODE;
}
function getGpuSwitches(mode) {
    switch (mode) {
        case "compat-gpu-blocklist":
            return [{ name: "ignore-gpu-blocklist" }];
        case "compat-angle-gl":
            return [{ name: "ignore-gpu-blocklist" }, { name: "use-angle", value: "gl" }];
        case "legacy-desktop-gl":
            return [{ name: "ignore-gpu-blocklist" }, { name: "use-gl", value: "desktop" }];
        case "normal":
            return [];
    }
}
function resolveGpuModeFromArgs(argv, envValue) {
    return resolveGpuMode(envValue ?? findGpuModeArg(argv));
}
function findGpuModeArg(argv) {
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg.startsWith("--gpu-mode=")) {
            return arg.slice("--gpu-mode=".length);
        }
        if (arg === "--gpu-mode") {
            return argv[index + 1];
        }
    }
    return undefined;
}
