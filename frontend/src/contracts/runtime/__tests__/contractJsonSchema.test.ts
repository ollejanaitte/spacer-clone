import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CONTRACT_JSON_SCHEMA_DEFINITIONS,
  CONTRACT_JSON_SCHEMA_SEMANTIC_METADATA,
  contractJsonSchemaPath,
  generateAllContractJsonSchemas,
  jsonSchemaSemanticallyEqual,
} from "../index";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const GENERATE = process.env.CONTRACTS_GENERATE_SCHEMAS === "1";

function checkedInSchemaPath(slug: string): string {
  return join(REPO_ROOT, contractJsonSchemaPath(slug));
}

function readCheckedInSchema(slug: string): unknown {
  const raw = readFileSync(checkedInSchemaPath(slug), "utf8");
  return JSON.parse(raw) as unknown;
}

if (GENERATE) {
  describe("contract JSON schema generation (write mode)", () => {
    it("writes schemas/contracts/v0.1 artifacts at repo root", () => {
      for (const generated of generateAllContractJsonSchemas()) {
        const targetPath = checkedInSchemaPath(generated.slug);
        expect(targetPath.startsWith(join(REPO_ROOT, "schemas/contracts/v0.1"))).toBe(true);
        expect(targetPath.includes("frontend/schemas")).toBe(false);
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, `${JSON.stringify(generated.document, null, 2)}\n`, "utf8");
      }
      expect(CONTRACT_JSON_SCHEMA_DEFINITIONS.length).toBeGreaterThan(0);
    });
  });
} else {
  describe("contract JSON schema drift", () => {
    it("resolves checked-in schema paths at repo root schemas/contracts/v0.1", () => {
      expect(contractJsonSchemaPath("uuid")).toBe("schemas/contracts/v0.1/uuid.schema.json");
      expect(checkedInSchemaPath("uuid")).toBe(
        join(REPO_ROOT, "schemas/contracts/v0.1/uuid.schema.json"),
      );
      expect(contractJsonSchemaPath("uuid").startsWith("frontend/")).toBe(false);
    });

    it("does not place schemas under frontend/schemas", () => {
      expect(existsSync(join(REPO_ROOT, "frontend/schemas"))).toBe(false);
      for (const definition of CONTRACT_JSON_SCHEMA_DEFINITIONS) {
        expect(contractJsonSchemaPath(definition.slug).includes("frontend/schemas")).toBe(false);
      }
    });

    it("matches checked-in schemas independent of key order", () => {
      for (const generated of generateAllContractJsonSchemas()) {
        const checkedIn = readCheckedInSchema(generated.slug);
        expect(
          jsonSchemaSemanticallyEqual(generated.document, checkedIn),
          `semantic drift detected for ${generated.slug}`,
        ).toBe(true);
      }
    });

    it("stabilizes $id, title, contractVersion, and semantic metadata", () => {
      for (const generated of generateAllContractJsonSchemas()) {
        expect(generated.document.$id).toBe(generated.schemaId);
        expect(typeof generated.document.title).toBe("string");
        expect(generated.document.contractVersion).toBe("0.1.0");

        const semanticMetadata = generated.document["x-semantic-validation"];
        expect(semanticMetadata).toEqual(CONTRACT_JSON_SCHEMA_SEMANTIC_METADATA[generated.slug]);
        expect(semanticMetadata).toMatchObject({
          completeValidator: false,
        });
        expect(typeof generated.document.$comment).toBe("string");
        expect(generated.document.$comment).toContain("complete validator");
      }
    });

    it("does not mutate the working tree during drift checks", () => {
      const before = generateAllContractJsonSchemas().map((generated) =>
        JSON.stringify(readCheckedInSchema(generated.slug)),
      );
      for (const generated of generateAllContractJsonSchemas()) {
        expect(
          jsonSchemaSemanticallyEqual(generated.document, readCheckedInSchema(generated.slug)),
        ).toBe(true);
      }
      const after = generateAllContractJsonSchemas().map((generated) =>
        JSON.stringify(readCheckedInSchema(generated.slug)),
      );
      expect(after).toEqual(before);
    });
  });
}
