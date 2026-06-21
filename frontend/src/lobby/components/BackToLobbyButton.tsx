import { L0_STRINGS } from "../data/lobbyStrings";

type BackToLobbyButtonProps = {
  onClick: () => void;
  label?: string;
};

export function BackToLobbyButton({ onClick, label }: BackToLobbyButtonProps) {
  return (
    <button type="button" className="lobby-back-button" onClick={onClick}>
      {label || L0_STRINGS.learnTop.backToLobby}
    </button>
  );
}
