'use strict';
/* ============ level definitions & deterministic generation ============ */
const World = {
  LEVELS: [
    { name: 'Enchanted Forest', theme: 'forest', width: 11200, seed: 101, density: 1.0, bossName: 'Rootbound Gloom', bossKind: 'root', miniBosses: [{ name: 'Mossjaw Guard', type: 'thorn' }, { name: 'Oakhide Titan', type: 'golem' }] },
    { name: 'Crystal Falls', theme: 'falls', width: 12200, seed: 202, density: 1.15, bossName: 'Stormwater Leviathan', bossKind: 'tide', miniBosses: [{ name: 'Ripplefang Brute', type: 'thorn' }, { name: 'Basalt Breaker', type: 'golem' }] },
    { name: 'Blossom Glade', theme: 'blossom', width: 13200, seed: 303, density: 1.3, bossName: 'Briarheart Queen', bossKind: 'briar', miniBosses: [{ name: 'Rosehook Knight', type: 'thorn' }, { name: 'Petalstone Giant', type: 'golem' }] },
    { name: 'Gloomheart Hollow', theme: 'shadow', width: 13800, seed: 404, density: 1.45, bossName: 'Nightmare Gloomheart', bossKind: 'gloom', miniBosses: [{ name: 'Umbra Fang', type: 'bat' }, { name: 'Dreadroot Captain', type: 'golem' }] },
    { name: 'Ember Canopy', theme: 'ember', width: 12800, seed: 505, density: 1.55, bossName: 'Cinder Crown', bossKind: 'ember', miniBosses: [{ name: 'Ashthorn Warden', type: 'thorn' }, { name: 'Magmahide Golem', type: 'golem' }] },
    { name: 'Starlit Grove', theme: 'star', width: 14200, seed: 606, density: 1.7, bossName: 'Eclipse Heart', bossKind: 'eclipse', miniBosses: [{ name: 'Moonbite Shade', type: 'bat' }, { name: 'Cometstone Colossus', type: 'golem' }] },
  ],

  DEATH_Y: 860,

  gen(idx) {
    const cfg = this.LEVELS[idx];
    const r = U.rng(cfg.seed);
    const plats = [], items = [], foes = [];
    let itemId = 0, foeId = 0;

    const mkDeco = (w) => {
      const deco = [];
      const n = Math.max(2, w / 60 | 0);
      for (let i = 0; i < n; i++) {
        const kind = r() < .5 ? 0 : (r() < .75 ? 1 : 2);
        deco.push([20 + r() * (w - 40), kind, r() < .5 ? 1 : 0]);
      }
      return deco;
    };
    const ground = (x, y, w) => {
      const pl = { x, y, w, h: 300, type: 'ground', deco: mkDeco(w) };
      plats.push(pl); return pl;
    };
    const mush = (x, y, w) => {
      const pal = Art.PAL[cfg.theme];
      const spots = [];
      for (let i = 0; i < 3; i++) spots.push([w * .2 + r() * w * .6, 4 + r() * 12, 4 + r() * 5]);
      const pl = { x, y, w, h: 20, type: 'mush', stem: 60 + r() * 50, capC: pal.shroom, glowC: pal.shroomGlow, spots };
      plats.push(pl); return pl;
    };
    const orbArc = (x1, x2, topY, kind) => { // arc of collectibles
      const n = Math.max(3, ((x2 - x1) / 55) | 0);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        items.push({ id: 'i' + (itemId++), kind, x: U.lerp(x1, x2, t), y: topY + Math.sin(t * Math.PI) * -46, taken: false });
      }
    };
    const row = (x, y, n, kind) => {
      for (let i = 0; i < n; i++) items.push({ id: 'i' + (itemId++), kind, x: x + i * 52, y, taken: false });
    };
    const DEFS = {
      slime: { hp: 55, dmg: 13 }, thorn: { hp: 85, dmg: 17 },
      wisp: { hp: 45, dmg: 11 }, imp: { hp: 45, dmg: 13 },
      bat: { hp: 58, dmg: 14 }, golem: { hp: 145, dmg: 23 },
    };
    const foe = (type, x, pl) => {
      const def = DEFS[type];
      const air = type === 'wisp' ? U.range(r, 120, 190) : (type === 'imp' || type === 'bat') ? U.range(r, 150, 210) : 0;
      foes.push({
        id: 'e' + (foeId++), type, variant: cfg.theme, x, y: pl.y - air, homeX: x, homeY: pl.y - air, plat: pl,
        vx: 0, vy: 0, dir: 1, hp: def.hp, maxHp: def.hp, dmg: def.dmg,
        t: r() * 10, atkT: r() * 2, hopY: 0, flash: 0, hurtShow: 0, dead: false
      });
    };
    const strongBoss = (rank, x, pl) => {
      const mini = cfg.miniBosses && cfg.miniBosses[rank] ? cfg.miniBosses[rank] : null;
      const type = mini && mini.type ? mini.type : (rank % 2 ? 'golem' : 'thorn');
      const hp = 300 + idx * 55 + rank * 80;
      const air = type === 'bat' ? U.range(r, 150, 210) : 0;
      foes.push({
        id: 'mb' + idx + '_' + rank, type, variant: cfg.theme, bossTier: 'normal', bossRank: rank, bossStyle: cfg.bossKind, bossName: mini && mini.name ? mini.name : (rank === 0 ? 'Oathbreaker Brute' : 'Dreadroot Captain'),
        x: U.clamp(x, pl.x + 90, pl.x + pl.w - 90), y: pl.y - air, homeX: x, homeY: pl.y - air, plat: pl,
        vx: 0, vy: 0, dir: -1, hp, maxHp: hp, dmg: 22 + idx * 2 + rank * 3,
        t: r() * 10, atkT: 1.4, hopY: 0, flash: 0, hurtShow: 0, dead: false, announced: false
      });
    };

    if (cfg.boss) {
      /* ---- boss arena: one long floor, side mushrooms ---- */
      ground(-400, 520, cfg.width + 800);
      mush(240, 400, 130);
      mush(cfg.width - 380, 400, 130);
      row(500, 460, 4, 'orb'); row(cfg.width - 700, 460, 4, 'flower');
      return this._pack(cfg, idx, plats, items, foes, {
        shrineX: null, gateX: null,
        startX: 260, checkpoints: [{ x: 260, y: 520 }],
        boss: { id: 'boss', type: 'boss', x: cfg.width * .62, y: 395, homeX: cfg.width * .62, homeY: 395, vx: 0, vy: 0, dir: -1, hp: 1100, maxHp: 1100, dmg: 20, t: 0, atkT: 3, phase: 0, mode: 'idle', modeT: 2.5, flash: 0, hurtShow: 0, dying: 0, dead: false }
      });
    }

    /* ---- normal level: ground segments with gaps + mushroom hops ---- */
    let x = -400, y = 520;
    ground(x, y, 1300); // generous starting meadow
    x += 1300;
    let lastGroundY = y;
    const shrineTarget = cfg.width * .5;
    let shrineX = null;
    const bossMarks = [cfg.width * .34, cfg.width * .66];
    let bossMarkI = 0;

    while (x < cfg.width - 1500) {
      // gap with mushroom stepping stones
      const gap = U.range(r, 130, 230) + cfg.density * 20;
      if (r() < .65) {
        const mw = U.range(r, 90, 130);
        const my = y - U.range(r, 30, 90);
        mush(x + gap / 2 - mw / 2, my, mw);
        orbArc(x - 20, x + gap + 40, my - 50, r() < .5 ? 'orb' : 'flower');
      } else {
        orbArc(x - 10, x + gap + 20, y - 60, 'orb');
      }
      x += gap;
      // next ground segment
      y = U.clamp(y + U.range(r, -80, 80), 420, 600);
      const w = U.range(r, 380, 720);
      const pl = ground(x, y, w);
      lastGroundY = y;
      while (bossMarkI < bossMarks.length && x <= bossMarks[bossMarkI] && x + w >= bossMarks[bossMarkI]) {
        strongBoss(bossMarkI, bossMarks[bossMarkI], pl);
        row(bossMarks[bossMarkI] - 110, y - 54, 5, 'heartDrop');
        bossMarkI++;
      }

      // floating mushrooms above long segments w/ item trails
      if (w > 500 && r() < .8) {
        const mx = x + w * .3, my = y - U.range(r, 110, 150);
        mush(mx, my, U.range(r, 100, 140));
        row(mx + 10, my - 40, 3, r() < .5 ? 'flower' : 'orb');
      }
      // items on the ground
      if (r() < .7) row(x + 60 + r() * (w - 220), y - 44, 2 + (r() * 3 | 0), r() < .45 ? 'flower' : 'orb');
      if (r() < .25) items.push({ id: 'i' + (itemId++), kind: 'heartDrop', x: x + w * .5, y: y - 120, taken: false });

      // enemies
      const foeCount = Math.min(4, 1 + (r() * cfg.density * 2.4 | 0));
      for (let i = 0; i < foeCount; i++) {
        if (x + w < 1200) break; // keep the start peaceful
        const t = r();
        const fx = x + 90 + r() * (w - 180);
        if (cfg.theme === 'ember' && t > .72) foe('golem', fx, pl);
        else if (cfg.theme === 'star' && t > .62) foe(t > .82 ? 'golem' : 'bat', fx, pl);
        else if (cfg.theme === 'shadow' && t > .66) foe(t > .84 ? 'golem' : 'bat', fx, pl);
        else if (t < .3) foe('slime', fx, pl);
        else if (t < .54) foe('thorn', fx, pl);
        else if (t < .76) foe('wisp', fx, pl);
        else if (t < .9) foe('imp', fx, pl);
        else foe('bat', fx, pl);
      }
      // shrine at ~50%
      if (shrineX === null && x > shrineTarget) {
        shrineX = x + w * .5;
        // clear enemies too close to the shrine
        for (const f of foes) if (Math.abs(f.x - shrineX) < 160) f.dead = true;
      }
      x += w;
    }
    // final gate meadow
    const endW = 800;
    y = U.clamp(lastGroundY, 460, 560);
    ground(x, y, endW + 1200);
    while (bossMarkI < bossMarks.length) {
      strongBoss(bossMarkI, x + 180 + bossMarkI * 180, plats[plats.length - 1]);
      bossMarkI++;
    }
    const gateX = Math.min(x + endW * .42, cfg.width - 900);
    const bossX = U.clamp(gateX + 650, x + 520, cfg.width - 260);
    row(x + 80, y - 50, 4, 'heartDrop');
    const groundNear = tx => {
      let best = null, bd = 1e9;
      for (const pl of plats) {
        if (pl.type !== 'ground') continue;
        const cx = U.clamp(tx, pl.x + 130, pl.x + pl.w - 130);
        const d = Math.abs(cx - tx);
        if (d < bd) { bd = d; best = { pl, x: cx }; }
      }
      return best;
    };
    const loveTrials = [cfg.width * .24, cfg.width * .57].map((tx, i) => {
      const g = groundNear(tx);
      return { id: 'trial' + i, x: g.x, y: g.pl.y, done: false, charge: 0 };
    });

    return this._pack(cfg, idx, plats, items, foes, {
      shrineX, shrineY: this._topAtList(plats, shrineX), gateX, gateY: y,
      loveTrials,
      startX: 140, checkpoints: [{ x: 140, y: 520 }, ...loveTrials.map(t => ({ x: t.x, y: t.y })), { x: shrineX, y: this._topAtList(plats, shrineX) }],
      boss: {
        id: 'boss', type: 'boss', bossName: cfg.bossName, bossKind: cfg.bossKind,
        x: bossX, y: y - 125, homeX: bossX, homeY: y - 125, vx: 0, vy: 0, dir: -1,
        hp: 950 + idx * 170, maxHp: 950 + idx * 170, dmg: 20 + idx * 3,
        t: 0, atkT: 3, phase: 0, mode: 'idle', modeT: 2.5, flash: 0, hurtShow: 0, dying: 0, dead: false
      }
    });
  },

  _topAtList(plats, x) {
    let best = 620;
    for (const pl of plats) if (pl.type === 'ground' && x >= pl.x && x <= pl.x + pl.w) best = Math.min(best, pl.y);
    return best;
  },

  _pack(cfg, idx, plats, items, foes, extra) {
    // spatial buckets for fast platform lookup
    const buckets = new Map();
    const BS = 160;
    for (const pl of plats) {
      const b0 = Math.floor((pl.x - 40) / BS), b1 = Math.floor((pl.x + pl.w + 40) / BS);
      for (let b = b0; b <= b1; b++) {
        if (!buckets.has(b)) buckets.set(b, []);
        buckets.get(b).push(pl);
      }
    }
    return Object.assign({
      cfg, idx, name: cfg.name, theme: cfg.theme, width: cfg.width,
      plats, items, foes: foes.filter(f => !f.dead), buckets, BS,
      shrineDone: false, gateOpen: false
    }, extra);
  },

  platsNear(level, x) {
    return level.buckets.get(Math.floor(x / level.BS)) || [];
  },

  // top of the highest platform under x (for AI / spawning), null over a gap
  topAt(level, x, belowY = -1e9) {
    let best = null;
    for (const pl of this.platsNear(level, x)) {
      if (x >= pl.x && x <= pl.x + pl.w && pl.y >= belowY) {
        if (best === null || pl.y < best) best = pl.y;
      }
    }
    return best;
  }
};
