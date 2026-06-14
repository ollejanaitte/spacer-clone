import { useCallback, useEffect, useState } from "react";
import {
  loadViewerCoordinateMode,
  saveViewerCoordinateMode,
  type ViewerCoordinateMode,
} from "./coordinateTransform";

/**
 * Viewer 表示専用の SPACER 座標系トグル state。
 * 初期値は localStorage から読み取り、変更時に localStorage へ保存する。
 */
export function useViewerCoordinateMode(): readonly [
  ViewerCoordinateMode,
  (mode: ViewerCoordinateMode) => void,
  () => void,
] {
  const [mode, setMode] = useState<ViewerCoordinateMode>(() => loadViewerCoordinateMode());

  useEffect(() => {
    saveViewerCoordinateMode(mode);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((current) => (current === "spacer" ? "normal" : "spacer"));
  }, []);

  return [mode, setMode, toggle] as const;
}
