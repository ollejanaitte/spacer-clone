import { BusinessForm, type BusinessFormValues } from "../components/BusinessForm";
import { getProjectManager } from "../project/projectManagerInstance";
import { navigateTo, NEXT_BUSINESS_LIST_PATH } from "../routes";

const DEFAULT_VALUES: BusinessFormValues = {
  businessNumber: "",
  name: "",
  designStage: "road-preliminary",
  designStageCustomLabel: "",
};

export function NewProjectPage() {
  function handleSubmit(values: BusinessFormValues) {
    const result = getProjectManager().createProject(values);
    if (!result.ok) return;
    navigateTo(NEXT_BUSINESS_LIST_PATH);
  }

  return (
    <section className="next-page" data-testid="new-project-page">
      <h1 className="next-page-title">新しい業務</h1>
      <BusinessForm
        initial={DEFAULT_VALUES}
        submitLabel="作成"
        onSubmit={handleSubmit}
        onCancel={() => navigateTo(NEXT_BUSINESS_LIST_PATH)}
      />
    </section>
  );
}
