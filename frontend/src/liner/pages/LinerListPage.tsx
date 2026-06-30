import { ArrowLeft, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { ja } from "../../i18n/ja";
import type { ProjectModel } from "../../types";

export type LinerListPageProps = {
  project: ProjectModel;
  onClose: () => void;
  onCreate: () => void;
  onOpenSetup: () => void;
  onDelete: (modelId: string) => void;
};

type LinerListItem = {
  modelId: string;
  coordinatePolicyId: string;
  sourceRevision: string;
  intermediateSchemaVersion: string;
  generatedAt: string | null;
  traceCount: number;
};

function buildListItems(project: ProjectModel): LinerListItem[] {
  if (!project.liner) {
    return [];
  }

  return [
    {
      modelId: project.liner.linerModelId,
      coordinatePolicyId: project.liner.coordinatePolicyId,
      sourceRevision: project.liner.sourceRevision,
      intermediateSchemaVersion: project.liner.intermediateSchemaVersion,
      generatedAt: project.liner.generatedAt ?? null,
      traceCount: project.linerTrace?.length ?? 0,
    },
  ];
}

function formatGeneratedAt(value: string | null): string {
  if (!value) {
    return ja.liner.list.notGenerated;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString("ja-JP");
}

export function LinerListPage({
  project,
  onClose,
  onCreate,
  onOpenSetup,
  onDelete,
}: LinerListPageProps) {
  const items = buildListItems(project);

  return (
    <main className="liner-list-page" data-testid="liner-list-page">
      <header className="liner-list-header">
        <div>
          <h1>{ja.liner.list.title}</h1>
          <p>{ja.liner.list.lead}</p>
        </div>
        <div className="liner-list-header-actions">
          <button type="button" onClick={onClose} data-testid="close-liner-list">
            <ArrowLeft size={16} />
            {ja.liner.list.close}
          </button>
          <button type="button" onClick={onCreate} data-testid="create-liner">
            <FilePlus2 size={16} />
            {ja.liner.list.create}
          </button>
        </div>
      </header>

      <section className="liner-list-content" aria-label={ja.liner.list.tableCaption}>
        {items.length === 0 ? (
          <div className="liner-list-empty" data-testid="liner-list-empty">
            <h2>{ja.liner.list.emptyTitle}</h2>
            <p>{ja.liner.list.emptyDescription}</p>
            <button type="button" onClick={onCreate}>
              <FilePlus2 size={16} />
              {ja.liner.list.create}
            </button>
          </div>
        ) : (
          <div className="liner-list-table-wrap">
            <table className="liner-list-table">
              <caption>{ja.liner.list.tableCaption}</caption>
              <thead>
                <tr>
                  <th>{ja.liner.list.columns.modelId}</th>
                  <th>{ja.liner.list.columns.coordinatePolicy}</th>
                  <th>{ja.liner.list.columns.sourceRevision}</th>
                  <th>{ja.liner.list.columns.intermediateVersion}</th>
                  <th>{ja.liner.list.columns.generatedAt}</th>
                  <th>{ja.liner.list.columns.traceCount}</th>
                  <th>{ja.liner.list.columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.modelId}>
                    <td>
                      <strong>{item.modelId}</strong>
                      <span className="liner-list-badge">{ja.liner.list.attachedBadge}</span>
                    </td>
                    <td>{item.coordinatePolicyId}</td>
                    <td className="liner-list-mono">{item.sourceRevision}</td>
                    <td>{item.intermediateSchemaVersion}</td>
                    <td>{formatGeneratedAt(item.generatedAt)}</td>
                    <td>{ja.liner.list.traceCount(item.traceCount)}</td>
                    <td>
                      <button type="button" onClick={onOpenSetup} data-testid="open-liner-setup">
                        <Pencil size={16} />
                        {ja.liner.list.openSetup}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.modelId)}
                        data-testid="delete-liner-model"
                        title={ja.liner.list.delete}
                      >
                        <Trash2 size={16} />
                        {ja.liner.list.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
