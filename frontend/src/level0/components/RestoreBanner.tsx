import { L0_STRINGS } from "../data/level0Strings";

type RestoreBannerProps = {
  onRestore: () => void;
  onDismiss: () => void;
};

export function RestoreBanner({ onRestore, onDismiss }: RestoreBannerProps) {
  const text = L0_STRINGS.restoreBanner;

  return (
    <div className="level0-restore-banner">
      <span>{text.text}</span>
      <button type="button" onClick={onRestore}>{text.yes}</button>
      <button type="button" onClick={onDismiss}>{text.no}</button>
    </div>
  );
}
