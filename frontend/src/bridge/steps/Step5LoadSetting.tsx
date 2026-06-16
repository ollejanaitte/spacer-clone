import { ja } from "../../i18n/ja";
import type { BridgeProject, BridgeLoad } from "../types";
import { addLoad, appendLoad, nextLoadId, removeLoad } from "../BridgeWizardState";

type Props = {
  project: BridgeProject;
  onChange: (project: BridgeProject) => void;
};

const DIRS: BridgeLoad["direction"][] = ["X", "-X", "Y", "-Y", "Z", "-Z"];
const TYPES: BridgeLoad["type"][] = ["self_weight", "distributed", "vehicle"];

export function Step5LoadSetting({ project, onChange }: Props) {
  return (
    <div className="bw-step bw-step-load">
      <h2>{ja.bridgeSteps.step5.title}</h2>
      <p className="bw-hint">{ja.bridgeSteps.step5.hint}</p>
      <div className="bw-load-list">
        {project.loads.length === 0 && <p className="bw-empty">{ja.bridgeSteps.step5.empty}</p>}
        {project.loads.map((ld) => (
          <div className="bw-load-row" key={ld.id}>
            <span className="bw-pill">{ld.type}</span>
            <input
              type="text"
              value={ld.name}
              onChange={(e) => {
                const next = project.loads.map((l) =>
                  l.id === ld.id ? { ...l, name: e.target.value } : l,
                );
                onChange({ ...project, loads: next });
              }}
            />
            <select
              value={ld.type}
              onChange={(e) => {
                const next = project.loads.map((l) =>
                  l.id === ld.id ? { ...l, type: e.target.value as BridgeLoad["type"] } : l,
                );
                onChange({ ...project, loads: next });
              }}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              step={0.1}
              value={ld.magnitude}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                const next = project.loads.map((l) =>
                  l.id === ld.id ? { ...l, magnitude: Number.isFinite(v) ? v : 0 } : l,
                );
                onChange({ ...project, loads: next });
              }}
            />
            <select
              value={ld.direction}
              onChange={(e) => {
                const next = project.loads.map((l) =>
                  l.id === ld.id ? { ...l, direction: e.target.value as BridgeLoad["direction"] } : l,
                );
                onChange({ ...project, loads: next });
              }}
            >
              {DIRS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={ld.line_id || ""}
              onChange={(e) => {
                const next = project.loads.map((l) =>
                  l.id === ld.id ? { ...l, line_id: e.target.value } : l,
                );
                onChange({ ...project, loads: next });
              }}
            >
              <option value="">{ja.bridgeSteps.step5.noLine}</option>
              {project.lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.type})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange(removeLoad(project, ld.id))}
            >
              {ja.common.remove}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="bw-button-primary"
        onClick={() => {
          const firstLine = project.lines[0]?.id || "";
          const load = addLoad(project, {
            type: "distributed",
            name: ja.bridgeSteps.step5.newLoadName,
            magnitude: 10.0,
            direction: "-Y",
            line_id: firstLine,
          });
          onChange(appendLoad(project, load));
        }}
      >
        {ja.bridgeSteps.step5.addLoad}
      </button>
      <div className="bw-info">
        <p>{ja.bridgeSteps.step5.typeNotesHeading}:</p>
        <ul>
          <li>{ja.bridgeSteps.step5.typeNotes.selfWeight}</li>
          <li>{ja.bridgeSteps.step5.typeNotes.distributed}</li>
          <li>{ja.bridgeSteps.step5.typeNotes.vehicle}</li>
        </ul>
      </div>
    </div>
  );
}

export { nextLoadId };
