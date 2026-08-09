import { useCallback, useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import {
  DESIGN_STAGES,
  type BusinessRegistryPort,
  type BusinessSummary,
  type DesignStage,
} from "../business/businessRegistry";
import styles from "./BusinessListPage.module.css";

export type BusinessListPageProps = {
  registry: BusinessRegistryPort;
  onOpen: (businessId: string) => void;
  onBack: () => void;
  onCreateSample?: () => void;
};

export function BusinessListPage({
  registry,
  onOpen,
  onBack,
  onCreateSample,
}: BusinessListPageProps) {
  const text = ja.designPlatform.businessList;
  const [showCreate, setShowCreate] = useState(false);
  const [projectNumber, setProjectNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [designStage, setDesignStage] = useState<DesignStage>("road_design");
  const [inputError, setInputError] = useState<string | null>(null);

  const items = useMemo(() => registry.list(), [registry]);

  const resetForm = useCallback(() => {
    setProjectNumber("");
    setProjectName("");
    setDesignStage("road_design");
    setInputError(null);
  }, []);

  const submitCreate = useCallback(() => {
    const numberValue = projectNumber.trim();
    const nameValue = projectName.trim();
    if (numberValue.length === 0 || nameValue.length === 0) {
      setInputError(text.projectNumberAndNameRequired);
      return;
    }
    const created = registry.create({
      projectNumber: numberValue,
      projectName: nameValue,
      designStage,
    });
    resetForm();
    setShowCreate(false);
    onOpen(created.businessId);
  }, [projectNumber, projectName, designStage, registry, resetForm, onOpen, text]);

  const closeCreate = useCallback(() => {
    resetForm();
    setShowCreate(false);
  }, [resetForm]);

  const listContent =
    items.length === 0 ? (
      <p className={styles.empty} data-testid="business-list-empty">
        {text.empty}
      </p>
    ) : (
      <table className={styles.table} data-testid="business-list">
        <thead>
          <tr>
            <th>{text.columnProjectNumber}</th>
            <th>{text.columnProjectName}</th>
            <th>{text.columnDesignStage}</th>
            <th>{text.columnUpdatedAt}</th>
            <th aria-label={text.columnActionAria} />
          </tr>
        </thead>
        <tbody>
          {items.map((item: BusinessSummary) => (
            <tr key={item.businessId}>
              <td>{item.projectNumber}</td>
              <td>{item.projectName}</td>
              <td>{text.stageLabels[item.designStage]}</td>
              <td>{item.updatedAt}</td>
              <td>
                <button
                  type="button"
                  className={styles.openButton}
                  onClick={() => onOpen(item.businessId)}
                  data-testid={`business-open-${item.businessId}`}
                >
                  {text.open}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          {text.back}
        </button>
        <h1 className={styles.title}>{text.title}</h1>
        <button
          type="button"
          className={styles.newButton}
          onClick={() => setShowCreate(true)}
          data-testid="business-new"
        >
          {text.newBusiness}
        </button>
        {onCreateSample !== undefined && (
          <button
            type="button"
            className={styles.sampleButton}
            onClick={onCreateSample}
            data-testid="business-sample-create"
          >
            {text.sampleBusiness}
          </button>
        )}
      </div>
      {showCreate ? (
        <section className={styles.createPanel} aria-label={text.createPanelAria}>
          <h2 className={styles.createTitle}>{text.createTitle}</h2>
          <label className={styles.field}>
            <span>{text.projectNumber}</span>
            <input
              type="text"
              value={projectNumber}
              onChange={(event) => setProjectNumber(event.target.value)}
              data-testid="business-number-input"
            />
          </label>
          <label className={styles.field}>
            <span>{text.projectName}</span>
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              data-testid="business-name-input"
            />
          </label>
          <label className={styles.field}>
            <span>{text.designStage}</span>
            <select
              value={designStage}
              onChange={(event) => setDesignStage(event.target.value as DesignStage)}
              data-testid="business-stage-select"
            >
              {DESIGN_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {text.stageLabels[stage]}
                </option>
              ))}
            </select>
          </label>
          {inputError !== null && (
            <p className={styles.error} role="alert">
              {inputError}
            </p>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={closeCreate}>
              {text.cancel}
            </button>
            <button
              type="button"
              className={styles.submitButton}
              onClick={submitCreate}
              data-testid="business-create-submit"
            >
              {text.create}
            </button>
          </div>
        </section>
      ) : (
        listContent
      )}
    </div>
  );
}
