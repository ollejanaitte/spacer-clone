import { useState } from "react";
import { ClipboardPaste, Copy, Plus } from "lucide-react";

type LineMasterToolbarProps = {
  canCopyFromPreviousBridge: boolean;
  onAddLine: () => void;
  onImportCsv: (text: string) => void;
  onCopyFromPreviousBridge: () => void;
};

export function LineMasterToolbar({
  canCopyFromPreviousBridge,
  onAddLine,
  onImportCsv,
  onCopyFromPreviousBridge,
}: LineMasterToolbarProps) {
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvText, setCsvText] = useState("");

  const handleApplyCsv = () => {
    onImportCsv(csvText);
    setCsvText("");
    setCsvDialogOpen(false);
  };

  const handleCopy = () => {
    if (
      !window.confirm(
        "同一プロジェクト内の前橋梁から基準ライン設定と橋軸線一覧をコピーします。よろしいですか？",
      )
    ) {
      return;
    }
    onCopyFromPreviousBridge();
  };

  return (
    <div className="line-master-toolbar" data-testid="line-master-toolbar">
      <button type="button" onClick={onAddLine} data-testid="line-master-add-row">
        <Plus size={16} aria-hidden="true" />
        行追加
      </button>
      <button
        type="button"
        disabled={!canCopyFromPreviousBridge}
        onClick={handleCopy}
        data-testid="line-master-copy-from-bridge"
      >
        <Copy size={16} aria-hidden="true" />
        前橋梁からコピー
      </button>
      <button type="button" onClick={() => setCsvDialogOpen(true)} data-testid="line-master-csv-open">
        <ClipboardPaste size={16} aria-hidden="true" />
        CSV貼り付け
      </button>

      {csvDialogOpen && (
        <div
          className="importer-help-backdrop"
          role="presentation"
          onClick={() => setCsvDialogOpen(false)}
          data-testid="line-master-csv-backdrop"
        >
          <section
            className="line-master-csv-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="line-master-csv-title"
            onClick={(event) => event.stopPropagation()}
            data-testid="line-master-csv-dialog"
          >
            <header>
              <h3 id="line-master-csv-title">CSV貼り付け</h3>
            </header>
            <p>1行1橋軸線として貼り付けてください。</p>
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={8}
              placeholder={"CL\nG1\nG2\nHL1"}
              data-testid="line-master-csv-textarea"
            />
            <footer>
              <button type="button" onClick={() => setCsvDialogOpen(false)}>
                キャンセル
              </button>
              <button type="button" onClick={handleApplyCsv} data-testid="line-master-csv-apply">
                貼り付け
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
