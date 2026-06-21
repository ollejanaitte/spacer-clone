import { useEffect, useState } from "react";
import { L0_STRINGS } from "../data/lobbyStrings";
import { BackToLobbyButton } from "../components/BackToLobbyButton";
import { DefaultModeCheckbox } from "../components/DefaultModeCheckbox";
import { LearnLinkCard } from "../components/LearnLinkCard";
import { loadLearnLinks, type LearnLink } from "../services/learnLinksLoader";
import { getUiModeDefault, setUiModeDefault } from "../services/uiModeDefault";
import styles from "./LearnTop.module.css";

type LearnTopProps = {
  onNavigate: (path: string) => void;
};

export function LearnTop({ onNavigate }: LearnTopProps) {
  const text = L0_STRINGS.learnTop;
  const [links, setLinks] = useState<LearnLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(() => getUiModeDefault() === "learn");

  useEffect(() => {
    loadLearnLinks()
      .then((data) => setLinks(data.links))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load links"));
  }, []);

  const handleDefaultChange = (checked: boolean) => {
    setIsDefault(checked);
    setUiModeDefault(checked ? "learn" : null);
  };

  return (
    <div className={styles.page}>
      <BackToLobbyButton onClick={() => onNavigate("/")} />
      <h1 className={styles.title}>{text.title}</h1>
      <p className={styles.intro}>{text.intro}</p>
      <p className={styles.notice}>{text.externalNotice}</p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.links}>
        {links.map((link) => (
          <LearnLinkCard
            key={link.id}
            title={link.title}
            description={link.description}
            url={link.url}
          />
        ))}
      </div>
      <DefaultModeCheckbox mode="learn" checked={isDefault} onChange={handleDefaultChange} />
    </div>
  );
}
