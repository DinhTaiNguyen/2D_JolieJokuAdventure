'use strict';
/* ============ small helpers ============ */
const U = {
  TAU: Math.PI * 2,
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  // deterministic RNG (mulberry32) so host & guest generate identical worlds
  rng(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  pick: (r, arr) => arr[(r() * arr.length) | 0],
  range: (r, a, b) => a + r() * (b - a),
  easeOut: t => 1 - Math.pow(1 - t, 3),
  easeInOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  fmtTime(s) { s |= 0; return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); }
};

// surface uncaught errors on screen (helps debugging on phones too)
addEventListener('error', e => {
  let el = document.getElementById('errbox');
  if (!el) {
    el = document.createElement('div');
    el.id = 'errbox';
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:999;background:rgba(70,0,10,.92);color:#ffd7d7;font:11px/1.5 monospace;padding:6px 10px;max-width:100vw;white-space:pre-wrap;pointer-events:none;';
    document.body.appendChild(el);
  }
  if (el.textContent.length < 900) {
    el.textContent += e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno + '\n';
  }
});

// roundRect fallback for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.arcTo(x + w, y, x + w, y + h, r[1]);
    this.arcTo(x + w, y + h, x, y + h, r[2]);
    this.arcTo(x, y + h, x, y, r[3]);
    this.arcTo(x, y, x + w, y, r[0]);
    this.closePath();
    return this;
  };
}
