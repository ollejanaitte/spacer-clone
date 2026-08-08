// Phase C1 (M2-02) 左ペイン: 部材ツリー
import { useState } from "react";
import { ja } from "../../i18n/ja";
import type { Support } from "../model";
import {
  SubstructureContextMenu,
  useContextMenu,
  type ContextMenuItem,
} from "./SubstructureContextMenu";
import styles from "./SubstructurePlanningPage.module.css";

export interface SubstructureTreePanelProps {
  supports: readonly Support[];
  selectedSupportId?: string | null;
  hoveredSupportId?: string | null;
  onSelect?: (supportId: string) => void;
  onHover?: (supportId: string | null) => void;
  /** M2-07: コンテキストメニュー操作 */
  onDeleteSupport?: (supportId: string) => void;
  onDuplicateSupport?: (supportId: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  pier: "橋脚",
  abutment: "橋台",
};

export function SubstructureTreePanel(props: SubstructureTreePanelProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const { menu, openMenu, closeMenu } = useContextMenu();
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const openContextMenu = (e: React.MouseEvent, supportId: string) => {
    e.preventDefault();
    setMenuFor(supportId);
    const items: ContextMenuItem[] = [
      {
        id: "delete",
        label: t.menuDelete ?? "削除",
        danger: true,
        disabled: !props.onDeleteSupport,
        onSelect: () => props.onDeleteSupport?.(supportId),
      },
      {
        id: "duplicate",
        label: t.menuDuplicate ?? "複製",
        disabled: !props.onDuplicateSupport,
        onSelect: () => props.onDuplicateSupport?.(supportId),
      },
    ];
    openMenu(e.clientX, e.clientY, items);
  };

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
                onContextMenu={(e) => openContextMenu(e, s.supportId)}
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
      {menu && menuFor && (
        <SubstructureContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={() => {
            closeMenu();
            setMenuFor(null);
          }}
        />
      )}
    </div>
  );
}
