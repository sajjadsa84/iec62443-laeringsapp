import { Container, Graphics } from "pixi.js";
import { getComponent, type ComponentTier } from "../../state/gameStore";
import { CATEGORY_COLORS_PIXI as CATEGORY_COLORS } from "../../categoryColors";
import { BOARD_THEME_PIXI } from "../../boardTheme";
import { blendColor } from "../colorUtils";
import balance from "../../config/balance.json";

/**
 * Trusseltilstand — beregnes hvert frame av GameLoop ut fra avstand til
 * nærmeste angriper og hvor mange som er innenfor rekkevidde samtidig.
 * Rent visuelt (påvirker ikke skade/blokkering): idle→alert→engaging er en
 * gradvis oppvåkning etter hvor nær trusselen er; overwhelmed varsler
 * spilleren om at denne posisjonen trenger forsterkning.
 */
export type ThreatState = "idle" | "alert" | "engaging" | "overwhelmed";
const ALERT_RANGE_MULTIPLIER = 2;
const OVERWHELM_THRESHOLD = 2;
const STATE_PULSE_SPEED: Record<ThreatState, number> = {
  idle: (2 * Math.PI) / 3,
  alert: 2 * Math.PI,
  engaging: 2 * Math.PI,
  overwhelmed: (2 * Math.PI) / 0.5,
};

/**
 * Piksler per "range"-enhet fra components.json. Ren rendering/geometri, ikke en
 * balanseringsverdi. Byggeplassene i board.json ligger minst 160-180px fra
 * hverandre — denne må holdes klart under det, ellers kan f.eks. en komponent
 * med range 2 plassert ved én node nå inn i en nabo-node eller helt tilbake
 * til et inngangspunkt, og angripere "forsvinner" tilsynelatende uten at
 * noen forsvarskomponent er synlig i nærheten.
 */
export const RANGE_UNIT_PX = 50;

// Forsvar er alltid i den kjølige fargefamilien (teal/cyan/lilla-blå/mint/grå-blå)
// — aldri korallrødt, som er reservert for trusler. Fargene er delt med
// UI-ikonene (se ../../categoryColors.ts) slik at byggemeny, profilkort og
// selve brettet stemmer overens. Selve formen på brettet er fortsatt satt
// per KATEGORI (5 stk) heller enn per komponent (16 stk) — de 16 håndtegnede
// SVG-ikonene brukes i React-UI-et (byggemeny/profilkort), mens brettet her
// bruker enklere Pixi-formede symboler av ytelseshensyn.


const INSTALLING_PULSE_SPEED = 6;
const FIRE_RING_DURATION_MS = 260;
const ICON_RADIUS = 13;

function drawSegmentationIcon(color: number): Graphics {
  // Murstein-mønster — flytkontroll/segmentering mellom soner.
  const g = new Graphics();
  const brickW = 9;
  const brickH = 6;
  const rows = [
    { y: -12, offset: 0 },
    { y: -6, offset: -4.5 },
    { y: 0, offset: 0 },
    { y: 6, offset: -4.5 },
  ];
  for (const row of rows) {
    for (let x = -13.5 + row.offset; x < 13.5; x += brickW + 1) {
      g.roundRect(x, row.y, brickW, brickH, 1).fill({ color, alpha: 0.9 });
    }
  }
  return g;
}

function drawDetectionIcon(color: number): { view: Container; sweep: Graphics } {
  // Radar/øye — ring med et skannende utsnitt og et senter-øye, antyder deteksjon.
  const view = new Container();
  view.addChild(new Graphics().circle(0, 0, ICON_RADIUS).stroke({ width: 2, color, alpha: 0.9 }));
  view.addChild(new Graphics().circle(0, 0, 3.5).fill({ color, alpha: 0.95 }));
  const sweep = new Graphics()
    .moveTo(0, 0)
    .arc(0, 0, ICON_RADIUS, -Math.PI / 2, -Math.PI / 2 + Math.PI / 3)
    .lineTo(0, 0)
    .fill({ color, alpha: 0.35 });
  view.addChild(sweep);
  return { view, sweep };
}

