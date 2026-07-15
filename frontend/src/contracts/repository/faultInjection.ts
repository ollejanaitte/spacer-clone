export interface RepositoryFaultInjection {
  /**
   * Invoked immediately before a successful write is committed.
   * `commitAttempt` is 1-based for the repository instance.
   * Throwing aborts the write and leaves repository state unchanged.
   */
  readonly onBeforeCommit?: (context: { readonly commitAttempt: number }) => void;
}

export function runRepositoryFaultInjection(
  faultInjection: RepositoryFaultInjection | undefined,
  commitAttempt: number,
): void {
  faultInjection?.onBeforeCommit?.({ commitAttempt });
}
