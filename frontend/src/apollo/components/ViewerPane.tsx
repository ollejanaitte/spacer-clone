import type { ReactNode } from "react";

export type ViewerPaneProps = {
  readonly children?: ReactNode;
  readonly nodeCount?: number;
  readonly testId?: string;
};

export function ViewerPane({ children, nodeCount, testId = "apollo-viewer-pane" }: ViewerPaneProps) {
  return (
    <div className="apollo-viewer-pane" data-testid={testId}>
      <div className="apollo-viewer-pane-main">
        {children}
      </div>
      {nodeCount !== undefined ? (
        <div className="apollo-viewer-supplementary" data-testid={`${testId}-supplementary`}>
          <span className="apollo-viewer-node-count">節点数: {nodeCount}</span>
        </div>
      ) : null}
    </div>
  );
}