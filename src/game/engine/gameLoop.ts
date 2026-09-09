import { Container, Graphics, type Application, type Ticker } from "pixi.js";
import { Attacker } from "./entities/Attacker";
import { DefenseNode } from "./entities/DefenseNode";
import { FloatingText } from "./entities/FloatingText";
import { Conduit } from "./entities/Conduit";
import { ParticlePool } from "./entities/ParticlePool";
import { Background } from "./entities/Background";
import { ZoneAmbience } from "./entities/ZoneAmbience";
import { buildDefenseAwarePath, buildEdgeRoute, type TopologyGraph } from "./topology";
import { useGameStore, type PlacedComponent } from "../state/gameStore";
import balance from "../config/balance.json";

interface WaveConfig {
  attackerCount: number;
  attackerSpeed: number;
  attackerHealth: number;
  spawnIntervalMs: number;
  /** Hvilke inngangspunkter denne bølgen kan angripe fra — trukket tilfeldig per angriper. */
  entryPointIds: string[];
}

interface EntryPoint {
  id: string;
  startNode: string;
}

interface BuildSlot {
  id: string;
  x: number;
  y: number;
  /** Hvilken grafnode denne byggeplassen faktisk beskytter — brukes til å slå opp forsvarsstyrke i stifinningen. */
  nodeRef: string;
}

interface BoardConfig extends TopologyGraph {
  boardWidth: number;
  boardHeight: number;
  entryPoints: EntryPoint[];
  targetNodeIds: string[];
  buildSlots: BuildSlot[];
  shortcutEdges?: string[][];
}

/** Konverterer en plassert komponents styrke til en Dijkstra-"straff" — sterkere forsvar gjør ruten dyrere å velge. */
const DAMAGE_PATH_PENALTY_SCALE = 3;
const SLOW_PATH_PENALTY_SCALE = 300;

/** Hvor ofte zustand-tick (og debug-snapshot) faktisk kalles, uavhengig av frame-raten. */
const STORE_TICK_INTERVAL_SECONDS = 0.25;

/**
 * Maks delta-tid vi noensinne simulerer i ett steg. Uten dette vil en fane som
 * har vært i bakgrunnen (nettleseren strupar da requestAnimationFrame) levere
 * ett enkelt kjempestort delta når fanen blir aktiv igjen, og spillet ville
 * "spole fremover" i stedet for å bare fortsette normalt.
 */
const MAX_DELTA_SECONDS = 0.1;

const BLOCKED_TEXT_COLOR = 0xff8080;
const BREACH_TEXT_COLOR = 0xff3b3b;
const FLASH_DURATION_MS = 150;

/** Hvor nærme en conduit-linje en angriper må være for at den regnes som "under angrep" akkurat nå. */
const CONDUIT_ATTACK_THRESHOLD_PX = 16;

interface FlashLine {
  view: Graphics;
  elapsedMs: number;
}

/**
 * Hovedløkka for spillet, drevet av Pixi sin egen ticker. Eier de "levende"
 * spillobjektene (angripere, forsvarsnoder, conduits, partikler, svevetekst)
 * direkte som Pixi-objekter — dette laget er bevisst IKKE i zustand, siden
 * det endres opp mot 60 ganger i sekundet. zustand-actions kalles kun ved
 * bølgeslutt/plantskade/statistikk og i et strupet intervall for økonomi +
 * debug-snapshot (se STORE_TICK_INTERVAL_SECONDS).
 */
export class GameLoop {
  private readonly app: Application;
  private readonly board: BoardConfig;
  private readonly background: Background;
  private readonly layer = new Container();
  private readonly particles = new ParticlePool();
  private readonly ambience: ZoneAmbience;

  private attackers: Attacker[] = [];
  private readonly defenseNodes = new Map<string, DefenseNode>();
  private readonly conduits: Conduit[] = [];
  private readonly resolvedPairs = new Set<string>();
  private floatingTexts: FloatingText[] = [];
  private flashLines: FlashLine[] = [];

  private currentWaveConfig: WaveConfig | null = null;
  private attackersLeftToSpawn = 0;
  private spawnTimerMs = 0;
  private waveActive = false;

  private storeTickAccumulator = 0;
  private damageAccumulator: Record<string, number> = {};
  private totalDamageDealt = 0;