function drawAccessIcon(color: number): Graphics {
  // Nøkkel — tilgangs- og identitetskontroll.
  const g = new Graphics();
  g.circle(-5, -6, 6).stroke({ width: 2.5, color, alpha: 0.9 });
  g.moveTo(0, -1).lineTo(11, 10).stroke({ width: 2.5, color, alpha: 0.9 });
  g.moveTo(6, 5).lineTo(10, 1).stroke({ width: 2, color, alpha: 0.9 });
  g.moveTo(9, 8).lineTo(13, 4).stroke({ width: 2, color, alpha: 0.9 });
  return g;
}

function drawIntegrityIcon(color: number): Graphics {
  // Skjold med hake — systemintegritet/robusthet.
  const g = new Graphics();
  g.poly([0, -13, 11, -8, 11, 3, 0, 13, -11, 3, -11, -8]).fill({ color, alpha: 0.18 }).stroke({ width: 2, color, alpha: 0.9 });
  g.moveTo(-5, 0).lineTo(-1, 5).lineTo(6, -5).stroke({ width: 2.2, color, alpha: 0.95 });
  return g;
}

function drawPhysicalIcon(color: number): Graphics {
  // Hengelås — fysisk sikring.
  const g = new Graphics();
  g.roundRect(-8, -2, 16, 13, 2).fill({ color, alpha: 0.9 });
  g.arc(0, -2, 7, Math.PI, 0).stroke({ width: 2.5, color, alpha: 0.9 });
  g.circle(0, 4, 2).fill({ color: 0x0a0e27, alpha: 0.8 });
  return g;
}

function extractEffect(effectValues: Record<string, number>, dpsPerBlockChance: number): { damagePerSecond: number; slowFactor: number } {
  if ("slowFactor" in effectValues) {
    return { damagePerSecond: 0, slowFactor: effectValues.slowFactor };
  }
  const chance = effectValues.blockChance ?? effectValues.detectChance ?? 0;
  return { damagePerSecond: chance * dpsPerBlockChance, slowFactor: 1 };
}

/**
 * Plassert forsvarskomponent. Ren TypeScript-klasse med et Pixi-view,
 * ikke en React-komponent. Statistikken hentes fra components.json ut fra
 * hvilket oppgraderingsnivå (tier) komponenten faktisk har akkurat nå.
 */
export class DefenseNode {
  readonly id: string;
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly view: Container;
  readonly rangePx: number;

  /** Skade per sekund mens en angriper er innenfor rekkevidde. 0 for komponenter uten skadeeffekt. */
  damagePerSecond: number;
  slowFactor: number;
  isInstalling = false;

  private readonly icon: Container;
  private readonly sweep: Graphics | null;
  private readonly rangeCircle: Graphics;
  private readonly fireRing: Graphics;
  private readonly installRing: Graphics;
  private readonly frame: Graphics;
  private readonly tierDots: Graphics;
  private readonly frameColor: number;
  private lastGlowColor: number;
  private pulseElapsed = 0;
  private threatPulsePhase = Math.random() * Math.PI * 2;
  private threatState: ThreatState = "idle";
  private isHovering = false;
  private sweepPhase = Math.random() * Math.PI * 2;
  private fireRingElapsedMs: number | null = null;
  private installFraction = 0;
  private currentTier: ComponentTier;

  constructor(id: string, type: string, x: number, y: number, tier: ComponentTier) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;

    const definition = getComponent(type);
    this.rangePx = definition.range * RANGE_UNIT_PX;
    const effect = extractEffect(
      definition.upgrades.find((u) => u.tier === tier)?.effectValues ?? {},
      balance.combat.dpsPerBlockChance,
    );
    this.damagePerSecond = effect.damagePerSecond;
    this.slowFactor = effect.slowFactor;
    this.currentTier = tier;

    const color = CATEGORY_COLORS[definition.category];
    this.frameColor = color;

    this.view = new Container();
    this.view.x = x;
    this.view.y = y;

