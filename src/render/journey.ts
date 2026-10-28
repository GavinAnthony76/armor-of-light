import type { Stage } from '../core/stage';
import type { ChestDef, JourneyDef, RouteGate } from '../core/journey-types';
import type { Theme } from '../core/levels';
import { drawWeapon } from './weapons';

type JourneyEnemy = Stage['enemies'][number] & { miniName?: string };
type JourneyStage = Stage & {
  def: Stage['def'] & { expedition?: JourneyDef };
  exploration: { opened: Set<string>; isGateOpen(g: RouteGate): boolean };
  enemies: JourneyEnemy[];
  pathOpen: boolean;
};

const INK = '#18202d';
const PALE = '#fff2ce';
const METAL = '#b89560';
const THEMES: Record<Theme, { light: string; deep: string; accent: string }> = {
  desert: { light: '#f7d58a', deep: '#8d5844', accent: '#efaa54' },
  flood: { light: '#c8e8e7', deep: '#385f76', accent: '#80d0d0' },
  garden: { light: '#f2dfa1', deep: '#54774e', accent: '#e58e9a' },
  mountain: { light: '#d9e8ee', deep: '#52617f', accent: '#9bd6d1' },
  valley: { light: '#f3d69b', deep: '#755f56', accent: '#c98d67' },
  city: { light: '#e9d1bd', deep: '#494265', accent: '#c692aa' },
  river: { light: '#def1d8', deep: '#568376', accent: '#e6a0a2' },
};

/** Draws journey affordances in world space after terrain, without disclosing hidden loot. */
export function drawJourney(ctx: CanvasRenderingContext2D, s: Stage, time: number, camX: number, viewW: number): void {
  const stage = s as JourneyStage;
  const journey = stage.def.expedition;
  if (!journey || !stage.exploration) return;
  const right = camX + viewW;
  const palette = THEMES[stage.def.theme] ?? THEMES.desert;

  ctx.save();
  // A thin, quiet route thread makes authored vertical traversal legible without becoming a map.
  const route = journey.route;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1];
    const [bx, by] = route[i];
    if (Math.max(ax, bx) < camX - 40 || Math.min(ax, bx) > right + 40) continue;
    ctx.strokeStyle = `${palette.accent}38`;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 9]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const zone of journey.zones) {
    if (zone.x < camX - 100 || zone.x > right + 100) continue;
    drawZoneSign(ctx, zone.name, zone.x, s.terrain.groundAt(zone.x) ?? 450, palette, time);
  }

  for (const gate of journey.gates) {
    if (gate.x < camX - 100 || gate.x > right + 100) continue;
    drawGate(ctx, gate, stage.exploration.isGateOpen(gate), palette, time);
  }

  for (const chest of journey.chests) {
    if (chest.x < camX - 80 || chest.x > right + 80) continue;
    const opened = stage.exploration.opened.has(chest.id);
    if (chest.hidden && !opened) {
      const dx = chest.x - s.player.x;
      const dy = chest.y - s.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 240 || !hasClearSight(s, chest.x, chest.y, s.player.x, s.player.y)) continue;
      // At the edge of discovery, hint at a secret with a quiet glimmer, never an outline.
      if (distance > 132) {
        drawSecretGlint(ctx, chest.x, chest.y, time, palette);
        continue;
      }
    }
    drawChest(ctx, chest, opened, time, palette);
  }

  for (const enemy of stage.enemies) {
    if (!enemy.alive || !enemy.miniName || enemy.x < camX - 100 || enemy.x > right + 100) continue;
    drawMiniBossPlate(ctx, enemy, palette);
  }
  ctx.restore();
}

/** Compact journal hint: what to do next, plus a truthful discovery tally. */
export function journeyObjective(s: Stage): string {
  const stage = s as JourneyStage;
  const journey = stage.def.expedition;
  if (!journey || !stage.exploration) return '';
  const opened = stage.exploration.opened;
  const claimed = journey.chests.filter(chest => opened.has(chest.id)).length;
  const total = journey.chests.length;
  const zone = [...journey.zones].filter(item => item.x <= s.player.x).sort((a, b) => b.x - a.x)[0]
    ?? journey.zones[0];
  const zoneName = zone?.name ?? 'The expedition';
  let action: string;
  if (stage.pathOpen) {
    action=s.awaitingBossReward?'Claim the guardian weapon before leaving':'Guardian defeated · follow the beacon east';
  } else {
    action = nextGateHint(stage, journey) ?? zone?.hint ?? 'Explore the route ahead';
  }
  return `${zoneName} · ${action} · Chests ${claimed}/${total}`;
}

