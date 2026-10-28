import { productionAssets } from '../production/assets';

export type RigPoint = { x: number; y: number };

/**
 * Painted art stays attached to the existing procedural rig. Every image is
 * fitted uniformly: the source artwork is never stretched to meet a joint.
 */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  rotation = 0,
): boolean {
  const image = productionAssets.image(id);
  if (!image || !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return false;
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

export function drawPaintedHead(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number): boolean {
  return drawFitted(ctx, 'eliam-head', x, y, 23, 23, rotation);
}

export function drawPaintedTorso(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number): boolean {
  return drawFitted(ctx, 'eliam-torso', x, y, 25, 34, rotation);
}

export function drawPaintedBoot(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number): boolean {
  return drawFitted(ctx, 'eliam-boot', x, y, 14, 9, rotation);
}

export function drawPaintedSegment(
  ctx: CanvasRenderingContext2D,
  id: 'eliam-thigh' | 'eliam-bracer',
  start: RigPoint,
  end: RigPoint,
  maxWidth: number,
): boolean {
  const image = productionAssets.image(id);
  if (!image || !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return false;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.01) return false;
  const scale = Math.min(length / image.naturalHeight, maxWidth / image.naturalWidth);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.save();
  ctx.translate((start.x + end.x) / 2, (start.y + end.y) / 2);
  ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}
