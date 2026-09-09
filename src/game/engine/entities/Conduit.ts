import { Container, Graphics, FillGradient } from "pixi.js";
import type { Point } from "../pathfinding";
import { distanceToPath, getPathLength, getPositionAlongPath } from "../pathfinding";
import { BOARD_THEME_PIXI } from "../../boardTheme";
import { blendColor } from "../colorUtils";

const CALM_COLOR = BOARD_THEME_PIXI.conduit;
const PACKET_COLOR = BOARD_THEME_PIXI.packet;
const THREAT_COLOR = BOARD_THEME_PIXI.threat;
const SHORTCUT_COLOR = 0xe8a33d;
const BLOCKED_COLOR = 0x8a97bd;

const ROAD_BORDER_COLOR = 0x2c3e4a;
const LINE_WIDTH = 10;
const LINE_WIDTH_ATTACK = 13;
const ROAD_BORDER_WIDTH = 4;

const PACKET_POOL_SIZE = 3;
const PACKET_SPEED_CALM = 55;
const PACKET_SPEED_ATTACK = 130;
const PACKET_SPAWN_MS_CALM = 2000;
const PACKET_SPAWN_MS_ATTACK = 500;
const BLOCKED_FLASH_MS = 550;
const INFECTION_RISE_PER_SEC = 1 / 0.4;
const INFECTION_FALL_PER_SEC = 1 / 1.2;

export type ConduitVariant = "normal" | "shortcut";

interface Packet {
  view: Graphics;
  distance: number;
  active: boolean;
}

/**
 * En "conduit" (IEC 62443-begrep for en kommunikasjonssti mellom soner).
 * Normal drift: rolig grønn linje med små datapakker som driver langs den i
 * jevne mellomrom — anlegget skal se levende/i drift ut selv uten angrep.
 * Under angrep "smitter" linjen gradvis rødt og pakkefrekvensen øker; når et
 * angrep blir stanset et sted på denne stien, blinker den kort stiplet grå.
 */
export class Conduit {
  readonly view = new Container();
  private readonly line = new Graphics();
  private readonly packets: Packet[] = [];
  private readonly path: Point[];
  private readonly length: number;
  private readonly variant: ConduitVariant;

  private pulsePhase = Math.random() * Math.PI * 2;
  private underAttack = false;
  private wasUnderAttack = false;
  private infectionIntensity = 0;
  private spawnTimerMs = 0;
  private nextSpawnMs = PACKET_SPAWN_MS_CALM * (0.5 + Math.random());
  private blockedFlashMs = 0;

  constructor(path: Point[], variant: ConduitVariant = "normal") {
    this.path = path;
    this.variant = variant;
    this.length = Math.max(1, getPathLength(path));

    this.view.addChild(this.line);
    for (let i = 0; i < PACKET_POOL_SIZE; i++) {
      const view = new Graphics().circle(0, 0, 3).fill({ color: PACKET_COLOR, alpha: 0.95 });
      view.visible = false;
      this.view.addChild(view);
      this.packets.push({ view, distance: 0, active: false });
    }

    this.redrawLine();
  }

  setUnderAttack(underAttack: boolean): void {
    this.underAttack = underAttack;
  }

  /** Kalles av GameLoop når et angrep faktisk blir stanset et sted på denne stien — kort "blokkert"-blink. */
  flashBlocked(): void {
    this.blockedFlashMs = BLOCKED_FLASH_MS;
  }

  /** Er et punkt (typisk en angripers posisjon) nærme nok denne conduiten til at den regnes som "under angrep"? */
  isNear(point: Point, threshold: number): boolean {
    return this.distanceTo(point) <= threshold;
  }

  distanceTo(point: Point): number {
    return distanceToPath(point, this.path);
  }

