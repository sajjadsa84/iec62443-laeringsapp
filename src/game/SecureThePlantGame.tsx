import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GameCanvas } from "./engine/GameCanvas";
import { GameHUD } from "./components/GameHUD";
import { BuildMenu } from "./components/BuildMenu";
import { DebugOverlay } from "./components/DebugOverlay";
import { ComponentProfileCard } from "./components/ComponentProfileCard";
import { useGameStore, type ComponentType } from "./state/gameStore";
import { Button } from "../components/Button";
import balance from "./config/balance.json";

export function SecureThePlantGame() {
  const [selected, setSelected] = useState<ComponentType | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  // Profilkort: componentId + evt. nodeId (satt når man ser på en allerede
  // plassert komponent på brettet, som da får oppgrader/fjern-knapper).
  const [profileTarget, setProfileTarget] = useState<{ componentId: string; nodeId: string | null } | null>(null);
  const placeComponent = useGameStore((s) => s.placeComponent);
  const removeComponent = useGameStore((s) => s.removeComponent);
  const placedComponents = useGameStore((s) => s.placedComponents);
  const togglePause = useGameStore((s) => s.togglePause);
  const resetGame = useGameStore((s) => s.resetGame);
  const phase = useGameStore((s) => s.phase);
  const currentWave = useGameStore((s) => s.currentWave);
  const money = useGameStore((s) => s.money);
  const plantHealth = useGameStore((s) => s.plantHealth);
  const stats = useGameStore((s) => s.stats);

  const handlePlaceAttempt = (nodeId: string) => {
    if (!selected) return;
    placeComponent(selected, nodeId);
    setSelected(null);
  };

  const handleOpenComponentProfileOnBoard = (nodeId: string) => {
    const placed = placedComponents.find((c) => c.nodeId === nodeId);
    if (!placed) return;
    setProfileTarget({ componentId: placed.type, nodeId });
  };

  // Kort bølgevarsel som glir inn fra siden idet en ny bølge faktisk starter.
  const [waveBanner, setWaveBanner] = useState<number | null>(null);
  const lastBannerWaveRef = useRef(0);
  useEffect(() => {
    if (phase !== "wave-active" || currentWave === lastBannerWaveRef.current) return;
    lastBannerWaveRef.current = currentWave;
    setWaveBanner(currentWave);
    const timeout = setTimeout(() => setWaveBanner(null), 1800);
    return () => clearTimeout(timeout);
  }, [phase, currentWave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePause();
      } else if (event.key.toLowerCase() === "d") {
        setShowDebug((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePause]);

  const score = Math.round(
    plantHealth * balance.scoring.healthWeight +
      money * balance.scoring.moneyWeight +
      stats.attackersStopped * balance.scoring.stoppedAttackerWeight,
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-from">Secure the Plant</p>
        <h1 className="text-2xl font-bold text-text">Forsvar anlegget</h1>
        <p className="text-xs text-textMuted">Mellomrom: pause/fortsett · D: debug-panel</p>
      </div>

      <GameHUD />

      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-accent-from/20">
          <GameCanvas
            selectedComponent={selected}
            onPlaceAttempt={handlePlaceAttempt}
            onOpenComponentProfile={handleOpenComponentProfileOnBoard}
          />
        </div>

        <BuildMenu selected={selected} onOpenProfile={(componentId) => setProfileTarget({ componentId, nodeId: null })} />

        <AnimatePresence>
          {waveBanner !== null && (
            <motion.div
              key={waveBanner}
              initial={{ x: "-110%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "110%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-xl border border-accent-from/50 bg-panel/95 px-6 py-3 text-center shadow-glow"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-accent2">Innkommende</p>
              <p className="text-lg font-bold text-text">Bølge {waveBanner}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "game-over" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex flex-col items-center gap-4"
              >
                <h2 className="text-2xl font-bold text-warn">Anlegget er kompromittert</h2>
                <div className="space-y-1 text-sm text-textMuted">
                  <p>Bølger overlevd: {stats.wavesSurvived}</p>
                  <p>Angripere som slapp gjennom: {stats.attackersBreached}</p>
                  <p>Angripere stanset: {stats.attackersStopped}</p>
                </div>
                <Button onClick={resetGame}>Spill på nytt</Button>
              </motion.div>
            </motion.div>
          )}

          {phase === "victory" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex flex-col items-center gap-4"
              >
                <h2 className="text-2xl font-bold text-accent-from">Anlegget er sikret!</h2>
                <div className="space-y-1 text-sm text-textMuted">
                  <p>Poengsum: {score}</p>
                  <p>Gjenværende anleggshelse: {Math.round(plantHealth)} / 100</p>
                  <p>Ubrukte penger: {Math.floor(money)} kr</p>
                  <p>Angripere stanset: {stats.attackersStopped}</p>
                </div>
                <Button onClick={resetGame}>Spill på nytt</Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showDebug && <DebugOverlay />}

      <AnimatePresence>
        {profileTarget && (
          <ComponentProfileCard
            key={profileTarget.nodeId ?? profileTarget.componentId}
            componentId={profileTarget.componentId}
            nodeId={profileTarget.nodeId}
            onClose={() => setProfileTarget(null)}
            onSelectForPlacement={(componentId) => setSelected(componentId)}
            onRemove={removeComponent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
