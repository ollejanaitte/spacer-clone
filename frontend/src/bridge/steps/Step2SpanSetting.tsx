import type { BridgeProject, Span } from "../types";
import { addSpan, removeSpan, totalLength } from "../BridgeWizardState";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
};

function updateSpan(
  project: BridgeProject,
  index: number,
  patch: Partial<Span>,
): BridgeProject {
  const spans = project.spans.map((s) => (s.index === index ? { ...s, ...patch } : s));
  return { ...project, spans };
}

export function Step2SpanSetting({ project, onChange }: Props) {
  const total = totalLength(project.spans);
  return (
    <div className="bw-step bw-step-span">
      <h2>Step 2 / 6 支間設定</h2>
      <p className="bw-hint">橋軸方向の支間長さを設定してください。支間の追加・削除ができます。</p>
      <table className="bw-table">
        <thead>
          <tr>
            <th>支間</th>
            <th>支間長 (m)</th>
            <th>オフセット (m)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {project.spans.map((sp) => (
            <tr key={sp.index}>
              <td>P{sp.index}</td>
              <td>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={sp.length}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onChange(
                      updateSpan(project, sp.index, {
                        length: Number.isFinite(v) ? Math.max(0.1, v) : 0.1,
                      }),
                    );
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={sp.offset}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    onChange(
                      updateSpan(project, sp.index, {
                        offset: Number.isFinite(v) ? Math.max(0, v) : 0,
                      }),
                    );
                  }}
                />
              </td>
              <td>
                {project.spans.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...project, spans: removeSpan(project.spans, sp.index) })}
                  >
                    削除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="bw-button-primary"
        onClick={() => onChange({ ...project, spans: addSpan(project.spans) })}
      >
        + 支間追加
      </button>
      <div className="bw-summary">
        <strong>合計橋長: {total.toFixed(3)} m</strong>
        <span>（{project.spans.length} 支間）</span>
      </div>
    </div>
  );
}
