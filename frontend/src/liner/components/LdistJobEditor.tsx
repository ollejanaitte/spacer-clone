import { FilePlus2, Trash2 } from "lucide-react";
import { ja } from "../../i18n/ja";
import {
  addLdistJob,
  removeLdistJob,
  updateLdistJob,
  type LinerDraft,
} from "../adapters/linerUiAdapter";
import type { LdistDistanceMode, LdistJobDraft, LdistJobKind } from "../schema/types";
import { CompositionAwareInput } from "./CompositionAwareInput";

export type LdistJobEditorProps = {
  draft: LinerDraft;
  onDraftChange: (update: LinerDraft | ((current: LinerDraft) => LinerDraft)) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

function activeOffsetLines(draft: LinerDraft) {
  return draft.crossSections?.[0]?.offsetLines ?? [];
}

export function LdistJobEditor({
  draft,
  onDraftChange,
  onCompositionStateChange,
}: LdistJobEditorProps) {
  const jobs = draft.ldistJobs ?? [];
  const lines = activeOffsetLines(draft);

  return (
    <section className="liner-edit-panel" data-testid="ldist-job-editor">
      <header className="liner-edit-panel-header">
        <h2>{ja.liner.ldist.title}</h2>
        <button
          type="button"
          data-testid="ldist-job-add"
          onClick={() => onDraftChange((current) => addLdistJob(current))}
        >
          <FilePlus2 size={16} />
          {ja.liner.ldist.addJob}
        </button>
      </header>

      {jobs.length === 0 && <p className="liner-edit-help">{ja.liner.ldist.emptyJobs}</p>}

      {jobs.map((job) => (
        <article key={job.id} className="liner-edit-subpanel" data-testid={`ldist-job-row-${job.id}`}>
          <div className="liner-edit-form-grid">
            <label>
              <span>{ja.liner.ldist.jobLabel}</span>
              <CompositionAwareInput
                value={job.label ?? ""}
                data-testid={`ldist-job-label-${job.id}`}
                onCompositionStateChange={onCompositionStateChange}
                onValueChange={(value) =>
                  onDraftChange((current) => updateLdistJob(current, job.id, { label: value }))
                }
              />
            </label>
            <label>
              <span>{ja.liner.ldist.jobKind}</span>
              <select
                value={job.kind}
                data-testid={`ldist-job-kind-${job.id}`}
                onChange={(event) =>
                  onDraftChange((current) =>
                    updateLdistJob(current, job.id, { kind: event.target.value as LdistJobKind }),
                  )
                }
              >
                <option value="grid_distance">{ja.liner.ldist.kindGridDistance}</option>
                <option value="overhang">{ja.liner.ldist.kindOverhang}</option>
              </select>
            </label>
            {job.kind === "grid_distance" && (
              <>
                <label>
                  <span>{ja.liner.ldist.distanceMode}</span>
                  <select
                    value={job.distanceMode ?? "mode_a"}
                    data-testid={`ldist-job-distance-mode-${job.id}`}
                    onChange={(event) =>
                      onDraftChange((current) =>
                        updateLdistJob(current, job.id, {
                          distanceMode: event.target.value as LdistDistanceMode,
                        }),
                      )
                    }
                  >
                    <option value="mode_a">{ja.liner.ldist.modeA}</option>
                    <option value="mode_b">{ja.liner.ldist.modeB}</option>
                  </select>
                </label>
                {(job.distanceMode ?? "mode_a") === "mode_b" && (
                  <label>
                    <span>{ja.liner.ldist.referenceLine}</span>
                    <select
                      value={job.referenceLineId ?? ""}
                      data-testid={`ldist-job-reference-line-${job.id}`}
                      onChange={(event) =>
                        onDraftChange((current) =>
                          updateLdistJob(current, job.id, { referenceLineId: event.target.value }),
                        )
                      }
                    >
                      <option value="">{ja.liner.ldist.selectLine}</option>
                      {lines.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.label ?? line.id}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="liner-edit-subpanel" data-testid={`ldist-job-pairs-${job.id}`}>
                  <h3>{ja.liner.ldist.pairs}</h3>
                  {(job.pairs.length > 0 ? job.pairs : [{ fromLineId: "", toLineId: "" }]).map(
                    (pair, index) => (
                      <div key={`${job.id}-pair-${index}`} className="liner-edit-form-grid">
                        <label>
                          <span>{ja.liner.ldist.fromLine}</span>
                          <select
                            value={pair.fromLineId}
                            data-testid={`ldist-pair-from-${job.id}-${index}`}
                            onChange={(event) => {
                              const nextPairs = [...job.pairs];
                              const current = nextPairs[index] ?? { fromLineId: "", toLineId: "" };
                              nextPairs[index] = { ...current, fromLineId: event.target.value };
                              onDraftChange((currentDraft) =>
                                updateLdistJob(currentDraft, job.id, { pairs: nextPairs }),
                              );
                            }}
                          >
                            <option value="">{ja.liner.ldist.selectLine}</option>
                            {lines.map((line) => (
                              <option key={line.id} value={line.id}>
                                {line.label ?? line.id}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>{ja.liner.ldist.toLine}</span>
                          <select
                            value={pair.toLineId}
                            data-testid={`ldist-pair-to-${job.id}-${index}`}
                            onChange={(event) => {
                              const nextPairs = [...job.pairs];
                              const current = nextPairs[index] ?? { fromLineId: "", toLineId: "" };
                              nextPairs[index] = { ...current, toLineId: event.target.value };
                              onDraftChange((currentDraft) =>
                                updateLdistJob(currentDraft, job.id, { pairs: nextPairs }),
                              );
                            }}
                          >
                            <option value="">{ja.liner.ldist.selectLine}</option>
                            {lines.map((line) => (
                              <option key={line.id} value={line.id}>
                                {line.label ?? line.id}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ),
                  )}
                  <button
                    type="button"
                    data-testid={`ldist-pair-add-${job.id}`}
                    onClick={() =>
                      onDraftChange((current) =>
                        updateLdistJob(current, job.id, {
                          pairs: [
                            ...job.pairs,
                            { fromLineId: lines[0]?.id ?? "", toLineId: lines[1]?.id ?? lines[0]?.id ?? "" },
                          ],
                        }),
                      )
                    }
                  >
                    {ja.liner.ldist.addPair}
                  </button>
                </div>
              </>
            )}
            {job.kind === "overhang" && (
              <>
                <label>
                  <span>{ja.liner.ldist.leftLine}</span>
                  <select
                    value={job.leftLineId ?? ""}
                    data-testid={`ldist-job-left-line-${job.id}`}
                    onChange={(event) =>
                      onDraftChange((current) =>
                        updateLdistJob(current, job.id, { leftLineId: event.target.value }),
                      )
                    }
                  >
                    <option value="">{ja.liner.ldist.selectLine}</option>
                    {lines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {line.label ?? line.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{ja.liner.ldist.rightLine}</span>
                  <select
                    value={job.rightLineId ?? ""}
                    data-testid={`ldist-job-right-line-${job.id}`}
                    onChange={(event) =>
                      onDraftChange((current) =>
                        updateLdistJob(current, job.id, { rightLineId: event.target.value }),
                      )
                    }
                  >
                    <option value="">{ja.liner.ldist.selectLine}</option>
                    {lines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {line.label ?? line.id}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <button
            type="button"
            data-testid={`ldist-job-remove-${job.id}`}
            onClick={() => onDraftChange((current) => removeLdistJob(current, job.id))}
          >
            <Trash2 size={16} />
            {ja.liner.ldist.removeJob}
          </button>
        </article>
      ))}
    </section>
  );
}
