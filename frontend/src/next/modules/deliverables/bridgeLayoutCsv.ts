/**
 * Bridge Layout span/support CSV (Phase 11 P0-06 · BL-02).
 *
 * Frozen CSV schema (Phase 10 P0-06):
 * - Single CSV, preamble line 1: #spacer:type=bridge-layout;version=1.0;checksum=<hex>
 * - Line 2: CSV header (superset columns), line 3+: data
 * - Superset columns:
 *   type,id,index,supportType,label,startSupportId,endSupportId,startStation,
 *   endStation,spanLength,startSkew,endSkew,station,skewRad,terrainElevation
 * - Units: station/length=m (3dp), skew/angle=rad (6dp), index=integer,
 *   terrainElevation=m (3dp, empty when unset)
 * - Sort: station ascending (span rows by startStation ascending)
 * - UTF-8, LF, quoting per RFC 4180 subset only
 * - checksum: canonical contentChecksum in manifest + preamble
 */

import type { ProjectManager } from "../../project/projectManager";
import { readBridgeLayoutDocument } from "../bridgeLayoutModuleAdapter";
import { generateSpans } from "../bridgeLayout/bridgeLayoutSpans";
import { listOrderedSupports } from "../bridgeLayout/bridgeLayoutPiers";
import type { BridgeLayoutDocument } from "../bridgeLayout/bridgeLayoutTypes";

const CSV_COLUMNS = [
  "type",
  "id",
  "index",
  "supportType",
  "label",
  "startSupportId",
  "endSupportId",
  "startStation",
  "endStation",
  "spanLength",
  "startSkew",
  "endSkew",
  "station",
  "skewRad",
  "terrainElevation",
] as const;

function fmtNum(value: number | null | undefined, digits: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return value.toFixed(digits);
}

function csvField(value: string): string {
  // RFC 4180 quoting subset: quote only when field contains comma, quote or CR/LF
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function spanRow(span: { spanId: string; index: number; startSupportId: string; endSupportId: string; startStation: number; endStation: number; length: number }): Record<string, string> {
  return {
    type: "span",
    id: span.spanId,
    index: String(span.index),
    supportType: "",
    label: "",
    startSupportId: span.startSupportId,
    endSupportId: span.endSupportId,
    startStation: fmtNum(span.startStation, 3),
    endStation: fmtNum(span.endStation, 3),
    spanLength: fmtNum(span.length, 3),
    startSkew: "",
    endSkew: "",
    station: "",
    skewRad: "",
    terrainElevation: "",
  };
}

function supportRow(support: { supportId: string; label: string; kind: string; station: number; skewRad?: number | null; terrainElevation?: number | null }): Record<string, string> {
  return {
    type: "support",
    id: support.supportId,
    index: "",
    supportType: support.kind,
    label: support.label,
    startSupportId: "",
    endSupportId: "",
    startStation: "",
    endStation: "",
    spanLength: "",
    startSkew: "",
    endSkew: "",
    station: fmtNum(support.station, 3),
    skewRad: fmtNum(support.skewRad ?? null, 6),
    terrainElevation: fmtNum(support.terrainElevation ?? null, 3),
  };
}

export function buildBridgeLayoutCsv(document: BridgeLayoutDocument): string {
  const spans = generateSpans(document);
  const supports = listOrderedSupports(document);
  const rows = [
    ...spans.map((s) => spanRow(s)),
    ...supports.map((s) => supportRow(s)),
  ];
  // sort: support rows and span rows interleaved by station; spans by startStation
  const sorted = [...rows].sort((a, b) => {
    const aStation = a.type === "span" ? Number(a.startStation) : Number(a.station);
    const bStation = b.type === "span" ? Number(b.startStation) : Number(b.station);
    return aStation - bStation;
  });
  const header = CSV_COLUMNS.join(",");
  const data = sorted.map((row) => CSV_COLUMNS.map((col) => csvField(row[col] ?? "")).join(",")).join("\n");
  const content = [header, data].join("\n") + "\n";
  return content;
}

/** Canonical content checksum (manifest) for the CSV body (deterministic). */
export function bridgeLayoutCsvBodyChecksum(csvBody: string): string {
  let hash = 2166136261;
  for (const b of new TextEncoder().encode(csvBody)) {
    hash ^= b;
    hash = Math.imul(hash, 16777619);
  }
  return hash.toString(16).padStart(8, "0");
}

export function bridgeLayoutCsvFileName(bridgeId: string): string {
  const token = bridgeId.replace(/[^A-Za-z0-9_-]/g, "-");
  return `bridge-layout-${token}-span-support.csv`;
}

export function buildBridgeLayoutCsvWithPreamble(document: BridgeLayoutDocument, contentChecksum: string): string {
  const body = buildBridgeLayoutCsv(document);
  const preamble = `#spacer:type=bridge-layout;version=1.0;checksum=${contentChecksum}`;
  return `${preamble}\n${body}`;
}

export function parseBridgeLayoutCsv(csv: string): { ok: boolean; preambleChecksum: string; headerOk: boolean; rowCount: number; issue: string | null } {
  const lines = csv.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 0 || !lines[0].startsWith("#spacer:type=bridge-layout;")) {
    return { ok: false, preambleChecksum: "", headerOk: false, rowCount: 0, issue: "missing preamble line 1" };
  }
  const preambleChecksum = lines[0].match(/checksum=([0-9a-f]+)/)?.[1] ?? "";
  if (!/^[0-9a-f]+$/.test(preambleChecksum)) {
    return { ok: false, preambleChecksum, headerOk: false, rowCount: 0, issue: "invalid checksum in preamble" };
  }
  if (lines.length < 2 || lines[1] !== CSV_COLUMNS.join(",")) {
    return { ok: false, preambleChecksum, headerOk: false, rowCount: 0, issue: "header mismatch" };
  }
  const rowCount = lines.slice(2).filter((l) => l.trim().length > 0).length;
  return { ok: true, preambleChecksum, headerOk: true, rowCount, issue: null };
}
