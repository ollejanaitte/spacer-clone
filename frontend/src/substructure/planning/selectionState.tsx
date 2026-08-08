// Phase C1 (M2-07) 選択状態（supportId をキーに全ビュー共有）
// P03.5 2.1: selectedSupportIds / primarySupportId / hoveredSupportId。

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface SelectionState {
  selectedSupportIds: string[];
  primarySupportId: string | null;
  hoveredSupportId: string | null;
}

export interface SelectionApi {
  select: (supportId: string, opts?: { additive?: boolean }) => void;
  selectMany: (supportIds: string[]) => void;
  deselect: (supportId?: string) => void;
  clear: () => void;
  hover: (supportId: string | null) => void;
  isSelected: (supportId: string) => boolean;
}

const EMPTY: SelectionState = {
  selectedSupportIds: [],
  primarySupportId: null,
  hoveredSupportId: null,
};

const STATE_CTX = createContext<SelectionState>(EMPTY);
const API_CTX = createContext<SelectionApi | null>(null);

export interface SelectionProviderProps {
  children: ReactNode;
  initial?: Partial<SelectionState>;
  /** 選択変化を外部へ通知（2D/3D/Tree 同期 + LINER 用） */
  onSelectionChange?: (state: SelectionState) => void;
}

export function SubstructureSelectionProvider({
  children,
  initial,
  onSelectionChange,
}: SelectionProviderProps) {
  const [state, setState] = useState<SelectionState>({
    selectedSupportIds: initial?.selectedSupportIds ?? [],
    primarySupportId: initial?.primarySupportId ?? null,
    hoveredSupportId: initial?.hoveredSupportId ?? null,
  });

  const update = useCallback(
    (patch: Partial<SelectionState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange],
  );

  const api = useMemo<SelectionApi>(
    () => ({
      select: (supportId, opts) => {
        update(
          opts?.additive
            ? {
                selectedSupportIds: state.selectedSupportIds.includes(supportId)
                  ? state.selectedSupportIds
                  : [...state.selectedSupportIds, supportId],
                primarySupportId: supportId,
              }
            : { selectedSupportIds: [supportId], primarySupportId: supportId },
        );
      },
      selectMany: (supportIds) =>
        update({
          selectedSupportIds: supportIds,
          primarySupportId: supportIds[0] ?? null,
        }),
      deselect: (supportId) =>
        update(
          supportId
            ? {
                selectedSupportIds: state.selectedSupportIds.filter((id) => id !== supportId),
                primarySupportId:
                  state.primarySupportId === supportId ? null : state.primarySupportId,
              }
            : { selectedSupportIds: [], primarySupportId: null },
        ),
      clear: () => update({ selectedSupportIds: [], primarySupportId: null }),
      hover: (supportId) => update({ hoveredSupportId: supportId }),
      isSelected: (supportId) => state.selectedSupportIds.includes(supportId),
    }),
    [state, update],
  );

  return (
    <STATE_CTX.Provider value={state}>
      <API_CTX.Provider value={api}>{children}</API_CTX.Provider>
    </STATE_CTX.Provider>
  );
}

/** 現在の選択状態を購読（全ビュー同期用）。 */
export function useSelectionState(): SelectionState {
  return useContext(STATE_CTX);
}

/** 選択操作 API。 */
export function useSelectionApi(): SelectionApi {
  const ctx = useContext(API_CTX);
  if (!ctx) throw new Error("useSelectionApi must be used within SubstructureSelectionProvider");
  return ctx;
}

/** 状態 + API の統合フック。 */
export function useSubstructureSelection(): SelectionState & SelectionApi {
  const state = useSelectionState();
  const api = useSelectionApi();
  return { ...state, ...api };
}
