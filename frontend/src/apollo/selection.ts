export type ApolloEntityKind = "node" | "member" | "support" | "material";

export type ApolloEntityRef = {
  readonly kind: ApolloEntityKind;
  readonly id: string;
};

export type ApolloSelectionState = {
  readonly orderedRefs: readonly ApolloEntityRef[];
  readonly anchorRef: ApolloEntityRef | null;
};

function sameRef(left: ApolloEntityRef | null, right: ApolloEntityRef | null): boolean {
  return left?.kind === right?.kind && left?.id === right?.id;
}

function containsRef(items: readonly ApolloEntityRef[], ref: ApolloEntityRef): boolean {
  return items.some((item) => sameRef(item, ref));
}

export function createApolloSelectionState(): ApolloSelectionState {
  return {
    orderedRefs: [],
    anchorRef: null,
  };
}

export function replaceApolloSelection(ref: ApolloEntityRef | null): ApolloSelectionState {
  return {
    orderedRefs: ref ? [ref] : [],
    anchorRef: ref,
  };
}

export function clearApolloSelection(): ApolloSelectionState {
  return createApolloSelectionState();
}

export function toggleApolloSelection(
  state: ApolloSelectionState,
  ref: ApolloEntityRef,
): ApolloSelectionState {
  if (containsRef(state.orderedRefs, ref)) {
    const orderedRefs = state.orderedRefs.filter((item) => !sameRef(item, ref));
    return {
      orderedRefs,
      anchorRef: sameRef(state.anchorRef, ref) ? orderedRefs[0] ?? null : state.anchorRef,
    };
  }
  return {
    orderedRefs: [...state.orderedRefs, ref],
    anchorRef: state.anchorRef ?? ref,
  };
}

export function selectApolloRange(
  state: ApolloSelectionState,
  targetRef: ApolloEntityRef,
  visibleRefs: readonly ApolloEntityRef[],
): ApolloSelectionState {
  const anchorRef = state.anchorRef ?? targetRef;
  const anchorIndex = visibleRefs.findIndex((item) => sameRef(item, anchorRef));
  const targetIndex = visibleRefs.findIndex((item) => sameRef(item, targetRef));
  if (anchorIndex === -1 || targetIndex === -1) {
    return replaceApolloSelection(targetRef);
  }
  const [start, end] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  return {
    orderedRefs: visibleRefs.slice(start, end + 1),
    anchorRef,
  };
}

export function selectAllVisibleApolloRefs(
  visibleRefs: readonly ApolloEntityRef[],
): ApolloSelectionState {
  return {
    orderedRefs: [...visibleRefs],
    anchorRef: visibleRefs[0] ?? null,
  };
}

export function filterApolloRefsToVisible(
  refs: readonly ApolloEntityRef[],
  visibleRefs: readonly ApolloEntityRef[],
): ApolloEntityRef[] {
  return refs.filter((ref) => containsRef(visibleRefs, ref));
}

export function pruneApolloSelection(
  state: ApolloSelectionState,
  existingRefs: readonly ApolloEntityRef[],
): ApolloSelectionState {
  const orderedRefs = state.orderedRefs.filter((ref) => containsRef(existingRefs, ref));
  const anchorRef = containsRef(existingRefs, state.anchorRef ?? { kind: "node", id: "__missing__" })
    ? state.anchorRef
    : orderedRefs[0] ?? null;
  return {
    orderedRefs,
    anchorRef,
  };
}

export function isApolloSelectionHomogeneous(refs: readonly ApolloEntityRef[]): boolean {
  if (refs.length <= 1) {
    return true;
  }
  return refs.every((ref) => ref.kind === refs[0]?.kind);
}

export function primaryApolloSelection(refs: readonly ApolloEntityRef[]): ApolloEntityRef | null {
  return refs[refs.length - 1] ?? null;
}
