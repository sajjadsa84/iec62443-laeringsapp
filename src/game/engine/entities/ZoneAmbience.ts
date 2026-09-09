import { Container, Graphics } from "pixi.js";
import type { ParticlePool } from "./ParticlePool";

const TEAL = 0x2fe8b0;
const CYAN = 0x18a6e0;
const PURPLE = 0x6b6fe0;
const AMBER = 0xffb020;
const MUTED = 0x4a5a86;

interface Blinker {
  view: Graphics;
  phase: number;
  speed: number;
  color: number;
}

interface SteamSource {
  x: number;
  y: number;
}

/**
 * Rent dekorativt "ambient"-lag: statiske rekvisitter (arbeidsstasjoner,
 * serverskap, paller) pluss små animasjoner (blinkende LED-er, et
 * transportbånd-mønster, damp-/gnistpuff) i hver sone. Formålet er
 * utelukkende å gjøre brettet mer levende å se på — ingenting her påvirker
 * spillmekanikk, kollisjoner eller stifinning.
 */
export class ZoneAmbience {
  readonly view = new Container();
  private readonly blinkers: Blinker[] = [];
  private readonly conveyorLine = new Graphics();
  private conveyorOffset = 0;
  private readonly steamSources: SteamSource[];
  private steamTimerMs = 0;
  private nextSteamDelayMs = 2000;
  private readonly particles: ParticlePool;

  constructor(boardWidth: number, machineNodes: { x: number; y: number }[], particles: ParticlePool) {
    this.particles = particles;
    this.drawOfficeDecor();
    this.drawDmzDecor();
    this.drawBackboneDecor();
    this.drawProductionDecor(boardWidth);
    this.drawCellDecor(machineNodes);

    this.steamSources = machineNodes;
    this.view.addChild(this.conveyorLine);
  }

  private addBlinker(x: number, y: number, radius: number, color: number): void {
    const view = new Graphics().circle(0, 0, radius).fill({ color, alpha: 1 });
    view.position.set(x, y);
    this.view.addChild(view);
    this.blinkers.push({ view, phase: Math.random() * Math.PI * 2, speed: 2 + Math.random() * 2.5, color });
  }

  private desk(x: number, y: number): void {
    const g = new Graphics();
    g.roundRect(x - 12, y - 4, 24, 8, 1.5).fill({ color: MUTED, alpha: 0.4 });
    g.roundRect(x - 8, y - 12, 16, 9, 1).fill({ color: MUTED, alpha: 0.55 });
    this.view.addChild(g);
    this.addBlinker(x, y - 8, 1.3, TEAL);
  }

  private drawOfficeDecor(): void {
    for (const x of [120, 260, 700]) this.desk(x, 80);
  }

  private serverRack(x: number, y: number): void {
    const g = new Graphics();
    g.roundRect(x - 9, y - 16, 18, 32, 2).fill({ color: MUTED, alpha: 0.4 });
    for (let i = 0; i < 3; i++) {
      g.rect(x - 6, y - 12 + i * 9, 12, 1.4).fill({ color: 0x0a0e27, alpha: 0.6 });
    }
    this.view.addChild(g);
    this.addBlinker(x + 5, y - 10, 1.1, CYAN);
    this.addBlinker(x + 5, y + 8, 1.1, TEAL);
  }

  private drawDmzDecor(): void {
    for (const [x, y] of [
      [150, 220],
      [300, 260],
      [960, 220],
      [1110, 260],
    ]) {
      this.serverRack(x, y);
    }
  }

  private cabinet(x: number, y: number): void {
    const g = new Graphics();
    g.roundRect(x - 14, y - 20, 28, 40, 2).fill({ color: MUTED, alpha: 0.38 });
    g.roundRect(x - 10, y - 15, 20, 30, 1).stroke({ width: 1, color: PURPLE, alpha: 0.4 });
    this.view.addChild(g);
    this.addBlinker(x, y - 10, 1.2, PURPLE);
  }

  private drawBackboneDecor(): void {
    this.cabinet(150, 385);
    this.cabinet(1000, 385);
  }

  private crate(x: number, y: number): void {
    const g = new Graphics();
    g.roundRect(x - 10, y - 8, 20, 16, 1.5).fill({ color: AMBER, alpha: 0.28 });
    g.roundRect(x - 10, y - 8, 20, 16, 1.5).stroke({ width: 1, color: AMBER, alpha: 0.4 });
    this.view.addChild(g);
  }

  private drawProductionDecor(boardWidth: number): void {
    for (const x of [395, 675, 885, 1095]) this.crate(x, 472);

    // Transportbånd-mønster: en stiplet linje som "vandrer" sidelengs for å
    // gi produksjonshallene en følelse av kontinuerlig drift.
    this.conveyorLine.position.set(0, 550);
    void boardWidth;
  }

  private ledOnMachine(x: number, y: number): void {
    this.addBlinker(x + 9, y - 9, 1.4, Math.random() > 0.5 ? TEAL : AMBER);
  }

  private drawCellDecor(machineNodes: { x: number; y: number }[]): void {
    for (const node of machineNodes) this.ledOnMachine(node.x, node.y);
  }

  private redrawConveyor(boardWidth: number): void {
    this.conveyorLine.clear();
    const dashLength = 16;
    const gapLength = 14;
    const period = dashLength + gapLength;
    const start = -period + (this.conveyorOffset % period);
    for (let x = start; x < boardWidth; x += period) {
      this.conveyorLine
        .moveTo(x, 0)
        .lineTo(Math.min(x + dashLength, boardWidth), 0)
        .stroke({ width: 2, color: AMBER, alpha: 0.25 });
    }
  }

  update(deltaSeconds: number, boardWidth: number): void {
    for (const blinker of this.blinkers) {
      blinker.phase += deltaSeconds * blinker.speed;
      blinker.view.alpha = 0.25 + Math.abs(Math.sin(blinker.phase)) * 0.75;
    }

    this.conveyorOffset += deltaSeconds * 22;
    this.redrawConveyor(boardWidth);

    this.steamTimerMs += deltaSeconds * 1000;
    if (this.steamTimerMs >= this.nextSteamDelayMs) {
      this.steamTimerMs = 0;
      this.nextSteamDelayMs = 1800 + Math.random() * 2600;
      const source = this.steamSources[Math.floor(Math.random() * this.steamSources.length)];
      if (source) this.particles.puff(source.x, source.y - 6, 0x8fa3c8, 3, 18, 900, 1.8);
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
