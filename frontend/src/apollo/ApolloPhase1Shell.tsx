import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Viewer3D } from "../viewer/Viewer3D";
import type { ViewerSelection } from "../viewer/types";
import type {
  ApolloPhase1FeatureFlags,
} from "./featureFlag";
import {
  appendApolloPhase1Unit2Audit,
  APOLLO_PHASE1_UNIT2_SCHEMA_VERSION,
  buildApolloPhase1Unit2ReferenceUsage,
  buildApolloPhase1Unit2ViewProject,
  getApolloPhase1Unit2Draft,
  nextApolloUnit2Id,
  validateApolloPhase1Unit2Draft,
  withApolloPhase1Unit2Draft,
  type ApolloPhase1Unit2ViewSelection,
} from "./unit2Draft";
import type {
  ApolloPhase1Unit2Draft,
  ApolloPhase1Unit2MaterialReference,
  ApolloPhase1Unit2Member,
  ApolloPhase1Unit2Node,
  ApolloPhase1Unit2Support,
  ProjectModel,
  SectionKey,
} from "../types";

type ApolloPhase1ShellProps = {
  project: ProjectModel;
  dirty: boolean;
  flags: ApolloPhase1FeatureFlags;
  onProjectChange: (nextProject: ProjectModel) => void;
  onReturnToPro: () => void;
  onSaveProject: () => Promise<boolean>;
  onReloadProject: () => Promise<boolean>;
  onAuditEvent?: (message: string) => void;
};

type EditorPane = "project" | "nodes" | "members" | "supports" | "materials";

const VERIFICATION_DATE = "Tuesday, July 28, 2026";

function nowIsoString(): string {
  return new Date().toISOString();
}

function summarizeList(items: readonly string[]): string {
  return items.length > 0 ? items.join(", ") : "none";
}

function reorderRows<T>(rows: readonly T[], currentIndex: number, nextIndex: number): T[] {
  if (currentIndex === nextIndex || currentIndex < 0 || nextIndex < 0) return [...rows];
  if (currentIndex >= rows.length || nextIndex >= rows.length) return [...rows];
  const nextRows = [...rows];
  const [target] = nextRows.splice(currentIndex, 1);
  nextRows.splice(nextIndex, 0, target);
  return nextRows;
}

function tableSelectionKeyDown(
  event: KeyboardEvent<HTMLElement>,
  ids: readonly string[],
  selectedId: string | null,
  onSelect: (id: string) => void,
) {
  if (ids.length === 0) return;
  const currentIndex = selectedId ? ids.indexOf(selectedId) : 0;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    onSelect(ids[Math.min(ids.length - 1, Math.max(0, currentIndex) + 1)]);
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    onSelect(ids[Math.max(0, currentIndex <= 0 ? 0 : currentIndex - 1)]);
  }
}

