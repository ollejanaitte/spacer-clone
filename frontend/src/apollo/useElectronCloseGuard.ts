import { useEffect } from "react";
import { isApolloCompositionActive } from "./compositionRegistry";

type CloseGuardKind = "window-close" | "app-quit";

type CloseGuardPromptPayload = {
  readonly kind: CloseGuardKind;
};

export function useElectronCloseGuard(options: {
  enabled: boolean;
  onPrompt: (payload: CloseGuardPromptPayload) => Promise<boolean>;
}): void {
  useEffect(() => {
    if (!options.enabled) return undefined;
    const bridge = window.spacerDesktop;
    if (!bridge?.onCloseGuardPrompt || !bridge.respondCloseGuard) {
      return undefined;
    }
    return bridge.onCloseGuardPrompt((payload) => {
      void options.onPrompt(payload).then((allow) => {
        bridge.respondCloseGuard?.(allow);
      });
    });
  }, [options.enabled, options.onPrompt]);
}

export function shouldSuppressApolloShortcut(): boolean {
  return isApolloCompositionActive();
}
