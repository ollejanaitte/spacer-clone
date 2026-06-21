import styles from "./ModeCard.module.css";

type ModeCardProps = {
  icon: string;
  name: string;
  catchPhrase: string;
  description: string;
  audience: string;
  button: string;
  onClick: () => void;
};

export function ModeCard({ icon, name, catchPhrase, description, audience, button, onClick }: ModeCardProps) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.name}>{name}</span>
      <span className={styles.catch}>{catchPhrase}</span>
      <span className={styles.description}>{description}</span>
      <span className={styles.audience}>{audience}</span>
      <span className={styles.button}>{button}</span>
    </button>
  );
}
