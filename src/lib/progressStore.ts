import type { UserProgress } from "../types";

const STORAGE_KEY = "iec62443-laeringsapp:progress";

const emptyProgress: UserProgress = {
  completedModuleIds: [],
  scoresByModuleId: {},
  currentModuleId: null,
};

export function getProgress(): UserProgress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...emptyProgress };

  try {
    const parsed = JSON.parse(raw) as UserProgress;
    return {
      completedModuleIds: parsed.completedModuleIds ?? [],
      scoresByModuleId: parsed.scoresByModuleId ?? {},
      currentModuleId: parsed.currentModuleId ?? null,
    };
  } catch {
    return { ...emptyProgress };
  }
}

export function saveProgress(progress: UserProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markModuleComplete(moduleId: string, score: number): UserProgress {
  const progress = getProgress();

  const completedModuleIds = progress.completedModuleIds.includes(moduleId)
    ? progress.completedModuleIds
    : [...progress.completedModuleIds, moduleId];

  const updated: UserProgress = {
    completedModuleIds,
    scoresByModuleId: {
      ...progress.scoresByModuleId,
      [moduleId]: score,
    },
    currentModuleId: null,
  };

  saveProgress(updated);
  return updated;
}
