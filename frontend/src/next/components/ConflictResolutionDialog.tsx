export type ConflictChoice = "overwrite" | "duplicate" | "cancel";

export interface ConflictResolutionDialogProps {
  projectName: string;
  projectId: string;
  onChoose: (choice: ConflictChoice, duplicateName?: string) => void;
}

export function ConflictResolutionDialog({ projectName, projectId, onChoose }: ConflictResolutionDialogProps) {
  return (
    <div className="next-modal-overlay" data-testid="conflict-dialog">
      <div className="next-modal" data-testid="conflict-dialog-body">
        <h2 className="next-modal-title">同一Project IDの競合</h2>
        <p>
          Project ID <span className="next-project-id">{projectId}</span> は既に存在します。
          業務「{projectName}」をどのように登録しますか？
        </p>
        <div className="next-form-actions">
          <button
            type="button"
            className="next-danger-strong"
            data-testid="conflict-overwrite"
            onClick={() => onChoose("overwrite")}
          >
            上書き（既存を自動バックアップ）
          </button>
          <button
            type="button"
            className="next-primary"
            data-testid="conflict-duplicate"
            onClick={() => onChoose("duplicate", `${projectName}（複製）`)}
          >
            別Projectとして複製
          </button>
          <button
            type="button"
            className="next-action-secondary"
            data-testid="conflict-cancel"
            onClick={() => onChoose("cancel")}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
