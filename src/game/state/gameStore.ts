import { create } from "zustand";
import balance from "../config/balance.json";
import componentsData from "../config/components.json";
import boardConfig from "../config/board.json";
import type { GameComponent, PlacementKind } from "../types";

export type ComponentType = string;
export type ComponentTier = 1 | 2 | 3;

export const COMPONENTS: GameComponent[] = componentsData.components as GameComponent[];
const COMPONENTS_BY_ID = new Map<string, GameComponent>(COMPONENTS.map((c) => [c.id, c]));
const SLOT_KIND_BY_ID = new Map<string, PlacementKind>(
  boardConfig.buildSlots.map((s) => [s.id, s.kind as PlacementKind]),
);

export function getComponent(id: string): GameComponent {
  const component = COMPONENTS_BY_ID.get(id);
  if (!component) throw new Error(`Ukjent komponent-id: ${id}`);
  return component;
}

/** Brannmur/svitsj/diode/DMZ hører hjemme på kanter (konduitter); IDS/jump host/autentiseringsserver osv. på noder. */
export function getSlotKind(slotId: string): PlacementKind | undefined {
  return SLOT_KIND_BY_ID.get(slotId);
}

/** Anlegget "digitaliseres" etter hvert som bølgene overleves — nye komponenttyper (og nye trusler) låses opp samtidig. */
export function getFacilityLevel(currentWave: number): 1 | 2 | 3 | 4 {
  return Math.min(4, currentWave + 1) as 1 | 2 | 3 | 4;
}

export interface PlacedComponent {
  id: string;
  /** Komponent-id fra components.json (f.eks. "industrial-firewall"). */
  type: ComponentType;
  nodeId: string;
  currentTier: ComponentTier;
  /** Totalt beløp betalt for denne plasseringen (grunnkostnad + alle oppgraderinger) — brukes ved refusjon. */
  totalPaid: number;
  /** Sekunder igjen før komponenten er operativ. 0 = ferdig installert. */
  installRemaining: number;
  /** Sekunder komponenten har vært operativ — brukt komponenter er mindre verdt ved fjerning. */
  ageSeconds: number;
}

/** Hvor stor andel av kjøpesummen som refunderes ved fjerning, avhengig av hvor lenge komponenten har vært i bruk. */
export function depreciationRatio(ageSeconds: number): number {
  const { freshRefundRatio, minRefundRatio, fullDepreciationSeconds } = balance.depreciation;
  const t = Math.min(1, ageSeconds / fullDepreciationSeconds);
  return freshRefundRatio + (minRefundRatio - freshRefundRatio) * t;
}

export function computeRefund(totalPaid: number, ageSeconds: number): number {
  return Math.round(totalPaid * depreciationRatio(ageSeconds));
}

export type GamePhase = "building" | "wave-active" | "victory" | "game-over";

export type GameSpeed = 1 | 2;

export interface GameStats {
  wavesSurvived: number;
  attackersStopped: number;
  attackersBreached: number;
}

export interface DebugSnapshot {
  activeAttackers: number;
  totalDamageDealt: number;
  dpsByType: Record<string, number>;
  fps: number;
}

const TOTAL_WAVES = balance.waves.length;

const initialStats: GameStats = { wavesSurvived: 0, attackersStopped: 0, attackersBreached: 0 };
const initialDebug: DebugSnapshot = {
  activeAttackers: 0,
  totalDamageDealt: 0,
  dpsByType: {},
  fps: 0,
};

export interface GameState {
  phase: GamePhase;
  currentWave: number;
  totalWaves: number;
  paused: boolean;
  speed: GameSpeed;
  money: number;
  plantHealth: number;
  productionRate: number;
  /** Sekunder igjen av produksjonsstans etter en nylig endring i oppsettet. */
  productionHaltRemaining: number;
  /** Sekunder produsert siden forrige leveranse — penger krediteres først når en leveranse går ut. */
  shipmentProgressSeconds: number;
  totalShipments: number;
  lastShipmentAmount: number;
  placedComponents: PlacedComponent[];
  stats: GameStats;
  debug: DebugSnapshot;
  /** Økes ved reset slik at GameCanvas/GameLoop vet de må bygge brettet helt på nytt. */
  resetNonce: number;

  endWave: () => void;
  startProduction: () => void;
  placeComponent: (type: ComponentType, nodeId: string) => void;
  removeComponent: (nodeId: string) => void;
  upgradeComponent: (nodeId: string) => void;
  damagePlant: (amount: number) => void;
  recordAttackerStopped: () => void;
  recordAttackerBreached: () => void;
  togglePause: () => void;
  setSpeed: (speed: GameSpeed) => void;
  updateDebug: (snapshot: DebugSnapshot) => void;
  tick: (deltaSeconds: number) => void;
  resetGame: () => void;
}

function freshState() {
  return {
    phase: "building" as GamePhase,
    currentWave: 0,
    paused: false,
    speed: 1 as GameSpeed,
    money: balance.startMoney,
    plantHealth: 100,
    productionRate: balance.baseProductionRate,
    productionHaltRemaining: 0,
    shipmentProgressSeconds: 0,
    totalShipments: 0,
    lastShipmentAmount: 0,
    placedComponents: [] as PlacedComponent[],
    stats: initialStats,
    debug: initialDebug,
  };
}

