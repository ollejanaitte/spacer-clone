import { useMemo, useState } from "react";
import type { ProjectModel } from "../types";
import type { ApolloPhase1FeatureFlags } from "./featureFlag";

type ApolloPhase1ShellProps = {
  project: ProjectModel;
  flags: ApolloPhase1FeatureFlags;
  onProjectChange: (nextProject: ProjectModel) => void;
  onReturnToPro: () => void;
  onAuditEvent?: (message: string) => void;
};

type ShellValidation = {
  code: string;
  message: string;
};

const MAX_AUDIT_ENTRIES = 10;

function buildShellValidations(project: ProjectModel): ShellValidation[] {
  const validations: ShellValidation[] = [];
  const trimmedName = project.project.name.trim();
  if (trimmedName.length === 0) {
    validations.push({
      code: "NN-PROJECT-NAME-REQUIRED",
      message: "Project metadata shell requires a non-empty project name.",
    });
  }

  const nodeIds = new Set<string>();
  for (const node of project.nodes) {
    if (nodeIds.has(node.id)) {
      validations.push({
        code: "NN-DUPLICATE-NODE-ID",
        message: `Duplicate node id detected: ${node.id}`,
      });
    }
    nodeIds.add(node.id);
  }

  const materialIds = new Set(project.materials.map((material) => material.id));
  const sectionIds = new Set(project.sections.map((section) => section.id));
  for (const member of project.members) {
    if (!nodeIds.has(member.nodeI) || !nodeIds.has(member.nodeJ)) {
      validations.push({
        code: "NN-MEMBER-NODE-REFERENCE",
        message: `Member ${member.id} references a missing node.`,
      });
    }
    if (!materialIds.has(member.materialId)) {
      validations.push({
        code: "NN-MEMBER-MATERIAL-REFERENCE",
        message: `Member ${member.id} references a missing material.`,
      });
    }
    if (!sectionIds.has(member.sectionId)) {
      validations.push({
        code: "NN-MEMBER-SECTION-REFERENCE",
        message: `Member ${member.id} references a missing section.`,
      });
    }
  }

  for (const support of project.supports) {
    if (!nodeIds.has(support.nodeId)) {
      validations.push({
        code: "NN-SUPPORT-NODE-REFERENCE",
        message: `Support shell references missing node ${support.nodeId}.`,
      });
    }
  }

  return validations;
}

function nextDraftId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let counter = 1;
  while (used.has(`${prefix}${counter}`)) {
    counter += 1;
  }
  return `${prefix}${counter}`;
}

