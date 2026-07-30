import { describe, expect, it } from "vitest";
import {
  buildApolloValidationIssues,
  nextApolloValidationIssueIndex,
  previousApolloValidationIssueIndex,
  reconcileApolloValidationIssueIndex,
  resolveApolloValidationFocusLocator,
} from "../validationNavigator";

describe("validationNavigator", () => {
  it("builds stable issue keys independent of message text", () => {
    const base = buildApolloValidationIssues(
      [
        {
          code: "APOLLO_MEMBER_MATERIAL_REFERENCE_INVALID",
          entityType: "member",
          entityId: "M-01",
          path: "members.0.materialRefId",
          message: "old message",
        },
      ],
      [],
    );
    const relabeled = buildApolloValidationIssues(
      [
        {
          code: "APOLLO_MEMBER_MATERIAL_REFERENCE_INVALID",
          entityType: "member",
          entityId: "M-01",
          path: "members.0.materialRefId",
          message: "new localized message",
        },
      ],
      [],
    );

    expect(base[0]?.issueKey).toBe(relabeled[0]?.issueKey);
    expect(base[0]?.paneId).toBe("members");
    expect(base[0]?.focusLocator).toBe("member-material");
  });

  it("resolves path-specific member focus locators", () => {
    expect(
      resolveApolloValidationFocusLocator({
        code: "APOLLO_MEMBER_NODE_REFERENCE_INVALID",
        entityType: "member",
        entityId: "M-01",
        path: "members.0.nodeI",
      }).focusLocator,
    ).toBe("member-node-i");
  });

  it("adds deterministic occurrence indexes for duplicate locators", () => {
    const issues = buildApolloValidationIssues(
      [
        {
          code: "APOLLO_MEMBER_NODE_REFERENCE_INVALID",
          entityType: "member",
          entityId: "M-01",
          path: "members.0.nodeI",
          message: "first",
        },
        {
          code: "APOLLO_MEMBER_NODE_REFERENCE_INVALID",
          entityType: "member",
          entityId: "M-01",
          path: "members.0.nodeI",
          message: "second",
        },
      ],
      [],
    );

    expect(issues.map((issue) => issue.issueKey)).toEqual([
      "APOLLO_MEMBER_NODE_REFERENCE_INVALID|member|M-01|members.0.nodeI|1",
      "APOLLO_MEMBER_NODE_REFERENCE_INVALID|member|M-01|members.0.nodeI|2",
    ]);
  });

  it("wraps next and previous navigation indexes", () => {
    expect(nextApolloValidationIssueIndex(0, 3)).toBe(1);
    expect(nextApolloValidationIssueIndex(2, 3)).toBe(0);
    expect(previousApolloValidationIssueIndex(0, 3)).toBe(2);
    expect(previousApolloValidationIssueIndex(2, 3)).toBe(1);
  });

  it("rebinds the cursor by issueKey and clamps when the active issue disappears", () => {
    const issues = buildApolloValidationIssues(
      [
        {
          code: "APOLLO_MEMBER_NODE_REFERENCE_INVALID",
          entityType: "member",
          entityId: "M-01",
          path: "members.0.nodeI",
          message: "first",
        },
        {
          code: "APOLLO_SUPPORT_NODE_REFERENCE_INVALID",
          entityType: "support",
          entityId: "S-01",
          path: null,
          message: "second",
        },
      ],
      [],
    );

    expect(
      reconcileApolloValidationIssueIndex(1, issues[1]!.issueKey, issues),
    ).toBe(1);

    const remaining = [issues[1]!];
    expect(
      reconcileApolloValidationIssueIndex(1, issues[0]!.issueKey, remaining),
    ).toBe(0);
  });
});
