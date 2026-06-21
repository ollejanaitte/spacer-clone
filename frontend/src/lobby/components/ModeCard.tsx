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
    <button type="button" className="lobby-mode-card" onClick={onClick}>
      <span className="lobby-mode-icon">{icon}</span>
      <span className="lobby-mode-name">{name}</span>
      <span className="lobby-mode-catch">{catchPhrase}</span>
      <span className="lobby-mode-description">{description}</span>
      <span className="lobby-mode-audience">{audience}</span>
      <span className="lobby-mode-button">{button}</span>
    </button>
  );
}
