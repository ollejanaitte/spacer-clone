import { InMemoryProjectRepository } from "./inMemoryProjectRepository";
import { ProjectManager } from "./projectManager";

let instance: ProjectManager | undefined;

export function getProjectManager(): ProjectManager {
  if (instance === undefined) {
    instance = new ProjectManager(new InMemoryProjectRepository());
  }
  return instance;
}

export function resetProjectManagerForTest(): void {
  instance = undefined;
}
