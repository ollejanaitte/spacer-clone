import { ArrowLeft, FileText, PencilLine } from "lucide-react";
import { ja } from "../../i18n/ja";

export type LinerLauncherPageProps = {
  onClose: () => void;
  onOpenGui: () => void;
  onOpenImporter: () => void;
};

export function LinerLauncherPage({ onClose, onOpenGui, onOpenImporter }: LinerLauncherPageProps) {
  return (
    <main className="liner-launcher-page" data-testid="liner-launcher-page">
      <header className="liner-launcher-header">
        <div>
          <h1>{ja.liner.launcher.title}</h1>
          <p>{ja.liner.launcher.lead}</p>
        </div>
        <button type="button" onClick={onClose} data-testid="close-liner-launcher">
          <ArrowLeft size={16} />
          {ja.liner.launcher.close}
        </button>
      </header>

      <section className="liner-launcher-cards" aria-label={ja.liner.launcher.cardsLabel}>
        <button
          type="button"
          className="liner-launcher-card"
          onClick={onOpenGui}
          data-testid="liner-launcher-gui"
        >
          <PencilLine size={28} aria-hidden />
          <h2>{ja.liner.launcher.guiTitle}</h2>
          <p>{ja.liner.launcher.guiDescription}</p>
        </button>
        <button
          type="button"
          className="liner-launcher-card"
          onClick={onOpenImporter}
          data-testid="liner-launcher-pdf"
        >
          <FileText size={28} aria-hidden />
          <h2>{ja.liner.launcher.pdfTitle}</h2>
          <p>{ja.liner.launcher.pdfDescription}</p>
        </button>
      </section>
    </main>
  );
}
