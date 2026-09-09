import { Container, Graphics, FillGradient } from "pixi.js";
import type { Point } from "../pathfinding";
import { distanceToPath, getPathLength, getPositionAlongPath } from "../pathfinding";

const CALM_COLOR_START = 0x2fe8b0;
const CALM_COLOR_END = 0x18a6e0;
const ATTACK_COLOR = 0xe14d5c;
const SHORTCUT_COLOR = 0xffb020;
const PACKET_SPEED_PX_PER_SEC = 70;
const ROAD_BORDER_COLOR = 0x0a0e27;
const LINE_WIDTH = 10;
const LINE_WIDTH_ATTACK = 13;
const ROAD_BORDER_WIDTH = 4;

export type ConduitVariant = "normal" | "shortcut";

/**
 * En "conduit" (IEC 62443-begrep for en kommunikasjonssti mellom soner)
 * tegnes som en rolig, statisk gradient-linje i normal drift. Kun når en
 * angriper faktisk beveger seg langs denne stien akkurat nå (avgjort av
 * GameLoop via avstand-til-linje) skifter den til korallrødt, pulserer,
 * og viser en løpende datapakke — animasjon skal bety "her skjer det noe",
 * ikke være permanent bakgrunnsstøy.
 */
export class Conduit {
  readonly view = new Container();
  private readonly line = new Graphics();
  private readonly packet: Graphics;
  private readonly path: Point[];
  private readonly length: number;

  private packetDistance: number;
  private pulsePhase = Math.random() * Math.PI * 2;
  private underAttack = false;
  private wasUnderAttack = false;
  private readonly variant: ConduitVariant;

  constructor(path: Point[], variant: ConduitVariant = "normal") {
    this.path = path;
    this.variant = variant;
    this.length = Math.max(1, getPathLength(path));
    this.packetDistance = Math.random() * this.length;

    this.view.addChild(this.line);
    this.packet = new Graphics().circle(0, 0, 3).fill({ color: 0xffffff, alpha: 0.95 });
    this.packet.visible = false;
    this.view.addChild(this.packet);

    this.redrawLine();
    this.positionPacket();
  }

  setUnderAttack(underAttack: boolean): void {
    this.underAttack = underAttack;
  }

  /** Er et punkt (typisk en angripers posisjon) nærme nok denne conduiten til at den regnes som "under angrep"? */
  isNear(point: Point, threshold: number): boolean {
    return distanceToPath(point, this.path) <= threshold;
  }

  update(deltaSeconds: number): void {
    this.packet.visible = this.underAttack;

    if (this.underAttack) {
      this.pulsePhase += deltaSeconds * 9;
      this.packetDistance += deltaSeconds * PACKET_SPEED_PX_PER_SEC * 2.2;
      if (this.packetDistance > this.length) this.packetDistance -= this.length;
      this.positionPacket();

      const pulse = 0.5 + Math.abs(Math.sin(this.pulsePhase)) * 0.5;
      this.line.alpha = 0.65 + pulse * 0.35;
    } else {
      // Rolig tilstand: ingen pulsering, ingen løpende datapakke — kun
      // faktiske angrep skal trekke blikket mot en conduit.
      this.line.alpha = 0.45;
    }

    if (this.underAttack !== this.wasUnderAttack) {
      this.wasUnderAttack = this.underAttack;
      this.redrawLine();
    }
  }

  private positionPacket(): void {
    const position = getPositionAlongPath(this.path, this.packetDistance) ?? this.path[0];
    this.packet.position.set(position.x, position.y);
    this.packet.tint = ATTACK_COLOR;
  }

  private redrawLine(): void {
    this.line.clear();

    if (this.variant === "shortcut") {
      // Snarveier (f.eks. en sky-/IoT-tilkobling rett fra cellenivå) tegnes
      // stiplet i varselfarge — de skal se ut som noe som IKKE hører hjemme
      // i den ordinære, lagdelte strukturen, selv når de ikke er under angrep.
      const color = this.underAttack ? ATTACK_COLOR : SHORTCUT_COLOR;
      this.drawDashed(color);
      return;
    }

    // NB: "global" texturSpace her ga en synlig, feilaktig diagonal linje for
    // flersegments (ortogonale) stier — gradientens retningsvektor går fra
    // stiens FØRSTE til SISTE punkt, som ofte ikke ligger på samme akse.
    // "local" beregnes fra selve formens egen bounding box og unngår dette.
    const gradient = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      textureSpace: "local",
      colorStops: this.underAttack
        ? [
            { offset: 0, color: ATTACK_COLOR },
            { offset: 1, color: ATTACK_COLOR },
          ]
        : [
            { offset: 0, color: CALM_COLOR_START },
            { offset: 1, color: CALM_COLOR_END },
          ],
    });
    const width = this.underAttack ? LINE_WIDTH_ATTACK : LINE_WIDTH;
    // Bred "vei"-linje: en mørk kant tegnes først, så selve fargelinjen
    // litt smalere oppå — gir et lesbart, vei-aktig preg i stedet for en
    // tynn skjematisk strek, uten å måtte innføre terreng-teksturer.
    for (let i = 1; i < this.path.length; i++) {
      this.line
        .moveTo(this.path[i - 1].x, this.path[i - 1].y)
        .lineTo(this.path[i].x, this.path[i].y)
        .stroke({ width: width + ROAD_BORDER_WIDTH, color: ROAD_BORDER_COLOR, alpha: 0.5 });
    }
    for (let i = 1; i < this.path.length; i++) {
      this.line.moveTo(this.path[i - 1].x, this.path[i - 1].y).lineTo(this.path[i].x, this.path[i].y);
    }
    this.line.stroke({ width, fill: gradient });
  }

  private drawDashed(color: number): void {
    const dashLength = 14;
    const gapLength = 8;
    for (let i = 1; i < this.path.length; i++) {
      const a = this.path[i - 1];
      const b = this.path[i];
      const segmentLength = Math.hypot(b.x - a.x, b.y - a.y);
      if (segmentLength === 0) continue;
      const dx = (b.x - a.x) / segmentLength;
      const dy = (b.y - a.y) / segmentLength;
      let travelled = 0;
      while (travelled < segmentLength) {
        const dashEnd = Math.min(travelled + dashLength, segmentLength);
        this.line
          .moveTo(a.x + dx * travelled, a.y + dy * travelled)
          .lineTo(a.x + dx * dashEnd, a.y + dy * dashEnd)
          .stroke({ width: LINE_WIDTH - 2, color, alpha: 1 });
        travelled = dashEnd + gapLength;
      }
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
