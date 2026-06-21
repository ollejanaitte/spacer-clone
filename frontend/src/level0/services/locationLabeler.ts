export type LocationLabel = {
  nodeId: string;
  kind: string;
  labelLevel0: string;
};

/**
 * テンプレートのpresentation.nodesからノードの位置ラベルを取得する。
 */
export function getLocationLabels(
  presentationNodes: Record<string, { kind: string; label_level0: string }>,
): LocationLabel[] {
  return Object.entries(presentationNodes).map(([nodeId, data]) => ({
    nodeId,
    kind: data.kind,
    labelLevel0: data.label_level0,
  }));
}

/**
 * 特定ノードの位置ラベルを取得する。
 * 見つからない場合はnullを返す。
 */
export function getLocationLabel(
  nodeId: string,
  presentationNodes: Record<string, { kind: string; label_level0: string }>,
): LocationLabel | null {
  const data = presentationNodes[nodeId];
  if (!data) return null;
  return { nodeId, kind: data.kind, labelLevel0: data.label_level0 };
}
