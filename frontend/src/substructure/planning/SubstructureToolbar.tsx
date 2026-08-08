// Phase C1 (M2-02) 下部工ツールバー（3ペイン Shell 用）
import { ja } from "../../i18n/ja";
import type { ViewMode, PanelState } from "./SubstructurePlanningPage";
import styles from "./SubstructurePlanningPage.module.css";

export interface SubstructureToolbarProps {
  title: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  panels: PanelState;
  onTogglePanel: (key: keyof PanelState) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  extra?: React.ReactNode;
}

export function SubstructureToolbar(props: SubstructureToolbarProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  return (
    <header className={styles.toolbar} data-testid="substructure-toolbar">
      <span className={styles.toolbarTitle}>{props.title}</span>
      <span className={styles.toolbarGroup}>
        <button
          type="button"
          className={`${styles.toolbarButton} ${props.viewMode === "2d" ? styles.active : ""}`}
          data-testid="view-mode-2d"
          onClick={() => props.onViewModeChange("2d")}
        >
          {t.mode2d ?? "2D"}
        </button>
        <button
          type="button"
          className={`${styles.toolbarButton} ${props.viewMode === "3d" ? styles.active : ""}`}
          data-testid="view-mode-3d"
          onClick={() => props.onViewModeChange("3d")}
        >
          {t.mode3d ?? "3D"}
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          data-testid="toggle-panel-left"
          onClick={() => props.onTogglePanel("left")}
        >
          {t.panelTree ?? "ツリー"}
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          data-testid="toggle-panel-right"
          onClick={() => props.onTogglePanel("right")}
        >
          {t.panelProperty ?? "プロパティ"}
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          data-testid="toggle-panel-bottom"
          onClick={() => props.onTogglePanel("bottom")}
        >
          {t.panelTable ?? "座標表"}
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          data-testid="toolbar-undo"
          disabled={!props.canUndo}
          onClick={props.onUndo}
        >
          {t.undo ?? "元に戻す"}
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          data-testid="toolbar-redo"
          disabled={!props.canRedo}
          onClick={props.onRedo}
        >
          {t.redo ?? "やり直し"}
        </button>
        {props.extra}
      </span>
    </header>
  );
}
