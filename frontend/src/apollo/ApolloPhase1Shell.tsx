import { useEffect, useMemo, useRef, useState } from "react";
import { Viewer3D } from "../viewer/Viewer3D";
import { defaultVisibility, type ViewerSelection, type ViewerVisibility } from "../viewer/types";
import type { ApolloPhase1FeatureFlags } from "./featureFlag";
import type { ApolloHistoryCommitMode } from "./history";
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
import {
  createApolloWorkspaceProject,
  deleteApolloWorkspaceEntry,
  duplicateApolloWorkspaceEntry,
  isApolloWorkspaceEntryMalformed,
  listApolloWorkspaceEntries,
  listApolloWorkspaceMalformedEntries,
  loadApolloWorkspaceProject,
  renameApolloWorkspaceEntry,
  saveApolloWorkspaceEntry,
} from "./workspace";
import { ApolloNumericInput } from "./components/ApolloNumericInput";
import { BridgeStructureInputPanel } from "./components/BridgeStructureInputPanel";
import { DeckAppurtenanceInputPanel } from "./components/DeckAppurtenanceInputPanel";
import { RcDeckHaunchInputPanel } from "./components/RcDeckHaunchInputPanel";
import { PavementMarkingInputPanel } from "./components/PavementMarkingInputPanel";
import { AnalysisDevelopmentProbePanel } from "./components/AnalysisDevelopmentProbePanel";
import { AppurtenanceHaunchAnalysisPanel } from "./components/AppurtenanceHaunchAnalysisPanel";
import { DemandCheckDevelopmentPanel } from "./components/DemandCheckDevelopmentPanel";
import { LoadConfirmationDevelopmentPanel } from "./components/LoadConfirmationDevelopmentPanel";
import { QuantityModelDevelopmentPanel } from "./components/QuantityModelDevelopmentPanel";
import { ReportModelDevelopmentPanel } from "./components/ReportModelDevelopmentPanel";
import { StandardSectionDrawingPanel } from "./components/StandardSectionDrawingPanel";
import { GeneralArrangementPanel } from "./components/GeneralArrangementPanel";
import { OutputIntegrationPanel } from "./components/OutputIntegrationPanel";
import { SuperstructurePipelinePanel } from "./components/SuperstructurePipelinePanel";
import { WorkflowControlScreen } from "./components/WorkflowControlScreen";
import { GuidedModeShell, type GuidedDetailEscape } from "./guided";
import { scrollWorkflowTargetIntoView } from "./workflow/navigation";
import { WORKFLOW_STEP_DEFINITIONS } from "./workflow/registry";
import type { WorkflowStateModel } from "./workflow/types";
import {
  CompositionAwareInput,
  CompositionAwareTextarea,
} from "./components/CompositionAwareInput";
import { isApolloCompositionActive } from "./compositionRegistry";
import { createApollo200mContinuousBridgeSample } from "./sampleProjects";
import { downloadApolloBinaryStlBundle, type ApolloStlExportOptions } from "./export";
import { buildApolloVisualizationModel } from "./visualization";
import { applyApolloBulkEdit, resolveApolloBulkEditSelection, type ApolloBulkEditInput } from "./bulkEdit";
import {
  applyApolloClipboardPaste,
  buildApolloClipboardPayload,
  type ApolloClipboardPayload,
} from "./clipboard";
import {
  buildApolloVisibleRefs,
  createApolloSearchFilterState,
  matchesApolloSearchFilter,
  type ApolloSearchFilterState,
} from "./searchFilter";
import {
  clearApolloSelection,
  createApolloSelectionState,
  isApolloSelectionHomogeneous,
  primaryApolloSelection,
  pruneApolloSelection,
  replaceApolloSelection,
  filterApolloRefsToVisible,
  selectAllVisibleApolloRefs,
  selectApolloRange,
  toggleApolloSelection,
  type ApolloEntityKind,
  type ApolloEntityRef,
} from "./selection";
import {
  buildApolloValidationIssues,
  nextApolloValidationIssueIndex,
  previousApolloValidationIssueIndex,
  reconcileApolloValidationIssueIndex,
  type ApolloValidationIssue,
} from "./validationNavigator";
import type {
  ApolloPhase1Unit2Draft,
  ApolloPhase1Unit2MaterialReference,
  ApolloPhase1Unit2Member,
  ApolloPhase1Unit2Node,
  ApolloPhase1Unit2Support,
  ProjectModel,
  SectionKey,
  StructuredMessage,
} from "../types";
import { getButtonLabel } from "./i18n";
import { SaveStatusBadge } from "./components/SaveStatusBadge";
import { CompactAuthorizationBadge } from "./components/CompactAuthorizationBadge";
import { ViewerPane } from "./components/ViewerPane";
import { GuidedDetailDrawer } from "./components/GuidedDetailDrawer";

type ApolloPhase1ShellProps = {
  project: ProjectModel;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  flags: ApolloPhase1FeatureFlags;
  onProjectChange: (nextProject: ProjectModel, mode?: ApolloHistoryCommitMode) => void;
  onResetProjectHistory: (nextProject: ProjectModel) => void;
  onCloseHistoryTransaction: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReturnToPro: () => void;
  onSaveProject: () => Promise<boolean>;
  onReloadProject: () => Promise<boolean>;
  onAuditEvent?: (message: string) => void;
  runGuardedAction: (
    message: string,
    action: () => void | Promise<void>,
    options?: { readonly revertOnDiscard?: boolean },
  ) => Promise<boolean>;
  onEstablishBaseline: (nextProject: ProjectModel) => void;
};

type EditorPane = "project" | "nodes" | "members" | "supports" | "materials";
type ApolloMode = "guided" | "list";
type GuidedStep = "start" | "sample" | "sampleLoaded" | "basics" | "editor" | "validation";
type ValidationIssueTarget = {
  readonly step: GuidedStep;
  readonly pane: EditorPane;
  readonly selection: ApolloPhase1Unit2ViewSelection;
  readonly focusKey?: string;
};
type StepKey = "start" | "basics" | "nodes" | "members" | "supportsMaterials" | "validation";
type StepStatus = "current" | "complete" | "error" | "available" | "locked";

const VERIFICATION_DATE = "2026年7月29日（水）";
const APOLLO_GUIDE_DISMISSED_KEY = "apollo_phase1_sample_guide_dismissed";
const APOLLO_ONBOARDING_DISMISSED_KEY = "apollo_phase1_onboarding_dismissed";
const STEP_DEFINITIONS = [
  { key: "start", label: "開始方法" },
  { key: "basics", label: "基本情報" },
  { key: "nodes", label: "節点" },
  { key: "members", label: "部材" },
  { key: "supportsMaterials", label: "支点・材料" },
  { key: "validation", label: "入力チェック" },
] as const;
const ONBOARDING_SLIDES = [
  {
    title: "まずはサンプル橋梁",
    body: "初めての方は 200m級 5径間連続橋を読み込み、節点・部材・支点の見方を確認してください。",
  },
  {
    title: "1画面1目的で進行",
    body: "ガイド付きモードでは、開始方法から入力チェックまで順番に進めます。",
  },
  {
    title: "一覧編集にも切替可能",
    body: "慣れた方は一覧編集モードで節点・部材・支点・材料をまとめて確認できます。",
  },
  {
    title: "計算機能は停止中",
    body: "現在は入力・確認機能のみ利用できます。構造計算と計算結果出力は利用できません。",
  },
] as const;

function nowIsoString(): string {
  return new Date().toISOString();
}

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function sameApolloRef(left: ApolloEntityRef | null, right: ApolloEntityRef | null): boolean {
  return left?.kind === right?.kind && left?.id === right?.id;
}

function includesApolloRef(refs: readonly ApolloEntityRef[], target: ApolloEntityRef): boolean {
  return refs.some((ref) => sameApolloRef(ref, target));
}

function entityKindForPane(pane: EditorPane): ApolloEntityKind {
  return pane === "materials" ? "material" : pane.slice(0, -1) as ApolloEntityKind;
}

function summarizeList(items: readonly string[]): string {
  return items.length > 0 ? items.join(", ") : "none";
}

function getStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function setStoredBoolean(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "true" : "false");
}

function statusText(isDirty: boolean): "保存済み" | "変更あり" {
  return isDirty ? "変更あり" : "保存済み";
}

function resolveApolloStlExportOptions(
  preset: "full" | "girders" | "deck" | "visible",
  visibility: ViewerVisibility,
): ApolloStlExportOptions {
  if (preset === "girders") {
    return {
      includedGroups: ["girders"],
      includeCrossBeams: false,
      includeBracing: false,
      includeDeck: false,
      includeBearings: false,
    };
  }
  if (preset === "deck") {
    return {
      includedGroups: ["deck"],
      includeGirders: false,
      includeCrossBeams: false,
      includeBracing: false,
      includeBearings: false,
    };
  }
  if (preset === "visible") {
    return {
      visibleOnly: true,
      includedGroups: resolveVisibleApolloExportGroups(visibility),
      includeMarkers: visibility.apolloMarkers === true,
    };
  }
  return {};
}

function resolveVisibleApolloExportGroups(visibility: ViewerVisibility) {
  const groups: Array<
    "girders" | "cross-beams" | "bracings" | "deck" | "bearings" | "markers" | "appurtenances" | "rc-deck-haunches"
  > = [];
  if (visibility.apolloGirders !== false) groups.push("girders");
  if (visibility.apolloCrossBeams !== false) groups.push("cross-beams");
  if (visibility.apolloBracings !== false) groups.push("bracings");
  if (visibility.apolloDeck !== false) groups.push("deck");
  if (visibility.apolloBearings !== false) groups.push("bearings");
  if (visibility.apolloMarkers === true) groups.push("markers");
  if (visibility.apolloAppurtenances !== false) groups.push("appurtenances");
  if (visibility.apolloHaunches !== false) groups.push("rc-deck-haunches");
  return groups;
}

function formatSupportState(value: ApolloPhase1Unit2Support["ux"]): string {
  if (value === "FIXED") return "固定";
  if (value === "FREE") return "自由";
  return "未定義";
}

function hasBlockingIssueForEntityTypes(
  validation: ReturnType<typeof validateApolloPhase1Unit2Draft>,
  entityTypes: readonly StructuredMessage["entityType"][],
): boolean {
  return validation.errors.some((entry) => entityTypes.includes(entry.entityType));
}

function validationTarget(entry: StructuredMessage): ValidationIssueTarget {
  if (entry.entityType === "project") {
    return {
      step: "basics",
      pane: "project",
      selection: null,
      focusKey: entry.path === "/apolloPhase1Unit2/metadata/name" ? "project-name" : "project-id",
    };
  }
  if (entry.entityType === "node") {
    return {
      step: "editor",
      pane: "nodes",
      selection: entry.entityId ? { kind: "node", id: entry.entityId } : null,
      focusKey: "node-id",
    };
  }
  if (entry.entityType === "member") {
    return {
      step: "editor",
      pane: "members",
      selection: entry.entityId ? { kind: "member", id: entry.entityId } : null,
      focusKey: entry.code === "APOLLO_MEMBER_MATERIAL_REFERENCE_INVALID" ? "member-material" : "member-id",
    };
  }
  if (entry.entityType === "support") {
    return {
      step: "editor",
      pane: "supports",
      selection: entry.entityId ? { kind: "support", id: entry.entityId } : null,
      focusKey: "support-node",
    };
  }
  return {
    step: "editor",
    pane: "materials",
    selection: entry.entityId ? { kind: "material", id: entry.entityId } : null,
    focusKey: "material-id",
  };
}

function localizeValidationMessage(entry: StructuredMessage): string {
  switch (entry.code) {
    case "APOLLO_PROJECT_NAME_REQUIRED":
      return "橋梁名を入力してください。";
    case "APOLLO_NODE_COORDINATE_INVALID":
      return `節点 ${entry.entityId ?? ""} の座標が不正です。`;
    case "APOLLO_NODE_DUPLICATE_ID":
      return `節点IDが重複しています: ${entry.entityId ?? ""}`;
    case "APOLLO_MEMBER_DUPLICATE_ID":
      return `部材IDが重複しています: ${entry.entityId ?? ""}`;
    case "APOLLO_SUPPORT_DUPLICATE_ID":
      return `支点IDが重複しています: ${entry.entityId ?? ""}`;
    case "APOLLO_MATERIAL_DUPLICATE_ID":
      return `材料IDが重複しています: ${entry.entityId ?? ""}`;
    case "APOLLO_MEMBER_NODE_REFERENCE_INVALID":
      return `部材 ${entry.entityId ?? ""} の接続節点に参照切れがあります。`;
    case "APOLLO_MEMBER_SELF_REFERENCE":
      return `部材 ${entry.entityId ?? ""} の始点と終点が同じです。`;
    case "APOLLO_MEMBER_MATERIAL_REFERENCE_INVALID":
      return `部材 ${entry.entityId ?? ""} の材料参照に参照切れがあります。`;
    case "APOLLO_SUPPORT_NODE_REFERENCE_INVALID":
      return `支点 ${entry.entityId ?? ""} の節点参照に参照切れがあります。`;
    case "APOLLO_SUPPORT_ALL_UNDEFINED":
      return `支点 ${entry.entityId ?? ""} は支持条件が未定義です。`;
    case "APOLLO_MEMBER_INACTIVE_MATERIAL":
      return `有効な部材 ${entry.entityId ?? ""} が無効な材料を参照しています。`;
    case "APOLLO_NODE_INACTIVE_IN_USE":
      return `無効な節点 ${entry.entityId ?? ""} が部材または支点から参照されています。`;
    default:
      return entry.message;
  }
}