  constructor(app: Application, board: BoardConfig) {
    this.app = app;
    this.board = board;

    this.background = new Background(board.boardWidth, board.boardHeight);
    this.app.stage.addChild(this.background.view);
    this.app.stage.addChild(this.layer);
    this.app.stage.addChild(this.particles.view);

    const machineNodes = board.targetNodeIds.map((id) => board.nodes[id]).filter(Boolean);
    this.ambience = new ZoneAmbience(board.boardWidth, machineNodes, this.particles);
    // Legges til FØRST i laget slik at dekorasjoner tegnes bak conduits og
    // forsvarsnoder, som en slags "bakke"-detalj under selve nettverket.
    this.layer.addChild(this.ambience.view);

    const shortcutKeys = new Set((board.shortcutEdges ?? []).map(([f, t]) => `${f}:${t}`));
    const allEdges = [...board.edges, ...(board.ringEdges ?? [])];
    for (const [fromId, toId] of allEdges) {
      const path = buildEdgeRoute(board.nodes[fromId], board.nodes[toId]);
      const isShortcut = shortcutKeys.has(`${fromId}:${toId}`) || shortcutKeys.has(`${toId}:${fromId}`);
      const conduit = new Conduit(path, isShortcut ? "shortcut" : "normal");
      this.conduits.push(conduit);
      this.layer.addChild(conduit.view);
    }

    this.app.ticker.add(this.onTick);
  }

  startWave(waveConfig: WaveConfig): void {
    this.currentWaveConfig = waveConfig;
    this.attackersLeftToSpawn = waveConfig.attackerCount;
    this.spawnTimerMs = waveConfig.spawnIntervalMs;
    this.waveActive = true;
  }

  /** Synkroniserer live forsvarsnoder mot zustand sin (lette) placedComponents-liste, begge veier. */
  syncDefenses(placedComponents: PlacedComponent[]): void {
    const activeNodeIds = new Set(placedComponents.map((c) => c.nodeId));

    for (const [nodeId, node] of this.defenseNodes) {
      if (activeNodeIds.has(nodeId)) continue;
      node.destroy();
      this.defenseNodes.delete(nodeId);
    }

    for (const placed of placedComponents) {
      let node = this.defenseNodes.get(placed.nodeId);
      if (!node) {
        const slot = this.board.buildSlots.find((s) => s.id === placed.nodeId);
        if (!slot) continue;
        node = new DefenseNode(placed.nodeId, placed.type, slot.x, slot.y, placed.currentTier);
        this.defenseNodes.set(placed.nodeId, node);
        this.layer.addChild(node.view);
      } else {
        node.setTier(placed.currentTier);
      }
      node.setInstalling(placed.installRemaining > 0);
      if (placed.installRemaining > 0) {
        node.setInstallProgress(1 - placed.installRemaining / balance.installation.installDelaySeconds);
      }
    }
  }

  /** Fjerner alt levende spillinnhold — brukt ved "Spill på nytt". */
  resetBoard(): void {
    for (const attacker of this.attackers) attacker.destroy();
    this.attackers = [];
    for (const node of this.defenseNodes.values()) node.destroy();
    this.defenseNodes.clear();
    for (const text of this.floatingTexts) text.destroy();
    this.floatingTexts = [];
    for (const flash of this.flashLines) flash.view.destroy();
    this.flashLines = [];
    for (const conduit of this.conduits) conduit.setUnderAttack(false);

    this.resolvedPairs.clear();
    this.currentWaveConfig = null;
    this.attackersLeftToSpawn = 0;
    this.spawnTimerMs = 0;
    this.waveActive = false;
    this.storeTickAccumulator = 0;
    this.damageAccumulator = {};
    this.totalDamageDealt = 0;
  }

  destroy(): void {
    this.app.ticker.remove(this.onTick);
    this.resetBoard();
    for (const conduit of this.conduits) conduit.destroy();
    this.conduits.length = 0;
    this.ambience.destroy();
    this.background.destroy();
    this.particles.destroy();
    this.layer.destroy({ children: true });
  }

  private onTick = (ticker: Ticker): void => {
    const { paused, speed } = useGameStore.getState();
    this.background.update(Math.min(ticker.deltaMS / 1000, MAX_DELTA_SECONDS));
    if (paused) return;

    const deltaSeconds = Math.min(ticker.deltaMS / 1000, MAX_DELTA_SECONDS) * speed;
    this.ambience.update(deltaSeconds, this.board.boardWidth);
    this.updateSpawning(deltaSeconds);
    this.updateAttackers(deltaSeconds);
    this.updateThreatStates();
    this.updateDefenseNodes(deltaSeconds);
    this.updateConduits(deltaSeconds);
    this.particles.update(deltaSeconds * 1000);
    this.updateFloatingTexts(deltaSeconds * 1000);
    this.updateFlashLines(deltaSeconds * 1000);
    this.updateStoreTick(deltaSeconds);
  };

  private updateSpawning(deltaSeconds: number): void {
    if (!this.waveActive || !this.currentWaveConfig || this.attackersLeftToSpawn <= 0) return;

    this.spawnTimerMs += deltaSeconds * 1000;
    if (this.spawnTimerMs >= this.currentWaveConfig.spawnIntervalMs) {
      this.spawnTimerMs = 0;
      this.spawnAttacker(this.currentWaveConfig);
      this.attackersLeftToSpawn--;
    }
  }

