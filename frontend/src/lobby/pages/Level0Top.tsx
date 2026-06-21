import { L0_STRINGS } from "../data/lobbyStrings";
import { ModeCard } from "../components/ModeCard";
import styles from "./LobbyHome.module.css";

type Level0TopProps = {
  onNavigate: (path: string) => void;
};

export function Level0Top({ onNavigate }: Level0TopProps) {
  const text = L0_STRINGS.level0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{text.title}</h1>
      <p className={styles.subtitle}>{text.subtitle}</p>
      <div className={styles.cards}>
        {text.samples.map((sample) => (
          <ModeCard
            key={sample.id}
            icon={sample.icon}
            name={sample.name}
            catchPhrase={sample.catch}
            description={sample.description}
            audience={sample.audience}
            button={sample.button}
            onClick={() => onNavigate(sample.target)}
          />
        ))}
        <ModeCard
          icon={text.lesson.icon}
          name={text.lesson.name}
          catchPhrase={text.lesson.catch}
          description={text.lesson.description}
          audience={text.lesson.audience}
          button={text.lesson.button}
          onClick={() => onNavigate("/level0/lesson")}
        />
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.proLink}
          onClick={() => onNavigate("/pro")}
        >
          {text.proLink}
        </button>
      </div>
    </div>
  );
}
