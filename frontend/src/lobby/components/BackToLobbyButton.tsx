import { L0_STRINGS } from "../data/lobbyStrings";

type BackToLobbyButtonProps = {
  onClick: () => void;
};

export function BackToLobbyButton({ onClick }: BackToLobbyButtonProps) {
  return (
    <button type="button" className="lobby-back-button" onClick={onClick}>
      {L0_STRINGS.learnTop.backToLobby}
    </button>
  );
}
