import { useState } from "react";
import {
  PROJECT_DESIGN_STAGES,
  PROJECT_DESIGN_STAGE_LABELS,
  type ProjectDesignStage,
} from "../project/businessMetadata";

export interface BusinessFormValues {
  businessNumber: string;
  name: string;
  designStage: ProjectDesignStage;
  designStageCustomLabel: string;
}

export interface BusinessFormProps {
  initial: BusinessFormValues;
  submitLabel: string;
  onSubmit: (values: BusinessFormValues) => void;
  onCancel: () => void;
}

export function BusinessForm({ initial, submitLabel, onSubmit, onCancel }: BusinessFormProps) {
  const [businessNumber, setBusinessNumber] = useState(initial.businessNumber);
  const [name, setName] = useState(initial.name);
  const [designStage, setDesignStage] = useState<ProjectDesignStage>(initial.designStage);
  const [designStageCustomLabel, setDesignStageCustomLabel] = useState(initial.designStageCustomLabel);

  function handleSubmit() {
    onSubmit({
      businessNumber: businessNumber.trim(),
      name: name.trim(),
      designStage,
      designStageCustomLabel: designStageCustomLabel.trim(),
    });
  }

  return (
    <div className="next-form" data-testid="business-form">
      <label className="next-field">
        <span>業務件番</span>
        <input
          type="text"
          data-testid="form-business-number"
          value={businessNumber}
          onChange={(e) => setBusinessNumber(e.target.value)}
          placeholder="例: B-2026-001"
        />
      </label>

      <label className="next-field">
        <span>業務名</span>
        <input
          type="text"
          data-testid="form-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 道路詳細設計業務"
        />
      </label>

      <label className="next-field">
        <span>設計段階</span>
        <select
          data-testid="form-design-stage"
          value={designStage}
          onChange={(e) => setDesignStage(e.target.value as ProjectDesignStage)}
        >
          {PROJECT_DESIGN_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {PROJECT_DESIGN_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </label>

      {designStage === "other" && (
        <label className="next-field">
          <span>その他（入力）</span>
          <input
            type="text"
            data-testid="form-design-stage-custom"
            value={designStageCustomLabel}
            onChange={(e) => setDesignStageCustomLabel(e.target.value)}
            placeholder="例: 耐震照査"
          />
        </label>
      )}

      <div className="next-form-actions">
        <button type="button" className="next-primary" data-testid="form-submit" onClick={handleSubmit}>
          {submitLabel}
        </button>
        <button type="button" className="next-action-secondary" data-testid="form-cancel" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
