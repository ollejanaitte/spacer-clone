export type SectionNavigationProps = {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

export function SectionNavigation({
  currentIndex,
  total,
  onPrev,
  onNext,
}: SectionNavigationProps) {
  return (
    <nav className="section-navigation" data-testid="section-navigation">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentIndex <= 0}
        data-testid="section-nav-prev"
      >
        前の横断面 (Alt+←)
      </button>
      <span data-testid="section-nav-indicator">
        {total === 0 ? 0 : currentIndex + 1} / {total}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex < 0 || currentIndex >= total - 1}
        data-testid="section-nav-next"
      >
        次の横断面 (Alt+→)
      </button>
    </nav>
  );
}