export function ApolloPhase1Shell({
  project,
  flags,
  onProjectChange,
  onReturnToPro,
  onAuditEvent,
}: ApolloPhase1ShellProps) {
  const [auditTrail, setAuditTrail] = useState<string[]>([
    "Apollo Phase 1-NN shell opened.",
  ]);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);

  const validations = useMemo(() => buildShellValidations(project), [project]);

  const pushAudit = (message: string) => {
    setAuditTrail((current) => [message, ...current].slice(0, MAX_AUDIT_ENTRIES));
    onAuditEvent?.(message);
  };

  const commitProject = (nextProject: ProjectModel, auditMessage: string) => {
    onProjectChange(nextProject);
    setInteractionMessage(auditMessage);
    pushAudit(auditMessage);
  };

  const updateProjectName = (name: string) => {
    commitProject(
      {
        ...project,
        project: {
          ...project.project,
          name,
        },
      },
      `Project name shell updated to "${name || "(empty)"}".`,
    );
  };

  const updateProjectDescription = (description: string) => {
    commitProject(
      {
        ...project,
        project: {
          ...project.project,
          description,
        },
      },
      "Project description shell updated.",
    );
  };

  const updatePrimaryMaterialName = (name: string) => {
    if (project.materials.length === 0) {
      setInteractionMessage("Primary material shell is unavailable because no material is present.");
      pushAudit("Primary material shell update blocked: no material present.");
      return;
    }

    commitProject(
      {
        ...project,
        materials: project.materials.map((material, index) =>
          index === 0 ? { ...material, name } : material,
        ),
      },
      `Primary material shell renamed to "${name || "(empty)"}".`,
    );
  };

  const addTopologyNode = () => {
    const id = nextDraftId("APN-", project.nodes.map((node) => node.id));
    const nextNode = { id, x: 0, y: 0, z: 0, label: "Unverified topology draft" };
    commitProject(
      {
        ...project,
        nodes: [...project.nodes, nextNode],
      },
      `Topology shell appended node ${id}.`,
    );
  };

  const addTopologyMember = () => {
    if (project.nodes.length < 2 || project.materials.length === 0 || project.sections.length === 0) {
      const message =
        "Member shell requires at least two nodes plus one material and one section. Numeric execution remains blocked.";
      setInteractionMessage(message);
      pushAudit("Member shell add blocked: prerequisites missing.");
      return;
    }

    const nodeI = project.nodes[Math.max(0, project.nodes.length - 2)]?.id ?? project.nodes[0].id;
    const nodeJ = project.nodes[project.nodes.length - 1]?.id ?? project.nodes[0].id;
    const memberId = nextDraftId("APM-", project.members.map((member) => member.id));
    const nextMember = {
      id: memberId,
      nodeI,
      nodeJ,
      materialId: project.materials[0].id,
      sectionId: project.sections[0].id,
      label: "Provisional topology member",
    };
    commitProject(
      {
        ...project,
        members: [...project.members, nextMember],
      },
      `Topology shell appended member ${memberId} (${nodeI} -> ${nodeJ}).`,
    );
  };

  const addSupportShell = () => {
    const unassignedNode = project.nodes.find(
      (node) => !project.supports.some((support) => support.nodeId === node.id),
    );
    if (!unassignedNode) {
      const message = "Support shell requires at least one node without an existing support.";
      setInteractionMessage(message);
      pushAudit("Support shell add blocked: every node already has support metadata.");
      return;
    }

    commitProject(
      {
        ...project,
        supports: [
          ...project.supports,
          {
            nodeId: unassignedNode.id,
            ux: false,
            uy: false,
            uz: false,
            rx: false,
            ry: false,
            rz: false,
          },
        ],
      },
      `Support shell appended placeholder support for node ${unassignedNode.id}.`,
    );
  };

  const recordBlockedNumericAction = () => {
    const message =
      "Numeric execution remains blocked on Tuesday, July 28, 2026. Phase 1-Numeric is NOGO until licensed source, machine, Golden, and parity evidence are complete.";
    setInteractionMessage(message);
    pushAudit("Numeric execution request denied by Phase 1-NN guard.");
  };

  const recordBlockedPublication = () => {
    const message =
      "Authoritative result publication remains blocked. This shell may show provisional structure state only.";
    setInteractionMessage(message);
    pushAudit("Result publication request denied by Phase 1-NN guard.");
  };

  return (
    <main className="apollo-phase1-shell" data-testid="apollo-phase1-shell">
      <header>
        <p data-testid="apollo-shell-kicker">Apollo Phase 1-NN</p>
        <h1>Apollo Phase 1 non-numeric shell</h1>
        <p>
          This route is limited to UI, topology, adapter, and guard shells. Solver execution,
          verified outputs, and production publication remain prohibited.
        </p>
      </header>

      {flags.showProvisionalStatus ? (
        <section
          className="apollo-phase1-banner"
          data-testid="apollo-provisional-banner"
          aria-label="provisional-status-banner"
        >
          <strong>Provisional / unverified status</strong>
          <p>
            Any topology or metadata edited here is non-authoritative. Verified numeric results are
            unavailable on Tuesday, July 28, 2026.
          </p>
        </section>
      ) : null}

      <section data-testid="apollo-flag-matrix">
        <h2>Feature flags</h2>
        <ul>
          <li>`apollo.phase1_nn_enabled`: {flags.nnEnabled ? "ON" : "OFF"}</li>
          <li>`apollo.phase1_numeric_release_blocked`: {flags.numericReleaseBlocked ? "ON" : "OFF"}</li>
          <li>`apollo.phase1_show_provisional_status`: {flags.showProvisionalStatus ? "ON" : "OFF"}</li>
          <li>`apollo.phase1_disable_result_publication`: {flags.disableResultPublication ? "ON" : "OFF"}</li>
          <li>`apollo.phase1_disable_numeric_execution`: {flags.disableNumericExecution ? "ON" : "OFF"}</li>
        </ul>
      </section>

      <section data-testid="apollo-project-shell">
        <h2>Project shell</h2>
        <label>
          Project name
          <input
            data-testid="apollo-project-name-input"
            value={project.project.name}
            onInput={(event) =>
              updateProjectName((event.target as HTMLInputElement).value)
            }
            onChange={(event) => updateProjectName(event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            data-testid="apollo-project-description-input"
            value={project.project.description}
            onInput={(event) =>
              updateProjectDescription((event.target as HTMLTextAreaElement).value)
            }
            onChange={(event) => updateProjectDescription(event.target.value)}
          />
        </label>
      </section>

      <section data-testid="apollo-topology-shell">
        <h2>Topology editor shell</h2>
        <p>
          Topology edits remain non-numeric drafts. Coordinates and engineering properties are not
          released from this route.
        </p>
        <div className="apollo-topology-actions">
          <button type="button" data-testid="apollo-add-node" onClick={addTopologyNode}>
            Add node shell
          </button>
          <button type="button" data-testid="apollo-add-member" onClick={addTopologyMember}>
            Add member shell
          </button>
          <button type="button" data-testid="apollo-add-support" onClick={addSupportShell}>
            Add support shell
          </button>
        </div>
        <dl data-testid="apollo-topology-summary">
          <div>
            <dt>Nodes</dt>
            <dd>{project.nodes.length}</dd>
          </div>
          <div>
            <dt>Members</dt>
            <dd>{project.members.length}</dd>
          </div>
          <div>
            <dt>Supports</dt>
            <dd>{project.supports.length}</dd>
          </div>
          <div>
            <dt>Materials</dt>
            <dd>{project.materials.length}</dd>
          </div>
        </dl>
        <div data-testid="apollo-node-preview">
          <strong>Node preview</strong>
          <ul>
            {project.nodes.slice(0, 5).map((node) => (
              <li key={node.id}>
                {node.id} / ({node.x}, {node.y}, {node.z}) / {node.label ?? "no label"}
              </li>
            ))}
          </ul>
        </div>
        <label>
          Primary material shell
          <input
            data-testid="apollo-material-name-input"
            value={project.materials[0]?.name ?? ""}
            onChange={(event) => updatePrimaryMaterialName(event.target.value)}
          />
        </label>
      </section>

      <section data-testid="apollo-adapter-shell">
        <h2>Adapter shell</h2>
        <ul>
          <li>Frame adapter: defined as shell only</li>
          <li>Import/export boundary: shell only</li>
          <li>Native Analyzer / SPACER compatibility: blocked pending licensed machine evidence</li>
        </ul>
      </section>

      <section data-testid="apollo-validation-shell">
        <h2>Validation message shell</h2>
        {validations.length === 0 ? (
          <p data-testid="apollo-validation-ok">No shell-level validation issues detected.</p>
        ) : (
          <ul data-testid="apollo-validation-list">
            {validations.map((validation) => (
              <li key={validation.code}>
                {validation.code}: {validation.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="apollo-result-shell">
        <h2>Result viewer shell</h2>
        <p>No verified status badge is available in this route.</p>
        <button
          type="button"
          aria-disabled={flags.disableNumericExecution}
          data-testid="apollo-numeric-execution-guard"
          onClick={recordBlockedNumericAction}
        >
          Numeric execution blocked
        </button>
        <button
          type="button"
          aria-disabled={flags.disableResultPublication}
          data-testid="apollo-result-publication-guard"
          onClick={recordBlockedPublication}
        >
          Result publication blocked
        </button>
      </section>

      <section data-testid="apollo-audit-shell">
        <h2>Audit trail shell</h2>
        <ul>
          {auditTrail.map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ul>
      </section>

      {interactionMessage ? (
        <section data-testid="apollo-interaction-message">
          <strong>Latest shell message</strong>
          <p>{interactionMessage}</p>
        </section>
      ) : null}

      <footer>
        <button type="button" onClick={onReturnToPro} data-testid="apollo-return-to-pro">
          Return to workspace
        </button>
      </footer>
    </main>
  );
}
