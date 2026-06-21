import { L0_STRINGS } from "../data/level0Strings";

type HomeProps = {
  onShake: () => void;
  onOpenProMode: () => void;
};

export function Home({ onShake, onOpenProMode }: HomeProps) {
  const text = L0_STRINGS.home;

  return (
    <div className="level0-home">
      <h1>{text.title}</h1>
      <div className="level0-cards">
        <button
          type="button"
          className="level0-card level0-card-main"
          onClick={onShake}
        >
          <span className="level0-card-title">{text.mainCardTitle}</span>
          <span className="level0-card-sub">{text.mainCardSub}</span>
        </button>
        <div className="level0-card level0-card-disabled">
          <span>{text.cardBridge}</span>
        </div>
        <div className="level0-card level0-card-disabled">
          <span>{text.cardBuilding}</span>
        </div>
        <div className="level0-card level0-card-disabled">
          <span>{text.cardSample}</span>
        </div>
      </div>
      <button
        type="button"
        className="level0-pro-button"
        onClick={onOpenProMode}
      >
        {text.proModeButton}
      </button>
    </div>
  );
}
