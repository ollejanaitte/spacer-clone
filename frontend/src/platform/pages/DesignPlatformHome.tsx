import { useCallback } from "react";
import { ja } from "../../i18n/ja";
import styles from "./DesignPlatformHome.module.css";

export type DesignPlatformHomeProps = {
  onNavigate: (path: string) => void;
  onOpenQuickAnalysis: () => void;
};

export function DesignPlatformHome({
  onNavigate,
  onOpenQuickAnalysis,
}: DesignPlatformHomeProps) {
  const text = ja.designPlatform.home;

  const openBusinessEntry = useCallback(() => {
    onNavigate("/pro/platform/businesses");
  }, [onNavigate]);

  const openQuickAnalysis = useCallback(() => {
    onOpenQuickAnalysis();
  }, [onOpenQuickAnalysis]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{text.title}</h1>
      <p className={styles.subtitle}>{text.subtitle}</p>
      <div className={styles.cards}>
        <button
          type="button"
          className={styles.card}
          onClick={openBusinessEntry}
          data-testid="platform-entry-business"
        >
          <span className={styles.cardIcon}>{text.fromBusiness.icon}</span>
          <span className={styles.cardName}>{text.fromBusiness.name}</span>
          <span className={styles.cardCatch}>{text.fromBusiness.catchPhrase}</span>
          <span className={styles.cardDescription}>{text.fromBusiness.description}</span>
          <span className={styles.cardButton}>{text.fromBusiness.button}</span>
        </button>
        <button
          type="button"
          className={styles.card}
          onClick={openQuickAnalysis}
          data-testid="platform-entry-quick-analysis"
        >
          <span className={styles.cardIcon}>{text.quickAnalysis.icon}</span>
          <span className={styles.cardName}>{text.quickAnalysis.name}</span>
          <span className={styles.cardCatch}>{text.quickAnalysis.catchPhrase}</span>
          <span className={styles.cardDescription}>{text.quickAnalysis.description}</span>
          <span className={styles.cardButton}>{text.quickAnalysis.button}</span>
        </button>
      </div>
      <p className={styles.footer}>{text.footer}</p>
    </div>
  );
}
