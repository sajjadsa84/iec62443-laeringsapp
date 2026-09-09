import { useCallback, useEffect, useRef, useState } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication } from "pixi.js";
import { Graphics } from "pixi.js";
import { GameLoop } from "./gameLoop";
import { RANGE_UNIT_PX } from "./entities/DefenseNode";
import boardConfig from "../config/board.json";
import balanceConfig from "../config/balance.json";
import { useGameStore, computeRefund, getComponent, type ComponentType } from "../state/gameStore";

interface GameCanvasProps {
  selectedComponent: ComponentType | null;
  onPlaceAttempt: (nodeId: string) => void;
  onOpenComponentProfile: (nodeId: string) => void;
}

function hexToNumber(hex: string): number {
  return Number(hex.replace("#", "0x"));
}

const TARGET_COLOR = 0xff3b3b;

/** Tegner en enkel, distinkt silhuett per enhetstype på selve målnoden. */
function drawDeviceIcon(board: Graphics, x: number, y: number, deviceType: string): void {
  if (deviceType === "hmi") {
    // Skjerm/panel: rektangel med en tynn "bezel"-linje nær toppen.
    board.roundRect(x - 7, y - 6, 14, 12, 1.5).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.rect(x - 5, y - 3.5, 10, 1.4).fill({ color: 0x0a0e27, alpha: 0.9 });
  } else if (deviceType === "historian") {
    // Database-sylinder: to "bånd" og sideliner.
    board.ellipse(x, y - 6, 7, 2.4).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.rect(x - 7, y - 6, 14, 10).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.ellipse(x, y + 4, 7, 2.4).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.ellipse(x, y, 7, 2.2).stroke({ width: 1, color: 0x0a0e27, alpha: 0.6 });
  } else if (deviceType === "safety") {
    // Åttekant (stoppskilt) — nødstoppsystem, en sikkerhetsfunksjon som skiller seg tydelig ut.
    const r = 8;
    const points: number[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 8) + (i * Math.PI) / 4;
      points.push(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    board.poly(points).fill({ color: TARGET_COLOR, alpha: 0.95 });
    board.rect(x - 4, y - 1.2, 8, 2.4).fill({ color: 0x0a0e27, alpha: 0.9 });
  } else if (deviceType === "engineering") {
    // Ingeniørstasjon: skjerm på fot pluss et tastatur under.
    board.roundRect(x - 7, y - 8, 14, 9, 1.2).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.roundRect(x - 8, y + 3, 16, 3, 1).fill({ color: TARGET_COLOR, alpha: 0.7 });
  } else if (deviceType === "mobile") {
    // Nettbrett/AGV: avrundet rektangel med et lite "hjul"-punkt under.
    board.roundRect(x - 6, y - 8, 12, 14, 2.5).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.circle(x, y - 1, 1.3).fill({ color: 0x0a0e27, alpha: 0.9 });
  } else {
    // PLC (standard): kompakt modulboks med tre terminal-"pinner" under.
    board.roundRect(x - 6, y - 7, 12, 9, 1.5).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.rect(x - 4, y + 2, 1.6, 3.5).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.rect(x - 0.8, y + 2, 1.6, 3.5).fill({ color: TARGET_COLOR, alpha: 0.9 });
    board.rect(x + 2.4, y + 2, 1.6, 3.5).fill({ color: TARGET_COLOR, alpha: 0.9 });
  }
}

const WLAN_COLOR = 0x18a6e0;
const IOT_COLOR = 0xffb020;
const DATACENTER_COLOR = 0x6b6fe0;

/** Tegner en distinkt silhuett for de nye, navngitte knutepunkt-typene (WLAN-AP, IoT-gateway, datasenter). */
function drawSpecialNodeIcon(board: Graphics, x: number, y: number, kind: string): void {
  if (kind === "wlan") {
    // WLAN-aksesspunkt: senterpunkt med konsentriske signal-buer.
    board.circle(x, y, 2.2).fill({ color: WLAN_COLOR, alpha: 0.95 });
    // `arc()` oppfører seg som i Canvas 2D: uten en `moveTo()` til buens eget
    // startpunkt først, tegner den en usynlig rett linje dit fra hvor "pennen"
    // sist stod — som her kunne være et helt annet sted på brettet, og
    // dukket opp som en lang, feilaktig diagonal linje på tvers av hele brettet.
    board.moveTo(x - 7, y).arc(x, y, 7, Math.PI, 0).stroke({ width: 1.8, color: WLAN_COLOR, alpha: 0.8 });
    board.moveTo(x - 12, y).arc(x, y, 12, Math.PI, 0).stroke({ width: 1.8, color: WLAN_COLOR, alpha: 0.5 });
  } else if (kind === "iot") {
    // IoT-/edge-gateway: liten brikke med radiell stråling — i varselfarge, siden den er den farligste snarveien.
    board.roundRect(x - 7, y - 7, 14, 14, 3).fill({ color: IOT_COLOR, alpha: 0.9 });
    for (const angle of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
      board
        .moveTo(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8)
        .lineTo(x + Math.cos(angle) * 13, y + Math.sin(angle) * 13)
        .stroke({ width: 1.8, color: IOT_COLOR, alpha: 0.7 });
    }
  } else if (kind === "datacenter") {
    // Industrielt datasenter: stablet server-rack.
    for (const offsetY of [-8, -1, 6]) {
      board.roundRect(x - 11, y + offsetY, 22, 6, 1).fill({ color: DATACENTER_COLOR, alpha: 0.85 });
      board.circle(x + 7, y + offsetY + 3, 1).fill({ color: 0x0a0e27, alpha: 0.9 });
    }
  }
}

/**
 * Monterer en Pixi Application via @pixi/react. All faktisk spillogikk
 * (angripere, forsvarsnoder, kollisjoner) lever i GameLoop som ren Pixi —
 * denne komponenten kobler bare React/zustand-siden til den.
 */
export function GameCanvas({ selectedComponent, onPlaceAttempt, onOpenComponentProfile }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);

  // Skalerer hele brettet ned for å alltid få plass i tilgjengelig bredde —
  // et 1320px bredt brett ble tidligere kuttet av på vanlige skjermer. Skala
  // begrenses til maks 1 (aldri opp-skalert forbi native oppløsning).
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const updateScale = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setScale(Math.min(1, width / boardConfig.boardWidth));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const placedComponents = useGameStore((s) => s.placedComponents);
  const phase = useGameStore((s) => s.phase);
  const currentWave = useGameStore((s) => s.currentWave);
  const plantHealth = useGameStore((s) => s.plantHealth);
  const resetNonce = useGameStore((s) => s.resetNonce);
  const lastStartedWaveRef = useRef(0);
  const previousHealthRef = useRef(plantHealth);
  const shakeRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const handleInit = useCallback((app: PixiApplication) => {
    if (gameLoopRef.current) {
      gameLoopRef.current.destroy();
      gameLoopRef.current = null;
    }

    // Hver "lag" tegnes i sin egen Graphics-kontekst i stedet for én delt
    // kontekst for hele brettet — å kjede svært mange små former (avrundede
    // rektangler, sirkler, alpha < 1) i ÉN Graphics ga en synlig, feilaktig
    // diagonal linje på tvers av brettet (en Pixi-triangulerings-/batch-artefakt),
    // som forsvant helt idet lagene ble delt opp slik.
    const zonesLayer = new Graphics();
    const ZONE_RADIUS = 16;
    const ZONE_GAP = 4;
    for (const zone of boardConfig.zones) {
      const color = hexToNumber(zone.color);
      const rx = zone.x + 2;
      const ry = zone.y + ZONE_GAP / 2;
      const rw = zone.width - 4;
      const rh = zone.height - ZONE_GAP;

      // Myk ytre glød: et par konsentriske, avrundede kanter med lav alpha i
      // stedet for et ekte GPU-blur-filter — like leselig, men uten den
      // løpende render-kostnaden et filter på fire statiske former ville gitt.
      for (const inset of [9, 4]) {
        zonesLayer
          .roundRect(rx - inset, ry - inset, rw + inset * 2, rh + inset * 2, ZONE_RADIUS + inset)
          .fill({ color: 0x2fe8b0, alpha: 0.025 });
      }
      zonesLayer.roundRect(rx, ry, rw, rh, ZONE_RADIUS).fill({ color, alpha: 0.9 });
      zonesLayer.roundRect(rx, ry, rw, rh, ZONE_RADIUS).stroke({ width: 1.5, color: 0x2fe8b0, alpha: 0.3 });
    }

    const nodesLayer = new Graphics();
    const nodes = boardConfig.nodes as Record<string, { x: number; y: number }>;
    const specialNodeTypes = boardConfig.specialNodeTypes as Record<string, string>;
    // Junction-noder (der grener møtes/deler seg) markeres tydelig. Selve
    // conduit-linjene (gradient + animerte datapakker) tegnes av GameLoop,
    // siden de trenger å oppdateres hvert eneste frame.
    for (const [nodeId, node] of Object.entries(nodes)) {
      if (specialNodeTypes[nodeId]) {
        drawSpecialNodeIcon(nodesLayer, node.x, node.y, specialNodeTypes[nodeId]);
      } else {
        nodesLayer.circle(node.x, node.y, 4).fill({ color: 0x2fe8b0, alpha: 0.6 });
      }
    }

    const entryLayer = new Graphics();
    for (const entry of boardConfig.entryPoints) {
      const start = nodes[entry.startNode];
      entryLayer.circle(start.x + entry.offsetX, start.y + entry.offsetY, 5).fill({ color: 0xffb020, alpha: 0.95 });
    }

    const targetLayer = new Graphics();
    for (const targetId of boardConfig.targetNodeIds) {
      const target = nodes[targetId];
      const deviceType = boardConfig.targetDeviceTypes[targetId as keyof typeof boardConfig.targetDeviceTypes];
      drawDeviceIcon(targetLayer, target.x, target.y, deviceType);
    }
    app.stage.addChild(zonesLayer, nodesLayer, entryLayer, targetLayer);

    gameLoopRef.current = new GameLoop(app, boardConfig);
    gameLoopRef.current.syncDefenses(useGameStore.getState().placedComponents);
  }, []);

  useEffect(() => {
    return () => {
      gameLoopRef.current?.destroy();
      gameLoopRef.current = null;
    };
  }, []);

  useEffect(() => {
    gameLoopRef.current?.syncDefenses(placedComponents);
  }, [placedComponents]);

  useEffect(() => {
    if (phase !== "wave-active" || currentWave === lastStartedWaveRef.current) return;
    lastStartedWaveRef.current = currentWave;

    const waveConfig = balanceConfig.waves[currentWave - 1];
    if (waveConfig) gameLoopRef.current?.startWave(waveConfig);
  }, [phase, currentWave]);

  // Ved "Spill på nytt" rydder vi hele Pixi-tilstanden — placedComponents blir
  // tom uansett, men resetBoard() fjerner i tillegg angripere som var midt i bølgen.
  const isFirstResetRef = useRef(true);
  useEffect(() => {
    if (isFirstResetRef.current) {
      isFirstResetRef.current = false;
      return;
    }
    gameLoopRef.current?.resetBoard();
    lastStartedWaveRef.current = 0;
  }, [resetNonce]);

  // Skjermrist + rødt blink når anleggshelsen synker. Animasjonene retriggres
  // ved å fjerne/legge til klassen med en tvungen reflow imellom — å bruke en
  // React-key her ville i stedet remontert hele <Application> (og dermed
  // ødelagt/gjenskapt hele Pixi-spillet) for hver eneste skade som tas.
  useEffect(() => {
    if (plantHealth < previousHealthRef.current) {
      for (const el of [shakeRef.current, flashRef.current]) {
        if (!el) continue;
        el.classList.remove("screen-shake", "red-flash");
        void el.offsetWidth;
        el.classList.add(el === shakeRef.current ? "screen-shake" : "red-flash");
      }
    }
    previousHealthRef.current = plantHealth;
  }, [plantHealth]);

  return (
    <div ref={viewportRef} className="w-full" style={{ height: boardConfig.boardHeight * scale }}>
      <div
        style={{
          width: boardConfig.boardWidth,
          height: boardConfig.boardHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          ref={shakeRef}
          style={{ width: boardConfig.boardWidth, height: boardConfig.boardHeight, position: "relative" }}
        >
          <div ref={containerRef} className="relative h-full w-full">
            <Application
              width={boardConfig.boardWidth}
          height={boardConfig.boardHeight}
          resizeTo={containerRef}
          background={0x0a0e27}
          onInit={handleInit}
        />
        <div className="pointer-events-none absolute inset-0">
          {boardConfig.zones.map((zone) => (
            <div
              key={zone.id}
              className="absolute left-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted"
              style={{ top: zone.y + 8 }}
            >
              {zone.label}
            </div>
          ))}

          {boardConfig.entryPoints.map((entry) => {
            const start = boardConfig.nodes[entry.startNode as keyof typeof boardConfig.nodes];
            const x = start.x + entry.offsetX;
            const y = start.y + entry.offsetY;
            const onRight = x < boardConfig.boardWidth / 2;
            return (
              <div
                key={entry.id}
                className={`absolute -translate-y-1/2 whitespace-nowrap rounded-md border border-accent2/40 bg-panel/80 px-1.5 py-0.5 text-[9px] font-semibold text-accent2 ${onRight ? "" : "-translate-x-full"}`}
                style={{ left: onRight ? x + 10 : x - 10, top: y }}
              >
                {entry.label}
              </div>
            );
          })}

          {boardConfig.buildSlots.map((slot) => {
            const occupant = placedComponents.find((c) => c.nodeId === slot.id);
            const kindMatches = selectedComponent !== null && getComponent(selectedComponent).placementKind === slot.kind;
            const canPlaceHere = !occupant && kindMatches;
            const previewRangePx = canPlaceHere ? getComponent(selectedComponent!).range * RANGE_UNIT_PX : 0;

            return (
              <div key={slot.id} className="absolute" style={{ left: slot.x, top: slot.y }}>
                {canPlaceHere && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-from/50 bg-accent-from/10"
                    style={{ width: previewRangePx * 2, height: previewRangePx * 2 }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => (occupant ? onOpenComponentProfile(slot.id) : onPlaceAttempt(slot.id))}
                  title={
                    occupant
                      ? `${getComponent(occupant.type).name} (nivå ${occupant.currentTier}) — klikk for info/oppgradering (refusjon nå: ${computeRefund(occupant.totalPaid, occupant.ageSeconds)} kr)`
                      : "Ledig byggeplass"
                  }
                  className={`pointer-events-auto absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-2 transition-colors ${
                    slot.kind === "edge" ? "rounded-md" : "rounded-full"
                  } ${
                    occupant
                      ? occupant.installRemaining > 0
                        ? "animate-pulse border-warn/70 bg-warn/20"
                        : "border-accent-from/60 bg-transparent hover:border-warn hover:bg-warn/20"
                      : canPlaceHere
                        ? "border-accent-from bg-accent-from/30 hover:bg-accent-from/40 animate-pulse"
                        : "border-textMuted/40 bg-panel/60 hover:border-textMuted/70"
                  }`}
                />
              </div>
            );
          })}

          {boardConfig.targetNodeIds.map((targetId) => {
            const target = boardConfig.nodes[targetId as keyof typeof boardConfig.nodes];
            const label = boardConfig.targetLabels[targetId as keyof typeof boardConfig.targetLabels];
            return (
              <div
                key={targetId}
                className="absolute -translate-x-1/2 -translate-y-full rounded-md border border-warn/50 bg-warn/10 px-2 py-1 text-[10px] font-semibold text-warn"
                style={{ left: target.x, top: target.y - 22 }}
              >
                {label}
              </div>
            );
          })}
          </div>
          </div>
          <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-warn opacity-0" />
        </div>
      </div>
    </div>
  );
}
