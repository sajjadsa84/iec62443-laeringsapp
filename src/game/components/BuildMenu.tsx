import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore, COMPONENTS, getFacilityLevel, type ComponentType } from "../state/gameStore";
import { CATEGORY_LABELS } from "../frLabels";
import { CATEGORY_COLORS_HEX } from "../categoryColors";
import { ComponentIcon } from "./icons";
import type { ComponentCategory } from "../types";

interface BuildMenuProps {
  selected: ComponentType | null;
  onOpenProfile: (componentId: string) => void;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ComponentCategory[];

/**
 * Byggemenyen er en flytende rund knapp over brettet i stedet for et fast
 * sidepanel — det sparer plass slik at hele brettet kan vises. Trykk for å
 * ekspandere kategorier/komponenter; menyen lukker seg selv idet en
 * komponent er valgt for plassering, slik at brettet blir synlig igjen.
 */
export function BuildMenu({ selected, onOpenProfile }: BuildMenuProps) {
  const money = useGameStore((s) => s.money);
  const phase = useGameStore((s) => s.phase);
  const currentWave = useGameStore((s) => s.currentWave);
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>("segmentation");
  const [isOpen, setIsOpen] = useState(false);
  const isProductionRunning = phase === "wave-active";
  const facilityLevel = getFacilityLevel(currentWave);

  const componentsInCategory = COMPONENTS.filter((c) => c.category === activeCategory);

  useEffect(() => {
    if (selected) setIsOpen(false);
  }, [selected]);

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto max-h-[70vh] w-72 space-y-3 overflow-y-auto rounded-2xl border border-textMuted/10 bg-panel p-4 shadow-glow"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Byggemeny</p>
            {isProductionRunning && (
              <p className="rounded-lg border border-warn/40 bg-warn/10 px-2 py-1 text-[11px] text-warn">
                Produksjonen pågår — maskinvare kan ikke endres før bølgen er unnagjort og produksjonen stanser.
              </p>
            )}

            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                    activeCategory === category
                      ? "bg-accent-from/20 text-accent-from"
                      : "text-textMuted hover:bg-textMuted/10"
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {componentsInCategory.map((component) => {
                const cost = component.baseCost;
                const affordable = money >= cost;
                const isSelected = selected === component.id;
                const isLocked = component.unlockedAtLevel > facilityLevel || isProductionRunning;

                return (
                  <motion.button
                    key={component.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onOpenProfile(component.id)}
                    whileHover={!isLocked && affordable ? { y: -3, boxShadow: "0 8px 24px 0 rgba(47, 232, 176, 0.25)" } : undefined}
                    whileTap={!isLocked ? { y: 0 } : undefined}
                    transition={{ duration: 0.15 }}
                    className={`w-full rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors ${
                      isLocked
                        ? "cursor-not-allowed border-textMuted/10 bg-background/40 text-textMuted/40 grayscale"
                        : !affordable
                          ? "cursor-pointer border-textMuted/10 bg-background/40 text-textMuted/50"
                          : isSelected
                            ? "border-accent-from bg-accent-from/10 text-text"
                            : "border-textMuted/20 text-text hover:border-accent-from/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-0.5 shrink-0"
                        style={{ color: component.unlockedAtLevel > facilityLevel ? undefined : CATEGORY_COLORS_HEX[component.category] }}
                      >
                        <ComponentIcon componentId={component.id} size={22} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {component.unlockedAtLevel > facilityLevel && <span className="mr-1">🔒</span>}
                          {component.name}
                        </p>
                        {component.unlockedAtLevel > facilityLevel ? (
                          <p className="text-xs text-textMuted/60">Låses opp på nivå {component.unlockedAtLevel}</p>
                        ) : (
                          <p className={`text-xs ${affordable ? "text-textMuted" : "text-warn/70"}`}>
                            {cost} kr {!affordable && <span> · ikke råd</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {selected && (
              <p className="text-xs text-accent2">
                Klikk på en ledig byggeplass i brettet for å plassere valgt komponent.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        title="Byggemeny"
        className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border-2 text-2xl font-bold shadow-glow transition-colors ${
          isOpen
            ? "border-textMuted/40 bg-panel text-textMuted"
            : "border-accent-from bg-gradient-to-br from-accent-from to-accent2 text-background"
        }`}
      >
        {isOpen ? "×" : "+"}
      </motion.button>
    </div>
  );
}
