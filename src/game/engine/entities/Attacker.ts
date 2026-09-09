import { Container, Graphics } from "pixi.js";
import { getPositionAlongPath, type Point } from "../pathfinding";

export interface AttackerOptions {
  path: Point[];
  speed: number;
  health: number;
}

let nextUid = 0;

/** Hvor lenge en avgjort angriper blir stående og tones ut, så utfallet er synlig. */
const DYING_DURATION_MS = 350;

/** Grå tone for "stanset av forsvar" — skiller seg tydelig fra hvit "nådde målet". */
const BLOCKED_TINT = 0x888888;
const BREACHED_TINT = 0xffffff;
const THREAT_COLOR = 0xe14d5c;

const HEALTH_BAR_WIDTH = 20;
const HEALTH_BAR_Y = -18;

const TRAIL_LENGTH = 5;
const BODY_RADIUS = 8;

function drawThreatGlyph(radius: number): Graphics {
  // Spiss, "virus"-aktig silhuett — tydelig fiendtlig og lett å skille fra
  // de rolige, geometriske forsvarsikonene (kvadrat/sirkel/piler).
  const spikes = 6;
  const outerR = radius;
  const innerR = radius * 0.5;
  const points: number[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / spikes;
    points.push(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  return new Graphics().poly(points).fill(THREAT_COLOR);
}

/**
 * Ren TypeScript-klasse, ikke en React-komponent. Eies og oppdateres
 * av GameLoop, som legger view'et rett på Pixi-scenen.
 */
export class Attacker {
  readonly uid: number;
  readonly view: Container;
  readonly maxHealth: number;

  health: number;
  speed: number;
  isDead = false;
  reachedTarget = false;
  /** Sant når fade-ut-animasjonen er ferdig og GameLoop kan fjerne/destroy'e angriperen. */
  isRemovable = false;

  private readonly body: Graphics;
  private readonly healthBarFill: Graphics;
  private readonly healthBarWrap: Container;
  private readonly glow: Graphics;
  private readonly trailDots: Graphics[] = [];
  private readonly trailHistory: Point[] = [];
  private readonly path: Point[];
  private distanceTraveled = 0;
  private dyingElapsedMs = 0;
  private spinPhase = Math.random() * Math.PI * 2;

  constructor(options: AttackerOptions) {
    this.uid = nextUid++;
    this.path = options.path;
    this.speed = options.speed;
    this.health = options.health;
    this.maxHealth = options.health;

    this.view = new Container();

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const dot = new Graphics().circle(0, 0, BODY_RADIUS * 0.6).fill({ color: THREAT_COLOR, alpha: 1 });
      dot.alpha = 0;
      this.trailDots.push(dot);
      this.view.addChild(dot);
    }

    // Manuell, billig "glød" — to konsentriske halvtransparente sirkler i
    // stedet for et ekte BlurFilter per angriper, som blir dyrt når en hel
    // bølge (opptil 16 samtidige) er i bevegelse.
    this.glow = new Graphics()
      .circle(0, 0, BODY_RADIUS * 2.2)
      .fill({ color: THREAT_COLOR, alpha: 0.12 })
      .circle(0, 0, BODY_RADIUS * 1.5)
      .fill({ color: THREAT_COLOR, alpha: 0.18 });
    this.view.addChild(this.glow);

    this.body = drawThreatGlyph(BODY_RADIUS);
    this.view.addChild(this.body);

    this.healthBarWrap = new Container();
    const healthBarBg = new Graphics().rect(-HEALTH_BAR_WIDTH / 2, HEALTH_BAR_Y, HEALTH_BAR_WIDTH, 3).fill(0x2a1010);
    this.healthBarWrap.addChild(healthBarBg);

    this.healthBarFill = new Graphics().rect(0, 0, HEALTH_BAR_WIDTH, 3).fill(0x4ade80);
    this.healthBarFill.x = -HEALTH_BAR_WIDTH / 2;
    this.healthBarFill.y = HEALTH_BAR_Y;
    this.healthBarWrap.addChild(this.healthBarFill);
    this.view.addChild(this.healthBarWrap);

    const start = this.path[0];
    this.view.x = start.x;
    this.view.y = start.y;
    for (let i = 0; i < TRAIL_LENGTH; i++) this.trailHistory.push({ x: start.x, y: start.y });
  }

  update(deltaSeconds: number): void {
    if (this.isDead || this.reachedTarget) {
      this.updateDyingFade(deltaSeconds * 1000);
      return;
    }

    this.spinPhase += deltaSeconds * 2;
    this.body.rotation = this.spinPhase;

    this.distanceTraveled += this.speed * deltaSeconds;
    const position = getPositionAlongPath(this.path, this.distanceTraveled);

    if (!position) {
      this.reachedTarget = true;
      this.body.tint = BREACHED_TINT;
      this.glow.visible = false;
      return;
    }

    this.trailHistory.pop();
    this.trailHistory.unshift({ x: this.view.x, y: this.view.y });
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const dot = this.trailDots[i];
      const hist = this.trailHistory[i];
      dot.position.set(hist.x - position.x, hist.y - position.y);
      dot.alpha = (1 - i / TRAIL_LENGTH) * 0.35;
    }

    this.view.x = position.x;
    this.view.y = position.y;
  }

  takeDamage(amount: number): void {
    if (this.isDead || this.reachedTarget) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.body.tint = BLOCKED_TINT;
      this.glow.visible = false;
    }
    this.healthBarFill.scale.x = Math.max(0, this.health / this.maxHealth);
  }

  private updateDyingFade(deltaMs: number): void {
    if (this.isRemovable) return;
    this.dyingElapsedMs += deltaMs;
    const progress = Math.min(this.dyingElapsedMs / DYING_DURATION_MS, 1);
    this.view.alpha = 1 - progress;
    this.view.scale.set(1 + progress * 0.6);
    if (progress >= 1) this.isRemovable = true;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