export const useGameStore = create<GameState>((set) => ({
  ...freshState(),
  totalWaves: TOTAL_WAVES,
  resetNonce: 0,

  endWave: () =>
    set((state) => {
      if (state.plantHealth <= 0) return { phase: "game-over" };
      const wavesSurvived = state.stats.wavesSurvived + 1;
      if (state.currentWave >= TOTAL_WAVES) {
        return { phase: "victory", stats: { ...state.stats, wavesSurvived } };
      }
      // Produksjonen stopper automatisk når bølgen er unnagjort — anlegget
      // er da tilbake i "stanset" tilstand hvor maskinvare kan endres fritt.
      return {
        phase: "building",
        stats: { ...state.stats, wavesSurvived },
      };
    }),

  startProduction: () =>
    set((state) => {
      if (state.phase !== "building") return state;
      return {
        phase: "wave-active",
        currentWave: state.currentWave + 1,
      };
    }),

  placeComponent: (type, nodeId) => {
    const component = getComponent(type);
    set((state) => {
      // Maskinvare kan kun endres mens produksjonen er stanset.
      if (state.phase !== "building") return state;
      // Brannmur/svitsj/diode/DMZ hører hjemme på kanter; IDS/jump host/
      // autentiseringsserver osv. på noder — feil type kan ikke plasseres her.
      if (getSlotKind(nodeId) !== component.placementKind) return state;
      const cost = component.baseCost;
      if (state.money < cost) return state;
      if (state.placedComponents.some((c) => c.nodeId === nodeId)) return state;
      return {
        money: state.money - cost,
        productionHaltRemaining: balance.production.haltSecondsPerChange,
        placedComponents: [
          ...state.placedComponents,
          {
            id: `${type}-${nodeId}-${Date.now()}`,
            type,
            nodeId,
            currentTier: 1,
            totalPaid: cost,
            installRemaining: balance.installation.installDelaySeconds,
            ageSeconds: 0,
          },
        ],
      };
    });
  },

  removeComponent: (nodeId) =>
    set((state) => {
      if (state.phase !== "building") return state;
      const placed = state.placedComponents.find((c) => c.nodeId === nodeId);
      if (!placed) return state;
      const refund = computeRefund(placed.totalPaid, placed.ageSeconds);
      return {
        money: state.money + refund,
        productionHaltRemaining: balance.production.haltSecondsPerChange,
        placedComponents: state.placedComponents.filter((c) => c.nodeId !== nodeId),
      };
    }),

  upgradeComponent: (nodeId) =>
    set((state) => {
      if (state.phase !== "building") return state;
      const placed = state.placedComponents.find((c) => c.nodeId === nodeId);
      if (!placed || placed.currentTier >= 3) return state;
      const component = getComponent(placed.type);
      const nextUpgrade = component.upgrades.find((u) => u.tier === placed.currentTier + 1);
      if (!nextUpgrade) return state;

      if (state.money < nextUpgrade.cost) return state;

      return {
        money: state.money - nextUpgrade.cost,
        productionHaltRemaining: balance.production.haltSecondsPerChange,
        placedComponents: state.placedComponents.map((c) =>
          c.nodeId === nodeId
            ? { ...c, currentTier: nextUpgrade.tier, totalPaid: c.totalPaid + nextUpgrade.cost }
            : c,
        ),
      };
    }),

  damagePlant: (amount) =>
    set((state) => {
      const plantHealth = Math.max(0, state.plantHealth - amount);
      return { plantHealth, phase: plantHealth <= 0 ? "game-over" : state.phase };
    }),

  recordAttackerStopped: () =>
    set((state) => ({ stats: { ...state.stats, attackersStopped: state.stats.attackersStopped + 1 } })),

  recordAttackerBreached: () =>
    set((state) => ({ stats: { ...state.stats, attackersBreached: state.stats.attackersBreached + 1 } })),

  togglePause: () => set((state) => ({ paused: !state.paused })),

  setSpeed: (speed) => set({ speed }),

  updateDebug: (snapshot) => set({ debug: snapshot }),

  tick: (deltaSeconds) =>
    set((state) => {
      const placedComponents = state.placedComponents.map((c) =>
        c.installRemaining > 0
          ? { ...c, installRemaining: Math.max(0, c.installRemaining - deltaSeconds) }
          : { ...c, ageSeconds: c.ageSeconds + deltaSeconds },
      );

      const productionHaltRemaining = Math.max(0, state.productionHaltRemaining - deltaSeconds);
      // Anlegget produserer kun mens produksjonen faktisk er startet og det
      // ikke er produksjonsstans etter en nylig endring — byggefasen (stanset
      // produksjon) gir aldri penger, siden nettverket da er under ombygging.
      const isProducing = state.phase === "wave-active" && productionHaltRemaining <= 0;

      // Penger krediteres ikke fortløpende — de legges opp som produksjon og
      // utbetales først når en full leveranse er klar og "shippet ut".
      let money = state.money;
      let shipmentProgressSeconds = state.shipmentProgressSeconds;
      let totalShipments = state.totalShipments;
      let lastShipmentAmount = state.lastShipmentAmount;
      if (isProducing) {
        shipmentProgressSeconds += deltaSeconds;
        const { shipmentIntervalSeconds } = balance.production;
        while (shipmentProgressSeconds >= shipmentIntervalSeconds) {
          shipmentProgressSeconds -= shipmentIntervalSeconds;
          lastShipmentAmount = Math.round(state.productionRate * shipmentIntervalSeconds);
          money += lastShipmentAmount;
          totalShipments += 1;
        }
      }

      return { money, placedComponents, productionHaltRemaining, shipmentProgressSeconds, totalShipments, lastShipmentAmount };
    }),

  resetGame: () =>
    set((state) => ({
      ...freshState(),
      resetNonce: state.resetNonce + 1,
    })),
}));
