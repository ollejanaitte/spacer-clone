// Phase C1 (M2-05) リアルタイム2D/3D更新フック
// P03/P03.5 Freeze:
//   - 2D 投影 = 即時（immediate）
//   - 3D 再生成 = 300ms debounce
//   - FATAL = generation stop / WARNING = continuation
//   - 直接ドラッグ編集なし（フォーム入力のみ）
//
// Property input → validation → 2D Projection(即時) → 300ms → 3D geometry 再生成。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildAllSupportSolids,
  type SolidGroup,
} from "../SubstructureSolidGenerator";
import { projectAll, type PlanProjection } from "../PlanProjection";
import type { Support, SupportPlacementSnapshot } from "../model";

export const REALTIME_3D_DEBOUNCE_MS = 300;

export interface RealtimeState {
  supports: readonly Support[];
  snapshots: ReadonlyMap<string, SupportPlacementSnapshot>;
}

export interface RealtimeOutput {
  /** 2D 投影（即時更新、入力毎に再計算） */
  projections: PlanProjection[];
  /** 3D ジオメトリ（300ms debounce 後） */
  groups: SolidGroup[];
  /** 直近の入力時点の3D再生成トリガー（テスト用） */
  regenCount: number;
  /** FATAL により3D生成が停止中か */
  generationBlocked: boolean;
  /** 最新 supports を反映（変更を入れる入口） */
  applySupports: (next: readonly Support[]) => void;
  /** 即時再生成（選択復帰など UI 操作時） */
  refresh3D: () => void;
}

/** スナップショットのデフォルト計算（座標未指定時は直交基底+0）。 */
export function makeSnapshots(
  supports: readonly Support[],
): Map<string, SupportPlacementSnapshot> {
  const map = new Map<string, SupportPlacementSnapshot>();
  for (const s of supports) {
    map.set(s.supportId, {
      source: s.placement.source,
      position:
        s.placement.source === "direct_xyz" && s.placement.position
          ? s.placement.position
          : { x: s.placement.station ?? 0, y: s.placement.offset ?? 0, z: s.zOverride ?? 0 },
      tangent: { x: 1, y: 0, z: 0 },
      transverse: { x: 0, y: 1, z: 0 },
      vertical: { x: 0, y: 0, z: 1 },
      azimuthRad: 0,
      skewRad: s.skewRad,
    });
  }
  return map;
}

/**
 * リアルタイム更新を管理する。
 * 2D は supports 変更毎に即時。3D は 300ms debounce。FATAL は throw を捕捉して停止。
 */
export function useSubstructureRealtimeUpdate(
  supports: readonly Support[],
): RealtimeOutput {
  const [latestSupports, setLatestSupports] = useState<readonly Support[]>(supports);
  const [groups, setGroups] = useState<SolidGroup[]>(() => {
    try {
      return buildAllSupportSolids(supports as never, makeSnapshots(supports));
    } catch {
      return [];
    }
  });
  const [blocked, setBlocked] = useState(false);
  const regenCountRef = useRef(0);
  const [, setRegenTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 入力値の最新反映
  useEffect(() => {
    setLatestSupports(supports);
  }, [supports]);

  // 2D 即時投影は毎 render で計算（軽量）
  const projections = useMemo<PlanProjection[]>(() => {
    try {
      const snapshots = makeSnapshots(latestSupports);
      const g = buildAllSupportSolids(latestSupports as never, snapshots);
      return projectAll(g);
    } catch {
      return [];
    }
  }, [latestSupports]);

  const run3D = useCallback((list: readonly Support[]) => {
    try {
      const snapshots = makeSnapshots(list);
      const g = buildAllSupportSolids(list as never, snapshots);
      setGroups(g);
      setBlocked(false);
    } catch {
      // FATAL → generation stop
      setGroups([]);
      setBlocked(true);
    }
    regenCountRef.current += 1;
    setRegenTick((t) => t + 1);
  }, []);

  const refresh3D = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    run3D(latestSupports);
  }, [latestSupports, run3D]);

  // 3D debounce
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      run3D(latestSupports);
    }, REALTIME_3D_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [latestSupports, run3D]);

  const applySupports = useCallback((next: readonly Support[]) => {
    setLatestSupports(next);
  }, []);

  return {
    projections,
    groups,
    regenCount: regenCountRef.current,
    generationBlocked: blocked,
    applySupports,
    refresh3D,
  };
}
