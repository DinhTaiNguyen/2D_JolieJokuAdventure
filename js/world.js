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
    {
      name: 'Bamboo Homeland', nameVi: 'Làng Tre Thánh Gióng', theme: 'village', width: 16800, seed: 707, density: 1.82,
      bossName: 'Mongol Iron Warlord', bossNameVi: 'Hắc Thiết Tướng Quân Mông', bossKind: 'horde',
      miniBosses: [
        { name: 'Shadow Protectorate Overseer', nameVi: 'Quan Đô Hộ Bóng Tối', type: 'thorn' },
        { name: 'Iron Vanguard Captain', nameVi: 'Kỵ Tướng Tiền Phong', type: 'golem' }
      ]
    },
  ],

  DEATH_Y: 860,
  COOP_CHALLENGES: ['forestBridge', 'oceanPhoenix', 'flowerLift', 'shadowLantern', 'emberRain', 'starMirror', 'giongBridge'],

  // Safe but lively post-boss platform routes. Each has different heights and pacing,
  // so the couple gets a distinct date location instead of an automatic chapter skip.
  DATE_PATHS: {
    forest: [
      ['ground', 105, 300, 0], ['mush', 100, 175, -72], ['mush', 112, 190, -118],
      ['ground', 100, 285, -38], ['mush', 104, 175, -98], ['ground', 112, 310, -10],
      ['mush', 96, 185, -78], ['ground', 105, 280, 0]
    ],
    falls: [
      ['mush', 105, 185, -64], ['mush', 100, 170, -138], ['ground', 110, 280, -54],
      ['mush', 108, 190, -126], ['mush', 98, 165, -42], ['ground', 112, 300, -4],
      ['mush', 106, 185, -88], ['ground', 96, 280, 0]
    ],
    blossom: [
      ['ground', 98, 295, -18], ['mush', 102, 180, -78], ['ground', 106, 255, -108],
      ['mush', 95, 190, -142], ['mush', 108, 170, -74], ['ground', 110, 320, -26],
      ['mush', 100, 185, -92], ['ground', 104, 280, 0]
    ],
    shadow: [
      ['mush', 108, 170, -72], ['ground', 102, 250, -116], ['mush', 110, 180, -150],
      ['mush', 98, 165, -90], ['ground', 108, 300, -44], ['mush', 105, 175, -118],
      ['ground', 108, 285, -58], ['ground', 96, 280, 0]
    ],
    ember: [
      ['ground', 102, 275, -42], ['mush', 106, 180, -106], ['mush', 102, 165, -158],
      ['ground', 108, 265, -88], ['mush', 98, 185, -146], ['ground', 108, 300, -38],
      ['mush', 104, 180, -82], ['ground', 100, 290, 0]
    ],
    star: [
      ['mush', 98, 190, -86], ['ground', 106, 270, -132], ['mush', 106, 180, -176],
      ['mush', 100, 170, -104], ['ground', 108, 300, -52], ['mush', 104, 190, -120],
      ['ground', 110, 290, -66], ['ground', 96, 290, 0]
    ],
    village: [
      ['ground', 108, 330, -18], ['mush', 92, 215, -76], ['ground', 112, 310, -116],
      ['mush', 96, 205, -168], ['mush', 100, 230, -96], ['ground', 110, 350, -42],
      ['mush', 92, 220, -132], ['ground', 108, 320, -72], ['mush', 98, 215, -154],
      ['ground', 104, 340, -36], ['mush', 92, 205, -88], ['ground', 100, 310, 0]
    ]
  },

  gen(idx, difficulty = 'normal') {
    const cfg = this.LEVELS[idx];
    const vi = typeof Story !== 'undefined' && Story.isVietnamese && Story.isVietnamese();
    const r = U.rng(cfg.seed);
    const plats = [], items = [], foes = [];
    let itemId = 0, foeId = 0;
    const monsterMul = ({ easy: .72, normal: 1, hard: 1.55 })[difficulty] || 1;

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
        id: 'mb' + idx + '_' + rank, type, variant: cfg.theme, bossTier: 'normal', bossRank: rank, bossStyle: cfg.bossKind,
        bossName: mini ? ((vi && mini.nameVi) || mini.name) : (rank === 0 ? 'Oathbreaker Brute' : 'Dreadroot Captain'),
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
      const baseFoeCount = 1 + (r() * cfg.density * 2.4 | 0);
      const foeCount = Math.min(difficulty === 'hard' ? 6 : 4, Math.max(1, Math.round(baseFoeCount * monsterMul)));
      for (let i = 0; i < foeCount; i++) {
        if (x + w < 1200) break; // keep the start peaceful
        const t = r();
        const fx = x + 90 + r() * (w - 180);
        if (cfg.theme === 'village') foe(t < .28 ? 'slime' : t < .56 ? 'thorn' : t < .78 ? 'wisp' : 'imp', fx, pl);
        else if (cfg.theme === 'ember' && t > .72) foe('golem', fx, pl);
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
    const arenaEnd = x + endW + 1200;
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
    const loveTrials = [cfg.width * .48].map((tx, i) => {
      const g = groundNear(tx);
      const kind = World.COOP_CHALLENGES[idx % World.COOP_CHALLENGES.length];
      return {
        id: 'trial' + i, kind, x: g.x, y: g.pl.y, done: false, charge: 0, stage: 0,
        skillMask: 0, travel: 0, lockLimit: g.x + 150, extreme: true
      };
    });
    const coopObstacles = loveTrials.map(tr => {
      const spec = {
        forestBridge: { w: 1080, h: 260, dur: 4.8, arc: 125 },
        oceanPhoenix: { w: 1720, h: 330, dur: 6.6, arc: 265 },
        flowerLift: { w: 1040, h: 500, dur: 5.6, arc: 335 },
        shadowLantern: { w: 1260, h: 370, dur: 5.4, arc: 155 },
        emberRain: { w: 1380, h: 360, dur: 5.8, arc: 195 },
        starMirror: { w: 1480, h: 410, dur: 6.0, arc: 265 },
        giongBridge: { w: 1740, h: 470, dur: 6.4, arc: 235 },
      }[tr.kind] || { w: 980, h: 280, dur: 5, arc: 150 };
      const startX = tr.x + 230;
      const landing = groundNear(startX + spec.w + 110);
      const endX = Math.max(startX + 620, landing.x);
      tr.routeStartX = tr.x + 34;
      tr.endX = endX;
      tr.endY = landing.pl.y;
      tr.travelDur = spec.dur;
      tr.travelArc = spec.arc;
      return {
        id: tr.id + '_obstacle', trialId: tr.id, kind: tr.kind,
        x: startX, y: tr.y, w: Math.max(620, endX - startX), h: spec.h,
        endX, endY: landing.pl.y
      };
    });
    // The cooperative crossing is a focused set-piece, not an unavoidable combat corridor.
    // Keep ordinary enemies outside its route while preserving every strong boss lock.
    for (const tr of loveTrials) {
      for (let i = foes.length - 1; i >= 0; i--) {
        const f = foes[i];
        if (!f.bossTier && f.x > tr.x - 260 && f.x < tr.endX + 130) foes.splice(i, 1);
      }
    }
    const postBoss = this._addDateJourney(cfg, idx, {
      ground, mush, row,
      startX: arenaEnd,
      baseY: y
    });
    const culturalProps = cfg.theme === 'village'
      ? this._villageProps(plats, loveTrials[0], postBoss)
      : [];

    return this._pack(cfg, idx, plats, items, foes, {
      shrineX, shrineY: this._topAtList(plats, shrineX), gateX, gateY: y,
      loveTrials, coopObstacles,
      culturalProps,
      startX: 140, checkpoints: [{ x: 140, y: 520 }, ...loveTrials.map(t => ({ x: t.x, y: t.y })), { x: shrineX, y: this._topAtList(plats, shrineX) }],
      postBoss,
      width: postBoss.end + 420,
      difficulty,
      boss: {
        id: 'boss', type: 'boss', bossName: (vi && cfg.bossNameVi) || cfg.bossName, bossKind: cfg.bossKind,
        x: bossX, y: y - 125, homeX: bossX, homeY: y - 125, vx: 0, vy: 0, dir: -1,
        hp: 950 + idx * 170, maxHp: 950 + idx * 170, dmg: 20 + idx * 3,
        t: 0, atkT: 3, phase: 0, mode: 'idle', modeT: 2.5, flash: 0, hurtShow: 0, dying: 0, dead: false
      }
    });
  },

  _addDateJourney(cfg, idx, add) {
    const path = this.DATE_PATHS[cfg.theme] || this.DATE_PATHS.forest;
    const lights = [], platforms = [];
    let x = add.startX;
    let lastY = add.baseY;

    for (let i = 0; i < path.length; i++) {
      const [type, gap, w, dy] = path[i];
      x += gap;
      const y = U.clamp(add.baseY + dy, 340, 575);
      const pl = type === 'mush' ? add.mush(x, y, w) : add.ground(x, y, w);
      const cx = x + w / 2;
      const loot = i % 3 === 1 ? 'flower' : (i % 3 === 2 ? 'heartDrop' : 'orb');
      add.row(cx - 42, y - (type === 'mush' ? 48 : 54), 2, loot);
      lights.push({ x: cx, y: y - 94 - (i % 2) * 28, size: 22 + (i % 3) * 7, phase: i * 1.37 });
      platforms.push({ x, y, w, type });
      x += w;
      lastY = y;
    }

    x += 108;
    const terraceY = U.clamp((lastY + add.baseY) / 2 + 16, 410, 570);
    const terrace = add.ground(x, terraceY, 760);
    add.row(x + 110, terraceY - 54, 4, 'heartDrop');
    add.row(x + 395, terraceY - 54, 3, 'flower');
    const doorX = x + terrace.w - 150;

    return {
      id: 'date' + idx,
      theme: cfg.theme,
      start: add.startX - 90,
      end: x + terrace.w,
      doorX, doorY: terraceY,
      platforms, lights,
      unlocked: false, ready: 0, completed: false, announced: false
    };
  },

  _villageProps(plats, trial, postBoss) {
    const props = [];
    const grounds = plats.filter(pl => pl.type === 'ground' && pl.x + pl.w > 0);
    const add = (kind, x, y, h, flip = false, glow = false) => props.push({ kind, x, y, h, flip, glow });
    const addOn = (pl, kind, at, h, flip = false, glow = false) => {
      if (pl) add(kind, pl.x + pl.w * at, pl.y, h, flip, glow);
    };

    addOn(grounds[0], 0, .44, 122, false, true);
    addOn(grounds[0], 1, .72, 66, false, false);
    addOn(grounds[0], 2, .88, 76, true, false);

    const beforeDate = grounds.filter(pl => !postBoss || pl.x < postBoss.start);
    const atPart = part => beforeDate[Math.min(beforeDate.length - 1, Math.max(0, Math.floor(beforeDate.length * part)))];
    addOn(atPart(.18), 2, .22, 72, false, false);
    addOn(atPart(.34), 0, .78, 112, true, false);
    addOn(atPart(.58), 3, .24, 92, false, false);
    addOn(atPart(.76), 1, .76, 64, true, false);

    if (trial) {
      add(6, trial.x - 176, trial.y, 94, false, true);
      add(0, trial.x + 332, trial.y, 118, true, true);
    }

    if (postBoss) {
      const terrace = grounds.find(pl => postBoss.doorX >= pl.x && postBoss.doorX <= pl.x + pl.w);
      if (terrace) {
        addOn(terrace, 7, .20, 142, false, true);
        addOn(terrace, 3, .48, 94, false, true);
        addOn(terrace, 4, .64, 72, false, false);
        addOn(terrace, 2, .78, 74, false, true);
      }
    }
    return props;
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
      cfg, idx, name: cfg.name, theme: cfg.theme, width: extra.width || cfg.width,
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
