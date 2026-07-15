import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const GENERATE_TEST_FILE = "src/contracts/runtime/__tests__/contractJsonSchema.test.ts";

const result = spawnSync(
  NPM_COMMAND,
  ["exec", "--", "vitest", "run", GENERATE_TEST_FILE],
  {
    cwd: FRONTEND_ROOT,
    env: {
      ...process.env,
      CONTRACTS_GENERATE_SCHEMAS: "1",
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error !== undefined) {
  console.error(`Failed to run schema generation: ${result.error.message}`);
  process.exit(1);
}

if (result.signal !== null) {
  console.error(`Schema generation terminated by signal: ${result.signal}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
