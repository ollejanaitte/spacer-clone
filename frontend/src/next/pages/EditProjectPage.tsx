import { useState } from "react";
import { BusinessForm, type BusinessFormValues } from "../components/BusinessForm";
import { getBusinessNumber, getDesignStage } from "../project/businessMetadata";
import { getProjectManager } from "../project/projectManagerInstance";
import { navigateTo, NEXT_BUSINESS_LIST_PATH } from "../routes";

export function EditProjectPage({ projectId }: { projectId: string }) {
  const [project] = useState(() => getProjectManager().getProject(projectId));

  if (!project) {
    return (
      <section className="next-page" data-testid="edit-project-page">
        <h1 className="next-page-title">業務編集</h1>
        <div className="next-error" data-testid="edit-not-found">
          Projectが見つかりません。
        </div>
        <button
          type="button"
          className="next-link-button"
          onClick={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
        >
          ← 業務一覧へ
        </button>
      </section>
    );
  }

  const initial: BusinessFormValues = {
    businessNumber: getBusinessNumber(project),
    name: project.name,
    designStage: getDesignStage(project).id,
    designStageCustomLabel: getDesignStage(project).customLabel ?? "",
  };

  function handleSubmit(values: BusinessFormValues) {
    const result = getProjectManager().updateProject(projectId, values);
    if (!result.ok) return;
    navigateTo(NEXT_BUSINESS_LIST_PATH);
  }

  return (
    <section className="next-page" data-testid="edit-project-page">
      <h1 className="next-page-title">業務編集</h1>
      <p className="next-hint" data-testid="edit-project-id">
        Project ID: {project.projectId}
      </p>
      <BusinessForm
        initial={initial}
        submitLabel="保存"
        onSubmit={handleSubmit}
        onCancel={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      />
    </section>
  );
}