function nextGateHint(stage: JourneyStage, journey: JourneyDef): string | null {
  const gate = journey.gates
    .filter(item => !stage.exploration.isGateOpen(item))
    .sort((a, b) => Math.hypot(a.x - stage.player.x, a.y - stage.player.y) -
      Math.hypot(b.x - stage.player.x, b.y - stage.player.y))[0];
  return gate ? `Find the way to ${gate.name}` : null;
}

function drawChest(ctx: CanvasRenderingContext2D, chest: ChestDef, opened: boolean, time: number,
  palette: { light: string; deep: string; accent: string }): void {
  const { x, y } = chest;
  const bob = opened ? 0 : Math.sin(time * 2.5 + x * 0.013) * 1.4;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(12,17,25,.32)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 23, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Carved feet and a weighty, beveled body sit directly on the authored floor anchor.
  ctx.fillStyle = '#493a36';
  ctx.fillRect(-17, -9, 7, 10);
  ctx.fillRect(10, -9, 7, 10);
  ctx.fillStyle = opened ? '#57443a' : '#76503a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-22, -29, 44, 23, [4, 4, 3, 3]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = opened ? '#8a725a' : '#ad7650';
  ctx.beginPath();
  ctx.moveTo(-20, -27);
  ctx.lineTo(-14, -33);
  ctx.lineTo(14, -33);
  ctx.lineTo(20, -27);
  ctx.lineTo(20, -21);
  ctx.lineTo(-20, -21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = opened ? '#967d61' : '#d3a36a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, -26); ctx.lineTo(-13, -9);
  ctx.moveTo(13, -26); ctx.lineTo(13, -9);
  ctx.moveTo(-20, -17); ctx.lineTo(20, -17);
  ctx.stroke();
  ctx.fillStyle = METAL;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-4, -24, 8, 11, 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = PALE;
  ctx.beginPath(); ctx.arc(0, -20, 1.5, 0, Math.PI * 2); ctx.fill();

  if (opened) {
    // Open lid is unmistakable: hinged upright, with dark empty interior.
    ctx.fillStyle = '#352e31';
    ctx.beginPath(); ctx.ellipse(0, -8, 15, 4, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(-17, -29);
    ctx.rotate(-0.46);
    ctx.fillStyle = '#876449';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(0, -14, 36, 13, [5, 5, 2, 2]); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d0a36b'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(5, -11); ctx.lineTo(31, -11); ctx.stroke();
    ctx.restore();
  } else {
    drawReward(ctx, chest, time);
    ctx.strokeStyle = palette.light;
    ctx.globalAlpha = 0.74;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-10, -35); ctx.lineTo(-6, -39); ctx.moveTo(10, -35); ctx.lineTo(6, -39); ctx.stroke();
  }
  ctx.restore();
}

function drawReward(ctx: CanvasRenderingContext2D, chest: ChestDef, time: number): void {
  const color = chest.reward === 'heart' ? '#ef7182'
    : chest.reward === 'relic' ? '#83d5d0'
      : chest.reward === 'upgrade' ? '#e9c766'
        : chest.reward === 'weapon' ? '#d8e5e4' : '#f1bd62';
  ctx.save();
  ctx.translate(0, -46 + Math.sin(time * 3 + chest.x * 0.02) * 1.5);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (chest.reward === 'weapon' && chest.weapon) {
    ctx.scale(0.34, 0.34);
    drawWeapon(ctx, chest.weapon, 1, { x: 0, y: 7 }, -0.45, time, false, false);
  } else if (chest.reward === 'heart') {
    ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-13, -2, -8, -11, 0, -5);
    ctx.bezierCurveTo(8, -11, 13, -2, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd8d9'; ctx.fillRect(-4, -5, 2, 2);
  } else if (chest.reward === 'upgrade') {
    ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, 0); ctx.lineTo(0, 9); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff0b2'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
  } else if (chest.reward === 'relic') {
    ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, -4); ctx.lineTo(5, 6); ctx.lineTo(0, 10); ctx.lineTo(-5, 6); ctx.lineTo(-7, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4f0c4'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-6, -6); ctx.lineTo(2, -9); ctx.lineTo(9, -3); ctx.lineTo(6, 6); ctx.lineTo(-2, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff1b6'; ctx.fillRect(-2, -5, 2, 5);
  }
  ctx.restore();
}

