import { useCallback, useEffect, useMemo, useState } from "react";
import { ja } from "../i18n/ja";
import { Step1RoadCondition } from "./steps/Step1RoadCondition";
import { Step2SpanSetting } from "./steps/Step2SpanSetting";
import { Step3ImpactFactor } from "./steps/Step3ImpactFactor";
import { Step4LineSetting } from "./steps/Step4LineSetting";
import { Step5LoadSetting } from "./steps/Step5LoadSetting";
import { Step6ModelGeneration } from "./steps/Step6ModelGeneration";
import {
  stepTitle,
  WIZARD_STEPS,
  makeInitialBridgeProject,
  type WizardStepNumber,
} from "./BridgeWizardState";
import type { BridgeFemResponse, BridgeProject, ViewerModelPayload } from "./types";
import { createBridge, fetchBridgeTemplate, fetchViewerModel, generateFem, getBridge, updateBridge } from "./api";
import { bridgeProjectToProjectModel, loadJsonFileAsBridge } from "./conversion";

type Props = {
  open: boolean;
  onClose: () => void;
  onCommit: (fem: BridgeFemResponse) => void;
};

export function BridgeWizard({ open, onClose, onCommit }: Props) {
  const [project, setProject] = useState<BridgeProject>(() => makeInitialBridgeProject());
  const [step, setStep] = useState<WizardStepNumber>(1);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [femModel, setFemModel] = useState<ViewerModelPayload | null>(null);
  const [lastFem, setLastFem] = useState<BridgeFemResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadBridgeId, setLoadBridgeId] = useState<string>("");

  // Load template on open
  useEffect(() => {
    if (!open) return;
    setLoadError(null);
    let cancelled = false;
    fetchBridgeTemplate()
      .then((p) => {
        if (cancelled) return;
        setProject(p);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const stepValidation = useMemo(() => validateStep(step, project), [step, project]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const exists = await tryGet(project.id);
      if (exists) {
        await updateBridge(project);
      } else {
        await createBridge(project);
      }
      setSaveMessage(ja.bridgeWizard.saveSuccess(project.id));
    } catch (e) {
      setSaveMessage(ja.bridgeWizard.saveFailed(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, [project]);

  const handleLoad = useCallback(async (id: string) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const p = await getBridge(id);
      setProject(p);
      setSaveMessage(ja.bridgeWizard.loadSuccess(id));
    } catch (e) {
      setSaveMessage(ja.bridgeWizard.loadFailed(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const p = loadJsonFileAsBridge(data);
      setProject(p);
      setSaveMessage(ja.bridgeWizard.fileLoadSuccess(file.name));
    } catch (e) {
      setSaveMessage(ja.bridgeWizard.fileLoadFailed(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.id}.bridge.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveMessage(ja.bridgeWizard.downloadStarted(`${project.id}.bridge.json`));
  }, [project]);

  const handleSendToAnalysis = useCallback(
    (res: BridgeFemResponse) => {
      onCommit(res);
      onClose();
    },
    [onCommit, onClose],
  );

  if (!open) return null;

  return (
    <div className="bw-modal" role="dialog" aria-modal="true" aria-label={ja.bridgeWizard.ariaLabel}>
      <div className="bw-modal-header">
        <div className="bw-progress">
          <span className="bw-step-counter">Step {step} / 6</span>
          <span className="bw-step-title">{ja.bridgeSteps.stepTitles[step]}</span>
          <div className="bw-progress-bar">
            <div className="bw-progress-fill" style={{ width: `${(step / 6) * 100}%` }} />
          </div>
        </div>
        <button type="button" className="bw-close" onClick={onClose}>{ja.common.close}</button>
      </div>
      <div className="bw-modal-body">
        <aside className="bw-sidebar">
          <h3>{ja.bridgeWizard.title}</h3>
          <ol>
            {WIZARD_STEPS.map((n) => (
              <li key={n} className={n === step ? "active" : ""}>
                <button
                  type="button"
                  onClick={() => setStep(n)}
                  className={n === step ? "active" : ""}
                >
                  {n}. {stepTitle(n)}
                </button>
              </li>
            ))}
          </ol>
          <div className="bw-sidebar-info">
            <h4>{stepTitle(step)}</h4>
            <p>{sidebarHintFor(step)}</p>
            {loadError && <p className="bw-error">{ja.bridgeWizard.templateLoadError(loadError)}</p>}
            {saveMessage && <p className="bw-info">{saveMessage}</p>}
          </div>
          <div className="bw-sidebar-tools">
            <label>
              {ja.bridgeWizard.existingBridgeId}
              <input
                type="text"
                value={loadBridgeId}
                placeholder="bridge-001"
                onChange={(e) => setLoadBridgeId(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => loadBridgeId && handleLoad(loadBridgeId)}>
              {ja.bridgeWizard.loadFromServer}
            </button>
            <label className="bw-file">
              {ja.bridgeWizard.loadFromJsonFile}
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? ja.bridgeWizard.savingLabel : ja.bridgeWizard.saveButton}
            </button>
            <button type="button" onClick={handleDownload}>{ja.bridgeWizard.downloadJsonButton}</button>
          </div>
        </aside>
        <main className="bw-main">
          {step === 1 && <Step1RoadCondition project={project} onChange={setProject} />}
          {step === 2 && <Step2SpanSetting project={project} onChange={setProject} />}
          {step === 3 && <Step3ImpactFactor project={project} onChange={setProject} />}
          {step === 4 && <Step4LineSetting project={project} onChange={setProject} femModel={femModel} />}
          {step === 5 && <Step5LoadSetting project={project} onChange={setProject} />}
          {step === 6 && (
            <Step6ModelGeneration
              project={project}
              onChange={setProject}
              onGenerated={(res) => {
                setLastFem(res);
                // Fetch viewer data
                fetchViewerModel(project.id)
                  .then((vm) => setFemModel(vm))
                  .catch(() => setFemModel(null));
              }}
              onSendToAnalysis={handleSendToAnalysis}
            />
          )}
        </main>
      </div>
      <div className="bw-modal-footer">
        <button
          type="button"
          onClick={() => setStep((s) => (Math.max(1, (s as number) - 1) as WizardStepNumber))}
          disabled={step === 1}
        >
          {ja.bridgeWizard.backLabel}
        </button>
        {step < 6 ? (
          <button
            type="button"
            className="bw-button-primary"
            disabled={!stepValidation.ok}
            onClick={() => setStep((s) => (Math.min(6, (s as number) + 1) as WizardStepNumber))}
          >
            {ja.bridgeWizard.nextLabel}
          </button>
        ) : (
          <button type="button" onClick={onClose}>
            {ja.bridgeWizard.finishLabel}
          </button>
        )}
        {step === 6 && lastFem && (
          <button
            type="button"
            className="bw-button-secondary"
            onClick={() => handleSendToAnalysis(lastFem)}
          >
            {ja.bridgeWizard.sendToAnalysis}
          </button>
        )}
      </div>
    </div>
  );
}

function sidebarHintFor(step: WizardStepNumber): string {
  switch (step) {
    case 1:
      return ja.bridgeWizard.hints.step1;
    case 2:
      return ja.bridgeWizard.hints.step2;
    case 3:
      return ja.bridgeWizard.hints.step3;
    case 4:
      return ja.bridgeWizard.hints.step4;
    case 5:
      return ja.bridgeWizard.hints.step5;
    case 6:
      return ja.bridgeWizard.hints.step6;
    default:
      return "";
  }
}

function validateStep(step: WizardStepNumber, project: BridgeProject): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (step === 1) {
    if (project.crossSection.lane_count < 1) errors.push(ja.bridgeWizard.errors.laneCountMin);
    if (project.crossSection.lane_width <= 0) errors.push(ja.bridgeWizard.errors.laneWidthPositive);
    if (project.crossSection.lane_width * project.crossSection.lane_count <= 0) errors.push(ja.bridgeWizard.errors.laneTotalWidthPositive);
  } else if (step === 2) {
    if (project.spans.length === 0) errors.push(ja.bridgeWizard.errors.spanUnset);
    for (const sp of project.spans) {
      if (sp.length <= 0) errors.push(ja.bridgeWizard.errors.spanLengthPositive(sp.index));
    }
  } else if (step === 3) {
    if (project.impactFactor.value < 0 || project.impactFactor.value > 1) {
      errors.push(ja.bridgeWizard.errors.impactFactorRange);
    }
  } else if (step === 5) {
    for (const ld of project.loads) {
      if (ld.line_id && !project.lines.find((l) => l.id === ld.line_id)) {
        errors.push(ja.bridgeWizard.errors.loadLineUndefined(ld.id));
      }
    }
  } else if (step === 6) {
    if (project.generationSettings.mesh_division < 1) errors.push(ja.bridgeWizard.errors.meshDivisionMin);
  }
  return { ok: errors.length === 0, errors };
}

async function tryGet(id: string): Promise<boolean> {
  try {
    await getBridge(id);
    return true;
  } catch {
    return false;
  }
}

// Re-export utility for tests
export { bridgeProjectToProjectModel };
