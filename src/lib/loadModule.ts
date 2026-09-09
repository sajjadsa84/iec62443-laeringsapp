import type { LearningModule } from "../types";

const moduleFiles = import.meta.glob<{ default: LearningModule }>("../data/*.json");

export async function loadModule(moduleId: string): Promise<LearningModule> {
  const entry = Object.entries(moduleFiles).find(([path]) =>
    path.endsWith(`/${moduleId}.json`),
  );

  if (!entry) {
    throw new Error(`Fant ikke modul-data for moduleId "${moduleId}"`);
  }

  const [, importFn] = entry;
  const mod = await importFn();
  return mod.default;
}
