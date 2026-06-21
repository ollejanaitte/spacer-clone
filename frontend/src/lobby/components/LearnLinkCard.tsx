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
      className="lobby-learn-link-card"
      aria-label={`${title} - 外部サイトへ移動します`}
    >
      <span className="lobby-learn-link-title">{title}</span>
      <span className="lobby-learn-link-description">{description}</span>
    </a>
  );
}
