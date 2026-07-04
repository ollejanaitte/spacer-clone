import { useState } from "react";

export type SectionListToolbarProps = {
  onAddSection: () => void;
  onDuplicatePrevious: () => void;
  onBulkCreate: (startPage: number, endPage: number) => void;
};

export function SectionListToolbar({
  onAddSection,
  onDuplicatePrevious,
  onBulkCreate,
}: SectionListToolbarProps) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("10");

  const handleBulkSubmit = () => {
    const start = Number(startPage);
    const end = Number(endPage);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return;
    }
    onBulkCreate(Math.trunc(start), Math.trunc(end));
    setBulkOpen(false);
  };

  return (
    <div className="section-list-toolbar" data-testid="section-list-toolbar">
      <button type="button" onClick={onAddSection} data-testid="section-list-add">
        横断面追加
      </button>
      <button
        type="button"
        onClick={onDuplicatePrevious}
        data-testid="section-list-duplicate-previous"
      >
        前ページ複製
      </button>
      <button
        type="button"
        onClick={() => setBulkOpen((open) => !open)}
        data-testid="section-list-bulk-open"
      >
        PDFページ番号一括作成
      </button>

      {bulkOpen && (
        <dialog open className="section-list-bulk-dialog" data-testid="section-list-bulk-dialog">
          <p>PDF ページ番号の範囲を指定してください。</p>
          <label>
            開始
            <input
              type="number"
              min={1}
              value={startPage}
              onChange={(event) => setStartPage(event.target.value)}
              data-testid="section-list-bulk-start"
            />
          </label>
          <label>
            終了
            <input
              type="number"
              min={1}
              value={endPage}
              onChange={(event) => setEndPage(event.target.value)}
              data-testid="section-list-bulk-end"
            />
          </label>
          <footer>
            <button type="button" onClick={() => setBulkOpen(false)}>
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleBulkSubmit}
              data-testid="section-list-bulk-submit"
            >
              作成
            </button>
          </footer>
        </dialog>
      )}
    </div>
  );
}
