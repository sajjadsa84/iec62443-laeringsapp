import { Container, Graphics } from "pixi.js";

interface DriftDot {
  view: Graphics;
  vx: number;
  vy: number;
}

const DOT_COUNT = 26;

/**
 * Svakt bevegelig lag bak selve brettet — fjerner følelsen av tomt lerret
 * uten å trekke oppmerksomhet fra spillet. Rene, langsomt driftende prikker
 * i mørk blå, med wrap-around når de går ut av kanten.
 */
export class Background {
  readonly view = new Container();
  private readonly dots: DriftDot[] = [];
  private readonly width: number;
  private readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    for (let i = 0; i < DOT_COUNT; i++) {
      const view = new Graphics().circle(0, 0, 1 + Math.random() * 1.5).fill({ color: 0x2fe8b0, alpha: 0.12 + Math.random() * 0.1 });
      view.position.set(Math.random() * width, Math.random() * height);
      this.view.addChild(view);
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.dots.push({ view, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
  }

  update(deltaSeconds: number): void {
    for (const dot of this.dots) {
      dot.view.x += dot.vx * deltaSeconds;
      dot.view.y += dot.vy * deltaSeconds;
      if (dot.view.x < -5) dot.view.x = this.width + 5;
      if (dot.view.x > this.width + 5) dot.view.x = -5;
      if (dot.view.y < -5) dot.view.y = this.height + 5;
      if (dot.view.y > this.height + 5) dot.view.y = -5;
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
