// Phase C1 (M2-02) 右ペイン: プロパティパネル
// M2-03 で入力フォームを slot に埋める。ここでは選択部材の基本情報 + slot を確定。
import { ja } from "../../i18n/ja";
import type { Support } from "../model";
import styles from "./SubstructurePlanningPage.module.css";

export interface SubstructurePropertyPanelProps {
  selected: Support | null;
  coordinates?: { x: number; y: number; z: number };
}

export function SubstructurePropertyPanel(props: SubstructurePropertyPanelProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const s = props.selected;
  return (
    <div data-testid="property-panel">
      <div className={styles.panelHeader}>
        <span>{s ? s.supportId : t.noSelection ?? "未選択"}</span>
        {s && <span className={styles.treeItemType}>{s.supportType}</span>}
      </div>
      {!s ? (
        <div className={styles.emptyNotice}>
          {t.selectSupportHint ?? "左のツリーまたはビューポートで支点を選択してください"}
        </div>
      ) : (
        <>
          <section className={styles.propertySection}>
            <div className={styles.propertySectionTitle}>
              {t.placement ?? "配置"}
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>{t.station ?? "測点"}</span>
              <span className={styles.propertyValue}>
                {s.placement.station !== undefined ? `${s.placement.station.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>{t.offset ?? "オフセット"}</span>
              <span className={styles.propertyValue}>
                {s.placement.offset !== undefined ? `${s.placement.offset.toFixed(2)}` : "—"}
              </span>
            </div>
            {props.coordinates && (
              <>
                <div className={styles.propertyRow}>
                  <span className={styles.propertyKey}>X</span>
                  <span className={styles.propertyValue}>
                    {props.coordinates.x.toFixed(2)}
                  </span>
                </div>
                <div className={styles.propertyRow}>
                  <span className={styles.propertyKey}>Y</span>
                  <span className={styles.propertyValue}>
                    {props.coordinates.y.toFixed(2)}
                  </span>
                </div>
                <div className={styles.propertyRow}>
                  <span className={styles.propertyKey}>Z</span>
                  <span className={styles.propertyValue}>
                    {props.coordinates.z.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </section>
          <section className={styles.propertySection}>
            <div className={styles.propertySectionTitle}>
              {t.structureType ?? "構造形式"}
            </div>
            <div className={styles.propertyRow}>
              <span className={styles.propertyKey}>{t.formType ?? "形式"}</span>
              <span className={styles.propertyValue}>
                {s.supportType === "pier"
                  ? s.pier?.formType
                  : s.supportType === "abutment"
                    ? s.abutment?.formType
                    : "—"}
              </span>
            </div>
          </section>
          <section className={styles.propertySection}>
            <div className={styles.slotNotice}>
              {t.formSlotNotice ?? "入力フォームは M2-03 で実装予定"}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
