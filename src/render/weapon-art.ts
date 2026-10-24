import type { WeaponProfile } from '../core/weapons';

/** The same readable profile is used on Eliam's hand and on a world drop. */
export function drawWeaponSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  weapon: WeaponProfile,
  rank: number,
  scale = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale * (1 + Math.max(0, rank - 1) * 0.04), scale);
  const gold = weapon.color;
  const shine = weapon.shine;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(34, 0, 2, 34, 0, 34 + rank * 3);
  glow.addColorStop(0, `${gold}66`);
  glow.addColorStop(1, `${gold}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, -36, 74, 72);
  ctx.restore();

  const metal = ctx.createLinearGradient(22, -12, 58, 12);
  metal.addColorStop(0, '#fff8df');
  metal.addColorStop(0.28, shine);
  metal.addColorStop(0.6, gold);
  metal.addColorStop(1, '#536070');
  const outline = '#172032';
  const stroke = (path: () => void, width = 2.2) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width + 2.4;
    ctx.strokeStyle = outline;
    ctx.beginPath();
    path();
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = '#785c43';
    ctx.beginPath();
    path();
    ctx.stroke();
  };
  const blade = (path: () => void) => {
    ctx.beginPath();
    path();
    ctx.fillStyle = metal;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.2;
  };

  if (weapon.kind === 'twinblades') {
    for (const side of [-1, 1]) {
      const yy = side * 8;
      stroke(() => { ctx.moveTo(-7, yy); ctx.lineTo(21, yy); }, 2.7);
      ctx.fillStyle = gold;
      ctx.fillRect(9, yy - 5, 3, 10);
      blade(() => {
        ctx.moveTo(17, yy - 3.5);
        ctx.lineTo(42, yy - 4);
        ctx.lineTo(52, yy);
        ctx.lineTo(42, yy + 4);
        ctx.lineTo(17, yy + 3.5);
        ctx.closePath();
      });
    }
  } else if (weapon.kind === 'spear') {
    stroke(() => { ctx.moveTo(-8, 0); ctx.lineTo(70, 0); }, 3);
    blade(() => {
      ctx.moveTo(63, -6);
      ctx.lineTo(81, 0);
      ctx.lineTo(63, 6);
      ctx.lineTo(68, 0);
      ctx.closePath();
    });
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.lineTo(10, 4);
    ctx.moveTo(13, -4);
    ctx.lineTo(18, 4);
    ctx.stroke();
  } else if (weapon.kind === 'glaive') {
    stroke(() => { ctx.moveTo(-8, 0); ctx.lineTo(42, 0); }, 3.2);
    blade(() => {
      ctx.moveTo(33, -3);
      ctx.quadraticCurveTo(43, -21, 65, -18);
      ctx.quadraticCurveTo(63, -3, 47, 2);
      ctx.lineTo(42, 7);
      ctx.quadraticCurveTo(36, 2, 33, -3);
      ctx.closePath();
    });
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(39, -3);
    ctx.quadraticCurveTo(51, -15, 61, -15);
    ctx.stroke();
    blade(() => {
      ctx.moveTo(34, 3);
      ctx.quadraticCurveTo(43, 19, 55, 16);
      ctx.quadraticCurveTo(48, 5, 39, 1);
      ctx.closePath();
    });
  } else if (weapon.kind === 'sabre') {
    stroke(() => { ctx.moveTo(-8, 0); ctx.lineTo(20, 0); }, 3);
    blade(() => {
      ctx.moveTo(17, -4);
      ctx.quadraticCurveTo(38, -6, 58, -17);
      ctx.quadraticCurveTo(53, -2, 61, 5);
      ctx.quadraticCurveTo(39, -1, 20, 5);
      ctx.closePath();
    });
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(43, -2, 56, -13);
    ctx.stroke();
  } else if (weapon.kind === 'maul') {
    stroke(() => { ctx.moveTo(-8, 0); ctx.lineTo(35, 0); }, 4);
    const head = ctx.createLinearGradient(29, -14, 49, 14);
    head.addColorStop(0, shine);
    head.addColorStop(0.45, gold);
    head.addColorStop(1, '#6f4d37');
    ctx.fillStyle = head;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(29, -10);
    ctx.lineTo(33, -14);
    ctx.lineTo(48, -11);
    ctx.lineTo(51, -7);
    ctx.lineTo(50, 8);
    ctx.lineTo(46, 12);
    ctx.lineTo(32, 10);
    ctx.lineTo(28, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(33, -10);
    ctx.lineTo(46, -8);
    ctx.moveTo(32, 6);
    ctx.lineTo(46, 8);
    ctx.stroke();
  } else if (weapon.kind === 'greatsword') {
    stroke(() => { ctx.moveTo(-8, 0); ctx.lineTo(23, 0); }, 3.4);
    ctx.fillStyle = gold;
    ctx.fillRect(15, -10, 4, 20);
    blade(() => {
      ctx.moveTo(20, -6);
      ctx.lineTo(45, -12);
      ctx.lineTo(68, 0);
      ctx.lineTo(45, 12);
      ctx.lineTo(20, 6);
      ctx.closePath();
    });
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(61, 0);
    ctx.stroke();
  } else {
    stroke(() => { ctx.moveTo(-8, 0); ctx.lineTo(20, 0); }, 3);
    ctx.fillStyle = gold;
    ctx.fillRect(14, -9, 4, 18);
    blade(() => {
      ctx.moveTo(19, -5);
      ctx.lineTo(48, -7);
      ctx.lineTo(62, 0);
      ctx.lineTo(48, 7);
      ctx.lineTo(19, 5);
      ctx.closePath();
    });
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(56, 0);
    ctx.stroke();
  }

  // Rank marks sit on the guard and remain readable at game scale.
  if (rank >= 2) {
    ctx.strokeStyle = shine;
    ctx.lineWidth = rank === 3 ? 2.2 : 1.4;
    ctx.beginPath();
    ctx.arc(15, 0, rank === 3 ? 11 : 8, -Math.PI * 0.65, Math.PI * 0.65);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff4ca';
  for (let i = 0; i < Math.max(0, Math.min(3, rank)); i++) {
    ctx.beginPath();
    ctx.arc(10 + i * 4, -7, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
