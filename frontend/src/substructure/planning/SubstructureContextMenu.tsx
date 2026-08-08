// Phase C1 (M2-07) 部材コンテキストメニュー
// P03.5: 右クリックで選択対象に応じたメニュー。
import { useEffect, useRef, useState } from "react";

export interface ContextMenuItem {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function SubstructureContextMenu(props: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        props.onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [props]);

  return (
    <div
      ref={ref}
      className="substructure-context-menu"
      data-testid="substructure-context-menu"
      style={{
        position: "fixed",
        left: props.x,
        top: props.y,
        zIndex: 1000,
        background: "#1d2b45",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: 4,
        minWidth: 160,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {props.items.map((item) => (
        <button
          key={item.id}
          type="button"
          data-testid={`context-menu-${item.id}`}
          disabled={item.disabled}
          onClick={() => {
            item.onSelect();
            props.onClose();
          }}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "6px 10px",
            background: "transparent",
            border: "none",
            borderRadius: 6,
            color: item.danger ? "#fca5a5" : "#f1f5f9",
            fontSize: 13,
            cursor: item.disabled ? "not-allowed" : "pointer",
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  return {
    menu,
    openMenu: (x: number, y: number, items: ContextMenuItem[]) => setMenu({ x, y, items }),
    closeMenu: () => setMenu(null),
  };
}
