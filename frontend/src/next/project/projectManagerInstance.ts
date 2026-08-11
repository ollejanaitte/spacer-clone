import { InMemoryProjectRepository } from "./inMemoryProjectRepository";
import { PersistentProjectManager } from "./persistentProjectManager";
import { FilesystemProjectPersistence } from "../persistence/filesystemProjectPersistence";
import { MemoryFileSystemGateway } from "../persistence/memoryFileSystemGateway";
import { IpcFileSystemGateway, isIpcAvailable } from "../persistence/ipcFileSystemGateway";
import type { ProjectPersistence } from "../persistence/projectPersistence";

let instance: PersistentProjectManager | undefined;

function createDefaultPersistence(): ProjectPersistence {
  if (isIpcAvailable()) {
    return new FilesystemProjectPersistence(new IpcFileSystemGateway());
  }
  return new FilesystemProjectPersistence(new MemoryFileSystemGateway());
}

export function getProjectManager(): PersistentProjectManager {
  if (instance === undefined) {
    instance = new PersistentProjectManager(
      new InMemoryProjectRepository(),
      createDefaultPersistence(),
    );
  }
  return instance;
}

export function getPersistentProjectManager(): PersistentProjectManager {
  return getProjectManager();
}

export function setPersistenceForTest(persistence: ProjectPersistence): void {
  instance = new PersistentProjectManager(
    new InMemoryProjectRepository(),
    persistence,
  );
}

export function resetProjectManagerForTest(): void {
  instance = undefined;
}
