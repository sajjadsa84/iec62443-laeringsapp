import { Text } from "pixi.js";

const RISE_PX = 34;
const DURATION_MS = 950;
const FADE_IN_FRACTION = 0.12;
const FADE_OUT_FRACTION = 0.35;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Kortvarig svevende tekst ("Blokkert!", "-10") som toner mykt inn, stiger
 * med avtagende fart (ease-out, ikke lineært), og toner mykt ut mot slutten
 * — ikke bare et hardt hopp inn og en lineær forsvinning.
 * Ren Pixi-klasse, eid og oppdatert av GameLoop akkurat som Attacker/DefenseNode.
 */
export class FloatingText {
  readonly view: Text;
  isRemovable = false;
  private elapsedMs = 0;
  private readonly startY: number;

  constructor(text: string, x: number, y: number, color: number) {
    this.view = new Text({
      text,
      style: { fontSize: 15, fontWeight: "bold", fill: color, stroke: { color: 0x0a0e27, width: 3 } },
    });
    this.view.anchor.set(0.5);
    this.view.x = x;
    this.view.y = y;
    this.startY = y;
    this.view.alpha = 0;
    this.view.scale.set(0.7);
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    const progress = Math.min(this.elapsedMs / DURATION_MS, 1);

    this.view.y = this.startY - RISE_PX * easeOutCubic(progress);

    if (progress < FADE_IN_FRACTION) {
      const t = progress / FADE_IN_FRACTION;
      this.view.alpha = t;
      this.view.scale.set(0.7 + 0.3 * t);
    } else if (progress > 1 - FADE_OUT_FRACTION) {
      const t = (progress - (1 - FADE_OUT_FRACTION)) / FADE_OUT_FRACTION;
      this.view.alpha = 1 - t;
      this.view.scale.set(1);
    } else {
      this.view.alpha = 1;
      this.view.scale.set(1);
    }

    if (progress >= 1) this.isRemovable = true;
  }

  destroy(): void {
    this.view.destroy();
  }
}
