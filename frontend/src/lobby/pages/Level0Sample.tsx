import { L0_STRINGS } from "../data/lobbyStrings";
import { BackToLobbyButton } from "../components/BackToLobbyButton";
import styles from "./LearnTop.module.css";

type Level0SampleProps = {
  sampleId: string;
  onNavigate: (path: string) => void;
};

export function Level0Sample({ sampleId, onNavigate }: Level0SampleProps) {
  const sample = L0_STRINGS.level0.samples.find(({ target }) => (
    new URL(target, "http://localhost").searchParams.get("sample") === sampleId
  ));
  const detail = L0_STRINGS.level0Detail;

  if (!sample) {
    return (
      <div className={styles.page}>
        <BackToLobbyButton onClick={() => onNavigate("/level0")} label={detail.backButton} />
        <h1 className={styles.title}>サンプルが見つかりません</h1>
        <p className={styles.intro}>指定されたサンプルは利用できません。</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <BackToLobbyButton onClick={() => onNavigate("/level0")} label={detail.backButton} />
      <p className={styles.notice}>{detail.heading}</p>
      <h1 className={styles.title}>{sample.name}</h1>
      <p className={styles.intro}>{sample.overview}</p>
      <section className={styles.card}>
        <h3>{detail.learningPoints}</h3>
        <ul>
          {sample.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      </section>
      <p className={styles.notice}>{detail.status}</p>
    </div>
  );
}