  update(deltaSeconds: number): void {
    if (this.blockedFlashMs > 0) {
      this.blockedFlashMs = Math.max(0, this.blockedFlashMs - deltaSeconds * 1000);
    }

    const infectionTarget = this.underAttack ? 1 : 0;
    const infectionRate = this.underAttack ? INFECTION_RISE_PER_SEC : INFECTION_FALL_PER_SEC;
    this.infectionIntensity += Math.sign(infectionTarget - this.infectionIntensity) * infectionRate * deltaSeconds;
    this.infectionIntensity = Math.max(0, Math.min(1, this.infectionIntensity));

    if (this.variant === "normal" && this.blockedFlashMs <= 0) {
      this.updatePackets(deltaSeconds);
    } else {
      for (const packet of this.packets) packet.view.visible = false;
    }

    const pulseSpeed = 2.2 + this.infectionIntensity * 6.8;
    this.pulsePhase += deltaSeconds * pulseSpeed;
    const pulse = 0.5 + Math.abs(Math.sin(this.pulsePhase)) * 0.5;
    this.line.alpha = this.blockedFlashMs > 0 ? 0.9 : 0.55 + pulse * (0.2 + this.infectionIntensity * 0.25);

    if (this.underAttack !== this.wasUnderAttack) this.wasUnderAttack = this.underAttack;
    this.redrawLine();
  }

  private updatePackets(deltaSeconds: number): void {
    const speed = PACKET_SPEED_CALM + (PACKET_SPEED_ATTACK - PACKET_SPEED_CALM) * this.infectionIntensity;
    const spawnInterval = PACKET_SPAWN_MS_CALM - (PACKET_SPAWN_MS_CALM - PACKET_SPAWN_MS_ATTACK) * this.infectionIntensity;

    this.spawnTimerMs += deltaSeconds * 1000;
    if (this.spawnTimerMs >= this.nextSpawnMs) {
      this.spawnTimerMs = 0;
      this.nextSpawnMs = spawnInterval * (0.6 + Math.random() * 0.8);
      const slot = this.packets.find((p) => !p.active);
      if (slot) {
        slot.active = true;
        slot.distance = 0;
        slot.view.visible = true;
      }
    }

    for (const packet of this.packets) {
      if (!packet.active) continue;
      packet.distance += speed * deltaSeconds;
      if (packet.distance >= this.length) {
        packet.active = false;
        packet.view.visible = false;
        continue;
      }
      const position = getPositionAlongPath(this.path, packet.distance) ?? this.path[0];
      packet.view.position.set(position.x, position.y);
      packet.view.tint = this.infectionIntensity > 0.5 ? THREAT_COLOR : PACKET_COLOR;
    }
  }

  private redrawLine(): void {
    this.line.clear();

    if (this.blockedFlashMs > 0) {
      this.drawDashed(BLOCKED_COLOR, 10, 8);
      return;
    }

    if (this.variant === "shortcut") {
      // Snarveier (f.eks. en sky-/IoT-tilkobling rett fra cellenivå) tegnes
      // stiplet i varselfarge — de skal se ut som noe som IKKE hører hjemme
      // i den ordinære, lagdelte strukturen, selv når de ikke er under angrep.
      const color = this.infectionIntensity > 0.5 ? THREAT_COLOR : SHORTCUT_COLOR;
      this.drawDashed(color, 14, 8);
      return;
    }

    // NB: "global" texturSpace her ga en synlig, feilaktig diagonal linje for
    // flersegments (ortogonale) stier — gradientens retningsvektor går fra
    // stiens FØRSTE til SISTE punkt, som ofte ikke ligger på samme akse.
    // "local" beregnes fra selve formens egen bounding box og unngår dette.
    const color = blendColor(CALM_COLOR, THREAT_COLOR, this.infectionIntensity);
    const gradient = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      textureSpace: "local",
      colorStops: [
        { offset: 0, color },
        { offset: 1, color },
      ],
    });
    const width = LINE_WIDTH + (LINE_WIDTH_ATTACK - LINE_WIDTH) * this.infectionIntensity;
    for (let i = 1; i < this.path.length; i++) {
      this.line
        .moveTo(this.path[i - 1].x, this.path[i - 1].y)
        .lineTo(this.path[i].x, this.path[i].y)
        .stroke({ width: width + ROAD_BORDER_WIDTH, color: ROAD_BORDER_COLOR, alpha: 0.45 });
    }
    for (let i = 1; i < this.path.length; i++) {
      this.line.moveTo(this.path[i - 1].x, this.path[i - 1].y).lineTo(this.path[i].x, this.path[i].y);
    }
    this.line.stroke({ width, fill: gradient });
  }

  private drawDashed(color: number, dashLength: number, gapLength: number): void {
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
