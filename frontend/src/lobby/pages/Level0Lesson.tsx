import { L0_STRINGS } from "../data/lobbyStrings";
import { BackToLobbyButton } from "../components/BackToLobbyButton";
import styles from "./LearnTop.module.css";

type Level0LessonProps = {
  onNavigate: (path: string) => void;
};

export function Level0Lesson({ onNavigate }: Level0LessonProps) {
  const text = L0_STRINGS.level0Lesson;

  return (
    <div className={styles.page}>
      <BackToLobbyButton onClick={() => onNavigate("/level0")} label={text.backButton} />
      <h1 className={styles.title}>{text.title}</h1>
      <p className={styles.intro}>{text.intro}</p>
      <div className={styles.links}>
        {text.lessons.map((lesson) => (
          <div key={lesson.id} className={styles.card}>
            <h3>{lesson.title}</h3>
            <p>{lesson.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
