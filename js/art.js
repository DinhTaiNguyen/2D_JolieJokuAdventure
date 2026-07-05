'use strict';
/* ============ all visuals are procedural — no image assets ============ */
const Art = {
  _glowCache: new Map(),

  /* soft radial glow sprite, cached per color */
  glow(ctx, x, y, r, color, alpha = 1) {
    let cv = this._glowCache.get(color);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const g = cv.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      gr.addColorStop(0, color);
      gr.addColorStop(.4, color + (color.length === 7 ? '88' : ''));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      this._glowCache.set(color, cv);
    }
    ctx.globalAlpha *= alpha;
    ctx.drawImage(cv, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  },

  heart(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * .32);
    ctx.bezierCurveTo(x - s, y - s * .48, x - s * .5, y - s * 1.1, x, y - s * .4);
    ctx.bezierCurveTo(x + s * .5, y - s * 1.1, x + s, y - s * .48, x, y + s * .32);
    ctx.fill();
  },

  star(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * .45 : s;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  },

  limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  },

  drawHeldWeapon(ctx, p, t, x, y, atk) {
    if (!p.weapon || !Weapons[p.weapon]) return;
    const def = Weapons[p.weapon];
    const flash = U.clamp(p.weaponPose || 0, 0, 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((atk ? -.55 : -.22) + Math.sin(t * 3) * .035);
    const size = atk ? 27 : 22;
    if (flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 0, 0, 30 + flash * 30, def.color, .28 + flash * .45);
      ctx.globalCompositeOperation = 'source-over';
      ctx.scale(1 + flash * .18, 1 + flash * .18);
    }
    this.drawWeaponGlyph(ctx, p.weapon, 0, 0, size, t);
    ctx.restore();
  },

  /* ================= JOKU — phoenix of the ocean 💙 ================= */
  drawJoku(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.pose === 'down') { ctx.rotate(-1.25 * p.dir); ctx.translate(0, -6); }
    ctx.scale(p.dir * 1.14, 1.14);
    const sq = p.squash || 0;
    ctx.scale(1 + sq * .35, 1 - sq * .35);

    const run = Math.abs(p.vx) > 30 && p.onGround;
    const ph = p.animT * 13;
    const air = !p.onGround;
    const swing = run ? Math.sin(ph) : 0;
    const bounce = run ? Math.abs(Math.sin(ph)) * 2.5 : Math.sin(t * 2.2) * 1.2;
    const hug = p.pose === 'hug' || p.pose === 'kiss';
    const atk = p.atkT != null && p.atkT < .28;

    // ---- phoenix wings: three feather blades each side ----
    if (p.wing > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = p.wing * .9;
      const flap = Math.sin(t * 15) * .3;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(-5, -37 - bounce);
        ctx.rotate(s * (.5 + flap) - .45);
        for (let f = 0; f < 3; f++) {
          const len = (46 - f * 10) * p.wing, wdt = 10 - f * 2;
          ctx.save();
          ctx.rotate(-f * .3 - .15);
          const grd = ctx.createLinearGradient(0, 0, -len, 0);
          grd.addColorStop(0, 'rgba(190,245,255,.95)');
          grd.addColorStop(.5, 'rgba(90,180,255,.65)');
          grd.addColorStop(1, 'rgba(30,90,220,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-len * .5, -wdt, -len, -wdt * .3);
          ctx.quadraticCurveTo(-len * .55, wdt * .55, 0, wdt * .4);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    const armSw = run ? -swing : 0;
    const cheer = p.cheerT > 0 && !hug && !atk;
    // ---- back arm (behind torso) ----
    if (cheer) this.limb(ctx, -6, -37 - bounce, -11, -50 - bounce, 5.5, '#24509e');
    else if (hug) this.limb(ctx, -6, -37 - bounce, 8, -44 - bounce, 5.5, '#24509e');
    else if (atk) this.limb(ctx, -6, -37 - bounce, -10, -27 - bounce, 5.5, '#24509e');
    else this.limb(ctx, -6, -37 - bounce, -7 + armSw * 7, -25 + Math.abs(armSw) * 3 - bounce, 5.5, '#24509e');

    // ---- legs: pants + cuffed boots ----
    const legA = air ? .5 : swing;
    const legB = air ? -.25 : -swing;
    for (const [hp, sw2, col] of [[-2.5, legA, '#20264a'], [3.5, legB, '#2a3060']]) {
      const fx = hp + sw2 * 8.5;
      this.limb(ctx, hp, -21 + bounce * .3, fx, -3, 7, col);
      ctx.fillStyle = '#2e6ad1';
      ctx.beginPath(); ctx.roundRect(fx - 5, -6.5, 12, 6.5, [3, 4, 2, 2]); ctx.fill();
      ctx.fillStyle = '#4f8fe8';
      ctx.fillRect(fx - 5, -7.5, 12, 2.4);
    }

    ctx.translate(0, -bounce);

    // ---- torso: hero jacket ----
    const grd2 = ctx.createLinearGradient(0, -44, 0, -19);
    grd2.addColorStop(0, '#3878e0'); grd2.addColorStop(1, '#1c3a88');
    ctx.fillStyle = grd2;
    ctx.beginPath(); ctx.roundRect(-9.5, -43, 19, 23, 7); ctx.fill();
    ctx.fillStyle = '#eef6ff';
    ctx.beginPath(); ctx.roundRect(-3, -42, 8.5, 21, 4); ctx.fill();
    // wave emblem on the panel
    ctx.strokeStyle = '#3878e0'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(1.2, -33, 2.6, Math.PI * .1, Math.PI * .9, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(1.2, -30.5, 2.6, Math.PI * .1, Math.PI * .9, true); ctx.stroke();
    // shoulder pads
    ctx.fillStyle = '#4f8fe8';
    ctx.beginPath(); ctx.ellipse(-7, -41, 4, 3, .3, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7.5, -41, 4, 3, -.3, 0, U.TAU); ctx.fill();
    // belt + buckle
    ctx.fillStyle = '#f5c76a'; ctx.fillRect(-9.5, -24.5, 19, 3.4);
    ctx.fillStyle = '#ffe6a8'; ctx.beginPath(); ctx.arc(1, -22.8, 2.2, 0, U.TAU); ctx.fill();

    // ---- scarf: two flowing tails ----
    const fl1 = Math.sin(t * 7) * 3, fl2 = Math.sin(t * 7 + 1.5) * 3;
    const spd = Math.min(14, Math.abs(p.vx) * .03);
    ctx.fillStyle = '#9fdcff';
    ctx.beginPath();
    ctx.moveTo(-7, -41);
    ctx.quadraticCurveTo(-16 - spd, -37 + fl1, -22 - spd, -30 + fl1);
    ctx.quadraticCurveTo(-15, -27 + fl1 * .5, -8, -34);
    ctx.fill();
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath();
    ctx.moveTo(-6, -40);
    ctx.quadraticCurveTo(-13 - spd, -34 + fl2, -17 - spd, -25 + fl2);
    ctx.quadraticCurveTo(-11, -25 + fl2 * .4, -6, -33);
    ctx.fill();
    ctx.fillStyle = '#8fd2ff';
    ctx.beginPath(); ctx.roundRect(-7, -44.5, 14, 5, 2.5); ctx.fill();

    // ---- head ----
    const tilt = p.pose === 'kiss' ? .18 : 0;
    ctx.save();
    ctx.translate(1, -51); ctx.rotate(tilt);
    // back hair spike
    ctx.fillStyle = '#101f4e';
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.quadraticCurveTo(-15, -6, -12, -10);
    ctx.lineTo(-16.5, -5);
    ctx.quadraticCurveTo(-14, 2, -12, 5);
    ctx.fill();
    // face + ear
    ctx.fillStyle = '#ffd9b8';
    ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#f8cba3';
    ctx.beginPath(); ctx.ellipse(-9.5, 1, 2.2, 3, 0, 0, U.TAU); ctx.fill();
    // spiky hair: covers the crown and sweeps down both sides
    ctx.fillStyle = '#16275c';
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.quadraticCurveTo(-14.5, -6, -9.5, -12.5);
    ctx.lineTo(-10, -6.5);
    ctx.lineTo(-4.5, -15.5); ctx.lineTo(-3.4, -8.5);
    ctx.lineTo(2, -16.8); ctx.lineTo(3, -9);
    ctx.lineTo(8.2, -14.5); ctx.lineTo(8.4, -7.8);
    ctx.lineTo(13, -10.5);
    ctx.quadraticCurveTo(14.2, -4, 12.6, 1.5);
    ctx.quadraticCurveTo(11.2, -3.5, 8.8, -5);
    ctx.quadraticCurveTo(10, -1.5, 9, .5);
    ctx.quadraticCurveTo(6.5, -5.5, 1.5, -6.2);
    ctx.quadraticCurveTo(-5.5, -6.8, -9, -4);
    ctx.quadraticCurveTo(-11.2, -1.5, -12, 4);
    ctx.fill();
    // subtle highlight ticks on the spikes
    ctx.strokeStyle = '#2c479e'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4.2, -10.5); ctx.lineTo(-3.6, -13.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.2, -11); ctx.lineTo(2.4, -14.5); ctx.stroke();
    // eyes
    if (p.hurtT > 0) { // ouch! >_<
      ctx.strokeStyle = '#1a2340'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const ex of [3.9, 9.5]) {
        ctx.beginPath(); ctx.moveTo(ex - 1.8, -2.7); ctx.lineTo(ex + 1.4, -.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex - 1.8, .9); ctx.lineTo(ex + 1.4, -.9); ctx.stroke();
      }
    } else if (p.pose === 'kiss' || (p.blink > 0)) {
      ctx.strokeStyle = '#1a2340'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(1.8, -.8); ctx.quadraticCurveTo(3.8, .8, 5.8, -.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7.8, -.8); ctx.quadraticCurveTo(9.5, .8, 11, -.8); ctx.stroke();
    } else {
      for (const [ex, rx] of [[3.9, 2.6], [9.5, 2.4]]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex, -1.2, rx, 3.4, 0, 0, U.TAU); ctx.fill();
        const ig = ctx.createRadialGradient(ex + .3, -1.5, .2, ex + .3, -.8, 2);
        ig.addColorStop(0, '#5a9af0'); ig.addColorStop(1, '#173a8e');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(ex + .4, -.8, 1.9, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#0c1830';
        ctx.beginPath(); ctx.arc(ex + .5, -.7, .9, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex - .3, -1.8, .7, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 1.1, .1, .35, 0, U.TAU); ctx.fill();
      }
      ctx.strokeStyle = '#1c2f66'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(1.8, -5.2); ctx.lineTo(5.6, -5.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7.9, -5.7); ctx.lineTo(11, -5.1); ctx.stroke();
    }
    // blush when close to her
    if (hug) {
      ctx.fillStyle = 'rgba(255,120,140,.35)';
      ctx.beginPath(); ctx.ellipse(2, 3.4, 2.2, 1.2, 0, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(10.6, 3.4, 2.2, 1.2, 0, 0, U.TAU); ctx.fill();
    }
    // mouth
    if (p.pose === 'kiss') {
      ctx.fillStyle = '#d87a5a';
      ctx.beginPath(); ctx.arc(10.6, 3.4, 1.5, 0, U.TAU); ctx.fill();
    } else if (p.hurtT > 0) {
      ctx.fillStyle = '#8a3c2c';
      ctx.beginPath(); ctx.ellipse(7.4, 4.6, 1.7, 2.1, 0, 0, U.TAU); ctx.fill();
    } else {
      ctx.strokeStyle = '#b85c40'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(5, 4.8); ctx.quadraticCurveTo(7.5, 6.6, 10, 4.6); ctx.stroke();
    }
    ctx.restore();

    // ---- front arm (with visible hand) ----
    if (cheer) {
      this.limb(ctx, 6, -37, 12, -51, 5.5, '#3878e0');
      ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(12.5, -51.5, 2.6, 0, U.TAU); ctx.fill();
    } else if (hug) {
      this.limb(ctx, 6, -37, 13, -44, 5.5, '#3878e0');
      ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(13.5, -44.5, 2.6, 0, U.TAU); ctx.fill();
    } else if (atk) {
      this.limb(ctx, 6, -37, 17.5, -36, 5.5, '#3878e0');
      ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(18.5, -36, 2.8, 0, U.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 20, -36, 12, '#7fd8ff', .95);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      this.limb(ctx, 6, -37, 8 - armSw * 7, -25 + Math.abs(armSw) * 3, 5.5, '#3878e0');
      ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(8.4 - armSw * 7, -24 + Math.abs(armSw) * 3, 2.4, 0, U.TAU); ctx.fill();
    }
    this.drawHeldWeapon(ctx, p, t, atk ? 22 : (cheer ? 14 : 12 - armSw * 5), atk ? -38 : (cheer ? -52 : -27 + Math.abs(armSw) * 2), atk || p.weaponPose > 0);

    // ---- dash: leading water crescent ----
    if (p.dashT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .85;
      const cg = ctx.createLinearGradient(10, 0, 36, 0);
      cg.addColorStop(0, 'rgba(160,230,255,0)');
      cg.addColorStop(1, 'rgba(120,210,255,.9)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(12, -58);
      ctx.quadraticCurveTo(38, -33, 12, -8);
      ctx.quadraticCurveTo(25, -33, 12, -58);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
    this._statusFx(ctx, p, t, '#7fd8ff');
  },

  /* ================= JOLIE — heart of the flowers 💗 ================= */
  _skirt(ctx, x0, top, halfW, hemY, t, phase) { // scalloped layered skirt
    const wob = Math.sin(t * 6 + phase) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(-x0, top);
    ctx.quadraticCurveTo(halfW * .8, (top + hemY) / 2, halfW, hemY + wob);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const xA = halfW - (i * 2 * halfW) / n;
      const xB = halfW - ((i + 1) * 2 * halfW) / n;
      ctx.quadraticCurveTo((xA + xB) / 2, hemY + 4.5 + wob * (i % 2 ? -1 : 1), xB, hemY + (i === n - 1 ? wob : 0));
    }
    ctx.quadraticCurveTo(-halfW * .8, (top + hemY) / 2, x0, top);
    ctx.fill();
  },

  drawJolie(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.pose === 'down') { ctx.rotate(-1.25 * p.dir); ctx.translate(0, -6); }
    ctx.scale(p.dir * 1.14, 1.14);
    const sq = p.squash || 0;
    ctx.scale(1 + sq * .35, 1 - sq * .35);

    const run = Math.abs(p.vx) > 30 && p.onGround;
    const ph = p.animT * 13;
    const air = !p.onGround;
    const swing = run ? Math.sin(ph) : 0;
    const bounce = run ? Math.abs(Math.sin(ph)) * 2.5 : Math.sin(t * 2.4 + 1) * 1.2;
    const hug = p.pose === 'hug' || p.pose === 'kiss';
    const atk = p.atkT != null && p.atkT < .28;

    // glide petals swirl
    if (p.glide) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = t * 5 + i * 1.57;
        this.glow(ctx, Math.cos(a) * 19, -30 + Math.sin(a) * 11, 7, '#ff9fce', .5);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---- long hair: three layers, swaying ----
    const sway = Math.sin(t * 3) * 2.2 + Math.min(8, Math.abs(p.vx) * .02);
    ctx.fillStyle = '#54301a';
    ctx.beginPath();
    ctx.moveTo(-3, -59 - bounce);
    ctx.quadraticCurveTo(-15, -52 - bounce, -14 - sway, -32);
    ctx.quadraticCurveTo(-15 - sway * 1.5, -18, -10 - sway, -13);
    ctx.quadraticCurveTo(-7, -20, -8, -30);
    ctx.quadraticCurveTo(-9, -45, -2, -52 - bounce);
    ctx.fill();
    ctx.fillStyle = '#744424';
    ctx.beginPath();
    ctx.moveTo(-4, -58 - bounce);
    ctx.quadraticCurveTo(-13, -50 - bounce, -11.5 - sway, -34);
    ctx.quadraticCurveTo(-12 - sway * 1.3, -22, -7.5 - sway * .8, -16);
    ctx.quadraticCurveTo(-5, -24, -6, -36);
    ctx.quadraticCurveTo(-6.5, -48, -1, -53 - bounce);
    ctx.fill();
    ctx.strokeStyle = '#9a6438'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -50 - bounce);
    ctx.quadraticCurveTo(-10, -38, -9 - sway, -22);
    ctx.stroke();

    // ---- back arm ----
    const armSw = run ? -swing : 0;
    const cheer = p.cheerT > 0 && !hug && !atk;
    if (cheer) this.limb(ctx, -5, -37 - bounce, -10, -49 - bounce, 5, '#f0a0c2');
    else if (hug) this.limb(ctx, -5, -37 - bounce, 8, -43 - bounce, 5, '#f0a0c2');
    else if (atk) this.limb(ctx, -5, -37 - bounce, -9, -27 - bounce, 5, '#f0a0c2');
    else this.limb(ctx, -5, -37 - bounce, -6 + armSw * 6, -25 + Math.abs(armSw) * 3 - bounce, 5, '#f0a0c2');

    // ---- legs: stockings + rose boots ----
    const legA = air ? .5 : swing;
    const legB = air ? -.25 : -swing;
    for (const [hp, sw2, col] of [[-2.5, legA, '#ffe9d9'], [3.5, legB, '#fff2e6']]) {
      const fx = hp + sw2 * 8;
      this.limb(ctx, hp, -20 + bounce * .3, fx, -3, 6, col);
      ctx.fillStyle = '#b06a7a';
      ctx.beginPath(); ctx.roundRect(fx - 4.5, -6, 11, 6, [3, 4, 2, 2]); ctx.fill();
      ctx.fillStyle = '#d08a96';
      ctx.fillRect(fx - 4.5, -7, 11, 2.2);
    }

    ctx.translate(0, -bounce);

    // ---- skirt: two scalloped layers ----
    const flare = (p.glide ? 7 : 0) + Math.abs(swing) * 3;
    const hem = -13 - (p.glide ? 3 : 0);
    ctx.fillStyle = '#d8548f';
    this._skirt(ctx, -7.5, -30, 13 + flare, hem + 1.5, t, 1);
    const sg2 = ctx.createLinearGradient(0, -34, 0, hem);
    sg2.addColorStop(0, '#ffa2c8'); sg2.addColorStop(1, '#f06ba6');
    ctx.fillStyle = sg2;
    this._skirt(ctx, -7, -31, 11.5 + flare, hem - 1, t, 0);

    // ---- bodice ----
    const bg2 = ctx.createLinearGradient(0, -42, 0, -28);
    bg2.addColorStop(0, '#ffb0d0'); bg2.addColorStop(1, '#f382b4');
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.roundRect(-7.5, -41.5, 15, 13, 5); ctx.fill();
    // puff sleeves
    ctx.fillStyle = '#ffc2da';
    ctx.beginPath(); ctx.ellipse(-6.5, -39, 4, 3.4, .2, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6.5, -39, 4, 3.4, -.2, 0, U.TAU); ctx.fill();
    // white collar
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-2.6, -40.5, 3, 2.2, .3, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.6, -40.5, 3, 2.2, -.3, 0, U.TAU); ctx.fill();
    // heart brooch + waist ribbon
    this.heart(ctx, 0, -36.5, 3, '#ff5e9e');
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(-.9, -37.5, .8, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#ffd9a0'; ctx.fillRect(-7.5, -30.5, 15, 2.6);

    // ---- head ----
    const tilt = p.pose === 'kiss' ? -.16 : 0;
    ctx.save();
    ctx.translate(1, -50); ctx.rotate(tilt);
    // face
    ctx.fillStyle = '#ffe0c4';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, U.TAU); ctx.fill();
    // bangs & crown hair
    ctx.fillStyle = '#7a4a2b';
    ctx.beginPath();
    ctx.moveTo(-11.4, 2.5);
    ctx.quadraticCurveTo(-13.5, -7.5, -6.5, -11.5);
    ctx.quadraticCurveTo(0, -14, 7, -11.2);
    ctx.quadraticCurveTo(13, -8, 11.4, .5);
    ctx.quadraticCurveTo(10, -5.5, 5.5, -7);
    ctx.quadraticCurveTo(6.8, -3.2, 5.6, -1.4);
    ctx.quadraticCurveTo(2.5, -7.5, -2.5, -6.6);
    ctx.quadraticCurveTo(-8.5, -5.5, -11.4, 2.5);
    ctx.fill();
    // hair shine arc
    ctx.strokeStyle = '#a97848'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, -2.5, 9.5, -2.4, -1.4); ctx.stroke();
    // side lock framing the face
    ctx.fillStyle = '#6e4226';
    ctx.beginPath();
    ctx.moveTo(10.6, -3);
    ctx.quadraticCurveTo(12.8, 2, 11.2, 7.5);
    ctx.quadraticCurveTo(10, 3, 9.2, -1);
    ctx.fill();
    // flower crown
    for (const [fxp, fyp, s, col] of [[-8, -8.2, 1, '#ff9fce'], [-4.2, -10.6, .8, '#fff'], [-.5, -11.8, .9, '#ffb9d5']]) {
      ctx.save(); ctx.translate(fxp, fyp); ctx.scale(s, s);
      ctx.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        ctx.rotate(U.TAU / 5);
        ctx.beginPath(); ctx.ellipse(0, -2.6, 1.5, 2.4, 0, 0, U.TAU); ctx.fill();
      }
      ctx.fillStyle = '#ffdf70'; ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
    // eyes
    if (p.hurtT > 0) { // ouch! >_<
      ctx.strokeStyle = '#5e3a20'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const ex of [3.7, 9.5]) {
        ctx.beginPath(); ctx.moveTo(ex - 1.8, -2.5); ctx.lineTo(ex + 1.4, -.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex - 1.8, 1.1); ctx.lineTo(ex + 1.4, -.7); ctx.stroke();
      }
    } else if (p.pose === 'kiss' || (p.blink > 0)) {
      ctx.strokeStyle = '#5e3a20'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(1.4, -.4); ctx.quadraticCurveTo(3.6, 1.2, 5.8, -.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7.4, -.4); ctx.quadraticCurveTo(9.2, 1.2, 10.8, -.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5.8, -.4); ctx.lineTo(6.7, -1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10.8, -.4); ctx.lineTo(11.7, -1.6); ctx.stroke();
    } else {
      for (const [ex, rx] of [[3.7, 2.8], [9.5, 2.6]]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex, -.8, rx, 3.7, 0, 0, U.TAU); ctx.fill();
        const ig = ctx.createRadialGradient(ex + .3, -1.2, .2, ex + .3, -.4, 2.2);
        ig.addColorStop(0, '#b0804a'); ig.addColorStop(1, '#5e3417');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(ex + .4, -.4, 2, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#2c1808';
        ctx.beginPath(); ctx.arc(ex + .5, -.3, 1, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex - .4, -1.6, .8, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 1.2, .5, .4, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#4e2c14'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(ex + rx * .7, -3.4); ctx.lineTo(ex + rx * 1.15, -4.4); ctx.stroke();
      }
      ctx.strokeStyle = '#6e4226'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(1.6, -5); ctx.quadraticCurveTo(3.7, -6, 5.8, -5.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7.6, -5.3); ctx.quadraticCurveTo(9.5, -6, 11.2, -5); ctx.stroke();
    }
    // blush + mouth
    ctx.fillStyle = 'rgba(255,120,150,.4)';
    ctx.beginPath(); ctx.ellipse(1, 3.6, 2.3, 1.3, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10.8, 3.6, 2.3, 1.3, 0, 0, U.TAU); ctx.fill();
    if (p.pose === 'kiss') {
      ctx.fillStyle = '#e06a6a';
      ctx.beginPath(); ctx.arc(10.6, 3.2, 1.5, 0, U.TAU); ctx.fill();
    } else if (p.hurtT > 0) {
      ctx.fillStyle = '#a04438';
      ctx.beginPath(); ctx.ellipse(7.2, 4.4, 1.7, 2.1, 0, 0, U.TAU); ctx.fill();
    } else {
      ctx.strokeStyle = '#c05a50'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(4.8, 4.6); ctx.quadraticCurveTo(7, 6.4, 9.2, 4.4); ctx.stroke();
    }
    ctx.restore();

    // ---- front arm (with hand) ----
    if (cheer) {
      this.limb(ctx, 5, -37, 11, -50, 5, '#ffc2da');
      ctx.fillStyle = '#ffe0c4'; ctx.beginPath(); ctx.arc(11.6, -50.5, 2.4, 0, U.TAU); ctx.fill();
    } else if (hug) {
      this.limb(ctx, 5, -37, 12, -32, 5, '#ffc2da');
      ctx.fillStyle = '#ffe0c4'; ctx.beginPath(); ctx.arc(12.6, -31.6, 2.4, 0, U.TAU); ctx.fill();
    } else if (atk) {
      this.limb(ctx, 5, -37, 16.5, -35.5, 5, '#ffc2da');
      ctx.fillStyle = '#ffe0c4'; ctx.beginPath(); ctx.arc(17.4, -35.5, 2.6, 0, U.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 19, -35.5, 12, '#ff9fce', .95);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      this.limb(ctx, 5, -37, 7 - armSw * 6, -25 + Math.abs(armSw) * 3, 5, '#ffc2da');
      ctx.fillStyle = '#ffe0c4'; ctx.beginPath(); ctx.arc(7.4 - armSw * 6, -24 + Math.abs(armSw) * 3, 2.2, 0, U.TAU); ctx.fill();
    }
    this.drawHeldWeapon(ctx, p, t, atk ? 21 : (cheer ? 13 : 11 - armSw * 5), atk ? -38 : (cheer ? -51 : -27 + Math.abs(armSw) * 2), atk || p.weaponPose > 0);

    ctx.restore();
    this._statusFx(ctx, p, t, '#ff9fce');
  },

  _statusFx(ctx, p, t, color) {
    if (p.holding) {
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, p.x, p.y - 30, 34, color, .16 + Math.sin(t * 4) * .05);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (p.invuln > 0 && !p.down) {
      ctx.globalAlpha = .35;
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y - 28, 26 + Math.sin(t * 10) * 2, 0, U.TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (p.down) {
      const bob = Math.sin(t * 4) * 3;
      this.heart(ctx, p.x, p.y - 46 + bob, 7, 'rgba(255,110,150,.85)');
      ctx.strokeStyle = 'rgba(30,20,30,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 49 + bob); ctx.lineTo(p.x + 5, p.y - 43 + bob); ctx.stroke();
    }
  },

  /* ================= PETS ================= */
  drawDog(ctx, pet, t) { // Lulu the blue puppy
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.scale(pet.dir * 1.12, 1.12);
    const run = Math.abs(pet.vx) > 25;
    const ph = pet.animT * 15;
    const bob = run ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 3) * 1;
    ctx.translate(0, -bob);
    // curled tail with light tip
    const wag = Math.sin(t * (run ? 18 : 9)) * .45;
    ctx.save();
    ctx.translate(-11, -13);
    ctx.rotate(wag);
    ctx.strokeStyle = '#4f9fe8'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-7, -4, -6.5, -10); ctx.stroke();
    ctx.strokeStyle = '#bfe4ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-5.8, -6.5); ctx.quadraticCurveTo(-6.8, -8.5, -6.5, -10); ctx.stroke();
    ctx.restore();
    // four legs
    const sw = run ? Math.sin(ph) * 4.5 : 0;
    this.limb(ctx, -7, -8, -7 + sw, 0, 3.5, '#3f8fd8');
    this.limb(ctx, -4, -8, -4 - sw * .7, 0, 3.5, '#4f9fe8');
    this.limb(ctx, 4, -8, 4 - sw, 0, 3.5, '#3f8fd8');
    this.limb(ctx, 7, -8, 7 + sw * .7, 0, 3.5, '#4f9fe8');
    // body
    const bg = ctx.createLinearGradient(0, -19, 0, -4);
    bg.addColorStop(0, '#63b2f5'); bg.addColorStop(1, '#4590dd');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(-1.5, -11.5, 11.5, 8, 0, 0, U.TAU); ctx.fill();
    // belly
    ctx.fillStyle = '#cfe9ff';
    ctx.beginPath(); ctx.ellipse(-1.5, -7.5, 7.5, 4.2, 0, 0, U.TAU); ctx.fill();
    // chest fluff
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath();
    ctx.moveTo(5, -14); ctx.quadraticCurveTo(9.5, -12, 8, -6.5);
    ctx.quadraticCurveTo(5.5, -4.5, 3.5, -7);
    ctx.quadraticCurveTo(5.5, -10, 5, -14);
    ctx.fill();
    // head
    ctx.fillStyle = '#5aaaf0';
    ctx.beginPath(); ctx.arc(9, -18, 8, 0, U.TAU); ctx.fill();
    // ears: one perky with pink inner, one flopped
    ctx.fillStyle = '#3f7fd0';
    ctx.beginPath(); ctx.moveTo(3.6, -23); ctx.lineTo(1.8, -31.5); ctx.quadraticCurveTo(6, -28.5, 7.8, -25.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10.5, -24.5); ctx.quadraticCurveTo(13, -31, 16.5, -27.5); ctx.quadraticCurveTo(16, -23.5, 13.4, -22.6); ctx.fill();
    ctx.fillStyle = '#ffb9d0';
    ctx.beginPath(); ctx.moveTo(4.2, -24); ctx.lineTo(3.2, -29.5); ctx.quadraticCurveTo(5.8, -27.4, 6.8, -25); ctx.fill();
    // muzzle + nose
    ctx.fillStyle = '#dceeff';
    ctx.beginPath(); ctx.ellipse(13.6, -15.2, 4.4, 3.4, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#1a2f4f';
    ctx.beginPath(); ctx.ellipse(16.2, -16.6, 1.7, 1.4, 0, 0, U.TAU); ctx.fill();
    // eye with shine + brow dot
    ctx.beginPath(); ctx.arc(8.6, -19.6, 1.9, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(8.1, -20.2, .7, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#cfe9ff';
    ctx.beginPath(); ctx.arc(8.2, -23, 1, 0, U.TAU); ctx.fill();
    // mouth / happy tongue
    ctx.strokeStyle = '#1a2f4f'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(13.4, -13.6, 1.8, .3, Math.PI - .5); ctx.stroke();
    if (run) { ctx.fillStyle = '#ff8fa0'; ctx.beginPath(); ctx.ellipse(14.6, -11.2, 1.7, 2.7, .3, 0, U.TAU); ctx.fill(); }
    // collar with heart tag
    ctx.fillStyle = '#f5c76a';
    ctx.beginPath(); ctx.roundRect(3.2, -14.6, 3.2, 6.4, 1.6); ctx.fill();
    this.heart(ctx, 5.8, -8.6, 2.2, '#ff5e9e');
    ctx.restore();
  },

  drawPanda(ctx, pet, t) { // Biscuit the pink panda
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.scale(pet.dir * 1.12, 1.12);
    const run = Math.abs(pet.vx) > 25;
    const ph = pet.animT * 12;
    const bob = run ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 2.5) * .8;
    const waddle = run ? Math.sin(ph) * .12 : Math.sin(t * 2) * .04;
    ctx.rotate(waddle);
    ctx.translate(0, -bob);
    // tail puff
    ctx.fillStyle = '#e879ac';
    ctx.beginPath(); ctx.arc(-10.5, -11, 3.4, 0, U.TAU); ctx.fill();
    // legs
    const sw = run ? Math.sin(ph) * 3.5 : 0;
    this.limb(ctx, -5, -7, -5 + sw, 0, 5, '#d0468b');
    this.limb(ctx, 5, -7, 5 - sw, 0, 5, '#d0468b');
    // round body
    const bg = ctx.createLinearGradient(0, -24, 0, -3);
    bg.addColorStop(0, '#ffd4e5'); bg.addColorStop(1, '#ffaccb');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, -13, 11.5, 10.5, 0, 0, U.TAU); ctx.fill();
    // belly with tiny heart
    ctx.fillStyle = '#fff2f8';
    ctx.beginPath(); ctx.ellipse(1, -10, 7.5, 6.5, 0, 0, U.TAU); ctx.fill();
    this.heart(ctx, 1, -9, 2.4, '#ffa2c8');
    // arms
    this.limb(ctx, -8, -16, -11.5, -10, 5, '#d0468b');
    this.limb(ctx, 8, -16, 11.5, -10, 5, '#d0468b');
    // head
    ctx.fillStyle = '#ffdfeb';
    ctx.beginPath(); ctx.arc(2, -26.5, 10, 0, U.TAU); ctx.fill();
    // bouncing ears with inner
    const eb = run ? Math.sin(ph + 1) * 1.2 : 0;
    for (const [ex, s2] of [[-4.8, -1], [9, 1]]) {
      ctx.fillStyle = '#d0468b';
      ctx.beginPath(); ctx.arc(ex, -34.5 - eb * s2, 4.4, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#ff9fc6';
      ctx.beginPath(); ctx.arc(ex, -34.5 - eb * s2, 2.3, 0, U.TAU); ctx.fill();
    }
    // white flower by the ear
    ctx.save(); ctx.translate(9.6, -37.5 - eb);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      ctx.rotate(U.TAU / 5);
      ctx.beginPath(); ctx.ellipse(0, -2, 1.2, 1.9, 0, 0, U.TAU); ctx.fill();
    }
    ctx.fillStyle = '#ffdf70'; ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, U.TAU); ctx.fill();
    ctx.restore();
    // eye patches
    ctx.fillStyle = '#ec8fba';
    ctx.beginPath(); ctx.ellipse(-1.8, -27, 3.3, 4, -.28, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6.8, -27, 3.3, 4, .28, 0, U.TAU); ctx.fill();
    // sparkle eyes
    for (const ex of [-1.2, 7.2]) {
      ctx.fillStyle = '#38202e';
      ctx.beginPath(); ctx.arc(ex, -26.6, 1.8, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex - .5, -27.2, .7, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + .6, -25.9, .35, 0, U.TAU); ctx.fill();
    }
    // nose + smile + blush
    ctx.fillStyle = '#a03a68';
    ctx.beginPath(); ctx.arc(3, -23, 1.3, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#a03a68'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(1.2, -20.8); ctx.quadraticCurveTo(3, -19.4, 4.8, -20.8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,160,.35)';
    ctx.beginPath(); ctx.ellipse(-3.6, -22.5, 2, 1.2, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8.6, -22.5, 2, 1.2, 0, 0, U.TAU); ctx.fill();
    ctx.restore();
  },

  enemyPal(theme) {
    return ({
      forest: { main: '#63d18a', glow: '#9af0ae', eye: '#eaff8c', accent: 'leaf' },
      falls: { main: '#56d6ff', glow: '#aeeaff', eye: '#dff9ff', accent: 'fin' },
      blossom: { main: '#ff86b8', glow: '#ffcfe6', eye: '#fff0a8', accent: 'petal' },
      shadow: { main: '#9e5eff', glow: '#cfa8ff', eye: '#ff5e8f', accent: 'smoke' },
      ember: { main: '#ff8a4a', glow: '#ffd08a', eye: '#ffe66d', accent: 'flame' },
      star: { main: '#9fe7ff', glow: '#d7f7ff', eye: '#fff3a8', accent: 'star' },
    })[theme] || { main: '#9e5eff', glow: '#cfa8ff', eye: '#ff5e8f', accent: 'smoke' };
  },

  enemyAccent(ctx, e, t, ep) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (ep.accent === 'leaf') {
      ctx.fillStyle = ep.main;
      for (const x of [-7, 7]) { ctx.beginPath(); ctx.ellipse(x, -31, 4, 8, x * .08, 0, U.TAU); ctx.fill(); }
    } else if (ep.accent === 'fin') {
      ctx.fillStyle = ep.glow;
      ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(-22, -24); ctx.lineTo(-15, -9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(22, -24); ctx.lineTo(15, -9); ctx.fill();
    } else if (ep.accent === 'petal') {
      ctx.fillStyle = ep.main;
      for (let i = 0; i < 4; i++) { const a = t * .8 + i * U.TAU / 4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 15, -22 + Math.sin(a) * 9, 3, 6, a, 0, U.TAU); ctx.fill(); }
    } else if (ep.accent === 'flame') {
      this.glow(ctx, 0, -28, 22 + Math.sin(t * 7) * 3, ep.main, .55);
      ctx.fillStyle = ep.main; ctx.beginPath(); ctx.moveTo(0, -42); ctx.quadraticCurveTo(10, -30, 2, -23); ctx.quadraticCurveTo(-7, -30, 0, -42); ctx.fill();
    } else if (ep.accent === 'star') {
      ctx.fillStyle = ep.eye;
      for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * U.TAU / 3; this.star(ctx, Math.cos(a) * 20, -21 + Math.sin(a) * 14, 4, ep.eye); }
    } else {
      this.glow(ctx, 0, -18, 25, ep.glow, .22 + Math.sin(t * 4) * .06);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  miniBossCrown(ctx, e, t, ep) {
    if (!e.bossTier) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, 0, -42, 32, ep.eye, .45 + Math.sin(t * 5) * .08);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = ep.eye;
    if ((e.bossRank || 0) === 0) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 8, -30); ctx.quadraticCurveTo(s * 24, -48, s * 17, -62); ctx.quadraticCurveTo(s * 10, -49, s * 3, -35);
        ctx.fill();
      }
    } else {
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8 - 4, -31); ctx.lineTo(i * 8, -52 - Math.abs(i) * 4); ctx.lineTo(i * 8 + 4, -31);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(10,5,16,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -20, 22, .12, Math.PI - .12, true); ctx.stroke();
    ctx.restore();
  },

  /* ================= ENEMIES — the little devils ================= */
  drawEnemy(ctx, e, t) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const flash = e.flash > 0;
    const ep = this.enemyPal(e.variant || (G.level && G.level.theme));
    if (e.bossTier) ctx.scale(1.55, 1.55);
    switch (e.type) {
      case 'slime': {
        const squish = 1 + Math.sin(e.t * 6) * .08 - (e.hopY > 1 ? .15 : 0);
        ctx.scale(e.dir, 1);
        // inner core glow
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -11, 24, ep.glow, .3 + Math.sin(t * 3 + e.homeX) * .08);
        ctx.globalCompositeOperation = 'source-over';
        // jelly body
        const g = ctx.createRadialGradient(-3, -16, 2, 0, -10, 17);
        g.addColorStop(0, flash ? '#e0ccff' : ep.main);
        g.addColorStop(.55, flash ? '#b490ee' : '#4a2a86');
        g.addColorStop(1, flash ? '#8a6ac0' : '#241040');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, -11, 15 / squish, 12 * squish, 0, 0, U.TAU); ctx.fill();
        // dark core
        ctx.fillStyle = 'rgba(20,8,40,.55)';
        ctx.beginPath(); ctx.ellipse(-1, -9, 6, 5, 0, 0, U.TAU); ctx.fill();
        // rim light
        ctx.strokeStyle = 'rgba(220,190,255,.5)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(0, -11, 13.5 / squish, 10.5 * squish, 0, -2.6, -1.2); ctx.stroke();
        // horn nubs
        ctx.fillStyle = '#2a1544';
        ctx.beginPath(); ctx.moveTo(-6, -21 * squish); ctx.lineTo(-4.5, -26.5 * squish); ctx.lineTo(-2.5, -21.5 * squish); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, -21.5 * squish); ctx.lineTo(5, -26.5 * squish); ctx.lineTo(6.5, -21 * squish); ctx.fill();
        // slanted glowing eyes
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = ep.eye;
        ctx.save(); ctx.translate(2.5, -13.5); ctx.rotate(.3);
        ctx.beginPath(); ctx.ellipse(0, 0, 2.9, 1.7, 0, 0, U.TAU); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(9, -13.5); ctx.rotate(-.3);
        ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 1.6, 0, 0, U.TAU); ctx.fill(); ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        // grin with fangs
        ctx.strokeStyle = '#1a0e2a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(2, -7); ctx.quadraticCurveTo(6, -4.6, 10, -7.2); ctx.stroke();
        ctx.fillStyle = '#efe6ff';
        ctx.beginPath(); ctx.moveTo(3.4, -6.4); ctx.lineTo(4.4, -4.4); ctx.lineTo(5.4, -6.1); ctx.fill();
        ctx.beginPath(); ctx.moveTo(7, -6.2); ctx.lineTo(8, -4.2); ctx.lineTo(9, -6.3); ctx.fill();
        break;
      }
      case 'wisp': {
        const fl = Math.sin(e.t * 11) * 3;
        // ghostly after-images
        ctx.fillStyle = ep.main;
        for (let i = 1; i <= 2; i++) {
          ctx.globalAlpha = .16 / i;
          ctx.beginPath();
          ctx.ellipse(-Math.cos(e.t * .8) * i * 7, -15, 8, 12, 0, 0, U.TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -14, 28, ep.glow, .5);
        ctx.globalCompositeOperation = 'source-over';
        // flame body
        const wg = ctx.createLinearGradient(0, -30, 0, 0);
        wg.addColorStop(0, flash ? '#eee0ff' : ep.main);
        wg.addColorStop(1, flash ? '#c0aaee' : '#553296');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(0, -30 - fl);
        ctx.quadraticCurveTo(11, -22, 9, -10);
        ctx.quadraticCurveTo(6, -2, 0, -3 + fl * .4);
        ctx.quadraticCurveTo(-6, -2, -9, -10);
        ctx.quadraticCurveTo(-11, -22, 0, -30 - fl);
        ctx.fill();
        // crown flame
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -32 - fl, 8, ep.glow, .8);
        ctx.globalCompositeOperation = 'source-over';
        // hollow eyes with glowing pupils
        ctx.fillStyle = '#2a1358';
        ctx.beginPath(); ctx.ellipse(-3.5, -17, 2.3, 3.4, 0, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3.5, -17, 2.3, 3.4, 0, 0, U.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = ep.eye;
        ctx.beginPath(); ctx.arc(-3.5, -16.4, 1, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(3.5, -16.4, 1, 0, U.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        // wavy spooky mouth
        ctx.strokeStyle = '#2a1358'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-3.5, -9.5);
        ctx.quadraticCurveTo(-1.7, -11, 0, -9.5);
        ctx.quadraticCurveTo(1.7, -8, 3.5, -9.5);
        ctx.stroke();
        // stub arms
        ctx.fillStyle = 'rgba(130,90,210,.8)';
        ctx.beginPath(); ctx.ellipse(-9.5, -13, 2.4, 4, .5, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9.5, -13, 2.4, 4, -.5, 0, U.TAU); ctx.fill();
        break;
      }
      case 'thorn': {
        ctx.scale(e.dir, 1);
        const wob = Math.sin(e.t * 10) * .08;
        ctx.rotate(wob);
        // rotating spikes
        ctx.fillStyle = flash ? '#b09ad0' : ep.main;
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * U.TAU + e.t * .6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 12, -14 + Math.sin(a) * 12);
          ctx.lineTo(Math.cos(a + .18) * 20, -14 + Math.sin(a + .18) * 20);
          ctx.lineTo(Math.cos(a + .36) * 12, -14 + Math.sin(a + .36) * 12);
          ctx.fill();
        }
        // body
        const g = ctx.createRadialGradient(-3, -18, 2, 0, -14, 14);
        g.addColorStop(0, flash ? '#cfbaea' : ep.main);
        g.addColorStop(1, flash ? '#9a86bc' : '#20122f');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -14, 13, 0, U.TAU); ctx.fill();
        // angry glowing eyes + brows
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = ep.eye;
        ctx.beginPath(); ctx.arc(3.5, -16, 2.6, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -15, 2.1, 0, U.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#14091f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(.5, -20); ctx.lineTo(5.5, -18.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(11.5, -18.6); ctx.lineTo(7, -17.4); ctx.stroke();
        // jagged mouth
        ctx.fillStyle = '#14091f';
        ctx.beginPath(); ctx.roundRect(2, -10.5, 8.5, 3.6, 1.6); ctx.fill();
        ctx.fillStyle = '#e8ddf5';
        ctx.beginPath(); ctx.moveTo(3, -10.2); ctx.lineTo(4.2, -8.4); ctx.lineTo(5.4, -10.2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6.4, -10.2); ctx.lineTo(7.6, -8.4); ctx.lineTo(8.8, -10.2); ctx.fill();
        break;
      }
      case 'imp': { // dive-bombing little devil
        ctx.scale(e.dir, 1);
        const dive = e.mode === 'dive';
        const flap = Math.sin(e.t * (dive ? 26 : 13)) * (dive ? .3 : .55);
        // curly tail
        ctx.strokeStyle = ep.main; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, -10);
        ctx.quadraticCurveTo(-15, -8 + Math.sin(e.t * 5) * 3, -16, -15 + Math.sin(e.t * 4) * 2);
        ctx.stroke();
        ctx.fillStyle = ep.main;
        ctx.beginPath();
        ctx.moveTo(-18.5, -17); ctx.lineTo(-13.8, -15.5); ctx.lineTo(-16.5, -12);
        ctx.fill();
        // far wing (behind the body)
        ctx.save();
        ctx.globalAlpha = .75;
        ctx.translate(-5, -17);
        ctx.rotate(flap * .6 - .3);
        ctx.fillStyle = '#3f1a4a';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-9, -13, -20, -11);
        ctx.lineTo(-15.5, -6.5);
        ctx.lineTo(-19, -3);
        ctx.lineTo(-13, -1);
        ctx.quadraticCurveTo(-6, 2, 0, 0);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        // body
        const g = ctx.createRadialGradient(-2, -17, 2, 0, -13, 12);
        g.addColorStop(0, flash ? '#f0c4da' : ep.main);
        g.addColorStop(1, flash ? '#c090ac' : '#4a1030');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, -13, 10, 9.5, 0, 0, U.TAU); ctx.fill();
        // belly
        ctx.fillStyle = 'rgba(255,190,215,.28)';
        ctx.beginPath(); ctx.ellipse(2, -10, 5.5, 4.5, 0, 0, U.TAU); ctx.fill();
        // dangling feet
        this.limb(ctx, -3, -5, -4, 0, 2.6, '#5e2044');
        this.limb(ctx, 3, -5, 3.5, .5, 2.6, '#5e2044');
        // horns
        ctx.fillStyle = '#f0dcc4';
        ctx.beginPath(); ctx.moveTo(-5.5, -20); ctx.lineTo(-6.5, -26.5); ctx.lineTo(-2.8, -21.5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, -21.5); ctx.lineTo(5.5, -27); ctx.lineTo(6.5, -20.5); ctx.fill();
        // glowing yellow eyes
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = ep.eye;
        ctx.save(); ctx.translate(2.4, -15.5); ctx.rotate(.25);
        ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 1.5, 0, 0, U.TAU); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(7.6, -15); ctx.rotate(-.25);
        ctx.beginPath(); ctx.ellipse(0, 0, 2.1, 1.4, 0, 0, U.TAU); ctx.fill(); ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        // fanged grin
        ctx.strokeStyle = '#2a0a1c'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(2, -9.5); ctx.quadraticCurveTo(5.5, -7.2, 9, -9.8); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(3.2, -9); ctx.lineTo(4.2, -7.2); ctx.lineTo(5.2, -8.8); ctx.fill();
        // near wing (in front)
        ctx.save();
        ctx.translate(2, -18);
        ctx.rotate(flap - .15);
        ctx.fillStyle = '#6e3276';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-8, -14, -18, -12.5);
        ctx.lineTo(-14, -7.5);
        ctx.lineTo(-17.5, -4);
        ctx.lineTo(-11.5, -2);
        ctx.quadraticCurveTo(-5, 1.5, 0, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,5,25,.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-2, -1.5); ctx.lineTo(-14, -8); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'bat': {
        const flap = Math.sin(e.t * 16) * 8;
        ctx.scale(e.dir, 1);
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -18, 24, ep.glow, .35);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = flash ? '#e8f8ff' : ep.main;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(0, -17);
          ctx.quadraticCurveTo(s * 18, -32 - flap, s * 32, -14 + flap * .4);
          ctx.quadraticCurveTo(s * 16, -9, 0, -14);
          ctx.fill();
        }
        ctx.fillStyle = flash ? '#fff' : '#1b244a';
        ctx.beginPath(); ctx.ellipse(0, -16, 10, 8, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = ep.eye;
        ctx.beginPath(); ctx.arc(-3, -17, 1.6, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -17, 1.6, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#d9f4ff';
        ctx.beginPath(); ctx.moveTo(-2, -11); ctx.lineTo(0, -7); ctx.lineTo(2, -11); ctx.fill();
        break;
      }
      case 'golem': {
        ctx.scale(e.dir, 1);
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -25, 30, ep.glow, .28);
        ctx.globalCompositeOperation = 'source-over';
        const gg = ctx.createLinearGradient(0, -52, 0, 0);
        gg.addColorStop(0, flash ? '#ffe4d0' : ep.main);
        gg.addColorStop(1, flash ? '#bd8d8d' : '#3b2434');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.roundRect(-18, -46, 36, 38, 9); ctx.fill();
        ctx.fillStyle = flash ? '#fff0d8' : '#5b3346';
        ctx.beginPath(); ctx.roundRect(-23, -35, 11, 22, 5); ctx.fill();
        ctx.beginPath(); ctx.roundRect(12, -35, 11, 22, 5); ctx.fill();
        ctx.fillStyle = ep.eye;
        ctx.beginPath(); ctx.arc(-6, -31, 2.4, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -31, 2.4, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#1b0d16'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(8, -20); ctx.stroke();
        ctx.fillStyle = '#241521';
        ctx.beginPath(); ctx.roundRect(-16, -11, 12, 11, 4); ctx.fill();
        ctx.beginPath(); ctx.roundRect(4, -11, 12, 11, 4); ctx.fill();
        break;
      }
    }
    this.enemyAccent(ctx, e, t, ep);
    this.miniBossCrown(ctx, e, t, ep);
    if (e.bossTier) {
      ctx.globalAlpha = 1;
      ctx.scale(1 / 1.55, 1 / 1.55);
      const bw = 58, frac = U.clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(20,8,18,.75)';
      ctx.beginPath(); ctx.roundRect(-bw / 2, -72, bw, 7, 3.5); ctx.fill();
      ctx.fillStyle = '#ff86b8';
      ctx.beginPath(); ctx.roundRect(-bw / 2 + 1, -71, (bw - 2) * frac, 5, 2.5); ctx.fill();
    }
    ctx.restore();
    // hp bar when recently hurt
    if (e.hurtShow > 0 && e.hp > 0) {
      const w = 30, hy = e.y - (e.type === 'wisp' ? 40 : e.type === 'imp' ? 46 : 34);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(e.x - w / 2, hy, w, 4);
      ctx.fillStyle = '#ff5e7a';
      ctx.fillRect(e.x - w / 2, hy, w * (e.hp / e.maxHp), 4);
    }
  },

  /* ================= BOSS — chapter hearts ================= */
  bossScaryShape(ctx, e, t, bp) {
    if (e.dying > 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (e.bossKind === 'root') {
      ctx.strokeStyle = bp.crack + 'cc'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 38, -52); ctx.quadraticCurveTo(side * 95, -105, side * 78, -155); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(side * 56, -76); ctx.lineTo(side * 102, -112); ctx.stroke();
      }
    } else if (e.bossKind === 'tide') {
      ctx.strokeStyle = bp.aura + 'cc'; ctx.lineWidth = 6;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.arc(side * 66, -8 + Math.sin(t * 3) * 8, 44, side > 0 ? 2.2 : -.9, side > 0 ? 4.8 : 1.9); ctx.stroke();
      }
    } else if (e.bossKind === 'briar') {
      ctx.fillStyle = bp.shardGlow;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * 22 - 5, -54); ctx.lineTo(i * 22, -98 - Math.abs(i) * 8); ctx.lineTo(i * 22 + 5, -54); ctx.fill();
      }
    } else if (e.bossKind === 'ember') {
      this.glow(ctx, 0, -92, 62 + Math.sin(t * 9) * 5, bp.aura, .65);
      ctx.fillStyle = bp.aura;
      ctx.beginPath(); ctx.moveTo(0, -146); ctx.quadraticCurveTo(34, -100, 10, -64); ctx.quadraticCurveTo(-24, -94, 0, -146); ctx.fill();
    } else if (e.bossKind === 'eclipse') {
      ctx.strokeStyle = bp.shardGlow + 'dd'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, -30, 118, -2.45, -.7); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -30, 118, .7, 2.45); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = t + i * U.TAU / 4; this.star(ctx, Math.cos(a) * 118, -30 + Math.sin(a) * 68, 7, bp.eye); }
    } else {
      ctx.strokeStyle = bp.shardGlow + 'cc'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 48, -42); ctx.bezierCurveTo(side * 125, -80, side * 120, 40, side * 66, 58); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  drawBoss(ctx, e, t) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const pulse = 1 + Math.sin(t * 3) * .04 + (e.flash > 0 ? .06 : 0);
    const dying = e.dying || 0;
    const bossPal = {
      root: { aura: '#63d18a', body0: '#486d45', body1: '#1a3826', shard: '#264631', shardGlow: '#8df0aa', gem: '#6be784', eye: '#b7ff90', crack: '#9af0ae' },
      tide: { aura: '#4fc7ff', body0: '#2d6288', body1: '#102c52', shard: '#16395c', shardGlow: '#8ee8ff', gem: '#4fd3ff', eye: '#bff7ff', crack: '#92e7ff' },
      briar: { aura: '#ff7fba', body0: '#83375d', body1: '#3c1430', shard: '#4a1732', shardGlow: '#ffb1da', gem: '#ff5fa6', eye: '#ffd0e6', crack: '#ffc0df' },
      gloom: { aura: '#6e3ad8', body0: '#4a2a78', body1: '#1c0e38', shard: '#2a1548', shardGlow: '#9e5eff', gem: '#c42450', eye: '#ff4a6a', crack: '#c8a0ff' },
      ember: { aura: '#ff8a3d', body0: '#8a3d28', body1: '#42140f', shard: '#4b1c12', shardGlow: '#ffc05a', gem: '#ff5e2e', eye: '#ffd37a', crack: '#ffb068' },
      eclipse: { aura: '#8be8ff', body0: '#30457d', body1: '#120f3c', shard: '#1a1e4f', shardGlow: '#d7b7ff', gem: '#8ff3ff', eye: '#f5e9ff', crack: '#d7c6ff' }
    };
    const bp = bossPal[e.bossKind] || bossPal.gloom;
    ctx.scale(pulse, pulse);
    // dark aura
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, 0, -10, 120, dying > 0 ? '#ff9fce' : bp.aura, .4 + Math.sin(t * 2) * .1);
    ctx.globalCompositeOperation = 'source-over';
    // orbiting dark shards
    for (let i = 0; i < 3; i++) {
      const an = t * 1.2 + i * 2.094;
      const sxs = Math.cos(an) * 118, sys = -8 + Math.sin(an) * 48;
      ctx.save();
      ctx.translate(sxs, sys);
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 0, 0, 14, dying > 0 ? '#ffb9d5' : bp.shardGlow, .5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(an * 2);
      ctx.fillStyle = dying > 0 ? '#ff9fce' : bp.shard;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7.5, 6.5); ctx.lineTo(-7.5, 6.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = dying > 0 ? 'rgba(255,235,245,.7)' : bp.crack + '99';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    // heart body
    const s = 85;
    const g = ctx.createLinearGradient(0, -s, 0, s * .5);
    if (dying > 0) { g.addColorStop(0, '#ff9fce'); g.addColorStop(1, '#e2609d'); }
    else { g.addColorStop(0, e.flash > 0 ? '#8a6ab8' : bp.body0); g.addColorStop(1, e.flash > 0 ? '#5e447e' : bp.body1); }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, s * .42);
    ctx.bezierCurveTo(-s * 1.15, -s * .5, -s * .6, -s * 1.15, 0, -s * .38);
    ctx.bezierCurveTo(s * .6, -s * 1.15, s * 1.15, -s * .5, 0, s * .42);
    ctx.fill();
    // cracks appear as it weakens
    const dmg = 1 - e.hp / e.maxHp;
    if (dmg > .1 && dying === 0) {
      ctx.strokeStyle = bp.crack + Math.round((.3 + dmg * .5) * 255).toString(16).padStart(2, '0'); ctx.lineWidth = 2.5;
      const cracks = [[-20, -50, -34, -20, -22, 6], [15, -55, 30, -25, 20, 2], [0, -30, -8, 0, 4, 20]];
      const n = Math.ceil(dmg * 3);
      for (let i = 0; i < n; i++) {
        const c = cracks[i];
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke();
      }
    }
    // thorn crown with gem
    if (dying === 0) {
      ctx.fillStyle = bp.shard;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 18 - 7, -s * .62);
        ctx.lineTo(i * 18, -s * .62 - 22 - Math.abs(i) * -4);
        ctx.lineTo(i * 18 + 7, -s * .62);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 0, -s * .62 - 10, 10, bp.gem, .8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = bp.gem;
      ctx.beginPath(); ctx.arc(0, -s * .62 - 10, 4.5, 0, U.TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.beginPath(); ctx.arc(-1.4, -s * .62 - 11.5, 1.4, 0, U.TAU); ctx.fill();
    }
    // enraged: eye flames from phase 1, stronger in phase 2 (derived from hp so it syncs everywhere)
    const rage = e.hp < e.maxHp / 3 ? 2 : e.hp < e.maxHp * 2 / 3 ? 1 : 0;
    if (dying === 0 && rage >= 1) {
      ctx.globalCompositeOperation = 'lighter';
      for (const ex of [-22, 22]) {
        const fh = 10 + (rage >= 2 ? 8 : 0) + Math.sin(t * 12 + ex) * 3;
        this.glow(ctx, ex, -34 - fh * .4, 9 + fh * .4, bp.eye, .7);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    this.bossScaryShape(ctx, e, t, bp);
    // face
    if (dying > 0) { // purified — happy at last
      ctx.strokeStyle = '#7e2a52'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-22, -25, 8, .2, Math.PI - .2); ctx.stroke();
      ctx.beginPath(); ctx.arc(22, -25, 8, .2, Math.PI - .2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -2, 12, .3, Math.PI - .3); ctx.stroke();
    } else {
      ctx.fillStyle = bp.eye;
      ctx.save(); ctx.translate(-22, -28); ctx.rotate(.35);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, U.TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(22, -28); ctx.rotate(-.35);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, U.TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = bp.eye; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 8, 14, Math.PI + .5, U.TAU - .5); ctx.stroke();
    }
    ctx.restore();
  },

  drawWeaponGlyph(ctx, weapon, x, y, size = 24, t = 0) {
    const def = Weapons[weapon] || Weapons.tideSpear;
    const shape = def.shape || 'sword';
    const s = size / 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#f7fbff';
    ctx.fillStyle = def.color;
    if (shape === 'spear') {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -11); ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(8, -7); ctx.lineTo(0, -11); ctx.lineTo(-8, -7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-7, 3, 7, -.9, .9); ctx.stroke();
      ctx.beginPath(); ctx.arc(7, 3, 7, Math.PI - .9, Math.PI + .9); ctx.stroke();
    } else if (shape === 'staff' || shape === 'wand') {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, -9); ctx.stroke();
      if (weapon === 'heartStaff') this.heart(ctx, 0, -16, 9, def.color);
      else {
        const petals = shape === 'wand' ? 6 : 5;
        for (let i = 0; i < petals; i++) {
          const a = t * .8 + i * U.TAU / petals;
          ctx.beginPath(); ctx.ellipse(Math.cos(a) * 5, -15 + Math.sin(a) * 4, 4, 7, a, 0, U.TAU); ctx.fill();
        }
        ctx.fillStyle = '#ffe28f';
        ctx.beginPath(); ctx.arc(0, -15, 4, 0, U.TAU); ctx.fill();
      }
      ctx.strokeStyle = '#a8ffd2'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, 2, 7, 8); ctx.stroke();
    } else if (shape === 'sword' || shape === 'katana' || shape === 'dagger') {
      ctx.rotate(-.65);
      const long = shape === 'katana' ? 28 : shape === 'dagger' ? 18 : 25;
      const wide = shape === 'dagger' ? 4 : 6;
      ctx.fillStyle = '#eef8ff';
      ctx.beginPath(); ctx.moveTo(0, -long); ctx.lineTo(wide, 7); ctx.lineTo(0, 15); ctx.lineTo(-wide, 7); ctx.closePath(); ctx.fill();
      if (weapon === 'starBlade' || weapon === 'cometSword') {
        ctx.fillStyle = def.color;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? 4 : 9;
          const a = -Math.PI / 2 + i * Math.PI / 5;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, -long + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = def.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(8, 8); ctx.stroke();
    } else if (shape === 'bow') {
      ctx.strokeStyle = def.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 18, -1.25, 1.25); ctx.stroke();
      ctx.strokeStyle = '#f7fbff'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(5, -17); ctx.lineTo(5, 17); ctx.stroke();
      ctx.strokeStyle = def.color; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(17, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
    } else if (shape === 'axe') {
      ctx.strokeStyle = '#f7fbff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-3, 16); ctx.lineTo(3, -17); ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(2, -18); ctx.quadraticCurveTo(20, -16, 16, 0); ctx.quadraticCurveTo(7, -4, 2, -1); ctx.closePath(); ctx.fill();
    } else if (shape === 'hammer') {
      ctx.strokeStyle = '#f7fbff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 17); ctx.lineTo(0, -9); ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.roundRect(-16, -22, 32, 14, 4); ctx.fill();
      ctx.fillStyle = '#fff7c2'; ctx.fillRect(-10, -19, 5, 8);
    } else if (shape === 'shield') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(15, -16, 14, -2); ctx.quadraticCurveTo(12, 10, 0, 18); ctx.quadraticCurveTo(-12, 10, -14, -2); ctx.quadraticCurveTo(-15, -16, 0, -20); ctx.fill();
      ctx.strokeStyle = '#fff8d0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 10); ctx.stroke();
    } else if (shape === 'fan') {
      for (let i = -2; i <= 2; i++) {
        ctx.save(); ctx.rotate(i * .25);
        ctx.fillStyle = i % 2 ? '#fff0fa' : def.color;
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.quadraticCurveTo(-3, -10, 0, -20); ctx.quadraticCurveTo(7, -8, 4, 12); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#ffe28f'; ctx.beginPath(); ctx.arc(0, 13, 3, 0, U.TAU); ctx.fill();
    } else if (shape === 'bell') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, -17, 4, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, 5); ctx.quadraticCurveTo(-10, -18, 0, -18); ctx.quadraticCurveTo(10, -18, 12, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff8dc'; ctx.beginPath(); ctx.arc(0, 7, 3, 0, U.TAU); ctx.fill();
    } else if (shape === 'claw') {
      ctx.strokeStyle = def.color; ctx.lineWidth = 4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 7, 14); ctx.quadraticCurveTo(i * 8, -8, i * 3, -22); ctx.stroke();
      }
    } else if (shape === 'lyre') {
      ctx.strokeStyle = def.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -3, 15, .25, Math.PI - .25); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, -16); ctx.lineTo(i * 3, 12); ctx.stroke(); }
    } else if (shape === 'scythe') {
      ctx.strokeStyle = '#f7fbff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-5, 17); ctx.lineTo(6, -19); ctx.stroke();
      ctx.strokeStyle = def.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(1, -16, 17, -1.25, .65); ctx.stroke();
    } else if (shape === 'orb') {
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 0, -1, 20, def.color, .9);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, U.TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(-4, -5, 3, 0, U.TAU); ctx.fill();
    } else if (shape === 'lantern') {
      ctx.strokeStyle = '#fff0fa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -18, 7, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.roundRect(-10, -14, 20, 25, 5); ctx.fill();
      this.heart(ctx, 0, -1, 5, '#fff0fa');
    } else {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, -10); ctx.stroke();
      this.heart(ctx, 0, -15, 9, def.color);
      ctx.strokeStyle = '#ffe8f3'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 2, 7, .25, Math.PI - .25); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  /* ================= ITEMS ================= */
  drawItem(ctx, it, t) {
    const bob = Math.sin(t * 2.6 + it.x * .05) * 4;
    const y = it.y + bob;
    switch (it.kind) {
      case 'orb': {
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, it.x, y, 20, '#3fa8ff', .5);
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(it.x - 3, y - 4, 1, it.x, y, 11);
        g.addColorStop(0, '#cfeaff'); g.addColorStop(.35, '#4fb0ff'); g.addColorStop(1, '#0b3f8a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(it.x, y, 10, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(220,245,255,.85)'; // inner droplet like the reference
        ctx.beginPath();
        ctx.moveTo(it.x, y - 5.5);
        ctx.quadraticCurveTo(it.x + 4, y + 1, it.x, y + 4.5);
        ctx.quadraticCurveTo(it.x - 4, y + 1, it.x, y - 5.5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(it.x - 3.5, y - 4, 1.8, 0, U.TAU); ctx.fill();
        break;
      }
      case 'flower': {
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, it.x, y, 18, '#ff7fb5', .45);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(it.x, y); ctx.rotate(Math.sin(t * 1.5 + it.x) * .2);
        for (let i = 0; i < 5; i++) {
          ctx.rotate(U.TAU / 5);
          const pg = ctx.createLinearGradient(0, -12, 0, 0);
          pg.addColorStop(0, '#ffc4dc'); pg.addColorStop(1, '#ff70ac');
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.ellipse(0, -7, 4.4, 7, 0, 0, U.TAU); ctx.fill();
        }
        ctx.fillStyle = '#ffe28f';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, U.TAU); ctx.fill();
        ctx.restore();
        break;
      }
      case 'heartDrop':
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, it.x, y, 15, '#ff7fb5', .55);
        ctx.globalCompositeOperation = 'source-over';
        this.heart(ctx, it.x, y, 8, '#ff86b8');
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(it.x - 2.5, y - 3.5, 1.4, 0, U.TAU); ctx.fill();
        break;
      case 'mote':
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, it.x, y, 11, '#5ee8ff', .6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(it.x, y); ctx.rotate(t * 2);
        ctx.fillStyle = '#bff4ff';
        ctx.fillRect(-3.4, -3.4, 6.8, 6.8);
        ctx.restore();
        break;
      case 'weapon': {
        const def = Weapons[it.weapon] || Weapons.tideSpear;
        const pulse = 1 + Math.sin(t * 5 + it.x) * .08;
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, it.x, y, 38, def.color, .6);
        this.glow(ctx, it.x, y, 16, '#ffffff', .35);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(it.x, y); ctx.scale(pulse, pulse);
        ctx.strokeStyle = def.color + 'aa'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 24 + Math.sin(t * 3) * 2, 0, U.TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const a = t * 1.8 + i * U.TAU / 4;
          ctx.fillStyle = i % 2 ? '#ffffff' : def.color;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 28, Math.sin(a) * 18, 2.5, 0, U.TAU); ctx.fill();
        }
        this.drawWeaponGlyph(ctx, it.weapon, 0, 0, 32, t);
        ctx.restore();
        ctx.font = '600 10px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f4fbff';
        ctx.shadowColor = def.color; ctx.shadowBlur = 6;
        ctx.fillText(def.name, it.x, y + 35);
        ctx.shadowBlur = 0;
        break;
      }
    }
  },

  /* ================= PLATFORMS ================= */
  drawPlatform(ctx, pl, pal, t) {
    if (pl.type === 'ground') {
      const g = ctx.createLinearGradient(0, pl.y, 0, pl.y + 170);
      g.addColorStop(0, pal.soilT); g.addColorStop(1, pal.soilB);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(pl.x, pl.y + 6, pl.w, pl.h - 6, [0, 0, 14, 14]); ctx.fill();
      // faint soil strata + embedded stones
      ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 2;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(pl.x + 8, pl.y + 20 + i * 26);
        ctx.quadraticCurveTo(pl.x + pl.w / 2, pl.y + 26 + i * 26 + (i % 2 ? 6 : -6), pl.x + pl.w - 8, pl.y + 18 + i * 26);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let sx = pl.x + 26; sx < pl.x + pl.w - 20; sx += 88) {
        ctx.beginPath(); ctx.ellipse(sx + (sx * 7 % 30), pl.y + 42 + (sx * 13 % 40), 7, 5, .3, 0, U.TAU); ctx.fill();
      }
      // mossy grass top: base band + rounded lumps + light rim
      const gg = ctx.createLinearGradient(0, pl.y - 6, 0, pl.y + 18);
      gg.addColorStop(0, pal.grassT); gg.addColorStop(1, pal.grassB);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.roundRect(pl.x - 4, pl.y - 2, pl.w + 8, 17, 8); ctx.fill();
      for (let lx = pl.x + 6; lx < pl.x + pl.w - 4; lx += 34) {
        const lr = 12 + (lx * 11 % 8);
        ctx.beginPath(); ctx.arc(lx + 8, pl.y + 2, lr * .55, Math.PI, U.TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,230,.14)';
      ctx.beginPath(); ctx.roundRect(pl.x - 4, pl.y - 2, pl.w + 8, 3.5, 2); ctx.fill();
      // dangling moss on the edges
      ctx.strokeStyle = pal.grassB; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const ex of [pl.x + 3, pl.x + pl.w - 3]) {
        ctx.beginPath(); ctx.moveTo(ex, pl.y + 12);
        ctx.quadraticCurveTo(ex + (ex > pl.x + 10 ? 5 : -5), pl.y + 26, ex, pl.y + 34);
        ctx.stroke();
      }
      // deco: flowers & grass tufts (precomputed)
      for (const d of pl.deco) {
        const dx = pl.x + d[0];
        if (d[1] === 0) { // grass tuft
          ctx.strokeStyle = pal.grassT; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(dx, pl.y - 1); ctx.quadraticCurveTo(dx - 2, pl.y - 8, dx - 4, pl.y - 10); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(dx, pl.y - 1); ctx.quadraticCurveTo(dx + 2, pl.y - 9, dx + 3, pl.y - 11); ctx.stroke();
        } else if (d[1] === 1) { // tiny flower
          ctx.fillStyle = d[2] ? '#ffb3d6' : '#fff2b8';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.ellipse(dx + Math.cos(i * 1.57) * 3, pl.y - 8 + Math.sin(i * 1.57) * 3, 2.2, 2.2, 0, 0, U.TAU); ctx.fill();
          }
          ctx.fillStyle = '#ffdf70'; ctx.beginPath(); ctx.arc(dx, pl.y - 8, 1.8, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = pal.grassB; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(dx, pl.y - 5); ctx.lineTo(dx, pl.y); ctx.stroke();
        } else if (d[1] === 2) { // glow shroomlet
          ctx.globalCompositeOperation = 'lighter';
          this.glow(ctx, dx, pl.y - 7, 12, pal.shroomGlow, .4 + Math.sin(t * 2 + dx) * .12);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#e8e0d0'; ctx.fillRect(dx - 1.5, pl.y - 8, 3, 8);
          ctx.fillStyle = pal.shroom[0];
          ctx.beginPath(); ctx.ellipse(dx, pl.y - 8, 6, 4, 0, Math.PI, U.TAU); ctx.fill();
        }
      }
    } else if (pl.type === 'mush') {
      // giant mushroom platform (like the reference image)
      const cx = pl.x + pl.w / 2;
      const sway = Math.sin(t * 1.2 + pl.x * .01) * 2;
      ctx.save();
      ctx.translate(sway * .3, 0);
      // tapered stem with shading
      const sg = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
      sg.addColorStop(0, '#b8a37e'); sg.addColorStop(.4, '#efe3c4'); sg.addColorStop(1, '#9e8a66');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(cx - 12, pl.y + 8);
      ctx.quadraticCurveTo(cx - 7, pl.y + pl.stem * .55, cx - 18, pl.y + pl.stem + 6);
      ctx.lineTo(cx + 18, pl.y + pl.stem + 6);
      ctx.quadraticCurveTo(cx + 7, pl.y + pl.stem * .55, cx + 12, pl.y + 8);
      ctx.fill();
      // gills under the cap
      ctx.fillStyle = 'rgba(60,35,25,.55)';
      ctx.beginPath(); ctx.ellipse(cx, pl.y + 11, pl.w * .46, 9, 0, 0, U.TAU); ctx.fill();
      // cap dome
      const cg = ctx.createLinearGradient(0, pl.y - 30, 0, pl.y + 14);
      cg.addColorStop(0, pl.capC[0]); cg.addColorStop(1, pl.capC[1]);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(pl.x - 8, pl.y + 9);
      ctx.quadraticCurveTo(pl.x - 2, pl.y - 22, cx, pl.y - 26);
      ctx.quadraticCurveTo(pl.x + pl.w + 2, pl.y - 22, pl.x + pl.w + 8, pl.y + 9);
      ctx.quadraticCurveTo(cx, pl.y + 22, pl.x - 8, pl.y + 9);
      ctx.fill();
      // top sheen
      ctx.fillStyle = 'rgba(255,250,235,.28)';
      ctx.beginPath();
      ctx.ellipse(cx - pl.w * .16, pl.y - 16, pl.w * .26, 6.5, -.12, 0, U.TAU);
      ctx.fill();
      // spots
      ctx.fillStyle = 'rgba(255,245,225,.55)';
      for (const s of pl.spots) {
        ctx.beginPath(); ctx.ellipse(pl.x + s[0], pl.y - s[1] * .5, s[2], s[2] * .62, 0, 0, U.TAU); ctx.fill();
      }
      // rim light along the cap edge
      ctx.strokeStyle = 'rgba(255,240,220,.25)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pl.x - 6, pl.y + 8);
      ctx.quadraticCurveTo(pl.x - 1, pl.y - 20, cx, pl.y - 24);
      ctx.stroke();
      // under-glow
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, cx, pl.y + 16, pl.w * .42, pl.glowC, .26 + Math.sin(t * 1.8 + pl.x) * .08);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  },

  /* ================= GATE & SHRINE ================= */
  drawGate(ctx, gx, gy, t, near) {
    ctx.save();
    ctx.translate(gx, gy);
    const glow = near ? .85 : .4 + Math.sin(t * 1.5) * .1;
    // light beam between the pillars
    if (near) {
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(0, -150, 0, 0);
      bg.addColorStop(0, 'rgba(255,180,220,0)');
      bg.addColorStop(.4, 'rgba(255,180,220,.3)');
      bg.addColorStop(1, 'rgba(255,180,220,.05)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(-46, 0); ctx.lineTo(-30, -150); ctx.lineTo(30, -150); ctx.lineTo(46, 0);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // pillars with base, capital, moss vines & flowers
    for (const s of [-1, 1]) {
      const px2 = s * 52;
      const pg = ctx.createLinearGradient(px2 - 13, 0, px2 + 13, 0);
      pg.addColorStop(0, '#5e6e80'); pg.addColorStop(.45, '#93a6b8'); pg.addColorStop(1, '#46525e');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.roundRect(px2 - 11, -112, 22, 112, [5, 5, 0, 0]); ctx.fill();
      ctx.fillStyle = '#7e91a2';
      ctx.beginPath(); ctx.roundRect(px2 - 15, -10, 30, 10, 3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(px2 - 15, -122, 30, 12, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.fillRect(px2 - 11, -112, 5, 102);
      ctx.strokeStyle = '#3f8f57'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px2 - 8, -6);
      ctx.quadraticCurveTo(px2 + s * 10, -46, px2 - s * 4, -86);
      ctx.stroke();
      ctx.fillStyle = '#4faa66';
      for (let i = 0; i < 4; i++) {
        const vy = -16 - i * 20, vx = px2 + Math.sin(i * 2 + s) * 8;
        ctx.beginPath(); ctx.ellipse(vx, vy, 4, 2.2, i + s, 0, U.TAU); ctx.fill();
      }
      ctx.fillStyle = '#ffb9d5';
      ctx.beginPath(); ctx.arc(px2 + s * 4, -52, 2.6, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(px2 - s * 5, -90, 2.2, 0, U.TAU); ctx.fill();
    }
    // stone arch
    ctx.strokeStyle = '#8496a8'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-52, -118);
    ctx.quadraticCurveTo(0, -156, 52, -118);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-52, -121);
    ctx.quadraticCurveTo(0, -159, 52, -121);
    ctx.stroke();
    // heart keystone
    ctx.save();
    ctx.translate(0, -140 + Math.sin(t * 2) * 2.5);
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, 0, 0, 42, '#ff7fb5', glow);
    ctx.globalCompositeOperation = 'source-over';
    this.heart(ctx, 0, 5, 22, near ? '#ff86b8' : '#c46a94');
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(-6.5, -4, 3.6, 0, U.TAU); ctx.fill();
    ctx.restore();
    // rising hearts when the gate senses two hearts nearby
    if (near) {
      for (let i = 0; i < 3; i++) {
        const cyc = ((t * 26 + i * 44) % 130);
        ctx.globalAlpha = U.clamp(1 - cyc / 130, 0, 1) * .8;
        this.heart(ctx, Math.sin(t * 2 + i * 2.1) * 16, -20 - cyc, 5.5, '#ff9fce');
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  drawShrine(ctx, sx, sy, t, active) {
    ctx.save();
    ctx.translate(sx, sy);
    // steps
    ctx.fillStyle = '#5a6a7a';
    ctx.beginPath(); ctx.roundRect(-30, -8, 60, 8, 2); ctx.fill();
    ctx.fillStyle = '#6e8090';
    ctx.beginPath(); ctx.roundRect(-22, -16, 44, 9, 2); ctx.fill();
    // column with carved heart rune
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, '#566878'); g.addColorStop(.45, '#8ca0b2'); g.addColorStop(1, '#46525e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-13, -52, 26, 37, [4, 4, 0, 0]); ctx.fill();
    ctx.strokeStyle = active ? 'rgba(255,150,195,.95)' : 'rgba(190,205,220,.5)';
    ctx.lineWidth = 1.8;
    ctx.save(); ctx.translate(0, -33);
    ctx.beginPath();
    ctx.moveTo(0, 3.5);
    ctx.bezierCurveTo(-6.5, -3, -3.5, -8, 0, -4);
    ctx.bezierCurveTo(3.5, -8, 6.5, -3, 0, 3.5);
    ctx.stroke();
    ctx.restore();
    // top plate
    ctx.fillStyle = '#93a6ba';
    ctx.beginPath(); ctx.roundRect(-19, -58, 38, 8, 3); ctx.fill();
    // floating crystal heart
    const bob = Math.sin(t * 2) * 3.5;
    if (active) {
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 0, -76 + bob, 46, '#ff9fce', .55 + Math.sin(t * 3) * .15);
      const lb = ctx.createLinearGradient(0, -150, 0, -60);
      lb.addColorStop(0, 'rgba(255,180,220,0)'); lb.addColorStop(1, 'rgba(255,180,220,.16)');
      ctx.fillStyle = lb;
      ctx.fillRect(-16, -150, 32, 90);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.heart(ctx, 0, -72 + bob, 17, active ? '#ff86b8' : 'rgba(150,140,170,.8)');
    // crystal facets + shine
    ctx.strokeStyle = active ? 'rgba(255,230,245,.7)' : 'rgba(220,215,235,.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-5, -80 + bob); ctx.lineTo(0, -68 + bob); ctx.lineTo(4.5, -79 + bob); ctx.stroke();
    ctx.fillStyle = active ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(-4.5, -78 + bob, 2.4, 0, U.TAU); ctx.fill();
    // orbiting sparkles
    if (active) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const an = t * 2 + i * 2.09;
        this.glow(ctx, Math.cos(an) * 26, -72 + bob + Math.sin(an) * 12, 5, '#ffd7ec', .8);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  drawLoveTrial(ctx, tr, t) {
    const charge = U.clamp(tr.charge || 0, 0, 1);
    const done = !!tr.done;
    ctx.save();
    ctx.translate(tr.x, tr.y);
    const glow = done ? .8 : .35 + charge * .55 + Math.sin(t * 3) * .08;
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, 0, -28, 74 + charge * 45, done ? '#fff3a8' : '#ff9fce', glow);
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = 'rgba(16,28,42,.55)';
    ctx.beginPath(); ctx.ellipse(0, -2, 88, 24, 0, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,240,.65)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -2, 88, 24, 0, 0, U.TAU); ctx.stroke();

    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 34, -20 + Math.sin(t * 2 + s) * 2);
      ctx.fillStyle = s < 0 ? '#8fd8ff' : '#ffa9d8';
      ctx.beginPath(); ctx.roundRect(-10, -22, 20, 42, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(-3, -12, 2.4, 0, U.TAU); ctx.fill();
      this.heart(ctx, 0, 7, 7, s < 0 ? '#c8f0ff' : '#ffd0e5');
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, -47 + Math.sin(t * 2.4) * 4);
    this.heart(ctx, -9, 0, 13, done ? '#fff3a8' : '#7fd8ff');
    this.heart(ctx, 9, 0, 13, done ? '#fff3a8' : '#ff86b8');
    ctx.strokeStyle = done ? '#fff7c2' : '#ffd7ec';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 31, -Math.PI / 2, -Math.PI / 2 + U.TAU * (done ? 1 : charge));
    ctx.stroke();
    if (!done) {
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 34, 0, U.TAU); ctx.stroke();
    }
    ctx.restore();

    if (done) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = t * 1.6 + i * U.TAU / 5;
        this.star(ctx, Math.cos(a) * 62, -35 + Math.sin(a) * 18, 5, '#fff3a8');
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  /* ================= contact shadow & bloom aura ================= */
  shadow(ctx, x, gy, r, h) { // h = height above the ground
    const k = U.clamp(1 - h / 260, 0, 1);
    if (k <= 0) return;
    ctx.fillStyle = `rgba(4,12,18,${(.28 * k).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(x, gy - 1.5, r * (.6 + .4 * k), 3.6 * (.6 + .4 * k), 0, 0, U.TAU); ctx.fill();
  },

  drawAura(ctx, a, t) {
    const alpha = Math.min(1, a.t);
    const R = 135 + Math.sin(t * 3) * 5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    // rising light column
    const col = ctx.createLinearGradient(0, a.y - 150, 0, a.y);
    col.addColorStop(0, 'rgba(255,170,215,0)');
    col.addColorStop(1, 'rgba(255,170,215,.2)');
    ctx.fillStyle = col;
    ctx.fillRect(a.x - R * .5, a.y - 150, R, 150);
    this.glow(ctx, a.x, a.y - 20, R + 15, '#ff9fce', .3);
    // ground ring
    ctx.strokeStyle = 'rgba(255,180,215,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(a.x, a.y - 8, R, R * .32, 0, 0, U.TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // orbiting petal ring (pseudo-3D)
    for (let i = 0; i < 10; i++) {
      const an = t * .9 + i * U.TAU / 10;
      const px2 = a.x + Math.cos(an) * R, py2 = a.y - 8 + Math.sin(an) * R * .32;
      ctx.save();
      ctx.translate(px2, py2); ctx.rotate(an + Math.PI / 2);
      ctx.fillStyle = i % 2 ? '#ffc4dc' : '#ff8fc0';
      ctx.beginPath(); ctx.ellipse(0, 0, 3.4, 6, 0, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  /* ================= PROJECTILES ================= */
  drawProj(ctx, pr, t) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    switch (pr.kind) {
      case 'phoenix': { // water-phoenix — feathered wings + ribbon trails
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 30, '#4fb0ff', .85);
        const flap = Math.sin(t * 26) * 8;
        // three flowing tail ribbons
        for (let i = -1; i <= 1; i++) {
          const wv = Math.sin(t * 22 + i * 2) * 5;
          const rg = ctx.createLinearGradient(0, 0, -42, 0);
          rg.addColorStop(0, 'rgba(170,235,255,.85)');
          rg.addColorStop(1, 'rgba(60,140,255,0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.moveTo(-6, i * 2.5);
          ctx.quadraticCurveTo(-22, i * 7 + wv, -40, i * 9 + wv * 1.6);
          ctx.quadraticCurveTo(-22, i * 7 + wv + 2.5, -6, i * 2.5 + 2);
          ctx.fill();
        }
        // layered wings, above & below
        for (const s of [-1, 1]) {
          const wg = ctx.createLinearGradient(0, 0, -10, s * (18 + flap));
          wg.addColorStop(0, 'rgba(200,245,255,.95)');
          wg.addColorStop(1, 'rgba(80,160,255,.1)');
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.moveTo(2, s * 2);
          ctx.quadraticCurveTo(-4, s * (14 + flap), -18, s * (20 + flap));
          ctx.quadraticCurveTo(-8, s * 8, -4, s * 3);
          ctx.fill();
          ctx.fillStyle = 'rgba(220,250,255,.75)';
          ctx.beginPath();
          ctx.moveTo(1, s * 1.5);
          ctx.quadraticCurveTo(-3, s * (9 + flap * .6), -11, s * (12 + flap * .6));
          ctx.quadraticCurveTo(-5, s * 5, -2, s * 2);
          ctx.fill();
        }
        // body
        const bodg = ctx.createLinearGradient(14, 0, -12, 0);
        bodg.addColorStop(0, '#eefcff'); bodg.addColorStop(1, '#7fd0ff');
        ctx.fillStyle = bodg;
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.quadraticCurveTo(4, -5.5, -8, -2);
        ctx.quadraticCurveTo(-4, 0, -8, 2);
        ctx.quadraticCurveTo(4, 5.5, 13, 0);
        ctx.fill();
        // head crest
        ctx.fillStyle = 'rgba(190,240,255,.9)';
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.quadraticCurveTo(6, -8 - flap * .3, 1, -9 - flap * .4);
        ctx.quadraticCurveTo(5, -4.5, 4, -2.5);
        ctx.fill();
        // beak + eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(17.5, -1); ctx.lineTo(13.5, 2); ctx.fill();
        ctx.fillStyle = '#0c3f7e';
        ctx.beginPath(); ctx.arc(9.5, -1.2, 1.2, 0, U.TAU); ctx.fill();
        break;
      }
      case 'petal': { // spinning rose blossom
        ctx.rotate(pr.t * 9);
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 16, '#ff8fc0', .75);
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 5; i++) {
          ctx.rotate(U.TAU / 5);
          const pg2 = ctx.createLinearGradient(0, -10, 0, 0);
          pg2.addColorStop(0, '#ffd0e4'); pg2.addColorStop(1, '#ff70ac');
          ctx.fillStyle = pg2;
          ctx.beginPath(); ctx.ellipse(0, -5.6, 3.4, 5.6, 0, 0, U.TAU); ctx.fill();
        }
        ctx.fillStyle = '#ffe28f';
        ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(-1, -1, .9, 0, U.TAU); ctx.fill();
        break;
      }
      case 'darkball':
        const darkColor = pr.color || '#9e5eff';
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 18, darkColor, .8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#3a1f66';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, U.TAU); ctx.fill();
        ctx.fillStyle = darkColor;
        ctx.beginPath(); ctx.arc(-2, -2, 2.5, 0, U.TAU); ctx.fill();
        break;
      case 'starshot': {
        ctx.rotate(pr.t * 8);
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 20, '#fff3a8', .8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff3a8';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 5 : 11;
          const a = -Math.PI / 2 + i * Math.PI / 5;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'bolt': {
        const col = pr.color || '#fff3a8';
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 20, col, .8);
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createLinearGradient(16, 0, -18, 0);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(.45, col);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(18, 0); ctx.lineTo(2, -7); ctx.lineTo(-18, 0); ctx.lineTo(2, 7);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'shock': {
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -6, 20, '#b06aff', .7);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(90,50,140,.8)';
        for (let i = 0; i < 3; i++) {
          const h = 14 - i * 3;
          ctx.beginPath();
          ctx.moveTo(-12 + i * 8, 0); ctx.lineTo(-8 + i * 8, -h); ctx.lineTo(-4 + i * 8, 0);
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  },

  /* ================= BACKGROUNDS (pre-rendered parallax layers) ================= */
  PAL: {
    forest: { skyT: '#0b2836', skyB: '#3d9a82', glowSky: '#c8ffe8', far: '#1c5f60', farHi: '#2b7a70', mid: '#0f4a48', midHi: '#1a6157', near: '#062b28',
      soilT: '#41302a', soilB: '#1d1410', grassT: '#54b86e', grassB: '#2e7a4a',
      shroom: ['#f0a055', '#c46a35'], shroomGlow: '#8fdcff', mist: 'rgba(150,225,215,.10)', fall: true },
    falls: { skyT: '#081c3d', skyB: '#3d85b8', glowSky: '#d8efff', far: '#1c4a70', farHi: '#2c6088', mid: '#0f3d5e', midHi: '#1c527a', near: '#06263e',
      soilT: '#39485a', soilB: '#161f2a', grassT: '#54b0c0', grassB: '#2e7a92',
      shroom: ['#7adeff', '#3fa0e0'], shroomGlow: '#aeeaff', mist: 'rgba(150,205,255,.13)', fall: true },
    blossom: { skyT: '#391b4d', skyB: '#e89282', glowSky: '#ffe2ae', far: '#5e3560', farHi: '#7a4a70', mid: '#48264e', midHi: '#613860', near: '#2c1633',
      soilT: '#4a3040', soilB: '#241420', grassT: '#8aae66', grassB: '#527848',
      shroom: ['#ff9fce', '#e070ac'], shroomGlow: '#ffcfe6', mist: 'rgba(255,190,215,.11)', fall: false, bloomTrees: true },
    shadow: { skyT: '#070512', skyB: '#2e1c4a', glowSky: '#8a62c8', far: '#1c1233', farHi: '#291b45', mid: '#140c26', midHi: '#20143a', near: '#0c0718',
      soilT: '#251a33', soilB: '#100a18', grassT: '#4e3d74', grassB: '#332656',
      shroom: ['#a866ff', '#6e3ad8'], shroomGlow: '#cfa8ff', mist: 'rgba(130,95,190,.16)', fall: false, dead: true },
    ember: { skyT: '#180b16', skyB: '#7b3040', glowSky: '#ffd08a', far: '#5e2436', farHi: '#8a3a44', mid: '#3a1a2c', midHi: '#66303a', near: '#1a0d16',
      soilT: '#4a2a2d', soilB: '#1b0d0d', grassT: '#c05d45', grassB: '#6f372b',
      shroom: ['#ffb05f', '#d45535'], shroomGlow: '#ffd08a', mist: 'rgba(255,150,95,.13)', fall: false },
    star: { skyT: '#071025', skyB: '#27416e', glowSky: '#cfe8ff', far: '#1e3154', farHi: '#385f86', mid: '#142442', midHi: '#2e4d74', near: '#08162a',
      soilT: '#27324a', soilB: '#101827', grassT: '#5aa8a0', grassB: '#32696a',
      shroom: ['#9fe7ff', '#7a8cff'], shroomGlow: '#d7f7ff', mist: 'rgba(180,220,255,.14)', fall: true },
  },

  makeBackground(theme, seed) {
    const pal = this.PAL[theme];
    const r = U.rng(seed + 777);
    const W = 1920, H = 1080;
    const layers = [];
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

    const glowShroom = (g, mx, my, ms, capCol) => {
      const gg = g.createRadialGradient(mx, my - ms, 2, mx, my - ms, ms * 2.8);
      gg.addColorStop(0, pal.shroomGlow + 'bb'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gg; g.fillRect(mx - ms * 2.8, my - ms * 3.8, ms * 5.6, ms * 5.6);
      g.fillStyle = '#e2d6bc';
      g.beginPath();
      g.moveTo(mx - ms * .16, my); g.quadraticCurveTo(mx, my - ms * .5, mx - ms * .1, my - ms);
      g.lineTo(mx + ms * .1, my - ms); g.quadraticCurveTo(mx, my - ms * .5, mx + ms * .16, my);
      g.fill();
      g.fillStyle = capCol;
      g.beginPath(); g.ellipse(mx, my - ms, ms * .95, ms * .6, 0, Math.PI, U.TAU); g.fill();
      g.fillStyle = 'rgba(255,250,240,.55)';
      g.beginPath(); g.ellipse(mx - ms * .35, my - ms * 1.25, ms * .14, ms * .1, 0, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(mx + ms * .3, my - ms * 1.1, ms * .1, ms * .08, 0, 0, U.TAU); g.fill();
    };

    /* --- L0: sky, celestial glow, hazy far treeline, waterfall --- */
    const c0 = mk(); const g0 = c0.getContext('2d');
    const sky = g0.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, pal.skyT); sky.addColorStop(.55, pal.skyT); sky.addColorStop(1, pal.skyB);
    g0.fillStyle = sky; g0.fillRect(0, 0, W, H);
    // glow orb (sun through canopy / moon)
    const gx = W * .62, gy = H * .22;
    const sg = g0.createRadialGradient(gx, gy, 10, gx, gy, 460);
    sg.addColorStop(0, pal.glowSky + 'e6'); sg.addColorStop(.25, pal.glowSky + '55'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g0.fillStyle = sg; g0.fillRect(0, 0, W, H);
    g0.fillStyle = pal.glowSky;
    g0.beginPath(); g0.arc(gx, gy, 46, 0, U.TAU); g0.fill();
    // god rays
    g0.save(); g0.globalAlpha = .09; g0.fillStyle = pal.glowSky;
    for (let i = 0; i < 6; i++) {
      g0.save(); g0.translate(gx, gy); g0.rotate(.7 + i * .28);
      g0.beginPath();
      g0.moveTo(-14, 0); g0.lineTo(14, 0); g0.lineTo(120 + i * 30, H); g0.lineTo(-120 - i * 30, H);
      g0.fill(); g0.restore();
    }
    g0.restore();
    if (theme === 'shadow' || theme === 'star') { // stars
      g0.fillStyle = 'rgba(220,200,255,.7)';
      for (let i = 0; i < 110; i++) { const s = r() * 1.7 + .4; g0.fillRect(r() * W, r() * H * .6, s, s); }
    }
    // two hazy treeline bands for depth (periodic sines = seamless tiling)
    const k1 = U.TAU * 5 / W, k2 = U.TAU * 11 / W;
    for (const [frac, col] of [[.5, pal.farHi], [.58, pal.far]]) {
      const bandY = x => H * frac + Math.sin(x * k1 + frac * 40 + seed) * 46 + Math.sin(x * k2 + frac * 9) * 18;
      g0.fillStyle = col;
      g0.beginPath(); g0.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) g0.lineTo(x, bandY(x));
      g0.lineTo(W, H); g0.fill();
      // little tree tips on the band
      for (let i = 0; i < 30; i++) {
        const th = 20 + r() * 46;
        const tx = U.clamp(r() * W, th, W - th);
        g0.beginPath(); g0.arc(tx, bandY(tx) - th * .3, th * .5, 0, U.TAU); g0.fill();
      }
    }
    // waterfall in the distance
    if (pal.fall) {
      const wx = W * .78;
      const wg = g0.createLinearGradient(wx, H * .3, wx, H);
      wg.addColorStop(0, 'rgba(200,240,255,.65)'); wg.addColorStop(1, 'rgba(140,200,240,.18)');
      g0.fillStyle = wg; g0.fillRect(wx - 30, H * .3, 60, H * .7);
      g0.fillStyle = 'rgba(235,250,255,.4)';
      for (let i = 0; i < 16; i++) g0.fillRect(wx - 26 + r() * 52, H * .3 + r() * H * .65, 2.5, 34 + r() * 70);
      g0.fillStyle = 'rgba(255,255,255,.5)';
      g0.beginPath(); g0.ellipse(wx, H * .31, 34, 8, 0, 0, U.TAU); g0.fill();
      const pg = g0.createRadialGradient(wx, H * .97, 5, wx, H * .97, 150);
      pg.addColorStop(0, 'rgba(225,248,255,.6)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
      g0.fillStyle = pg; g0.beginPath(); g0.ellipse(wx, H * .97, 150, 46, 0, 0, U.TAU); g0.fill();
    }
    layers.push({ cv: c0, speed: .12 });

    /* --- L1: big trees + floating shroom islands --- */
    const c1 = mk(); const g1 = c1.getContext('2d');
    const tree = (x, base, h) => {
      // trunk with root flare
      g1.fillStyle = pal.mid;
      g1.beginPath();
      g1.moveTo(x - h * .1, base);
      g1.quadraticCurveTo(x - h * .05, base - h * .1, x - h * .045, base - h * .4);
      g1.quadraticCurveTo(x - h * .05, base - h * .7, x - h * .02, base - h * .8);
      g1.lineTo(x + h * .02, base - h * .8);
      g1.quadraticCurveTo(x + h * .06, base - h * .55, x + h * .05, base - h * .35);
      g1.quadraticCurveTo(x + h * .06, base - h * .12, x + h * .11, base);
      g1.fill();
      // canopy: dark base + light top (atmosphere from the glow)
      const cy = base - h * .84;
      const canopyCol = pal.bloomTrees ? '#d86a9e' : pal.mid;
      const canopyHi = pal.bloomTrees ? '#f090ba' : pal.midHi;
      g1.fillStyle = canopyCol;
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * U.TAU;
        g1.beginPath();
        g1.arc(x + Math.cos(a) * h * .24, cy + Math.sin(a) * h * .12, h * (.15 + r() * .09), 0, U.TAU);
        g1.fill();
      }
      g1.beginPath(); g1.arc(x, cy - h * .07, h * .22, 0, U.TAU); g1.fill();
      g1.fillStyle = canopyHi;
      for (let i = 0; i < 4; i++) {
        g1.beginPath();
        g1.arc(x - h * .1 + r() * h * .26, cy - h * .1 - r() * h * .08, h * (.08 + r() * .06), 0, U.TAU);
        g1.fill();
      }
      // hanging vines
      g1.strokeStyle = pal.mid; g1.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const vx = x - h * .2 + r() * h * .4, vl = h * (.1 + r() * .18);
        g1.beginPath(); g1.moveTo(vx, cy + h * .1);
        g1.quadraticCurveTo(vx + 8, cy + h * .1 + vl * .6, vx - 4, cy + h * .1 + vl);
        g1.stroke();
      }
      // glowing shroomlets at the roots
      if (r() < .7) glowShroom(g1, x + h * .1 + r() * 40 - 20, base, 9 + r() * 10, pal.shroom[1]);
    };
    const deadTree = (x, base, h) => {
      g1.strokeStyle = pal.mid; g1.lineCap = 'round';
      const br = (bx, by, a, len, w) => {
        if (w < 2) return;
        const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
        g1.lineWidth = w; g1.beginPath(); g1.moveTo(bx, by); g1.lineTo(ex, ey); g1.stroke();
        br(ex, ey, a - .5 - r() * .3, len * .68, w * .6);
        br(ex, ey, a + .4 + r() * .3, len * .68, w * .6);
      };
      br(x, base, -Math.PI / 2, h * .4, h * .07);
      if (r() < .6) glowShroom(g1, x + r() * 60 - 30, base, 8 + r() * 9, pal.shroom[1]);
    };
    for (let i = 0; i < 8; i++) {
      const x = U.clamp(((i / 8) * W + r() * 140) % W, 190, W - 190);
      if (pal.dead) deadTree(x, H * .99, 320 + r() * 280);
      else tree(x, H * 1.01, 420 + r() * 340);
    }
    // floating islands with glowing mushrooms (like the reference)
    for (let i = 0; i < 3; i++) {
      const iw = 100 + r() * 120;
      const ix = U.clamp((i / 3) * W + r() * 300, iw + 50, W - iw - 50), iy = H * (.16 + r() * .26);
      // rocky underside
      g1.fillStyle = pal.mid;
      g1.beginPath();
      g1.moveTo(ix - iw, iy);
      g1.quadraticCurveTo(ix - iw * .5, iy + iw * .45, ix, iy + iw * .5);
      g1.quadraticCurveTo(ix + iw * .55, iy + iw * .42, ix + iw, iy);
      g1.closePath(); g1.fill();
      // grassy top
      g1.fillStyle = pal.midHi;
      g1.beginPath(); g1.ellipse(ix, iy, iw, iw * .18, 0, 0, U.TAU); g1.fill();
      // hanging roots
      g1.strokeStyle = pal.mid; g1.lineWidth = 3;
      for (let v = 0; v < 3; v++) {
        const vx = ix - iw * .4 + r() * iw * .8;
        g1.beginPath(); g1.moveTo(vx, iy + iw * .3);
        g1.quadraticCurveTo(vx + 6, iy + iw * .45, vx - 3, iy + iw * (.5 + r() * .2));
        g1.stroke();
      }
      for (let m = 0; m < 3; m++) glowShroom(g1, ix - iw * .5 + r() * iw, iy - iw * .04, 10 + r() * 15, pal.shroom[1]);
    }
    layers.push({ cv: c1, speed: .3 });

    /* --- L2: near foliage, bushes, big glow shrooms + canopy overhang --- */
    const c2 = mk(); const g2 = c2.getContext('2d');
    // canopy overhang from the top (depth framing, like the reference)
    g2.fillStyle = pal.near;
    for (let i = 0; i < 12; i++) {
      const cs = 60 + r() * 130, cxx = U.clamp(r() * W, cs, W - cs);
      g2.beginPath(); g2.arc(cxx, -cs * .45, cs, 0, U.TAU); g2.fill();
    }
    g2.fillStyle = pal.mid;
    for (let i = 0; i < 8; i++) {
      const cs = 40 + r() * 80, cxx = U.clamp(r() * W, cs, W - cs);
      g2.beginPath(); g2.arc(cxx, -cs * .5, cs, 0, U.TAU); g2.fill();
    }
    // ground foliage line (periodic = seamless)
    const k3 = U.TAU * 6 / W, k4 = U.TAU * 13 / W;
    g2.fillStyle = pal.near;
    g2.beginPath(); g2.moveTo(0, H);
    for (let x = 0; x <= W; x += 32) {
      g2.lineTo(x, H * .84 + Math.sin(x * k3 + seed) * 32 + Math.sin(x * k4) * 12);
    }
    g2.lineTo(W, H); g2.fill();
    // layered bushes
    for (let i = 0; i < 22; i++) {
      const bs = 30 + r() * 55, bx = U.clamp(r() * W, bs, W - bs), by = H * (.86 + r() * .12);
      g2.fillStyle = i % 3 ? pal.near : pal.mid;
      g2.beginPath(); g2.arc(bx, by, bs, 0, U.TAU); g2.fill();
      if (i % 3 === 0) {
        g2.fillStyle = pal.midHi;
        g2.beginPath(); g2.arc(bx - bs * .3, by - bs * .4, bs * .4, 0, U.TAU); g2.fill();
      }
    }
    // big glowing mushrooms
    for (let i = 0; i < 8; i++) {
      const ms = 24 + r() * 34;
      glowShroom(g2, U.clamp(r() * W, ms * 3, W - ms * 3), H * (.88 + r() * .09), ms, pal.shroom[0]);
    }
    layers.push({ cv: c2, speed: .55 });

    return { layers, pal };
  },

  /* ================= vignette (cached) ================= */
  _vig: null, _vigW: 0, _vigH: 0,
  vignette(ctx, w, h) {
    if (!this._vig || this._vigW !== w || this._vigH !== h) {
      this._vig = document.createElement('canvas');
      this._vig.width = Math.max(2, w >> 1); this._vig.height = Math.max(2, h >> 1);
      const g = this._vig.getContext('2d');
      const gr = g.createRadialGradient(w / 4, h / 4, Math.min(w, h) * .28, w / 4, h / 4, Math.max(w, h) * .58);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(4,10,18,.42)');
      g.fillStyle = gr; g.fillRect(0, 0, w / 2, h / 2);
      this._vigW = w; this._vigH = h;
    }
    ctx.drawImage(this._vig, 0, 0, w, h);
  },

  /* ================= portraits for HUD & dialog ================= */
  _ports: {},
  portrait(who) {
    if (this._ports[who]) return this._ports[who];
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d');
    const bgc = { joku: ['#2f6fd8', '#143a7e'], jolie: ['#ff8fc0', '#c2427e'], dog: ['#5aaaf0', '#2a5a9e'], panda: ['#ffb9d5', '#d0468b'] }[who];
    const gr = g.createLinearGradient(0, 0, 0, 96);
    gr.addColorStop(0, bgc[0]); gr.addColorStop(1, bgc[1]);
    g.fillStyle = gr;
    g.beginPath(); g.arc(48, 48, 46, 0, U.TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(48, 48, 46, 0, U.TAU); g.clip();
    if (who === 'joku') {
      g.fillStyle = '#ffd9b8'; g.beginPath(); g.arc(48, 56, 30, 0, U.TAU); g.fill();
      g.fillStyle = '#182a68';
      g.beginPath();
      g.moveTo(18, 56); g.quadraticCurveTo(14, 26, 34, 20);
      g.lineTo(30, 34); g.lineTo(44, 16); g.lineTo(46, 30); g.lineTo(58, 15);
      g.lineTo(60, 30); g.lineTo(74, 22); g.quadraticCurveTo(82, 36, 78, 54);
      g.quadraticCurveTo(64, 34, 40, 38); g.quadraticCurveTo(22, 42, 18, 56);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(38, 58, 6.5, 8, 0, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(60, 58, 6.5, 8, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#2f6fd8';
      g.beginPath(); g.arc(39, 59, 4, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(61, 59, 4, 0, U.TAU); g.fill();
      g.strokeStyle = '#c96a4a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(42, 74); g.quadraticCurveTo(49, 79, 56, 74); g.stroke();
    } else if (who === 'jolie') {
      g.fillStyle = '#7a4a2b';
      g.beginPath(); g.ellipse(48, 62, 36, 40, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#ffe0c4'; g.beginPath(); g.arc(48, 56, 28, 0, U.TAU); g.fill();
      g.fillStyle = '#7a4a2b';
      g.beginPath();
      g.moveTo(18, 62); g.quadraticCurveTo(14, 26, 48, 22);
      g.quadraticCurveTo(82, 26, 78, 60);
      g.quadraticCurveTo(72, 40, 58, 40);
      g.quadraticCurveTo(62, 46, 58, 50);
      g.quadraticCurveTo(50, 38, 34, 42);
      g.quadraticCurveTo(22, 46, 18, 62);
      g.fill();
      // flower
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * U.TAU;
        g.fillStyle = '#ff9fce';
        g.beginPath(); g.ellipse(24 + Math.cos(a) * 7, 32 + Math.sin(a) * 7, 5, 5, 0, 0, U.TAU); g.fill();
      }
      g.fillStyle = '#ffe28f'; g.beginPath(); g.arc(24, 32, 4, 0, U.TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(39, 58, 6.5, 8.5, 0, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(60, 58, 6.5, 8.5, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#8a5a30';
      g.beginPath(); g.arc(40, 59, 4.2, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(61, 59, 4.2, 0, U.TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(41.5, 57, 1.6, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(62.5, 57, 1.6, 0, U.TAU); g.fill();
      g.fillStyle = 'rgba(255,120,150,.4)';
      g.beginPath(); g.ellipse(32, 70, 5, 3, 0, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(66, 70, 5, 3, 0, 0, U.TAU); g.fill();
      g.strokeStyle = '#c96a4a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(42, 74); g.quadraticCurveTo(49, 79, 56, 74); g.stroke();
    } else if (who === 'dog') {
      g.fillStyle = '#5aaaf0'; g.beginPath(); g.arc(48, 56, 30, 0, U.TAU); g.fill();
      g.fillStyle = '#3f7fd0';
      g.beginPath(); g.moveTo(24, 36); g.lineTo(18, 12); g.lineTo(40, 26); g.fill();
      g.beginPath(); g.moveTo(72, 36); g.lineTo(78, 12); g.lineTo(56, 26); g.fill();
      g.fillStyle = '#cfe9ff'; g.beginPath(); g.ellipse(48, 66, 14, 11, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#1a2f4f';
      g.beginPath(); g.arc(48, 60, 5, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(35, 50, 4.5, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(61, 50, 4.5, 0, U.TAU); g.fill();
      g.strokeStyle = '#1a2f4f'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(48, 65); g.quadraticCurveTo(42, 72, 36, 68); g.stroke();
      g.beginPath(); g.moveTo(48, 65); g.quadraticCurveTo(54, 72, 60, 68); g.stroke();
    } else { // panda
      g.fillStyle = '#ffd9e8'; g.beginPath(); g.arc(48, 56, 30, 0, U.TAU); g.fill();
      g.fillStyle = '#e2609d';
      g.beginPath(); g.arc(26, 30, 11, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(70, 30, 11, 0, U.TAU); g.fill();
      g.fillStyle = '#e88ab5';
      g.beginPath(); g.ellipse(37, 54, 8.5, 11, -.3, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(60, 54, 8.5, 11, .3, 0, U.TAU); g.fill();
      g.fillStyle = '#38202e';
      g.beginPath(); g.arc(38, 54, 4, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(60, 54, 4, 0, U.TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(39.5, 52.5, 1.5, 0, U.TAU); g.fill();
      g.beginPath(); g.arc(61.5, 52.5, 1.5, 0, U.TAU); g.fill();
      g.fillStyle = '#a03a68'; g.beginPath(); g.arc(49, 66, 3.5, 0, U.TAU); g.fill();
      g.strokeStyle = '#a03a68'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(44, 73); g.quadraticCurveTo(49, 77, 54, 73); g.stroke();
    }
    g.restore();
    // rim
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
    g.beginPath(); g.arc(48, 48, 44.5, 0, U.TAU); g.stroke();
    this._ports[who] = c;
    return c;
  }
};
