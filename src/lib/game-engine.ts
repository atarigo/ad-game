import { Application, Graphics, Text, Container } from "pixi.js";
import Matter from "matter-js";

export const W = 400;
export const H = 700;

export const COLORS = {
  bg: 0x0a0a12,
  bgLight: 0x1a0a2e,
  pink: 0xff2d7b,
  cyan: 0x00f0ff,
  yellow: 0xffe156,
  white: 0xe0e0f0,
  muted: 0x8888aa,
  red: 0xff4444,
  green: 0x44ff88,
  blue: 0x4488ff,
  orange: 0xff8844,
  purple: 0xaa44ff,
  water: 0x3399ff,
  lava: 0xff3300,
  gold: 0xffd700,
};

export async function initApp(el: HTMLElement, bg = COLORS.bg) {
  const app = new Application();
  const dpr = window.devicePixelRatio || 1;
  await app.init({
    width: W,
    height: H,
    background: bg,
    antialias: true,
    resolution: dpr,
    autoDensity: true,
  });
  el.appendChild(app.canvas);

  const fit = () => {
    const s = Math.min(el.clientWidth / W, el.clientHeight / H);
    app.canvas.style.width = `${W * s}px`;
    app.canvas.style.height = `${H * s}px`;
  };
  const ro = new ResizeObserver(fit);
  ro.observe(el);
  fit();

  return {
    app,
    cleanup: () => {
      ro.disconnect();
      app.destroy(true);
    },
  };
}

export interface PhysicsBinding {
  body: Matter.Body;
  gfx: Container;
}

export function initPhysics(
  app: Application,
  gravity = { x: 0, y: 1, scale: 0.001 },
) {
  const engine = Matter.Engine.create({ gravity });
  const bindings: PhysicsBinding[] = [];

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.deltaMS, 33);
    Matter.Engine.update(engine, dt);
    for (const b of bindings) {
      b.gfx.x = b.body.position.x;
      b.gfx.y = b.body.position.y;
      b.gfx.rotation = b.body.angle;
    }
  });

  return {
    engine,
    world: engine.world,
    bindings,
    add(body: Matter.Body, gfx: Container) {
      Matter.Composite.add(engine.world, body);
      bindings.push({ body, gfx });
      return { body, gfx };
    },
    addBody(...bodies: Matter.Body[]) {
      Matter.Composite.add(engine.world, bodies);
    },
    remove(body: Matter.Body, gfx?: Container) {
      Matter.Composite.remove(engine.world, body);
      const i = bindings.findIndex((b) => b.body === body);
      if (i >= 0) bindings.splice(i, 1);
      if (gfx) gfx.destroy();
    },
    clear() {
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      bindings.length = 0;
    },
  };
}

export function makeWalls(w = W, h = H, t = 50): Matter.Body[] {
  const opts = { isStatic: true, restitution: 0.2, friction: 0.1 };
  return [
    Matter.Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, opts),
    Matter.Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, opts),
    Matter.Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, opts),
    Matter.Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, opts),
  ];
}

export function centeredText(
  str: string,
  x: number,
  y: number,
  opts?: { size?: number; color?: number; family?: string },
) {
  const text = new Text({
    text: str,
    style: {
      fontFamily: opts?.family ?? "Audiowide, sans-serif",
      fontSize: opts?.size ?? 24,
      fill: opts?.color ?? COLORS.white,
      align: "center",
    },
  });
  text.anchor.set(0.5);
  text.x = x;
  text.y = y;
  return text;
}

export function drawRect(
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  radius = 0,
): Graphics {
  const g = new Graphics();
  if (radius > 0) {
    g.roundRect(-w / 2, -h / 2, w, h, radius);
  } else {
    g.rect(-w / 2, -h / 2, w, h);
  }
  g.fill(color);
  g.x = x;
  g.y = y;
  return g;
}

export function drawCircle(
  x: number,
  y: number,
  r: number,
  color: number,
): Graphics {
  const g = new Graphics();
  g.circle(0, 0, r);
  g.fill(color);
  g.x = x;
  g.y = y;
  return g;
}

export { Matter, Graphics, Text, Container, Application };