export function ApolloPhase1Shell({
  project,
  isDirty,
  canUndo,
  canRedo,
  flags,
  onProjectChange,
  onResetProjectHistory,
  onCloseHistoryTransaction,
  onUndo,
  onRedo,
  onReturnToPro,
  onSaveProject,
  onReloadProject,
  onAuditEvent,
  runGuardedAction,
  onEstablishBaseline,
}: ApolloPhase1ShellProps) {
  type ApolloStlExportPreset = "full" | "girders" | "deck" | "visible";
  const draft = useMemo(() => getApolloPhase1Unit2Draft(project), [project]);
  const viewProject = useMemo(() => buildApolloPhase1Unit2ViewProject(project), [project]);
  const apolloVisualizationBuild = useMemo(() => buildApolloVisualizationModel({ project, draft }), [draft, project]);
  const validation = useMemo(() => validateApolloPhase1Unit2Draft(draft), [draft]);
  const referenceUsage = useMemo(() => buildApolloPhase1Unit2ReferenceUsage(draft), [draft]);
  const [editorPane, setEditorPane] = useState<EditorPane>("nodes");
  const [selectionState, setSelectionState] = useState(() => createApolloSelectionState());
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [viewerMessage, setViewerMessage] = useState<string | null>(null);
  const [persisting, setPersisting] = useState<"save" | "reload" | null>(null);
  const [workspaceEntries, setWorkspaceEntries] = useState(() => listApolloWorkspaceEntries());
  const [malformedWorkspaceEntries, setMalformedWorkspaceEntries] = useState(() =>
    listApolloWorkspaceMalformedEntries(),
  );
  const [workspaceSelection, setWorkspaceSelection] = useState<string | null>(null);
  const [mode, setMode] = useState<ApolloMode>("guided");
  const [guidedStep, setGuidedStep] = useState<GuidedStep>("start");
  const [showOnboarding, setShowOnboarding] = useState(() => !getStoredBoolean(APOLLO_ONBOARDING_DISMISSED_KEY, false));
  const [sampleGuideDismissed, setSampleGuideDismissed] = useState(() => getStoredBoolean(APOLLO_GUIDE_DISMISSED_KEY, false));
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<GuidedDetailEscape | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<ApolloSearchFilterState>(() =>
    createApolloSearchFilterState(),
  );
  const [bulkEditField, setBulkEditField] = useState<"label" | "displayName" | "active">("label");
  const [bulkEditTextValue, setBulkEditTextValue] = useState("");
  const [bulkEditActiveValue, setBulkEditActiveValue] = useState(true);
  const [validationIssueIndex, setValidationIssueIndex] = useState(0);
  const [validationFocusToken, setValidationFocusToken] = useState(0);
  const [topologyViewPanelOpen, setTopologyViewPanelOpen] = useState(false);
  const [stlExportPreset, setStlExportPreset] = useState<ApolloStlExportPreset>("full");
  const [apolloViewerVisibility, setApolloViewerVisibility] = useState<ViewerVisibility>(defaultVisibility);
  const [validationHighlightIssueKey, setValidationHighlightIssueKey] = useState<string | null>(null);
  const shellRootRef = useRef<HTMLElement | null>(null);
  const clipboardRef = useRef<ApolloClipboardPayload | null>(null);
  const clipboardHandlersRef = useRef<{ copy: () => void; paste: () => void }>({
    copy: () => undefined,
    paste: () => undefined,
  });
  const selectedRefs = selectionState.orderedRefs;
  const primarySelection = primaryApolloSelection(selectedRefs);
  const selection: ApolloPhase1Unit2ViewSelection = primarySelection
    ? { kind: primarySelection.kind, id: primarySelection.id }
    : null;
  const visibleRefs = useMemo(() => buildApolloVisibleRefs(draft, searchFilter), [draft, searchFilter]);
  const visibleEditorRefs = useMemo<readonly ApolloEntityRef[]>(
    () => visibleRefs.filter((ref) => ref.kind === entityKindForPane(editorPane)),
    [editorPane, visibleRefs],
  );
  const validationIssues = useMemo(
    () => buildApolloValidationIssues(validation.errors, validation.warnings),
    [validation.errors, validation.warnings],
  );
  const currentValidationIssue =
    validationIssueIndex >= 0 && validationIssueIndex < validationIssues.length
      ? validationIssues[validationIssueIndex]!
      : null;
  const viewerSelectionKeys = useMemo(
    () =>
      selectedRefs
        .filter((ref) => ref.kind === "node" || ref.kind === "member" || ref.kind === "support")
        .map((ref) => `${ref.kind}:${ref.id}`),
    [selectedRefs],
  );
  const viewerValidationHighlight =
    currentValidationIssue &&
    validationHighlightIssueKey === currentValidationIssue.issueKey &&
    (currentValidationIssue.entityType === "node" ||
      currentValidationIssue.entityType === "member" ||
      currentValidationIssue.entityType === "support") &&
    currentValidationIssue.entityId
      ? {
          targetKey: `${currentValidationIssue.entityType}:${currentValidationIssue.entityId}`,
          severity: currentValidationIssue.severity,
        }
      : null;
  const visibleNodes = useMemo(
    () => draft.nodes.filter((node) => matchesApolloSearchFilter(searchFilter, "node", [node.id, node.label])),
    [draft.nodes, searchFilter],
  );
  const visibleMembers = useMemo(
    () =>
      draft.members.filter((member) =>
        matchesApolloSearchFilter(searchFilter, "member", [member.id, member.label]),
      ),
    [draft.members, searchFilter],
  );
  const visibleSupports = useMemo(
    () =>
      draft.supports.filter((support) =>
        matchesApolloSearchFilter(searchFilter, "support", [support.id, support.label]),
      ),
    [draft.supports, searchFilter],
  );
  const visibleMaterials = useMemo(
    () =>
      draft.materialReferences.filter((material) =>
        matchesApolloSearchFilter(searchFilter, "material", [material.id, material.displayName]),
      ),
    [draft.materialReferences, searchFilter],
  );
  const visibleSelectedEditorRefs = useMemo(
    () => filterApolloRefsToVisible(selectedRefs, visibleEditorRefs),
    [selectedRefs, visibleEditorRefs],
  );
  const bulkEditSelection = resolveApolloBulkEditSelection(visibleSelectedEditorRefs);

  useEffect(() => {
    if (apolloVisualizationBuild.ok) {
      const warningSummary = apolloVisualizationBuild.model.warnings
        .filter((entry) => entry.severity !== "info")
        .map((entry) => entry.message)
        .slice(0, 3);
      setViewerMessage(
        warningSummary.length > 0
          ? `3D表示は暫定データを含みます: ${warningSummary.join(" / ")}`
          : null,
      );
      return;
    }
    const diagnostics = apolloVisualizationBuild.diagnostics.map((entry) => entry.message).slice(0, 3);
    setViewerMessage(
      diagnostics.length > 0
        ? `3D表示データの生成で一部問題があります: ${diagnostics.join(" / ")}`
        : "3D表示データの生成で一部問題があります。",
    );
  }, [apolloVisualizationBuild]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }
      if (isApolloCompositionActive() || event.isComposing) {
        return;
      }
      if (isEditableShortcutTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        onRedo();
        return;
      }
      if (key === "a") {
        event.preventDefault();
        setSelectionState(selectAllVisibleApolloRefs(visibleEditorRefs));
        return;
      }
      if (key === "c") {
        event.preventDefault();
        clipboardHandlersRef.current.copy();
        return;
      }
      if (key === "v") {
        event.preventDefault();
        clipboardHandlersRef.current.paste();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRedo, onUndo, visibleEditorRefs]);

  useEffect(() => {
    const existingRefs: ApolloEntityRef[] = [
      ...draft.nodes.map((node) => ({ kind: "node" as const, id: node.id })),
      ...draft.members.map((member) => ({ kind: "member" as const, id: member.id })),
      ...draft.supports.map((support) => ({ kind: "support" as const, id: support.id })),
      ...draft.materialReferences.map((material) => ({ kind: "material" as const, id: material.id })),
    ];
    const nextSelection = pruneApolloSelection(selectionState, existingRefs);
    if (
      nextSelection.orderedRefs.length !== selectionState.orderedRefs.length ||
      !sameApolloRef(nextSelection.anchorRef, selectionState.anchorRef)
    ) {
      setSelectionState(nextSelection);
      return;
    }
    if (nextSelection.orderedRefs.length > 0) {
      return;
    }
    if (draft.nodes.length > 0) {
      setSelectionState(replaceApolloSelection({ kind: "node", id: draft.nodes[0].id }));
      setEditorPane("nodes");
      return;
    }
    if (draft.materialReferences.length > 0) {
      setSelectionState(replaceApolloSelection({ kind: "material", id: draft.materialReferences[0].id }));
      setEditorPane("materials");
      return;
    }
    // Empty draft with an already-empty selection: skip re-setting to avoid an
    // infinite re-render loop (clearApolloSelection allocates a fresh object).
    if (selectionState.orderedRefs.length === 0 && selectionState.anchorRef === null) {
      return;
    }
    setSelectionState(clearApolloSelection());
  }, [draft, selectionState]);

  const activeValidationIssueKeyRef = useRef<string | null>(null);

  useEffect(() => {
    activeValidationIssueKeyRef.current = validationIssues[validationIssueIndex]?.issueKey ?? null;
  }, [validationIssueIndex, validationIssues]);

  useEffect(() => {
    const nextIndex = reconcileApolloValidationIssueIndex(
      validationIssueIndex,
      activeValidationIssueKeyRef.current,
      validationIssues,
    );
    if (nextIndex !== validationIssueIndex) {
      setValidationIssueIndex(nextIndex);
    }
  }, [validationIssues, validationIssueIndex]);

  useEffect(() => {
    if (!bulkEditSelection.ok) {
      return;
    }
    if (!bulkEditSelection.allowedFields.includes(bulkEditField)) {
      setBulkEditField(bulkEditSelection.allowedFields[0] ?? "label");
    }
  }, [bulkEditField, bulkEditSelection]);

  useEffect(() => {
    if (workspaceEntries.length === 0) {
      setWorkspaceSelection(null);
      return;
    }
    if (workspaceSelection && workspaceEntries.some((entry) => entry.workspaceId === workspaceSelection)) return;
    setWorkspaceSelection(workspaceEntries[0]?.workspaceId ?? null);
  }, [workspaceEntries, workspaceSelection]);

  useEffect(() => {
    if (!focusKey) return;
    let cancelled = false;
    let attempts = 0;
    const tryFocus = () => {
      if (cancelled) return;
      const root = shellRootRef.current ?? document;
      const target = root.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`);
      if (target) {
        target.focus();
        return;
      }
      attempts += 1;
      if (attempts < 16) {
        window.setTimeout(tryFocus, 0);
      }
    };
    const timer = window.setTimeout(tryFocus, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [focusKey, guidedStep, editorPane, draft, validationFocusToken]);

  const selectedNode = selection?.kind === "node" ? draft.nodes.find((node) => node.id === selection.id) ?? null : null;
  const selectedMember = selection?.kind === "member" ? draft.members.find((member) => member.id === selection.id) ?? null : null;
  const selectedSupport = selection?.kind === "support" ? draft.supports.find((support) => support.id === selection.id) ?? null : null;
  const selectedMaterial =
    selection?.kind === "material"
      ? draft.materialReferences.find((material) => material.id === selection.id) ?? null
      : null;
  const viewerSelectionRef =
    selectedRefs.length === 1 &&
    (selection?.kind === "node" || selection?.kind === "member" || selection?.kind === "support")
      ? selection
      : null;

  const viewerSelection: ViewerSelection =
    viewerSelectionRef?.kind === "node"
      ? { type: "node", id: viewerSelectionRef.id }
      : viewerSelectionRef?.kind === "member"
        ? { type: "member", id: viewerSelectionRef.id }
        : viewerSelectionRef?.kind === "support"
          ? { type: "support", id: viewerSelectionRef.id }
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
    historyMode: ApolloHistoryCommitMode = { kind: "snapshot" },
  ) => {
    const timestamp = nowIsoString();
    const nextProject = withApolloPhase1Unit2Draft(project, (currentDraft) => {
      const updatedDraft = updater(currentDraft);
      return appendApolloPhase1Unit2Audit(
        {
          ...updatedDraft,
          metadata: {
            ...updatedDraft.metadata,
            updatedAt: timestamp,
          },
        },
        timestamp,
        action,
        entityType,
        entityId,
        message,
      );
    });
    onProjectChange(nextProject, historyMode);
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

  const announce = (message: string) => {
    setInteractionMessage(message);
    onAuditEvent?.(message);
  };

  const coalescedFieldMode = (fieldKey: string): ApolloHistoryCommitMode => ({
    kind: "coalesced",
    key: fieldKey,
  });

  const clearTransientEditingState = () => {
    clipboardRef.current = null;
    setSelectionState(clearApolloSelection());
    setSearchFilter(createApolloSearchFilterState());
    setValidationIssueIndex(0);
    setValidationHighlightIssueKey(null);
    setBulkEditTextValue("");
    setBulkEditActiveValue(true);
  };

  const setSingleSelection = (ref: ApolloEntityRef | null) => {
    setSelectionState(replaceApolloSelection(ref));
    setValidationHighlightIssueKey(null);
  };

  const handleRowSelection = (ref: ApolloEntityRef, event?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => {
    if (event?.shiftKey) {
      setValidationHighlightIssueKey(null);
      setSelectionState((current) => selectApolloRange(current, ref, visibleEditorRefs));
      return;
    }
    if (event?.metaKey || event?.ctrlKey) {
      setValidationHighlightIssueKey(null);
      setSelectionState((current) => toggleApolloSelection(current, ref));
      return;
    }
    setSingleSelection(ref);
  };

  const handleCopySelection = () => {
    const result = buildApolloClipboardPayload(draft, visibleSelectedEditorRefs, nowIsoString());
    if (!result.ok) {
      announce(result.message);
      return;
    }
    clipboardRef.current = result.payload;
    announce(`${result.payload.entities.length}件の${result.payload.entityKind}をApollo内部クリップボードへコピーしました。`);
  };

  const handlePasteSelection = () => {
    const result = applyApolloClipboardPaste(draft, clipboardRef.current);
    if (!result.ok) {
      announce(result.message);
      return;
    }
    applyDraftChange(
      `${result.selectedRefs.length}件を貼り付けました。`,
      `${result.selectedRefs[0]?.kind ?? "entity"}.paste`,
      result.selectedRefs[0]?.kind ?? "project",
      result.selectedRefs[0]?.id ?? draft.metadata.projectId,
      () => result.draft,
    );
    setSelectionState({
      orderedRefs: result.selectedRefs,
      anchorRef: result.selectedRefs[0] ?? null,
    });
  };

  clipboardHandlersRef.current = {
    copy: handleCopySelection,
    paste: handlePasteSelection,
  };

  const clearSearchFilter = () => {
    setSearchFilter(createApolloSearchFilterState());
  };

  const applyBulkEdit = () => {
    if (!bulkEditSelection.ok) {
      announce(bulkEditSelection.message);
      return;
    }
    const input: ApolloBulkEditInput =
      bulkEditField === "active"
        ? { field: "active", value: bulkEditActiveValue }
        : {
            field: bulkEditField,
            value: bulkEditTextValue,
          };
    const result = applyApolloBulkEdit(draft, visibleSelectedEditorRefs, input);
    if (!result.ok) {
      announce(result.message);
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(`${result.affectedCount}件に一括編集を適用します。続行しますか？`)
    ) {
      return;
    }
    applyDraftChange(
      `${result.affectedCount}件へ一括編集を適用しました。`,
      `${bulkEditSelection.kind}.bulkEdit`,
      bulkEditSelection.kind,
      bulkEditSelection.refs[0]?.id ?? null,
      () => result.draft,
    );
  };

  const updateProjectField = (field: "name" | "description", value: string, message: string) => {
    applyDraftChange(
      message,
      "project.update",
      "project",
      draft.metadata.projectId,
      (currentDraft) => ({
        ...currentDraft,
        metadata: {
          ...currentDraft.metadata,
          [field]: value,
        },
      }),
      { kind: "coalesced", key: `project:${field}` },
    );
  };

  const updateNode = (
    nodeId: string,
    updater: (node: ApolloPhase1Unit2Node) => ApolloPhase1Unit2Node,
    message: string,
    historyMode: ApolloHistoryCommitMode = { kind: "snapshot" },
  ) => {
    applyDraftChange(message, "node.update", "node", nodeId, (currentDraft) => ({
      ...currentDraft,
      nodes: currentDraft.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    }), historyMode);
  };

  const updateNodeId = (nodeId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation(`Node ${nodeId} rejected an empty id.`, "node", nodeId);
      return;
    }
    if (trimmed !== nodeId && draft.nodes.some((node) => node.id === trimmed)) {
      rejectOperation(`Node ${nodeId} rejected duplicate id ${trimmed}.`, "node", nodeId);
      return;
    }
    applyDraftChange(
      `節点IDを ${trimmed} に更新しました。`,
      "node.rename",
      "node",
      nodeId,
      (currentDraft) => ({
        ...currentDraft,
        nodes: currentDraft.nodes.map((node) => (node.id === nodeId ? { ...node, id: trimmed } : node)),
        members: currentDraft.members.map((member) => ({
          ...member,
          nodeI: member.nodeI === nodeId ? trimmed : member.nodeI,
          nodeJ: member.nodeJ === nodeId ? trimmed : member.nodeJ,
        })),
        supports: currentDraft.supports.map((support) =>
          support.nodeId === nodeId ? { ...support, nodeId: trimmed, label: support.label || trimmed } : support,
        ),
      }),
      coalescedFieldMode(`node:${nodeId}:id`),
    );
    setSingleSelection({ kind: "node", id: trimmed });
  };

  const addNode = () => {
    const id = nextApolloUnit2Id("APN-", draft.nodes.map((node) => node.id));
    applyDraftChange(`節点 ${id} を追加しました。`, "node.add", "node", id, (currentDraft) => ({
      ...currentDraft,
      nodes: [
        ...currentDraft.nodes,
        {
          id,
          label: id,
          x: currentDraft.nodes.length * 10,
          y: 0,
          z: 0,
          active: true,
          comment: "",
        },
      ],
    }));
    setSingleSelection({ kind: "node", id });
    setEditorPane("nodes");
  };

  const duplicateNode = (nodeId: string) => {
    const source = draft.nodes.find((node) => node.id === nodeId);
    if (!source) return;
    const id = nextApolloUnit2Id("APN-", draft.nodes.map((node) => node.id));
    applyDraftChange(`節点 ${nodeId} を複製しました。`, "node.duplicate", "node", id, (currentDraft) => ({
      ...currentDraft,
      nodes: [...currentDraft.nodes, { ...source, id, label: `${source.label} copy` }],
    }));
    setSingleSelection({ kind: "node", id });
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
    applyDraftChange(`節点 ${nodeId} を削除しました。`, "node.delete", "node", nodeId, (currentDraft) => ({
      ...currentDraft,
      nodes: currentDraft.nodes.filter((node) => node.id !== nodeId),
    }));
  };

  const updateMaterial = (
    materialId: string,
    updater: (material: ApolloPhase1Unit2MaterialReference) => ApolloPhase1Unit2MaterialReference,
    message: string,
    historyMode: ApolloHistoryCommitMode = { kind: "snapshot" },
  ) => {
    applyDraftChange(message, "material.update", "material", materialId, (currentDraft) => ({
      ...currentDraft,
      materialReferences: currentDraft.materialReferences.map((material) =>
        material.id === materialId ? updater(material) : material,
      ),
    }), historyMode);
  };

  const updateMaterialId = (materialId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation(`Material ${materialId} rejected an empty id.`, "material", materialId);
      return;
    }
    if (trimmed !== materialId && draft.materialReferences.some((material) => material.id === trimmed)) {
      rejectOperation(`Material ${materialId} rejected duplicate id ${trimmed}.`, "material", materialId);
      return;
    }
    applyDraftChange(
      `材料IDを ${trimmed} に更新しました。`,
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
      coalescedFieldMode(`material:${materialId}:id`),
    );
    setSingleSelection({ kind: "material", id: trimmed });
  };

  const addMaterial = () => {
    const id = nextApolloUnit2Id("MAT-", draft.materialReferences.map((material) => material.id));
    applyDraftChange(`材料 ${id} を追加しました。`, "material.add", "material", id, (currentDraft) => ({
      ...currentDraft,
      materialReferences: [
        ...currentDraft.materialReferences,
        {
          id,
          displayName: id,
          category: "reference",
          sourceStatus: "blocked_by_numeric_evidence",
          provisionalStatus: "unverified",
          active: true,
          comment: "",
        },
      ],
    }));
    setSingleSelection({ kind: "material", id });
    setEditorPane("materials");
  };

  const duplicateMaterial = (materialId: string) => {
    const source = draft.materialReferences.find((material) => material.id === materialId);
    if (!source) return;
    const id = nextApolloUnit2Id("MAT-", draft.materialReferences.map((material) => material.id));
    applyDraftChange(`材料 ${materialId} を複製しました。`, "material.duplicate", "material", id, (currentDraft) => ({
      ...currentDraft,
      materialReferences: [...currentDraft.materialReferences, { ...source, id, displayName: `${source.displayName} copy` }],
    }));
    setSingleSelection({ kind: "material", id });
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
    applyDraftChange(`材料 ${materialId} を削除しました。`, "material.delete", "material", materialId, (currentDraft) => ({
      ...currentDraft,
      materialReferences: currentDraft.materialReferences.filter((material) => material.id !== materialId),
    }));
  };

  const updateMember = (
    memberId: string,
    updater: (member: ApolloPhase1Unit2Member) => ApolloPhase1Unit2Member,
    message: string,
    historyMode: ApolloHistoryCommitMode = { kind: "snapshot" },
  ) => {
    applyDraftChange(message, "member.update", "member", memberId, (currentDraft) => ({
      ...currentDraft,
      members: currentDraft.members.map((member) => (member.id === memberId ? updater(member) : member)),
    }), historyMode);
  };

  const updateMemberId = (memberId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation(`Member ${memberId} rejected an empty id.`, "member", memberId);
      return;
    }
    if (trimmed !== memberId && draft.members.some((member) => member.id === trimmed)) {
      rejectOperation(`Member ${memberId} rejected duplicate id ${trimmed}.`, "member", memberId);
      return;
    }
    applyDraftChange(
      `部材IDを ${trimmed} に更新しました。`,
      "member.rename",
      "member",
      memberId,
      (currentDraft) => ({
        ...currentDraft,
        members: currentDraft.members.map((member) => (member.id === memberId ? { ...member, id: trimmed } : member)),
      }),
      coalescedFieldMode(`member:${memberId}:id`),
    );
    setSingleSelection({ kind: "member", id: trimmed });
  };

  const addMember = () => {
    if (draft.nodes.length < 2) {
      rejectOperation("Member shell requires at least two nodes.", "member", null);
      return;
    }
    const id = nextApolloUnit2Id("APM-", draft.members.map((member) => member.id));
    applyDraftChange(`部材 ${id} を追加しました。`, "member.add", "member", id, (currentDraft) => ({
      ...currentDraft,
      members: [
        ...currentDraft.members,
        {
          id,
          label: id,
          nodeI: currentDraft.nodes[0].id,
          nodeJ: currentDraft.nodes[1].id,
          materialRefId: currentDraft.materialReferences[0]?.id ?? "",
          active: true,
          comment: "",
        },
      ],
    }));
    setSingleSelection({ kind: "member", id });
    setEditorPane("members");
  };

  const duplicateMember = (memberId: string) => {
    const source = draft.members.find((member) => member.id === memberId);
    if (!source) return;
    const id = nextApolloUnit2Id("APM-", draft.members.map((member) => member.id));
    applyDraftChange(`部材 ${memberId} を複製しました。`, "member.duplicate", "member", id, (currentDraft) => ({
      ...currentDraft,
      members: [...currentDraft.members, { ...source, id, label: `${source.label} copy` }],
    }));
    setSingleSelection({ kind: "member", id });
  };

  const deleteMember = (memberId: string) => {
    applyDraftChange(`部材 ${memberId} を削除しました。`, "member.delete", "member", memberId, (currentDraft) => ({
      ...currentDraft,
      members: currentDraft.members.filter((member) => member.id !== memberId),
    }));
  };

  const changeMemberNode = (memberId: string, end: "nodeI" | "nodeJ", nextNodeId: string) => {
    const member = draft.members.find((item) => item.id === memberId);
    if (!member) return;
    const candidate = { ...member, [end]: nextNodeId };
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

  const updateSupport = (
    supportId: string,
    updater: (support: ApolloPhase1Unit2Support) => ApolloPhase1Unit2Support,
    message: string,
    historyMode: ApolloHistoryCommitMode = { kind: "snapshot" },
  ) => {
    applyDraftChange(message, "support.update", "support", supportId, (currentDraft) => ({
      ...currentDraft,
      supports: currentDraft.supports.map((support) => (support.id === supportId ? updater(support) : support)),
    }), historyMode);
  };

  const updateSupportId = (supportId: string, nextId: string) => {
    const trimmed = nextId.trim();
    if (trimmed.length === 0) {
      rejectOperation(`Support ${supportId} rejected an empty id.`, "support", supportId);
      return;
    }
    if (trimmed !== supportId && draft.supports.some((support) => support.id === trimmed)) {
      rejectOperation(`Support ${supportId} rejected duplicate id ${trimmed}.`, "support", supportId);
      return;
    }
    applyDraftChange(
      `支点IDを ${trimmed} に更新しました。`,
      "support.rename",
      "support",
      supportId,
      (currentDraft) => ({
        ...currentDraft,
        supports: currentDraft.supports.map((support) => (support.id === supportId ? { ...support, id: trimmed } : support)),
      }),
      coalescedFieldMode(`support:${supportId}:id`),
    );
    setSingleSelection({ kind: "support", id: trimmed });
  };

  const addSupport = () => {
    const candidateNode = draft.nodes.find((node) => !draft.supports.some((support) => support.nodeId === node.id));
    if (!candidateNode) {
      rejectOperation("Support shell requires at least one unused node.", "support", null);
      return;
    }
    const id = nextApolloUnit2Id("SUP-", draft.supports.map((support) => support.id));
    applyDraftChange(`支点 ${id} を追加しました。`, "support.add", "support", id, (currentDraft) => ({
      ...currentDraft,
      supports: [
        ...currentDraft.supports,
        {
          id,
          nodeId: candidateNode.id,
          label: candidateNode.label,
          ux: "FIXED",
          uy: "FIXED",
          uz: "FIXED",
          rx: "UNDEFINED",
          ry: "UNDEFINED",
          rz: "UNDEFINED",
          active: true,
          comment: "",
        },
      ],
    }));
    setSingleSelection({ kind: "support", id });
    setEditorPane("supports");
  };

  const duplicateSupport = (supportId: string) => {
    const source = draft.supports.find((support) => support.id === supportId);
    if (!source) return;
    const candidateNode = draft.nodes.find(
      (node) => node.id !== source.nodeId && !draft.supports.some((support) => support.nodeId === node.id),
    );
    if (!candidateNode) {
      rejectOperation(`Support ${supportId} cannot be duplicated because no unused node is available.`, "support", supportId);
      return;
    }
    const id = nextApolloUnit2Id("SUP-", draft.supports.map((support) => support.id));
    applyDraftChange(`支点 ${supportId} を複製しました。`, "support.duplicate", "support", id, (currentDraft) => ({
      ...currentDraft,
      supports: [...currentDraft.supports, { ...source, id, nodeId: candidateNode.id, label: candidateNode.label }],
    }));
    setSingleSelection({ kind: "support", id });
  };

  const deleteSupport = (supportId: string) => {
    applyDraftChange(`支点 ${supportId} を削除しました。`, "support.delete", "support", supportId, (currentDraft) => ({
      ...currentDraft,
      supports: currentDraft.supports.filter((support) => support.id !== supportId),
    }));
  };

  const changeSupportNode = (supportId: string, nextNodeId: string) => {
    if (draft.supports.some((support) => support.id !== supportId && support.nodeId === nextNodeId)) {
      rejectOperation(`Node ${nextNodeId} already has a support shell.`, "support", supportId);
      return;
    }
    updateSupport(
      supportId,
      (support) => ({ ...support, nodeId: nextNodeId, label: support.label || nextNodeId }),
      `Support ${supportId} moved to node ${nextNodeId}.`,
    );
  };

  const handleSave = async (): Promise<boolean> => {
    setPersisting("save");
    const timestamp = nowIsoString();
    const message = "Apollo 入力データのファイル保存を開始しました。";
    const nextProject = withApolloPhase1Unit2Draft(project, (currentDraft) =>
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
    );
    onProjectChange(nextProject, { kind: "none" });
        onAuditEvent?.(message);
    const ok = await onSaveProject();
    if (ok) {
      onEstablishBaseline(nextProject);
    }
    setPersisting(null);
    setInteractionMessage(ok ? "ファイル保存が完了しました。" : "ファイル保存を中止したか、保存に失敗しました。");
    return ok;
  };

  const handleReload = async (): Promise<boolean> => {
    setPersisting("reload");
    const ok = await onReloadProject();
    setPersisting(null);
    setInteractionMessage(ok ? "ファイル読込が完了しました。" : "ファイル読込を中止したか、読込に失敗しました。");
    if (ok) {
      onAuditEvent?.("Apollo 入力データのファイル読込が完了しました。");
    }
    return ok;
  };

  const handleViewerSelection = (nextSelection: ViewerSelection) => {
    if (nextSelection?.type === "node") {
      setSingleSelection({ kind: "node", id: nextSelection.id });
      setEditorPane("nodes");
      return;
    }
    if (nextSelection?.type === "member") {
      setSingleSelection({ kind: "member", id: nextSelection.id });
      setEditorPane("members");
      return;
    }
    if (nextSelection?.type === "support") {
      setSingleSelection({ kind: "support", id: nextSelection.id });
      setEditorPane("supports");
      return;
    }
    setSingleSelection(null);
  };

  const handleStlExport = () => {
    if (!apolloVisualizationBuild.ok) {
      setInteractionMessage("STL出力に必要な Apollo Visualization Model を生成できませんでした。");
      return;
    }

    try {
      const options = resolveApolloStlExportOptions(stlExportPreset, apolloViewerVisibility);
      const result = downloadApolloBinaryStlBundle(apolloVisualizationBuild.model, options);
      const message = `Apollo STL出力を開始しました: ${result.stlFileName} / ${result.manifestFileName}`;
      setInteractionMessage(message);
      onAuditEvent?.(message);
    } catch (error) {
      setInteractionMessage(`STL出力に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const selectedWorkspaceEntry =
    workspaceSelection === null
      ? null
      : workspaceEntries.find((entry) => entry.workspaceId === workspaceSelection) ?? null;

  const refreshWorkspaceEntries = (nextEntries?: ReturnType<typeof listApolloWorkspaceEntries>) => {
    setWorkspaceEntries(nextEntries ? [...nextEntries] : listApolloWorkspaceEntries());
    setMalformedWorkspaceEntries(listApolloWorkspaceMalformedEntries());
  };

  const handleWorkspaceSave = () => {
    const nextEntries = saveApolloWorkspaceEntry(project, selectedWorkspaceEntry?.workspaceId);
    refreshWorkspaceEntries(nextEntries);
    const nextSelection =
      nextEntries.find((entry) => entry.projectId === project.project.id)?.workspaceId ??
      nextEntries[0]?.workspaceId ??
      null;
    setWorkspaceSelection(nextSelection);
    announce(`作業中データを保存しました: ${project.project.name || project.project.id}`);
  };

  const handleWorkspaceOpen = async () => {
    if (!workspaceSelection) return;
    const malformed = isApolloWorkspaceEntryMalformed(workspaceSelection);
    if (malformed) {
      announce(`作業中データを開けませんでした: ${malformed.diagnostics.join(" ")}`);
      return;
    }
    const proceed = await runGuardedAction(
      "未保存の変更があります。作業中データを開くと現在の編集内容は失われます。続行しますか。",
      async () => {
        const nextProject = loadApolloWorkspaceProject(workspaceSelection);
        if (!nextProject) {
          announce("作業中データを開けませんでした。");
          throw new Error("workspace-open-failed");
        }
        onResetProjectHistory(nextProject);
        clearTransientEditingState();
        onEstablishBaseline(nextProject);
        announce(`作業中データを開きました: ${nextProject.project.name || nextProject.project.id}`);
        setMode("guided");
        setGuidedStep("basics");
      },
    );
    return proceed;
  };

  const handleWorkspaceNew = () => {
    const nextProject = createApolloWorkspaceProject();
    onResetProjectHistory(nextProject);
    clearTransientEditingState();
    onEstablishBaseline(nextProject);
    announce(`新しい橋梁データを作成しました: ${nextProject.project.name}`);
  };

  const handleWorkspaceDuplicate = () => {
    if (!workspaceSelection) return;
    const nextEntries = duplicateApolloWorkspaceEntry(workspaceSelection);
    refreshWorkspaceEntries(nextEntries);
    setWorkspaceSelection(nextEntries[0]?.workspaceId ?? null);
    announce("作業中データを複製しました。");
  };

  const handleWorkspaceRename = () => {
    if (!selectedWorkspaceEntry || typeof window === "undefined") return;
    const proposed = window.prompt("作業中データ名を変更", selectedWorkspaceEntry.name);
    if (proposed === null) return;
    const nextEntries = renameApolloWorkspaceEntry(selectedWorkspaceEntry.workspaceId, proposed);
    refreshWorkspaceEntries(nextEntries);
    announce(`作業中データ名を変更しました: ${proposed.trim() || selectedWorkspaceEntry.name}`);
  };

  const handleWorkspaceDelete = () => {
    if (!selectedWorkspaceEntry || typeof window === "undefined") return;
    if (!window.confirm(`作業中データ「${selectedWorkspaceEntry.name}」を削除しますか？`)) {
      return;
    }
    const nextEntries = deleteApolloWorkspaceEntry(selectedWorkspaceEntry.workspaceId);
    refreshWorkspaceEntries(nextEntries);
    announce(`作業中データを削除しました: ${selectedWorkspaceEntry.name}`);
  };

  const openFromFile = async () => {
    const ok = await onReloadProject();
    if (ok) {
      clearTransientEditingState();
      setMode("guided");
      setGuidedStep("basics");
      setSaveNotice(null);
    }
  };

  const startNewProject = async () => {
    const proceed = await runGuardedAction(
      "未保存の変更があります。新しい橋梁を作成すると現在の編集内容は失われます。続行しますか。",
      async () => {
        handleWorkspaceNew();
        setMode("guided");
        setGuidedStep("basics");
        setPaneAndSelection("nodes");
        setSaveNotice(null);
      },
    );
    return proceed;
  };

  const loadStandardSample = async () => {
    const proceed = await runGuardedAction(
      "未保存の変更があります。サンプルを読み込むと現在の編集内容は失われます。続行しますか。",
      async () => {
        const sample = createApollo200mContinuousBridgeSample();
        onResetProjectHistory(sample);
        clearTransientEditingState();
        onEstablishBaseline(sample);
        setMode("guided");
        setGuidedStep(sampleGuideDismissed ? "basics" : "sampleLoaded");
        setSingleSelection({ kind: "node", id: "N-A1" });
        setEditorPane("nodes");
        setSaveNotice(null);
        announce("200m級 5径間連続橋サンプルを読み込みました。");
      },
    );
    return proceed;
  };

  const openWorkspaceSnapshot = async () => {
    await handleWorkspaceOpen();
  };

  const setPaneAndSelection = (pane: EditorPane) => {
    setEditorPane(pane);
    if (pane === "nodes" && draft.nodes[0]) setSingleSelection({ kind: "node", id: draft.nodes[0].id });
    if (pane === "members" && draft.members[0]) setSingleSelection({ kind: "member", id: draft.members[0].id });
    if (pane === "supports" && draft.supports[0]) setSingleSelection({ kind: "support", id: draft.supports[0].id });
    if (pane === "materials" && draft.materialReferences[0]) {
      setSingleSelection({ kind: "material", id: draft.materialReferences[0].id });
    }
  };

  const openOnboarding = () => {
    setShowOnboarding(true);
    setOnboardingIndex(0);
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
    setStoredBoolean(APOLLO_ONBOARDING_DISMISSED_KEY, true);
  };

  const saveToFile = async () => {
    const ok = await handleSave();
    if (ok) setSaveNotice("ファイルに保存しました。");
  };

  const navigateValidationIssue = (issue: ApolloValidationIssue, nextIndex?: number) => {
    clearSearchFilter();
    setMode("guided");
    if (issue.entityType === "project") {
      setGuidedStep("basics");
      setEditorPane("project");
      setSingleSelection(null);
    } else {
      setGuidedStep("editor");
      setEditorPane(issue.paneId === "project" ? "project" : issue.paneId);
      if (!issue.entityId) {
        setSingleSelection(null);
      } else {
        setSingleSelection({
          kind: issue.entityType as ApolloEntityKind,
          id: issue.entityId,
        });
      }
    }
    setFocusKey(issue.focusLocator);
    setValidationFocusToken((token) => token + 1);
    setValidationHighlightIssueKey(issue.issueKey);
    if (typeof nextIndex === "number") {
      setValidationIssueIndex(nextIndex);
    }
  };

  const toggleSampleGuideDismissed = () => {
    const nextValue = !sampleGuideDismissed;
    setSampleGuideDismissed(nextValue);
    setStoredBoolean(APOLLO_GUIDE_DISMISSED_KEY, nextValue);
  };

  const validationComplete = validation.errors.length === 0;
  const basicsComplete = draft.metadata.projectId.trim().length > 0 && draft.metadata.name.trim().length > 0;
  const nodesComplete = draft.nodes.length > 0 && !hasBlockingIssueForEntityTypes(validation, ["node"]);
  const membersComplete = draft.members.length > 0 && !hasBlockingIssueForEntityTypes(validation, ["member"]);
  const supportsMaterialsComplete =
    draft.supports.length > 0 &&
    draft.materialReferences.length > 0 &&
    !hasBlockingIssueForEntityTypes(validation, ["support", "material"]);
  const currentStepIndex =
    guidedStep === "start"
      ? 0
      : guidedStep === "sample" || guidedStep === "sampleLoaded" || guidedStep === "basics"
        ? 1
        : guidedStep === "editor" && editorPane === "nodes"
          ? 2
          : guidedStep === "editor" && editorPane === "members"
            ? 3
        : guidedStep === "editor"
              ? 4
              : 5;

  const stepCompletion = {
    start: guidedStep !== "start",
    basics: basicsComplete,
    nodes: nodesComplete,
    members: membersComplete,
    supportsMaterials: supportsMaterialsComplete,
    validation: validationComplete,
  } satisfies Record<StepKey, boolean>;

  const stepHasError = {
    start: false,
    basics: hasBlockingIssueForEntityTypes(validation, ["project"]),
    nodes: hasBlockingIssueForEntityTypes(validation, ["node"]),
    members: hasBlockingIssueForEntityTypes(validation, ["member"]),
    supportsMaterials: hasBlockingIssueForEntityTypes(validation, ["support", "material"]),
    validation: validation.errors.length > 0,
  } satisfies Record<StepKey, boolean>;

  const furthestStepIndex = stepCompletion.basics
    ? stepCompletion.nodes
      ? stepCompletion.members
        ? stepCompletion.supportsMaterials
          ? STEP_DEFINITIONS.length - 1
          : 4
        : 3
      : 2
    : 1;

  const navigateStep = (step: StepKey) => {
    if (step === "start") {
      setGuidedStep("start");
      return;
    }
    if (step === "basics") {
      setGuidedStep("basics");
      return;
    }
    if (step === "nodes") {
      setGuidedStep("editor");
      setPaneAndSelection("nodes");
      return;
    }
    if (step === "members") {
      setGuidedStep("editor");
      setPaneAndSelection("members");
      return;
    }
    if (step === "supportsMaterials") {
      setGuidedStep("editor");
      setPaneAndSelection(editorPane === "materials" ? "materials" : "supports");
      return;
    }
    setGuidedStep("validation");
  };

  const resolveStepStatus = (step: StepKey, index: number): StepStatus => {
    if (index === currentStepIndex) return "current";
    if (stepHasError[step]) return "error";
    if (stepCompletion[step]) return "complete";
    if (index <= furthestStepIndex) return "available";
    return "locked";
  };

  const stepStatusLabel = (status: StepStatus): string => {
    if (status === "current") return "現在";
    if (status === "complete") return "完了";
    if (status === "error") return "要修正";
    if (status === "available") return "移動可能";
    return "未着手";
  };

  const stepStatusSymbol = (status: StepStatus, index: number): string => {
    if (status === "complete") return "✓";
    if (status === "error") return "!";
    if (status === "current") return "●";
    if (status === "available") return "→";
    return `${index + 1}`;
  };

  const handleWorkflowNavigate = (target: WorkflowStateModel["steps"][number]["definition"]["navigationTarget"]) => {
    scrollWorkflowTargetIntoView(target);
  };

  const handleWorkflowPrimaryAction = (stepId: WorkflowStateModel["steps"][number]["workflowStepId"]) => {
    const step = WORKFLOW_STEP_DEFINITIONS.find((entry) => entry.workflowStepId === stepId);
    if (step) {
      handleWorkflowNavigate(step.navigationTarget);
    }
  };

  const handleGuidedDetailEscape = (escape: GuidedDetailEscape) => {
    if (escape.kind === "panel") {
      setDrawerTarget(escape);
      return;
    }
    if (escape.kind === "route") {
      scrollWorkflowTargetIntoView({ kind: "route", path: escape.path, label: escape.label });
      return;
    }
    const viewer = document.querySelector<HTMLElement>('[data-testid="apollo-model-view-panel"]');
    viewer?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderStepBar = () => (
    <ol className="apollo-stepbar" aria-label="Apolloガイド工程">
      {STEP_DEFINITIONS.map(({ key, label }, index) => {
        const status = resolveStepStatus(key, index);
        return (
          <li
            key={label}
            className={`apollo-stepbar-item apollo-stepbar-${status}`}
            data-step-status={status}
          >
            <button
              type="button"
              onClick={() => navigateStep(key)}
              disabled={status === "locked"}
              aria-current={status === "current" ? "step" : undefined}
            >
              <span className="apollo-stepbar-symbol" aria-hidden="true">{stepStatusSymbol(status, index)}</span>
              <span className="apollo-stepbar-label">{label}</span>
              <span className="apollo-stepbar-state">{stepStatusLabel(status)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  const renderCompletionPanel = () =>
    validationComplete ? (
      <article className="apollo-editor-card apollo-completion-card" data-testid="apollo-completion-card">
        <h2>橋梁モデルの作成が完了しました</h2>
        <p>基本情報、節点、部材、支点、材料の入力確認が完了しています。</p>
        <ul>
          <li>保存を行う場合は、共有用の「ファイルに保存」または同じPCで再開するための「作業中データを保存」を選べます。</li>
          <li>次の操作として、一覧編集モードで最終確認するか、メニューへ戻れます。</li>
          <li>現在は橋梁モデル入力まで利用できます。構造解析および解析結果の表示は未実装です。</li>
        </ul>
      </article>
    ) : null;

  const renderProjectForm = () => (
    <article data-testid="apollo-project-shell" className="apollo-editor-card">
      <div className="apollo-editor-card-header">
        <div>
          <h2>基本情報</h2>
          <p>橋梁の識別情報と保存状態を確認します。</p>
        </div>
        <div className="apollo-applied-summary">
          <span>保存状態: {statusText(isDirty)}</span>
          <div className="apollo-inline-actions">
            <button type="button" data-testid="apollo-undo" onClick={onUndo} disabled={!canUndo}>
              {getButtonLabel("UNDO")}
            </button>
            <button type="button" data-testid="apollo-redo" onClick={onRedo} disabled={!canRedo}>
              {getButtonLabel("REDO")}
            </button>
          </div>
        </div>
      </div>
      <div className="apollo-project-form-grid">
        <label>
          プロジェクトID
          <output data-testid="apollo-project-id-display" data-focus-key="project-id">
            {draft.metadata.projectId}
          </output>
          <small>内部識別子です。編集できません。</small>
        </label>
        <label>
          橋梁名 <span aria-hidden="true">必須</span>
          <CompositionAwareInput
            data-testid="apollo-project-name-input"
            data-focus-key="project-name"
            placeholder="200m級 5径間連続橋"
            value={draft.metadata.name}
            onValueChange={(value) => updateProjectField("name", value, "橋梁名を更新しました。")}
            onBlur={onCloseHistoryTransaction}
          />
        </label>
        <label className="apollo-project-form-wide">
          概要・備考 <span aria-hidden="true">任意</span>
          <CompositionAwareTextarea
            data-testid="apollo-project-description-input"
            placeholder="橋長200m、5径間連続橋、Apollo操作確認用サンプル"
            value={draft.metadata.description}
            onValueChange={(value) => updateProjectField("description", value, "概要・備考を更新しました。")}
            onBlur={onCloseHistoryTransaction}
          />
        </label>
      </div>
    </article>
  );

  const renderModelView = () => (
    <section data-testid="apollo-topology-shell" className="apollo-editor-card">
      <div className="apollo-editor-card-header">
        <div>
          <h2>橋梁モデル表示</h2>
          <p>一覧選択とモデル表示を連動させています。</p>
        </div>
        <div className="apollo-topology-export-actions">
          <label>
            STL出力
            <select
              data-testid="apollo-stl-export-preset"
              value={stlExportPreset}
              onChange={(event) => setStlExportPreset(event.currentTarget.value as ApolloStlExportPreset)}
            >
              <option value="full">全体</option>
              <option value="girders">主桁のみ</option>
              <option value="deck">床版のみ</option>
              <option value="visible">表示中のみ</option>
            </select>
          </label>
          <button
            type="button"
            data-testid="apollo-export-stl"
            onClick={handleStlExport}
            disabled={!apolloVisualizationBuild.ok}
          >
            STLとマニフェストを出力
          </button>
          <button
            type="button"
            data-testid="apollo-open-superstructure-pipeline"
            onClick={() => setDrawerTarget({ kind: "panel", panelId: "wf-panel-superstructure-pipeline", label: "上部工一気通貫パイプライン" })}
          >
            上部工一気通貫パイプライン
          </button>
        </div>
      </div>
      <div className="apollo-topology-summary" data-testid="apollo-topology-summary">
        <span>節点数 {draft.nodes.length}</span>
        <span>部材数 {draft.members.length}</span>
        <span>支点数 {draft.supports.length}</span>
        <span>材料数 {draft.materialReferences.length}</span>
      </div>
      <div data-testid="apollo-topology-view" className="apollo-topology-view">
        {draft.nodes.length === 0 ? (
          <div className="apollo-empty-state">
            <p>まだモデルがありません。</p>
            <p>サンプル橋梁を読み込むか、新規作成してください。</p>
          </div>
        ) : (
          <ViewerPane nodeCount={draft.nodes.length}>
            <Viewer3D
            apolloVisualizationModel={apolloVisualizationBuild.ok ? apolloVisualizationBuild.model : null}
            apolloSelectionKeys={viewerSelectionKeys}
            apolloValidationHighlight={viewerValidationHighlight}
            project={viewProject}
            result={null}
            selectedSection={viewerSection}
            selection={viewerSelection}
            activeLoadCase=""
            onSelectionChange={handleViewerSelection}
            onActiveLoadCaseChange={() => undefined}
            onViewerError={setViewerMessage}
            viewPanelOpen={topologyViewPanelOpen}
            onViewPanelToggle={() => setTopologyViewPanelOpen((current) => !current)}
            onVisibilityChange={setApolloViewerVisibility}
          />
          </ViewerPane>
        )}
      </div>
    </section>
  );

  const renderWorkspaceCard = () => (
    <article data-testid="apollo-workspace-shell" className="apollo-editor-card">
      <div className="apollo-editor-card-header">
        <div>
          <h2>作業中データ</h2>
          <p>このパソコン内に一時保存したデータを管理します。</p>
        </div>
      </div>
      <div className="apollo-workspace-actions">
        <button type="button" data-testid="apollo-workspace-new" onClick={() => void startNewProject()}>新規作成</button>
        <button
          type="button"
          data-testid="apollo-workspace-save"
          onClick={() => {
            handleWorkspaceSave();
            setSaveNotice("作業中データを保存しました。");
          }}
        >
          作業中データを保存
        </button>
        <button type="button" data-testid="apollo-workspace-open" onClick={() => void openWorkspaceSnapshot()} disabled={!selectedWorkspaceEntry}>作業中データを開く</button>
        <button type="button" data-testid="apollo-workspace-duplicate" onClick={handleWorkspaceDuplicate} disabled={!selectedWorkspaceEntry}>複製</button>
        <button type="button" data-testid="apollo-workspace-rename" onClick={handleWorkspaceRename} disabled={!selectedWorkspaceEntry}>名前変更</button>
        <button type="button" data-testid="apollo-workspace-delete" onClick={handleWorkspaceDelete} disabled={!selectedWorkspaceEntry}>削除</button>
      </div>
      <label className="apollo-workspace-select">
        保存済み一覧
        <select
          data-testid="apollo-workspace-select"
          value={workspaceSelection ?? ""}
          onChange={(event) => setWorkspaceSelection(event.currentTarget.value || null)}
        >
          <option value="">保存済みデータなし</option>
          {workspaceEntries.map((entry) => (
            <option key={entry.workspaceId} value={entry.workspaceId}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      {malformedWorkspaceEntries.length > 0 ? (
        <div className="apollo-workspace-warning" data-testid="apollo-workspace-malformed-warning">
          <p>破損した作業中データが {malformedWorkspaceEntries.length} 件あります。開くことはできません。</p>
          <ul>
            {malformedWorkspaceEntries.map((entry) => (
              <li key={entry.workspaceId}>
                {entry.workspaceId}: {entry.diagnostics.join(" / ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {selectedWorkspaceEntry ? (
        <dl className="apollo-project-meta-list">
          <div>
            <dt>プロジェクトID</dt>
            <dd>{selectedWorkspaceEntry.projectId}</dd>
          </div>
          <div>
            <dt>更新日時</dt>
            <dd>{selectedWorkspaceEntry.updatedAt}</dd>
          </div>
        </dl>
      ) : (
        <p data-testid="apollo-workspace-empty">まだ保存済みの作業中データはありません。</p>
      )}
    </article>
  );

  const renderEditor = () => (
    <section className="apollo-unit2-layout">
      <div className="apollo-unit2-editor">
        <BridgeStructureInputPanel
          project={project}
          onProjectChange={(nextProject) => onProjectChange(nextProject)}
          onAuditEvent={onAuditEvent}
        />
        <DeckAppurtenanceInputPanel
          project={project}
          onProjectChange={(nextProject) => onProjectChange(nextProject)}
          onAuditEvent={onAuditEvent}
        />
        <RcDeckHaunchInputPanel
          project={project}
          onProjectChange={(nextProject) => onProjectChange(nextProject)}
          onAuditEvent={onAuditEvent}
        />
        <div className="apollo-applied-summary">
          <span data-testid="apollo-selection-count">選択 {selectedRefs.length} 件</span>
          <span data-testid="apollo-visible-count">表示 {visibleEditorRefs.length} 件</span>
          <button
            type="button"
            data-testid="apollo-copy-selection"
            onClick={handleCopySelection}
            disabled={
              visibleSelectedEditorRefs.length === 0 ||
              !isApolloSelectionHomogeneous(visibleSelectedEditorRefs)
            }
          >
            Copy
          </button>
          <button type="button" data-testid="apollo-paste-selection" onClick={handlePasteSelection}>
            Paste
          </button>
          {!isApolloSelectionHomogeneous(selectedRefs) && selectedRefs.length > 1 ? (
            <span className="apollo-inline-hint">異なる種類の行は同時にコピーできません。</span>
          ) : null}
        </div>
        <div className="apollo-applied-summary">
          <label>
            検索
            <CompositionAwareInput
              data-testid="apollo-search-query"
              value={searchFilter.query}
              onValueChange={(value) => setSearchFilter((current) => ({ ...current, query: value }))}
            />
          </label>
          <label>
            種類
            <select
              data-testid="apollo-search-type"
              value={searchFilter.entityType}
              onChange={(event) =>
                setSearchFilter((current) => ({
                  ...current,
                  entityType: event.currentTarget.value as ApolloSearchFilterState["entityType"],
                }))
              }
            >
              <option value="all">全て</option>
              <option value="node">節点</option>
              <option value="member">部材</option>
              <option value="support">支点</option>
              <option value="material">材料</option>
            </select>
          </label>
          <button type="button" data-testid="apollo-search-clear" onClick={clearSearchFilter}>
            Clear
          </button>
        </div>
        <section className="apollo-editor-card" data-testid="apollo-bulk-edit-panel">
          <div className="apollo-editor-card-header">
            <div>
              <h2>一括編集</h2>
              <p>同じ種類の行を2件以上選択した場合のみ適用できます。</p>
            </div>
          </div>
          <div className="apollo-topology-summary">
            <span data-testid="apollo-bulk-edit-count">対象件数 {visibleSelectedEditorRefs.length}</span>
            <span data-testid="apollo-bulk-edit-kind">
              対象種類 {bulkEditSelection.ok ? bulkEditSelection.kind : "未選択"}
            </span>
          </div>
          {bulkEditSelection.ok ? (
            <div className="apollo-detail-grid">
              <label>
                項目
                <select
                  data-testid="apollo-bulk-edit-field"
                  value={bulkEditField}
                  onChange={(event) =>
                    setBulkEditField(event.currentTarget.value as "label" | "displayName" | "active")
                  }
                >
                  {bulkEditSelection.allowedFields.map((field) => (
                    <option key={field} value={field}>
                      {field === "label" ? "名称" : field === "displayName" ? "表示名" : "有効"}
                    </option>
                  ))}
                </select>
              </label>
              {bulkEditField === "active" ? (
                <label>
                  値
                  <select
                    data-testid="apollo-bulk-edit-active"
                    value={bulkEditActiveValue ? "true" : "false"}
                    onChange={(event) => setBulkEditActiveValue(event.currentTarget.value === "true")}
                  >
                    <option value="true">有効</option>
                    <option value="false">無効</option>
                  </select>
                </label>
              ) : (
                <label>
                  値
                  <CompositionAwareInput
                    data-testid="apollo-bulk-edit-text"
                    value={bulkEditTextValue}
                    onValueChange={setBulkEditTextValue}
                    onBlur={onCloseHistoryTransaction}
                  />
                </label>
              )}
              <button type="button" data-testid="apollo-bulk-edit-apply" onClick={applyBulkEdit}>
                適用
              </button>
            </div>
          ) : (
            <p data-testid="apollo-bulk-edit-blocked">{bulkEditSelection.message}</p>
          )}
        </section>
        <nav className="apollo-unit2-tabs" aria-label="Apollo editor sections">
          {([
            ["nodes", "節点"],
            ["members", "部材"],
            ["supports", "支点"],
            ["materials", "材料"],
          ] as const).map(([pane, label]) => (
            <button
              key={pane}
              type="button"
              className={editorPane === pane ? "active" : undefined}
              onClick={() => setPaneAndSelection(pane)}
            >
              {label}
            </button>
          ))}
        </nav>

        {editorPane === "nodes" ? (
          <section data-testid="apollo-node-editor" className="apollo-editor-card">
            <div className="apollo-editor-card-header">
              <div>
                <h2>節点</h2>
                <p>節点は、橋台・橋脚位置など、骨組みモデルの基準点です。</p>
              </div>
              <button type="button" data-testid="apollo-add-node" onClick={addNode}>節点を追加</button>
            </div>
            <div className="apollo-table-wrap">
              <table className="apollo-edit-table">
                <thead>
                  <tr><th>ID</th><th>名称</th><th>X(m)</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {visibleNodes.map((node) => {
                    const active = includesApolloRef(selectedRefs, { kind: "node", id: node.id });
                    return (
                      <tr key={node.id} className={active ? "selected" : undefined}>
                        <td>{node.id}</td>
                        <td>{node.label}</td>
                        <td>{node.x}</td>
                        <td className="apollo-row-actions">
                          <button type="button" data-testid={`apollo-node-select-${node.id}`} onClick={(event) => handleRowSelection({ kind: "node", id: node.id }, event)}>選択</button>
                          <button type="button" onClick={() => duplicateNode(node.id)}>複製</button>
                          <button type="button" onClick={() => deleteNode(node.id)}>削除</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleNodes.length === 0 ? <p data-testid="apollo-no-results">一致する行がありません。</p> : null}
            {selectedNode ? (
              <div className="apollo-detail-grid">
                <label>ID<CompositionAwareInput data-focus-key="node-id" value={selectedNode.id} onValueChange={(value) => updateNodeId(selectedNode.id, value)} onBlur={onCloseHistoryTransaction} /></label>
                <label>名称<CompositionAwareInput data-testid="apollo-node-label-input" value={selectedNode.label} onValueChange={(value) => updateNode(selectedNode.id, (node) => ({ ...node, label: value }), "節点名称を更新しました。", coalescedFieldMode(`node:${selectedNode.id}:label`))} onBlur={onCloseHistoryTransaction} /></label>
                <label>X座標<ApolloNumericInput data-testid="apollo-node-x-input" value={selectedNode.x} onCommit={(next) => updateNode(selectedNode.id, (node) => ({ ...node, x: next }), "節点X座標を更新しました。")} onReject={(message) => rejectOperation(`Node ${selectedNode.id} rejected invalid X coordinate input: ${message}`, "node", selectedNode.id)} /></label>
              </div>
            ) : null}
          </section>
        ) : null}

        {editorPane === "members" ? (
          <section data-testid="apollo-member-editor" className="apollo-editor-card">
            <div className="apollo-editor-card-header">
              <div>
                <h2>部材</h2>
                <p>部材は、2つの節点を結ぶ骨組み要素です。</p>
              </div>
              <button type="button" data-testid="apollo-add-member" onClick={addMember}>部材を追加</button>
            </div>
            <div className="apollo-table-wrap">
              <table className="apollo-edit-table">
                <thead>
                  <tr><th>ID</th><th>名称</th><th>始点</th><th>終点</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member) => {
                    const active = includesApolloRef(selectedRefs, { kind: "member", id: member.id });
                    return (
                      <tr key={member.id} className={active ? "selected" : undefined}>
                        <td>{member.id}</td>
                        <td>{member.label}</td>
                        <td>{member.nodeI}</td>
                        <td>{member.nodeJ}</td>
                        <td className="apollo-row-actions">
                          <button type="button" data-testid={`apollo-member-select-${member.id}`} onClick={(event) => handleRowSelection({ kind: "member", id: member.id }, event)}>選択</button>
                          <button type="button" onClick={() => duplicateMember(member.id)}>複製</button>
                          <button type="button" onClick={() => deleteMember(member.id)}>削除</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleMembers.length === 0 ? <p data-testid="apollo-no-results">一致する行がありません。</p> : null}
            {selectedMember ? (
              <div className="apollo-detail-grid">
                <label>ID<CompositionAwareInput data-focus-key="member-id" value={selectedMember.id} onValueChange={(value) => updateMemberId(selectedMember.id, value)} onBlur={onCloseHistoryTransaction} /></label>
                <label>名称<CompositionAwareInput value={selectedMember.label} onValueChange={(value) => updateMember(selectedMember.id, (item) => ({ ...item, label: value }), "部材名称を更新しました。", coalescedFieldMode(`member:${selectedMember.id}:label`))} onBlur={onCloseHistoryTransaction} /></label>
                <label>始点<select data-focus-key="member-node-i" value={selectedMember.nodeI} onChange={(event) => changeMemberNode(selectedMember.id, "nodeI", event.currentTarget.value)}>{draft.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
                <label>終点<select data-focus-key="member-node-j" value={selectedMember.nodeJ} onChange={(event) => changeMemberNode(selectedMember.id, "nodeJ", event.currentTarget.value)}>{draft.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
                <label>材料<select data-focus-key="member-material" value={selectedMember.materialRefId} onChange={(event) => updateMember(selectedMember.id, (item) => ({ ...item, materialRefId: event.currentTarget.value }), "部材の材料参照を更新しました。")}>{draft.materialReferences.map((material) => <option key={material.id} value={material.id}>{material.id}</option>)}</select></label>
              </div>
            ) : null}
          </section>
        ) : null}

        {editorPane === "supports" ? (
          <section data-testid="apollo-support-editor" className="apollo-editor-card">
            <div className="apollo-editor-card-header">
              <div>
                <h2>支点</h2>
                <p>支点は橋台・橋脚位置に設定する支持情報です。現在は非数値入力用の確認情報のみ扱います。</p>
              </div>
              <button type="button" data-testid="apollo-add-support" onClick={addSupport}>支点を追加</button>
            </div>
            <div className="apollo-table-wrap">
              <table className="apollo-edit-table">
                <thead>
                  <tr><th>ID</th><th>節点</th><th>Ux</th><th>Uy</th><th>Uz</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {visibleSupports.map((support) => {
                    const active = includesApolloRef(selectedRefs, { kind: "support", id: support.id });
                    return (
                      <tr key={support.id} className={active ? "selected" : undefined}>
                        <td>{support.id}</td>
                        <td>{support.nodeId}</td>
                        <td>{formatSupportState(support.ux)}</td>
                        <td>{formatSupportState(support.uy)}</td>
                        <td>{formatSupportState(support.uz)}</td>
                        <td className="apollo-row-actions">
                          <button type="button" data-testid={`apollo-support-select-${support.id}`} onClick={(event) => handleRowSelection({ kind: "support", id: support.id }, event)}>選択</button>
                          <button type="button" onClick={() => duplicateSupport(support.id)}>複製</button>
                          <button type="button" onClick={() => deleteSupport(support.id)}>削除</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleSupports.length === 0 ? <p data-testid="apollo-no-results">一致する行がありません。</p> : null}
            {selectedSupport ? (
              <div className="apollo-detail-grid">
                <label>ID<CompositionAwareInput value={selectedSupport.id} onValueChange={(value) => updateSupportId(selectedSupport.id, value)} onBlur={onCloseHistoryTransaction} /></label>
                <label>節点<select data-focus-key="support-node" value={selectedSupport.nodeId} onChange={(event) => changeSupportNode(selectedSupport.id, event.currentTarget.value)}>{draft.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}</select></label>
                <label>名称<CompositionAwareInput value={selectedSupport.label} onValueChange={(value) => updateSupport(selectedSupport.id, (item) => ({ ...item, label: value }), "支点名称を更新しました。", coalescedFieldMode(`support:${selectedSupport.id}:label`))} onBlur={onCloseHistoryTransaction} /></label>
              </div>
            ) : null}
          </section>
        ) : null}

        {editorPane === "materials" ? (
          <section data-testid="apollo-material-editor" className="apollo-editor-card">
            <div className="apollo-editor-card-header">
              <div>
                <h2>材料</h2>
                <p>現在は材料名称と参照情報のみ確認できます。ヤング係数、断面諸元、荷重数値、計算結果は利用できません。</p>
              </div>
              <button type="button" data-testid="apollo-add-material" onClick={addMaterial}>材料を追加</button>
            </div>
            <div className="apollo-table-wrap">
              <table className="apollo-edit-table">
                <thead>
                  <tr><th>ID</th><th>名称</th><th>区分</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {visibleMaterials.map((material) => {
                    const active = includesApolloRef(selectedRefs, { kind: "material", id: material.id });
                    return (
                      <tr key={material.id} className={active ? "selected" : undefined}>
                        <td>{material.id}</td>
                        <td>{material.displayName}</td>
                        <td>{material.category}</td>
                        <td className="apollo-row-actions">
                          <button type="button" data-testid={`apollo-material-select-${material.id}`} onClick={(event) => handleRowSelection({ kind: "material", id: material.id }, event)}>選択</button>
                          <button type="button" onClick={() => duplicateMaterial(material.id)}>複製</button>
                          <button type="button" onClick={() => deleteMaterial(material.id)}>削除</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visibleMaterials.length === 0 ? <p data-testid="apollo-no-results">一致する行がありません。</p> : null}
            {selectedMaterial ? (
              <div className="apollo-detail-grid">
                <label>ID<CompositionAwareInput data-focus-key="material-id" value={selectedMaterial.id} onValueChange={(value) => updateMaterialId(selectedMaterial.id, value)} onBlur={onCloseHistoryTransaction} /></label>
                <label>名称<CompositionAwareInput value={selectedMaterial.displayName} onValueChange={(value) => updateMaterial(selectedMaterial.id, (item) => ({ ...item, displayName: value }), "材料名称を更新しました。", coalescedFieldMode(`material:${selectedMaterial.id}:displayName`))} onBlur={onCloseHistoryTransaction} /></label>
                <label>区分<CompositionAwareInput value={selectedMaterial.category} onValueChange={(value) => updateMaterial(selectedMaterial.id, (item) => ({ ...item, category: value }), "材料区分を更新しました。", coalescedFieldMode(`material:${selectedMaterial.id}:category`))} onBlur={onCloseHistoryTransaction} /></label>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="apollo-unit2-visual-panel">
        {renderModelView()}
      </div>
    </section>
  );

  const renderValidation = () => (
    <section data-testid="apollo-validation-shell" className="apollo-editor-card">
      <div className="apollo-editor-card-header">
        <div>
          <h2>入力チェック</h2>
          <p>内容を確認し、必要であれば該当箇所へ移動してください。</p>
        </div>
      </div>
      <div className="apollo-topology-summary">
        <span>エラー件数 {validation.errors.length}</span>
        <span>注意件数 {validation.warnings.length}</span>
        <span data-testid="apollo-validation-issue-count">総件数 {validationIssues.length}</span>
        <span>節点数 {draft.nodes.length}</span>
        <span>部材数 {draft.members.length}</span>
        <span>支点数 {draft.supports.length}</span>
        <span>材料数 {draft.materialReferences.length}</span>
      </div>
      {validationIssues.length === 0 ? (
        <p data-testid="apollo-validation-ok">入力内容に重大な問題はありません。</p>
      ) : (
        <>
          <div className="apollo-applied-summary">
            <button
              type="button"
              data-testid="apollo-validation-previous"
              onClick={() => {
                const nextIndex = previousApolloValidationIssueIndex(
                  validationIssueIndex,
                  validationIssues.length,
                );
                const issue = validationIssues[nextIndex];
                if (issue) {
                  navigateValidationIssue(issue, nextIndex);
                }
              }}
            >
              前へ
            </button>
            <button
              type="button"
              data-testid="apollo-validation-next"
              onClick={() => {
                const nextIndex = nextApolloValidationIssueIndex(
                  validationIssueIndex,
                  validationIssues.length,
                );
                const issue = validationIssues[nextIndex];
                if (issue) {
                  navigateValidationIssue(issue, nextIndex);
                }
              }}
            >
              次へ
            </button>
            <button
              type="button"
              data-testid="apollo-validation-navigate-current"
              onClick={() => {
                if (currentValidationIssue) {
                  navigateValidationIssue(currentValidationIssue, validationIssueIndex);
                }
              }}
            >
              現在の項目へ移動
            </button>
            <span data-testid="apollo-validation-current-index">
              {validationIssues.length === 0 ? "0 / 0" : `${validationIssueIndex + 1} / ${validationIssues.length}`}
            </span>
          </div>
          <ul data-testid="apollo-validation-list" className="apollo-validation-list">
            {validationIssues.map((issue, index) => {
              const entry: StructuredMessage = {
                code: issue.ruleId,
                entityType: issue.entityType as StructuredMessage["entityType"],
                entityId: issue.entityId,
                path: issue.fieldPath,
                message: issue.message,
              };
              return (
                <li
                  key={issue.issueKey}
                  className={issue.severity === "error" ? "apollo-validation-error" : "apollo-validation-warning"}
                  data-current={index === validationIssueIndex ? "true" : "false"}
                >
                  <span>{issue.severity === "error" ? "エラー" : "注意"}</span>
                  <span>{localizeValidationMessage(entry)}</span>
                  <span>{issue.entityId ?? "共通"}</span>
                  <button type="button" onClick={() => navigateValidationIssue(issue, index)}>
                    該当箇所へ移動
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );

  const renderDeveloperInfo = () => (
    <details className="apollo-editor-card apollo-developer-info">
      <summary>開発者情報</summary>
      <article data-testid="apollo-flag-matrix">
        <p>通常利用では不要な内部状態です。調査が必要な場合のみ確認してください。</p>
        <ul>
          <li>スキーマ版: {APOLLO_PHASE1_UNIT2_SCHEMA_VERSION}</li>
          <li>非数値入力モード: {String(flags.nnEnabled)}</li>
          <li>数値計算の公開停止: {String(flags.numericReleaseBlocked)}</li>
          <li>計算結果出力の停止: {String(flags.disableResultPublication)}</li>
          <li>構造計算実行の停止: {String(flags.disableNumericExecution)}</li>
        </ul>
        <div className="apollo-workspace-actions">
          <button type="button" data-testid="apollo-numeric-execution-guard" data-guard-blocked={flags.disableNumericExecution ? "true" : "false"} onClick={() => announce("構造計算は現在利用できません。")}>構造計算は現在利用できません</button>
          <button type="button" data-testid="apollo-result-publication-guard" data-guard-blocked={flags.disableResultPublication ? "true" : "false"} onClick={() => announce("計算結果出力は現在利用できません。")}>計算結果出力は現在利用できません</button>
        </div>
        {interactionMessage ? <p data-testid="apollo-interaction-message">{interactionMessage}</p> : null}
        {viewerMessage ? <p data-testid="apollo-viewer-message">{viewerMessage}</p> : null}
      </article>
    </details>
  );

  const renderDrawerContent = () => {
    if (!drawerTarget || drawerTarget.kind !== "panel") return null;
    switch (drawerTarget.panelId) {
      case "wf-panel-bridge-structure":
        return (
          <BridgeStructureInputPanel
            project={project}
            onProjectChange={(nextProject) => onProjectChange(nextProject)}
            onAuditEvent={onAuditEvent}
          />
        );
      case "wf-panel-pavement":
        return (
          <PavementMarkingInputPanel
            project={project}
            onProjectChange={(nextProject) => onProjectChange(nextProject)}
            onAuditEvent={onAuditEvent}
          />
        );
      case "wf-panel-appurtenance":
        return (
          <DeckAppurtenanceInputPanel
            project={project}
            onProjectChange={(nextProject) => onProjectChange(nextProject)}
            onAuditEvent={onAuditEvent}
          />
        );
      case "wf-panel-haunch":
        return (
          <RcDeckHaunchInputPanel
            project={project}
            onProjectChange={(nextProject) => onProjectChange(nextProject)}
            onAuditEvent={onAuditEvent}
          />
        );
      case "wf-panel-load-confirmation":
        return <LoadConfirmationDevelopmentPanel project={project} />;
      case "wf-panel-quantity":
        return <QuantityModelDevelopmentPanel project={project} />;
      case "wf-panel-analysis":
        return <AnalysisDevelopmentProbePanel />;
      case "wf-panel-output":
        return <OutputIntegrationPanel project={project} />;
      case "wf-panel-superstructure-pipeline":
        return <SuperstructurePipelinePanel project={project} />;
      default:
        return null;
    }
  };

  const drawerPanelActive = (panelId: string): boolean =>
    drawerTarget?.kind === "panel" && drawerTarget.panelId === panelId;

  return (
    <main ref={shellRootRef} className="apollo-phase1-shell" data-testid="apollo-phase1-shell">
      <header className="apollo-unit2-header">
        <div className="apollo-header-title">
          <p data-testid="apollo-shell-kicker">Apollo フェーズ1（非数値）</p>
          <h1>Apollo 橋梁骨組み入力</h1>
        </div>
        <div className="apollo-unit2-header-actions">
          <div className="apollo-header-group apollo-header-mode-group" role="group" aria-label="表示モード">
            <button type="button" className={mode === "guided" ? "apollo-header-active" : ""} onClick={() => setMode("guided")}>ガイド付き</button>
            <button type="button" className={mode === "list" ? "apollo-header-active" : ""} onClick={() => setMode("list")}>一覧編集</button>
          </div>
          <div className="apollo-header-group apollo-header-file-group" role="group" aria-label="ファイル操作">
            <button type="button" data-testid="apollo-reload-project" onClick={() => void openFromFile()} disabled={persisting !== null}>開く</button>
            <button type="button" data-testid="apollo-save-project" onClick={() => void saveToFile()} disabled={persisting !== null}>{persisting === "save" ? "保存中..." : "保存"}</button>
            <SaveStatusBadge isDirty={isDirty} persisting={persisting} />
          </div>
          <div className="apollo-header-group apollo-header-nav-group" role="group" aria-label="ナビゲーション">
            <button type="button" onClick={onReturnToPro} data-testid="apollo-return-to-pro">← メニューへ戻る</button>
          </div>
          <div className="apollo-header-group apollo-header-help-group" role="group" aria-label="ヘルプ">
            <button type="button" onClick={openOnboarding}>ⓘ 操作ガイド</button>
          </div>
          <div className="apollo-header-group apollo-header-auth-group">
            <CompactAuthorizationBadge />
          </div>
        </div>
      </header>

      {flags.showProvisionalStatus ? (
        <div className="apollo-provisional-compact" data-testid="apollo-provisional-badge" aria-label="暫定状態">
          <span className="apollo-provisional-badge-label">非数値入力モード</span>
          <span className="apollo-provisional-badge-hint" title="構造計算は現在利用できません。計算結果は未検証です。">ⓘ</span>
        </div>
      ) : null}

      {showOnboarding ? (
        <section className="apollo-editor-card" data-testid="apollo-onboarding">
          <div className="apollo-editor-card-header">
            <div>
              <h2>{ONBOARDING_SLIDES[onboardingIndex].title}</h2>
              <p>{ONBOARDING_SLIDES[onboardingIndex].body}</p>
            </div>
          </div>
          <div className="apollo-workspace-actions">
            <button type="button" onClick={() => setOnboardingIndex((current) => Math.max(0, current - 1))} disabled={onboardingIndex === 0}>前へ</button>
            <button type="button" onClick={() => setOnboardingIndex((current) => Math.min(ONBOARDING_SLIDES.length - 1, current + 1))} disabled={onboardingIndex === ONBOARDING_SLIDES.length - 1}>次へ</button>
            <button type="button" onClick={closeOnboarding}>閉じる</button>
          </div>
        </section>
      ) : null}

      {saveNotice ? <div className="apollo-toast-notice" data-testid="apollo-toast-notice"><span>{saveNotice}</span></div> : null}

      {mode === "guided" && guidedStep === "start" ? (
        <section className="apollo-screen-grid" data-testid="apollo-start-screen">
          <article className="apollo-editor-card">
            <h2>開始方法を選択</h2>
            <p>初めての方はサンプル橋梁から始めてください。入力済みの橋梁モデルで操作の流れを確認できます。</p>
          </article>
          <div className="apollo-start-cards">
            <article className="apollo-editor-card apollo-start-card-recommended">
              <p className="apollo-recommend-badge">おすすめ</p>
              <h3>1. サンプル橋梁から始める</h3>
              <p>初めて操作する方におすすめです。入力済みの橋梁モデルで基本操作を学べます。</p>
              <button
                type="button"
                className="apollo-button-primary"
                data-testid="apollo-open-sample-selection"
                onClick={() => setGuidedStep("sample")}
              >
                サンプルを選ぶ
              </button>
            </article>
            <article className="apollo-editor-card">
              <h3>2. Step 5 ガイド付きモード（15画面）</h3>
              <p>G01–G15 の案内シェルで、既存ワークフローと同じ入力データへ進めます。</p>
              <button
                type="button"
                data-testid="apollo-open-step5-guided-mode"
                onClick={() => setGuidedStep("basics")}
              >
                Step 5 ガイドを開く
              </button>
            </article>
            <article className="apollo-editor-card">
              <h3>3. 新しい橋梁を作成</h3>
              <p>空のプロジェクトを作成し、自分で橋梁情報を入力します。</p>
              <button type="button" onClick={() => void startNewProject()}>新規作成</button>
            </article>
            <article className="apollo-editor-card">
              <h3>4. 保存済みデータを開く</h3>
              <p>以前保存した Apollo データを開き、作業を再開します。</p>
              <button type="button" onClick={() => void openFromFile()}>ファイルを開く</button>
            </article>
          </div>
        </section>
      ) : null}

      {mode === "guided" && guidedStep === "sample" ? (
        <section data-testid="apollo-sample-selection" className="apollo-screen-grid">
          <article className="apollo-editor-card">
            <h2>サンプル橋梁を選択</h2>
            <p>操作確認に使用する橋梁を選択してください。サンプルは非数値入力用で、構造計算結果は含まれていません。</p>
          </article>
          <article className="apollo-editor-card apollo-start-card-recommended">
            <p className="apollo-recommend-badge">標準サンプル</p>
            <h3>200m級 5径間連続橋（標準サンプル）</h3>
            <p>A1 ──35m── P1 ──40m── P2 ──50m── P3 ──40m── P4 ──35m── A2</p>
            <ul>
              <li>橋長: 200m</li>
              <li>径間数: 5径間</li>
              <li>支点数: 6</li>
              <li>橋台: A1, A2</li>
              <li>橋脚: P1, P2, P3, P4</li>
              <li>線形: 直線</li>
              <li>用途: Apollo基本操作確認用</li>
            </ul>
            <div className="apollo-workspace-actions">
              <button
                type="button"
                className="apollo-button-primary"
                data-testid="apollo-load-standard-sample"
                aria-label="このサンプルを読み込む"
                onClick={() => void loadStandardSample()}
              >
                このサンプルを読み込む
              </button>
              <button type="button" onClick={() => setSaveNotice("標準サンプルです。節点6、部材5、支点6、材料1で構成されています。")}>内容を詳しく見る</button>
              <button type="button" onClick={() => setGuidedStep("start")}>戻る</button>
              <button type="button" onClick={startNewProject}>空のプロジェクトを作成</button>
            </div>
          </article>
        </section>
      ) : null}

      {mode === "guided" && guidedStep === "sampleLoaded" ? (
        <section data-testid="apollo-sample-loaded-guide" className="apollo-screen-grid">
          <article className="apollo-editor-card">
            <h2>200m級 5径間連続橋を読み込みました</h2>
            <p>サンプル橋梁の準備ができました。次の順番で内容を確認してください。</p>
            <ol>
              <li>橋梁の基本情報</li>
              <li>節点</li>
              <li>部材</li>
              <li>支点</li>
              <li>材料</li>
              <li>入力チェック</li>
              <li>保存</li>
            </ol>
            <div className="apollo-workflow-actions">
              <button
                type="button"
                className="apollo-button-primary"
                data-testid="apollo-sample-guide-primary-next"
                onClick={() => setGuidedStep("basics")}
              >
                次へ（基本情報）
              </button>
              <button type="button" onClick={() => setMode("list")}>一覧編集モードへ進む</button>
              <button type="button" onClick={toggleSampleGuideDismissed}>この案内を次回から表示しない: {sampleGuideDismissed ? "ON" : "OFF"}</button>
            </div>
            <div className="apollo-sample-jump-links">
              <button type="button" onClick={() => setGuidedStep("basics")}>基本情報を見る</button>
              <button type="button" onClick={() => { setGuidedStep("editor"); setPaneAndSelection("nodes"); }}>節点を見る</button>
              <button type="button" onClick={() => { setGuidedStep("editor"); setPaneAndSelection("members"); }}>部材を見る</button>
              <button type="button" onClick={() => { setGuidedStep("editor"); setPaneAndSelection("supports"); }}>支点を見る</button>
              <button type="button" onClick={() => { setGuidedStep("editor"); setPaneAndSelection("materials"); }}>材料を見る</button>
              <button type="button" onClick={() => setGuidedStep("validation")}>入力チェックを見る</button>
            </div>
          </article>
        </section>
      ) : null}

      {mode === "guided" && guidedStep === "basics" ? (
        <section className="apollo-screen-grid" data-testid="apollo-basics-screen">
          {renderStepBar()}
          <div className="apollo-unit2-layout">
            <div className="apollo-unit2-editor">
              {renderProjectForm()}
              <GuidedModeShell
                project={project}
                onOpenDetail={handleGuidedDetailEscape}
                onSave={() => {
                  void saveToFile();
                }}
              />
              <WorkflowControlScreen
                project={project}
                onNavigate={handleWorkflowNavigate}
                onPrimaryAction={handleWorkflowPrimaryAction}
              />
              {!drawerPanelActive("wf-panel-bridge-structure") ? (
                <BridgeStructureInputPanel
                  project={project}
                  onProjectChange={(nextProject) => onProjectChange(nextProject)}
                  onAuditEvent={onAuditEvent}
                />
              ) : null}
              {!drawerPanelActive("wf-panel-pavement") ? (
                <PavementMarkingInputPanel
                  project={project}
                  onProjectChange={(nextProject) => onProjectChange(nextProject)}
                  onAuditEvent={onAuditEvent}
                />
              ) : null}
              {!drawerPanelActive("wf-panel-appurtenance") ? (
                <DeckAppurtenanceInputPanel
                  project={project}
                  onProjectChange={(nextProject) => onProjectChange(nextProject)}
                  onAuditEvent={onAuditEvent}
                />
              ) : null}
              {!drawerPanelActive("wf-panel-haunch") ? (
                <RcDeckHaunchInputPanel
                  project={project}
                  onProjectChange={(nextProject) => onProjectChange(nextProject)}
                  onAuditEvent={onAuditEvent}
                />
              ) : null}
              {!drawerPanelActive("wf-panel-analysis") ? <AnalysisDevelopmentProbePanel /> : null}
              <AppurtenanceHaunchAnalysisPanel project={project} />
              {!drawerPanelActive("wf-panel-load-confirmation") ? <LoadConfirmationDevelopmentPanel project={project} /> : null}
              <DemandCheckDevelopmentPanel />
              {!drawerPanelActive("wf-panel-quantity") ? <QuantityModelDevelopmentPanel project={project} /> : null}
              <ReportModelDevelopmentPanel project={project} />
              <StandardSectionDrawingPanel project={project} />
              <GeneralArrangementPanel project={project} />
              {!drawerPanelActive("wf-panel-output") ? <OutputIntegrationPanel project={project} /> : null}
              <article className="apollo-editor-card">
                <h2>サンプル概要</h2>
                <ul>
                  <li>橋長: 200m</li>
                  <li>径間: 35 + 40 + 50 + 40 + 35m</li>
                  <li>支点: A1, P1, P2, P3, P4, A2</li>
                </ul>
              </article>
              <div className="apollo-workflow-actions">
                <button type="button" onClick={() => setGuidedStep("start")}>前へ</button>
                <button type="button" onClick={() => { setGuidedStep("editor"); setPaneAndSelection("nodes"); }}>次へ: 節点を確認</button>
                <button type="button" onClick={() => void saveToFile()}>保存</button>
              </div>
            </div>
            <div className="apollo-unit2-visual-panel">
              {renderModelView()}
            </div>
          </div>
        </section>
      ) : null}

      {mode === "guided" && guidedStep === "editor" ? (
        <section className="apollo-screen-grid" data-testid="apollo-editor-screen">
          {renderStepBar()}
          {renderEditor()}
          <div className="apollo-workflow-actions">
            <button
              type="button"
              onClick={() => {
                if (editorPane === "nodes") {
                  setGuidedStep("basics");
                  return;
                }
                if (editorPane === "members") {
                  setPaneAndSelection("nodes");
                  return;
                }
                if (editorPane === "supports") {
                  setPaneAndSelection("members");
                  return;
                }
                setPaneAndSelection("supports");
              }}
            >
              前へ
            </button>
            <button
              type="button"
              onClick={() => {
                if (editorPane === "nodes") {
                  setPaneAndSelection("members");
                  return;
                }
                if (editorPane === "members") {
                  setPaneAndSelection("supports");
                  return;
                }
                if (editorPane === "supports") {
                  setPaneAndSelection("materials");
                  return;
                }
                setGuidedStep("validation");
              }}
            >
              次へ: 入力チェック
            </button>
            <button type="button" onClick={() => void saveToFile()}>保存</button>
            <button type="button" onClick={openOnboarding}>ガイドを表示</button>
          </div>
        </section>
      ) : null}

      {mode === "guided" && guidedStep === "validation" ? (
        <section className="apollo-screen-grid" data-testid="apollo-validation-screen">
          {renderStepBar()}
          {renderValidation()}
          {renderCompletionPanel()}
          <div className="apollo-unit2-summary-grid">
            <article className="apollo-editor-card">
              <h2>ファイルに保存</h2>
              <p>現在の橋梁モデル全体をJSONファイルとして保存します。保存先は保存時に選択し、他のPCへ持ち出せます。</p>
              <ul>
                <li>ブラウザやアプリを閉じても、保存したファイルは残ります。</li>
                <li>共有やバックアップを取りたい場合はこちらを使います。</li>
              </ul>
              <button type="button" className="apollo-button-primary" onClick={() => void saveToFile()}>ファイルに保存</button>
            </article>
            <article className="apollo-editor-card">
              <h2>作業中データを保存</h2>
              <p>現在の橋梁モデルをこのパソコンのブラウザ保存領域へ一時保存します。後で同じPCから作業を再開できます。</p>
              <ul>
                <li>保存先はこのPC内のみで、他のPCへは持ち出せません。</li>
                <li>ブラウザやアプリを閉じても通常は残りますが、保存領域を削除すると消えます。</li>
                <li>短時間の中断や、同じPCでの再開時はこちらを使います。</li>
              </ul>
              <button
                type="button"
                onClick={() => {
                  handleWorkspaceSave();
                  setSaveNotice("作業中データを保存しました。必要に応じてファイル保存も行ってください。");
                }}
              >
                作業中データを保存
              </button>
            </article>
          </div>
          <section className="apollo-editor-card" data-testid="apollo-scope-notice">
            <h2>現在利用できる範囲</h2>
            <p>現在は橋梁モデル入力まで利用できます。構造解析および解析結果の表示は未実装です。</p>
          </section>
          <div className="apollo-workflow-actions">
            <button type="button" onClick={() => setGuidedStep("editor")}>編集へ戻る</button>
            <button type="button" onClick={onReturnToPro}>メニューへ戻る</button>
            <button type="button" onClick={startNewProject}>新しい橋梁を作成</button>
          </div>
          {renderWorkspaceCard()}
        </section>
      ) : null}

      {mode === "list" ? (
        <section className="apollo-screen-grid" data-testid="apollo-list-mode">
          <div className="apollo-unit2-summary-grid">
            {renderProjectForm()}
            {renderWorkspaceCard()}
          </div>
          {renderEditor()}
          {renderValidation()}
        </section>
      ) : null}

      {renderDeveloperInfo()}

      <GuidedDetailDrawer
        open={drawerTarget !== null && drawerTarget.kind === "panel"}
        title={drawerTarget?.kind === "panel" ? drawerTarget.label : ""}
        description="ガイド付きモードの詳細編集。編集内容は即座にプロジェクトへ反映されます。"
        isDirty={isDirty}
        onSave={() => { void saveToFile(); }}
        onClose={() => setDrawerTarget(null)}
      >
        {renderDrawerContent()}
      </GuidedDetailDrawer>
    </main>
  );
}
