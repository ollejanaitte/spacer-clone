import { Database, FilePlus2 } from "lucide-react";
import { ja } from "../../../i18n/ja";
import { defaultImporterProjectService } from "../ImporterProjectService";

export type ImporterStartupPageProps = {
  onBack: () => void;
  onOpenProject: (projectId: string, bridgeId: string) => void;
};

export function ImporterStartupPage({ onBack, onOpenProject }: ImporterStartupPageProps) {
  const service = defaultImporterProjectService;

  const handleUseSample = () => {
    const project = service.createBuiltInSampleProject();
    const bridge = project.bridges[0];
    if (!bridge) {
      return;
    }
    onOpenProject(project.id, bridge.id);
  };

  const handleStartEmpty = () => {
    const created = service.createEmptyProject();
    const withBridge = service.createBridge(created.id, "新規橋梁");
    const bridge = withBridge.bridges[0];
    if (!bridge) {
      return;
    }
    onOpenProject(withBridge.id, bridge.id);
  };

  return (
    <main className="importer-startup-page" data-testid="importer-startup-page">
      <header className="importer-startup-header">
        <div>
          <h1>{ja.liner.importer.startup.title}</h1>
          <p>{ja.liner.importer.startup.lead}</p>
        </div>
        <button type="button" onClick={onBack} data-testid="importer-startup-back">
          {ja.liner.importer.startup.back}
        </button>
      </header>

      <section className="importer-startup-cards" aria-label={ja.liner.importer.startup.cardsLabel}>
        <button
          type="button"
          className="importer-startup-card"
          onClick={handleUseSample}
          data-testid="importer-startup-use-sample"
        >
          <Database size={28} aria-hidden />
          <h2>{ja.liner.importer.startup.sampleTitle}</h2>
          <p>{ja.liner.importer.startup.sampleDescription}</p>
        </button>
        <button
          type="button"
          className="importer-startup-card"
          onClick={handleStartEmpty}
          data-testid="importer-startup-start-empty"
        >
          <FilePlus2 size={28} aria-hidden />
          <h2>{ja.liner.importer.startup.emptyTitle}</h2>
          <p>{ja.liner.importer.startup.emptyDescription}</p>
        </button>
      </section>

      <p className="importer-startup-note" data-testid="importer-startup-note">
        {ja.liner.importer.startup.note}
      </p>
    </main>
  );
}
