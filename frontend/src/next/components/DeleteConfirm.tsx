import { useState } from "react";

export interface DeleteConfirmProps {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirm({ projectName, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div className="next-modal-overlay" data-testid="delete-confirm-overlay">
      <div className="next-modal" data-testid="delete-confirm">
        <h2 className="next-modal-title">削除の確認</h2>
        <p>
          業務「{projectName}」を完全削除します。この操作は取り消せません。よろしいですか？
        </p>
        <div className="next-form-actions">
          <button
            type="button"
            className="next-danger-strong"
            data-testid="delete-confirm-ok"
            onClick={onConfirm}
          >
            完全削除
          </button>
          <button
            type="button"
            className="next-action-secondary"
            data-testid="delete-confirm-cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

export function useDeleteConfirm() {
  const [pendingName, setPendingName] = useState<string | null>(null);

  function requestDelete(name: string) {
    setPendingName(name);
  }

  function cancel() {
    setPendingName(null);
  }

  return { pendingName, requestDelete, cancel };
}
