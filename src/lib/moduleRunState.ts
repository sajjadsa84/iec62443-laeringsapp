export interface ModuleRunState {
  index: number;
  correctCount: number;
  scoredCount: number;
}

const key = (moduleId: string) => `iec62443-laeringsapp:run:${moduleId}`;

export function getModuleRunState(moduleId: string): ModuleRunState | null {
  const raw = localStorage.getItem(key(moduleId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ModuleRunState;
  } catch {
    return null;
  }
}

export function saveModuleRunState(moduleId: string, state: ModuleRunState): void {
  localStorage.setItem(key(moduleId), JSON.stringify(state));
}

export function clearModuleRunState(moduleId: string): void {
  localStorage.removeItem(key(moduleId));
}