    this.rangeCircle = new Graphics()
      .circle(0, 0, this.rangePx)
      .fill({ color, alpha: 0.08 })
      .stroke({ width: 1, color, alpha: 0.4 });
    this.rangeCircle.visible = false;
    this.view.addChild(this.rangeCircle);

    // Myk bakgrunnsglød bak selve ikonet, i komponentens egen farge.
    this.view.addChild(new Graphics().circle(0, 0, ICON_RADIUS * 1.8).fill({ color, alpha: 0.12 }));

    this.fireRing = new Graphics();
    this.fireRing.visible = false;
    this.view.addChild(this.fireRing);

    if (definition.category === "detection") {
      const detection = drawDetectionIcon(color);
      this.icon = detection.view;
      this.sweep = detection.sweep;
    } else {
      this.sweep = null;
      this.icon =
        definition.category === "segmentation"
          ? drawSegmentationIcon(color)
          : definition.category === "access"
            ? drawAccessIcon(color)
            : definition.category === "integrity"
              ? drawIntegrityIcon(color)
              : drawPhysicalIcon(color);
    }
    this.view.addChild(this.icon);

    // Avrundet ramme rundt selve ikonet — skiller "kortet" tydelig fra
    // bakgrunnsgløden og gjør det lesbart som én samlet enhet. Farges om
    // (ikke tint — grafikken er allerede tegnet i en farge, så en enkel
    // tint ville multiplisert i stedet for å bytte fargen rent) idet
    // trusseltilstanden eskalerer mot ravgul/rød.
    this.frame = new Graphics();
    this.view.addChild(this.frame);
    this.lastGlowColor = color;
    this.redrawFrame(color);

    // Nivåindikator: 1-3 små prikker under ikonet, fylt opp til gjeldende tier.
    this.tierDots = new Graphics();
    this.view.addChild(this.tierDots);
    this.redrawTierDots();

    this.installRing = new Graphics();
    this.view.addChild(this.installRing);

