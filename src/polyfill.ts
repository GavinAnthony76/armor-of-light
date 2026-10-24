// Canvas roundRect is missing on some older browsers (e.g. Safari < 16).
const proto = CanvasRenderingContext2D.prototype as CanvasRenderingContext2D & { roundRect?: unknown };
if (typeof proto.roundRect !== 'function') {
  proto.roundRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r?: number | DOMPointInit | (number | DOMPointInit)[]) {
    const rr = typeof r === 'number' ? r : Array.isArray(r) ? (typeof r[0] === 'number' ? r[0] : 0) : 0;
    const k = Math.min(rr, w / 2, h / 2);
    this.moveTo(x + k, y);
    this.arcTo(x + w, y, x + w, y + h, k);
    this.arcTo(x + w, y + h, x, y + h, k);
    this.arcTo(x, y + h, x, y, k);
    this.arcTo(x, y, x + w, y, k);
    this.closePath();
  } as CanvasRenderingContext2D['roundRect'];
}
export {};
