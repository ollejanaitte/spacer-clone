// Phase C1 (M3-01) 下部工プロジェクト永続化（純粋ロジック）
// SubstructureProject (v0.2.0) の serialize / deserialize。
// stable ID・alignment 参照・geometry 入力を再現し、fail-closed で不正データを拒否する。

import {
  SUBSTRUCTURE_COORDINATE_SYSTEM,
  SUBSTRUCTURE_SCHEMA_VERSION,
  SUBSTRUCTURE_UNIT_SYSTEM,
  type AlignmentRef,
  type SubstructureProject,
  type Support,
} from "../model";
import { validateSubstructureProject } from "../validation";

export interface PersistResult<T> {
  ok: boolean;
  value: T | null;
  diagnostics: string[];
}

export interface SerializeInput {
  supports: readonly Support[];
  projectId?: string;
  bridgeId?: string;
  alignmentRefs?: readonly AlignmentRef[];
}

/** 既定の alignment 参照を supports の placement から導出。 */
export function deriveAlignmentRefs(
  supports: readonly Support[],
): AlignmentRef[] {
  const seen = new Map<string, number>();
  for (const s of supports) {
    const id = s.placement.alignmentId;
    if (!id) continue;
    const station = s.placement.station ?? 0;
    const prev = seen.get(id);
    seen.set(id, prev === undefined ? station : Math.max(prev, station));
  }
  return [...seen.entries()].map(([alignmentId, totalLength]) => ({
    alignmentId,
    originStation: 0,
    totalLength,
  }));
}

/** 安定IDの重複を検出。 */
export function detectDuplicateSupportIds(supports: readonly Support[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const s of supports) {
    if (seen.has(s.supportId)) dups.add(s.supportId);
    seen.add(s.supportId);
  }
  return [...dups];
}

/** supports を SubstructureProject へ serialize（fail-closed: fatal があれば拒否）。 */
export function serializeSubstructureProject(
  input: SerializeInput,
): PersistResult<{ project: SubstructureProject; json: string }> {
  const diagnostics: string[] = [];

  if (!Array.isArray(input.supports)) {
    return { ok: false, value: null, diagnostics: ["supports は配列が必要"] };
  }

  const dups = detectDuplicateSupportIds(input.supports);
  if (dups.length > 0) {
    return {
      ok: false,
      value: null,
      diagnostics: [`supportId が重複しています: ${dups.join(", ")}`],
    };
  }

  const project: SubstructureProject = {
    schemaVersion: SUBSTRUCTURE_SCHEMA_VERSION,
    projectId: input.projectId || "substructure-project",
    ...(input.bridgeId ? { bridgeId: input.bridgeId } : {}),
    source: "c1",
    coordinateSystem: SUBSTRUCTURE_COORDINATE_SYSTEM,
    unitSystem: SUBSTRUCTURE_UNIT_SYSTEM,
    alignmentRefs:
      input.alignmentRefs && input.alignmentRefs.length > 0
        ? [...input.alignmentRefs]
        : deriveAlignmentRefs(input.supports),
    supports: [...input.supports],
    metadata: {
      sourceApplication: "spacer-clone",
      sourceVersion: "0.3.0-preview",
      sourceRevision: "phase-c1-m3",
      createdAt: "",
      updatedAt: "",
    },
  };

  const issues = validateSubstructureProject(project);
  const fatals = issues.filter((i) => i.severity === "error");
  if (fatals.length > 0) {
    return {
      ok: false,
      value: null,
      diagnostics: fatals.map((i) => i.message),
    };
  }

  return {
    ok: true,
    value: { project, json: `${JSON.stringify(project, null, 2)}\n` },
    diagnostics,
  };
}

/** JSON 文字列 → SubstructureProject（parse / migration / validate fail-closed）。 */
export function deserializeSubstructureProject(
  jsonText: string,
): PersistResult<SubstructureProject> {
  const diagnostics: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      ok: false,
      value: null,
      diagnostics: [`JSON として解釈できません: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, value: null, diagnostics: ["プロジェクトはオブジェクトが必要"] };
  }

  const version = (parsed as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version !== "string" || version !== SUBSTRUCTURE_SCHEMA_VERSION) {
    return {
      ok: false,
      value: null,
      diagnostics: [
        `schemaVersion=${String(version)} は非対応（期待 ${SUBSTRUCTURE_SCHEMA_VERSION}）。migration は未提供。`,
      ],
    };
  }

  const issues = validateSubstructureProject(parsed);
  const fatals = issues.filter((i) => i.severity === "error");
  if (fatals.length > 0) {
    return {
      ok: false,
      value: null,
      diagnostics: fatals.map((i) => i.message),
    };
  }

  return { ok: true, value: parsed as SubstructureProject, diagnostics };
}

/** SubstructureProject → supports（geometry 入力再現用）。 */
export function projectToSupports(project: SubstructureProject): Support[] {
  return project.supports;
}
