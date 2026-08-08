// Phase C1 (M2-02) 下部工計画 3ペインCAD UI Shell
// P03 Freeze: 左=部材ツリー / 中央=Viewport(2D/3D) / 右=Properties / 下部=座標・杭一覧。
// このStageではパネル構造・state境界・slotを確定する（フォーム詳細はM2-03以降）。

import { useCallback, useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import { SubstructureToolbar } from "./SubstructureToolbar";
import { SubstructureTreePanel } from "./SubstructureTreePanel";
import { SubstructureViewport } from "./SubstructureViewport";
import { SubstructurePropertyPanel } from "./SubstructurePropertyPanel";
import { CoordinateTable } from "./CoordinateTable";
import { StatusArea } from "./StatusArea";
import type { Support } from "../model";
import styles from "./SubstructurePlanningPage.module.css";

export type ViewMode = "2d" | "3d";
export type PanelState = { left: boolean; right: boolean; bottom: boolean };

export interface ValidationSummary {
  fatalCount: number;
  warningCount: number;
  infoCount: number;
  messages: string[];
}

export interface PlanningPageProps {
  supports: readonly Support[];
  /** 配置スナップショット（supportId → 座標） */
  coordinates: ReadonlyMap<string, { x: number; y: number; z: number }>;
  selectedSupportId?: string | null;
  onSelectSupport?: (supportId: string | null) => void;
  /** M2-07 で接続する Undo/Redo */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  validation?: ValidationSummary;
  toolbarExtra?: React.ReactNode;
}

export function SubstructurePlanningPage(props: PlanningPageProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [panels, setPanels] = useState<PanelState>({ left: true, right: true, bottom: true });
  const [hoveredSupportId, setHoveredSupportId] = useState<string | null>(null);

  const togglePanel = useCallback((key: keyof PanelState) => {
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selected = useMemo(
    () => props.supports.find((s) => s.supportId === props.selectedSupportId) ?? null,
    [props.supports, props.selectedSupportId],
  );

  const primaryName = selected ? selected.supportId : (t.noSelection ?? "（未選択）");

  return (
    <div className={styles.page} data-testid="substructure-planning-page">
      <SubstructureToolbar
        title={t.pageTitle ?? "下部工計画"}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        panels={panels}
        onTogglePanel={togglePanel}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
        canUndo={props.canUndo}
        canRedo={props.canRedo}
        extra={props.toolbarExtra}
      />
      <div className={styles.body}>
        {panels.left && (
          <aside className={styles.left} data-testid="panel-tree">
            <SubstructureTreePanel
              supports={props.supports}
              selectedSupportId={props.selectedSupportId}
              hoveredSupportId={hoveredSupportId}
              onSelect={props.onSelectSupport}
              onHover={setHoveredSupportId}
            />
          </aside>
        )}
        <main className={styles.center} data-testid="viewport">
          <SubstructureViewport
            viewMode={viewMode}
            supports={props.supports}
            coordinates={props.coordinates}
            selectedSupportId={props.selectedSupportId}
            onSelect={props.onSelectSupport}
          />
        </main>
        {panels.right && (
          <aside className={styles.right} data-testid="panel-properties">
            <SubstructurePropertyPanel
              selected={selected}
              coordinates={
                selected ? props.coordinates.get(selected.supportId) : undefined
              }
            />
          </aside>
        )}
      </div>
      {panels.bottom && (
        <section className={styles.bottom} data-testid="panel-bottom">
          <CoordinateTable
            supports={props.supports}
            coordinates={props.coordinates}
            selectedSupportId={props.selectedSupportId}
            onSelect={props.onSelectSupport}
          />
        </section>
      )}
      <StatusArea
        primaryName={primaryName}
        validation={props.validation}
      />
    </div>
  );
}
