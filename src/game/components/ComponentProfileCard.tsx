import { motion } from "framer-motion";
import { useGameStore, getComponent } from "../state/gameStore";
import { FR_NAMES, CATEGORY_LABELS } from "../frLabels";
import { CATEGORY_COLORS_HEX } from "../categoryColors";
import { ComponentIcon } from "./icons";

interface ComponentProfileCardProps {
  componentId: string;
  /** Satt når kortet åpnes for en allerede plassert komponent på brettet — gir oppgrader/fjern-knapper. Null når man bare blar i byggemenyen. */
  nodeId: string | null;
  onClose: () => void;
  onSelectForPlacement?: (componentId: string) => void;
  onRemove?: (nodeId: string) => void;
}

export function ComponentProfileCard({ componentId, nodeId, onClose, onSelectForPlacement, onRemove }: ComponentProfileCardProps) {
  const component = getComponent(componentId);
  const money = useGameStore((s) => s.money);
  const phase = useGameStore((s) => s.phase);
  const placed = useGameStore((s) => (nodeId ? s.placedComponents.find((c) => c.nodeId === nodeId) : undefined));
  const upgradeComponent = useGameStore((s) => s.upgradeComponent);

  const currentTier = placed?.currentTier ?? null;
  const isProductionRunning = phase === "wave-active";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-accent-from/30 bg-panel p-5 shadow-glow"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/50"
              style={{ color: CATEGORY_COLORS_HEX[component.category] }}
            >
              <ComponentIcon componentId={component.id} size={26} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-accent2">
                {CATEGORY_LABELS[component.category]}
              </p>
              <h2 className="text-lg font-bold text-text">{component.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-textMuted/20 px-2 py-1 text-xs text-textMuted hover:border-warn hover:text-warn"
          >
            Lukk
          </button>
        </div>

        <p className="mb-3 text-sm text-textMuted">{component.profileText}</p>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-md border border-accent-from/40 bg-accent-from/10 px-2 py-0.5 text-[11px] font-semibold text-accent-from">
            {component.primaryFR} — {FR_NAMES[component.primaryFR]}
          </span>
          {component.secondaryFRs.map((fr) => (
            <span key={fr} className="rounded-md border border-textMuted/20 px-2 py-0.5 text-[11px] text-textMuted">
              {fr} — {FR_NAMES[fr]}
            </span>
          ))}
        </div>

        {isProductionRunning && (
          <p className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-2 py-1 text-[11px] text-warn">
            Produksjonen pågår — stopp produksjonen (fullfør bølgen) for å endre eller oppgradere maskinvare.
          </p>
        )}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-textMuted">Oppgraderingstre</p>
        <div className="space-y-2">
          {component.upgrades.map((upgrade) => {
            const isCurrent = currentTier === upgrade.tier;
            const isPast = currentTier !== null && currentTier > upgrade.tier;
            const isNext = currentTier !== null && currentTier + 1 === upgrade.tier;
            const cost = upgrade.cost;
            const affordable = money >= cost;
            const canUpgradeNow = affordable && !isProductionRunning;

            return (
              <div
                key={upgrade.tier}
                className={`rounded-xl border-2 p-3 text-sm transition-colors ${
                  isCurrent
                    ? "border-accent-from bg-accent-from/10"
                    : isPast
                      ? "border-textMuted/10 bg-background/30 text-textMuted/60"
                      : isNext && affordable
                        ? "border-accent2/50 bg-accent2/5"
                        : "border-textMuted/10 bg-background/20 text-textMuted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-text">
                    Nivå {upgrade.tier} · {upgrade.name}
                    {isCurrent && <span className="ml-2 text-[10px] font-bold uppercase text-accent-from">Nåværende</span>}
                  </p>
                  <p className="whitespace-nowrap text-xs text-textMuted">
                    {upgrade.tier === 1 ? "Inkludert" : `${cost} kr`}
                  </p>
                </div>
                <p className="mt-1 text-xs text-textMuted">{upgrade.effectDescription}</p>

                {nodeId && isNext && (
                  <button
                    type="button"
                    disabled={!canUpgradeNow}
                    onClick={() => upgradeComponent(nodeId)}
                    className="mt-2 w-full rounded-lg bg-gradient-to-r from-accent-from to-accent-to px-3 py-1.5 text-xs font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isProductionRunning ? `Stopp produksjon først (${cost} kr)` : affordable ? `Oppgrader (${cost} kr)` : `Ikke råd (${cost} kr)`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          {nodeId && onRemove && (
            <button
              type="button"
              disabled={isProductionRunning}
              onClick={() => {
                onRemove(nodeId);
                onClose();
              }}
              className="flex-1 rounded-lg border border-warn/40 px-3 py-2 text-xs font-semibold text-warn transition-opacity hover:bg-warn/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Fjern komponent
            </button>
          )}
          {!nodeId && onSelectForPlacement && (
            <button
              type="button"
              disabled={isProductionRunning}
              onClick={() => {
                onSelectForPlacement(componentId);
                onClose();
              }}
              className="flex-1 rounded-lg bg-gradient-to-r from-accent-from to-accent-to px-3 py-2 text-xs font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isProductionRunning ? "Stopp produksjon først" : `Velg for plassering (${component.baseCost} kr)`}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
