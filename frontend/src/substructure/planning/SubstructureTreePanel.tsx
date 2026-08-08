// Phase C1 (M2-02) 左ペイン: 部材ツリー
import { ja } from "../../i18n/ja";
import type { Support } from "../model";
import styles from "./SubstructurePlanningPage.module.css";

export interface SubstructureTreePanelProps {
  supports: readonly Support[];
  selectedSupportId?: string | null;
  hoveredSupportId?: string | null;
  onSelect?: (supportId: string) => void;
  onHover?: (supportId: string | null) => void;
}

const TYPE_LABEL: Record<string, string> = {
  pier: "橋脚",
  abutment: "橋台",
};

export function SubstructureTreePanel(props: SubstructureTreePanelProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  return (
    <div data-testid="tree-panel">
      <div className={styles.panelHeader}>
        <span>{t.treeTitle ?? "部材"}</span>
      </div>
      {props.supports.length === 0 ? (
        <div className={styles.emptyNotice}>
          {t.emptyTree ?? "支点がありません"}
        </div>
      ) : (
        <ul className={styles.treeList}>
          {props.supports.map((s) => {
            const cls = [
              styles.treeItem,
              props.selectedSupportId === s.supportId ? styles.selected : "",
              props.hoveredSupportId === s.supportId ? styles.hovered : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li
                key={s.supportId}
                className={cls}
                data-testid={`tree-item-${s.supportId}`}
                onClick={() => props.onSelect?.(s.supportId)}
                onMouseEnter={() => props.onHover?.(s.supportId)}
                onMouseLeave={() => props.onHover?.(null)}
              >
                <span>{s.supportId}</span>
                <span className={styles.treeItemType}>
                  {TYPE_LABEL[s.supportType] ?? s.supportType}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
