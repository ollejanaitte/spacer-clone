type CompositionFlushHandler = () => void;

const activeCompositionCountByRoot = new Map<symbol, number>();
const flushHandlers = new Set<CompositionFlushHandler>();

let registryRoot: symbol | undefined;

function currentRoot(): symbol {
  if (!registryRoot) {
    registryRoot = Symbol("apollo-composition-root");
    activeCompositionCountByRoot.set(registryRoot, 0);
  }
  return registryRoot;
}

export function isApolloCompositionActive(): boolean {
  const count = activeCompositionCountByRoot.get(currentRoot()) ?? 0;
  return count > 0;
}

export function registerApolloCompositionFlush(handler: CompositionFlushHandler): () => void {
  flushHandlers.add(handler);
  return () => {
    flushHandlers.delete(handler);
  };
}

export function notifyApolloCompositionStart(): void {
  const root = currentRoot();
  activeCompositionCountByRoot.set(root, (activeCompositionCountByRoot.get(root) ?? 0) + 1);
}

export function notifyApolloCompositionEnd(): void {
  const root = currentRoot();
  const next = Math.max(0, (activeCompositionCountByRoot.get(root) ?? 0) - 1);
  activeCompositionCountByRoot.set(root, next);
}

/** Flushes pending composition commits before guard transitions. */
export function flushApolloCompositionSessions(): void {
  for (const handler of [...flushHandlers]) {
    handler();
  }
}

/** Test-only reset helper. */
export function resetApolloCompositionRegistryForTests(): void {
  activeCompositionCountByRoot.clear();
  flushHandlers.clear();
  registryRoot = undefined;
}
