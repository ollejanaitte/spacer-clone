// Phase C1 (M2-07) Undo/Redo state 基盤
// P03.5: 1 operation = 1 history entry。300ms debounce 内の入力は履歴統合。

import { useCallback, useRef, useState } from "react";

export interface HistoryEntry<T> {
  before: T;
  after: T;
  /** 操作ラベル（Undo/Redo 表示用） */
  label?: string;
}

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UndoRedoApi<T> {
  state: UndoRedoState<T>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => T;
  redo: () => T;
  /** 新しい変更を記録。300ms 以内の連続 commit は履歴に統合する。 */
  commit: (next: T, label?: string) => void;
  /** 明示的な履歴境界（フォーカス確定・Enter 時など） */
  checkpoint: (next: T, label?: string) => void;
  reset: (value: T) => void;
}

/** 値の変更検出（浅い JSON 比較）。 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const UNDO_REDO_DEBOUNCE_MS = 300;

/**
 * 汎用 Undo/Redo。T は JSON シリアライズ可能な値（Substructure Project 等）。
 * 連続 commit は 300ms 以内なら直前履歴に統合（P03.5 要約）。
 */
export function useUndoRedo<T>(initial: T): UndoRedoApi<T> {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initial,
    future: [],
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentRef = useRef<T>(initial);
  // 現在の debounce ウィンドウの起点（最初の commit 前の値）
  const baseRef = useRef<T>(initial);

  const checkpoint = useCallback(
    (next: T, label?: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (shallowEqual(presentRef.current, next)) return;
      setState((prev) => ({
        past: [...prev.past, prev.present],
        present: next,
        future: [],
      }));
      presentRef.current = next;
    },
    [],
  );

  const commit = useCallback(
    (next: T, label?: string) => {
      // debounce ウィンドウ初回なら起点を記録
      if (!debounceRef.current) {
        baseRef.current = presentRef.current;
      }
      presentRef.current = next;
      setState((prev) => ({ ...prev, present: next }));
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const base = baseRef.current;
        setState((prevState) => {
          // base が直前履歴と同一なら統合（1操作=1履歴）
          const lastPast = prevState.past[prevState.past.length - 1];
          if (lastPast !== undefined && shallowEqual(lastPast, base)) {
            return {
              past: prevState.past,
              present: next,
              future: [],
            };
          }
          return {
            past: [...prevState.past, base],
            present: next,
            future: [],
          };
        });
      }, UNDO_REDO_DEBOUNCE_MS);
    },
    [],
  );

  const undo = useCallback((): T => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    let result: T = presentRef.current;
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      result = previous;
      presentRef.current = previous;
      baseRef.current = previous;
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
    return result;
  }, []);

  const redo = useCallback((): T => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    let result: T = presentRef.current;
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      result = next;
      presentRef.current = next;
      baseRef.current = next;
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
    return result;
  }, []);

  const reset = useCallback((value: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    presentRef.current = value;
    baseRef.current = value;
    setState({ past: [], present: value, future: [] });
  }, []);

  return {
    state,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undo,
    redo,
    commit,
    checkpoint,
    reset,
  };
}
