'use strict';
/* ============ particle system (pooled-ish, capped) ============ */
const Ptc = {
  list: [],
  MAX: 320,

  add(p) {
    if (this.list.length >= this.MAX) this.list.shift();
    p.t = 0;
    p.life = p.life || .8;
    this.list.push(p);
  },

  // convenience bursts
  burst(kind, x, y, n, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = opt.arc != null ? opt.arc + (Math.random() - .5) * (opt.spread || 1.2) : Math.random() * U.TAU;
      const sp = (opt.sp || 120) * (0.4 + Math.random() * 0.9);
      this.add({
        kind, x: x + (Math.random() - .5) * (opt.jx || 8), y: y + (Math.random() - .5) * (opt.jx || 8),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 0),
        r: (opt.r || 4) * (0.6 + Math.random() * 0.8),
        color: opt.color, life: (opt.life || .8) * (0.7 + Math.random() * 0.6),
        g: opt.g != null ? opt.g : 0, spin: (Math.random() - .5) * 6
      });
    }
  },

  text(x, y, str, color) {
    this.add({ kind: 'text', x, y, vx: 0, vy: -55, str, color: color || '#fff', life: 1.1, g: 0, r: 13 });
  },

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt;
      if (p.t >= p.life) { L.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      if (p.kind === 'butterfly') { // wandering flutter
        p.vx = Math.sin(p.t * 1.8 + p.spin * 9) * 40;
        p.vy = Math.sin(p.t * 2.6 + p.spin * 5) * 22 - 5;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'petal' || p.kind === 'heart') { p.vx *= (1 - 1.6 * dt); p.vy *= (1 - 1.2 * dt); }
    }
  },

  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life; // fade-out factor
      ctx.globalAlpha = Math.min(1, k * 1.6);
      switch (p.kind) {
        case 'dot': // additive glow dot
          ctx.globalCompositeOperation = 'lighter';
          Art.glow(ctx, p.x, p.y, p.r * (0.5 + k), p.color || '#8fe0ff', .9 * k);
          ctx.globalCompositeOperation = 'source-over';
          break;
        case 'spark':
          ctx.fillStyle = p.color || '#ffe9a8';
          ctx.fillRect(p.x - p.r * .4, p.y - p.r * .4, p.r * .8, p.r * .8);
          break;
        case 'drop': // water droplet
          ctx.fillStyle = p.color || 'rgba(120,200,255,.9)';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * .5, p.r * .8, 0, 0, U.TAU); ctx.fill();
          break;
        case 'heart':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.t * 5 + p.spin) * .3);
          ctx.scale(0.5 + k * .7, 0.5 + k * .7);
          Art.heart(ctx, 0, 0, p.r, p.color || '#ff7fb5');
          ctx.restore();
          break;
        case 'petal':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * p.spin * 2);
          ctx.fillStyle = p.color || '#ffb3d6';
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .45, 0, 0, U.TAU); ctx.fill();
          ctx.restore();
          break;
        case 'ring': {
          const rr = p.r * (0.3 + (p.t / p.life) * 1.4);
          ctx.strokeStyle = p.color || 'rgba(255,180,220,.9)';
          ctx.lineWidth = 3 * k;
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, U.TAU); ctx.stroke();
          break;
        }
        case 'star': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 3);
          ctx.fillStyle = p.color || '#fff3b0';
          for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p.r, 0); ctx.lineTo(p.r * .3, p.r * .3); ctx.fill();
          }
          ctx.restore();
          break;
        }
        case 'butterfly': {
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.scale(p.vx >= 0 ? 1 : -1, 1);
          const fl = Math.sin(p.t * 26) * .9;
          ctx.fillStyle = p.color || '#ffb3d6';
          for (const s of [-1, 1]) {
            ctx.save(); ctx.rotate(s * fl * .8);
            ctx.beginPath(); ctx.ellipse(0, s * -1, 4.5, 2.6, s * .7, 0, U.TAU); ctx.fill();
            ctx.restore();
          }
          ctx.fillStyle = 'rgba(60,40,50,.9)';
          ctx.fillRect(-.7, -2.5, 1.4, 5);
          ctx.restore();
          break;
        }
        case 'text':
          ctx.font = `700 ${p.r}px Fredoka, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)';
          ctx.strokeText(p.str, p.x, p.y);
          ctx.fillStyle = p.color; ctx.fillText(p.str, p.x, p.y);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
};
