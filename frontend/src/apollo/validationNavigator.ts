import type { StructuredMessage } from "../types";

export type ApolloValidationPaneId = "project" | "nodes" | "members" | "supports" | "materials";

export type ApolloValidationIssue = {
  readonly issueKey: string;
  readonly severity: "error" | "warning";
  readonly ruleId: string;
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly fieldPath: string | null;
  readonly message: string;
  readonly occurrenceIndex: number;
  readonly paneId: ApolloValidationPaneId;
  readonly focusLocator: string;
};

type ApolloValidationLocatorInput = Pick<
  StructuredMessage,
  "code" | "entityType" | "entityId" | "path"
>;

export function resolveApolloValidationFocusLocator(
  entry: ApolloValidationLocatorInput,
): { readonly paneId: ApolloValidationPaneId; readonly focusLocator: string } {
  if (entry.entityType === "project") {
    return {
      paneId: "project",
      focusLocator: entry.path === "/apolloPhase1Unit2/metadata/name" ? "project-name" : "project-id",
    };
  }
  if (entry.entityType === "node") {
    return { paneId: "nodes", focusLocator: "node-id" };
  }
  if (entry.entityType === "member") {
    if (entry.code === "APOLLO_MEMBER_MATERIAL_REFERENCE_INVALID") {
      return { paneId: "members", focusLocator: "member-material" };
    }
    if (entry.path?.endsWith(".nodeI")) {
      return { paneId: "members", focusLocator: "member-node-i" };
    }
    if (entry.path?.endsWith(".nodeJ")) {
      return { paneId: "members", focusLocator: "member-node-j" };
    }
    return { paneId: "members", focusLocator: "member-id" };
  }
  if (entry.entityType === "support") {
    return { paneId: "supports", focusLocator: "support-node" };
  }
  return { paneId: "materials", focusLocator: "material-id" };
}

function issueSortKey(issue: ApolloValidationIssue): string {
  return [
    issue.severity,
    issue.ruleId,
    issue.entityType ?? "none",
    issue.entityId ?? "none",
    issue.fieldPath ?? "none",
    String(issue.occurrenceIndex).padStart(6, "0"),
  ].join("|");
}

export function buildApolloValidationIssues(
  errors: readonly StructuredMessage[],
  warnings: readonly StructuredMessage[],
): ApolloValidationIssue[] {
  const rawIssues: Array<Omit<ApolloValidationIssue, "issueKey" | "paneId" | "focusLocator">> = [
    ...errors.map((entry) => ({
      severity: "error" as const,
      ruleId: entry.code,
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldPath: entry.path,
      message: entry.message,
      occurrenceIndex: 0,
      issueKey: "",
    })),
    ...warnings.map((entry) => ({
      severity: "warning" as const,
      ruleId: entry.code,
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldPath: entry.path,
      message: entry.message,
      occurrenceIndex: 0,
      issueKey: "",
    })),
  ].sort((left, right) =>
    [
      left.severity,
      left.ruleId,
      left.entityType ?? "none",
      left.entityId ?? "none",
      left.fieldPath ?? "none",
    ].join("|").localeCompare(
      [
        right.severity,
        right.ruleId,
        right.entityType ?? "none",
        right.entityId ?? "none",
        right.fieldPath ?? "none",
      ].join("|"),
    ),
  );

  const counters = new Map<string, number>();
  return rawIssues
    .map((issue) => {
      const baseKey = [
        issue.ruleId,
        issue.entityType ?? "none",
        issue.entityId ?? "none",
        issue.fieldPath ?? "none",
      ].join("|");
      const occurrenceIndex = (counters.get(baseKey) ?? 0) + 1;
      counters.set(baseKey, occurrenceIndex);
      const locator = resolveApolloValidationFocusLocator({
        code: issue.ruleId,
        entityType: issue.entityType as StructuredMessage["entityType"],
        entityId: issue.entityId,
        path: issue.fieldPath,
      });
      return {
        ...issue,
        occurrenceIndex,
        issueKey: `${baseKey}|${occurrenceIndex}`,
        paneId: locator.paneId,
        focusLocator: locator.focusLocator,
      };
    })
    .sort((left, right) => issueSortKey(left).localeCompare(issueSortKey(right)));
}

export function reconcileApolloValidationIssueIndex(
  currentIndex: number,
  currentIssueKey: string | null,
  issues: readonly ApolloValidationIssue[],
): number {
  if (issues.length === 0) {
    return 0;
  }
  if (currentIssueKey) {
    const matchedIndex = issues.findIndex((issue) => issue.issueKey === currentIssueKey);
    if (matchedIndex >= 0) {
      return matchedIndex;
    }
  }
  if (currentIndex < 0) {
    return 0;
  }
  if (currentIndex >= issues.length) {
    return issues.length - 1;
  }
  return currentIndex;
}

export function nextApolloValidationIssueIndex(
  currentIndex: number,
  total: number,
): number {
  if (total === 0) return -1;
  return currentIndex >= total - 1 ? 0 : currentIndex + 1;
}

export function previousApolloValidationIssueIndex(
  currentIndex: number,
  total: number,
): number {
  if (total === 0) return -1;
  return currentIndex <= 0 ? total - 1 : currentIndex - 1;
}
