import { useEffect, useState } from "react";
import { L0_STRINGS } from "../data/lobbyStrings";
import { BackToLobbyButton } from "../components/BackToLobbyButton";
import { DefaultModeCheckbox } from "../components/DefaultModeCheckbox";
import { LearnLinkCard } from "../components/LearnLinkCard";
import { loadLearnLinks, type LearnLink } from "../services/learnLinksLoader";
import { getUiModeDefault, setUiModeDefault } from "../services/uiModeDefault";

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
    <div className="lobby-learn-top">
      <BackToLobbyButton onClick={() => onNavigate("/")} />
      <h1>{text.title}</h1>
      <p className="lobby-learn-intro">{text.intro}</p>
      <p className="lobby-learn-notice">{text.externalNotice}</p>
      {error && <p className="lobby-learn-error">{error}</p>}
      <div className="lobby-learn-links">
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