  private spawnAttacker(waveConfig: WaveConfig): void {
    const entry = this.pickEntryPoint(waveConfig.entryPointIds);
    // Grafen har ringer (flere mulige ruter), så angriperen regner seg fram
    // til det billigste målet — "billig" er avstand PLUSS en straff for
    // forsvar som faktisk står i veien akkurat nå. Med redundans i produksjon/
    // celle-lag betyr det at et tungt forsvart parti rutes rundt i stedet for
    // å bli den eneste veien fram.
    const path = buildDefenseAwarePath(entry.startNode, this.board, this.board.targetNodeIds, this.buildEdgeCost);
    const attacker = new Attacker({
      path,
      speed: waveConfig.attackerSpeed,
      health: waveConfig.attackerHealth,
    });
    this.attackers.push(attacker);
    this.layer.addChild(attacker.view);
  }

  /** Straffen Dijkstra legger på en kant basert på hvor sterkt forsvaret er ved noden man ankommer. */
  private buildEdgeCost = (_fromId: string, toId: string, distancePx: number): number => {
    const slot = this.board.buildSlots.find((s) => s.nodeRef === toId);
    if (!slot) return distancePx;
    const node = this.defenseNodes.get(slot.id);
    if (!node || node.isInstalling) return distancePx;

    const penalty =
      node.damagePerSecond > 0
        ? node.damagePerSecond * DAMAGE_PATH_PENALTY_SCALE
        : (1 - node.slowFactor) * SLOW_PATH_PENALTY_SCALE;
    return distancePx + penalty;
  };

  /** Angrepet kommer ikke fra ett fast sted i fast rekkefølge — trekker tilfeldig blant bølgens aktive innganger. */
  private pickEntryPoint(entryPointIds: string[]): EntryPoint {
    const id = entryPointIds[Math.floor(Math.random() * entryPointIds.length)];
    return this.board.entryPoints.find((e) => e.id === id) ?? this.board.entryPoints[0];
  }

  private updateAttackers(deltaSeconds: number): void {
    for (const attacker of this.attackers) {
      const wasActive = !attacker.isDead && !attacker.reachedTarget;

      attacker.update(deltaSeconds);

      if (wasActive) {
        const wasDeadBefore = attacker.isDead;
        this.checkDefenseEncounters(attacker, deltaSeconds);
        if (!wasDeadBefore && attacker.isDead) {
          useGameStore.getState().recordAttackerStopped();
          this.spawnFloatingText("Blokkert!", attacker.view.x, attacker.view.y - 24, BLOCKED_TEXT_COLOR);
        }
        if (attacker.reachedTarget) {
          useGameStore.getState().recordAttackerBreached();
          useGameStore.getState().damagePlant(balance.plantDamagePerBreach);
          this.spawnFloatingText(`-${balance.plantDamagePerBreach}`, attacker.view.x, attacker.view.y - 24, BREACH_TEXT_COLOR);
          this.particles.burst(attacker.view.x, attacker.view.y, BREACH_TEXT_COLOR, 8, 70, 400);
        }
      }
    }

    const stillAlive: Attacker[] = [];
    for (const attacker of this.attackers) {
      if (attacker.isRemovable) {
        attacker.destroy();
      } else {
        stillAlive.push(attacker);
      }
    }
    this.attackers = stillAlive;

    if (this.waveActive && this.attackersLeftToSpawn <= 0 && this.attackers.length === 0) {
      this.waveActive = false;
      this.currentWaveConfig = null;
      useGameStore.getState().endWave();
    }
  }

  private checkDefenseEncounters(attacker: Attacker, deltaSeconds: number): void {
    for (const node of this.defenseNodes.values()) {
      if (node.isInstalling) continue;

      // Ekte 2D-avstand siden brettet nå er en forgrenet graf (ulik x per
      // node) — en ren y-sjekk ville feilaktig latt en node i én gren treffe
      // angripere i en helt annen gren så lenge de var i samme høyde.
      const distance = Math.hypot(attacker.view.x - node.x, attacker.view.y - node.y);
      if (distance > node.rangePx) continue;

      // Komponentens gjeldende oppgraderingsnivå avgjør om den bremser
      // (slowFactor < 1, f.eks. VLAN-segmentering) eller skader (damagePerSecond > 0).
      if (node.slowFactor < 1) {
        const pairKey = `${attacker.uid}:${node.id}`;
        if (this.resolvedPairs.has(pairKey)) continue;
        this.resolvedPairs.add(pairKey);
        attacker.speed *= node.slowFactor;
        node.triggerFire();
        this.spawnHitFlash(node.x, node.y, attacker.view.x, attacker.view.y, 0x6b6fe0);
        continue;
      }

      if (node.damagePerSecond <= 0) continue;
      const damage = node.damagePerSecond * deltaSeconds;
      attacker.takeDamage(damage);
      this.damageAccumulator[node.type] = (this.damageAccumulator[node.type] ?? 0) + damage;
      this.totalDamageDealt += damage;
      node.triggerFire();

      if (attacker.isDead) {
        this.spawnHitFlash(node.x, node.y, attacker.view.x, attacker.view.y, 0x2fe8b0);
        this.particles.burst(attacker.view.x, attacker.view.y, 0xff8080, 10, 95, 380);
        this.flashNearestConduit(attacker.view.x, attacker.view.y);
        break;
      }
    }
  }

