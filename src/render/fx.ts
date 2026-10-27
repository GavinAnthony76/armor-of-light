/** Presentation-only particles. World coordinates. */

export type ParticleKind = 'spark' | 'dust' | 'wisp' | 'smoke' | 'ring' | 'drop' | 'ember' | 'flash' | 'shard' | 'impact';

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
  drag: number;
  rot: number;
  vr: number;
  seed: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Fx {
  list: Particle[] = [];
  private cap = 450;

  add(kind: ParticleKind, x: number, y: number, o: Partial<Particle> = {}): void {
    if (this.list.length >= this.cap) this.list.shift();
    const life = o.life ?? 0.6;
    this.list.push({
      kind, x, y, vx: 0, vy: 0, life, max: life, size: 4, color: '#fff', grav: 0, drag: 2,
      rot: Math.random() * 6, vr: 0, seed: Math.random() * 100, ...o,
    });
  }

  clear(): void {
    this.list = [];
  }

  // ---------------------------------------------------------- recipes

  sparks(x: number, y: number, n: number, color: string, speed = 420, dir = 0, spread = Math.PI): void {
    for (let i = 0; i < n; i++) {
      const a = dir + rand(-spread, spread);
      const s = rand(0.35, 1) * speed;
      this.add('spark', x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.18, 0.4), size: rand(2, 3.5), color, grav: 700, drag: 4 });
    }
  }

  dust(x: number, y: number, n: number, color: string, spread = 30, up = 60): void {
    for (let i = 0; i < n; i++) {
      this.add('dust', x + rand(-spread, spread) * 0.4, y - 2, {
        vx: rand(-1, 1) * spread * 3, vy: -rand(10, up), life: rand(0.4, 0.8), size: rand(5, 11), color, drag: 3, grav: -20,
      });
    }
  }

  /** Defeated shadows dissolve into rising light. */
  dissolve(x: number, y: number, w: number, h: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.add('wisp', x + rand(-w / 2, w / 2), y + rand(-h / 2, h / 2), {
        vx: rand(-40, 40), vy: -rand(40, 160), life: rand(0.8, 1.7), size: rand(2, 5), color: i % 3 ? '#ffe7a8' : '#ffffff', drag: 1, grav: -40,
      });
    }
    for (let i = 0; i < n / 2; i++) {
      this.add('smoke', x + rand(-w / 2, w / 2), y + rand(-h / 2, h / 2), {
        vx: rand(-60, 60), vy: -rand(10, 60), life: rand(0.5, 1), size: rand(8, 18), color: '#2a1840', drag: 2,
      });
    }
    this.add('flash', x, y, { life: 0.25, size: Math.max(w, h) * 1.3, color: '#fff4d0' });
  }

  ring(x: number, y: number, size: number, color: string, life = 0.4): void {
    this.add('ring', x, y, { size, life, color });
  }

  splash(x: number, y: number): void {
    for (let i = 0; i < 26; i++) {
      this.add('drop', x + rand(-14, 14), y, { vx: rand(-160, 160), vy: -rand(200, 520), life: rand(0.5, 0.9), size: rand(2, 4), color: '#cfe8ff', grav: 1400, drag: 0.5 });
    }
    this.ring(x, y, 50, '#cfe8ff', 0.5);
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.life -= dt;
      const d = Math.pow(1 / (1 + p.drag), dt);
      p.vx *= d;
      p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  /** Normal-blended particles (dust, smoke, drops). */
  drawBase(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const k = Math.max(0, p.life / p.max);
      switch (p.kind) {
        case 'dust':
          ctx.globalAlpha = k * 0.5;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'smoke':
          ctx.globalAlpha = k * 0.38;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.4 - k * 0.4), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'drop':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size, p.size, p.size * 2);
          break;
        case 'shard':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Glowing particles, drawn with additive blending. */
  drawGlow(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const k = Math.max(0, p.life / p.max);
      switch (p.kind) {
        case 'impact': {
          // Brief ink-edged contact burst, not another full-screen flash.
          ctx.save();
          ctx.globalCompositeOperation='source-over';
          ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.globalAlpha=Math.min(1,k*2);
          ctx.fillStyle=p.color;ctx.strokeStyle='#382235';ctx.lineWidth=2;
          const radius=p.size*(1.1-k*.25);
          ctx.beginPath();
          for(let i=0;i<16;i++){
            const a=i*Math.PI/8,r=radius*(i%2?.32:1);
            const x=Math.cos(a)*r,y=Math.sin(a)*r*.7;
            if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
          ctx.closePath();ctx.fill();ctx.stroke();
          ctx.restore();
          break;
        }
        case 'spark': {
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
          break;
        }
        case 'wisp':
        case 'ember': {
          const wob = Math.sin(p.seed + p.life * 7) * 6;
          ctx.globalAlpha = Math.min(1, k * 1.5) * 0.9;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x + wob, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha *= 0.3;
          ctx.beginPath();
          ctx.arc(p.x + wob, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'ring': {
          const t = 1 - k;
          ctx.globalAlpha = k * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4 * k + 1;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * (0.3 + t), p.size * (0.3 + t) * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'flash': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.globalAlpha = k;
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
