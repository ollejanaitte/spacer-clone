import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { ja } from "../../i18n/ja";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import { exportRoadReportsFromDraft } from "../exports/roadReportExport";

export type LinerRoadExportControlsProps = {
  draft: LinerDraft;
  projectName: string;
  testIdPrefix?: string;
};

export function LinerRoadExportControls({
  draft,
  projectName,
  testIdPrefix = "liner-road-export",
}: LinerRoadExportControlsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = (mode: "html" | "csv") => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const result = exportRoadReportsFromDraft(draft, projectName, mode);
      if (!result.ok) {
        setMessage(
          result.reason === "stale_source_revision"
            ? ja.liner.reportExport.blockedStaleRevision
            : ja.liner.reportExport.blockedErrors,
        );
        return;
      }
      setMessage(mode === "html" ? ja.liner.reportExport.successHtml : ja.liner.reportExport.successCsv);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="liner-road-export-controls" aria-labelledby={`${testIdPrefix}-title`}>
      <h2 id={`${testIdPrefix}-title`}>{ja.liner.reportExport.sectionTitle}</h2>
      <div className="liner-road-export-actions">
        <button
          type="button"
          data-testid={`${testIdPrefix}-html`}
          disabled={busy}
          onClick={() => handleExport("html")}
        >
          <FileText size={14} />
          {ja.liner.reportExport.exportHtml}
        </button>
        <button
          type="button"
          data-testid={`${testIdPrefix}-csv`}
          disabled={busy}
          onClick={() => handleExport("csv")}
        >
          <Download size={14} />
          {ja.liner.reportExport.exportCsv}
        </button>
      </div>
      {message ? <p data-testid={`${testIdPrefix}-message`}>{message}</p> : null}
    </section>
  );
}
