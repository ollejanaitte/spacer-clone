/**
 * Development quantity export helpers (CSV/JSON download).
 * UNVERIFIED — NOT FOR DESIGN OR CONSTRUCTION
 */
import {
  assertQuantityModelExportable,
  quantityModelToCsv,
  quantityModelToJson,
  type QuantityModel,
} from "./quantityModel";
import { computeContentChecksum } from "../../contracts/legacy/checksum";

export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportQuantityModelJson(model: QuantityModel): { readonly text: string; readonly checksum: string } {
  assertQuantityModelExportable(model);
  const text = quantityModelToJson(model);
  return { text, checksum: computeContentChecksum(model).hexDigest };
}

export function exportQuantityModelCsv(model: QuantityModel): { readonly text: string; readonly checksum: string } {
  assertQuantityModelExportable(model);
  const text = quantityModelToCsv(model);
  return {
    text,
    checksum: computeContentChecksum({ csv: text, inputChecksum: model.inputChecksum }).hexDigest,
  };
}

export function downloadQuantityJson(model: QuantityModel): void {
  const { text } = exportQuantityModelJson(model);
  downloadTextFile(
    `apollo-quantities_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.json`,
    text,
    "application/json;charset=utf-8",
  );
}

export function downloadQuantityCsv(model: QuantityModel): void {
  const { text } = exportQuantityModelCsv(model);
  downloadTextFile(
    `apollo-quantities_${model.projectId}_r${model.inputChecksum.slice(0, 8)}.csv`,
    text,
    "text/csv;charset=utf-8",
  );
}
