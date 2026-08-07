// Phase C1 (I01) 下部工 バリデーション
// P02 Freeze のエラー分類（FATAL / WARNING / INFO）に準拠する fail-closed 検証。
// - error    = FATAL（保存・生成不可）
// - warning  = WARNING（継続可能）
// - info     = INFO（通知のみ）

import {
  SUBSTRUCTURE_SCHEMA_VERSION,
  SUBSTRUCTURE_COORDINATE_SYSTEM,
  SUBSTRUCTURE_UNIT_SYSTEM,
  type SupportType,
  type PierFormType,
  type AbutmentFormType,
  type PileType,
  type PierColumn,
  type PierCap,
  type PortalPierBeam,
  type Footing,
  type PileGroup,
  type PierData,
  type AbutmentData,
  type Support,
  type SubstructureProject,
} from "./model";

export type Severity = "error" | "warning" | "info";

export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  path: string;
  supportId?: string;
}

export class SubstructureValidationError extends Error {
  issues: Issue[];
  constructor(issues: Issue[]) {
    super(issues.map((i) => `[${i.severity}] ${i.path}: ${i.message}`).join("; "));
    this.name = "SubstructureValidationError";
    this.issues = issues;
  }
}

const PIER_FORM_TYPES: PierFormType[] = ["single_column_rect", "wall", "portal_frame"];
const ABUTMENT_FORM_TYPES: AbutmentFormType[] = ["inverted_t", "cantilever_frame"];
const PILE_TYPES: PileType[] = ["bored_pile", "steel_pipe"];
const SUPPORT_TYPES: SupportType[] = ["pier", "abutment"];

function err(
  code: string,
  path: string,
  message: string,
  supportId?: string,
): Issue {
  return { code, severity: "error", path, message, ...(supportId ? { supportId } : {}) };
}
function warn(code: string, path: string, message: string, supportId?: string): Issue {
  return { code, severity: "warning", path, message, ...(supportId ? { supportId } : {}) };
}

function isPosNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}
function isNonNegNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}
function isVec3(v: unknown): v is { x: number; y: number; z: number } {
  return (
    v !== null &&
    typeof v === "object" &&
    isFiniteNum((v as { x?: unknown }).x) &&
    isFiniteNum((v as { y?: unknown }).y) &&
    isFiniteNum((v as { z?: unknown }).z)
  );
}
function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** P02: supportId 命名 {類型}{index}。最小文字列検査。 */
function isValidSupportId(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function validatePositive(
  path: string,
  v: unknown,
  label: string,
  issues: Issue[],
  supportId?: string,
): void {
  if (!isPosNum(v)) {
    issues.push(err("NONPOSITIVE", path, `${label} は正値（>0）が必要`, supportId));
  }
}

export function validateNonNegative(
  path: string,
  v: unknown,
  label: string,
  issues: Issue[],
  supportId?: string,
): void {
  if (!isNonNegNum(v)) {
    issues.push(err("NONNEGATIVE", path, `${label} は0以上が必要`, supportId));
  }
}

/** 1基の Support を検証。positional な array index は避け supportId で識別。 */
function validateSupport(s: unknown, issues: Issue[]): void {
  if (s === null || typeof s !== "object" || Array.isArray(s)) {
    issues.push(err("SUPPORT_INVALID", "supports[]", "支点はオブジェクトが必要"));
    return;
  }
  const support = s as Partial<Support>;

  if (!isValidSupportId(support.supportId)) {
    issues.push(err("SUPPORT_ID_MISSING", "supportId", "支点ID（supportId）が必要"));
    return;
  }
  const sid = support.supportId as string;

  if (support.supportType === undefined || !SUPPORT_TYPES.includes(support.supportType)) {
    issues.push(err("SUPPORT_TYPE_INVALID", "supportType", `${support.supportType} は非対応の支点種別`, sid));
  }

  validatePlacement(support, issues, sid);

  if (support.skewRad !== undefined && !isFinite(support.skewRad)) {
    issues.push(err("SKEW_INVALID", "skewRad", "skewRad は有限数が必要", sid));
  }

  if (support.supportType === "pier") {
    validatePier(support.pier, issues, sid);
  } else if (support.supportType === "abutment") {
    validateAbutment(support.abutment, issues, sid);
  }
}

/** P-02 Freeze: PRIMARY / EXCEPTION 配置。 */
function validatePlacement(support: Partial<Support>, issues: Issue[], sid: string): void {
  const p = support.placement;
  if (p === undefined) {
    issues.push(err("PLACEMENT_MISSING", "placement", "配置方式（placement）が必要", sid));
    return;
  }
  if (p.source === "liner") {
    if (p.alignmentId === undefined || p.alignmentId.trim().length === 0) {
      issues.push(err("ALIGNMENT_MISSING", "placement.alignmentId", "PRIMARY方式では alignmentId が必須", sid));
    }
    validateNonNegative("placement.station", p.station, "station", issues, sid);
    if (p.offset === undefined || !isFinite(p.offset)) {
      issues.push(err("OFFSET_INVALID", "placement.offset", "offset は有限数が必要", sid));
    }
  } else if (p.source === "direct_xyz") {
    if (p.position === undefined || !isVec3(p.position)) {
      issues.push(err("POSITION_INVALID", "placement.position", "EXCEPTION方式では position が必要", sid));
    }
  } else {
    issues.push(err("PLACEMENT_SOURCE_INVALID", "placement.source", `${p.source} は非対応の配置方式`, sid));
  }
}

function validatePier(pier: Partial<PierData> | undefined, issues: Issue[], sid: string): void {
  if (pier === undefined) {
    issues.push(err("PIER_MISSING", "pier", "橋脚支点には pier データが必要", sid));
    return;
  }
  if (pier.formType === undefined || !PIER_FORM_TYPES.includes(pier.formType)) {
    issues.push(err("UNSUPPORTED_FORM", "pier.formType", `${pier.formType} は非対応の橋脚形式`, sid));
  }
  if (pier.formType === "portal_frame") {
    if (!Array.isArray(pier.columns) || pier.columns.length < 2) {
      issues.push(err("PORTAL_REQUIRES_TWO_COLUMNS", "pier.columns", "門型橋脚は2本以上の柱が必要", sid));
    } else {
      pier.columns.forEach((c, i) => validateColumn(c, `pier.columns[${i}]`, issues, sid));
    }
    validateBeam(pier.beam, "pier.beam", issues, sid);
  } else if (pier.formType === "wall") {
    validateColumn(pier.column, "pier.column", issues, sid);
    validateCap(pier.cap, "pier.cap", issues, sid);
  } else if (pier.formType === "single_column_rect") {
    validateColumn(pier.column, "pier.column", issues, sid);
    validateCap(pier.cap, "pier.cap", issues, sid);
  } else {
    validateColumn(pier.column, "pier.column", issues, sid);
    validateCap(pier.cap, "pier.cap", issues, sid);
  }
  validateFooting(pier.footing, "pier.footing", issues, sid);
  if (pier.pileGroup !== undefined && pier.pileGroup !== null) {
    validatePiles(pier.pileGroup, "pier.pileGroup", issues, sid);
  }
}

function validateAbutment(abutment: AbutmentData | undefined, issues: Issue[], sid: string): void {
  if (abutment === undefined) {
    issues.push(err("ABUTMENT_MISSING", "abutment", "橋台支点には abutment データが必要", sid));
    return;
  }
  if (abutment.formType === undefined || !ABUTMENT_FORM_TYPES.includes(abutment.formType)) {
    issues.push(err("UNSUPPORTED_FORM", "abutment.formType", `${abutment.formType} は非対応の橋台形式`, sid));
  }
  const bw = abutment.backwall;
  validatePositive("abutment.backwall.height", bw?.height, "背壁高", issues, sid);
  validatePositive("abutment.backwall.thickness", bw?.thickness, "背壁厚", issues, sid);
  validatePositive("abutment.backwall.width", bw?.width, "背壁幅", issues, sid);
  validateFooting(abutment.footing, "abutment.footing", issues, sid);
  if (abutment.pileGroup !== undefined && abutment.pileGroup !== null) {
    validatePiles(abutment.pileGroup, "abutment.pileGroup", issues, sid);
  }
}

function validateColumn(col: PierColumn | undefined, path: string, issues: Issue[], sid: string): void {
  if (col === undefined) {
    issues.push(err("COLUMN_MISSING", path, "柱データが必要", sid));
    return;
  }
  validatePositive(`${path}.width`, col.width, "柱幅", issues, sid);
  validatePositive(`${path}.depth`, col.depth, "柱深さ", issues, sid);
  validatePositive(`${path}.height`, col.height, "柱高", issues, sid);
  if (col.transverseOffset !== undefined && !isFinite(col.transverseOffset)) {
    issues.push(err("NON_FINITE", `${path}.transverseOffset`, "transverseOffset は有限数が必要", sid));
  }
  if (typeof col.id !== "string" || col.id.trim().length === 0) {
    issues.push(err("COLUMN_ID_MISSING", `${path}.id`, "柱IDが必要", sid));
  }
}

function validateCap(cap: PierCap | undefined, path: string, issues: Issue[], sid: string): void {
  if (cap === undefined) {
    issues.push(err("CAP_MISSING", path, "梁（cap）データが必要", sid));
    return;
  }
  validatePositive(`${path}.width`, cap.width, "cap.width", issues, sid);
  validatePositive(`${path}.depth`, cap.depth, "cap.depth", issues, sid);
  validatePositive(`${path}.height`, cap.height, "cap.height", issues, sid);
  validateNonNegative(`${path}.overhangL`, cap.overhangL, "cap.overhangL", issues, sid);
  validateNonNegative(`${path}.overhangR`, cap.overhangR, "cap.overhangR", issues, sid);
}

function validateBeam(beam: PortalPierBeam | undefined, path: string, issues: Issue[], sid: string): void {
  if (beam === undefined) {
    issues.push(err("BEAM_MISSING", path, "門型横梁（beam）が必要", sid));
    return;
  }
  validatePositive(`${path}.width`, beam.width, "beam.width", issues, sid);
  validatePositive(`${path}.depth`, beam.depth, "beam.depth", issues, sid);
  validatePositive(`${path}.height`, beam.height, "beam.height", issues, sid);
}

function validateFooting(foot: Footing | undefined, path: string, issues: Issue[], sid: string): void {
  if (foot === undefined) {
    issues.push(err("FOOTING_MISSING", path, "フーチングが必要", sid));
    return;
  }
  validatePositive(`${path}.length`, foot.length, "footing.length", issues, sid);
  validatePositive(`${path}.width`, foot.width, "footing.width", issues, sid);
  validatePositive(`${path}.thickness`, foot.thickness, "footing.thickness", issues, sid);
}

function validatePiles(piles: PileGroup | undefined, path: string, issues: Issue[], sid: string): void {
  if (piles === undefined) {
    issues.push(err("PILES_MISSING", path, "杭データが必要", sid));
    return;
  }
  if (piles.pileType === undefined || !PILE_TYPES.includes(piles.pileType)) {
    issues.push(err("UNSUPPORTED_PILE", `${path}.pileType`, `${piles.pileType} は非対応の杭種`, sid));
  }
  validatePositive(`${path}.diameter`, piles.diameter, "pile.diameter", issues, sid);
  validatePositive(`${path}.length`, piles.length, "pile.length", issues, sid);
  validatePositive(`${path}.pileCount`, piles.pileCount, "pile.pileCount", issues, sid);
  if (piles.spacing !== undefined) {
    validatePositive(`${path}.spacing.x`, piles.spacing.x, "spacing.x", issues, sid);
    validatePositive(`${path}.spacing.y`, piles.spacing.y, "spacing.y", issues, sid);
  } else {
    issues.push(err("SPACING_MISSING", `${path}.spacing`, "spacing が必要", sid));
  }
}

/** 複数支点の stable ID 一意性を検証（重複 supportId は FATAL）。 */
function validateSupportIdUniqueness(project: SubstructureProject, issues: Issue[]): void {
  const seen = new Map<string, Issue>();
  for (const s of project.supports) {
    const sid = s?.supportId;
    if (sid !== undefined) {
      if (seen.has(sid)) {
        issues.push(err("SUPPORT_ID_DUPLICATE", `supportId:${sid}`, `supportId ${sid} が重複`, sid));
      } else {
        seen.set(sid, err("", "", "", sid));
      }
    }
  }
}

export function validateSubstructureProject(raw: unknown): Issue[] {
  const issues: Issue[] = [];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return [err("PROJECT_INVALID", "ROOT", "ルートはオブジェクトが必要")];
  }
  const proj = raw as SubstructureProject;
  if (proj.schemaVersion !== SUBSTRUCTURE_SCHEMA_VERSION) {
    issues.push(err("SCHEMA_VERSION", "schemaVersion", `schemaVersion=${proj.schemaVersion} は非対応（期待 ${SUBSTRUCTURE_SCHEMA_VERSION}）`));
  }
  if (proj.coordinateSystem !== SUBSTRUCTURE_COORDINATE_SYSTEM) {
    issues.push(err("COORDINATE_SYSTEM", "coordinateSystem", `座標系=${proj.coordinateSystem} は非対応（期待 ${SUBSTRUCTURE_COORDINATE_SYSTEM}）`));
  }
  if (proj.unitSystem !== SUBSTRUCTURE_UNIT_SYSTEM) {
    issues.push(err("UNIT_SYSTEM", "unitSystem", `単位系=${proj.unitSystem} は非対応（期待 ${SUBSTRUCTURE_UNIT_SYSTEM}）`));
  }
  if (!Array.isArray(proj.supports) || proj.supports.length === 0) {
    issues.push(err("NO_SUPPORTS", "supports", "支点が1つ以上必要（optional substructure は省略可だが、指定時は必要）"));
  } else {
    for (const s of proj.supports) {
      validateSupport(s, issues);
    }
    validateSupportIdUniqueness(proj as SubstructureProject, issues);
  }
  return issues;
}

export function isAllFatalFree(issues: Issue[]): boolean {
  return !issues.some((i) => i.severity === "error");
}