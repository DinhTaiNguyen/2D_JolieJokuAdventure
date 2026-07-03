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

  limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  },

  /* ================= JOKU — phoenix of the ocean 💙 ================= */
  drawJoku(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.pose === 'down') { ctx.rotate(-1.25 * p.dir); ctx.translate(0, -6); }
    ctx.scale(p.dir, 1);
    const sq = p.squash || 0;
    ctx.scale(1 + sq * .35, 1 - sq * .35);

    const run = Math.abs(p.vx) > 30 && p.onGround;
    const ph = p.animT * 13;
    const air = !p.onGround;
    const swing = run ? Math.sin(ph) : 0;
    const bounce = run ? Math.abs(Math.sin(ph)) * 2.5 : Math.sin(t * 2.2) * 1.2;
    const hug = p.pose === 'hug' || p.pose === 'kiss';
    const atk = p.atkT != null && p.atkT < .28;

    // phoenix wings (double jump / dash) — additive water-flame
    if (p.wing > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = p.wing * .85;
      const flap = Math.sin(t * 16) * .25;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(-4, -38 - bounce);
        ctx.rotate(s * (.55 + flap) - .35);
        const grd = ctx.createLinearGradient(0, 0, -46 * p.wing, -30);
        grd.addColorStop(0, 'rgba(160,240,255,.95)');
        grd.addColorStop(.55, 'rgba(60,160,255,.7)');
        grd.addColorStop(1, 'rgba(20,80,220,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-30 * p.wing, -34 * p.wing, -52 * p.wing, -20 * p.wing);
        ctx.quadraticCurveTo(-40 * p.wing, -6, -34 * p.wing, 4);
        ctx.quadraticCurveTo(-16 * p.wing, 8, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // legs (dark pants, blue boots)
    const legA = air ? .5 : swing;
    const legB = air ? -.2 : -swing;
    this.limb(ctx, -2, -22 + bounce * .4, -2 + legA * 8, -1, 7, '#232a52');
    this.limb(ctx, 3, -22 + bounce * .4, 3 + legB * 8, -1, 7, '#2a3266');
    ctx.fillStyle = '#2e6ad1';
    ctx.beginPath(); ctx.ellipse(-2 + legA * 8, -2, 5.5, 3.6, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3 + legB * 8, -2, 5.5, 3.6, 0, 0, U.TAU); ctx.fill();

    // torso — blue & white hero jacket
    ctx.translate(0, -bounce);
    const grd2 = ctx.createLinearGradient(0, -44, 0, -20);
    grd2.addColorStop(0, '#2f6fd8'); grd2.addColorStop(1, '#1d3f8f');
    ctx.fillStyle = grd2;
    ctx.beginPath(); ctx.roundRect(-9, -43, 18, 22, 7); ctx.fill();
    ctx.fillStyle = '#eef6ff';
    ctx.beginPath(); ctx.roundRect(-3, -42, 8, 20, 4); ctx.fill();
    ctx.fillStyle = '#f5c76a';
    ctx.fillRect(-9, -25, 18, 3.4);

    // scarf flutter
    ctx.fillStyle = '#9fdcff';
    ctx.beginPath();
    ctx.moveTo(-8, -40);
    ctx.quadraticCurveTo(-19 - Math.sin(t * 7) * 4, -36 + Math.sin(t * 9) * 3, -23 - Math.abs(p.vx) * .02, -28 + Math.sin(t * 6) * 4);
    ctx.lineTo(-14, -26); ctx.quadraticCurveTo(-9, -33, -7, -36);
    ctx.fill();

    // arms
    const armSw = run ? -swing : 0;
    if (hug) {
      this.limb(ctx, -6, -38, 9, -44, 5.5, '#2f6fd8');
      this.limb(ctx, 6, -38, 12, -33, 5.5, '#3f7fe8');
    } else if (atk) {
      this.limb(ctx, -6, -38, -9 + armSw * 4, -26, 5.5, '#2f6fd8');
      this.limb(ctx, 6, -38, 17, -37, 5.5, '#3f7fe8');
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 19, -37, 10, '#7fd8ff', .9);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      this.limb(ctx, -6, -38, -7 + armSw * 7, -26 + Math.abs(armSw) * 3, 5.5, '#2f6fd8');
      this.limb(ctx, 6, -38, 8 - armSw * 7, -26 + Math.abs(armSw) * 3, 5.5, '#3f7fe8');
    }

    // head
    const tilt = p.pose === 'kiss' ? .2 : 0;
    ctx.save();
    ctx.translate(1, -51); ctx.rotate(tilt);
    ctx.fillStyle = '#ffd9b8';
    ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, U.TAU); ctx.fill();
    // navy spiky hair
    ctx.fillStyle = '#182a68';
    ctx.beginPath();
    ctx.moveTo(-11.5, 2);
    ctx.quadraticCurveTo(-13, -10, -5, -12.5);
    ctx.lineTo(-7, -7); ctx.lineTo(-1, -13.5); ctx.lineTo(0, -8);
    ctx.lineTo(5, -13); ctx.lineTo(6, -7.5); ctx.lineTo(11, -10.5);
    ctx.quadraticCurveTo(12.5, -4, 11.5, -1);
    ctx.quadraticCurveTo(6, -8.5, -4, -7.5);
    ctx.quadraticCurveTo(-10, -6, -11.5, 2);
    ctx.fill();
    // eyes
    if (p.pose === 'kiss' || (p.blink > 0)) {
      ctx.strokeStyle = '#1a2340'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(2, -1); ctx.quadraticCurveTo(4, .6, 6, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -1); ctx.quadraticCurveTo(9.6, .6, 11, -1); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(4, -1.4, 2.5, 3.1, 0, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9.4, -1.4, 2.3, 3, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#2f6fd8';
      ctx.beginPath(); ctx.arc(4.7, -1.1, 1.5, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(10, -1.1, 1.4, 0, U.TAU); ctx.fill();
    }
    // smile
    ctx.strokeStyle = '#c96a4a'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(5, 4.6); ctx.quadraticCurveTo(7.5, 6.4, 9.8, 4.6); ctx.stroke();
    ctx.restore();

    ctx.restore();
    this._statusFx(ctx, p, t, '#7fd8ff');
  },

  /* ================= JOLIE — heart of the flowers 💗 ================= */
  drawJolie(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.pose === 'down') { ctx.rotate(-1.25 * p.dir); ctx.translate(0, -6); }
    ctx.scale(p.dir, 1);
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
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.1;
        this.glow(ctx, Math.cos(a) * 18, -30 + Math.sin(a) * 10, 7, '#ff9fce', .55);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // long brown hair behind
    ctx.fillStyle = '#6e4226';
    ctx.beginPath();
    ctx.moveTo(-6, -58);
    ctx.quadraticCurveTo(-16, -50, -14 - Math.sin(t * 5) * 2 - Math.abs(p.vx) * .015, -26 + Math.sin(t * 4) * 2);
    ctx.quadraticCurveTo(-12, -20, -6, -22);
    ctx.quadraticCurveTo(-10, -38, -4, -50);
    ctx.fill();

    // legs — boots & socks
    const legA = air ? .5 : swing;
    const legB = air ? -.2 : -swing;
    this.limb(ctx, -2, -20 + bounce * .4, -2 + legA * 8, -1, 6, '#ffe9d9'); // socks
    this.limb(ctx, 3, -20 + bounce * .4, 3 + legB * 8, -1, 6, '#fff2e6');
    ctx.fillStyle = '#a05a6e';
    ctx.beginPath(); ctx.ellipse(-2 + legA * 8, -2, 5.2, 3.4, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3 + legB * 8, -2, 5.2, 3.4, 0, 0, U.TAU); ctx.fill();

    ctx.translate(0, -bounce);
    // dress — pink with swishing skirt
    const flare = (p.glide ? 6 : 0) + Math.abs(swing) * 3;
    const grd = ctx.createLinearGradient(0, -42, 0, -14);
    grd.addColorStop(0, '#ff9cc6'); grd.addColorStop(1, '#e2609d');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(-7, -40);
    ctx.lineTo(7, -40);
    ctx.quadraticCurveTo(10, -30, 12 + flare, -16);
    ctx.quadraticCurveTo(0, -11 - (p.glide ? 3 : 0), -12 - flare, -16);
    ctx.quadraticCurveTo(-10, -30, -7, -40);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-4, -40, 8, 8, 3); ctx.fill(); // collar
    ctx.fillStyle = '#f5c76a';
    ctx.fillRect(-8.5, -31, 17, 3); // belt

    // arms
    const armSw = run ? -swing : 0;
    if (hug) {
      this.limb(ctx, -5, -37, 9, -43, 5, '#ffb3d1');
      this.limb(ctx, 5, -37, 12, -32, 5, '#ffc4dc');
    } else if (atk) {
      this.limb(ctx, -5, -37, -8 + armSw * 4, -26, 5, '#ffb3d1');
      this.limb(ctx, 5, -37, 16, -36, 5, '#ffc4dc');
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 18, -36, 10, '#ff9fce', .9);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      this.limb(ctx, -5, -37, -6 + armSw * 6, -25 + Math.abs(armSw) * 3, 5, '#ffb3d1');
      this.limb(ctx, 5, -37, 7 - armSw * 6, -25 + Math.abs(armSw) * 3, 5, '#ffc4dc');
    }

    // head
    const tilt = p.pose === 'kiss' ? -.18 : 0;
    ctx.save();
    ctx.translate(1, -50); ctx.rotate(tilt);
    ctx.fillStyle = '#ffe0c4';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, U.TAU); ctx.fill();
    // brown hair with side bangs
    ctx.fillStyle = '#7a4a2b';
    ctx.beginPath();
    ctx.moveTo(-11, 3);
    ctx.quadraticCurveTo(-13.5, -8, -6, -11.5);
    ctx.quadraticCurveTo(0, -13.5, 7, -11);
    ctx.quadraticCurveTo(12.5, -8, 11, -.5);
    ctx.quadraticCurveTo(9, -6.5, 4, -7.5);
    ctx.quadraticCurveTo(6, -4, 5, -2);
    ctx.quadraticCurveTo(1, -8, -5, -6.5);
    ctx.quadraticCurveTo(-10, -5, -11, 3);
    ctx.fill();
    // flower in hair
    ctx.save(); ctx.translate(-7.5, -8);
    for (let i = 0; i < 5; i++) {
      ctx.rotate(U.TAU / 5);
      ctx.fillStyle = '#ff9fce';
      ctx.beginPath(); ctx.ellipse(0, -3.2, 1.9, 3, 0, 0, U.TAU); ctx.fill();
    }
    ctx.fillStyle = '#ffe28f'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, U.TAU); ctx.fill();
    ctx.restore();
    // eyes — big with lashes
    if (p.pose === 'kiss' || (p.blink > 0)) {
      ctx.strokeStyle = '#5e3a20'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(1.6, -.6); ctx.quadraticCurveTo(3.8, 1, 6, -.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7.6, -.6); ctx.quadraticCurveTo(9.4, 1, 11, -.6); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(3.8, -1, 2.7, 3.4, 0, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9.4, -1, 2.5, 3.2, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#8a5a30';
      ctx.beginPath(); ctx.arc(4.4, -.7, 1.7, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(10, -.7, 1.6, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(5, -1.4, .6, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(10.5, -1.4, .55, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#5e3a20'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(1, -4); ctx.lineTo(2.2, -4.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(11, -4.8); ctx.stroke();
    }
    // blush + smile
    ctx.fillStyle = 'rgba(255,130,160,.4)';
    ctx.beginPath(); ctx.ellipse(1.2, 3.2, 2.1, 1.2, 0, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, 3.2, 2.1, 1.2, 0, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#c96a4a'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(5, 4.4); ctx.quadraticCurveTo(7.2, 6.2, 9.4, 4.4); ctx.stroke();
    ctx.restore();

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
  drawDog(ctx, pet, t) { // Kai the blue puppy 💙
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.scale(pet.dir, 1);
    const run = Math.abs(pet.vx) > 25;
    const ph = pet.animT * 15;
    const bob = run ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 3) * 1;
    ctx.translate(0, -bob);
    // tail wag
    ctx.strokeStyle = '#4f9fe8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-11, -12);
    ctx.quadraticCurveTo(-17, -16 + Math.sin(t * 12) * 3, -15, -21 + Math.sin(t * 12) * 3);
    ctx.stroke();
    // legs
    const sw = run ? Math.sin(ph) * 4 : 0;
    this.limb(ctx, -7, -8, -7 + sw, 0, 3.5, '#3f8fd8');
    this.limb(ctx, 6, -8, 6 - sw, 0, 3.5, '#3f8fd8');
    // body
    ctx.fillStyle = '#5aaaf0';
    ctx.beginPath(); ctx.ellipse(-2, -11, 11, 7.5, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#bfe4ff';
    ctx.beginPath(); ctx.ellipse(-2, -8, 7, 4, 0, 0, U.TAU); ctx.fill();
    // collar
    ctx.fillStyle = '#f5c76a';
    ctx.beginPath(); ctx.roundRect(4, -16, 3, 8, 1.5); ctx.fill();
    // head
    ctx.fillStyle = '#5aaaf0';
    ctx.beginPath(); ctx.arc(9, -17, 7.5, 0, U.TAU); ctx.fill();
    // ears
    ctx.fillStyle = '#3f7fd0';
    ctx.beginPath(); ctx.moveTo(4, -22); ctx.lineTo(2, -29); ctx.lineTo(8, -25); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -23); ctx.lineTo(11, -30); ctx.lineTo(15, -24); ctx.fill();
    // snout + face
    ctx.fillStyle = '#cfe9ff';
    ctx.beginPath(); ctx.ellipse(13, -14.5, 4, 3, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#1a2f4f';
    ctx.beginPath(); ctx.arc(15.4, -15.4, 1.5, 0, U.TAU); ctx.fill(); // nose
    ctx.beginPath(); ctx.arc(8.5, -18.5, 1.5, 0, U.TAU); ctx.fill(); // eye
    // tongue when running
    if (run) { ctx.fillStyle = '#ff8fa0'; ctx.beginPath(); ctx.ellipse(14.5, -11.5, 1.6, 2.6, .3, 0, U.TAU); ctx.fill(); }
    ctx.restore();
  },

  drawPanda(ctx, pet, t) { // Momo the pink panda 💗
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.scale(pet.dir, 1);
    const run = Math.abs(pet.vx) > 25;
    const ph = pet.animT * 12;
    const bob = run ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 2.5) * .8;
    const waddle = run ? Math.sin(ph) * .12 : Math.sin(t * 2) * .04;
    ctx.rotate(waddle);
    ctx.translate(0, -bob);
    // legs
    const sw = run ? Math.sin(ph) * 3.5 : 0;
    this.limb(ctx, -5, -7, -5 + sw, 0, 5, '#d0468b');
    this.limb(ctx, 5, -7, 5 - sw, 0, 5, '#d0468b');
    // round body
    ctx.fillStyle = '#ffc9de';
    ctx.beginPath(); ctx.ellipse(0, -13, 11.5, 10.5, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#fff0f6';
    ctx.beginPath(); ctx.ellipse(1, -10, 7.5, 6.5, 0, 0, U.TAU); ctx.fill();
    // arms
    this.limb(ctx, -8, -16, -11, -10, 5, '#d0468b');
    this.limb(ctx, 8, -16, 11, -10, 5, '#d0468b');
    // head
    ctx.fillStyle = '#ffd9e8';
    ctx.beginPath(); ctx.arc(2, -26, 9.5, 0, U.TAU); ctx.fill();
    // ears
    ctx.fillStyle = '#e2609d';
    ctx.beginPath(); ctx.arc(-4.5, -33, 4, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(8.5, -33, 4, 0, U.TAU); ctx.fill();
    // eye patches
    ctx.fillStyle = '#e88ab5';
    ctx.beginPath(); ctx.ellipse(-1.5, -26.5, 3.1, 3.8, -.3, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6.5, -26.5, 3.1, 3.8, .3, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#38202e';
    ctx.beginPath(); ctx.arc(-1, -26, 1.5, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(6.8, -26, 1.5, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-.6, -26.6, .55, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(7.2, -26.6, .55, 0, U.TAU); ctx.fill();
    // nose + smile
    ctx.fillStyle = '#a03a68';
    ctx.beginPath(); ctx.arc(2.8, -22.5, 1.3, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#a03a68'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1, -20.4); ctx.quadraticCurveTo(2.8, -19, 4.8, -20.4); ctx.stroke();
    ctx.restore();
  },

  /* ================= ENEMIES ================= */
  drawEnemy(ctx, e, t) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const flash = e.flash > 0;
    switch (e.type) {
      case 'slime': {
        const squish = 1 + Math.sin(e.t * 6) * .08 - (e.hopY > 1 ? .15 : 0);
        ctx.scale(e.dir, 1);
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -10, 22, '#6e3ad8', .25);
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createLinearGradient(0, -26, 0, 0);
        g.addColorStop(0, flash ? '#cfaaff' : '#5e3596'); g.addColorStop(1, flash ? '#9e7ad8' : '#2a1544');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, -11, 15 / squish, 12 * squish, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.ellipse(-5, -16, 4, 2.5, -.5, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#ff5e8f';
        ctx.beginPath(); ctx.arc(3, -13, 2.5, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -13, 2.2, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#1a0e2a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(3, -7); ctx.quadraticCurveTo(6, -5.5, 9, -7); ctx.stroke();
        break;
      }
      case 'wisp': {
        const fl = Math.sin(e.t * 11) * 3;
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, -14, 26, '#9e5eff', .5);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = flash ? 'rgba(230,210,255,.95)' : 'rgba(110,70,190,.85)';
        ctx.beginPath();
        ctx.moveTo(0, -30 - fl);
        ctx.quadraticCurveTo(11, -22, 9, -10);
        ctx.quadraticCurveTo(6, -2, 0, -3 + fl * .4);
        ctx.quadraticCurveTo(-6, -2, -9, -10);
        ctx.quadraticCurveTo(-11, -22, 0, -30 - fl);
        ctx.fill();
        ctx.fillStyle = '#e8d9ff';
        ctx.beginPath(); ctx.ellipse(-3, -16, 2, 3.5, 0, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -16, 2, 3.5, 0, 0, U.TAU); ctx.fill();
        break;
      }
      case 'thorn': {
        ctx.scale(e.dir, 1);
        const wob = Math.sin(e.t * 10) * .08;
        ctx.rotate(wob);
        ctx.fillStyle = flash ? '#b09ad0' : '#2f1f45';
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * U.TAU + e.t * .6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 12, -14 + Math.sin(a) * 12);
          ctx.lineTo(Math.cos(a + .18) * 20, -14 + Math.sin(a + .18) * 20);
          ctx.lineTo(Math.cos(a + .36) * 12, -14 + Math.sin(a + .36) * 12);
          ctx.fill();
        }
        const g = ctx.createRadialGradient(0, -16, 2, 0, -14, 14);
        g.addColorStop(0, flash ? '#cfbaea' : '#503468'); g.addColorStop(1, flash ? '#9a86bc' : '#241538');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, -14, 13, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#ff4a4a';
        ctx.beginPath(); ctx.arc(4, -16, 2.6, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(9, -15, 2.2, 0, U.TAU); ctx.fill();
        break;
      }
    }
    ctx.restore();
    // hp bar when recently hurt
    if (e.hurtShow > 0 && e.hp > 0) {
      const w = 30, hy = e.y - (e.type === 'wisp' ? 40 : 34);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(e.x - w / 2, hy, w, 4);
      ctx.fillStyle = '#ff5e7a';
      ctx.fillRect(e.x - w / 2, hy, w * (e.hp / e.maxHp), 4);
    }
  },

  /* ================= BOSS — the Gloomheart ================= */
  drawBoss(ctx, e, t) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const pulse = 1 + Math.sin(t * 3) * .04 + (e.flash > 0 ? .06 : 0);
    const dying = e.dying || 0;
    ctx.scale(pulse, pulse);
    // dark aura
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, 0, -10, 120, dying > 0 ? '#ff9fce' : '#6e3ad8', .4 + Math.sin(t * 2) * .1);
    ctx.globalCompositeOperation = 'source-over';
    // heart body
    const s = 85;
    const g = ctx.createLinearGradient(0, -s, 0, s * .5);
    if (dying > 0) { g.addColorStop(0, '#ff9fce'); g.addColorStop(1, '#e2609d'); }
    else { g.addColorStop(0, e.flash > 0 ? '#8a6ab8' : '#4a2a78'); g.addColorStop(1, e.flash > 0 ? '#5e447e' : '#1c0e38'); }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, s * .42);
    ctx.bezierCurveTo(-s * 1.15, -s * .5, -s * .6, -s * 1.15, 0, -s * .38);
    ctx.bezierCurveTo(s * .6, -s * 1.15, s * 1.15, -s * .5, 0, s * .42);
    ctx.fill();
    // cracks appear as it weakens
    const dmg = 1 - e.hp / e.maxHp;
    if (dmg > .1 && dying === 0) {
      ctx.strokeStyle = `rgba(200,160,255,${.3 + dmg * .5})`; ctx.lineWidth = 2.5;
      const cracks = [[-20, -50, -34, -20, -22, 6], [15, -55, 30, -25, 20, 2], [0, -30, -8, 0, 4, 20]];
      const n = Math.ceil(dmg * 3);
      for (let i = 0; i < n; i++) {
        const c = cracks[i];
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke();
      }
    }
    // thorn crown
    if (dying === 0) {
      ctx.fillStyle = '#241538';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 18 - 7, -s * .62);
        ctx.lineTo(i * 18, -s * .62 - 22 - Math.abs(i) * -4);
        ctx.lineTo(i * 18 + 7, -s * .62);
        ctx.fill();
      }
    }
    // face
    if (dying > 0) { // purified — happy at last
      ctx.strokeStyle = '#7e2a52'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-22, -25, 8, .2, Math.PI - .2); ctx.stroke();
      ctx.beginPath(); ctx.arc(22, -25, 8, .2, Math.PI - .2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -2, 12, .3, Math.PI - .3); ctx.stroke();
    } else {
      ctx.fillStyle = '#ff4a6a';
      ctx.save(); ctx.translate(-22, -28); ctx.rotate(.35);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, U.TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(22, -28); ctx.rotate(-.35);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, U.TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#ff7a94'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 8, 14, Math.PI + .5, U.TAU - .5); ctx.stroke();
    }
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
    }
  },

  /* ================= PLATFORMS ================= */
  drawPlatform(ctx, pl, pal, t) {
    if (pl.type === 'ground') {
      const g = ctx.createLinearGradient(0, pl.y, 0, pl.y + pl.h);
      g.addColorStop(0, pal.soilT); g.addColorStop(1, pal.soilB);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(pl.x, pl.y + 6, pl.w, pl.h - 6, [0, 0, 14, 14]); ctx.fill();
      // mossy grass top
      const gg = ctx.createLinearGradient(0, pl.y - 4, 0, pl.y + 16);
      gg.addColorStop(0, pal.grassT); gg.addColorStop(1, pal.grassB);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.roundRect(pl.x - 4, pl.y - 2, pl.w + 8, 16, 8); ctx.fill();
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
      const sg = ctx.createLinearGradient(cx - 10, 0, cx + 12, 0);
      sg.addColorStop(0, '#cbb894'); sg.addColorStop(.5, '#efe3c4'); sg.addColorStop(1, '#b8a37e');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(cx - 13, pl.y + 8);
      ctx.quadraticCurveTo(cx - 9, pl.y + pl.stem * .6, cx - 17, pl.y + pl.stem);
      ctx.lineTo(cx + 17, pl.y + pl.stem);
      ctx.quadraticCurveTo(cx + 9, pl.y + pl.stem * .6, cx + 13, pl.y + 8);
      ctx.fill();
      // cap
      const cg = ctx.createLinearGradient(0, pl.y - 26, 0, pl.y + 14);
      cg.addColorStop(0, pl.capC[0]); cg.addColorStop(1, pl.capC[1]);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(pl.x - 6, pl.y + 10);
      ctx.quadraticCurveTo(cx, pl.y - 34, pl.x + pl.w + 6, pl.y + 10);
      ctx.quadraticCurveTo(cx, pl.y + 20, pl.x - 6, pl.y + 10);
      ctx.fill();
      // spots
      ctx.fillStyle = 'rgba(255,245,225,.5)';
      for (const s of pl.spots) {
        ctx.beginPath(); ctx.ellipse(pl.x + s[0], pl.y - s[1], s[2], s[2] * .7, 0, 0, U.TAU); ctx.fill();
      }
      // under-glow
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, cx, pl.y + 14, pl.w * .4, pl.glowC, .22 + Math.sin(t * 1.8 + pl.x) * .08);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  },

  /* ================= GATE & SHRINE ================= */
  drawGate(ctx, gx, gy, t, near) {
    ctx.save();
    ctx.translate(gx, gy);
    const glow = near ? .8 : .35 + Math.sin(t * 1.5) * .1;
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, 0, -70, 90, '#ff9fce', glow * .5);
    ctx.globalCompositeOperation = 'source-over';
    // stone pillars
    for (const s of [-1, 1]) {
      const pg = ctx.createLinearGradient(s * 46 - 12, 0, s * 46 + 12, 0);
      pg.addColorStop(0, '#5e6e80'); pg.addColorStop(.5, '#8fa0b4'); pg.addColorStop(1, '#4a5866');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.roundRect(s * 46 - 11, -118, 22, 118, 8); ctx.fill();
      ctx.fillStyle = '#a8bccc';
      ctx.beginPath(); ctx.roundRect(s * 46 - 15, -126, 30, 12, 4); ctx.fill();
      // vines
      ctx.strokeStyle = '#3f7f57'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s * 46 - 8, -110);
      ctx.quadraticCurveTo(s * 46 + s * 8, -80, s * 46 - s * 4, -40);
      ctx.stroke();
    }
    // heart arch
    ctx.save();
    ctx.translate(0, -128 + Math.sin(t * 2) * 3);
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, 0, 0, 40, '#ff7fb5', glow);
    ctx.globalCompositeOperation = 'source-over';
    this.heart(ctx, 0, 4, 24, near ? '#ff86b8' : '#c46a94');
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(-7, -6, 4, 0, U.TAU); ctx.fill();
    ctx.restore();
    if (near) {
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(0, -120, 0, 0);
      bg.addColorStop(0, 'rgba(255,170,215,.35)'); bg.addColorStop(1, 'rgba(255,170,215,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(-40, -120, 80, 120);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  drawShrine(ctx, sx, sy, t, active) {
    ctx.save();
    ctx.translate(sx, sy);
    // pedestal
    const g = ctx.createLinearGradient(-20, 0, 20, 0);
    g.addColorStop(0, '#566878'); g.addColorStop(.5, '#8496a8'); g.addColorStop(1, '#46525e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-16, -44, 32, 44, [6, 6, 2, 2]); ctx.fill();
    ctx.fillStyle = '#93a6ba';
    ctx.beginPath(); ctx.roundRect(-22, -50, 44, 10, 4); ctx.fill();
    // crystal heart
    const bob = Math.sin(t * 2) * 3;
    if (active) {
      ctx.globalCompositeOperation = 'lighter';
      this.glow(ctx, 0, -68 + bob, 42, '#ff9fce', .55 + Math.sin(t * 3) * .15);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.heart(ctx, 0, -64 + bob, 16, active ? '#ff86b8' : 'rgba(150,140,170,.75)');
    ctx.fillStyle = active ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.arc(-4.5, -70 + bob, 2.5, 0, U.TAU); ctx.fill();
    ctx.restore();
  },

  /* ================= PROJECTILES ================= */
  drawProj(ctx, pr, t) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    switch (pr.kind) {
      case 'phoenix': { // water-phoenix bolt
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 22, '#4fb0ff', .8);
        const flap = Math.sin(t * 28) * 6;
        ctx.fillStyle = 'rgba(170,230,255,.95)';
        ctx.beginPath(); // body
        ctx.moveTo(12, 0);
        ctx.quadraticCurveTo(0, -6, -14, -2 + Math.sin(t * 20) * 2);
        ctx.quadraticCurveTo(-6, 0, -14, 3);
        ctx.quadraticCurveTo(0, 6, 12, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(110,200,255,.75)'; // wings
        ctx.beginPath();
        ctx.moveTo(-1, -2); ctx.quadraticCurveTo(-6, -14 - flap, -16, -12 - flap);
        ctx.quadraticCurveTo(-8, -4, -1, -2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-1, 2); ctx.quadraticCurveTo(-6, 14 + flap, -16, 12 + flap);
        ctx.quadraticCurveTo(-8, 4, -1, 2); ctx.fill();
        break;
      }
      case 'petal': {
        ctx.rotate(pr.t * 12);
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 14, '#ff8fc0', .7);
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 3; i++) {
          ctx.rotate(U.TAU / 3);
          ctx.fillStyle = i % 2 ? '#ffc4dc' : '#ff86b8';
          ctx.beginPath(); ctx.ellipse(5, 0, 6, 3, 0, 0, U.TAU); ctx.fill();
        }
        break;
      }
      case 'darkball':
        ctx.globalCompositeOperation = 'lighter';
        this.glow(ctx, 0, 0, 18, '#9e5eff', .8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#3a1f66';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#c9a0ff';
        ctx.beginPath(); ctx.arc(-2, -2, 2.5, 0, U.TAU); ctx.fill();
        break;
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
    forest: { skyT: '#0d2e3d', skyB: '#2e7268', glowSky: '#9fe8d8', far: '#123f4a', mid: '#0e4a44', near: '#093833',
      soilT: '#3f2f24', soilB: '#211711', grassT: '#4fae66', grassB: '#2e7a4a',
      shroom: ['#e8934f', '#c46a35'], shroomGlow: '#7fd8ff', mist: 'rgba(150,225,215,.10)', fall: true },
    falls: { skyT: '#0a2040', skyB: '#2d6b96', glowSky: '#bfe4ff', far: '#12395c', mid: '#0e4468', near: '#09304e',
      soilT: '#33404f', soilB: '#1a2430', grassT: '#4a9fb0', grassB: '#2e6e86',
      shroom: ['#6fd8ff', '#3fa0e0'], shroomGlow: '#9fe8ff', mist: 'rgba(150,205,255,.13)', fall: true },
    blossom: { skyT: '#3a1d4e', skyB: '#d97e8a', glowSky: '#ffd9a0', far: '#4a2a58', mid: '#5e3060', near: '#3c1e44',
      soilT: '#4a3040', soilB: '#281822', grassT: '#7a9e5e', grassB: '#4f7440',
      shroom: ['#ff9fce', '#e070ac'], shroomGlow: '#ffcfe6', mist: 'rgba(255,190,215,.10)', fall: false },
    shadow: { skyT: '#0a0716', skyB: '#291840', glowSky: '#7a54b0', far: '#150e26', mid: '#1c1132', near: '#110a1f',
      soilT: '#251a33', soilB: '#120b1c', grassT: '#4a3a6e', grassB: '#302352',
      shroom: ['#9e5eff', '#6e3ad8'], shroomGlow: '#c9a0ff', mist: 'rgba(130,95,190,.16)', fall: false },
  },

  makeBackground(theme, seed) {
    const pal = this.PAL[theme];
    const r = U.rng(seed + 777);
    const W = 1920, H = 1080;
    const layers = [];
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

    /* --- L0: sky, celestial glow, farthest silhouettes, waterfall --- */
    const c0 = mk(); const g0 = c0.getContext('2d');
    const sky = g0.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, pal.skyT); sky.addColorStop(1, pal.skyB);
    g0.fillStyle = sky; g0.fillRect(0, 0, W, H);
    // glow orb (sun through canopy / moon)
    const gx = W * .62, gy = H * .2;
    const sg = g0.createRadialGradient(gx, gy, 10, gx, gy, 380);
    sg.addColorStop(0, pal.glowSky + 'cc'); sg.addColorStop(.3, pal.glowSky + '44'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g0.fillStyle = sg; g0.fillRect(0, 0, W, H);
    // god rays
    g0.save(); g0.globalAlpha = .07; g0.fillStyle = pal.glowSky;
    for (let i = 0; i < 5; i++) {
      g0.save(); g0.translate(gx, gy); g0.rotate(.8 + i * .3);
      g0.fillRect(-30, 0, 60 + i * 20, H); g0.restore();
    }
    g0.restore();
    if (theme === 'shadow') { // stars
      g0.fillStyle = 'rgba(220,200,255,.7)';
      for (let i = 0; i < 90; i++) { const s = r() * 1.6 + .4; g0.fillRect(r() * W, r() * H * .6, s, s); }
    }
    // distant treeline silhouette (drawn twice for seamless wrap)
    g0.fillStyle = pal.far;
    const tl = []; for (let x = 0; x <= W; x += 64) tl.push(H * .52 + Math.sin(x * .008 + seed) * 40 + r() * 30);
    g0.beginPath(); g0.moveTo(0, H);
    tl.forEach((y, i) => g0.lineTo(i * 64, y));
    g0.lineTo(W, H); g0.fill();
    // waterfall in the distance
    if (pal.fall) {
      const wx = W * .78;
      const wg = g0.createLinearGradient(wx, H * .3, wx, H);
      wg.addColorStop(0, 'rgba(190,235,255,.55)'); wg.addColorStop(1, 'rgba(140,200,240,.15)');
      g0.fillStyle = wg; g0.fillRect(wx - 26, H * .3, 52, H * .7);
      g0.fillStyle = 'rgba(230,250,255,.35)';
      for (let i = 0; i < 14; i++) g0.fillRect(wx - 22 + r() * 44, H * .3 + r() * H * .65, 2.5, 30 + r() * 60);
      const pg = g0.createRadialGradient(wx, H * .97, 5, wx, H * .97, 120);
      pg.addColorStop(0, 'rgba(220,245,255,.5)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
      g0.fillStyle = pg; g0.beginPath(); g0.ellipse(wx, H * .97, 120, 40, 0, 0, U.TAU); g0.fill();
    }
    layers.push({ cv: c0, speed: .12 });

    /* --- L1: big trees / crystals + floating shroom islands --- */
    const c1 = mk(); const g1 = c1.getContext('2d');
    const tree = (x, base, h, col) => {
      g1.fillStyle = col;
      g1.beginPath(); // trunk
      g1.moveTo(x - h * .06, base);
      g1.quadraticCurveTo(x - h * .1, base - h * .5, x - h * .03, base - h * .82);
      g1.lineTo(x + h * .03, base - h * .82);
      g1.quadraticCurveTo(x + h * .12, base - h * .5, x + h * .07, base);
      g1.fill();
      for (let i = 0; i < 6; i++) { // canopy blobs
        const a = i / 6 * U.TAU;
        const bx = x + Math.cos(a) * h * .22, by = base - h * .85 + Math.sin(a) * h * .13 - h * .05;
        g1.beginPath(); g1.arc(bx, by, h * (.16 + r() * .08), 0, U.TAU); g1.fill();
      }
      g1.beginPath(); g1.arc(x, base - h * .9, h * .2, 0, U.TAU); g1.fill();
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
    };
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * W + r() * 120;
      if (theme === 'shadow') deadTree(x, H * .96, 300 + r() * 260);
      else tree(x, H * .98, 380 + r() * 320, pal.mid);
    }
    // floating islands with glowing mushrooms (like the reference)
    for (let i = 0; i < 4; i++) {
      const ix = r() * W, iy = H * (.18 + r() * .3), iw = 90 + r() * 110;
      g1.fillStyle = pal.mid;
      g1.beginPath(); g1.ellipse(ix, iy, iw, iw * .3, 0, 0, U.TAU); g1.fill();
      g1.fillStyle = pal.grassB;
      g1.beginPath(); g1.ellipse(ix, iy - iw * .12, iw * .95, iw * .16, 0, 0, U.TAU); g1.fill();
      for (let m = 0; m < 3; m++) {
        const mx = ix - iw * .5 + r() * iw, ms = 8 + r() * 14;
        const glowG = g1.createRadialGradient(mx, iy - iw * .18 - ms, 1, mx, iy - iw * .18 - ms, ms * 2.4);
        glowG.addColorStop(0, pal.shroomGlow + 'aa'); glowG.addColorStop(1, 'rgba(0,0,0,0)');
        g1.fillStyle = glowG; g1.fillRect(mx - ms * 2.4, iy - iw * .18 - ms * 3.4, ms * 4.8, ms * 4.8);
        g1.fillStyle = '#dfd4bc'; g1.fillRect(mx - ms * .12, iy - iw * .18 - ms, ms * .24, ms);
        g1.fillStyle = pal.shroom[1];
        g1.beginPath(); g1.ellipse(mx, iy - iw * .18 - ms, ms * .8, ms * .5, 0, Math.PI, U.TAU); g1.fill();
      }
    }
    layers.push({ cv: c1, speed: .3 });

    /* --- L2: near foliage, bushes, big glow shrooms --- */
    const c2 = mk(); const g2 = c2.getContext('2d');
    g2.fillStyle = pal.near;
    const bl = []; for (let x = 0; x <= W; x += 48) bl.push(H * .82 + Math.sin(x * .012 + seed * 2) * 30 + r() * 24);
    g2.beginPath(); g2.moveTo(0, H);
    bl.forEach((y, i) => g2.lineTo(i * 48, y));
    g2.lineTo(W, H); g2.fill();
    // bushes
    for (let i = 0; i < 26; i++) {
      const bx = r() * W, by = H * (.84 + r() * .13), bs = 26 + r() * 50;
      g2.fillStyle = i % 3 ? pal.near : pal.mid;
      g2.beginPath(); g2.arc(bx, by, bs, 0, U.TAU); g2.fill();
    }
    // big glowing mushrooms
    for (let i = 0; i < 7; i++) {
      const mx = r() * W, my = H * (.86 + r() * .1), ms = 22 + r() * 30;
      const glowG = g2.createRadialGradient(mx, my - ms, 2, mx, my - ms, ms * 2.6);
      glowG.addColorStop(0, pal.shroomGlow + 'bb'); glowG.addColorStop(1, 'rgba(0,0,0,0)');
      g2.fillStyle = glowG; g2.fillRect(mx - ms * 2.6, my - ms - ms * 2.6, ms * 5.2, ms * 5.2);
      g2.fillStyle = '#d8ccb4'; g2.fillRect(mx - ms * .14, my - ms, ms * .28, ms);
      g2.fillStyle = pal.shroom[0];
      g2.beginPath(); g2.ellipse(mx, my - ms, ms * .9, ms * .55, 0, Math.PI, U.TAU); g2.fill();
      g2.fillStyle = 'rgba(255,250,235,.5)';
      g2.beginPath(); g2.arc(mx - ms * .3, my - ms * 1.2, ms * .12, 0, U.TAU); g2.fill();
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
