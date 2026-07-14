import { DEFAULT_DXF_PRECISION_POLICY, resolveDxfPrecisionPolicy } from "../model/precision";
import type { DxfDocument } from "../model/types";
import { createDxfDiagnostic } from "../model/diagnostics";
import { validateDxfDocument } from "../validation/validateDxfDocument";
import { DxfWriter } from "./dxfWriter";
import { HandleAllocator } from "./handleAllocator";
import { serializeBlocks } from "./serializeBlocks";
import { serializeEntities } from "./serializeEntities";
import { serializeHeader } from "./serializeHeader";
import { serializeTables } from "./serializeTables";

export type SerializeDxfDocumentResult = {
  dxf: string;
  diagnostics: DxfDocument["diagnostics"];
};

export function serializeDxfDocument(document: DxfDocument): SerializeDxfDocumentResult {
  const validation = validateDxfDocument(document);
  const diagnostics = [...document.diagnostics, ...validation.diagnostics];
  if (validation.hasErrors) {
    return {
      dxf: "",
      diagnostics,
    };
  }

  const normalizedDocument: DxfDocument = {
    ...document,
    tables: validation.normalizedTables,
  };
  const precision = resolveDxfPrecisionPolicy();
  const writer = new DxfWriter();
  const handles = new HandleAllocator();

  writer.section("HEADER", () => serializeHeader(writer, normalizedDocument.header));
  writer.section("TABLES", () => serializeTables(writer, normalizedDocument.tables, handles));
  writer.section("BLOCKS", () => serializeBlocks(writer));
  writer.section("ENTITIES", () => serializeEntities(writer, normalizedDocument.entities, precision, handles));
  writer.pair(0, "EOF");

  return {
    dxf: writer.toString(),
    diagnostics,
  };
}

export function serializeDxfDocumentOrThrow(document: DxfDocument): string {
  const result = serializeDxfDocument(document);
  if (result.dxf.length === 0) {
    const messages = result.diagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map((diagnostic) => diagnostic.message)
      .join("; ");
    throw new Error(messages || "DXF serialization failed");
  }
  return result.dxf;
}

export { DEFAULT_DXF_PRECISION_POLICY };
