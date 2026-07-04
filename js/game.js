'use strict';
/* ============ game core: loop, co-op logic, love mechanics, rendering ============ */
const G = {
  state: 'menu', mode: 'solo',
  time: 0, me: null, mate: null, pets: [],
  levelIndex: 0, level: null,
  projs: [], auras: [], fireflies: [],
  cam: { x: 400, y: 380, zoom: 1 }, zoomK: 0,
  love: 0, handHold: false, hugCd: 0, heartHeldT: 0,
  kissCin: 0, kissX: 0, _kissAnnounced: false,
  reviveT: 0, dialog: null, cut: null,
  fade: 1, fadeDir: -1,
  shakeT: 0, shakeMag: 0,
  announce: null,
  stats: { orbs: 0, flowers: 0, hearts: 0, hugs: 0, kisses: 0, kills: 0, startT: 0 },
  checkpoint: { x: 140, y: 400 },
  paused: false, bossActive: false, netLost: false, ended: false,
  netT: { p: 0, w: 0 }, mateNet: null, _dropId: 0, _comboToastT: 0,
  demo: null,
};

const Game = {
  canvas: null, ctx: null, cssW: 0, cssH: 0, dpr: 1, scale: 1,
  _last: 0,

  /* ================= boot & sizing ================= */
  boot() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    addEventListener('resize', () => this.resize());
    Input.init();
    NET.onMsg = m => this.onNet(m);
    requestAnimationFrame(ts => this.frame(ts));
  },

  resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.cssW = innerWidth; this.cssH = innerHeight;
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    this.scale = this.cssH / 500;
  },

  /* ================= game lifecycle ================= */
  startGame(mode, startLevel = 0) {
    G.mode = mode;
    const myChar = (mode === 'guest') ? 'jolie' : 'joku';
    const otherChar = myChar === 'joku' ? 'jolie' : 'joku';
    G.me = Ent.makePlayer(myChar);
    G.mate = Ent.makePlayer(otherChar);
    G.mate.remote = (mode !== 'solo');
    G.mate.bot = (mode === 'solo');
    const joku = myChar === 'joku' ? G.me : G.mate;
    const jolie = myChar === 'jolie' ? G.me : G.mate;
    G.pets = [Ent.makePet('dog', joku), Ent.makePet('panda', jolie)];
    G.love = 0; G.handHold = false; G.kissCin = 0; G.ended = false; G.netLost = false;
    G.stats = { orbs: 0, flowers: 0, hearts: 0, hugs: 0, kisses: 0, kills: 0, startT: performance.now() / 1000 };
    G.state = 'play'; G.paused = false; G.demo = null;
    this.loadLevel(startLevel);
    Main.showGameUI(myChar);
  },

  quitToMenu() {
    NET.close();
    SND.stopMusic();
    G.state = 'menu'; G.cut = null; G.dialog = null; G.paused = false;
    Main.showMenu();
  },

  loadLevel(n) {
    G.levelIndex = n;
    G.level = World.gen(n);
    G.level.bg = Art.makeBackground(G.level.theme, G.level.cfg.seed);
    G.projs = []; G.auras = []; G.cut = null; G.dialog = null;
    G.bossActive = false;
    Ptc.list.length = 0;

    const joku = this.byChar('joku'), jolie = this.byChar('jolie');
    joku.x = G.level.startX; jolie.x = G.level.startX + 46;
    const gy = World.topAt(G.level, G.level.startX) || 520;
    joku.y = jolie.y = gy;
    for (const p of [joku, jolie]) {
      p.vx = p.vy = 0; p.down = false; p.pose = null; p.hp = p.maxHp; p.mp = p.maxMp;
      p.invuln = 2; p._fell = false; p.safeX = p.x; p.safeY = p.y;
    }
    for (const pet of G.pets) { pet.x = pet.owner.x - 40; pet.y = pet.owner.y; }
    G.checkpoint = { x: G.level.checkpoints[0].x, y: gy };
    G.handHold = false;
    G.cam.x = joku.x; G.cam.y = gy - 120;

    // ambient motes
    G.fireflies = [];
    for (let i = 0; i < 26; i++) {
      G.fireflies.push({ x: Math.random() * G.level.width, y: 100 + Math.random() * 500, p: Math.random() * 9, s: .5 + Math.random() });
    }

    G.fade = 1; G.fadeDir = -1;
    G.announce = { txt: G.level.name, sub: G.level.cfg.boss ? '💔 Final Battle' : 'Chapter ' + (n + 1), t: 3.2 };
    SND.startMusic(n);

    // level-start scenes run locally on BOTH devices (deterministic), no network needed
    if (n === 0) this.cutStart('intro', true);
    else if (G.level.cfg.boss) this.cutStart('bossIntro', true);
    else this.cutStart('lvl', true);
  },

  nextLevel() {
    if (G.mode === 'guest') return; // guest waits for the host's 'lvl' message
    const n = G.levelIndex + 1;
    if (n >= World.LEVELS.length) return;
    this.emit('lvl', { n });
    this.loadLevel(n);
  },

  byChar(c) { return G.me.char === c ? G.me : G.mate; },
  enemiesAll() {
    const b = G.level && G.level.boss;
    return (b && !b.dead) ? G.level.foes.concat([b]) : (G.level ? G.level.foes : []);
  },
  nearestPlayer(x, y) {
    let best = null, bd = 1e9;
    for (const p of [G.me, G.mate]) {
      if (p.down) continue;
      const d = U.dist(x, y, p.x, p.y - 26);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  },
  playersMidX() { return (G.me.x + G.mate.x) / 2; },

  /* ================= frame ================= */
  frame(ts) {
    const dt = Math.min((ts - this._last) / 1000 || 0.016, 1 / 30);
    this._last = ts;
    if (G.state === 'menu') {
      this.updateMenu(dt);
      this.renderMenu();
    } else {
      if (!(G.paused && G.mode === 'solo')) this.update(dt);
      this.render();
    }
    Input.clearEdges();
    requestAnimationFrame(t2 => this.frame(t2));
  },

  /* ================= update ================= */
  update(dt) {
    G.time += dt;
    const L = G.level;
    if (!L) return;

    // ----- dialog handling (consumes input) -----
    if (G.dialog) {
      G.dialog.chars += dt * 42;
      const lineLen = G.dialog.lines[G.dialog.i] ? G.dialog.lines[G.dialog.i][1].length : 0;
      if (Input.take('tap') || Input.take('confirm') || Input.take('jump') || Input.take('attack') || Input.take('heart')) {
        this.dlgAdvance(false);
      } else if (G.autoDlg && G.dialog.chars > lineLen + 40) {
        this.dlgAdvance(false); // test mode: hands-free story
      }
    }
    if (Input.take('pause')) Main.togglePause();

    // ----- cutscene -----
    if (G.cut) this.cutUpdate(dt);

    // ----- kiss cinematic -----
    if (G.kissCin > 0) this.kissUpdate(dt);

    // ----- my player -----
    const meInp = (G.paused || G.kissCin > 0) ? { ax: 0 } : Ent.localInput();
    Ent.updatePlayer(G.me, dt, meInp);

    // ----- partner: bot or remote -----
    if (G.mate.bot) {
      Ent.updatePlayer(G.mate, dt, Ent.botInput(G.mate, dt));
    } else {
      this.updateRemoteMate(dt);
    }

    // ----- heart button: love actions -----
    if (G.kissCin <= 0 && !G.cut && !G.dialog && !G.paused) this.updateLoveActions(dt);

    // ----- pets, enemies, projectiles, auras -----
    for (const pet of G.pets) Ent.updatePet(pet, dt);
    if (G.mode !== 'guest' && !G.cut && G.kissCin <= 0) {
      Ent.updateEnemies(dt);
      if (G.bossActive) Ent.updateBoss(dt);
    } else if (G.mode === 'guest') {
      this.lerpGuestEnemies(dt);
    }
    Ent.updateProjectiles(dt);
    this.updateAuras(dt);

    // ----- touch damage from enemies -----
    if (!G.me.down && G.me.invuln <= 0 && G.kissCin <= 0 && !G.cut) {
      for (const e of this.enemiesAll()) {
        if (e.dead || e.dying > 0) continue;
        const r = e.type === 'boss' ? 78 : 26;
        if (Math.abs(e.x - G.me.x) < r && Math.abs((e.y - 14) - (G.me.y - 26)) < r + 14) {
          this.damageMe(e.dmg, e.x);
          break;
        }
      }
    }

    // ----- pickups -----
    for (const it of L.items) {
      if (it.taken) continue;
      for (const p of [G.me, G.mate]) {
        if (p.remote || p.down) continue;
        if (Math.abs(it.x - p.x) < 30 && Math.abs(it.y - (p.y - 26)) < 42) {
          this.pickup(it, p === G.me ? G.me.char : G.mate.char, false);
          break;
        }
      }
    }

    // ----- downed logic -----
    if (G.me.down) {
      G.me.downT += dt;
      if (G.me.downT > 12) this.respawnMe(.55);
      // in solo mode the bot partner hugs you back up
      if (G.mate.bot && !G.mate.down && U.dist(G.me.x, G.me.y, G.mate.x, G.mate.y) < 70) {
        G.reviveT += dt;
        G.mate.pose = 'hug'; G.mate.poseT = .2;
        if (G.reviveT >= 1.6) { G.reviveT = 0; this.reviveMe(); }
      }
    }
    if (G.mode !== 'guest' && G.me.down && G.mate.down && !G._wiping) {
      G._wiping = true;
      this.emit('wipe', {});
      this.applyWipe();
    }

    // ----- love meter (host/solo authoritative) -----
    this.updateLoveMeter(dt);

    // ----- shrine & gate & fell-behind camera -----
    if (G.mode !== 'guest' && !G.cut && G.kissCin <= 0) {
      if (!L.shrineDone && L.shrineX && (Math.abs(G.me.x - L.shrineX) < 110 || Math.abs(G.mate.x - L.shrineX) < 110)) {
        this.cutStart('shrine');
      }
      if (L.gateX && !L.gateOpen && Math.abs(G.me.x - L.gateX) < 120 && Math.abs(G.mate.x - L.gateX) < 120) {
        this.cutStart('gate');
      }
    }

    // ----- camera -----
    this.updateCamera(dt);

    // ----- ambient & fx -----
    Ptc.update(dt);
    this.updateAmbient(dt);
    G.hugCd -= dt;
    G.shakeT -= dt;
    if (G.announce) { G.announce.t -= dt; if (G.announce.t <= 0) G.announce = null; }
    if (G._comboToastT > 0) G._comboToastT -= dt;

    // idle sweetness: hearts drift between the two when close & calm
    if (!G.cut && Math.random() < dt * .5) {
      const d = U.dist(G.me.x, G.me.y, G.mate.x, G.mate.y);
      if (d < 130 && Math.abs(G.me.vx) < 20 && Math.abs(G.mate.vx) < 20) {
        Ptc.add({ kind: 'heart', x: (G.me.x + G.mate.x) / 2, y: Math.min(G.me.y, G.mate.y) - 66, vx: 0, vy: -35, r: 5, life: 1.4, color: '#ff9fce' });
      }
    }

    // ----- fade -----
    G.fade = U.clamp(G.fade + G.fadeDir * dt * 1.6, 0, 1);

    // ----- network heartbeat -----
    if (G.mode !== 'solo' && NET.connected) {
      G.netT.p -= dt;
      if (G.netT.p <= 0) { G.netT.p = .05; this.sendState(); }
      if (G.mode === 'host') {
        G.netT.w -= dt;
        if (G.netT.w <= 0) { G.netT.w = .1; this.sendWorld(); }
      }
    }
  },

  /* ================= remote partner smoothing ================= */
  updateRemoteMate(dt) {
    const m = G.mate, s = G.mateNet;
    if (!s) return;
    if (!G.cut && G.kissCin <= 0) {
      s.x += s.vx * dt; s.y += s.vy * dt; // dead-reckon between packets
      const k = Math.min(1, 12 * dt);
      m.x += (s.x - m.x) * k;
      m.y += (s.y - m.y) * k;
      if (Math.abs(s.x - m.x) > 200 || Math.abs(s.y - m.y) > 260) { m.x = s.x; m.y = s.y; }
      m.vx = s.vx; m.vy = s.vy; m.dir = s.dir;
    }
    m.hp = s.hp; m.mp = s.mp;
    m.glide = s.gl; m.holding = s.hh;
    m.onGround = s.og;
    if (s.dn && !m.down) { m.down = true; m.pose = 'down'; }
    if (!s.dn && m.down) { m.down = false; m.pose = null; }
    if (s.wg) m.wing = 1;
    m.wing = Math.max(0, m.wing - dt * 1.6);
    if (s.at) { if (m.atkT > .3) m.atkT = 0; } // mirror attack pose
    m.atkT += dt;
    m.animT += dt * Math.min(1.4, Math.abs(m.vx) / 300 + .0001);
    m.invuln = 0; m.squash = 0;
  },

  lerpGuestEnemies(dt) {
    for (const e of this.enemiesAll()) {
      if (e.dead) continue;
      e.t += dt; e.flash -= dt; e.hurtShow -= dt;
      if (e.dying > 0) { e.dying += dt; continue; }
      if (e.tx != null) {
        const k = Math.min(1, 10 * dt);
        e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k;
        if (Math.abs(e.tx - e.x) > 300) { e.x = e.tx; e.y = e.ty; }
      }
      if (e.type === 'slime') e.hopY = Math.max(0, (e.plat ? e.plat.y : e.y) - e.y);
    }
  },

  /* ================= love: hands, hugs, kisses, revive ================= */
  updateLoveActions(dt) {
    const me = G.me, mate = G.mate;
    const d = U.dist(me.x, me.y, mate.x, mate.y);
    const heartEdge = Input.take('heart');
    const heartHeld = Input.held('heart');

    // revive channel
    if (mate.down && d < 80 && !me.down) {
      if (heartHeld) {
        G.reviveT += dt;
        me.pose = 'hug'; me.poseT = .2;
        if (Math.random() < dt * 8) Ptc.add({ kind: 'heart', x: mate.x, y: mate.y - 50, vx: (Math.random() - .5) * 40, vy: -60, r: 5, life: .8, color: '#ff9fce' });
        if (G.reviveT >= 1.6) {
          G.reviveT = 0;
          this.emit('revive', {});
          SND.sfx('revive');
          Ptc.burst('heart', mate.x, mate.y - 40, 12, { sp: 140, r: 7, life: 1.2 });
          if (mate.bot) { mate.down = false; mate.pose = null; mate.hp = mate.maxHp * .6; }
        }
      } else G.reviveT = 0;
      return;
    }
    G.reviveT = 0;
    if (me.down) return;

    // hug channel (hold ❤ while close)
    if (heartHeld && d < 95 && !mate.down) {
      G.heartHeldT += dt;
      if (G.heartHeldT > .55 && G.hugCd <= 0 && G.kissCin <= 0) {
        G.hugCd = 6;
        this.emit('love', { kind: 'hug', x: (me.x + mate.x) / 2 });
        this.applyLove('hug', (me.x + mate.x) / 2);
      }
    } else G.heartHeldT = 0;

    if (!heartEdge) {
      if (G.handHold && d > 240) { G.handHold = false; me.holding = mate.holding = false; }
      return;
    }
    // ❤ tapped:
    if (G.love >= 100 && d < 110 && !mate.down) {
      const x = (me.x + mate.x) / 2;
      this.emit('love', { kind: 'kiss', x });
      this.applyLove('kiss', x);
    } else if (d < 110 && !mate.down) {
      const kind = G.handHold ? 'unhold' : 'hold';
      this.emit('love', { kind });
      this.applyLove(kind);
    } else if (d >= 110) {
      this.toastMsg('💗 Get closer to your love!');
    }
  },

  applyLove(kind, x) {
    const me = G.me, mate = G.mate;
    switch (kind) {
      case 'hold':
        G.handHold = true; me.holding = mate.holding = true;
        SND.sfx('heart');
        Ptc.burst('heart', (me.x + mate.x) / 2, Math.min(me.y, mate.y) - 50, 6, { sp: 90, r: 6, life: 1 });
        this.toastMsg('🤝 Holding hands — stronger together!');
        break;
      case 'unhold':
        G.handHold = false; me.holding = mate.holding = false;
        break;
      case 'hug': {
        me.pose = mate.pose = 'hug'; me.poseT = mate.poseT = 1.5;
        me.invuln = Math.max(me.invuln, 1.8);
        me.dir = mate.x > me.x ? 1 : -1; mate.dir = -me.dir;
        G._hugHeal = 1.4;
        G.stats.hugs++;
        SND.sfx('heal');
        this.hugHearts(x || (me.x + mate.x) / 2);
        if (G.mode !== 'guest') this.loveAdd(8);
        break;
      }
      case 'kiss': {
        G.kissCin = 2.3;
        G.kissX = x || (me.x + mate.x) / 2;
        G._kissBurst = false;
        me.dir = G.kissX >= me.x ? 1 : -1;
        mate.dir = G.kissX >= mate.x ? 1 : -1;
        SND.sfx('kiss');
        G.stats.kisses++;
        if (G.mode !== 'guest') G.love = 0;
        break;
      }
    }
  },

  kissUpdate(dt) {
    G.kissCin -= dt;
    const me = G.me, mate = G.mate;
    // drift both to the kiss spot
    for (const [p, off] of [[me, me.char === 'joku' ? -13 : 13], [mate, mate.char === 'joku' ? -13 : 13]]) {
      p.x += ((G.kissX + off) - p.x) * Math.min(1, 8 * dt);
      p.vx = 0; p.vy = Math.min(p.vy, 0);
      p.pose = 'kiss'; p.poseT = .3;
      p.dir = off < 0 ? 1 : -1;
      p.invuln = 1;
    }
    if (Math.random() < dt * 14) {
      Ptc.add({ kind: 'heart', x: G.kissX + (Math.random() - .5) * 50, y: me.y - 60 - Math.random() * 30, vx: (Math.random() - .5) * 60, vy: -70 - Math.random() * 50, r: 4 + Math.random() * 6, life: 1.4, color: Math.random() < .5 ? '#ff9fce' : '#ffc4dc' });
    }
    if (G.kissCin < 1.3 && !G._kissBurst) {
      G._kissBurst = true;
      // LOVE BURST — clears the screen, full heal
      SND.sfx('burst');
      this.shake(12);
      this.kissFireworks(G.kissX);
      me.hp = me.maxHp; me.mp = me.maxMp;
      Ptc.add({ kind: 'ring', x: G.kissX, y: me.y - 40, vx: 0, vy: 0, r: 320, life: .9, color: 'rgba(255,170,210,.95)' });
      Ptc.text(G.kissX, me.y - 110, 'LOVE BURST!', '#ff9fce');
      if (G.mode !== 'guest') { // host applies the damage
        for (const e of this.enemiesAll()) {
          if (e.dead || e.dying > 0) continue;
          if (Math.abs(e.x - G.kissX) < 700) this.hitEnemy(e, 85, 'love');
        }
      }
    }
    if (G.kissCin <= 0) { me.pose = mate.pose = null; }
  },

  updateLoveMeter(dt) {
    if (G.mode === 'guest') return; // synced from host
    const d = U.dist(G.me.x, G.me.y, G.mate.x, G.mate.y);
    if (d < 150 && !G.me.down && !G.mate.down) {
      this.loveAdd((G.handHold ? 1.5 : .4) * dt, true);
      // togetherness regen
      G.me.hp = Math.min(G.me.maxHp, G.me.hp + 1.5 * dt);
      if (G.mate.bot) G.mate.hp = Math.min(G.mate.maxHp, G.mate.hp + 1.5 * dt);
    }
    if (G._hugHeal > 0) {
      G._hugHeal -= dt;
      G.me.hp = Math.min(G.me.maxHp, G.me.hp + 26 * dt);
      if (G.mate.bot) G.mate.hp = Math.min(G.mate.maxHp, G.mate.hp + 26 * dt);
    }
  },

  loveAdd(n, quiet) {
    if (G.mode === 'guest') return;
    const was = G.love;
    G.love = U.clamp(G.love + n, 0, 100);
    if (G.love >= 100 && was < 100) {
      SND.sfx('heart');
      G.announce = { txt: '💋 KISS READY!', sub: 'get close & press ❤', t: 2.4 };
    }
  },

  /* ================= combat ================= */
  addProj(o, fromNet) {
    o.t = 0;
    G.projs.push(o);
    if (!fromNet) {
      if (o.mine) this.emit('shoot', { kind: o.kind, x: o.x, y: o.y, vx: o.vx, vy: o.vy, life: o.life, g: o.g });
      else if (o.host && G.mode === 'host') this.emit('shoot', { kind: o.kind, x: o.x, y: o.y, vx: o.vx, vy: o.vy, life: o.life, g: o.g, foe: true });
    }
  },

  addAura(x, y, mine) {
    G.auras.push({ x, y, t: 3.5, mine });
  },

  updateAuras(dt) {
    for (let i = G.auras.length - 1; i >= 0; i--) {
      const a = G.auras[i];
      a.t -= dt;
      if (a.t <= 0) { G.auras.splice(i, 1); continue; }
      // heals whoever stands in it (each device heals its own player)
      if (!G.me.down && U.dist(G.me.x, G.me.y - 20, a.x, a.y - 20) < 135) {
        G.me.hp = Math.min(G.me.maxHp, G.me.hp + 12 * dt);
      }
      if (G.mate.bot && U.dist(G.mate.x, G.mate.y - 20, a.x, a.y - 20) < 135) {
        G.mate.hp = Math.min(G.mate.maxHp, G.mate.hp + 12 * dt);
      }
      // gentle damage to enemies (owner side only)
      if (a.mine) {
        a._tick = (a._tick || 0) - dt;
        if (a._tick <= 0) {
          a._tick = .45;
          for (const e of this.enemiesAll()) {
            if (!e.dead && !(e.dying > 0) && U.dist(e.x, e.y - 16, a.x, a.y - 20) < 145) this.hitEnemy(e, 8, 'jolie');
          }
        }
      }
      if (Math.random() < dt * 8) {
        const an = Math.random() * U.TAU;
        Ptc.add({ kind: 'petal', x: a.x + Math.cos(an) * 120, y: a.y - 20 + Math.sin(an) * 60, vx: -Math.cos(an) * 40, vy: -30, r: 5, life: .9 });
      }
    }
  },

  hitEnemy(e, dmg, by, fromNet) {
    if (e.dead || e.dying > 0) return;
    if (G.mode === 'guest' && !fromNet) {
      // optimistic hit + tell the host
      e.hp = Math.max(1, e.hp - dmg);
      e.flash = .12; e.hurtShow = 2;
      Ptc.text(e.x, e.y - 40, '-' + (dmg | 0), '#ffd7ec');
      SND.sfx('ehit');
      this.emit('hit', { id: e.id, dmg, by });
      return;
    }
    e.hp -= dmg;
    e.flash = .12; e.hurtShow = 2;
    if (!fromNet) { Ptc.text(e.x, e.y - 40, '-' + (dmg | 0), '#ffd7ec'); SND.sfx('ehit'); }
    // combo of love: both heroes hit the same foe within 1.2s
    if (by === 'joku' || by === 'jolie') {
      if (e._lastBy && e._lastBy !== by && G.time - e._lastByT < 1.2) {
        this.loveAdd(6);
        if (G._comboToastT <= 0) {
          G._comboToastT = 2.5;
          Ptc.text(e.x, e.y - 58, 'COMBO OF LOVE! 💞', '#ff9fce');
          SND.sfx('heart');
        }
      }
      e._lastBy = by; e._lastByT = G.time;
    }
    if (e.hp <= 0) {
      if (e.type === 'boss') this.bossDefeated();
      else this.killEnemy(e);
    }
  },

  killEnemy(e) {
    e.dead = true;
    G.stats.kills++;
    this.loveAdd(3);
    SND.sfx('ekill');
    Ptc.burst('dot', e.x, e.y - 14, 10, { color: '#b28fe8', sp: 160, r: 7, life: .6 });
    Ptc.burst('spark', e.x, e.y - 14, 6, { sp: 190, g: 500, r: 4, life: .6 });
    if (G.mode !== 'guest') {
      // loot
      const r = Math.random();
      let kind = null;
      if (r < .5) kind = 'mote';
      else if (r < .72) kind = 'heartDrop';
      if (kind) {
        const it = { id: 'd' + (G._dropId++), kind, x: e.x, y: e.y - 30, taken: false };
        G.level.items.push(it);
        this.emit('drop', { id: it.id, kind, x: it.x, y: it.y });
      }
      this.emit('edie', { id: e.id });
    }
  },

  damageMe(dmg, fromX) {
    const me = G.me;
    if (me.invuln > 0 || me.down || G.kissCin > 0 || G.cut) return;
    const d = U.dist(me.x, me.y, G.mate.x, G.mate.y);
    if (G.handHold && d < 150) dmg *= .7; // held hands protect
    me.hp -= dmg;
    me.invuln = 1; me.hurtCd = .8;
    me.vx = Math.sign(me.x - fromX) * 300 || 300;
    me.vy = -260;
    SND.sfx('hit');
    this.shake(6);
    Ptc.burst('spark', me.x, me.y - 30, 6, { color: '#ff8f8f', sp: 170, g: 400, r: 4, life: .5 });
    if (me.hp <= 0) {
      me.hp = 0; me.down = true; me.downT = 0; me.pose = 'down';
      SND.sfx('down');
      this.emit('down', {});
      this.toastMsg(me.char === 'joku' ? '💔 Joku is down! Jolie, hug him back up!' : '💔 Jolie is down! Joku, hug her back up!');
    }
  },

  fell(p) {
    if (p === G.me) {
      G.me.hp = Math.max(5, G.me.hp - 12);
      SND.sfx('hit');
      this.shake(5);
      this.toastMsg('🌫 The mist caught you… careful!');
    }
    Ptc.burst('drop', p.x, World.DEATH_Y - 80, 12, { sp: 200, up: 300, g: 700, r: 5, life: .8 });
    p.x = p.safeX; p.y = p.safeY - 4; p.vx = 0; p.vy = 0;
    p.invuln = 1.5; p._fell = false;
  },

  reviveMe() {
    if (!G.me.down) return;
    G.me.down = false; G.me.pose = null; G.me.downT = 0;
    G.me.hp = G.me.maxHp * .6; G.me.invuln = 2;
    SND.sfx('revive');
    Ptc.burst('heart', G.me.x, G.me.y - 40, 12, { sp: 140, r: 7, life: 1.2 });
  },

  respawnMe(hpFrac) {
    const me = G.me;
    me.down = false; me.pose = null; me.downT = 0;
    me.hp = me.maxHp * hpFrac; me.invuln = 2.5;
    me.x = G.checkpoint.x + (me.char === 'jolie' ? 46 : 0);
    me.y = (World.topAt(G.level, me.x) || G.checkpoint.y);
    me.vx = me.vy = 0;
    Ptc.burst('heart', me.x, me.y - 40, 8, { sp: 110, r: 6, life: 1 });
  },

  applyWipe() {
    G._wiping = false;
    this.respawnMe(.6);
    this.toastMsg('💞 Love never gives up! Back to the shrine.');
  },

  /* ================= pickups ================= */
  pickup(it, by, fromNet) {
    if (it.taken) return;
    it.taken = true;
    const forMe = (by === G.me.char);
    switch (it.kind) {
      case 'orb':
        G.stats.orbs++;
        if (forMe) G.me.mp = Math.min(G.me.maxMp, G.me.mp + 12);
        if (!fromNet) SND.sfx('orb');
        Ptc.burst('dot', it.x, it.y, 5, { color: '#4fb0ff', sp: 90, r: 6, life: .5 });
        break;
      case 'flower':
        G.stats.flowers++;
        if (forMe) G.me.hp = Math.min(G.me.maxHp, G.me.hp + 7);
        if (!fromNet) SND.sfx('flower');
        Ptc.burst('petal', it.x, it.y, 6, { sp: 110, r: 5, life: .7 });
        break;
      case 'heartDrop':
        G.stats.hearts++;
        this.loveAdd(8);
        if (!fromNet) SND.sfx('heart');
        Ptc.burst('heart', it.x, it.y, 5, { sp: 90, r: 6, life: .9 });
        break;
      case 'mote':
        if (forMe) G.me.mp = Math.min(G.me.maxMp, G.me.mp + 10);
        if (!fromNet) SND.sfx('orb');
        Ptc.burst('dot', it.x, it.y, 4, { color: '#5ee8ff', sp: 70, r: 5, life: .4 });
        break;
    }
    if (!fromNet) this.emit('pick', { id: it.id, by });
  },

  /* ================= boss ================= */
  bossWake() {
    G.bossActive = true;
    SND.sfx('boss');
    this.shake(8);
  },
  bossSlam(x) {
    SND.sfx('slam');
    this.shake(11);
    Ptc.burst('dot', x, 500, 14, { color: '#9e5eff', sp: 260, r: 9, life: .6 });
    Ptc.add({ kind: 'ring', x, y: 500, vx: 0, vy: 0, r: 160, life: .5, color: 'rgba(158,94,255,.8)' });
    for (const dir of [-1, 1]) {
      this.addProj({ kind: 'shock', x: x + dir * 60, y: 520, vx: dir * 330, vy: 0, dmg: 16, life: 2.4, mine: false, foe: true, host: true });
    }
  },
  bossSummon() {
    const b = G.level.boss;
    SND.sfx('boss');
    const pl = G.level.plats[0];
    for (const off of [-140, 140]) {
      const f = {
        id: 'bs' + (G._dropId++), type: 'slime', x: U.clamp(b.x + off, pl.x + 40, pl.x + pl.w - 40), y: pl.y, homeX: b.x + off, plat: pl,
        vx: 0, vy: 0, dir: 1, hp: 40, maxHp: 40, dmg: 10, t: 0, atkT: .6, hopY: 0, flash: 0, hurtShow: 0, dead: false
      };
      G.level.foes.push(f);
      this.emit('spawn', { id: f.id, x: f.x, y: f.y });
      Ptc.burst('dot', f.x, f.y - 14, 8, { color: '#9e5eff', sp: 140, r: 7, life: .5 });
    }
  },
  bossDefeated() {
    const b = G.level.boss;
    if (b.dying > 0) return;
    b.hp = 0; b.dying = .01;
    SND.sfx('burst');
    this.shake(14);
    Ptc.add({ kind: 'ring', x: b.x, y: b.y, vx: 0, vy: 0, r: 400, life: 1.2, color: 'rgba(255,170,210,.9)' });
    Ptc.burst('heart', b.x, b.y, 20, { sp: 260, r: 8, life: 1.6 });
    this.emit('bossdead', {});
    this.cutStart('ending');
  },

  /* ================= level flow helpers (called from Story) ================= */
  hugHearts(x) {
    const y = (G.me.y + G.mate.y) / 2 - 60;
    Ptc.burst('heart', x, y, 12, { sp: 120, up: 40, r: 7, life: 1.3 });
    Ptc.add({ kind: 'ring', x, y: y + 20, vx: 0, vy: 0, r: 90, life: .8, color: 'rgba(255,170,210,.8)' });
  },
  kissFireworks(x) {
    const y = G.me.y - 60;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        Ptc.burst('heart', x + (Math.random() - .5) * 260, y - 60 - Math.random() * 120, 10, { sp: 200, r: 7, life: 1.5 });
        Ptc.burst('star', x + (Math.random() - .5) * 260, y - 60 - Math.random() * 120, 8, { sp: 240, r: 6, life: 1, color: '#fff3b0' });
        SND.sfx('heart');
      }, i * 320);
    }
  },
  showEnding() {
    G.ended = true;
    const t = performance.now() / 1000 - G.stats.startT;
    Main.showEnd(G.stats, t);
  },

  /* ================= cutscenes ================= */
  cutStart(name, fromNet) {
    if (G.cut && G.cut.name === name) return;
    if (!fromNet && G.mode === 'host') this.emit('cut', { name });
    if (G.mode === 'guest' && !fromNet) return;
    G.cut = { name, steps: Story.scene(name), i: -1, t: 0 };
    G.handHold = false; G.me.holding = G.mate.holding = false;
    G.heartHeldT = 0;
    this.cutNext();
  },

  cutNext() {
    const c = G.cut;
    c.i++;
    c.t = 0;
    if (c.i >= c.steps.length) {
      G.cut = null;
      if (G.me.pose !== 'down') G.me.pose = null;
      if (G.mate.pose !== 'down') G.mate.pose = null;
      return;
    }
    const st = c.steps[c.i];
    if (st.a === 'dlg') this.dlgOpen(st.key);
    if (st.a === 'fn') { st.f(); this.cutNext(); return; }
    if (st.a === 'face') {
      const j = this.byChar('joku'), l = this.byChar('jolie');
      j.dir = l.x >= j.x ? 1 : -1; l.dir = -j.dir;
      this.cutNext(); return;
    }
    if (st.a === 'pose') {
      const j = this.byChar('joku'), l = this.byChar('jolie');
      j.pose = l.pose = st.pose; j.poseT = l.poseT = st.t + .2;
      if (st.pose === 'kiss' && Math.random) { /* hearts spawned in update */ }
    }
    if (st.a === 'fade') G.fadeDir = 1;
  },

  cutUpdate(dt) {
    const c = G.cut;
    if (!c) return;
    const st = c.steps[c.i];
    if (!st) { G.cut = null; return; }
    c.t += dt;
    switch (st.a) {
      case 'move': {
        const p = this.byChar(st.who);
        const dx = st.x - p.x;
        if (Math.abs(dx) < 8 || c.t > 4) {
          p.vx = 0; this.cutNext();
        } else {
          p.dir = Math.sign(dx);
          p.vx = p.dir * 240;
          p.x += p.vx * dt;
          p.animT += dt;
          const top = World.topAt(G.level, p.x);
          if (top !== null) p.y += (top - p.y) * Math.min(1, 14 * dt);
        }
        break;
      }
      case 'move2': { // both walk at once
        let done = true;
        for (const [who, txx] of [['joku', st.jx], ['jolie', st.lx]]) {
          const p = this.byChar(who);
          const dx = txx - p.x;
          if (Math.abs(dx) > 8) {
            done = false;
            p.dir = Math.sign(dx);
            p.vx = p.dir * 240;
            p.x += p.vx * dt;
            p.animT += dt;
            const top = World.topAt(G.level, p.x);
            if (top !== null) p.y += (top - p.y) * Math.min(1, 14 * dt);
          } else p.vx = 0;
        }
        if (done || c.t > 4.5) this.cutNext();
        break;
      }
      case 'dlg':
        if (!G.dialog) this.cutNext();
        break;
      case 'pose': {
        if (st.pose === 'kiss' && Math.random() < dt * 10) {
          const x = (G.me.x + G.mate.x) / 2;
          Ptc.add({ kind: 'heart', x: x + (Math.random() - .5) * 40, y: G.me.y - 70, vx: (Math.random() - .5) * 50, vy: -80, r: 4 + Math.random() * 5, life: 1.3, color: '#ff9fce' });
        }
        if (c.t >= st.t) this.cutNext();
        break;
      }
      case 'wait':
        if (c.t >= st.t) this.cutNext();
        break;
      case 'fade':
        if (G.fade >= 1) this.cutNext();
        break;
      default:
        this.cutNext();
    }
  },

  /* ================= dialog ================= */
  dlgOpen(key) {
    const lines = Story.DLG[key];
    if (!lines) { return; }
    G.dialog = { key, lines, i: 0, chars: 0 };
  },

  dlgAdvance(fromNet) {
    const d = G.dialog;
    if (!d) return;
    if (G.mode === 'guest' && !fromNet) { this.emit('dlgReq', {}); return; }
    const full = d.lines[d.i][1].length;
    if (d.chars < full && !fromNet) {
      d.chars = full;
      if (G.mode === 'host') this.emit('dlg', { key: d.key, i: d.i, full: true });
      return;
    }
    d.i++;
    d.chars = 0;
    SND.sfx('ui');
    if (d.i >= d.lines.length) G.dialog = null;
    if (G.mode === 'host') this.emit('dlg', { key: d.key, i: d.i });
  },

  applyDlg(data) { // guest applies host's dialog position
    if (!G.dialog || G.dialog.key !== data.key) {
      if (data.i < (Story.DLG[data.key] || []).length) this.dlgOpen(data.key);
      else return;
    }
    if (data.full) { G.dialog.chars = 9999; return; }
    G.dialog.i = data.i;
    G.dialog.chars = 0;
    if (G.dialog.i >= G.dialog.lines.length) G.dialog = null;
  },

  /* ================= camera & ambient ================= */
  updateCamera(dt) {
    const L = G.level;
    let tx, ty, targetZoom = G.devZoom || 0;
    if (G.kissCin > 0) {
      tx = G.kissX; ty = G.me.y - 70; targetZoom = .35;
    } else if (G.cut) {
      tx = (G.me.x + G.mate.x) / 2; ty = Math.min(G.me.y, G.mate.y) - 80;
    } else {
      tx = G.me.x + G.me.dir * 46;
      ty = G.me.y - 86;
    }
    G.zoomK += (targetZoom - G.zoomK) * Math.min(1, 3 * dt);
    const s = this.scale * (1 + G.zoomK);
    const halfW = this.cssW / 2 / s;
    tx = U.clamp(tx, halfW - 370, L.width + 370 - halfW);
    ty = U.clamp(ty, 150, 560);
    G.cam.x += (tx - G.cam.x) * Math.min(1, 5 * dt);
    G.cam.y += (ty - G.cam.y) * Math.min(1, 4 * dt);
  },

  shake(mag) { G.shakeT = .35; G.shakeMag = mag; },

  updateAmbient(dt) {
    for (const f of G.fireflies) {
      f.p += dt;
      f.x += Math.sin(f.p * .7) * 12 * dt;
      f.y += Math.cos(f.p * .53) * 10 * dt;
    }
    // theme drift particles
    const th = G.level.theme;
    if (Math.random() < dt * 3) {
      const x = G.cam.x + (Math.random() - .5) * this.cssW / this.scale;
      if (th === 'blossom') Ptc.add({ kind: 'petal', x, y: G.cam.y - 300, vx: 20 + Math.random() * 30, vy: 40 + Math.random() * 30, r: 4, life: 6, spin: 1 });
      else if (th === 'shadow') Ptc.add({ kind: 'dot', x, y: G.cam.y + 260, vx: (Math.random() - .5) * 20, vy: -30, r: 5, life: 4, color: '#9e5eff' });
      else Ptc.add({ kind: 'dot', x, y: G.cam.y - 280, vx: (Math.random() - .5) * 16, vy: 22, r: 4, life: 6, color: th === 'falls' ? '#9fd8ff' : '#aef2d8' });
    }
    // butterflies drift through the sunny woods
    if ((th === 'forest' || th === 'blossom') && Math.random() < dt * .5 && Ptc.list.length < Ptc.MAX - 60) {
      Ptc.add({
        kind: 'butterfly', x: G.cam.x + (Math.random() - .5) * this.cssW / this.scale,
        y: G.cam.y + Math.random() * 180 - 30, vx: 0, vy: 0, r: 4, life: 9,
        color: Math.random() < .5 ? '#ffb3d6' : '#9fe0ff', spin: Math.random()
      });
    }
  },

  toastMsg(txt) { Main.toast(txt); },

  /* ================= networking ================= */
  emit(k, data) {
    if (G.mode === 'solo') return;
    NET.send({ t: 'ev', k, d: data });
  },
  emitFx(kind, x, y) {
    this.emit('fx', { kind, x, y });
  },

  sendState() {
    const p = G.me;
    NET.send({
      t: 'p', x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy),
      dir: p.dir, hp: Math.round(p.hp), mp: Math.round(p.mp),
      gl: p.glide, hh: p.holding, dn: p.down, wg: p.wing > .3, at: p.atkT < .15, og: p.onGround
    });
  },

  sendWorld() {
    const foes = [];
    for (const e of G.level.foes) {
      if (!e.dead) foes.push([e.id, Math.round(e.x), Math.round(e.y), e.dir, Math.round(e.hp)]);
    }
    const b = G.level.boss;
    NET.send({
      t: 'w', love: Math.round(G.love), foes,
      boss: b ? [Math.round(b.x), Math.round(b.y), Math.round(b.hp), b.dying > 0 ? 1 : 0] : null
    });
  },

  onNet(m) {
    if (!m || !m.t) return;
    // world messages are only meaningful once we're in the game
    if (m.t !== 'hello' && m.t !== 'init' && (G.state !== 'play' || !G.level)) return;
    switch (m.t) {
      case 'hello': // guest arrived — send them the world
        if (NET.mode === 'host') {
          NET.send({ t: 'init', lvl: G.levelIndex, started: G.state === 'play' });
        }
        break;
      case 'init':
        if (NET.mode === 'guest') {
          if (G.state !== 'play') {
            Main.hideOverlays();
            this.startGame('guest', m.lvl);
          } else if (G.levelIndex !== m.lvl) {
            this.loadLevel(m.lvl); // reconnected mid-adventure
          }
        }
        break;
      case 'p': G.mateNet = m; break;
      case 'w': {
        if (G.mode !== 'guest') break;
        G.love = m.love;
        for (const f of m.foes) {
          const e = G.level.foes.find(x => x.id === f[0]);
          if (e && !e.dead) { e.tx = f[1]; e.ty = f[2]; e.dir = f[3]; e.hp = f[4]; }
        }
        if (m.boss && G.level.boss) {
          const b = G.level.boss;
          b.tx = m.boss[0]; b.ty = m.boss[1]; b.hp = m.boss[2];
          if (m.boss[3] && !(b.dying > 0)) b.dying = .01;
        }
        break;
      }
      case 'ev': this.applyEvent(m.k, m.d); break;
    }
  },

  applyEvent(k, d) {
    switch (k) {
      case 'shoot':
        this.addProj({ kind: d.kind, x: d.x, y: d.y, vx: d.vx, vy: d.vy, dmg: d.foe ? (d.kind === 'shock' ? 16 : 12) : 0, life: d.life, g: d.g, mine: false, foe: !!d.foe }, true);
        if (d.kind === 'phoenix') SND.sfx('shootJ');
        else if (d.kind === 'petal') SND.sfx('shootP');
        break;
      case 'pick': {
        const it = G.level.items.find(x => x.id === d.id);
        if (it) this.pickup(it, d.by, true);
        break;
      }
      case 'drop':
        G.level.items.push({ id: d.id, kind: d.kind, x: d.x, y: d.y, taken: false });
        break;
      case 'hit': {
        const e = this.enemiesAll().find(x => x.id === d.id);
        if (e) this.hitEnemy(e, d.dmg, d.by, true);
        break;
      }
      case 'edie': {
        const e = G.level.foes.find(x => x.id === d.id);
        if (e && !e.dead) this.killEnemy(e);
        break;
      }
      case 'spawn': {
        const pl = G.level.plats[0];
        G.level.foes.push({
          id: d.id, type: 'slime', x: d.x, y: d.y, homeX: d.x, plat: pl, tx: d.x, ty: d.y,
          vx: 0, vy: 0, dir: 1, hp: 40, maxHp: 40, dmg: 10, t: 0, atkT: 1, hopY: 0, flash: 0, hurtShow: 0, dead: false
        });
        break;
      }
      case 'love': this.applyLove(d.kind, d.x); break;
      case 'down':
        SND.sfx('down');
        this.toastMsg(G.mate.char === 'joku' ? '💔 Joku is down! Hug him back up!' : '💔 Jolie is down! Hug her back up!');
        break;
      case 'revive': this.reviveMe(); break;
      case 'wipe': this.applyWipe(); break;
      case 'dlg': this.applyDlg(d); break;
      case 'dlgReq': if (G.mode === 'host') this.dlgAdvance(true); break;
      case 'cut': this.cutStart(d.name, true); break;
      case 'lvl': this.loadLevel(d.n); break;
      case 'bossdead':
        if (G.level.boss && !(G.level.boss.dying > 0)) { G.level.boss.hp = 0; G.level.boss.dying = .01; }
        break;
      case 'fx':
        if (d.kind === 'dash') { SND.sfx('dash'); }
        if (d.kind === 'bloom') { SND.sfx('bloom'); this.addAura(d.x, d.y, false); }
        break;
    }
  },

  /* ================= RENDER ================= */
  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const W = this.cssW, H = this.cssH;
    const L = G.level;
    if (!L) return;
    const pal = L.bg.pal;
    const s = this.scale * (1 + G.zoomK);

    // ---- parallax background ----
    ctx.fillStyle = pal.skyB;
    ctx.fillRect(0, 0, W, H);
    for (const layer of L.bg.layers) {
      const drawH = H, drawW = 1920 * (H / 1080);
      let off = (-G.cam.x * layer.speed * s) % drawW;
      if (off > 0) off -= drawW;
      for (let x = off; x < W; x += drawW) {
        ctx.drawImage(layer.cv, x, 0, drawW + 1, drawH);
      }
    }

    // ---- world space ----
    ctx.save();
    let shX = 0, shY = 0;
    if (G.shakeT > 0) {
      const m = G.shakeMag * (G.shakeT / .35);
      shX = (Math.random() - .5) * m; shY = (Math.random() - .5) * m;
    }
    ctx.translate(W / 2 + shX, H / 2 + shY);
    ctx.scale(s, s);
    ctx.translate(-G.cam.x, -G.cam.y);

    const viewL = G.cam.x - W / 2 / s - 80, viewR = G.cam.x + W / 2 / s + 80;
    const t = G.time;

    // platforms
    for (const pl of L.plats) {
      if (pl.x + pl.w < viewL || pl.x > viewR) continue;
      Art.drawPlatform(ctx, pl, pal, t);
    }
    // shrine & gate
    if (L.shrineX) Art.drawShrine(ctx, L.shrineX, L.shrineY, t, L.shrineDone);
    if (L.gateX) Art.drawGate(ctx, L.gateX, L.gateY, t, L.gateOpen || (Math.abs(G.me.x - L.gateX) < 160 && Math.abs(G.mate.x - L.gateX) < 160));

    // contact shadows (grounding!)
    for (const e of [G.me, G.mate]) {
      const gy2 = World.topAt(L, e.x, e.y - 50);
      if (gy2 !== null) Art.shadow(ctx, e.x, gy2, 15, Math.max(0, gy2 - e.y));
    }
    for (const pet of G.pets) {
      const gy2 = World.topAt(L, pet.x, pet.y - 50);
      if (gy2 !== null) Art.shadow(ctx, pet.x, gy2, 12, Math.max(0, gy2 - pet.y));
    }
    for (const e of L.foes) {
      if (e.dead || e.type === 'wisp' || e.x < viewL || e.x > viewR) continue;
      const gy2 = World.topAt(L, e.x, e.y - 30);
      if (gy2 !== null) Art.shadow(ctx, e.x, gy2, 14, Math.max(0, gy2 - e.y));
    }
    if (L.boss && !L.boss.dead) {
      const gy2 = World.topAt(L, L.boss.x);
      if (gy2 !== null) Art.shadow(ctx, L.boss.x, gy2, 60, Math.max(0, gy2 - L.boss.y));
    }

    // items
    for (const it of L.items) {
      if (it.taken || it.x < viewL || it.x > viewR) continue;
      Art.drawItem(ctx, it, t);
    }

    // bloom auras
    for (const a of G.auras) Art.drawAura(ctx, a, t);

    // enemies
    for (const e of L.foes) {
      if (e.dead || e.x < viewL || e.x > viewR) continue;
      Art.drawEnemy(ctx, e, t);
    }
    if (L.boss && !L.boss.dead) Art.drawBoss(ctx, L.boss, t);

    // hand-hold link
    if (G.handHold) {
      const d = U.dist(G.me.x, G.me.y, G.mate.x, G.mate.y);
      if (d < 240) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,170,210,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(G.me.x, G.me.y - 30);
        ctx.quadraticCurveTo((G.me.x + G.mate.x) / 2, Math.min(G.me.y, G.mate.y) - 48, G.mate.x, G.mate.y - 30);
        ctx.stroke();
        const mx = (G.me.x + G.mate.x) / 2;
        Art.heart(ctx, mx, Math.min(G.me.y, G.mate.y) - 52 + Math.sin(t * 4) * 3, 6, 'rgba(255,140,190,.9)');
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // pets & players (draw partner first, then me on top)
    for (const pet of G.pets) (pet.kind === 'dog' ? Art.drawDog : Art.drawPanda).call(Art, ctx, pet, t);
    const drawP = p => (p.char === 'joku' ? Art.drawJoku : Art.drawJolie).call(Art, ctx, p, t);
    drawP(G.mate); drawP(G.me);

    // revive progress
    if (G.reviveT > 0 && G.mate.down) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(G.mate.x, G.mate.y - 70, 16, -Math.PI / 2, -Math.PI / 2 + (G.reviveT / 1.6) * U.TAU); ctx.stroke();
      Art.heart(ctx, G.mate.x, G.mate.y - 70, 8, '#ff86b8');
    }

    // projectiles & particles
    for (const pr of G.projs) Art.drawProj(ctx, pr, t);
    Ptc.draw(ctx);

    // fireflies (world-space glows)
    ctx.globalCompositeOperation = 'lighter';
    for (const f of G.fireflies) {
      if (f.x < viewL || f.x > viewR) continue;
      const a = .3 + Math.sin(f.p * 2.4) * .25;
      Art.glow(ctx, f.x, f.y, 5 * f.s, pal.shroomGlow, Math.max(0, a));
    }
    ctx.globalCompositeOperation = 'source-over';

    // low mist over pits
    const mg = ctx.createLinearGradient(0, 640, 0, 830);
    mg.addColorStop(0, 'rgba(200,225,235,0)');
    mg.addColorStop(1, pal.mist.replace(/[\d.]+\)$/, '.55)'));
    ctx.fillStyle = mg;
    ctx.fillRect(viewL, 640, viewR - viewL, 260);

    ctx.restore();

    // ---- screen-space: soft animated light shaft ----
    if (L.theme !== 'shadow') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(W * .58 + Math.sin(G.time * .1) * 50, 0);
      ctx.rotate(.36);
      const shg = ctx.createLinearGradient(-70, 0, 90, 0);
      shg.addColorStop(0, 'rgba(255,250,230,0)');
      shg.addColorStop(.5, 'rgba(255,250,230,.055)');
      shg.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.fillStyle = shg;
      ctx.fillRect(-70, -120, 160, H * 1.7);
      ctx.restore();
    }

    // ---- screen-space: drifting fog bands ----
    ctx.fillStyle = pal.mist;
    for (let i = 0; i < 2; i++) {
      const fy = H * (.32 + i * .38) + Math.sin(t * .2 + i * 2) * 20;
      const fx = ((t * (14 + i * 8)) % (W + 600)) - 300;
      const fgr = ctx.createRadialGradient(fx, fy, 10, fx, fy, 340);
      fgr.addColorStop(0, pal.mist); fgr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fgr;
      ctx.beginPath(); ctx.ellipse(fx, fy, 340, 90, 0, 0, U.TAU); ctx.fill();
    }

    Art.vignette(ctx, W, H);
    this.drawHUD(ctx, W, H);
    if (G.dialog) this.drawDialog(ctx, W, H);
    if (G.announce) this.drawAnnounce(ctx, W, H);

    // fade
    if (G.fade > 0) {
      ctx.fillStyle = `rgba(4,10,16,${G.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  /* ================= HUD ================= */
  drawHUD(ctx, W, H) {
    const small = W < 760;
    const cw = small ? 148 : 195, ch = small ? 44 : 56;
    const joku = this.byChar('joku'), jolie = this.byChar('jolie');
    this.drawCard(ctx, 10, 8, cw, ch, 'joku', joku, small);
    this.drawCard(ctx, W - cw - 10, 8, cw, ch, 'jolie', jolie, small);

    // center: level name + progress
    const L = G.level;
    const pw = Math.min(300, W - 2 * cw - 60);
    const px = W / 2 - pw / 2, py = small ? 10 : 14;
    ctx.textAlign = 'center';
    ctx.font = `600 ${small ? 12 : 14}px Fredoka, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6;
    ctx.fillText(L.name, W / 2, py + 10);
    ctx.shadowBlur = 0;

    if (L.boss) {
      // boss hp bar
      const b = L.boss;
      if (G.bossActive || b.dying > 0) {
        const bw = Math.min(420, W * .44);
        ctx.fillStyle = 'rgba(10,6,20,.65)';
        ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, py + 18, bw, 12, 6); ctx.fill();
        const frac = Math.max(0, b.hp / b.maxHp);
        const bg = ctx.createLinearGradient(W / 2 - bw / 2, 0, W / 2 + bw / 2, 0);
        bg.addColorStop(0, '#a03aff'); bg.addColorStop(1, '#ff3a6e');
        ctx.fillStyle = bg;
        if (frac > 0) { ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2 + 1.5, py + 19.5, (bw - 3) * frac, 9, 4.5); ctx.fill(); }
        ctx.font = `600 ${small ? 10 : 11}px Fredoka, sans-serif`;
        ctx.fillStyle = '#e0c8ff';
        ctx.fillText('💜 the Gloomheart', W / 2, py + 42);
      }
    } else if (L.gateX) {
      // progress track with waypoints (like the reference)
      const prog = U.clamp(Math.max(G.me.x, G.mate.x) / L.gateX, 0, 1);
      ctx.fillStyle = 'rgba(8,22,32,.55)';
      ctx.beginPath(); ctx.roundRect(px, py + 17, pw, 8, 4); ctx.fill();
      const pg = ctx.createLinearGradient(px, 0, px + pw, 0);
      pg.addColorStop(0, '#5ec8ff'); pg.addColorStop(1, '#ff9fce');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.roundRect(px, py + 17, Math.max(8, pw * prog), 8, 4); ctx.fill();
      for (const fx of [0, .5, 1]) {
        const nx = px + pw * fx;
        ctx.fillStyle = prog >= fx - .01 ? '#bfeaff' : 'rgba(150,180,200,.5)';
        ctx.beginPath(); ctx.arc(nx, py + 21, 5, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(20,40,55,.9)';
        ctx.beginPath(); ctx.arc(nx, py + 21, 2.4, 0, U.TAU); ctx.fill();
      }
      Art.heart(ctx, px + pw * prog, py + 21, 7, '#ff86b8');
      ctx.font = `600 ${small ? 11 : 12}px Fredoka, sans-serif`;
      ctx.fillStyle = '#dff4ff';
      ctx.fillText(Math.round(prog * 100) + '%', px + pw + 24, py + 25);
    }

    // love meter
    const lw = small ? 120 : 170, lx = W / 2 - lw / 2, ly = py + (L.boss ? 48 : 32);
    const full = G.love >= 100;
    const pulse = full ? 1 + Math.sin(G.time * 8) * .12 : 1;
    ctx.save();
    ctx.translate(lx - 12, ly + 5);
    ctx.scale(pulse, pulse);
    Art.heart(ctx, 0, 0, 9, full ? '#ff5e9e' : '#b06a86');
    ctx.restore();
    ctx.fillStyle = 'rgba(30,12,24,.6)';
    ctx.beginPath(); ctx.roundRect(lx, ly, lw, 9, 4.5); ctx.fill();
    const lg = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    lg.addColorStop(0, '#ff86b8'); lg.addColorStop(1, '#ff4e8e');
    ctx.fillStyle = lg;
    const lfrac = G.love / 100;
    if (lfrac > 0.01) { ctx.beginPath(); ctx.roundRect(lx + 1, ly + 1, (lw - 2) * lfrac, 7, 3.5); ctx.fill(); }
    if (full) {
      ctx.font = `700 ${small ? 10 : 11}px Fredoka, sans-serif`;
      ctx.fillStyle = '#ffd7ec';
      ctx.fillText('💋 KISS READY — press ❤ together!', W / 2, ly + 24);
    }

    // offscreen partner arrow
    const s = this.scale * (1 + G.zoomK);
    const mateSx = (G.mate.x - G.cam.x) * s + W / 2;
    if (mateSx < -20 || mateSx > W + 20) {
      const ax = U.clamp(mateSx, 34, W - 34);
      const ay = U.clamp((G.mate.y - 40 - G.cam.y) * s + H / 2, 70, H - 90);
      const col = G.mate.char === 'joku' ? '#7fd8ff' : '#ffa9d8';
      ctx.save();
      ctx.translate(ax, ay);
      Art.heart(ctx, 0, 0, 11, col);
      ctx.fillStyle = col;
      const dir = mateSx < 0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(dir * 16, -5); ctx.lineTo(dir * 24, 0); ctx.lineTo(dir * 16, 5);
      ctx.fill();
      ctx.restore();
    }

    // downed overlay for me
    if (G.me.down) {
      ctx.fillStyle = 'rgba(60,10,25,.28)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.font = `700 ${small ? 20 : 26}px Fredoka, sans-serif`;
      ctx.fillStyle = '#ffd7e0';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 8;
      ctx.fillText('💔 You need a hug…', W / 2, H * .3);
      ctx.font = `600 ${small ? 13 : 15}px Fredoka, sans-serif`;
      ctx.fillText(`${Story.NAMES[G.mate.char]} can revive you — or respawn in ${Math.ceil(12 - G.me.downT)}s`, W / 2, H * .3 + 30);
      ctx.shadowBlur = 0;
    }
  },

  drawCard(ctx, x, y, w, h, who, p, small) {
    ctx.fillStyle = 'rgba(8,24,34,.55)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = who === 'joku' ? 'rgba(110,190,255,.5)' : 'rgba(255,150,200,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.stroke();
    const ps = h - 10;
    ctx.drawImage(Art.portrait(who), x + 5, y + 5, ps, ps);
    const bx = x + ps + 12, bw = w - ps - 22;
    ctx.textAlign = 'left';
    ctx.font = `700 ${small ? 11 : 13}px Fredoka, sans-serif`;
    ctx.fillStyle = who === 'joku' ? '#aadfff' : '#ffc4dc';
    ctx.fillText(Story.NAMES[who] + (p === G.me ? ' (you)' : ''), bx, y + (small ? 12 : 16));
    // HP
    const hpY = y + (small ? 17 : 22), barH = small ? 8 : 10;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.roundRect(bx, hpY, bw, barH, barH / 2); ctx.fill();
    const hf = U.clamp(p.hp / p.maxHp, 0, 1);
    const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    hg.addColorStop(0, '#ff7058'); hg.addColorStop(1, '#e03048');
    ctx.fillStyle = hg;
    if (hf > 0.01) { ctx.beginPath(); ctx.roundRect(bx + 1, hpY + 1, (bw - 2) * hf, barH - 2, (barH - 2) / 2); ctx.fill(); }
    // MP
    const mpY = hpY + barH + 3;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.roundRect(bx, mpY, bw * .8, barH - 2, (barH - 2) / 2); ctx.fill();
    const mf = U.clamp(p.mp / p.maxMp, 0, 1);
    const mg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    mg2.addColorStop(0, '#4fc8ff'); mg2.addColorStop(1, '#2a6ae0');
    ctx.fillStyle = mg2;
    if (mf > 0.01) { ctx.beginPath(); ctx.roundRect(bx + 1, mpY + 1, (bw * .8 - 2) * mf, barH - 4, (barH - 4) / 2); ctx.fill(); }
  },

  /* ================= dialog box ================= */
  drawDialog(ctx, W, H) {
    const d = G.dialog;
    const line = d.lines[d.i];
    if (!line) return;
    const [who, text] = line;
    const small = W < 760;
    const bw = Math.min(660, W - 20), bh = small ? 92 : 108;
    const bx = W / 2 - bw / 2, by = H - bh - (small ? 8 : 18) - (Input.touchMode ? 30 : 0);

    ctx.fillStyle = 'rgba(8,20,32,.88)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 18); ctx.fill();
    ctx.strokeStyle = Story.COLORS[who] + '88';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 18); ctx.stroke();

    const ps = small ? 56 : 68;
    ctx.drawImage(Art.portrait(who), bx + 10, by + (bh - ps) / 2, ps, ps);

    ctx.textAlign = 'left';
    ctx.font = `700 ${small ? 14 : 16}px Fredoka, sans-serif`;
    ctx.fillStyle = Story.COLORS[who];
    ctx.fillText(Story.NAMES[who], bx + ps + 24, by + (small ? 22 : 26));

    // typewriter text with word wrap
    const shown = text.slice(0, Math.floor(d.chars));
    ctx.font = `400 ${small ? 13 : 15}px Fredoka, sans-serif`;
    ctx.fillStyle = '#e8f4fc';
    const maxW = bw - ps - 46;
    let lineY = by + (small ? 42 : 50), cur = '';
    for (const word of shown.split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(cur, bx + ps + 24, lineY);
        lineY += small ? 17 : 20;
        cur = word;
      } else cur = test;
    }
    ctx.fillText(cur, bx + ps + 24, lineY);

    if (d.chars >= text.length) {
      ctx.globalAlpha = .6 + Math.sin(G.time * 5) * .4;
      ctx.font = `600 ${small ? 12 : 13}px Fredoka, sans-serif`;
      ctx.fillStyle = '#9fd8f0';
      ctx.textAlign = 'right';
      ctx.fillText(Input.touchMode ? 'tap ▸' : 'space ▸', bx + bw - 16, by + bh - 12);
      ctx.globalAlpha = 1;
    }
  },

  drawAnnounce(ctx, W, H) {
    const a = G.announce;
    const k = Math.min(1, a.t > 2.6 ? (3.2 - a.t) / .6 : (a.t < .6 ? a.t / .6 : 1));
    ctx.save();
    ctx.globalAlpha = U.clamp(k, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.min(46, W * .06)}px Fredoka, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14;
    const gr = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
    gr.addColorStop(0, '#7fd8ff'); gr.addColorStop(1, '#ffa9d8');
    ctx.fillStyle = gr;
    ctx.fillText(a.txt, W / 2, H * .3);
    ctx.font = `600 ${Math.min(19, W * .028)}px Fredoka, sans-serif`;
    ctx.fillStyle = '#e8f4fc';
    ctx.fillText(a.sub, W / 2, H * .3 + 34);
    ctx.restore();
  },

  /* ================= menu demo scene ================= */
  updateMenu(dt) {
    G.time += dt;
    if (!G.demo) {
      const level = World.gen(0);
      level.bg = Art.makeBackground('forest', 101);
      const j = Ent.makePlayer('joku'), l = Ent.makePlayer('jolie');
      j.x = 200; l.x = 250;
      j.y = l.y = World.topAt(level, 260) || 520;
      j.holding = l.holding = true;
      const pets = [Ent.makePet('dog', j), Ent.makePet('panda', l)];
      G.demo = { level, j, l, pets, camX: 260 };
    }
    const D = G.demo;
    for (const p of [D.j, D.l]) {
      p.vx = 120; p.dir = 1; p.onGround = true;
      p.x += 120 * dt;
      const top = World.topAt(D.level, p.x + 40);
      if (top !== null) p.y += (top - p.y) * Math.min(1, 8 * dt);
      p.animT += dt * .45;
    }
    if (D.j.x > 4300) { D.j.x = 200; D.l.x = 250; for (const pet of D.pets) { pet.x = pet.owner.x - 40; pet.y = pet.owner.y; } }
    D.camX = D.j.x + 60;
    for (const pet of D.pets) {
      const o = pet.owner;
      pet.vx = 120; pet.animT += dt * .45; pet.dir = 1;
      pet.x += (o.x - 46 - pet.x) * Math.min(1, 4 * dt);
      const t2 = World.topAt(D.level, pet.x);
      if (t2 !== null) pet.y += (t2 - pet.y) * Math.min(1, 8 * dt);
    }
    if (Math.random() < dt * 1.2) {
      Ptc.add({ kind: 'heart', x: (D.j.x + D.l.x) / 2, y: D.j.y - 70, vx: (Math.random() - .5) * 30, vy: -40, r: 4 + Math.random() * 4, life: 1.6, color: '#ff9fce' });
    }
    if (Math.random() < dt * 2) {
      Ptc.add({ kind: 'petal', x: D.camX + (Math.random() - .5) * 900, y: 60, vx: 20, vy: 50, r: 4, life: 7, spin: 1 });
    }
    Ptc.update(dt);
  },

  renderMenu() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const W = this.cssW, H = this.cssH;
    const D = G.demo;
    if (!D) { ctx.fillStyle = '#0a222c'; ctx.fillRect(0, 0, W, H); return; }
    const pal = D.level.bg.pal;
    const s = this.scale;
    ctx.fillStyle = pal.skyB; ctx.fillRect(0, 0, W, H);
    for (const layer of D.level.bg.layers) {
      const drawW = 1920 * (H / 1080);
      let off = (-D.camX * layer.speed * s) % drawW;
      if (off > 0) off -= drawW;
      for (let x = off; x < W; x += drawW) ctx.drawImage(layer.cv, x, 0, drawW + 1, H);
    }
    ctx.save();
    ctx.translate(W / 2, H / 2 + 40);
    ctx.scale(s, s);
    ctx.translate(-D.camX, -(D.j.y - 100));
    const viewL = D.camX - W / s, viewR = D.camX + W / s;
    for (const pl of D.level.plats) {
      if (pl.x + pl.w < viewL || pl.x > viewR) continue;
      Art.drawPlatform(ctx, pl, pal, G.time);
    }
    for (const it of D.level.items) {
      if (it.taken || it.x < viewL || it.x > viewR) continue;
      Art.drawItem(ctx, it, G.time);
    }
    for (const pet of D.pets) (pet.kind === 'dog' ? Art.drawDog : Art.drawPanda).call(Art, ctx, pet, G.time);
    Art.drawJoku(ctx, D.j, G.time);
    Art.drawJolie(ctx, D.l, G.time);
    Ptc.draw(ctx);
    ctx.restore();
    Art.vignette(ctx, W, H);
  }
};
