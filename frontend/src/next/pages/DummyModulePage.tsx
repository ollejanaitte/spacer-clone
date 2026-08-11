import { useState } from "react";
import { getProjectManager } from "../project/projectManagerInstance";
import { updateModuleData, getModuleData } from "../modules/moduleService";
import { validateDummyData, DUMMY_MODULE_ID } from "../modules/dummyModule";
import { navigateTo, NEXT_PROJECT_HOME_PATH, modulePath } from "../routes";
import type { ProjectModuleKey } from "../project/schema";

export function DummyModulePage({ projectId, moduleId }: { projectId: string; moduleId: string }) {
  const initialData = getModuleData(getProjectManager(), projectId, moduleId as ProjectModuleKey);
  const [lengthValue, setLengthValue] = useState(() => {
    const raw = initialData?.data?.length;
    return typeof raw === "number" ? String(raw) : "0";
  });
  const [labelValue, setLabelValue] = useState(() => {
    const raw = initialData?.data?.label;
    return typeof raw === "string" ? raw : "";
  });
  const [message, setMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState(() => initialData?.state.status ?? "notStarted");

  function handleSave() {
    const length = Number(lengthValue);
    const patch: Record<string, unknown> = { length, label: labelValue };
    const result = updateModuleData(getProjectManager(), {
      projectId,
      moduleId: moduleId as ProjectModuleKey,
      patch,
      validator: validateDummyData,
    });
    if (!result.ok) {
      setMessage("保存できませんでした（validation NG）。入力内容を確認してください。");
      return;
    }
    setStatusText(result.moduleData.state.status);
    setMessage("保存しました。");
    void getProjectManager().flushPendingSaves();
  }

  return (
    <section className="next-page" data-testid="dummy-module-page">
      <h1 className="next-page-title" data-testid="dummy-module-title">Dummy Module</h1>
      <button
        type="button"
        className="next-link-button"
        data-testid="dummy-module-back"
        onClick={() => navigateTo(`${NEXT_PROJECT_HOME_PATH}/${projectId}`)}
      >
        ← Projectトップへ
      </button>
      <button
        type="button"
        className="next-link-button"
        data-testid="dummy-module-shell"
        onClick={() => navigateTo(modulePath(projectId, moduleId))}
      >
        Module Shell を表示
      </button>

      <p className="next-hint" data-testid="dummy-module-id">
        Module ID: {moduleId}
      </p>
      <p className="next-hint" data-testid="dummy-module-status">
        現在のStatus: {statusText}
      </p>

      <div className="next-form">
        <label className="next-field">
          <span>length（数値）</span>
          <input
            type="number"
            data-testid="dummy-length-input"
            value={lengthValue}
            onChange={(e) => setLengthValue(e.target.value)}
          />
        </label>
        <label className="next-field">
          <span>label（文字列）</span>
          <input
            type="text"
            data-testid="dummy-label-input"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
          />
        </label>
        <div className="next-form-actions">
          <button type="button" className="next-primary" data-testid="dummy-save-button" onClick={handleSave}>
            保存（Auto Save）
          </button>
        </div>
      </div>

      {message !== null && <div className="next-hint" data-testid="dummy-message">{message}</div>}
    </section>
  );
}

export { DUMMY_MODULE_ID };