    this.view.eventMode = "static";
    this.view.cursor = "pointer";
    this.view.on("pointerover", () => {
      this.isHovering = true;
    });
    this.view.on("pointerout", () => {
      this.isHovering = false;
    });
  }

  private redrawFrame(color: number): void {
    this.frame
      .clear()
      .roundRect(-ICON_RADIUS - 4, -ICON_RADIUS - 4, (ICON_RADIUS + 4) * 2, (ICON_RADIUS + 4) * 2, 8)
      .stroke({ width: 1.5, color, alpha: 0.55 });
  }

  /**
   * Kalt av GameLoop hvert frame med avstand til nærmeste angriper og hvor
   * mange som er innenfor rekkevidde samtidig — avgjør idle/alert/engaging/
   * overwhelmed. Selve skade-/blokkeringslogikken er upåvirket; dette er kun
   * det visuelle signalet til spilleren.
   */
  setThreatState(nearestDistance: number, countInRange: number): void {
    this.threatState =
      countInRange > OVERWHELM_THRESHOLD
        ? "overwhelmed"
        : countInRange >= 1
          ? "engaging"
          : nearestDistance <= this.rangePx * ALERT_RANGE_MULTIPLIER
            ? "alert"
            : "idle";
  }

  /** Kalt når spilleren oppgraderer komponenten — effekten skal endre seg umiddelbart, ikke bare ved neste plassering. */
  setTier(tier: ComponentTier): void {
    const definition = getComponent(this.type);
    const effect = extractEffect(
      definition.upgrades.find((u) => u.tier === tier)?.effectValues ?? {},
      balance.combat.dpsPerBlockChance,
    );
    this.damagePerSecond = effect.damagePerSecond;
    this.slowFactor = effect.slowFactor;
    if (this.currentTier !== tier) {
      this.currentTier = tier;
      this.redrawTierDots();
    }
  }

  private redrawTierDots(): void {
    const spacing = 7;
    const startX = -spacing;
    const y = ICON_RADIUS + 10;
    this.tierDots.clear();
    for (let i = 0; i < 3; i++) {
      const filled = i < this.currentTier;
      this.tierDots.circle(startX + i * spacing, y, 2).fill({ color: this.frameColor, alpha: filled ? 0.95 : 0.15 });
    }
  }

  setInstalling(installing: boolean): void {
    if (this.isInstalling === installing) return;
    this.isInstalling = installing;
    if (!installing) {
      this.icon.alpha = 1;
      this.installRing.clear();
    }
  }

  /**
   * Kalt fra GameLoop hver gang komponenten faktisk skader/sinker en angriper
   * — en kort utvidende ring viser "skudd". Skade påføres kontinuerlig
   * (opptil 60 ganger/sek) mens en angriper er i rekkevidde, så vi lar en
   * påbegynt ring fullføre i stedet for å resette den hvert eneste frame.
   */
  triggerFire(): void {
    if (this.fireRingElapsedMs !== null) return;
    this.fireRingElapsedMs = 0;
    this.fireRing.visible = true;
  }

  setInstallProgress(fraction: number): void {
    this.installFraction = Math.max(0, Math.min(1, fraction));
  }

  update(deltaSeconds: number): void {
    const sweepSpeed = this.threatState === "idle" ? 1.5 : this.threatState === "alert" ? 3 : 5;
    if (this.sweep) {
      this.sweepPhase += deltaSeconds * sweepSpeed;
      this.sweep.rotation = this.sweepPhase;
      this.sweep.tint =
        this.threatState === "overwhelmed" ? BOARD_THEME_PIXI.threat : this.threatState === "idle" ? 0xffffff : BOARD_THEME_PIXI.alert;
    }

    if (this.isInstalling) {
      this.pulseElapsed += deltaSeconds * INSTALLING_PULSE_SPEED;
      this.icon.alpha = 0.35 + Math.abs(Math.sin(this.pulseElapsed)) * 0.35;
      this.installRing
        .clear()
        .arc(0, 0, ICON_RADIUS + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.installFraction)
        .stroke({ width: 3, color: 0xffb020, alpha: 0.9 });
    } else {
      // Generisk trussel-eskalering, delt av alle 16 komponenttyper inntil hver
      // får sin egen håndtegnede animasjon (se komponent-spesifikk tabell): rolig
      // pust i idle, raskere puls + ravgul kantglød i alert, full aktivering med
      // synlig rekkeviddesirkel i engaging, rød risting i overwhelmed.
      this.threatPulsePhase += deltaSeconds * STATE_PULSE_SPEED[this.threatState];
      const pulse = Math.abs(Math.sin(this.threatPulsePhase));

      const minAlpha =
        this.threatState === "idle" ? 0.85 : this.threatState === "overwhelmed" ? 0.5 : 0.7;
      this.icon.alpha = minAlpha + pulse * (1 - minAlpha);

      const glowColor =
        this.threatState === "overwhelmed"
          ? blendColor(this.frameColor, BOARD_THEME_PIXI.threat, 0.75)
          : this.threatState === "alert"
            ? blendColor(this.frameColor, BOARD_THEME_PIXI.alert, 0.5)
            : this.frameColor;
      if (glowColor !== this.lastGlowColor) {
        this.lastGlowColor = glowColor;
        this.redrawFrame(glowColor);
      }

      this.icon.x = this.threatState === "overwhelmed" ? Math.sin(this.threatPulsePhase * 3) * 1.4 : 0;
      this.rangeCircle.visible = this.isHovering || this.threatState === "engaging" || this.threatState === "overwhelmed";
    }

    if (this.fireRingElapsedMs !== null) {
      this.fireRingElapsedMs += deltaSeconds * 1000;
      const progress = Math.min(this.fireRingElapsedMs / FIRE_RING_DURATION_MS, 1);
      const definition = getComponent(this.type);
      this.fireRing
        .clear()
        .circle(0, 0, ICON_RADIUS + 4 + progress * 14)
        .stroke({ width: 2, color: CATEGORY_COLORS[definition.category], alpha: 0.6 * (1 - progress) });
      if (progress >= 1) {
        this.fireRingElapsedMs = null;
        this.fireRing.visible = false;
      }
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
