import { L0_STRINGS } from "../data/lobbyStrings";
import { BackToLobbyButton } from "../components/BackToLobbyButton";
import styles from "./LearnTop.module.css";

type Level0LessonDetailProps = {
  lessonId: string;
  onNavigate: (path: string) => void;
};

export function Level0LessonDetail({ lessonId, onNavigate }: Level0LessonDetailProps) {
  const lesson = L0_STRINGS.level0Lesson.lessons.find(({ id }) => id === lessonId);
  const detail = L0_STRINGS.level0LessonDetail;

  return (
    <div className={styles.page}>
      <BackToLobbyButton onClick={() => onNavigate("/level0/lesson")} label={detail.backButton} />
      {lesson ? (
        <>
          <h1 className={styles.title}>{lesson.title}</h1>
          <p className={styles.intro}>{lesson.content}</p>
        </>
      ) : (
        <>
          <h1 className={styles.title}>教材が見つかりません</h1>
          <p className={styles.intro}>指定された教材は利用できません。</p>
        </>
      )}
    </div>
  );
}
