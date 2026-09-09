import type { ReactNode } from "react";

export type ModuleCardStatus = "locked" | "unlocked" | "completed";

interface ModuleCardProps {
  title: string;
  subtitle?: string;
  status: ModuleCardStatus;
  onClick?: () => void;
  icon?: ReactNode;
}

export function ModuleCard({ title, subtitle, status, onClick, icon }: ModuleCardProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  return (
    <button
      type="button"
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      className={[
        "w-full min-w-[180px] rounded-2xl border p-5 text-left transition-all duration-200",
        "bg-panel",
        isLocked
          ? "border-textMuted/10 opacity-40 grayscale cursor-not-allowed"
          : "border-accent-from/40 hover:border-accent-from hover:shadow-glow hover:-translate-y-0.5 cursor-pointer",
        isCompleted ? "shadow-glowSm" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          <p className="font-semibold text-text">{title}</p>
          {subtitle && <p className="text-sm text-textMuted">{subtitle}</p>}
        </div>
        {isCompleted && (
          <span className="ml-auto rounded-full bg-gradient-to-r from-accent-from to-accent-to px-2 py-0.5 text-xs font-bold text-background">
            ✓
          </span>
        )}
        {isLocked && <span className="ml-auto text-textMuted">🔒</span>}
      </div>
    </button>
  );
}
