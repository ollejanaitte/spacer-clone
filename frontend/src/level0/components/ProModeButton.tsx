type ProModeButtonProps = {
  onClick: () => void;
};

export function ProModeButton({ onClick }: ProModeButtonProps) {
  return (
    <button type="button" className="level0-pro-button" onClick={onClick}>
      プロモードで開く
    </button>
  );
}
