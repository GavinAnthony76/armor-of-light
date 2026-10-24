/**
 * Level geometry. Ground blocks are solid from their top edge down to the
 * bottom of the world (gaps between them are water or pits). Platforms are
 * one-way: you can jump up through them and land on top.
 */
export interface Span {
  x0: number;
  x1: number;
  y: number;
}

export interface Body {
  x: number; // center
  y: number; // feet
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
}

export class Terrain {
  ground: Span[];
  platforms: Span[];

  constructor(ground: [number, number, number][], platforms: [number, number, number][]) {
    this.ground = ground.map(([x0, x1, y]) => ({ x0, x1, y }));
    this.platforms = platforms.map(([x0, x1, y]) => ({ x0, x1, y }));
  }

  addGround(x0: number, x1: number, y: number): void {
    this.ground.push({ x0, x1, y });
  }

  /** Top surface under a point, searching from `fromY` downward. */
  surfaceBelow(x: number, fromY: number, includePlatforms = true): number | null {
    let best: number | null = null;
    for (const s of this.ground) {
      if (x >= s.x0 && x <= s.x1 && s.y >= fromY - 1 && (best === null || s.y < best)) best = s.y;
    }
    if (includePlatforms) {
      for (const s of this.platforms) {
        if (x >= s.x0 && x <= s.x1 && s.y >= fromY - 1 && (best === null || s.y < best)) best = s.y;
      }
    }
    return best;
  }

  /** Ground block height at x (ignoring platforms), or null over a gap. */
  groundAt(x: number): number | null {
    let best: number | null = null;
    for (const s of this.ground) if (x >= s.x0 && x <= s.x1 && (best === null || s.y < best)) best = s.y;
    return best;
  }

  /**
   * Moves a body with gravity and collisions.
   * `minX`/`maxX` are invisible walls (level ends or arena gates).
   */
  move(b: Body, dt: number, minX: number, maxX: number, opts: { gravity?: number; dropThrough?: boolean } = {}): {
    landed: boolean;
    impact: number;
    hitWall: boolean;
  } {
    const g = opts.gravity ?? 2300;
    const wasGround = b.onGround;
    b.vy = Math.min(1300, b.vy + g * dt);
    let hitWall = false;

    // ---- horizontal
    b.x += b.vx * dt;
    const half = b.w / 2;
    for (const s of this.ground) {
      if (b.x + half <= s.x0 || b.x - half >= s.x1) continue;
      if (b.y <= s.y + 0.5) continue; // standing on or above it
      // small steps are climbed automatically
      if (b.y - s.y <= 14 && wasGround) {
        b.y = s.y;
        continue;
      }
      if (b.vx > 0 && b.x - b.vx * dt + half <= s.x0 + 1) {
        b.x = s.x0 - half;
        hitWall = true;
      } else if (b.vx < 0 && b.x - b.vx * dt - half >= s.x1 - 1) {
        b.x = s.x1 + half;
        hitWall = true;
      }
    }
    if (b.x - half < minX) {
      b.x = minX + half;
      hitWall = true;
    }
    if (b.x + half > maxX) {
      b.x = maxX - half;
      hitWall = true;
    }

    // ---- vertical
    const prevY = b.y;
    b.y += b.vy * dt;
    b.onGround = false;
    let impact = 0;
    if (b.vy >= 0) {
      let land: number | null = null;
      for (const s of this.ground) {
        if (b.x + half - 2 <= s.x0 || b.x - half + 2 >= s.x1) continue;
        if (prevY <= s.y + 1 && b.y >= s.y && (land === null || s.y < land)) land = s.y;
      }
      if (!opts.dropThrough) {
        for (const s of this.platforms) {
          if (b.x + half - 2 <= s.x0 || b.x - half + 2 >= s.x1) continue;
          if (prevY <= s.y + 1 && b.y >= s.y && (land === null || s.y < land)) land = s.y;
        }
      }
      if (land !== null) {
        impact = b.vy;
        b.y = land;
        b.vy = 0;
        b.onGround = true;
      }
    }
    return { landed: b.onGround && !wasGround, impact, hitWall };
  }
}
