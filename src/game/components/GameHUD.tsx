import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useGameStore } from "../state/gameStore";
import { Button } from "../../components/Button";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import balance from "../config/balance.json";

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 20.6c-.3 0-.6-.1-.8-.3-3.9-3.4-6.4-5.9-7.6-7.9-1.1-1.8-1.1-3.5-.4-4.9.7-1.4 2.1-2.3 3.7-2.3 1.4 0 2.7.7 3.5 1.9l1.6 2.3 1.6-2.3c.8-1.2 2.1-1.9 3.5-1.9 1.6 0 3 .9 3.7 2.3.7 1.4.7 3.1-.4 4.9-1.2 2-3.7 4.5-7.6 7.9-.2.2-.5.3-.8.3Z" />
    </svg>
  );
}

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.3 15c0 1 1 1.7 2.7 1.7 1.9 0 2.9-.8 2.9-1.9 0-1.3-1.2-1.7-2.9-2.1-1.6-.4-2.7-.8-2.7-2 0-1.1 1-1.9 2.7-1.9 1.6 0 2.6.6 2.7 1.6" strokeLinecap="round" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 15c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
      <path d="M3 9c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.5" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 5.5c0-.9 1-1.5 1.8-1l10 6.5c.7.5.7 1.5 0 2l-10 6.5c-.8.5-1.8-.1-1.8-1Z" />
    </svg>
  );
}

function HudStat({ icon, value, tone = "text" }: { icon: ReactNode; value: string; tone?: "accent" | "warn" | "text" }) {
  const toneClass = tone === "accent" ? "text-accent-from" : tone === "warn" ? "text-warn" : "text-text";
  return (
    <div className="flex items-center gap-1.5">
      <span className={toneClass}>{icon}</span>
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function IconButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-accent-from/30 bg-panel text-text transition-colors hover:border-accent-from disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GameHUD() {
  const money = useGameStore((s) => s.money);
  const plantHealth = useGameStore((s) => s.plantHealth);
  const animatedMoney = useAnimatedNumber(money);
  const animatedHealth = useAnimatedNumber(plantHealth, 0.5);
  const currentWave = useGameStore((s) => s.currentWave);
  const totalWaves = useGameStore((s) => s.totalWaves);
  const phase = useGameStore((s) => s.phase);
  const paused = useGameStore((s) => s.paused);
  const speed = useGameStore((s) => s.speed);
  const productionHaltRemaining = useGameStore((s) => s.productionHaltRemaining);
  const shipmentProgressSeconds = useGameStore((s) => s.shipmentProgressSeconds);
  const totalShipments = useGameStore((s) => s.totalShipments);
  const lastShipmentAmount = useGameStore((s) => s.lastShipmentAmount);
  const startProduction = useGameStore((s) => s.startProduction);
  const togglePause = useGameStore((s) => s.togglePause);
  const setSpeed = useGameStore((s) => s.setSpeed);

  const isBuilding = phase === "building";
  const canTogglePause = phase === "wave-active" || isBuilding;
  const isProducing = phase === "wave-active" && productionHaltRemaining <= 0;

  // Penger kommer i klumper når en leveranse går ut, ikke løpende — vis et
  // kort "+X kr"-glimt hver gang det skjer, så det faktisk merkes.
  const [shipFlash, setShipFlash] = useState<{ amount: number; key: number } | null>(null);
  const lastShipmentsRef = useRef(totalShipments);
  useEffect(() => {
    if (totalShipments > lastShipmentsRef.current) {
      setShipFlash({ amount: lastShipmentAmount, key: Date.now() });
    }
    lastShipmentsRef.current = totalShipments;
  }, [totalShipments, lastShipmentAmount]);

  const shipmentProgressPct = Math.min(100, (shipmentProgressSeconds / balance.production.shipmentIntervalSeconds) * 100);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-accent-from/20 bg-panel px-4 py-2">
      <div className="flex flex-wrap items-center gap-4">
        <HudStat icon={<HeartIcon className="h-4 w-4" />} value={`${Math.round(animatedHealth)}`} tone={plantHealth > 50 ? "accent" : "warn"} />

        <div className="relative">
          <HudStat icon={<CoinIcon className="h-4 w-4" />} value={`${Math.round(animatedMoney)} kr`} tone="accent" />
          {shipFlash && (
            <span
              key={shipFlash.key}
              onAnimationEnd={() => setShipFlash(null)}
              className="ship-flash absolute -top-3 left-full ml-1 whitespace-nowrap text-xs font-bold text-accent2"
            >
              +{shipFlash.amount} kr
            </span>
          )}
        </div>

        <HudStat icon={<WaveIcon className="h-4 w-4" />} value={`${currentWave} / ${totalWaves}`} />

        {!isProducing && (phase === "building" || phase === "wave-active") && (
          <span className="text-[11px] font-semibold text-warn">
            {isBuilding ? "Ombygging" : `Stans ${Math.ceil(productionHaltRemaining)}s`}
          </span>
        )}
        {isProducing && (
          <div className="h-1 w-16 overflow-hidden rounded-full bg-textMuted/20" title="Fremdrift til neste leveranse">
            <div className="h-full bg-accent2 transition-[width]" style={{ width: `${shipmentProgressPct}%` }} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <IconButton onClick={togglePause} disabled={!canTogglePause} title={paused ? "Fortsett" : "Pause"}>
          {paused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
        </IconButton>
        <IconButton onClick={() => setSpeed(speed === 1 ? 2 : 1)} title="Hastighet">
          <span className="text-xs font-bold">{speed}x</span>
        </IconButton>
        {isBuilding && (
          <Button onClick={startProduction} className="px-4 py-2 text-sm">
            Start produksjon
          </Button>
        )}
        {phase === "wave-active" && (
          <Button disabled className="px-4 py-2 text-sm">
            Produksjon pågår...
          </Button>
        )}
      </div>
    </div>
  );
}
