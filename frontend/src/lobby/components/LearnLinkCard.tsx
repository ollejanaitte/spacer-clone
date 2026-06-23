import styles from "./LearnLinkCard.module.css";

type LearnLinkCardProps = {
  title: string;
  description: string;
  url: string;
};

export function LearnLinkCard({ title, description, url }: LearnLinkCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
      aria-label={`${title} - 外部サイトへ移動します`}
    >
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
    </a>
  );
}
