import { L0_STRINGS } from "../data/level0Strings";

type ProModeButtonProps = {
  onClick: () => void;
  className?: string;
};

export function ProModeButton({ onClick, className = "" }: ProModeButtonProps) {
  return (
    <button
      type="button"
      className={`level0-pro-button ${className}`.trim()}
      onClick={onClick}
    >
      {L0_STRINGS.home.proModeButton}
    </button>
  );
}
