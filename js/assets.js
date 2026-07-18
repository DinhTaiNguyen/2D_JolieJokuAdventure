'use strict';
/* ============================================================================
   ASSETS — AI-art integration layer.
   Loads the images in /assets, auto-trims every frame, and wraps the existing
   procedural draw functions. Every hook falls back to the original procedural
   art if a file is missing or still loading — nothing can break.
   ============================================================================ */
const ASSETS = {
  DIR: 'assets/',

  /* manifest: cols/rows for sheets; trim = alpha-trim frames; black = FX on black */
  MAN: {
    // backgrounds (one painterly layer per theme)
    bg_forest: {}, bg_falls: {}, bg_blossom: {}, bg_shadow: {}, bg_ember: {}, bg_star: {}, bg_village: {},
    // terrain
    tile_forest: { trim: 1 }, tile_falls: { trim: 1 }, tile_blossom: { trim: 1 },
    tile_shadow: { trim: 1 }, tile_ember: { trim: 1 }, tile_star: { trim: 1 }, tile_village: { trim: 1 },
    float_falls: { trim: 1 }, float_blossom: { trim: 1 }, float_shadow: { trim: 1 },
    float_ember: { trim: 1 }, float_star: { trim: 1 }, float_village: { trim: 1 },
    prop_mushroom: { trim: 1 }, prop_gate: { trim: 1 }, prop_shrine: { trim: 1 },
    props_village: { cols: 4, rows: 2, trim: 1 },
    // heroes & supporters — legacy 8-pose sheets (fallback)
    joku_sheet: { cols: 4, rows: 2, trim: 1, lockScale: 1, bleed: .06,  stableX: 1, groundPad: 2 },
    jolie_sheet: { cols: 4, rows: 2, trim: 1, lockScale: 1, bleed: .05,  stableX: 1, groundPad: 2 },
    lulu_sheet: { cols: 4, rows: 1, trim: 1, lockScale: 1, groundPad: 2 },
    biscuit_sheet: { cols: 4, rows: 1, trim: 1, lockScale: 1, groundPad: 2 },
    // heroes & supporters — animation strips (preferred when present)
    joku_run: { cols: 6, rows: 1, trim: 1, bleed: .08, lockScale: 1, groundPad: 2 },
    jolie_run: { cols: 6, rows: 1, trim: 1, bleed: .07, lockScale: 1, groundPad: 2 },
    joku_idle: { cols: 4, rows: 1, trim: 1, bleed: .04, lockScale: 1, groundPad: 2 },
    jolie_idle: { cols: 4, rows: 1, trim: 1, bleed: .04, lockScale: 1, groundPad: 2 },
    joku_actions: { cols: 8, rows: 1, trim: 1, bleed: .08, lockScale: 1, groundPad: 2 },
    jolie_actions: { cols: 8, rows: 1, trim: 1, bleed: .06, lockScale: 1, groundPad: 2 },
    lulu_run: { cols: 6, rows: 1, trim: 1, lockScale: 1, groundPad: 2 },
    biscuit_run: { cols: 6, rows: 1, trim: 1, lockScale: 1, groundPad: 2 },
    lulu_actions: { cols: 4, rows: 1, trim: 1, lockScale: 1, groundPad: 2 },
    biscuit_actions: { cols: 4, rows: 1, trim: 1, lockScale: 1, groundPad: 2 },
    // devils
    enemies_sheet: { cols: 4, rows: 1, trim: 1 },
    enemies_elite_sheet: { cols: 4, rows: 1, trim: 1 },
    enemy_golem: { trim: 1 }, enemy_golem_elite: { trim: 1 },
    enemy_bat: { trim: 1 }, enemy_bat_elite: { trim: 1 },
    enemies_village: { cols: 4, rows: 1, trim: 1 },
    miniboss_village: { cols: 2, rows: 1, trim: 1 },
    // bosses
    boss_RootboundGloom: { trim: 1 }, boss_StormwaterLeviathan: { trim: 1 },
    boss_BriarheartQueen: { trim: 1 }, boss_NightmareGloomheart: { trim: 1 },
    boss_CinderCrown: { trim: 1 }, boss_EclipseHeart: { trim: 1 }, boss_IronHordeWarlord: { trim: 1 },
    // items & weapons
    items_sheet: { cols: 4, rows: 1, trim: 1 },
    weapons_1: { cols: 5, rows: 2, trim: 1 },
    weapons_2: { cols: 5, rows: 2, trim: 1 },
    weapons_village: { cols: 4, rows: 1, trim: 1 },
    // FX (on black — drawn additive)
    fx_projectiles: { cols: 4, rows: 2, black: 1 },
    fx_rings: { cols: 4, rows: 2, black: 1 },
    fx_impacts: { cols: 4, rows: 2, black: 1 },
    fx_enemy: { cols: 4, rows: 1, black: 1 },
    fx_loveburst: { cols: 4, rows: 2, black: 1 },
    fx_phoenixnova: { cols: 4, rows: 2, black: 1 },
    fx_thunderslam: { cols: 4, rows: 2, black: 1 },
    // love trials
    trial_pads: { trim: 1 }, trial_forest: { trim: 1 }, trial_falls: { trim: 1 },
    trial_blossom: { trim: 1 }, trial_shadow: { trim: 1 }, trial_ember: { trim: 1 }, trial_star: { trim: 1 }, trial_village: { trim: 1 },
    // portraits, story CGs, ui
    portrait_joku: {}, portrait_jolie: {}, portrait_lulu: {}, portrait_biscuit: {},
    chapter_badges: { cols: 3, rows: 2, trim: 1 },
    badge_village: { trim: 1 },
    // decorative HUD icons and frames supplied as a single atlas
    ui_kit: { maxW: 1152 },
    title_art: {},
    cg_intro: {}, cg_victory: {}, cg_ending: {},
  },

  TRIAL_MAP: {
    forestBridge: 'trial_forest', oceanPhoenix: 'trial_falls', flowerLift: 'trial_blossom',
    shadowLantern: 'trial_shadow', emberRain: 'trial_ember', starMirror: 'trial_star', giongBridge: 'trial_village'
  },
  BOSS_MAP: {
    root: 'boss_RootboundGloom', tide: 'boss_StormwaterLeviathan', briar: 'boss_BriarheartQueen',
    gloom: 'boss_NightmareGloomheart', ember: 'boss_CinderCrown', eclipse: 'boss_EclipseHeart',
    horde: 'boss_IronHordeWarlord'
  },

  /* The menu needs only a handful of files.  Everything else is loaded when a
     chapter needs it so mobile browsers do not decode the whole art library up front. */
  BOOT_ASSETS: [
    'title_art', 'ui_kit', 'bg_forest', 'tile_forest', 'prop_mushroom',
    'joku_sheet', 'jolie_sheet', 'lulu_sheet', 'biscuit_sheet'
  ],
  PLAY_ASSETS: [
    'prop_gate', 'prop_shrine',
    'joku_sheet', 'jolie_sheet', 'lulu_sheet', 'biscuit_sheet',
    'joku_run', 'jolie_run', 'lulu_run', 'biscuit_run',
    'portrait_joku', 'portrait_jolie', 'portrait_lulu', 'portrait_biscuit',
    'enemies_sheet', 'enemy_golem', 'enemy_bat',
    'items_sheet', 'weapons_1', 'weapons_2',
    'fx_projectiles', 'fx_rings'
  ],
  DEFERRED_ASSETS: [
    'joku_idle', 'jolie_idle', 'joku_actions', 'jolie_actions', 'lulu_actions', 'biscuit_actions',
    'enemies_elite_sheet', 'enemy_golem_elite', 'enemy_bat_elite',
    'fx_impacts', 'fx_enemy', 'fx_loveburst', 'fx_phoenixnova', 'fx_thunderslam'
  ],

  // Atlas coordinates are based on the 2304 x 1296 UI-kit source image.
  UI_RECTS: {
    move: [72, 18, 330, 342],
    attack: [450, 18, 350, 342],
    water: [830, 18, 350, 342],
    star: [1215, 18, 350, 342],
    heart: [1590, 18, 350, 342],
    gift: [1960, 18, 330, 342]
  },

  data: {}, _bgCache: {}, fbs: [], _kb: false,
  _queue: [], _loadState: Object.create(null), _active: 0, _loadStarted: false, _mobile: false,

  has(n) { const d = this.data[n]; return !!(d && d.ok); },
  fr(n, i = 0) { const d = this.data[n]; return (d && d.ok) ? d.frames[Math.min(i, d.frames.length - 1)] : null; },
  theme() { return (typeof G !== 'undefined' && G.level && G.level.theme) || 'forest'; },

  /* ---------------- loading & slicing ---------------- */
  load() {
    if (this._loadStarted) return;
    this._loadStarted = true;
    this._mobile = !!(
      (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4)
    );
    this.request(this.BOOT_ASSETS, true);

    // Let the first paint and the main menu settle before decoding battle art.
    const warmFirstChapter = () => this.prefetchChapter(0, false);
    if ('requestIdleCallback' in window) window.requestIdleCallback(warmFirstChapter, { timeout: 1400 });
    else setTimeout(warmFirstChapter, 700);
  },

  request(names, urgent = false) {
    for (const name of names || []) {
      if (!this.MAN[name] || this.data[name]?.ok) continue;
      const state = this._loadState[name];
      if (state === 'loading' || state === 'done') continue;
      if (state === 'queued') {
        if (urgent) {
          const i = this._queue.indexOf(name);
          if (i >= 0) { this._queue.splice(i, 1); this._queue.unshift(name); }
        }
        continue;
      }
      this._loadState[name] = 'queued';
      if (urgent) this._queue.unshift(name);
      else this._queue.push(name);
    }
    this._pump();
  },

  prefetchChapter(index, urgent = false) {
    if (typeof World === 'undefined' || !World.LEVELS || !World.LEVELS[index]) return;
    const cfg = World.LEVELS[index];
    const themed = [
      'bg_' + cfg.theme, 'tile_' + cfg.theme, 'trial_' + cfg.theme,
      this.BOSS_MAP[cfg.bossKind]
    ];
    if (cfg.theme !== 'forest') themed.push('float_' + cfg.theme);
    if (cfg.theme === 'village') {
      themed.push('props_village', 'enemies_village', 'miniboss_village', 'weapons_village', 'badge_village');
    }
    this.request(this.PLAY_ASSETS, urgent);
    this.request(themed, urgent);
    const lateArt = () => this.request(this.DEFERRED_ASSETS, false);
    if ('requestIdleCallback' in window) window.requestIdleCallback(lateArt, { timeout: 2600 });
    else setTimeout(lateArt, 1400);
  },

  _pump() {
    const limit = this._mobile ? 2 : 4;
    while (this._active < limit && this._queue.length) {
      const name = this._queue.shift();
      const cfg = this.MAN[name];
      if (!cfg || this._loadState[name] !== 'queued') continue;
      this._loadState[name] = 'loading';
      this._active++;
      const img = new Image();
      img.decoding = 'async';
      if ('fetchPriority' in img) img.fetchPriority = this._active <= 2 ? 'high' : 'low';
      const finish = () => {
        this._active--;
        this._loadState[name] = 'done';
        this._pump();
      };
      img.onload = () => { try { this._prep(name, cfg, img); } catch (e) { /* procedural fallback remains */ } finally { finish(); } };
      img.onerror = finish;
      img.src = this.DIR + name + '.png';
    }
  },

  _prep(name, cfg, img) {
    // downscale at load — phones can't hold 60+ full-res decoded images in RAM
    const fullBleed = name.indexOf('bg_') === 0 || name.indexOf('cg_') === 0 || name === 'title_art';
    const cap = cfg.maxW || (fullBleed ? (this._mobile ? 1536 : 2048) : (this._mobile ? 960 : 1152));
    const sc = Math.min(1, cap / img.width);
    // many AI generators bake a fake white/checkerboard "transparency" — strip it
    let src;
    if (!cfg.black && !fullBleed) src = this._key(img, sc);
    else if (sc < 1) src = this._scale(img, sc);
    else src = img;

    const cols = cfg.cols || 1, rows = cfg.rows || 1;
    const frames = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = this._cell(src, cols, rows, c, r);
        const scan = cfg.bleed ? this._expandCell(cell, src, cfg.bleed) : cell;
        let f = cell;
        if (cfg.trim || cfg.black || cols * rows > 1) {
          const b = this._bbox(src, scan.sx, scan.sy, scan.sw, scan.sh, cfg.black);
          if (b) f = this._clampFrame(b, scan);
        }
        frames.push(this._anchorFrame(f, cell));
      }
    }
    this.data[name] = {
      ok: true, img: src, frames, black: !!cfg.black,
      basisH: cfg.lockScale ? this._basisHeight(frames) : 0,
      stableX: !!(cfg.lockScale || cfg.stableX),
      groundPad: cfg.groundPad || 0
    };
    if (name.indexOf('portrait_') === 0) this._makePortrait(name, src);
    if (name === 'title_art') this._menuArt(img);
    if (name.indexOf('bg_') === 0) this._refreshLevelBg(name.slice(3));
  },

  _cell(img, cols, rows, c, r) {
    const x0 = Math.round(c * img.width / cols);
    const x1 = Math.round((c + 1) * img.width / cols);
    const y0 = Math.round(r * img.height / rows);
    const y1 = Math.round((r + 1) * img.height / rows);
    return { sx: x0, sy: y0, sw: Math.max(1, x1 - x0), sh: Math.max(1, y1 - y0) };
  },

  _expandCell(cell, img, bleed) {
    const padX = Math.round(cell.sw * bleed);
    const padY = Math.round(cell.sh * bleed * .35);
    const x0 = Math.max(0, cell.sx - padX);
    const y0 = Math.max(0, cell.sy - padY);
    const x1 = Math.min(img.width, cell.sx + cell.sw + padX);
    const y1 = Math.min(img.height, cell.sy + cell.sh + padY);
    return { sx: x0, sy: y0, sw: Math.max(1, x1 - x0), sh: Math.max(1, y1 - y0) };
  },

  _clampFrame(b, cell) {
    const x0 = U.clamp(Math.round(b.x), cell.sx, cell.sx + cell.sw - 1);
    const y0 = U.clamp(Math.round(b.y), cell.sy, cell.sy + cell.sh - 1);
    const x1 = U.clamp(Math.round(b.x + b.w), x0 + 1, cell.sx + cell.sw);
    const y1 = U.clamp(Math.round(b.y + b.h), y0 + 1, cell.sy + cell.sh);
    return { sx: x0, sy: y0, sw: x1 - x0, sh: y1 - y0 };
  },

  _bgLikeData(d, i) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    return mx >= 188 && (mx - mn) <= 36;
  },

  _basisHeight(frames) {
    const hs = frames.map(f => f.sh).filter(Boolean).sort((a, b) => a - b);
    if (!hs.length) return 0;
    return hs[Math.min(hs.length - 1, Math.max(0, Math.floor(hs.length * .55)))];
  },

  _anchorFrame(f, cell) {
    return Object.assign(f, {
      ox: (f.sx + f.sw / 2) - (cell.sx + cell.sw / 2)
    });
  },

  _scale(img, sc) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * sc));
    cv.height = Math.max(1, Math.round(img.height * sc));
    const g = cv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  },

  /* remove a baked light background (white or checkerboard) via border flood-fill,
     preserving enclosed light areas like eyes and white clothing */
  _key(img, sc = 1) {
    const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    const id = g.getImageData(0, 0, w, h), d = id.data;
    // does this image even have a baked light background? check corners
    let lightCorners = 0;
    for (const [cx, cy] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) {
      const i = (cy * w + cx) * 4;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (d[i + 3] > 200 && mx >= 188 && mx - mn <= 36) lightCorners++;
    }
    if (lightCorners < 3) return cv; // real transparency — keep the downscaled copy as-is
    const bgish = i => {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      return mx >= 188 && (mx - mn) <= 36;
    };
    const visited = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let sp = 0;
    const push = p => { if (!visited[p] && d[p * 4 + 3] > 0 && bgish(p * 4)) { visited[p] = 1; stack[sp++] = p; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (sp > 0) {
      const p = stack[--sp];
      d[p * 4 + 3] = 0;
      const x = p % w;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (p >= w) push(p - w);
      if (p < w * (h - 1)) push(p + w);
    }
    // soften the 1px light halo left along the keyed edges
    for (let p = 0; p < w * h; p++) {
      const a = d[p * 4 + 3];
      if (a === 0) continue;
      const x = p % w;
      const nearCut =
        (x > 0 && d[(p - 1) * 4 + 3] === 0) || (x < w - 1 && d[(p + 1) * 4 + 3] === 0) ||
        (p >= w && d[(p - w) * 4 + 3] === 0) || (p < w * (h - 1) && d[(p + w) * 4 + 3] === 0);
      if (nearCut && bgish(p * 4)) d[p * 4 + 3] = (a * .35) | 0;
    }
    g.putImageData(id, 0, 0);
    return cv;
  },

  _refreshLevelBg(theme) { // background finished loading after the level was built
    try {
      if (typeof G === 'undefined' || typeof Art === 'undefined') return;
      if (G.level && G.level.theme === theme && G.level.bg) G.level.bg = Art.makeBackground(theme, 1);
      if (G.demo && G.demo.level && G.demo.level.bg && theme === (G.demo.level.theme || 'forest')) {
        G.demo.level.bg = Art.makeBackground(theme, 1);
      }
    } catch (e) {}
  },

  _bbox(img, sx, sy, sw, sh, black) { // quarter-scale content scan
    const q = 4;
    const w = Math.max(1, (sw / q) | 0), h = Math.max(1, (sh / q) | 0);
    const cv = this._tmp || (this._tmp = document.createElement('canvas'));
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, w, h);
    g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const hit = black ? (d[i] + d[i + 1] + d[i + 2] > 48) : (d[i + 3] > 26 && !this._bgLikeData(d, i));
        if (hit) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    if (x1 < 0) return null;
    return { x: sx + x0 * q, y: sy + y0 * q, w: (x1 - x0 + 1) * q, h: (y1 - y0 + 1) * q };
  },

  /* generic frame draw — anchor bottom-center at (x,y) unless o.anchor given */
  draw(ctx, name, idx, x, y, o = {}) {
    const d = this.data[name];
    if (!d || !d.ok) return false;
    const f = d.frames[Math.min(idx, d.frames.length - 1)];
    const basisH = o.basisH || d.basisH || f.sh;
    const s = o.h ? o.h / basisH : (o.w ? o.w / f.sw : 1);
    const dw = f.sw * s, dh = f.sh * s;
    const dx = (o.stableX || d.stableX) ? (f.ox || 0) * s : 0;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    if (o.sq) ctx.scale(1 + o.sq * .35, 1 - o.sq * .35);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    if (o.filter !== undefined && 'filter' in ctx) ctx.filter = o.filter;
    const groundPad = o.groundPad != null ? o.groundPad : (d.groundPad || 0);
    const ay = o.anchor === 'center' ? -dh / 2 : (o.anchor === 'top' ? 0 : -dh + groundPad);
    ctx.drawImage(d.img, f.sx, f.sy, f.sw, f.sh, -dw / 2 + dx, ay, dw, dh);
    ctx.restore();
    return true;
  },

  /* Draw a decorative medallion from ui_kit without slicing it into extra canvases. */
  drawUiKit(ctx, key, x, y, w, h, o = {}) {
    const d = this.data.ui_kit, r = this.UI_RECTS[key];
    if (!d || !d.ok || !r) return false;
    const sx = r[0] * d.img.width / 2304;
    const sy = r[1] * d.img.height / 1296;
    const sw = r[2] * d.img.width / 2304;
    const sh = r[3] * d.img.height / 1296;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    if (o.filter && 'filter' in ctx) ctx.filter = o.filter;
    ctx.drawImage(d.img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
    return true;
  },

  frameCount(name) {
    const d = this.data[name];
    return d && d.ok ? d.frames.length : 0;
  },

  loopFrame(name, phase) {
    const n = this.frameCount(name);
    return n ? (((phase | 0) % n) + n) % n : 0;
  },

  groundSnapY(x, y, below = 120, limit = 28) {
    try {
      if (typeof G === 'undefined' || typeof World === 'undefined' || !G.level) return y;
      const top = World.topAt(G.level, x, y - below);
      return top !== null && Math.abs(top - y) <= limit ? top : y;
    } catch (e) {
      return y;
    }
  },

  heroActionIndex(p) {
    const w = p && p.weapon && typeof Weapons !== 'undefined' ? Weapons[p.weapon] : null;
    const shape = (w && w.shape) || '';
    const special = (w && w.special) || '';
    if (special === 'heartHeal' || special === 'loveBeacon' || special === 'dreamSong' || special === 'pandaGift') return 6;
    if (special === 'sunGuard' || special === 'auroraShield' || special === 'riverWall') return 4;
    if (shape === 'axe' || shape === 'hammer') return 1;
    if (shape === 'sword' || shape === 'katana' || shape === 'dagger' || shape === 'claw' || shape === 'sickle' || shape === 'sandal') return 0;
    if (shape === 'spear' || shape === 'staff' || shape === 'scythe') return 2;
    if (shape === 'bow') return 3;
    if (shape === 'shield') return 4;
    if (shape === 'wand' || shape === 'orb' || shape === 'bell' || shape === 'lantern' || shape === 'lyre' || shape === 'fan') return 5;
    return 5;
  },

  heroWeaponGrip(p, src, idx) {
    const w = p && p.weapon && typeof Weapons !== 'undefined' ? Weapons[p.weapon] : null;
    const shape = (w && w.shape) || '';
    const base = { x: 16, y: -29, rot: -.22, size: 16, front: true };
    if (src && src.indexOf('_run') > 0) {
      const a = idx * U.TAU / Math.max(1, this.frameCount(src));
      return { x: 16 + Math.cos(a) * 2.5, y: -29 + Math.sin(a) * 1.5, rot: -.18 + Math.sin(a) * .06, size: 15 };
    }
    if (src && src.indexOf('_actions') > 0) {
      const byFrame = [
        { x: 21, y: -34, rot: -.62, size: 19 },
        { x: 15, y: -35, rot: -.92, size: 20 },
        { x: 23, y: -34, rot: -.38, size: 19 },
        { x: 24, y: -32, rot: -.04, size: 18 },
        { x: 16, y: -30, rot: -.08, size: 19 },
        { x: 22, y: -33, rot: -.18, size: 17 },
        { x: 17, y: -30, rot: -.24, size: 16 },
        { x: 16, y: -29, rot: -.36, size: 16 }
      ];
      return byFrame[Math.min(idx, byFrame.length - 1)] || base;
    }
    if (shape === 'bow') return { x: 20, y: -29, rot: -.04, size: 17 };
    if (shape === 'shield') return { x: 15, y: -28, rot: -.02, size: 18 };
    if (shape === 'axe' || shape === 'hammer') return { x: 16, y: -31, rot: -.65, size: 19 };
    if (shape === 'spear' || shape === 'staff' || shape === 'scythe') return { x: 18, y: -30, rot: -.38, size: 18 };
    if (shape === 'sickle') return { x: 18, y: -31, rot: -.68, size: 17 };
    if (shape === 'sandal') return { x: 20, y: -32, rot: -.5, size: 15 };
    return base;
  },

  drawHeroWeapon(ctx, p, t, src, idx, attacking, alpha = 1) {
    if (!p.weapon || typeof Weapons === 'undefined' || !Weapons[p.weapon]) return;
    const def = Weapons[p.weapon];
    const g = this.heroWeaponGrip(p, src, idx);
    const flash = U.clamp(p.weaponPose || 0, 0, 1);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.scale(p.dir || 1, 1);
    ctx.translate(g.x, g.y);
    ctx.rotate((g.rot || 0) + (attacking ? -.14 : 0) + Math.sin(t * 3.2) * .02);
    if (typeof Art !== 'undefined' && Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, 0, 0, 17 + flash * 24, def.color, .12 + flash * .32);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (flash > 0) ctx.scale(1 + flash * .1, 1 + flash * .1);
    if (!this.drawWeaponGlyph(ctx, p.weapon, 0, 0, g.size || 22, t) && typeof Art !== 'undefined' && Art.drawWeaponGlyph) {
      Art.drawWeaponGlyph(ctx, p.weapon, 0, 0, g.size || 22, t);
    }
    ctx.restore();
  },

  drawHeroEquipFx(ctx, p, t, src, idx) {
    if (!p.weapon || typeof Weapons === 'undefined' || !Weapons[p.weapon] || typeof Art === 'undefined' || !Art.glow) return;
    const def = Weapons[p.weapon];
    const g = this.heroWeaponGrip(p, src, idx);
    const pulse = .55 + Math.sin(t * 5.5) * .18;
    ctx.save();
    ctx.scale(p.dir || 1, 1);
    ctx.globalCompositeOperation = 'lighter';
    Art.glow(ctx, g.x, g.y, 7 + pulse * 5, def.color, .18);
    ctx.fillStyle = def.color + 'cc';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 1.8 + pulse * .8, 0, U.TAU);
    ctx.fill();
    ctx.restore();
  },

  /* ---------------- heroes ---------------- */
  // base sheet frames: 0 idle, 1 runA, 2 runB, 3 jump, 4 cast, 5 hurt, 6 hug, 7 kiss
  // action strip frames: 0 slash, 1 heavy, 2 spear/staff, 3 bow, 4 shield, 5 magic, 6 love/support, 7 revive/protect
  drawChar(ctx, p, t, who) {
    const sheet = who + '_sheet', runSheet = who + '_run', idleSheet = who + '_idle', actionSheet = who + '_actions';
    if (!this.has(sheet) && !this.has(runSheet) && !this.has(actionSheet)) return false;
    const atk = p.atkT != null && p.atkT < .28;
    const actionHot = (atk || (p.weaponPose || 0) > .03 || ((p.cheerT || 0) > .18 && p.weapon)) && this.has(actionSheet);
    const running = Math.abs(p.vx) > 30 && p.onGround;
    let src = sheet;
    let idx = 0;
    if (p.pose === 'kiss' && this.has(sheet)) idx = 7;
    else if (p.pose === 'hug' && this.has(sheet)) idx = 6;
    else if ((p.down || p.hurtT > 0) && this.has(sheet)) idx = 5;
    else if (actionHot) { src = actionSheet; idx = this.heroActionIndex(p); }
    else if (!p.onGround && this.has(sheet)) idx = 3;
    else if (running && this.has(runSheet)) { src = runSheet; idx = this.loopFrame(runSheet, p.animT * 12); }
    else if (running && this.has(sheet)) idx = (Math.sin(p.animT * 13) > 0) ? 1 : 2;
    else if (!running && this.has(idleSheet)) { src = idleSheet; idx = this.loopFrame(idleSheet, t * 2); }
    else if (!this.has(src)) { src = this.has(sheet) ? sheet : (this.has(runSheet) ? runSheet : actionSheet); idx = 0; }

    const run = running && src === runSheet;
    const bounce = run ? Math.abs(Math.sin(p.animT * 12)) * .7 : (running ? Math.abs(Math.sin(p.animT * 13)) * 1.4 : Math.sin(t * 2.3) * 1.1);
    const HERO_H = { joku: 74, jolie: 63 };
    const H = HERO_H[who] || 74;
    

    const drawY = p.onGround ? this.groundSnapY(p.x, p.y, 130, 34) : p.y;
    ctx.save();
    ctx.translate(p.x, drawY);
    if (p.pose === 'down') { ctx.rotate(-1.15 * p.dir); ctx.translate(0, -6); }

    // phoenix wings behind (double jump / dash)
    if (p.wing > .02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = p.wing * .85;
      const flap = Math.sin(t * 15) * .3;
      const wc = who === 'joku' ? '#7fd8ff' : '#ff9fce';
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate(-p.dir * 6, -40);
        ctx.rotate(p.dir * sgn * (.55 + flap) - p.dir * .4);
        const grd = ctx.createLinearGradient(0, 0, -p.dir * 52 * p.wing, -18);
        grd.addColorStop(0, wc + 'ee'); grd.addColorStop(1, wc + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-p.dir * 34 * p.wing, -26 * p.wing, -p.dir * 52 * p.wing, -14 * p.wing);
        ctx.quadraticCurveTo(-p.dir * 30 * p.wing, 6, 0, 4);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    // Jolie glide petals
    if (p.glide && typeof Art !== 'undefined' && Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = t * 5 + i * 1.57;
        Art.glow(ctx, Math.cos(a) * 20, -34 + Math.sin(a) * 12, 7, '#ff9fce', .5);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // invulnerability flicker
    const flick = (p.invuln > .1 && !p.down && Math.sin(t * 22) > 0) ? .55 : 1;
    const weaponFront = actionHot || atk || (p.weaponPose || 0) > .18;
    if (p.weapon && !weaponFront) this.drawHeroWeapon(ctx, p, t, src, idx, false, .88);
    this.draw(ctx, src, idx, 0, -bounce * .45, {
      h: H, flip: p.dir < 0, sq: p.squash || 0, alpha: flick,
      filter: p.hurtT > .3 ? 'brightness(1.5) saturate(1.3)' : 'none'
    });

    if (p.weapon && weaponFront) this.drawHeroWeapon(ctx, p, t, src, idx, true, .96);
    else this.drawHeroEquipFx(ctx, p, t, src, idx);
    // Joku dash crescent
    if (p.dashT > 0) {
      this.draw(ctx, 'fx_projectiles', 2, p.dir * 26, -30, { h: 62, anchor: 'center', add: 1, alpha: .9, flip: p.dir < 0 });
    }
    ctx.restore();

    if (typeof Art !== 'undefined' && Art._statusFx) {
      Art._statusFx(ctx, p, t, who === 'joku' ? '#7fd8ff' : '#ff9fce');
    }
    return true;
  },

  /* ---------------- supporters ---------------- */
  // lulu: 0 stand, 1 run, 2 bite, 3 howl | biscuit: 0 stand, 1 waddle, 2 toss, 3 cheer
  drawPet(ctx, pet, t, name) {
    const sheet = name + '_sheet', runSheet = name + '_run', actionSheet = name + '_actions';
    if (!this.has(sheet) && !this.has(runSheet) && !this.has(actionSheet)) return false;
    const run = Math.abs(pet.vx) > 25;
    let src = sheet, idx = run ? 1 : 0;
    if (name === 'lulu') {
      if (pet.mode === 'dash') idx = 2;
      else if (pet.owner && pet.owner.down) idx = 3;
    } else {
      if (pet.healFx) idx = 2;
      else if (pet.owner && pet.owner.cheerT > 0) idx = 3;
    }
    const action = idx > 1;
    if (action && this.has(actionSheet)) { src = actionSheet; idx = Math.min(idx - 2, this.frameCount(actionSheet) - 1); }
    else if (run && this.has(runSheet)) { src = runSheet; idx = this.loopFrame(runSheet, pet.animT * 14); }
    else if (!this.has(src)) { src = this.has(sheet) ? sheet : (this.has(runSheet) ? runSheet : actionSheet); idx = 0; }
    const drawY = this.groundSnapY(pet.x, pet.y, 130, 48);
    const bob = run && src === runSheet ? Math.abs(Math.sin(pet.animT * 14)) * .8 : (run ? Math.abs(Math.sin(pet.animT * 15)) * 1.6 : Math.sin(t * 3) * 1);
    this.draw(ctx, src, idx, pet.x, drawY - bob, {
      h: name === 'lulu' ? 40 : 46, flip: pet.dir < 0,
      rot: run ? Math.sin(pet.animT * 14) * .035 : 0
    });
    return true;
  },

  /* ---------------- devils ---------------- */
  drawEnemy(ctx, e, t) {
    if (e.variant === 'village' && e.bossTier && this.has('miniboss_village')) {
      const idx = Math.min(1, e.bossRank || 0);
      const h = idx ? 142 : 136;
      if (Art.glow) {
        ctx.globalCompositeOperation = 'lighter';
        Art.glow(ctx, e.x, e.y - h * .48, 62, idx ? '#6f7194' : '#9d3658', .3 + Math.sin(t * 3) * .06);
        ctx.globalCompositeOperation = 'source-over';
      }
      this.draw(ctx, 'miniboss_village', idx, e.x, e.y, {
        h, flip: e.dir > 0, filter: e.flash > 0 ? 'brightness(2.1)' : 'none'
      });
      if (e.hurtShow > 0 && e.hp > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.58)';
        ctx.fillRect(e.x - 28, e.y - h - 11, 56, 5);
        ctx.fillStyle = '#ffb44a';
        ctx.fillRect(e.x - 28, e.y - h - 11, 56 * Math.max(0, e.hp / e.maxHp), 5);
      }
      return true;
    }
    if (e.variant === 'village' && this.has('enemies_village')) {
      const map = { slime: 0, thorn: 1, golem: 1, wisp: 2, imp: 3, bat: 3 };
      const idx = map[e.type] != null ? map[e.type] : 0;
      const fly = e.type === 'wisp' || e.type === 'imp' || e.type === 'bat';
      const h = ({ slime: 48, thorn: 54, golem: 70, wisp: 50, imp: 55, bat: 55 })[e.type] || 48;
      const yy = fly ? e.y - 12 : e.y;
      if (fly && Art.glow) {
        ctx.globalCompositeOperation = 'lighter';
        Art.glow(ctx, e.x, yy, h * .58, idx === 2 ? '#a8324e' : '#6151a2', .28);
        ctx.globalCompositeOperation = 'source-over';
      }
      this.draw(ctx, 'enemies_village', idx, e.x, yy, {
        h, flip: e.dir > 0, anchor: fly ? 'center' : 'bottom',
        rot: fly ? Math.sin(e.t * 8) * .045 : 0,
        filter: e.flash > 0 ? 'brightness(2.1)' : 'none'
      });
      if (e.hurtShow > 0 && e.hp > 0) {
        const hy = (fly ? yy - h / 2 : e.y - h) - 9;
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 16, hy, 32, 4);
        ctx.fillStyle = '#ff5e7a'; ctx.fillRect(e.x - 16, hy, 32 * Math.max(0, e.hp / e.maxHp), 4);
      }
      return true;
    }
    const elite = !!e.bossTier;
    let name = null, idx = 0, h = 40, fly = false;
    switch (e.type) {
      case 'slime': name = elite ? 'enemies_elite_sheet' : 'enemies_sheet'; idx = 0; h = 38; break;
      case 'thorn': name = elite ? 'enemies_elite_sheet' : 'enemies_sheet'; idx = 1; h = 46; break;
      case 'wisp': name = elite ? 'enemies_elite_sheet' : 'enemies_sheet'; idx = 2; h = 50; fly = true; break;
      case 'imp': name = elite ? 'enemies_elite_sheet' : 'enemies_sheet'; idx = 3; h = 48; fly = true; break;
      case 'bat': name = elite ? 'enemy_bat_elite' : 'enemy_bat'; idx = 0; h = 44; fly = true; break;
      case 'golem': name = elite ? 'enemy_golem_elite' : 'enemy_golem'; idx = 0; h = 70; break;
      default: return false;
    }
    if (!this.has(name)) return false;
    if (elite) h *= 1.35;

    const squish = e.type === 'slime' ? Math.sin(e.t * 6) * .06 - (e.hopY > 1 ? .12 : 0) : 0;
    const rot = (e.type === 'bat' || e.type === 'imp') ? Math.sin(e.t * 12) * .08
      : (e.type === 'wisp' ? Math.sin(e.t * 2.2) * .06 : 0);
    const yy = fly ? e.y - 14 : e.y;
    // soft glow for spooky flyers
    if ((e.type === 'wisp' || e.type === 'imp' || e.type === 'bat') && Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, e.x, yy - (fly ? 0 : h * .4), h * .55, '#9e5eff', .3);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.draw(ctx, name, idx, e.x, yy, {
      h, flip: e.dir > 0, sq: squish, rot,
      anchor: fly ? 'center' : 'bottom',
      filter: e.flash > 0 ? 'brightness(2.1)' : 'none'
    });
    // hp bar when recently hurt
    if (e.hurtShow > 0 && e.hp > 0) {
      const w = elite ? 44 : 30, hy = (fly ? yy - h / 2 : e.y - h) - 10;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(e.x - w / 2, hy, w, 4);
      ctx.fillStyle = elite ? '#ffb44a' : '#ff5e7a';
      ctx.fillRect(e.x - w / 2, hy, w * Math.max(0, e.hp / e.maxHp), 4);
    }
    return true;
  },

  /* ---------------- bosses ---------------- */
  drawBoss(ctx, e, t) {
    const name = this.BOSS_MAP[e.bossKind] || 'boss_NightmareGloomheart';
    if (!this.has(name)) return false;
    const dying = e.dying || 0;
    const pulse = 1 + Math.sin(t * 3) * .035;
    const col = (typeof Art !== 'undefined' && Art.bossColor) ? Art.bossColor(e.bossKind) : '#9e5eff';
    // aura
    if (Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, e.x, e.y - 10, 150, dying > 0 ? '#ff9fce' : col, .4 + Math.sin(t * 2) * .1);
      ctx.globalCompositeOperation = 'source-over';
    }
    // rage flames when hurt badly
    const rage = e.hp < e.maxHp / 3 ? 2 : e.hp < e.maxHp * 2 / 3 ? 1 : 0;
    if (dying === 0 && rage >= 1 && Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, e.x, e.y - 90, 26 + rage * 12 + Math.sin(t * 11) * 6, '#ff5e7a', .55);
      ctx.globalCompositeOperation = 'source-over';
    }
    let filter = 'none';
    if (e.flash > 0) filter = 'brightness(2)';
    else if (dying > 0) filter = 'hue-rotate(300deg) saturate(1.1) brightness(1.35)';
    this.draw(ctx, name, 0, e.x, e.y - 8, {
      h: (e.bossKind === 'horde' ? 260 : 235) * pulse, anchor: 'center', flip: e.dir > 0, filter,
      alpha: dying > 0 ? Math.max(.35, 1 - dying * .18) : 1
    });
    if (dying > 0 && Art.heart) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, e.x, e.y - 10, 90 + dying * 26, '#ff9fce', .5);
      ctx.globalCompositeOperation = 'source-over';
    }
    return true;
  },

  /* ---------------- items & weapons ---------------- */
  drawItem(ctx, it, t) {
    const map = { orb: [0, 26, '#3fa8ff'], flower: [1, 28, '#ff7fb5'], heartDrop: [2, 24, '#ff7fb5'], mote: [3, 20, '#5ee8ff'] };
    const m = map[it.kind];
    if (!m || !this.has('items_sheet')) return false;
    const bob = Math.sin(t * 2.6 + it.x * .05) * 4;
    if (Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, it.x, it.y + bob, m[1] * .8, m[2], .45);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.draw(ctx, 'items_sheet', m[0], it.x, it.y + bob, { h: m[1], anchor: 'center', rot: it.kind === 'mote' ? t * 2 : Math.sin(t * 1.5 + it.x) * .15 });
    return true;
  },

  drawWeaponGlyph(ctx, weapon, x, y, size, t) {
    const villageWeapons = ['sacredBamboo', 'buffaloShield', 'goldenRiceSickle', 'toOngSandal'];
    const vi = villageWeapons.indexOf(weapon);
    if (vi >= 0 && this.has('weapons_village')) {
      this.draw(ctx, 'weapons_village', vi, x, y, { h: size * 2.45, anchor: 'center' });
      return true;
    }
    if (!this.has('weapons_1')) return false;
    const order = (this._worder || (this._worder = Object.keys(Weapons)));
    const i = order.indexOf(weapon);
    if (i < 0) return false;
    const name = i < 10 ? 'weapons_1' : 'weapons_2';
    if (!this.has(name)) return false;
    this.draw(ctx, name, i % 10, x, y, { h: size * 2.5, anchor: 'center' });
    return true;
  },

  /* ---------------- terrain ---------------- */
  drawGround(ctx, pl, pal, t) {
    const th = this.theme();
    const name = this.has('tile_' + th) ? 'tile_' + th : (this.has('tile_forest') ? 'tile_forest' : null);
    if (!name) return false;
    const d = this.data[name], f = d.frames[0];
    const H = 185, s = H / f.sh;

    const GROUND_SURFACE = {
      forest: 30,
      falls: 40,
      blossom: 13,
      shadow: 20,
      ember: 50,
      star: 20,
      village: 42
    };
    const topY = pl.y - (GROUND_SURFACE[th] || 13);// grass tufts poke above the walk line

    const capW = Math.round(f.sw * .18);
    const capDW = capW * s;
    const midSW = f.sw - capW * 2;
    const midDW = midSW * s;
    const x0 = pl.x - 6, x1 = pl.x + pl.w + 6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, topY, x1 - x0, H + 60); // clip so repeats never overflow
    ctx.clip();
    if (x1 - x0 < capDW * 2.2) { // tiny platform: draw squished whole tile
      ctx.drawImage(d.img, f.sx, f.sy, f.sw, f.sh, x0, topY, x1 - x0, H);
    } else {
      ctx.drawImage(d.img, f.sx, f.sy, capW, f.sh, x0, topY, capDW, H);
      ctx.drawImage(d.img, f.sx + f.sw - capW, f.sy, capW, f.sh, x1 - capDW, topY, capDW, H);
      for (let x = x0 + capDW; x < x1 - capDW; x += midDW) {
        const w = Math.min(midDW, x1 - capDW - x);
        ctx.drawImage(d.img, f.sx + capW, f.sy, midSW * (w / midDW), f.sh, x, topY, w, H);
      }
    }
    // fade the soil into darkness below the tile
    const gg = ctx.createLinearGradient(0, topY + H - 24, 0, topY + H + 58);
    gg.addColorStop(0, 'rgba(0,0,0,0)');
    gg.addColorStop(1, pal && pal.soilB ? pal.soilB : '#10100e');
    ctx.fillStyle = gg;
    ctx.fillRect(x0, topY + H - 24, x1 - x0, 82);
    ctx.restore();
    // deep soil column below (so tall cliffs aren't hollow)
    ctx.fillStyle = pal && pal.soilB ? pal.soilB : '#10100e';
    ctx.fillRect(x0, topY + H + 56, x1 - x0, Math.max(0, pl.h - H - 40));
    return true;
  },

  drawMush(ctx, pl, t) {
    const th = this.theme();
    const name = (th !== 'forest' && this.has('float_' + th)) ? 'float_' + th
      : (this.has('prop_mushroom') ? 'prop_mushroom' : null);
    if (!name) return false;
    const sway = Math.sin(t * 1.2 + pl.x * .01) * 1.5;
    const w = pl.w + 30;
    const d = this.data[name], f = d.frames[0];
    const dh = w * (f.sh / f.sw);
    const surfaceOffset = th === 'village' ? dh * .31 : dh * .055;
    this.draw(ctx, name, 0, pl.x + pl.w / 2 + sway * .3, pl.y - surfaceOffset, { w, anchor: 'top' });
    if (Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, pl.x + pl.w / 2, pl.y + 16, pl.w * .4, pl.glowC || '#8fdcff', .18 + Math.sin(t * 1.8 + pl.x) * .06);
      ctx.globalCompositeOperation = 'source-over';
    }
    return true;
  },

  drawVillageProp(ctx, prop, t) {
    if (!this.has('props_village') || !prop) return false;
    const idx = U.clamp(prop.kind | 0, 0, 7);
    const breathe = idx === 1 ? 1 + Math.sin(t * 1.35 + prop.x * .01) * .008 : 1;
    const sway = idx === 3 ? Math.sin(t * 1.15 + prop.x * .004) * .009 : 0;
    if (prop.glow && Art.glow) {
      const colors = ['#9be27d', '#fff3a8', '#ffe28f', '#ffb6d9', '#ffd36e', '#fff0c8', '#ff8a4a', '#ffd08a'];
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, prop.x, prop.y - (prop.h || 80) * .48, (prop.h || 80) * .62, colors[idx], .16 + Math.sin(t * 2 + idx) * .04);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.draw(ctx, 'props_village', idx, prop.x, prop.y + 1, {
      h: (prop.h || 80) * breathe,
      flip: !!prop.flip,
      rot: sway,
      alpha: prop.alpha == null ? 1 : prop.alpha
    });
    return true;
  },

  /* ---------------- gate, shrine, trials ---------------- */
  drawGate(ctx, gx, gy, t, near) {
    if (!this.has('prop_gate')) return false;
    if (near) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(0, gy - 170, 0, gy);
      bg.addColorStop(0, 'rgba(255,180,220,0)');
      bg.addColorStop(.45, 'rgba(255,180,220,.26)');
      bg.addColorStop(1, 'rgba(255,180,220,.05)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(gx - 52, gy); ctx.lineTo(gx - 34, gy - 170); ctx.lineTo(gx + 34, gy - 170); ctx.lineTo(gx + 52, gy);
      ctx.fill();
      ctx.restore();
    }
    this.draw(ctx, 'prop_gate', 0, gx, gy + 2, { h: 220 });
    if (Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, gx, gy - 196, 40, '#ff7fb5', near ? .8 : .38 + Math.sin(t * 1.5) * .1);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (near && Art.heart) {
      for (let i = 0; i < 3; i++) {
        const cyc = ((t * 26 + i * 44) % 130);
        ctx.globalAlpha = U.clamp(1 - cyc / 130, 0, 1) * .8;
        Art.heart(ctx, gx + Math.sin(t * 2 + i * 2.1) * 16, gy - 30 - cyc, 5.5, '#ff9fce');
      }
      ctx.globalAlpha = 1;
    }
    return true;
  },

  drawShrine(ctx, sx, sy, t, active) {
    if (!this.has('prop_shrine')) return false;
    if (active && Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, sx, sy - 82, 48, '#ff9fce', .5 + Math.sin(t * 3) * .14);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.draw(ctx, 'prop_shrine', 0, sx, sy + 1, { h: 128, alpha: active ? 1 : .8, filter: active ? 'none' : 'saturate(.45) brightness(.8)' });
    if (active && Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const an = t * 2 + i * 2.09;
        Art.glow(ctx, sx + Math.cos(an) * 28, sy - 82 + Math.sin(an) * 13, 5, '#ffd7ec', .8);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    return true;
  },

  drawCoopScene(ctx, tr, t) { // ctx is pre-translated to the trial origin
    const sceneName = this.TRIAL_MAP[tr.kind || 'forestBridge'];
    if (!this.has(sceneName)) return false;
    const charge = U.clamp(tr.charge || 0, 0, 1);
    // The lightweight procedural marks remain valid when the optional pad atlas is not loaded.
    if (this.has('trial_pads')) this.draw(ctx, 'trial_pads', 0, 0, 13, { w: 205, alpha: tr.done ? .8 : 1 });
    if (Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      for (const s of [-1, 1]) {
        const active = s < 0 ? tr.padL : tr.padR;
        if (active) Art.glow(ctx, s * 58, -4, 40, s < 0 ? '#56d6ff' : '#ff9fce', .7);
      }
      if (charge > 0) Art.glow(ctx, 0, -42, 30 + charge * 40, '#ffd7ec', .3 + charge * .5);
      ctx.globalCompositeOperation = 'source-over';
    }
    // themed centerpiece
    this.draw(ctx, sceneName, 0, 155, 42, { h: 190, alpha: tr.done ? .9 : 1, filter: tr.done ? 'brightness(1.15)' : 'none' });
    if (tr.done && Art.glow) {
      ctx.globalCompositeOperation = 'lighter';
      Art.glow(ctx, 155, -48, 55, '#ffd7ec', .35 + Math.sin(t * 2) * .1);
      ctx.globalCompositeOperation = 'source-over';
    }
    return true;
  },

  drawAura(ctx, a, t) {
    if (!this.has('fx_rings')) return false;
    const R = 135 + Math.sin(t * 3) * 5;
    const alpha = Math.min(1, a.t);
    this.draw(ctx, 'fx_rings', 0, a.x, a.y - 10, { w: R * 2.15, anchor: 'center', add: 1, alpha: alpha * .95, rot: t * .5 });
    this.draw(ctx, 'fx_rings', 5, a.x, a.y - 4, { h: 150, add: 1, alpha: alpha * .5 });
    return true;
  },

  /* ---------------- projectiles ---------------- */
  drawProj(ctx, pr, t) {
    switch (pr.kind) {
      case 'phoenix':
        return this.draw(ctx, 'fx_projectiles', 0, pr.x, pr.y, {
          h: 46, anchor: 'center', add: 1, rot: Math.atan2(pr.vy, pr.vx * (pr.vx < 0 ? -1 : 1)) * (pr.vx < 0 ? -1 : 1),
          flip: pr.vx < 0, alpha: .96
        });
      case 'petal':
        return this.draw(ctx, 'fx_projectiles', 1, pr.x, pr.y, { h: 30, anchor: 'center', add: 1, rot: pr.t * 9 });
      case 'starshot':
        return this.draw(ctx, 'fx_projectiles', 3, pr.x, pr.y, { h: 32, anchor: 'center', add: 1, rot: pr.t * 6 });
      case 'darkball':
        return this.draw(ctx, 'fx_enemy', 0, pr.x, pr.y, { h: 32 + Math.sin(t * 12) * 3, anchor: 'center', add: 1, rot: pr.t * 3 });
      case 'shock':
        return this.draw(ctx, 'fx_enemy', 1, pr.x, pr.y + 2, { h: 48, add: 1, flip: pr.vx < 0, alpha: .95 });
      case 'bamboo':
        if (!this.has('weapons_village')) return false;
        return this.draw(ctx, 'weapons_village', 0, pr.x, pr.y, { h: 46, anchor: 'center', rot: Math.atan2(pr.vy, pr.vx) + Math.PI / 4 });
      case 'sickle':
        if (!this.has('weapons_village')) return false;
        return this.draw(ctx, 'weapons_village', 2, pr.x, pr.y, { h: 42, anchor: 'center', rot: pr.t * 8 });
      case 'sandal':
        if (!this.has('weapons_village')) return false;
        return this.draw(ctx, 'weapons_village', 3, pr.x, pr.y, { h: 40, anchor: 'center', rot: pr.t * 10 });
    }
    return false;
  },

  /* ---------------- portraits & menu art ---------------- */
  _makePortrait(name, img) {
    if (typeof Art === 'undefined' || !Art._ports) return;
    const key = { portrait_joku: 'joku', portrait_jolie: 'jolie', portrait_lulu: 'dog', portrait_biscuit: 'panda' }[name];
    if (!key) return;
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.beginPath(); g.arc(48, 48, 46, 0, Math.PI * 2); g.clip();
    const side = Math.min(img.width, img.height);
    g.drawImage(img, (img.width - side) / 2, (img.height - side) * .28, side, side, 0, 0, 96, 96);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3;
    g.beginPath(); g.arc(48, 48, 44.5, 0, Math.PI * 2); g.stroke();
    Art._ports[key] = c;
  },

  _menuArt(img) {
    const menu = document.getElementById('menu');
    if (menu) {
      menu.style.backgroundImage =
        'radial-gradient(ellipse at 50% 34%, rgba(10,26,34,.18), rgba(4,14,20,.72)), url(' + this.DIR + 'title_art.png)';
      menu.style.backgroundSize = 'cover';
      menu.style.backgroundPosition = 'center';
    }
  },

  /* ---------------- painterly backgrounds (mirror-tiled for seamless wrap) ---------------- */
  bgFor(theme) {
    if (this._bgCache[theme]) return this._bgCache[theme];
    const d = this.data['bg_' + theme];
    if (!d || !d.ok) return null;
    const img = d.img;
    const w1 = Math.round(img.width * (1080 / img.height));
    const cv = document.createElement('canvas');
    cv.width = w1 * 2; cv.height = 1080;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0, w1, 1080);
    g.save(); g.translate(w1 * 2, 0); g.scale(-1, 1);
    g.drawImage(img, 0, 0, w1, 1080);
    g.restore();
    const layer = { cv, speed: .34, w: w1 * 2 };
    this._bgCache[theme] = layer;
    return layer;
  },

  /* ---------------- flipbooks & one-shot FX sprites ---------------- */
  playFB(name, x, y, h, dur, idx) {
    if (!this.has(name)) return;
    this.fbs.push({ name, x, y, h: h || 200, t: 0, dur: dur || .55, idx: idx != null ? idx : -1 });
    if (this.fbs.length > 12) this.fbs.shift();
  },
  _fbTick(dt) {
    // detect the Love Burst moment (kiss cinematic)
    if (typeof G !== 'undefined') {
      if (G._kissBurst && !this._kb) {
        this._kb = true;
        this.playFB('fx_loveburst', G.kissX || (G.me && G.me.x) || 0, (G.me ? G.me.y - 46 : 300), 420, .85);
      }
      if (!G._kissBurst) this._kb = false;
    }
    for (let i = this.fbs.length - 1; i >= 0; i--) {
      const f = this.fbs[i];
      f.t += dt;
      if (f.t >= f.dur) this.fbs.splice(i, 1);
    }
  },
  _fbDraw(ctx) {
    for (const f of this.fbs) {
      const k = f.t / f.dur;
      if (f.idx >= 0) { // single-sprite puff: scale up + fade out
        this.draw(ctx, f.name, f.idx, f.x, f.y, { h: f.h * (0.55 + k * .75), anchor: 'center', add: 1, alpha: 1 - k * k });
      } else {
        const d = this.data[f.name];
        const n = d ? d.frames.length : 8;
        this.draw(ctx, f.name, Math.min(n - 1, (k * n) | 0), f.x, f.y, { h: f.h, anchor: 'center', add: 1, alpha: k > .8 ? (1 - k) * 5 : 1 });
      }
    }
  },

  /* ---------------- CG overlays (story stills) ---------------- */
  _cgAlpha: 0, _cgName: null,
  _overlay(ctx, W, H) {
    let want = null;
    if (typeof G !== 'undefined' && G.state === 'play') {
      if (G.cut && G.cut.name === 'ending' && G.me && G.me.pose === 'kiss' && this.has('cg_victory')) want = 'cg_victory';
    }
    if (want) this._cgName = want;
    this._cgAlpha = U.clamp(this._cgAlpha + (want ? .045 : -.05), 0, 1);
    if (this._cgAlpha <= 0 || !this._cgName) { if (!want) this._cgName = null; return; }
    const d = this.data[this._cgName];
    if (!d || !d.ok) return;
    const img = d.img;
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.save();
    ctx.globalAlpha = this._cgAlpha * .96;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    // soft frame vignette so it reads as a story moment
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .34, W / 2, H / 2, Math.max(W, H) * .62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,4,12,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // chapter badge on the announce splash
  },

  _badge(ctx, W, H) {
    if (typeof G === 'undefined' || !G.announce) return;
    const village = (G.level && G.level.theme === 'village') || G.levelIndex === 6;
    if (village ? !this.has('badge_village') : !this.has('chapter_badges')) return;
    const a = G.announce;
    const k = Math.min(1, a.t > 2.6 ? (3.2 - a.t) / .6 : (a.t < .6 ? a.t / .6 : 1));
    ctx.save();
    ctx.globalAlpha = U.clamp(k, 0, 1);
    if (village) this.draw(ctx, 'badge_village', 0, W / 2, H * .3 - 46, { h: 78, anchor: 'center' });
    else this.draw(ctx, 'chapter_badges', Math.min(5, G.levelIndex || 0), W / 2, H * .3 - 46, { h: 72, anchor: 'center' });
    ctx.restore();
  },

  /* ============================================================
     INSTALL — wrap the procedural renderers (fallback everywhere)
     ============================================================ */
  install() {
    if (typeof Art === 'undefined') return;
    const A = Art, S = this;
    const wrap = (obj, key, fn) => { const orig = obj[key].bind(obj); obj[key] = function (...args) { return fn(orig, ...args); }; };

    wrap(A, 'drawJoku', (orig, ctx, p, t) => { if (!S.drawChar(ctx, p, t, 'joku')) orig(ctx, p, t); });
    wrap(A, 'drawJolie', (orig, ctx, p, t) => { if (!S.drawChar(ctx, p, t, 'jolie')) orig(ctx, p, t); });
    wrap(A, 'drawDog', (orig, ctx, pet, t) => { if (!S.drawPet(ctx, pet, t, 'lulu')) orig(ctx, pet, t); });
    wrap(A, 'drawPanda', (orig, ctx, pet, t) => { if (!S.drawPet(ctx, pet, t, 'biscuit')) orig(ctx, pet, t); });
    wrap(A, 'drawEnemy', (orig, ctx, e, t) => { if (!S.drawEnemy(ctx, e, t)) orig(ctx, e, t); });
    wrap(A, 'drawBoss', (orig, ctx, e, t) => { if (!S.drawBoss(ctx, e, t)) orig(ctx, e, t); });
    wrap(A, 'drawItem', (orig, ctx, it, t) => { if (!S.drawItem(ctx, it, t)) orig(ctx, it, t); });
    wrap(A, 'drawWeaponGlyph', (orig, ctx, w, x, y, size, t) => { if (!S.drawWeaponGlyph(ctx, w, x, y, size, t)) orig(ctx, w, x, y, size, t); });
    wrap(A, 'drawGate', (orig, ctx, gx, gy, t, near) => { if (!S.drawGate(ctx, gx, gy, t, near)) orig(ctx, gx, gy, t, near); });
    wrap(A, 'drawShrine', (orig, ctx, sx, sy, t, act) => { if (!S.drawShrine(ctx, sx, sy, t, act)) orig(ctx, sx, sy, t, act); });
    wrap(A, 'drawCoopScene', (orig, ctx, tr, t) => { if (!S.drawCoopScene(ctx, tr, t)) orig(ctx, tr, t); });
    wrap(A, 'drawAura', (orig, ctx, a, t) => { if (!S.drawAura(ctx, a, t)) orig(ctx, a, t); });
    wrap(A, 'drawProj', (orig, ctx, pr, t) => { if (!S.drawProj(ctx, pr, t)) orig(ctx, pr, t); });
    wrap(A, 'drawPlatform', (orig, ctx, pl, pal, t) => {
      if (pl.type === 'ground' && S.drawGround(ctx, pl, pal, t)) return;
      if (pl.type === 'mush' && S.drawMush(ctx, pl, t)) return;
      orig(ctx, pl, pal, t);
    });
    wrap(A, 'makeBackground', (orig, theme, seed) => {
      const layer = S.bgFor(theme);
      if (layer) return { layers: [layer], pal: A.PAL[theme] || A.PAL.forest };
      return orig(theme, seed);
    });

    if (typeof Ptc !== 'undefined') {
      wrap(Ptc, 'update', (orig, dt) => { orig(dt); S._fbTick(dt); });
      wrap(Ptc, 'draw', (orig, ctx) => { orig(ctx); S._fbDraw(ctx); });
    }
    if (typeof Game !== 'undefined') {
      if (Game.weaponSpecial) {
        wrap(Game, 'weaponSpecial', (orig, p, w) => {
          orig(p, w);
          const def = w && typeof w === 'object' ? w : ((typeof Weapons !== 'undefined') && Weapons[w]);
          if (def && p) {
            if (def.special === 'thunderSlam') S.playFB('fx_thunderslam', p.x + p.dir * 46, p.y + 2, 300, .6);
            if (def.special === 'phoenixNova') S.playFB('fx_phoenixnova', p.x, p.y - 40, 330, .7);
          }
        });
      }
      if (Game.hitEnemy) {
        wrap(Game, 'hitEnemy', (orig, e, dmg, by, fromNet) => {
          const wasAlive = e && !e.dead && !(e.dying > 0);
          orig(e, dmg, by, fromNet);
          if (wasAlive && e && S.has('fx_impacts')) {
            if (e.dead || e.dying > 0) S.playFB('fx_impacts', e.x, e.y - 18, 74, .42, 4);
            else if (Math.random() < .5) S.playFB('fx_impacts', e.x, e.y - 18, 40, .22, 3);
          }
        });
      }
      if (Game.render) {
        wrap(Game, 'render', (orig) => {
          orig();
          try {
            const ctx = Game.ctx, W = Game.cssW, H = Game.cssH;
            if (ctx && W) { S._overlay(ctx, W, H); S._badge(ctx, W, H); }
          } catch (e) {}
        });
      }
    }
    if (typeof Main !== 'undefined' && Main.showEnd) {
      wrap(Main, 'showEnd', (orig, ...args) => {
        orig(...args);
        if (S.has('cg_ending')) {
          const ep = document.getElementById('endPanel');
          const panel = ep && ep.querySelector('.panel');
          if (panel) {
            panel.style.background =
              'linear-gradient(rgba(8,20,30,.78), rgba(8,18,28,.9)), url(' + S.DIR + 'cg_ending.png) center/cover';
          }
        }
      });
    }
  }
};

ASSETS.install();
ASSETS.load();
