type RestoreBannerProps = { onRestore: () => void; onDismiss: () => void };

export function RestoreBanner({ onRestore, onDismiss }: RestoreBannerProps) {
  return (
    <div className="level0-restore-banner">
      <span>前回のつづきから始めますか？</span>
      <button type="button" onClick={onRestore}>つづきから</button>
      <button type="button" onClick={onDismiss}>最初から</button>
    </div>
  );
}
