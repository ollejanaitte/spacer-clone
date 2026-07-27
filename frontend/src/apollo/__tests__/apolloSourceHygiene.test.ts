import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APOLLO_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(APOLLO_DIR, "../../..");
const FRONTEND_DIR = join(REPO_ROOT, "frontend");
const HYGIENE_SCRIPT = join(REPO_ROOT, "scripts/check_apollo_source_hygiene.mjs");

describe("apollo source hygiene script", () => {
  it("passes with default path when invoked from repo root", () => {
    const output = execSync(`node "${HYGIENE_SCRIPT}"`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    expect(output).toContain("Apollo source hygiene check passed");
    expect(output).toContain(defaultApolloRootForAssertion());
  });

  it("passes with default path when invoked from frontend/", () => {
    const output = execSync(`node "${HYGIENE_SCRIPT}"`, {
      cwd: FRONTEND_DIR,
      encoding: "utf8",
    });
    expect(output).toContain("Apollo source hygiene check passed");
    expect(output).toContain(defaultApolloRootForAssertion());
  });
});

function defaultApolloRootForAssertion(): string {
  return join(REPO_ROOT, "frontend/src/apollo");
}
