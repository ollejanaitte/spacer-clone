import { L0_STRINGS } from "../data/lobbyStrings";
import { ModeCard } from "../components/ModeCard";

type LobbyHomeProps = {
  onNavigate: (path: string) => void;
};

export function LobbyHome({ onNavigate }: LobbyHomeProps) {
  const text = L0_STRINGS.lobby;

  return (
    <div className="lobby-home">
      <h1>{text.title}</h1>
      <p className="lobby-subtitle">{text.subtitle}</p>
      <div className="lobby-mode-cards">
        <ModeCard
          icon={text.modes.learn.icon}
          name={text.modes.learn.name}
          catchPhrase={text.modes.learn.catch}
          description={text.modes.learn.description}
          audience={text.modes.learn.audience}
          button={text.modes.learn.button}
          onClick={() => onNavigate("/learn")}
        />
        <ModeCard
          icon={text.modes.level0.icon}
          name={text.modes.level0.name}
          catchPhrase={text.modes.level0.catch}
          description={text.modes.level0.description}
          audience={text.modes.level0.audience}
          button={text.modes.level0.button}
          onClick={() => onNavigate("/level0")}
        />
        <ModeCard
          icon={text.modes.pro.icon}
          name={text.modes.pro.name}
          catchPhrase={text.modes.pro.catch}
          description={text.modes.pro.description}
          audience={text.modes.pro.audience}
          button={text.modes.pro.button}
          onClick={() => onNavigate("/pro")}
        />
      </div>
      <p className="lobby-footer">{text.footer}</p>
    </div>
  );
}