export function ApolloPhase1Shell({
  project,
  dirty,
  flags,
  onProjectChange,
  onReturnToPro,
  onSaveProject,
  onReloadProject,
  onAuditEvent,
}: ApolloPhase1ShellProps) {
  const draft = useMemo(() => getApolloPhase1Unit2Draft(project), [project]);
  const viewProject = useMemo(() => buildApolloPhase1Unit2ViewProject(project), [project]);
  const validation = useMemo(() => validateApolloPhase1Unit2Draft(draft), [draft]);
  const referenceUsage = useMemo(() => buildApolloPhase1Unit2ReferenceUsage(draft), [draft]);
  const [editorPane, setEditorPane] = useState<EditorPane>("nodes");
  const [selection, setSelection] = useState<ApolloPhase1Unit2ViewSelection>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [viewerMessage, setViewerMessage] = useState<string | null>(null);
  const [persisting, setPersisting] = useState<"save" | "reload" | null>(null);

  useEffect(() => {
    if (selection?.kind === "node" && draft.nodes.some((node) => node.id === selection.id)) return;
    if (selection?.kind === "member" && draft.members.some((member) => member.id === selection.id)) return;
    if (selection?.kind === "support" && draft.supports.some((support) => support.id === selection.id)) return;
    if (
      selection?.kind === "material" &&
      draft.materialReferences.some((material) => material.id === selection.id)
    ) {
      return;
    }
    if (draft.nodes.length > 0) {
      setSelection({ kind: "node", id: draft.nodes[0].id });
      setEditorPane("nodes");
      return;
    }
    if (draft.materialReferences.length > 0) {
      setSelection({ kind: "material", id: draft.materialReferences[0].id });
      setEditorPane("materials");
      return;
    }
    setSelection(null);
  }, [draft, selection]);

  const selectedNode =
    selection?.kind === "node"
      ? draft.nodes.find((node) => node.id === selection.id) ?? null
      : null;
  const selectedMember =
    selection?.kind === "member"
      ? draft.members.find((member) => member.id === selection.id) ?? null
      : null;
  const selectedSupport =
    selection?.kind === "support"
      ? draft.supports.find((support) => support.id === selection.id) ?? null
      : null;
  const selectedMaterial =
    selection?.kind === "material"
      ? draft.materialReferences.find((material) => material.id === selection.id) ?? null
      : null;

  const viewerSelection: ViewerSelection =
    selection?.kind === "node"
      ? { type: "node", id: selection.id }
      : selection?.kind === "member"
        ? { type: "member", id: selection.id }
        : null;
  const viewerSection: SectionKey =
    selection?.kind === "member"
      ? "members"
      : selection?.kind === "support"
        ? "supports"
        : selection?.kind === "material"
          ? "materials"
          : "nodes";

  const applyDraftChange = (
    message: string,
    action: string,
    entityType: "project" | "node" | "member" | "support" | "material",
    entityId: string | null,
    updater: (currentDraft: ApolloPhase1Unit2Draft) => ApolloPhase1Unit2Draft,
  ) => {
    const timestamp = nowIsoString();
    const nextProject = withApolloPhase1Unit2Draft(project, (currentDraft) => {
      const updatedDraft = updater(currentDraft);
      const withMetadata = {
        ...updatedDraft,
        metadata: {
          ...updatedDraft.metadata,
          updatedAt: timestamp,
        },
      };
      return appendApolloPhase1Unit2Audit(
        withMetadata,
        timestamp,
        action,
        entityType,
        entityId,
        message,
      );
    });
    onProjectChange(nextProject);
    setInteractionMessage(message);
    onAuditEvent?.(message);
  };

  const rejectOperation = (
    message: string,
    entityType: "project" | "node" | "member" | "support" | "material",
    entityId: string | null,
  ) => {
    applyDraftChange(message, "reject", entityType, entityId, (currentDraft) => currentDraft);
  };

  const updateProjectField = (
    field: "projectId" | "name" | "description",
    value: string,
    message: string,
  ) => {
    applyDraftChange(message, "project.update", "project", draft.metadata.projectId, (currentDraft) => ({
      ...currentDraft,
      metadata: {
        ...currentDraft.metadata,
        [field]: value,
      },
    }));
  };

  const updateNode = (
    nodeId: string,
    updater: (node: ApolloPhase1Unit2Node) => ApolloPhase1Unit2Node,
    message: string,
  ) => {
    applyDraftChange(message, "node.update", "node", nodeId, (currentDraft) => ({
      ...currentDraft,
      nodes: currentDraft.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    }));
  };

  const renameNode = (nodeId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation("Node id cannot be empty.", "node", nodeId);
      return;
    }
    if (trimmed !== nodeId && draft.nodes.some((node) => node.id === trimmed)) {
      rejectOperation(`Node id ${trimmed} is already in use.`, "node", nodeId);
      return;
    }
    applyDraftChange(`Node ${nodeId} renamed to ${trimmed}.`, "node.rename", "node", nodeId, (currentDraft) => ({
      ...currentDraft,
      nodes: currentDraft.nodes.map((node) =>
        node.id === nodeId ? { ...node, id: trimmed } : node,
      ),
      members: currentDraft.members.map((member) => ({
        ...member,
        nodeI: member.nodeI === nodeId ? trimmed : member.nodeI,
        nodeJ: member.nodeJ === nodeId ? trimmed : member.nodeJ,
      })),
      supports: currentDraft.supports.map((support) =>
        support.nodeId === nodeId ? { ...support, nodeId: trimmed } : support,
      ),
    }));
    setSelection({ kind: "node", id: trimmed });
  };

  const updateMaterial = (
    materialId: string,
    updater: (material: ApolloPhase1Unit2MaterialReference) => ApolloPhase1Unit2MaterialReference,
    message: string,
  ) => {
    applyDraftChange(message, "material.update", "material", materialId, (currentDraft) => ({
      ...currentDraft,
      materialReferences: currentDraft.materialReferences.map((material) =>
        material.id === materialId ? updater(material) : material,
      ),
    }));
  };

  const renameMaterial = (materialId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation("Material reference id cannot be empty.", "material", materialId);
      return;
    }
    if (trimmed !== materialId && draft.materialReferences.some((material) => material.id === trimmed)) {
      rejectOperation(`Material reference id ${trimmed} is already in use.`, "material", materialId);
      return;
    }
    applyDraftChange(
      `Material reference ${materialId} renamed to ${trimmed}.`,
      "material.rename",
      "material",
      materialId,
      (currentDraft) => ({
        ...currentDraft,
        materialReferences: currentDraft.materialReferences.map((material) =>
          material.id === materialId ? { ...material, id: trimmed } : material,
        ),
        members: currentDraft.members.map((member) =>
          member.materialRefId === materialId ? { ...member, materialRefId: trimmed } : member,
        ),
      }),
    );
    setSelection({ kind: "material", id: trimmed });
  };

  const updateMember = (
    memberId: string,
    updater: (member: ApolloPhase1Unit2Member) => ApolloPhase1Unit2Member,
    message: string,
  ) => {
    applyDraftChange(message, "member.update", "member", memberId, (currentDraft) => ({
      ...currentDraft,
      members: currentDraft.members.map((member) =>
        member.id === memberId ? updater(member) : member,
      ),
    }));
  };

  const renameMember = (memberId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation("Member id cannot be empty.", "member", memberId);
      return;
    }
    if (trimmed !== memberId && draft.members.some((member) => member.id === trimmed)) {
      rejectOperation(`Member id ${trimmed} is already in use.`, "member", memberId);
      return;
    }
    applyDraftChange(`Member ${memberId} renamed to ${trimmed}.`, "member.rename", "member", memberId, (currentDraft) => ({
      ...currentDraft,
      members: currentDraft.members.map((member) =>
        member.id === memberId ? { ...member, id: trimmed } : member,
      ),
    }));
    setSelection({ kind: "member", id: trimmed });
  };

  const updateSupport = (
    supportId: string,
    updater: (support: ApolloPhase1Unit2Support) => ApolloPhase1Unit2Support,
    message: string,
  ) => {
    applyDraftChange(message, "support.update", "support", supportId, (currentDraft) => ({
      ...currentDraft,
      supports: currentDraft.supports.map((support) =>
        support.id === supportId ? updater(support) : support,
      ),
    }));
  };

  const renameSupport = (supportId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation("Support id cannot be empty.", "support", supportId);
      return;
    }
    if (trimmed !== supportId && draft.supports.some((support) => support.id === trimmed)) {
      rejectOperation(`Support id ${trimmed} is already in use.`, "support", supportId);
      return;
    }
    applyDraftChange(`Support ${supportId} renamed to ${trimmed}.`, "support.rename", "support", supportId, (currentDraft) => ({
      ...currentDraft,
      supports: currentDraft.supports.map((support) =>
        support.id === supportId ? { ...support, id: trimmed } : support,
      ),
    }));
    setSelection({ kind: "support", id: trimmed });
  };

  const addNode = () => {
    const id = nextApolloUnit2Id("APN-", draft.nodes.map((node) => node.id));
    applyDraftChange(`Node ${id} added to the topology shell.`, "node.add", "node", id, (currentDraft) => ({
      ...currentDraft,
      nodes: [
        ...currentDraft.nodes,
        {
          id,
          label: id,
          x: 0,
          y: 0,
          z: 0,
          active: true,
          comment: "",
        },
      ],
    }));
    setSelection({ kind: "node", id });
    setEditorPane("nodes");
  };

  const duplicateNode = (nodeId: string) => {
    const source = draft.nodes.find((node) => node.id === nodeId);
    if (!source) return;
    const id = nextApolloUnit2Id("APN-", draft.nodes.map((node) => node.id));
    applyDraftChange(`Node ${nodeId} duplicated to ${id}.`, "node.duplicate", "node", nodeId, (currentDraft) => ({
      ...currentDraft,
      nodes: [
        ...currentDraft.nodes,
        {
          ...source,
          id,
          label: `${source.label} Copy`,
        },
      ],
    }));
    setSelection({ kind: "node", id });
  };

  const deleteNode = (nodeId: string) => {
    const memberRefs = referenceUsage.nodeToMemberIds.get(nodeId) ?? [];
    const supportRefs = referenceUsage.nodeToSupportIds.get(nodeId) ?? [];
    if (memberRefs.length > 0 || supportRefs.length > 0) {
      rejectOperation(
        `Node ${nodeId} cannot be deleted while referenced by members (${summarizeList(memberRefs)}) or supports (${summarizeList(supportRefs)}).`,
        "node",
        nodeId,
      );
      return;
    }
    applyDraftChange(`Node ${nodeId} deleted from the topology shell.`, "node.delete", "node", nodeId, (currentDraft) => ({
      ...currentDraft,
      nodes: currentDraft.nodes.filter((node) => node.id !== nodeId),
    }));
    if (selection?.kind === "node" && selection.id === nodeId) {
      setSelection(null);
    }
  };

  const addMaterial = () => {
    const id = nextApolloUnit2Id("MAT-REF-", draft.materialReferences.map((material) => material.id));
    applyDraftChange(
      `Material reference ${id} added to the shell.`,
      "material.add",
      "material",
      id,
      (currentDraft) => ({
        ...currentDraft,
        materialReferences: [
          ...currentDraft.materialReferences,
          {
            id,
            displayName: id,
            category: "general",
            sourceStatus: "blocked_by_numeric_evidence",
            provisionalStatus: "unverified",
            active: true,
            comment: "",
          },
        ],
      }),
    );
    setSelection({ kind: "material", id });
    setEditorPane("materials");
  };

  const duplicateMaterial = (materialId: string) => {
    const source = draft.materialReferences.find((material) => material.id === materialId);
    if (!source) return;
    const id = nextApolloUnit2Id("MAT-REF-", draft.materialReferences.map((material) => material.id));
    applyDraftChange(
      `Material reference ${materialId} duplicated to ${id}.`,
      "material.duplicate",
      "material",
      materialId,
      (currentDraft) => ({
        ...currentDraft,
        materialReferences: [
          ...currentDraft.materialReferences,
          { ...source, id, displayName: `${source.displayName} Copy` },
        ],
      }),
    );
    setSelection({ kind: "material", id });
  };

  const deleteMaterial = (materialId: string) => {
    const memberRefs = referenceUsage.materialToMemberIds.get(materialId) ?? [];
    if (memberRefs.length > 0) {
      rejectOperation(
        `Material reference ${materialId} cannot be deleted while referenced by members (${summarizeList(memberRefs)}).`,
        "material",
        materialId,
      );
      return;
    }
    applyDraftChange(
      `Material reference ${materialId} deleted from the shell.`,
      "material.delete",
      "material",
      materialId,
      (currentDraft) => ({
        ...currentDraft,
        materialReferences: currentDraft.materialReferences.filter((material) => material.id !== materialId),
      }),
    );
    if (selection?.kind === "material" && selection.id === materialId) {
      setSelection(null);
    }
  };

  const addMember = () => {
    if (draft.nodes.length < 2) {
      rejectOperation("Member shell requires at least two nodes.", "member", null);
      return;
    }
    if (draft.materialReferences.length === 0) {
      rejectOperation("Member shell requires at least one material reference.", "member", null);
      return;
    }
    const id = nextApolloUnit2Id("APM-", draft.members.map((member) => member.id));
    const nodeI = draft.nodes[0].id;
    const nodeJ = draft.nodes[1].id;
    const materialRefId = draft.materialReferences[0].id;
    applyDraftChange(`Member ${id} added to the topology shell.`, "member.add", "member", id, (currentDraft) => ({
      ...currentDraft,
      members: [
        ...currentDraft.members,
        {
          id,
          label: id,
          nodeI,
          nodeJ,
          materialRefId,
          active: true,
          comment: "",
        },
      ],
    }));
    setSelection({ kind: "member", id });
    setEditorPane("members");
  };

  const duplicateMember = (memberId: string) => {
    const source = draft.members.find((member) => member.id === memberId);
    if (!source) return;
    const id = nextApolloUnit2Id("APM-", draft.members.map((member) => member.id));
    applyDraftChange(`Member ${memberId} duplicated to ${id}.`, "member.duplicate", "member", memberId, (currentDraft) => ({
      ...currentDraft,
      members: [
        ...currentDraft.members,
        {
          ...source,
          id,
          label: `${source.label} Copy`,
        },
      ],
    }));
    setSelection({ kind: "member", id });
  };

  const deleteMember = (memberId: string) => {
    applyDraftChange(`Member ${memberId} deleted from the topology shell.`, "member.delete", "member", memberId, (currentDraft) => ({
      ...currentDraft,
      members: currentDraft.members.filter((member) => member.id !== memberId),
    }));
    if (selection?.kind === "member" && selection.id === memberId) {
      setSelection(null);
    }
  };

  const addSupport = () => {
    const candidateNode = draft.nodes.find(
      (node) => !draft.supports.some((support) => support.nodeId === node.id),
    );
    if (!candidateNode) {
      rejectOperation("Support shell requires at least one node without an assigned support.", "support", null);
      return;
    }
    const id = nextApolloUnit2Id("SUP-", draft.supports.map((support) => support.id));
    applyDraftChange(`Support ${id} added for node ${candidateNode.id}.`, "support.add", "support", id, (currentDraft) => ({
      ...currentDraft,
      supports: [
        ...currentDraft.supports,
        {
          id,
          nodeId: candidateNode.id,
          label: candidateNode.id,
          ux: "FIXED",
          uy: "FIXED",
          uz: "FIXED",
          rx: "FREE",
          ry: "FREE",
          rz: "FREE",
          active: true,
          comment: "",
        },
      ],
    }));
    setSelection({ kind: "support", id });
    setEditorPane("supports");
  };

  const duplicateSupport = (supportId: string) => {
    const source = draft.supports.find((support) => support.id === supportId);
    if (!source) return;
    const candidateNode = draft.nodes.find(
      (node) =>
        node.id !== source.nodeId && !draft.supports.some((support) => support.nodeId === node.id),
    );
    if (!candidateNode) {
      rejectOperation(
        `Support ${supportId} cannot be duplicated because every node already has a support shell.`,
        "support",
        supportId,
      );
      return;
    }
    const id = nextApolloUnit2Id("SUP-", draft.supports.map((support) => support.id));
    applyDraftChange(`Support ${supportId} duplicated to ${id}.`, "support.duplicate", "support", supportId, (currentDraft) => ({
      ...currentDraft,
      supports: [
        ...currentDraft.supports,
        {
          ...source,
          id,
          nodeId: candidateNode.id,
          label: candidateNode.id,
        },
      ],
    }));
    setSelection({ kind: "support", id });
  };

  const deleteSupport = (supportId: string) => {
    applyDraftChange(`Support ${supportId} deleted from the shell.`, "support.delete", "support", supportId, (currentDraft) => ({
      ...currentDraft,
      supports: currentDraft.supports.filter((support) => support.id !== supportId),
    }));
    if (selection?.kind === "support" && selection.id === supportId) {
      setSelection(null);
    }
  };

  const changeCoordinate = (nodeId: string, axis: "x" | "y" | "z", raw: string) => {
    const nextValue = Number(raw);
    if (raw.trim().length === 0 || !Number.isFinite(nextValue)) {
      rejectOperation(
        `Node ${nodeId} rejected invalid ${axis.toUpperCase()} coordinate input.`,
        "node",
        nodeId,
      );
      return;
    }
    updateNode(
      nodeId,
      (node) => ({ ...node, [axis]: nextValue }),
      `Node ${nodeId} ${axis.toUpperCase()} coordinate updated to ${nextValue}.`,
    );
  };

  const changeMemberNode = (memberId: string, end: "nodeI" | "nodeJ", nextNodeId: string) => {
    const member = draft.members.find((item) => item.id === memberId);
    if (!member) return;
    const candidate = {
      ...member,
      [end]: nextNodeId,
    };
    if (candidate.nodeI === candidate.nodeJ) {
      rejectOperation(`Member ${memberId} cannot use the same node at both ends.`, "member", memberId);
      return;
    }
    updateMember(
      memberId,
      (item) => ({ ...item, [end]: nextNodeId }),
      `Member ${memberId} ${end === "nodeI" ? "I-end" : "J-end"} updated to ${nextNodeId}.`,
    );
  };

  const changeSupportNode = (supportId: string, nextNodeId: string) => {
    if (
      draft.supports.some((support) => support.id !== supportId && support.nodeId === nextNodeId)
    ) {
      rejectOperation(`Node ${nextNodeId} already has a support shell.`, "support", supportId);
      return;
    }
    updateSupport(
      supportId,
      (support) => ({ ...support, nodeId: nextNodeId, label: support.label || nextNodeId }),
      `Support ${supportId} moved to node ${nextNodeId}.`,
    );
  };

  const moveRow = <T extends { id: string }>(
    items: readonly T[],
    itemId: string,
    direction: -1 | 1,
    kind: "node" | "member" | "support" | "material",
    update: (rows: T[]) => ApolloPhase1Unit2Draft,
  ) => {
    const index = items.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const reordered = reorderRows(items, index, nextIndex);
    applyDraftChange(
      `${kind[0].toUpperCase()}${kind.slice(1)} ${itemId} reordered.`,
      `${kind}.reorder`,
      kind,
      itemId,
      () => update(reordered as T[]),
    );
  };

  const handleSave = async () => {
    setPersisting("save");
    const timestamp = nowIsoString();
    const message = "Apollo Phase 1-NN unit 2 draft save requested.";
    onProjectChange(
      withApolloPhase1Unit2Draft(project, (currentDraft) =>
        appendApolloPhase1Unit2Audit(
          {
            ...currentDraft,
            metadata: {
              ...currentDraft.metadata,
              updatedAt: timestamp,
            },
          },
          timestamp,
          "project.save.request",
          "project",
          currentDraft.metadata.projectId,
          message,
        ),
      ),
    );
    onAuditEvent?.(message);
    const ok = await onSaveProject();
    setPersisting(null);
    setInteractionMessage(ok ? "Project save completed." : "Project save was canceled or failed.");
  };

  const handleReload = async () => {
    setPersisting("reload");
    const ok = await onReloadProject();
    setPersisting(null);
    setInteractionMessage(ok ? "Project reload completed." : "Project reload was canceled or failed.");
    if (ok) {
      onAuditEvent?.("Apollo Phase 1-NN unit 2 reload completed.");
    }
  };

  const handleViewerSelection = (nextSelection: ViewerSelection) => {
    if (nextSelection?.type === "node") {
      setSelection({ kind: "node", id: nextSelection.id });
      setEditorPane("nodes");
      return;
    }
    if (nextSelection?.type === "member") {
      setSelection({ kind: "member", id: nextSelection.id });
      setEditorPane("members");
      return;
    }
    setSelection(null);
  };

  return (
    <main className="apollo-phase1-shell" data-testid="apollo-phase1-shell">
      <header className="apollo-unit2-header">
        <div>
          <p data-testid="apollo-shell-kicker">Apollo Phase 1-NN Unit 2</p>
          <h1>Apollo Phase 1 non-numeric practical topology shell</h1>
          <p>
            This route edits non-numeric topology drafts only. Solver execution, verified
            outputs, and production publication remain prohibited on {VERIFICATION_DATE}.
          </p>
        </div>
        <div className="apollo-unit2-header-actions">
          <button
            type="button"
            data-testid="apollo-save-project"
            onClick={() => void handleSave()}
            disabled={persisting !== null}
          >
            {persisting === "save" ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            data-testid="apollo-reload-project"
            onClick={() => void handleReload()}
            disabled={persisting !== null}
          >
            {persisting === "reload" ? "Reloading..." : "Reload draft"}
          </button>
          <button type="button" onClick={onReturnToPro} data-testid="apollo-return-to-pro">
            Return to workspace
          </button>
        </div>
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
            unavailable on {VERIFICATION_DATE}.
          </p>
        </section>
      ) : null}

      <section className="apollo-unit2-summary-grid">
        <article data-testid="apollo-project-shell">
          <h2>Project metadata and persistence</h2>
          <dl className="apollo-project-meta-list">
            <div>
              <dt>Draft schema</dt>
              <dd>{APOLLO_PHASE1_UNIT2_SCHEMA_VERSION}</dd>
            </div>
            <div>
              <dt>Local draft status</dt>
              <dd>{dirty ? "dirty" : draft.metadata.localDraftStatus}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{draft.metadata.createdAt}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{draft.metadata.updatedAt}</dd>
            </div>
          </dl>
          <div className="apollo-project-form-grid">
            <label>
              Project ID
              <input
                data-testid="apollo-project-id-input"
                value={draft.metadata.projectId}
                onChange={(event) =>
                  updateProjectField(
                    "projectId",
                    event.currentTarget.value,
                    `Project id updated to ${event.currentTarget.value || "(empty)"}.`,
                  )
                }
              />
            </label>
            <label>
              Project name
              <input
                data-testid="apollo-project-name-input"
                value={draft.metadata.name}
                onChange={(event) =>
                  updateProjectField(
                    "name",
                    event.currentTarget.value,
                    `Project name updated to ${event.currentTarget.value || "(empty)"}.`,
                  )
                }
              />
            </label>
            <label className="apollo-project-form-wide">
              Description
              <textarea
                data-testid="apollo-project-description-input"
                value={draft.metadata.description}
                onChange={(event) =>
                  updateProjectField(
                    "description",
                    event.currentTarget.value,
                    "Project description updated.",
                  )
                }
              />
            </label>
          </div>
        </article>

        <article data-testid="apollo-flag-matrix">
          <h2>Feature flags and guards</h2>
          <ul>
            <li>`apollo.phase1_nn_enabled`: {flags.nnEnabled ? "ON" : "OFF"}</li>
            <li>`apollo.phase1_numeric_release_blocked`: {flags.numericReleaseBlocked ? "ON" : "OFF"}</li>
            <li>`apollo.phase1_show_provisional_status`: {flags.showProvisionalStatus ? "ON" : "OFF"}</li>
            <li>`apollo.phase1_disable_result_publication`: {flags.disableResultPublication ? "ON" : "OFF"}</li>
            <li>`apollo.phase1_disable_numeric_execution`: {flags.disableNumericExecution ? "ON" : "OFF"}</li>
          </ul>
          <p>
            Materials are reference shells only. No Young&apos;s modulus, density, section
            properties, load numerics, or verified results are edited here.
          </p>
        </article>
      </section>

      <section className="apollo-unit2-layout">
        <div className="apollo-unit2-editor">
          <nav className="apollo-unit2-tabs" aria-label="Apollo editor sections">
            {(["nodes", "members", "supports", "materials"] as const).map((pane) => (
              <button
                key={pane}
                type="button"
                className={editorPane === pane ? "active" : ""}
                onClick={() => setEditorPane(pane)}
              >
                {pane}
              </button>
            ))}
          </nav>

          {editorPane === "nodes" ? (
            <section data-testid="apollo-node-editor" className="apollo-editor-card">
              <div className="apollo-editor-card-header">
                <div>
                  <h2>Node editor</h2>
                  <p>Stable node IDs, coordinates, activity, comments, reference usage, and table selection.</p>
                </div>
                <button type="button" data-testid="apollo-add-node" onClick={addNode}>
                  Add node
                </button>
              </div>
              <div
                className="apollo-table-wrap"
                tabIndex={0}
                onKeyDown={(event) =>
                  tableSelectionKeyDown(
                    event,
                    draft.nodes.map((node) => node.id),
                    selectedNode?.id ?? null,
                    (id) => setSelection({ kind: "node", id }),
                  )
                }
              >
                <table className="apollo-edit-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>ID</th>
                      <th>Label</th>
                      <th>X</th>
                      <th>Y</th>
                      <th>Z</th>
                      <th>Active</th>
                      <th>Comment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.nodes.map((node, index) => {
                      const selected = selectedNode?.id === node.id;
                      const memberRefs = referenceUsage.nodeToMemberIds.get(node.id) ?? [];
                      const supportRefs = referenceUsage.nodeToSupportIds.get(node.id) ?? [];
                      return (
                        <tr
                          key={node.id}
                          className={selected ? "selected" : ""}
                          data-testid={selected ? "apollo-node-row-selected" : undefined}
                        >
                          <td>
                            <button
                              type="button"
                              data-testid={`apollo-node-select-${node.id}`}
                              onClick={() => setSelection({ kind: "node", id: node.id })}
                            >
                              {selected ? "Selected" : "Select"}
                            </button>
                          </td>
                          <td>
                          <input
                            data-testid={selected ? `apollo-node-id-input-${node.id}` : undefined}
                            value={node.id}
                            onChange={(event) => renameNode(node.id, event.currentTarget.value)}
                          />
                          </td>
                          <td>
                            <input
                              data-testid={selected ? "apollo-node-label-input" : undefined}
                              value={node.label}
                              onChange={(event) =>
                                updateNode(
                                  node.id,
                                  (currentNode) => ({ ...currentNode, label: event.currentTarget.value }),
                                  `Node ${node.id} label updated.`,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              data-testid={selected ? "apollo-node-x-input" : undefined}
                              value={String(node.x)}
                              onChange={(event) => changeCoordinate(node.id, "x", event.currentTarget.value)}
                            />
                          </td>
                          <td>
                            <input
                              data-testid={selected ? "apollo-node-y-input" : undefined}
                              value={String(node.y)}
                              onChange={(event) => changeCoordinate(node.id, "y", event.currentTarget.value)}
                            />
                          </td>
                          <td>
                            <input
                              data-testid={selected ? "apollo-node-z-input" : undefined}
                              value={String(node.z)}
                              onChange={(event) => changeCoordinate(node.id, "z", event.currentTarget.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={node.active}
                              onChange={(event) =>
                                updateNode(
                                  node.id,
                                  (currentNode) => ({ ...currentNode, active: event.currentTarget.checked }),
                                  `Node ${node.id} active state updated.`,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              value={node.comment}
                              onChange={(event) =>
                                updateNode(
                                  node.id,
                                  (currentNode) => ({ ...currentNode, comment: event.currentTarget.value }),
                                  `Node ${node.id} comment updated.`,
                                )
                              }
                            />
                          </td>
                          <td className="apollo-row-actions">
                            <button type="button" onClick={() => duplicateNode(node.id)}>Duplicate</button>
                            <button
                              type="button"
                              onClick={() =>
                                moveRow(draft.nodes, node.id, -1, "node", (rows) => ({
                                  ...draft,
                                  nodes: rows as ApolloPhase1Unit2Node[],
                                }))
                              }
                              disabled={index === 0}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                moveRow(draft.nodes, node.id, 1, "node", (rows) => ({
                                  ...draft,
                                  nodes: rows as ApolloPhase1Unit2Node[],
                                }))
                              }
                              disabled={index === draft.nodes.length - 1}
                            >
                              Down
                            </button>
                            <button type="button" onClick={() => deleteNode(node.id)}>Delete</button>
                            <span className="apollo-row-usage">
                              refs M:{memberRefs.length} / S:{supportRefs.length}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedNode ? (
                <p className="apollo-reference-summary">
                  Selected node {selectedNode.id}: member refs {summarizeList(referenceUsage.nodeToMemberIds.get(selectedNode.id) ?? [])}; support refs {summarizeList(referenceUsage.nodeToSupportIds.get(selectedNode.id) ?? [])}
                </p>
              ) : null}
            </section>
          ) : null}

          {editorPane === "members" ? (
            <section data-testid="apollo-member-editor" className="apollo-editor-card">
              <div className="apollo-editor-card-header">
                <div>
                  <h2>Member editor</h2>
                  <p>I/J references, material references, activity, comments, and orphan prevention.</p>
                </div>
                <button type="button" data-testid="apollo-add-member" onClick={addMember}>
                  Add member
                </button>
              </div>
              <div
                className="apollo-table-wrap"
                tabIndex={0}
                onKeyDown={(event) =>
                  tableSelectionKeyDown(
                    event,
                    draft.members.map((member) => member.id),
                    selectedMember?.id ?? null,
                    (id) => setSelection({ kind: "member", id }),
                  )
                }
              >
                <table className="apollo-edit-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>ID</th>
                      <th>Label</th>
                      <th>I-end</th>
                      <th>J-end</th>
                      <th>Material ref</th>
                      <th>Active</th>
                      <th>Comment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.members.map((member, index) => (
                      <tr key={member.id} className={selectedMember?.id === member.id ? "selected" : ""}>
                        <td>
                          <button
                            type="button"
                            data-testid={`apollo-member-select-${member.id}`}
                            onClick={() => setSelection({ kind: "member", id: member.id })}
                          >
                            {selectedMember?.id === member.id ? "Selected" : "Select"}
                          </button>
                        </td>
                        <td>
                          <input value={member.id} onChange={(event) => renameMember(member.id, event.currentTarget.value)} />
                        </td>
                        <td>
                          <input
                            value={member.label}
                            onChange={(event) =>
                              updateMember(
                                member.id,
                                (currentMember) => ({ ...currentMember, label: event.currentTarget.value }),
                                `Member ${member.id} label updated.`,
                              )
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={member.nodeI}
                            onChange={(event) => changeMemberNode(member.id, "nodeI", event.currentTarget.value)}
                          >
                            {draft.nodes.map((node) => (
                              <option key={node.id} value={node.id}>
                                {node.id}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={member.nodeJ}
                            onChange={(event) => changeMemberNode(member.id, "nodeJ", event.currentTarget.value)}
                          >
                            {draft.nodes.map((node) => (
                              <option key={node.id} value={node.id}>
                                {node.id}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={member.materialRefId}
                            onChange={(event) =>
                              updateMember(
                                member.id,
                                (currentMember) => ({
                                  ...currentMember,
                                  materialRefId: event.currentTarget.value,
                                }),
                                `Member ${member.id} material reference updated.`,
                              )
                            }
                          >
                            {draft.materialReferences.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.id}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={member.active}
                            onChange={(event) =>
                              updateMember(
                                member.id,
                                (currentMember) => ({ ...currentMember, active: event.currentTarget.checked }),
                                `Member ${member.id} active state updated.`,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={member.comment}
                            onChange={(event) =>
                              updateMember(
                                member.id,
                                (currentMember) => ({ ...currentMember, comment: event.currentTarget.value }),
                                `Member ${member.id} comment updated.`,
                              )
                            }
                          />
                        </td>
                        <td className="apollo-row-actions">
                          <button type="button" onClick={() => duplicateMember(member.id)}>Duplicate</button>
                          <button
                            type="button"
                            onClick={() =>
                              moveRow(draft.members, member.id, -1, "member", (rows) => ({
                                ...draft,
                                members: rows as ApolloPhase1Unit2Member[],
                              }))
                            }
                            disabled={index === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              moveRow(draft.members, member.id, 1, "member", (rows) => ({
                                ...draft,
                                members: rows as ApolloPhase1Unit2Member[],
                              }))
                            }
                            disabled={index === draft.members.length - 1}
                          >
                            Down
                          </button>
                          <button type="button" onClick={() => deleteMember(member.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {editorPane === "supports" ? (
            <section data-testid="apollo-support-editor" className="apollo-editor-card">
              <div className="apollo-editor-card-header">
                <div>
                  <h2>Support editor</h2>
                  <p>Non-numeric restraint states only. Spring constants and stiffness values remain prohibited.</p>
                </div>
                <button type="button" data-testid="apollo-add-support" onClick={addSupport}>
                  Add support
                </button>
              </div>
              <div
                className="apollo-table-wrap"
                tabIndex={0}
                onKeyDown={(event) =>
                  tableSelectionKeyDown(
                    event,
                    draft.supports.map((support) => support.id),
                    selectedSupport?.id ?? null,
                    (id) => setSelection({ kind: "support", id }),
                  )
                }
              >
                <table className="apollo-edit-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>ID</th>
                      <th>Node</th>
                      <th>Label</th>
                      <th>UX</th>
                      <th>UY</th>
                      <th>UZ</th>
                      <th>RX</th>
                      <th>RY</th>
                      <th>RZ</th>
                      <th>Active</th>
                      <th>Comment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.supports.map((support, index) => (
                      <tr key={support.id} className={selectedSupport?.id === support.id ? "selected" : ""}>
                        <td>
                          <button
                            type="button"
                            data-testid={`apollo-support-select-${support.id}`}
                            onClick={() => setSelection({ kind: "support", id: support.id })}
                          >
                            {selectedSupport?.id === support.id ? "Selected" : "Select"}
                          </button>
                        </td>
                        <td>
                          <input value={support.id} onChange={(event) => renameSupport(support.id, event.currentTarget.value)} />
                        </td>
                        <td>
                          <select value={support.nodeId} onChange={(event) => changeSupportNode(support.id, event.currentTarget.value)}>
                            {draft.nodes.map((node) => (
                              <option key={node.id} value={node.id}>
                                {node.id}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={support.label}
                            onChange={(event) =>
                              updateSupport(
                                support.id,
                                (currentSupport) => ({ ...currentSupport, label: event.currentTarget.value }),
                                `Support ${support.id} label updated.`,
                              )
                            }
                          />
                        </td>
                        {(["ux", "uy", "uz", "rx", "ry", "rz"] as const).map((dof) => (
                          <td key={`${support.id}-${dof}`}>
                            <select
                              value={support[dof]}
                              onChange={(event) =>
                                updateSupport(
                                  support.id,
                                  (currentSupport) => ({
                                    ...currentSupport,
                                    [dof]: event.currentTarget.value as ApolloPhase1Unit2Support["ux"],
                                  }),
                                  `Support ${support.id} ${dof.toUpperCase()} state updated.`,
                                )
                              }
                            >
                              <option value="FREE">FREE</option>
                              <option value="FIXED">FIXED</option>
                              <option value="UNDEFINED">UNDEFINED</option>
                            </select>
                          </td>
                        ))}
                        <td>
                          <input
                            type="checkbox"
                            checked={support.active}
                            onChange={(event) =>
                              updateSupport(
                                support.id,
                                (currentSupport) => ({ ...currentSupport, active: event.currentTarget.checked }),
                                `Support ${support.id} active state updated.`,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={support.comment}
                            onChange={(event) =>
                              updateSupport(
                                support.id,
                                (currentSupport) => ({ ...currentSupport, comment: event.currentTarget.value }),
                                `Support ${support.id} comment updated.`,
                              )
                            }
                          />
                        </td>
                        <td className="apollo-row-actions">
                          <button type="button" onClick={() => duplicateSupport(support.id)}>Duplicate</button>
                          <button
                            type="button"
                            onClick={() =>
                              moveRow(draft.supports, support.id, -1, "support", (rows) => ({
                                ...draft,
                                supports: rows as ApolloPhase1Unit2Support[],
                              }))
                            }
                            disabled={index === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              moveRow(draft.supports, support.id, 1, "support", (rows) => ({
                                ...draft,
                                supports: rows as ApolloPhase1Unit2Support[],
                              }))
                            }
                            disabled={index === draft.supports.length - 1}
                          >
                            Down
                          </button>
                          <button type="button" onClick={() => deleteSupport(support.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {editorPane === "materials" ? (
            <section data-testid="apollo-material-editor" className="apollo-editor-card">
              <div className="apollo-editor-card-header">
                <div>
                  <h2>Material reference shell</h2>
                  <p>Reference-only material identities. Numeric constants remain outside Phase 1-NN.</p>
                </div>
                <button type="button" data-testid="apollo-add-material" onClick={addMaterial}>
                  Add material ref
                </button>
              </div>
              <div
                className="apollo-table-wrap"
                tabIndex={0}
                onKeyDown={(event) =>
                  tableSelectionKeyDown(
                    event,
                    draft.materialReferences.map((material) => material.id),
                    selectedMaterial?.id ?? null,
                    (id) => setSelection({ kind: "material", id }),
                  )
                }
              >
                <table className="apollo-edit-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Source status</th>
                      <th>Provisional</th>
                      <th>Active</th>
                      <th>Usage</th>
                      <th>Comment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.materialReferences.map((material, index) => {
                      const usageCount = (referenceUsage.materialToMemberIds.get(material.id) ?? []).length;
                      return (
                        <tr key={material.id} className={selectedMaterial?.id === material.id ? "selected" : ""}>
                          <td>
                          <button
                            type="button"
                            data-testid={`apollo-material-select-${material.id}`}
                            onClick={() => setSelection({ kind: "material", id: material.id })}
                          >
                              {selectedMaterial?.id === material.id ? "Selected" : "Select"}
                            </button>
                          </td>
                          <td>
                            <input value={material.id} onChange={(event) => renameMaterial(material.id, event.currentTarget.value)} />
                          </td>
                          <td>
                            <input
                              value={material.displayName}
                              onChange={(event) =>
                                updateMaterial(
                                  material.id,
                                  (currentMaterial) => ({
                                    ...currentMaterial,
                                    displayName: event.currentTarget.value,
                                  }),
                                  `Material reference ${material.id} display name updated.`,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              value={material.category}
                              onChange={(event) =>
                                updateMaterial(
                                  material.id,
                                  (currentMaterial) => ({
                                    ...currentMaterial,
                                    category: event.currentTarget.value,
                                  }),
                                  `Material reference ${material.id} category updated.`,
                                )
                              }
                            />
                          </td>
                          <td>
                            <select
                              value={material.sourceStatus}
                              onChange={(event) =>
                                updateMaterial(
                                  material.id,
                                  (currentMaterial) => ({
                                    ...currentMaterial,
                                    sourceStatus: event.currentTarget.value as ApolloPhase1Unit2MaterialReference["sourceStatus"],
                                  }),
                                  `Material reference ${material.id} source status updated.`,
                                )
                              }
                            >
                              <option value="blocked_by_numeric_evidence">blocked_by_numeric_evidence</option>
                              <option value="licensed_source_pending">licensed_source_pending</option>
                              <option value="reference_only">reference_only</option>
                            </select>
                          </td>
                          <td>
                            <select
                              value={material.provisionalStatus}
                              onChange={(event) =>
                                updateMaterial(
                                  material.id,
                                  (currentMaterial) => ({
                                    ...currentMaterial,
                                    provisionalStatus: event.currentTarget.value as ApolloPhase1Unit2MaterialReference["provisionalStatus"],
                                  }),
                                  `Material reference ${material.id} provisional status updated.`,
                                )
                              }
                            >
                              <option value="unverified">unverified</option>
                              <option value="provisional">provisional</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={material.active}
                              onChange={(event) =>
                                updateMaterial(
                                  material.id,
                                  (currentMaterial) => ({
                                    ...currentMaterial,
                                    active: event.currentTarget.checked,
                                  }),
                                  `Material reference ${material.id} active state updated.`,
                                )
                              }
                            />
                          </td>
                          <td>{usageCount}</td>
                          <td>
                            <input
                              value={material.comment}
                              onChange={(event) =>
                                updateMaterial(
                                  material.id,
                                  (currentMaterial) => ({
                                    ...currentMaterial,
                                    comment: event.currentTarget.value,
                                  }),
                                  `Material reference ${material.id} comment updated.`,
                                )
                              }
                            />
                          </td>
                          <td className="apollo-row-actions">
                            <button type="button" onClick={() => duplicateMaterial(material.id)}>Duplicate</button>
                            <button
                              type="button"
                              onClick={() =>
                                moveRow(draft.materialReferences, material.id, -1, "material", (rows) => ({
                                  ...draft,
                                  materialReferences: rows as ApolloPhase1Unit2MaterialReference[],
                                }))
                              }
                              disabled={index === 0}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                moveRow(draft.materialReferences, material.id, 1, "material", (rows) => ({
                                  ...draft,
                                  materialReferences: rows as ApolloPhase1Unit2MaterialReference[],
                                }))
                              }
                              disabled={index === draft.materialReferences.length - 1}
                            >
                              Down
                            </button>
                            <button type="button" onClick={() => deleteMaterial(material.id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>

        <div className="apollo-unit2-visual-panel">
          <section data-testid="apollo-topology-shell" className="apollo-editor-card">
            <div className="apollo-editor-card-header">
              <div>
                <h2>Topology view and selection sync</h2>
                <p>Table selection syncs to model selection. Node and member picks from the viewer sync back to the tables.</p>
              </div>
            </div>
            <div className="apollo-topology-summary" data-testid="apollo-topology-summary">
              <span>Nodes {draft.nodes.length}</span>
              <span>Members {draft.members.length}</span>
              <span>Supports {draft.supports.length}</span>
              <span>Material refs {draft.materialReferences.length}</span>
            </div>
            <div data-testid="apollo-topology-view" className="apollo-topology-view">
              <Viewer3D
                project={viewProject}
                result={null}
                selectedSection={viewerSection}
                selection={viewerSelection}
                activeLoadCase=""
                onSelectionChange={handleViewerSelection}
                onActiveLoadCaseChange={() => undefined}
                onViewerError={(message) => setViewerMessage(message)}
              />
            </div>
          </section>

          <section data-testid="apollo-validation-shell" className="apollo-editor-card">
            <h2>Validation and reference integrity</h2>
            {validation.errors.length === 0 && validation.warnings.length === 0 ? (
              <p data-testid="apollo-validation-ok">No shell-level validation issues detected.</p>
            ) : (
              <ul data-testid="apollo-validation-list">
                {validation.errors.map((entry) => (
                  <li key={`${entry.code}-${entry.entityId ?? "none"}`} className="apollo-validation-error">
                    ERROR {entry.code}: {entry.message}
                  </li>
                ))}
                {validation.warnings.map((entry) => (
                  <li key={`${entry.code}-${entry.entityId ?? "none"}`} className="apollo-validation-warning">
                    WARNING {entry.code}: {entry.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section data-testid="apollo-adapter-shell" className="apollo-editor-card">
            <h2>Adapter shell</h2>
            <ul>
              <li>Geometry view reuses the existing viewer with non-numeric draft adapters only.</li>
              <li>Persistence reuses existing project open/save flows with Apollo draft serialization layered on top.</li>
              <li>Native Analyzer / SPACER compatibility remains blocked pending licensed numeric evidence.</li>
            </ul>
          </section>

          <section data-testid="apollo-result-shell" className="apollo-editor-card">
            <h2>Result viewer shell and guards</h2>
            <p>No verified status badge is available in this route.</p>
            <button
              type="button"
              data-guard-blocked={flags.disableNumericExecution ? "true" : "false"}
              data-testid="apollo-numeric-execution-guard"
              onClick={() =>
                rejectOperation(
                  `Numeric execution remains blocked on ${VERIFICATION_DATE}. Phase 1-Numeric is NOGO until licensed source, machine, Golden, and parity evidence are complete.`,
                  "project",
                  draft.metadata.projectId,
                )
              }
            >
              Numeric execution blocked
            </button>
            <button
              type="button"
              data-guard-blocked={flags.disableResultPublication ? "true" : "false"}
              data-testid="apollo-result-publication-guard"
              onClick={() =>
                rejectOperation(
                  "Authoritative result publication remains blocked. This shell may show provisional structure state only.",
                  "project",
                  draft.metadata.projectId,
                )
              }
            >
              Result publication blocked
            </button>
          </section>

          <section data-testid="apollo-audit-shell" className="apollo-editor-card">
            <h2>Audit trail shell</h2>
            <ul>
              {draft.audit.length === 0 ? <li>No audit records yet.</li> : null}
              {draft.audit.map((entry) => (
                <li key={entry.id}>
                  {entry.timestamp} / {entry.action} / {entry.message}
                </li>
              ))}
            </ul>
          </section>

          {interactionMessage ? (
            <section data-testid="apollo-interaction-message" className="apollo-editor-card">
              <strong>Latest shell message</strong>
              <p>{interactionMessage}</p>
            </section>
          ) : null}

          {viewerMessage ? (
            <section data-testid="apollo-viewer-message" className="apollo-editor-card">
              <strong>Viewer message</strong>
              <p>{viewerMessage}</p>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