function drawSecretGlint(ctx: CanvasRenderingContext2D, x: number, y: number, time: number,
  palette: { light: string; deep: string; accent: string }): void {
  const pulse = 0.28 + 0.18 * (0.5 + 0.5 * Math.sin(time * 2.1 + x * 0.017));
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = palette.light;
  ctx.beginPath();
  ctx.moveTo(x, y - 23); ctx.lineTo(x + 2, y - 18); ctx.lineTo(x + 7, y - 16);
  ctx.lineTo(x + 2, y - 14); ctx.lineTo(x, y - 9); ctx.lineTo(x - 2, y - 14);
  ctx.lineTo(x - 7, y - 16); ctx.lineTo(x - 2, y - 18); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawGate(ctx: CanvasRenderingContext2D, gate: RouteGate, isOpen: boolean,
  palette: { light: string; deep: string; accent: string }, time: number): void {
  const { x, y } = gate;
  const shift = isOpen ? 11 : 0;
  ctx.save();
  // Two carved jambs and a small seal; the opening remains visually traversable.
  for (const side of [-1, 1]) {
    const px = x + side * (27 + shift);
    ctx.fillStyle = palette.deep;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 8, y); ctx.lineTo(px - 7, y - 66); ctx.lineTo(px, y - 78);
    ctx.lineTo(px + 7, y - 66); ctx.lineTo(px + 8, y); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.light;
    ctx.fillRect(px - 10, y - 4, 20, 5);
    ctx.strokeStyle = `${palette.light}bb`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, y - 59); ctx.lineTo(px, y - 13); ctx.stroke();
  }
  const cy = y - 41;
  if (!isOpen) {
    ctx.fillStyle = '#423941';
    ctx.strokeStyle = palette.light;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 4, cy); ctx.lineTo(x + 4, cy); ctx.moveTo(x, cy - 5); ctx.lineTo(x, cy + 5); ctx.stroke();
  } else {
    const glow = 0.35 + Math.sin(time * 2.6 + x * 0.01) * 0.08;
    ctx.globalAlpha = glow;
    ctx.fillStyle = palette.accent;
    ctx.beginPath(); ctx.ellipse(x, cy, 8, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.light; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, cy, 5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawZoneSign(ctx: CanvasRenderingContext2D, name: string, x: number, floorY: number,
  palette: { light: string; deep: string; accent: string }, time: number): void {
  const y = floorY - 68;
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = palette.deep;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, y + 7); ctx.stroke();
  ctx.fillStyle = palette.deep;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + 74, y + 2); ctx.lineTo(x + 68, y + 27);
  ctx.lineTo(x, y + 25); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = palette.light;
  ctx.font = '600 10px "Palatino Linotype", Georgia, serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), x + 7, y + 12, 60);
  ctx.globalAlpha = 0.48 + Math.sin(time * 1.4 + x) * 0.08;
  ctx.fillStyle = palette.accent;
  ctx.beginPath(); ctx.arc(x + 72, y + 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMiniBossPlate(ctx: CanvasRenderingContext2D, enemy: JourneyEnemy,
  palette: { light: string; deep: string; accent: string }): void {
  const x = enemy.x;
  const y = enemy.y - 94;
  const name = enemy.miniName!;
  const width = Math.max(112, Math.min(190, name.length * 7 + 24));
  const ratio = enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(18,23,34,.88)';
  ctx.strokeStyle = `${palette.light}cc`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - width / 2, y - 12, width, 30, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = palette.light;
  ctx.font = '700 12px "Palatino Linotype", Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), x, y - 2, width - 12);
  ctx.fillStyle = '#111923';
  ctx.beginPath(); ctx.roundRect(x - width / 2 + 7, y + 8, width - 14, 5, 2); ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.beginPath(); ctx.roundRect(x - width / 2 + 7, y + 8, (width - 14) * ratio, 5, 2); ctx.fill();
  ctx.restore();
}

function hasClearSight(s: Stage, x0: number, y0: number, x1: number, y1: number): boolean {
  const terrain = s.terrain;
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 16));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (terrain.ground.some(segment => x > segment.x0 + 2 && x < segment.x1 - 2 && y > segment.y + 5) ||
      terrain.platforms.some(platform => x > platform.x0 + 2 && x < platform.x1 - 2 && y > platform.y - 2 && y < platform.y + 24)) {
      return false;
    }
  }
  return true;
}
