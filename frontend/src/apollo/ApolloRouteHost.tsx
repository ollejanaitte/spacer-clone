import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectModel } from "../types";
import { ApolloPhase1Shell } from "./ApolloPhase1Shell";
import {
  UnsavedChangesGuardDialog,
  useUnsavedGuardPrompt,
} from "./components/UnsavedChangesGuardDialog";
import { flushApolloCompositionSessions } from "./compositionRegistry";
import { computeApolloDirtyFingerprint, isApolloProjectDirty } from "./dirtyFingerprint";
import type { ApolloPhase1FeatureFlags } from "./featureFlag";
import { resolveUnsavedChangesGuard } from "./unsavedChangesGuard";
import { useElectronCloseGuard } from "./useElectronCloseGuard";

type ApolloRouteHostProps = {
  project: ProjectModel;
  flags: ApolloPhase1FeatureFlags;
  onProjectChange: (nextProject: ProjectModel) => void;
  onReturnToPro: () => void | Promise<void>;
  onSaveProject: () => Promise<boolean>;
  onReloadProject: () => Promise<boolean>;
  onAuditEvent?: (message: string) => void;
};

function cloneProject(project: ProjectModel): ProjectModel {
  return JSON.parse(JSON.stringify(project)) as ProjectModel;
}

export function ApolloRouteHost({
  project,
  flags,
  onProjectChange,
  onReturnToPro,
  onSaveProject,
  onReloadProject,
  onAuditEvent,
}: ApolloRouteHostProps) {
  const baselineProjectRef = useRef(cloneProject(project));
  const pendingBaselineSyncRef = useRef(false);
  const [baselineFingerprint, setBaselineFingerprint] = useState(() =>
    computeApolloDirtyFingerprint(project),
  );
  const guardPrompt = useUnsavedGuardPrompt();

  const isDirty = useMemo(
    () => isApolloProjectDirty(project, baselineFingerprint),
    [baselineFingerprint, project],
  );

  const projectRef = useRef(project);
  projectRef.current = project;

  const establishBaseline = useCallback((nextProject: ProjectModel) => {
    baselineProjectRef.current = cloneProject(nextProject);
    setBaselineFingerprint(computeApolloDirtyFingerprint(nextProject));
  }, []);

  const revertToBaseline = useCallback(() => {
    onProjectChange(cloneProject(baselineProjectRef.current));
  }, [onProjectChange]);

  const handleSaveProject = useCallback(async () => {
    const saved = await onSaveProject();
    if (saved) {
      establishBaseline(projectRef.current);
    }
    return saved;
  }, [establishBaseline, onSaveProject]);

  const runGuardedAction = useCallback(
    async (
      message: string,
      action: () => void | Promise<void>,
      options?: { readonly revertOnDiscard?: boolean },
    ) => {
      const resolution = await resolveUnsavedChangesGuard({
        isDirty,
        message,
        prompt: guardPrompt.prompt,
        save: handleSaveProject,
        discard: options?.revertOnDiscard ? revertToBaseline : undefined,
        flushComposition: flushApolloCompositionSessions,
      });
      if (resolution === "abort") {
        return false;
      }
      await action();
      return true;
    },
    [guardPrompt.prompt, handleSaveProject, isDirty, revertToBaseline],
  );

  useEffect(() => {
    if (!pendingBaselineSyncRef.current) {
      return;
    }
    pendingBaselineSyncRef.current = false;
    establishBaseline(project);
  }, [establishBaseline, project]);

  const handleReturnToPro = useCallback(async () => {
    await runGuardedAction(
      "メニューへ戻ると未保存の変更が失われる可能性があります。続行しますか。",
      async () => {
        await onReturnToPro();
      },
    );
  }, [onReturnToPro, runGuardedAction]);

  const handleReloadProject = useCallback(async () => {
    const proceed = await runGuardedAction(
      "ファイルを開くと現在の編集内容は失われる可能性があります。続行しますか。",
      async () => undefined,
    );
    if (!proceed) {
      return false;
    }
    const loaded = await onReloadProject();
    if (loaded) {
      pendingBaselineSyncRef.current = true;
    }
    return loaded;
  }, [onReloadProject, runGuardedAction]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useElectronCloseGuard({
    enabled: true,
    onPrompt: useCallback(
      async () =>
        runGuardedAction(
          "アプリを終了すると未保存の変更が失われる可能性があります。続行しますか。",
          async () => undefined,
        ),
      [runGuardedAction],
    ),
  });

  return (
    <>
      <ApolloPhase1Shell
        project={project}
        isDirty={isDirty}
        flags={flags}
        onProjectChange={onProjectChange}
        onReturnToPro={() => {
          void handleReturnToPro();
        }}
        onSaveProject={handleSaveProject}
        onReloadProject={handleReloadProject}
        onAuditEvent={onAuditEvent}
        runGuardedAction={runGuardedAction}
        onEstablishBaseline={establishBaseline}
      />
      <UnsavedChangesGuardDialog {...guardPrompt.dialogProps} />
    </>
  );
}
