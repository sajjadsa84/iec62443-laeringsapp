import { useGameStore, getComponent, getFacilityLevel } from "../state/gameStore";

/** Togglbart debug-panel (tast "D") for å gjøre balansering raskere å iterere på. */
export function DebugOverlay() {
  const currentWave = useGameStore((s) => s.currentWave);
  const debug = useGameStore((s) => s.debug);

  const dpsEntries = Object.entries(debug.dpsByType).filter(([, value]) => value > 0);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 space-y-2 rounded-xl border border-accent-from/40 bg-panel/95 p-3 font-mono text-xs text-text shadow-glow">
      <p className="font-semibold uppercase tracking-wide text-accent-from">Debug (D for å skjule)</p>
      <p className={debug.fps > 0 && debug.fps < 45 ? "font-bold text-warn" : ""}>FPS: {debug.fps}</p>
      <p>Bølge: {currentWave}</p>
      <p>Anleggsnivå: {getFacilityLevel(currentWave)}</p>
      <p>Aktive angripere: {debug.activeAttackers}</p>
      <p>Total skade påført: {Math.round(debug.totalDamageDealt)}</p>
      {dpsEntries.length > 0 && (
        <div>
          <p className="text-textMuted">DPS per komponent:</p>
          {dpsEntries.map(([type, value]) => (
            <p key={type} className="pl-2">
              {getComponent(type).name}: {value.toFixed(1)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