  private updateDefenseNodes(deltaSeconds: number): void {
    for (const node of this.defenseNodes.values()) node.update(deltaSeconds);
  }

  /** Beregner idle/alert/engaging/overwhelmed for hver forsvarskomponent ut fra faktisk angriper-nærhet. */
  private updateThreatStates(): void {
    const aliveAttackers = this.attackers.filter((a) => !a.isDead && !a.reachedTarget);
    for (const node of this.defenseNodes.values()) {
      if (node.isInstalling) continue;
      let nearestDistance = Infinity;
      let countInRange = 0;
      for (const attacker of aliveAttackers) {
        const distance = Math.hypot(attacker.view.x - node.x, attacker.view.y - node.y);
        if (distance < nearestDistance) nearestDistance = distance;
        if (distance <= node.rangePx) countInRange++;
      }
      node.setThreatState(nearestDistance, countInRange);
    }
  }

  /** Merker hvilke conduits en angriper faktisk beveger seg langs akkurat nå, så de kan lyse korallrødt. */
  private updateConduits(deltaSeconds: number): void {
    const activePositions = this.attackers
      .filter((a) => !a.isDead && !a.reachedTarget)
      .map((a) => ({ x: a.view.x, y: a.view.y }));

    for (const conduit of this.conduits) {
      const underAttack = activePositions.some((point) => conduit.isNear(point, CONDUIT_ATTACK_THRESHOLD_PX));
      conduit.setUnderAttack(underAttack);
      conduit.update(deltaSeconds);
    }
  }

  /** Finner conduiten nærmest et stoppet angrep og lar den blinke kort stiplet grå — "blokkert her". */
  private flashNearestConduit(x: number, y: number): void {
    let nearest: Conduit | null = null;
    let nearestDistance = Infinity;
    for (const conduit of this.conduits) {
      const distance = conduit.distanceTo({ x, y });
      if (distance > CONDUIT_ATTACK_THRESHOLD_PX * 3) continue;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = conduit;
      }
    }
    nearest?.flashBlocked();
  }

  private spawnFloatingText(text: string, x: number, y: number, color: number): void {
    const floatingText = new FloatingText(text, x, y, color);
    this.floatingTexts.push(floatingText);
    this.layer.addChild(floatingText.view);
  }

  private spawnHitFlash(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const view = new Graphics().moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 2, color, alpha: 0.85 });
    this.layer.addChild(view);
    this.flashLines.push({ view, elapsedMs: 0 });
  }

  private updateFlashLines(deltaMs: number): void {
    const remaining: FlashLine[] = [];
    for (const flash of this.flashLines) {
      flash.elapsedMs += deltaMs;
      if (flash.elapsedMs >= FLASH_DURATION_MS) {
        flash.view.destroy();
        continue;
      }
      flash.view.alpha = 1 - flash.elapsedMs / FLASH_DURATION_MS;
      remaining.push(flash);
    }
    this.flashLines = remaining;
  }

  private updateFloatingTexts(deltaMs: number): void {
    for (const text of this.floatingTexts) text.update(deltaMs);
    const remaining: FloatingText[] = [];
    for (const text of this.floatingTexts) {
      if (text.isRemovable) {
        text.destroy();
      } else {
        remaining.push(text);
      }
    }
    this.floatingTexts = remaining;
  }

  private updateStoreTick(deltaSeconds: number): void {
    this.storeTickAccumulator += deltaSeconds;
    if (this.storeTickAccumulator >= STORE_TICK_INTERVAL_SECONDS) {
      const interval = this.storeTickAccumulator;
      useGameStore.getState().tick(interval);

      const activeAttackers = this.attackers.filter((a) => !a.isDead && !a.reachedTarget).length;
      const dpsByType: Record<string, number> = {};
      for (const [type, damage] of Object.entries(this.damageAccumulator)) {
        dpsByType[type] = damage / interval;
      }
      useGameStore.getState().updateDebug({
        activeAttackers,
        totalDamageDealt: this.totalDamageDealt,
        dpsByType,
        fps: Math.round(this.app.ticker.FPS),
      });

      this.damageAccumulator = {};
      this.storeTickAccumulator = 0;
    }
  }
}
