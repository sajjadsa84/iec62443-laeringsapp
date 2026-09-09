import { Container, Graphics } from "pixi.js";

interface PoolSlot {
  view: Graphics;
  vx: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
  active: boolean;
}

const POOL_SIZE = 96;

/**
 * Enkel gjenbrukspool for korte partikkeleffekter (dødseksplosjoner,
 * treffgnister). I stedet for å opprette/ødelegge Graphics-objekter for hver
 * eneste effekt (som legger press på GC midt i en travel bølge), forhånds-
 * oppretter vi et fast antall og resirkulerer dem — "object pooling" fra
 * spesifikasjonen. Antallet partikler her (maks noen titalls samtidig) er
 * lite nok til at vanlige Graphics-objekter i én Container holder god fart;
 * en tekstur-basert ParticleContainer trengs først ved tusenvis av partikler.
 */
export class ParticlePool {
  readonly view = new Container();
  private readonly slots: PoolSlot[] = [];

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      const view = new Graphics().circle(0, 0, 2).fill(0xffffff);
      view.visible = false;
      this.view.addChild(view);
      this.slots.push({ view, vx: 0, vy: 0, lifeMs: 0, maxLifeMs: 1, active: false });
    }
  }

  /** Spretter `count` partikler ut fra (x,y) i tilfeldige retninger — brukt til dødseksplosjoner og treffgnister. */
  burst(x: number, y: number, color: number, count: number, speed: number, lifeMs: number, radius = 2.5): void {
    for (let i = 0; i < count; i++) {
      const slot = this.acquire();
      if (!slot) return;
      const angle = Math.random() * Math.PI * 2;
      const magnitude = speed * (0.5 + Math.random() * 0.5);
      slot.vx = Math.cos(angle) * magnitude;
      slot.vy = Math.sin(angle) * magnitude;
      slot.lifeMs = 0;
      slot.maxLifeMs = lifeMs * (0.7 + Math.random() * 0.3);
      slot.active = true;
      slot.view.position.set(x, y);
      slot.view.clear().circle(0, 0, radius).fill(color);
      slot.view.alpha = 1;
      slot.view.visible = true;
    }
  }

  /** Noen få partikler som driver svakt oppover — brukt til damp-/gnist-puff fra maskiner, for at anlegget skal føles levende og i drift. */
  puff(x: number, y: number, color: number, count: number, speed: number, lifeMs: number, radius = 2): void {
    for (let i = 0; i < count; i++) {
      const slot = this.acquire();
      if (!slot) return;
      // Retning innenfor en kjegle rett oppover (-90° ±50°) i stedet for hele sirkelen.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * ((Math.PI * 5) / 9);
      const magnitude = speed * (0.5 + Math.random() * 0.5);
      slot.vx = Math.cos(angle) * magnitude;
      slot.vy = Math.sin(angle) * magnitude;
      slot.lifeMs = 0;
      slot.maxLifeMs = lifeMs * (0.7 + Math.random() * 0.3);
      slot.active = true;
      slot.view.position.set(x, y);
      slot.view.clear().circle(0, 0, radius).fill(color);
      slot.view.alpha = 0.8;
      slot.view.visible = true;
    }
  }

  private acquire(): PoolSlot | null {
    return this.slots.find((slot) => !slot.active) ?? null;
  }

  update(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.lifeMs += deltaMs;
      if (slot.lifeMs >= slot.maxLifeMs) {
        slot.active = false;
        slot.view.visible = false;
        continue;
      }
      slot.view.x += slot.vx * deltaSeconds;
      slot.view.y += slot.vy * deltaSeconds;
      slot.vx *= 0.92;
      slot.vy *= 0.92;
      slot.view.alpha = 1 - slot.lifeMs / slot.maxLifeMs;
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
