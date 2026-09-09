import type { ModuleMeta } from "../modules";
import type { UserProgress } from "../types";
import { ModuleCard, type ModuleCardStatus } from "./ModuleCard";

interface ProgressPathProps {
  modules: ModuleMeta[];
  progress: UserProgress;
  onSelectModule: (moduleId: string) => void;
  direction?: "horizontal" | "vertical";
}

function statusFor(
  moduleId: string,
  index: number,
  modules: ModuleMeta[],
  progress: UserProgress,
): ModuleCardStatus {
  if (progress.completedModuleIds.includes(moduleId)) return "completed";

  const previous = modules[index - 1];
  const isFirst = index === 0;
  const previousDone = previous
    ? progress.completedModuleIds.includes(previous.moduleId)
    : false;

  return isFirst || previousDone ? "unlocked" : "locked";
}

export function ProgressPath({
  modules,
  progress,
  onSelectModule,
  direction = "horizontal",
}: ProgressPathProps) {
  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={[
        "flex gap-6",
        isHorizontal ? "flex-row items-stretch overflow-x-auto pb-4" : "flex-col",
      ].join(" ")}
    >
      {modules.map((mod, index) => {
        const status = statusFor(mod.moduleId, index, modules, progress);
        const isLastNode = index === modules.length - 1;
        const nextCompleted =
          !isLastNode && progress.completedModuleIds.includes(mod.moduleId);

        return (
          <div
            key={mod.moduleId}
            className={[
              "flex",
              isHorizontal ? "flex-row items-center" : "flex-col items-stretch",
            ].join(" ")}
          >
            <div className={isHorizontal ? "w-56" : "w-full"}>
              <ModuleCard
                title={mod.title}
                subtitle={
                  progress.scoresByModuleId[mod.moduleId] !== undefined
                    ? `Score: ${progress.scoresByModuleId[mod.moduleId]}%`
                    : undefined
                }
                status={status}
                onClick={() => onSelectModule(mod.moduleId)}
              />
            </div>
            {!isLastNode && (
              <div
                className={
                  isHorizontal
                    ? `h-0.5 w-10 shrink-0 ${nextCompleted ? "bg-accent-from" : "bg-textMuted/20"}`
                    : `mx-auto my-1 h-8 w-0.5 ${nextCompleted ? "bg-accent-from" : "bg-textMuted/20"}`
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
