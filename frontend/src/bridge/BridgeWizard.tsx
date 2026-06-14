import { useCallback, useEffect, useMemo, useState } from "react";
import { Step1RoadCondition } from "./steps/Step1RoadCondition";
import { Step2SpanSetting } from "./steps/Step2SpanSetting";
import { Step3ImpactFactor } from "./steps/Step3ImpactFactor";
import { Step4LineSetting } from "./steps/Step4LineSetting";
import { Step5LoadSetting } from "./steps/Step5LoadSetting";
import { Step6ModelGeneration } from "./steps/Step6ModelGeneration";
import {
  STEP_TITLES,
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
      setSaveMessage(`保存しました: ${project.id}`);
    } catch (e) {
      setSaveMessage(`保存に失敗: ${e instanceof Error ? e.message : String(e)}`);
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
      setSaveMessage(`読み込みました: ${id}`);
    } catch (e) {
      setSaveMessage(`読み込みに失敗: ${e instanceof Error ? e.message : String(e)}`);
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
      setSaveMessage(`ファイルから読み込みました: ${file.name}`);
    } catch (e) {
      setSaveMessage(`ファイル読み込みに失敗: ${e instanceof Error ? e.message : String(e)}`);
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
    setSaveMessage(`ダウンロード: ${project.id}.bridge.json`);
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
    <div className="bw-modal" role="dialog" aria-modal="true" aria-label="橋梁モデル作成ウィザード">
      <div className="bw-modal-header">
        <div className="bw-progress">
          <span className="bw-step-counter">Step {step} / 6</span>
          <span className="bw-step-title">{STEP_TITLES[step]}</span>
          <div className="bw-progress-bar">
            <div className="bw-progress-fill" style={{ width: `${(step / 6) * 100}%` }} />
          </div>
        </div>
        <button type="button" className="bw-close" onClick={onClose}>閉じる</button>
      </div>
      <div className="bw-modal-body">
        <aside className="bw-sidebar">
          <h3>橋梁モデル作成</h3>
          <ol>
            {WIZARD_STEPS.map((n) => (
              <li key={n} className={n === step ? "active" : ""}>
                <button
                  type="button"
                  onClick={() => setStep(n)}
                  className={n === step ? "active" : ""}
                >
                  {n}. {STEP_TITLES[n]}
                </button>
              </li>
            ))}
          </ol>
          <div className="bw-sidebar-info">
            <h4>{STEP_TITLES[step]}</h4>
            <p>{sidebarHintFor(step)}</p>
            {loadError && <p className="bw-error">テンプレート取得失敗: {loadError}。既定値で開始しています。</p>}
            {saveMessage && <p className="bw-info">{saveMessage}</p>}
          </div>
          <div className="bw-sidebar-tools">
            <label>
              既存の bridge_id:
              <input
                type="text"
                value={loadBridgeId}
                placeholder="bridge-001"
                onChange={(e) => setLoadBridgeId(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => loadBridgeId && handleLoad(loadBridgeId)}>
              サーバーから読込
            </button>
            <label className="bw-file">
              JSON ファイル読込
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
              {saving ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={handleDownload}>JSON ダウンロード</button>
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
          ← 戻る
        </button>
        {step < 6 ? (
          <button
            type="button"
            className="bw-button-primary"
            disabled={!stepValidation.ok}
            onClick={() => setStep((s) => (Math.min(6, (s as number) + 1) as WizardStepNumber))}
          >
            次へ →
          </button>
        ) : (
          <button type="button" onClick={onClose}>
            完了
          </button>
        )}
        {step === 6 && lastFem && (
          <button
            type="button"
            className="bw-button-secondary"
            onClick={() => handleSendToAnalysis(lastFem)}
          >
            解析へ送る
          </button>
        )}
      </div>
    </div>
  );
}

function sidebarHintFor(step: WizardStepNumber): string {
  switch (step) {
    case 1:
      return "道路の横断構成を入力すると、主桁候補 y 座標が自動で計算されます。";
    case 2:
      return "橋軸方向の支間長さを設定します。支間追加・削除で構造を変えてください。";
    case 3:
      return "衝撃係数は自動計算が推奨です。L_max から簡略式 i = min(0.3, 20 / (50 + L)) で算出します。";
    case 4:
      return "3D ビューで走行ラインや参照ラインを引きます。種別 traffic/load/reference を選んで描画してください。";
    case 5:
      return "荷重（自重 / 分布 / 車両）を追加します。ラインに紐づけることで FEM 生成時にマッピングされます。";
    case 6:
      return "メッシュ分割と密度を指定して FEM モデルを生成します。生成後は解析へ送れます。";
    default:
      return "";
  }
}

function validateStep(step: WizardStepNumber, project: BridgeProject): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (step === 1) {
    if (project.crossSection.lane_count < 1) errors.push("車線数は 1 以上");
    if (project.crossSection.lane_width <= 0) errors.push("車線幅は 0 より大きい");
    if (project.crossSection.lane_width * project.crossSection.lane_count <= 0) errors.push("車線合計幅は 0 より大きい");
  } else if (step === 2) {
    if (project.spans.length === 0) errors.push("支間が未設定");
    for (const sp of project.spans) {
      if (sp.length <= 0) errors.push(`支間 ${sp.index} の長さは 0 より大きい`);
    }
  } else if (step === 3) {
    if (project.impactFactor.value < 0 || project.impactFactor.value > 1) {
      errors.push("衝撃係数は 0..1");
    }
  } else if (step === 5) {
    for (const ld of project.loads) {
      if (ld.line_id && !project.lines.find((l) => l.id === ld.line_id)) {
        errors.push(`荷重 ${ld.id} の line_id が未定義`);
      }
    }
  } else if (step === 6) {
    if (project.generationSettings.mesh_division < 1) errors.push("mesh_division は 1 以上");
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
