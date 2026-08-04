import { AuthorizationBanner } from "./AuthorizationBanner";
/**
 * Step 5 pavement / road-marking input panel (DEC-S5-0003 / 0004).
 * Same SoR as Guided Mode G03 detail escape.
 */
import { useMemo } from "react";
import type { ProjectModel } from "../../types";
import {
  getBridgeStructureInputDraft,
  PRESENCE_STATUS,
  validatePavementConfiguration,
  withPavementConfiguration,
  withPavementPresence,
  withRoadMarkingsConfiguration,
  type PresenceStatus,
} from "../bridgeStructure";

type Props = {
  readonly project: ProjectModel;
  readonly onProjectChange: (nextProject: ProjectModel) => void;
  readonly onAuditEvent?: (message: string) => void;
};

export function PavementMarkingInputPanel({ project, onProjectChange, onAuditEvent }: Props) {
  const draft = useMemo(() => getBridgeStructureInputDraft(project), [project]);
  const pavement = draft.pavementConfiguration;
  const markings = draft.roadMarkingsConfiguration;
  const diagnostics = useMemo(
    () => validatePavementConfiguration(pavement, draft.bridgeLength),
    [pavement, draft.bridgeLength],
  );

  const setPresence = (presence: PresenceStatus) => {
    const next = withPavementPresence(pavement, presence);
    onProjectChange(withPavementConfiguration(project, next));
    onAuditEvent?.(`pavement presence → ${presence}`);
  };

  const patchItem = (patch: Partial<NonNullable<typeof pavement.item>>) => {
    const base = pavement.item ?? {
      thickness: null,
      unitWeight: 22.5,
      startStation: null,
      endStation: null,
    };
    const next = {
      ...pavement,
      presence: PRESENCE_STATUS.PROVIDED,
      item: { ...base, ...patch },
    };
    onProjectChange(withPavementConfiguration(project, next));
  };

  return (
    <section
      className="apollo-editor-card"
      data-testid="apollo-pavement-panel"
      aria-label="舗装・白線入力"
    >
      <h2>舗装・区画線</h2>
      <AuthorizationBanner testId="apollo-pavement-auth" />
      <p>
        舗装は Apollo 入力が所有します。区画線は可視化専用で、構造 STL 既定からは除外されます。
      </p>

      <fieldset>
        <legend>舗装の有無</legend>
        {(
          [
            [PRESENCE_STATUS.NOT_PROVIDED, "未入力"],
            [PRESENCE_STATUS.EXPLICIT_NONE, "なし"],
            [PRESENCE_STATUS.PROVIDED, "あり"],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="pavement-presence"
              checked={pavement.presence === value}
              onChange={() => setPresence(value)}
              data-testid={`apollo-pavement-presence-${value}`}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {pavement.presence === PRESENCE_STATUS.PROVIDED ? (
        <div className="apollo-pavement-fields" data-testid="apollo-pavement-fields">
          <label>
            厚さ (m)
            <input
              type="number"
              step="0.001"
              value={pavement.item?.thickness ?? ""}
              data-testid="apollo-pavement-thickness"
              onChange={(event) => {
                const raw = event.target.value.trim();
                patchItem({ thickness: raw === "" ? null : Number(raw) });
              }}
            />
          </label>
          <label>
            単位体積重量 (kN/m³)
            <input
              type="number"
              step="0.1"
              value={pavement.item?.unitWeight ?? ""}
              data-testid="apollo-pavement-unit-weight"
              onChange={(event) => {
                const raw = event.target.value.trim();
                patchItem({ unitWeight: raw === "" ? null : Number(raw) });
              }}
            />
          </label>
          <p className="apollo-muted">単位重量ステータス: 利用者入力・未検証</p>
        </div>
      ) : null}

      <fieldset>
        <legend>白線可視化</legend>
        <label>
          <input
            type="checkbox"
            checked={markings.enabled}
            data-testid="apollo-road-markings-enabled"
            onChange={(event) => {
              onProjectChange(
                withRoadMarkingsConfiguration(project, {
                  ...markings,
                  enabled: event.target.checked,
                }),
              );
              onAuditEvent?.(`road markings enabled → ${event.target.checked}`);
            }}
          />
          白線を表示する（数量・構造 STL には含めない）
        </label>
      </fieldset>

      {diagnostics.length > 0 ? (
        <ul data-testid="apollo-pavement-diagnostics">
          {diagnostics.map((diag) => (
            <li key={diag.code}>{diag.message}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
