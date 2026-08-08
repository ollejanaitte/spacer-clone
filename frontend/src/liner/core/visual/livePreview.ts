/**
 * Live preview state management (STEP-3 S3-UX07).
 *
 * Implements the UX-P06 FROZEN three-state contract:
 *   INPUT      - draft being edited (approximate preview allowed)
 *   VALIDATED  - passed range/type/continuity checks
 *   CALCULATED - formal backend/frontend-core calculation result
 *
 * Provides a debounced transition helper and a useLivePreviewState hook so all
 * schematic screens share the same state semantics and never confuse preview
 * with the formal result.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { VisualState } from "./contract";

export const PREVIEW_DEBOUNCE_MS = 300;

/** Visual state label per state (Japanese, UX-P06). */
export function visualStateLabel(state: VisualState): string {
  switch (state) {
    case "INPUT":
      return "入力プレビュー（近似）";
    case "VALIDATED":
      return "検証済みプレビュー";
    case "CALCULATED":
      return "計算結果";
    default:
      return state;
  }
}

/** True when the state is an intermediate preview (not the formal result). */
export function isPreviewState(state: VisualState): boolean {
  return state === "INPUT" || state === "VALIDATED";
}

/** Debounced transition state machine (pure): draft change -> INPUT, settled -> VALIDATED. */
export function debouncedState(previous: VisualState, draftChanged: boolean): VisualState {
  if (draftChanged) return "INPUT";
  if (previous === "INPUT") return "VALIDATED";
  return previous;
}

/**
 * Debounced value change that reflects INPUT state while typing, then
 * promotes to VALIDATED after the debounce window. Used by field editors.
 */
export function useDebouncedValue<T>(value: T, delay = PREVIEW_DEBOUNCE_MS): {
  debounced: T;
  state: VisualState;
} {
  const [debounced, setDebounced] = useState<T>(value);
  const [state, setState] = useState<VisualState>("CALCULATED");

  useEffect(() => {
    setState("INPUT");
    const timer = window.setTimeout(() => {
      setDebounced(value);
      setState("VALIDATED");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return { debounced, state };
}

export interface LivePreviewOptions<T> {
  /** Called when the debounced draft should be validated. */
  validate?: (value: T) => boolean;
  /** Called to run the formal calculation. */
  calculate?: (value: T) => void;
}

/**
 * Central live-preview controller: holds draft, state and result, and moves
 * INPUT -> VALIDATED -> CALCULATED according to user edits.
 */
export function useLivePreviewState<T>(
  initial: T,
  options: LivePreviewOptions<T> = {},
) {
  const [draft, setDraft] = useState<T>(initial);
  const [state, setState] = useState<VisualState>("CALCULATED");
  const [validated, setValidated] = useState(true);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const updateDraft = useCallback((next: T) => {
    setDraft(next);
    setState("INPUT");
  }, []);

  useEffect(() => {
    if (state !== "INPUT") return;
    const timer = window.setTimeout(() => {
      const ok = optionsRef.current.validate?.(draftRef.current) ?? true;
      setValidated(ok);
      setState(ok ? "VALIDATED" : "INPUT");
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, draft]);

  const runCalculation = useCallback(() => {
    if (!validated) return;
    setState("CALCULATED");
    optionsRef.current.calculate?.(draftRef.current);
  }, [validated]);

  return {
    draft,
    updateDraft,
    state,
    validated,
    runCalculation,
  };
}
