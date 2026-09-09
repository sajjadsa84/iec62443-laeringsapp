export type ComponentCategory = "segmentation" | "access" | "detection" | "integrity" | "physical";

/**
 * Hvor komponenten hører hjemme: "edge" = flytkontroll på en konduit
 * (brannmur, svitsj, diode, DMZ), "node" = beskyttelse av et vertskap/endepunkt
 * (IDS, jump host, autentiseringsserver osv). Håndheves ved plassering —
 * du kan ikke sette en brannmur der en IDS hører hjemme, eller omvendt.
 */
export type PlacementKind = "edge" | "node";

export interface ComponentUpgrade {
  tier: 1 | 2 | 3;
  name: string;
  /** 0 for tier 1 — dekket av baseCost. */
  cost: number;
  effectDescription: string;
  /** F.eks. { blockChance: 0.8 }, { detectChance: 0.6 } eller { slowFactor: 0.35 }. */
  effectValues: Record<string, number>;
}

export interface GameComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  /** Vises ved klikk — pedagogisk tekst, skal ikke omskrives. */
  profileText: string;
  primaryFR: string;
  secondaryFRs: string[];
  baseCost: number;
  unlockedAtLevel: 1 | 2 | 3 | 4;
  placementKind: PlacementKind;
  /** Rekkevidde i samme enhet som RANGE_UNIT_PX i DefenseNode — ikke del av den opprinnelige katalog-modellen, men nødvendig for plassering på brettet. */
  range: number;
  /** Alltid tre nivåer. */
  upgrades: ComponentUpgrade[];
}
