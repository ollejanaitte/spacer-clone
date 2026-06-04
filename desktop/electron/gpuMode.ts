export const GPU_MODES = [
  "normal",
  "compat-gpu-blocklist",
  "compat-angle-gl",
  "legacy-desktop-gl",
] as const;

export type GpuMode = (typeof GPU_MODES)[number];

export type GpuSwitch = {
  name: string;
  value?: string;
};

const DEFAULT_GPU_MODE: GpuMode = "normal";

export function resolveGpuMode(input: string | undefined): GpuMode {
  if (input === undefined) {
    return DEFAULT_GPU_MODE;
  }

  return GPU_MODES.includes(input as GpuMode) ? (input as GpuMode) : DEFAULT_GPU_MODE;
}

export function getGpuSwitches(mode: GpuMode): GpuSwitch[] {
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

export function resolveGpuModeFromArgs(argv: string[], envValue: string | undefined): GpuMode {
  return resolveGpuMode(envValue ?? findGpuModeArg(argv));
}

function findGpuModeArg(argv: string[]): string | undefined {
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
