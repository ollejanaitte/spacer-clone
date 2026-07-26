type ApolloPhase1ShellProps = {
  onReturnToPro: () => void;
};

export function ApolloPhase1Shell({ onReturnToPro }: ApolloPhase1ShellProps) {
  return (
    <main className="apollo-phase1-shell" data-testid="apollo-phase1-shell">
      <h1>Apollo Phase 1</h1>
      <p>Phase 1 foundation — not authorized for design input.</p>
      <button type="button" onClick={onReturnToPro} data-testid="apollo-return-to-pro">
        Return to workspace
      </button>
    </main>
  );
}
