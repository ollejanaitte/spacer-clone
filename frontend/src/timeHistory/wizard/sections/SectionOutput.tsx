import { ja } from "../../../i18n/ja";
import type { ProjectModel } from "../../../types";

type SectionOutputProps = {
  project: ProjectModel;
  selectedNodeId: string | null;
  selectedMemberId: string | null;
  onSelectNode: (id: string) => void;
  onSelectMember: (id: string) => void;
  onClear: () => void;
};

export function SectionOutput({
  project,
  selectedNodeId,
  selectedMemberId,
  onSelectNode,
  onSelectMember,
  onClear,
}: SectionOutputProps) {
  const labels = ja.timeHistoryWizard.output;
  const nodes = project.nodes ?? [];
  const members = project.members ?? [];
  const hasNode = Boolean(selectedNodeId);
  const hasMember = Boolean(selectedMemberId);
  const hasOutput = hasNode || hasMember;
  return (
    <section className="time-history-wizard-section section-output" aria-label={labels.heading}>
      <h2>{labels.heading}</h2>
      <div className="summary-list">
        <span>{labels.nodeLabel}</span>
        <span>{labels.nodeHelp}</span>
      </div>
      <label className="result-select">
        <span>{labels.nodeLabel}</span>
        <select
          aria-label={labels.nodeLabel}
          value={selectedNodeId ?? ""}
          onChange={(event) => onSelectNode(event.currentTarget.value)}
        >
          <option value="">{"--"}</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.id}
            </option>
          ))}
        </select>
      </label>
      <div className="summary-list">
        <span>{labels.memberLabel}</span>
        <span>{labels.memberHelp}</span>
      </div>
      <label className="result-select">
        <span>{labels.memberLabel}</span>
        <select
          aria-label={labels.memberLabel}
          value={selectedMemberId ?? ""}
          onChange={(event) => onSelectMember(event.currentTarget.value)}
        >
          <option value="">{"--"}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.id}
            </option>
          ))}
        </select>
      </label>
      <div className="summary-list result-toolbar">
        <button type="button" onClick={onClear} aria-label={labels.clearButton}>
          {labels.clearButton}
        </button>
      </div>
      <h3>{labels.outputComponentsHeading}</h3>
      <div className="summary-list">
        <span>{"X: " + (hasOutput ? "OK" : "未出力")}</span>
        <span>{"Y: " + (hasOutput ? "OK" : "未出力")}</span>
        <span>{"Z: " + (hasOutput ? "OK" : "未出力")}</span>
      </div>
      {!hasOutput && <p className="time-history-wizard-help">{labels.ngMessage}</p>}
    </section>
  );
}
