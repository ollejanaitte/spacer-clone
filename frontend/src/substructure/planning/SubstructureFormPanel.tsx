// Phase C1 (M2-03) 構造形式・入力フォーム統合パネル
// 形式セレクタ + P02配置 + 橋台/橋脚 + 基礎 を slot 統合し、validation 表示。
import { useMemo, useState } from "react";
import { ja } from "../../i18n/ja";
import { StructureTypeSelector, type SupportCategory } from "./forms/StructureTypeSelector";
import { PlacementFields, type PlacementFormState, type PlacementDerived } from "./forms/PlacementFields";
import { PierInputForm, type PierFormState } from "./forms/PierInputForm";
import { AbutmentInputForm, type AbutmentFormState } from "./forms/AbutmentInputForm";
import { FoundationInputForm, type FoundationFormState } from "./forms/FoundationInputForm";
import { validateForm, type SupportFormState } from "./formModel";
import styles from "./SubstructurePlanningPage.module.css";

export interface FormDataBundle {
  supportId: string;
  supportType: "pier" | "abutment";
  placement: PlacementFormState;
  pier: PierFormState | null;
  abutment: AbutmentFormState | null;
  foundation: FoundationFormState;
}

export interface SubstructureFormPanelProps {
  form: FormDataBundle | null;
  coordinates?: { x: number; y: number; z: number };
  onPatch?: (patch: Partial<FormDataBundle>) => void;
  onFormTypeChange?: (typeId: string, status: string) => void;
}

export function SubstructureFormPanel(props: SubstructureFormPanelProps) {
  const t = ja.substructure?.planning ?? ({} as Record<string, string>);
  const [showValidation, setShowValidation] = useState(false);
  const form = props.form;

  const validation = useMemo(() => {
    if (!form) return null;
    const state: SupportFormState = {
      supportId: form.supportId,
      supportType: form.supportType,
      placement: form.placement,
      pier: form.pier,
      abutment: form.abutment,
      foundation: form.foundation,
    };
    return validateForm(state);
  }, [form]);

  if (!form) {
    return (
      <div className={styles.emptyNotice}>
        {t.selectSupportHint ?? "支点を選択してください"}
      </div>
    );
  }

  const patch = props.onPatch ?? (() => {});
  const derived: PlacementDerived = {
    x: props.coordinates?.x ?? null,
    y: props.coordinates?.y ?? null,
    tangent: "—",
    transverse: "—",
  };

  const category: SupportCategory = form.supportType === "abutment" ? "abutment" : "pier";

  return (
    <div data-testid="substructure-form-panel">
      <section className={styles.propertySection}>
        <StructureTypeSelector
          category={category}
          value={
            form.supportType === "abutment"
              ? (form.abutment?.formType ?? null)
              : (form.pier?.formType ?? null)
          }
          onChange={(typeId, status) => {
            if (status !== "supported") return;
            patch(
              form.supportType === "abutment"
                ? { abutment: form.abutment ? { ...form.abutment, formType: typeId as AbutmentFormState["formType"] } : form.abutment }
                : { pier: form.pier ? { ...form.pier, formType: typeId as PierFormState["formType"] } : form.pier },
            );
            props.onFormTypeChange?.(typeId, status);
          }}
        />
      </section>
      <section className={styles.propertySection}>
        <PlacementFields
          state={form.placement}
          derived={derived}
          onChange={(placementPatch) => patch({ placement: { ...form.placement, ...placementPatch } })}
        />
      </section>
      {form.supportType === "pier" && form.pier && (
        <section className={styles.propertySection}>
          <PierInputForm
            state={form.pier}
            onChange={(pierPatch) =>
              patch({ pier: { ...form.pier, ...pierPatch } as PierFormState })
            }
          />
        </section>
      )}
      {form.supportType === "abutment" && form.abutment && (
        <section className={styles.propertySection}>
          <AbutmentInputForm
            state={form.abutment}
            onChange={(abutmentPatch) =>
              patch({ abutment: { ...form.abutment, ...abutmentPatch } as AbutmentFormState })
            }
          />
        </section>
      )}
      <section className={styles.propertySection}>
        <FoundationInputForm
          state={form.foundation}
          onChange={(foundationPatch) => patch({ foundation: { ...form.foundation, ...foundationPatch } })}
        />
      </section>
      <section className={styles.propertySection}>
        <div className={styles.propertySectionTitle}>{t.validationTitle ?? "検証"}</div>
        {validation && (
          <>
            {validation.issues.fatal.map((m, i) => (
              <div key={i} className={styles.issueFatal} data-testid="validation-fatal">{m}</div>
            ))}
            {validation.issues.warning.map((m, i) => (
              <div key={i} className={styles.issueWarn} data-testid="validation-warning">{m}</div>
            ))}
            {validation.issues.info.map((m, i) => (
              <div key={i} className={styles.issueInfo} data-testid="validation-info">{m}</div>
            ))}
            {validation.issues.fatal.length === 0 &&
              validation.issues.warning.length === 0 &&
              validation.issues.info.length === 0 && (
                <div className={styles.issueOk} data-testid="validation-ok">
                  {t.validationOk ?? "問題なし"}
                </div>
              )}
          </>
        )}
        <button
          type="button"
          className={styles.validateButton}
          data-testid="validate-button"
          onClick={() => setShowValidation((v) => !v)}
        >
          {showValidation ? t.validationHide ?? "検証を隠す" : t.validationRun ?? "検証を実行"}
        </button>
      </section>
    </div>
  );
}
