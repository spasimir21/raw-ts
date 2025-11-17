import type TS from 'typescript';

// Note: This function is intentionally written to only return nodes with no children, not just any parent node that fits the position
function getNodeAtPosition(ts: typeof TS, initialNode: TS.Node, position: number): TS.Node | null {
  const getNodeAtPositionInternal = (node: TS.Node): TS.Node | null => {
    if (position < node.getStart() || position > node.getEnd()) return null;
    if (node.getChildCount() === 0) return node;

    return ts.forEachChild(node, getNodeAtPositionInternal) ?? null;
  };

  return getNodeAtPositionInternal(initialNode);
}

export { getNodeAtPosition };
