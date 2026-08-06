// 入力検証（fail-closed・承認PROPOSED）
// 負値・0寸法・形式不明・単位系不明・座標系不明・未対応構造形式を拒否する。

import { SCHEMA_VERSION, COORDINATE_SYSTEM, UNIT_SYSTEM } from "./model";

export interface Issue {
  code: string;
  message: string;
  path: string;
}

export class ValidationError extends Error {
  issues: Issue[];
  constructor(issues: Issue[]) {
    super(issues.map((i) => `${i.path}: ${i.message}`).join("; "));
    this.name = "ValidationError";
    this.issues = issues;
  }
}

function pos(path: string, v: unknown, name: string): Issue | null {
  if (typeof v !== "number") {
    return { code: "TYPE", path, message: `${name} は数値が必要` };
  }
  if (!isFinite(v) || v <= 0) {
    return { code: "NONPOSITIVE", path, message: `${name}=${v} は正値が必要` };
  }
  return null;
}

function nonneg(path: string, v: unknown, name: string): Issue | null {
  if (typeof v !== "number") {
    return { code: "TYPE", path, message: `${name} は数値が必要` };
  }
  if (!isFinite(v) || v < 0) {
    return { code: "OUTOFRANGE", path, message: `${name}=${v} は0以上が必要` };
  }
  return null;
}

export function validateProject(p: unknown): Issue[] {
  const issues: Issue[] = [];
  if (p === null || typeof p !== "object") {
    return [{ code: "OBJECT", path: "ROOT", message: "ルートはオブジェクトが必要" }];
  }
  const proj = p as Record<string, unknown>;
  if (proj.schemaVersion !== SCHEMA_VERSION) {
    issues.push({
      code: "SCHEMA_VERSION",
      path: "schemaVersion",
      message: `schemaVersion=${proj.schemaVersion} は非対応（期待 ${SCHEMA_VERSION}）`,
    });
  }
  if (proj.coordinateSystem !== COORDINATE_SYSTEM) {
    issues.push({
      code: "COORDINATE_SYSTEM",
      path: "coordinateSystem",
      message: `座標系=${proj.coordinateSystem} は非対応（期待 ${COORDINATE_SYSTEM}）`,
    });
  }
  if (proj.unitSystem !== UNIT_SYSTEM) {
    issues.push({
      code: "UNIT_SYSTEM",
      path: "unitSystem",
      message: `単位系=${proj.unitSystem} は非対応（期待 ${UNIT_SYSTEM}）`,
    });
  }
  if (typeof proj.name !== "string" || proj.name.trim() === "") {
    issues.push({ code: "INCOMPLETE", path: "name", message: "プロジェクト名が必要" });
  }
  if (!Array.isArray(proj.supports) || proj.supports.length === 0) {
    issues.push({ code: "INCOMPLETE", path: "supports", message: "支点が1つ以上必要" });
    return issues;
  }
  proj.supports.forEach((s, i) => issues.push(...validateSupport(s, `supports[${i}]`)));
  return issues;
}

export function validateSupport(s: unknown, path: string): Issue[] {
  const issues: Issue[] = [];
  if (s === null || typeof s !== "object") {
    return [{ code: "OBJECT", path, message: "支点はオブジェクト" }];
  }
  const sup = s as Record<string, any>;
  if (typeof sup.supportId !== "string" || sup.supportId.trim() === "") {
    issues.push({ code: "INCOMPLETE", path: `${path}.supportId`, message: "支点IDが必要" });
  }
  const st = sup.supportType;
  if (st === "pier") {
    issues.push(...validatePier(sup.pier, `${path}.pier`));
  } else if (st === "abutment") {
    issues.push(...validateAbutment(sup.abutment, `${path}.abutment`));
  } else {
    issues.push({
      code: "UNSUPPORTED_FORM",
      path: `${path}.supportType`,
      message: `supportType=${st} は非対応`,
    });
  }
  return issues;
}

function validatePier(p: unknown, path: string): Issue[] {
  const issues: Issue[] = [];
  if (p === null || typeof p !== "object") {
    return [{ code: "OBJECT", path, message: "橋脚はオブジェクト" }];
  }
  const pier = p as Record<string, any>;
  if (pier.formType !== "single_column_rect") {
    issues.push({
      code: "UNSUPPORTED_FORM",
      path: `${path}.formType`,
      message: `formType=${pier.formType} は非対応（単柱矩形のみ）`,
    });
  }
  const col = pier.column ?? {};
  for (const k of ["width", "depth", "height"]) {
    issues.push(...check(pos, `${path}.column.${k}`, col[k], `柱.${k}`));
  }
  const cap = pier.cap ?? {};
  for (const k of ["width", "height", "depth"]) {
    issues.push(...check(pos, `${path}.cap.${k}`, cap[k], `梁.${k}`));
  }
  for (const k of ["overhangL", "overhangR"]) {
    if (cap[k] !== undefined && cap[k] !== null) issues.push(...check(nonneg, `${path}.cap.${k}`, cap[k], `梁.${k}`));
  }
  const foot = pier.footing ?? {};
  for (const k of ["length", "width", "thickness"]) {
    issues.push(...check(pos, `${path}.footing.${k}`, foot[k], `フーチング.${k}`));
  }
  if (pier.piles && typeof pier.piles === "object") {
    const piles = pier.piles as Record<string, any>;
    issues.push(...check(pos, `${path}.piles.diameter`, piles.diameter, "杭径"));
    issues.push(...check(pos, `${path}.piles.length`, piles.length, "杭長"));
    issues.push(...check(pos, `${path}.piles.pileCount`, piles.pileCount, "杭本数"));
    const sp = piles.spacing ?? {};
    issues.push(...check(pos, `${path}.piles.spacing.x`, sp.x, "間隔.x"));
    issues.push(...check(pos, `${path}.piles.spacing.y`, sp.y, "間隔.y"));
  }
  return issues;
}

function validateAbutment(a: unknown, path: string): Issue[] {
  const issues: Issue[] = [];
  if (a === null || typeof a !== "object") {
    return [{ code: "OBJECT", path, message: "橋台はオブジェクト" }];
  }
  const ab = a as Record<string, any>;
  if (ab.formType !== "inverted_t") {
    issues.push({
      code: "UNSUPPORTED_FORM",
      path: `${path}.formType`,
      message: `formType=${ab.formType} は非対応（逆T式のみ）`,
    });
  }
  const bw = ab.backwall ?? {};
  for (const k of ["height", "thickness", "width"]) {
    issues.push(...check(pos, `${path}.backwall.${k}`, bw[k], `背壁.${k}`));
  }
  return issues;
}

function check(fn: typeof pos, path: string, v: unknown, name: string): Issue[] {
  const r = fn(path, v, name);
  return r ? [r] : [];
}