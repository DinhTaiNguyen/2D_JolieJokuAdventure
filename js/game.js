'use strict';
/* ============ game core: loop, co-op logic, love mechanics, rendering ============ */
const G = {
  state: 'menu', mode: 'solo', difficulty: 'normal',
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
  loadout: { joku: null, jolie: null },
  paused: false, bossActive: false, netLost: false, ended: false, nextLevelT: 0, chapterVictory: null,
  netT: { p: 0, w: 0, seq: 0, wseq: 0 }, mateNet: null, mateBuf: [], lastMateSeq: 0, lastWorldSeq: 0, _dropId: 0, _comboToastT: 0,
  demo: null, _lockHintT: 0, _uiSyncT: 0, _trialShrineT: 0, _freshOnlineStart: false,
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
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
    const lowMemory = !!(navigator.deviceMemory && navigator.deviceMemory <= 4);
    const cap = lowMemory ? 1.25 : (coarse ? 1.5 : 2);
    this.dpr = Math.min(devicePixelRatio || 1, cap);
    this.cssW = innerWidth; this.cssH = innerHeight;
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    this.scale = this.cssH / 500;
  },

  /* ================= game lifecycle ================= */
  startGame(mode, startLevel = 0, opt = {}) {
    G.mode = mode;
    G.loadout = opt.loadout ? Object.assign({ joku: null, jolie: null }, opt.loadout) : { joku: null, jolie: null };
    const myChar = (mode === 'guest') ? 'jolie' : 'joku';
    const otherChar = myChar === 'joku' ? 'jolie' : 'joku';
    G.me = Ent.makePlayer(myChar);
    G.mate = Ent.makePlayer(otherChar);
    G.mate.remote = (mode !== 'solo');
    G.mate.bot = (mode === 'solo');
    const joku = myChar === 'joku' ? G.me : G.mate;
    const jolie = myChar === 'jolie' ? G.me : G.mate;
    G.pets = [Ent.makePet('dog', joku), Ent.makePet('panda', jolie)];
    this.applyLoadout();
    G.love = 0; G.handHold = false; G.kissCin = 0; G.ended = false; G.netLost = false;
    this.resetNetSmoothing();
    G.stats = { orbs: 0, flowers: 0, hearts: 0, hugs: 0, kisses: 0, kills: 0, startT: performance.now() / 1000 };
    G.state = 'play'; G.paused = false; G.demo = null;
    this.loadLevel(startLevel);
    if (opt.skipStory) {
      G.cut = null; G.dialog = null; G.fade = 0; G.fadeDir = -1;
    }
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
    if (typeof ASSETS !== 'undefined' && ASSETS.prefetchChapter) {
      ASSETS.prefetchChapter(n, true);
      if (n + 1 < World.LEVELS.length) ASSETS.prefetchChapter(n + 1, false);
    }
    G.level = World.gen(n, G.difficulty);
    this.applyDifficulty(G.level);
    G.level.bg = Art.makeBackground(G.level.theme, G.level.cfg.seed);
    G.projs = []; G.auras = []; G.cut = null; G.dialog = null;
    G.bossActive = false; G.nextLevelT = 0; G.chapterVictory = null; G.activeMiniBoss = null; G._trialShrineT = 0;
    Ptc.list.length = 0;

    const joku = this.byChar('joku'), jolie = this.byChar('jolie');
    joku.x = G.level.startX; jolie.x = G.level.startX + 46;
    const gy = World.topAt(G.level, G.level.startX) || 520;
    joku.y = jolie.y = gy;
    for (const p of [joku, jolie]) {
      p.vx = p.vy = 0; p.down = false; p.pose = null; p.hp = p.maxHp; p.mp = p.maxMp;
      p.invuln = 2; p._fell = false; p.safeX = p.x; p.safeY = p.y;
    }
    this.applyLoadout();
    for (const pet of G.pets) { pet.x = pet.owner.x - 40; pet.y = pet.owner.y; }
    G.checkpoint = { x: G.level.checkpoints[0].x, y: gy };
    G._lockHintT = 0;
    G.handHold = false;
    G.cam.x = joku.x; G.cam.y = gy - 120;

    // ambient motes
    G.fireflies = [];
    for (let i = 0; i < 26; i++) {
      G.fireflies.push({ x: Math.random() * G.level.width, y: 100 + Math.random() * 500, p: Math.random() * 9, s: .5 + Math.random() });
    }

    G.fade = 1; G.fadeDir = -1;
    G.announce = { txt: Story.levelName(n), sub: Story.t('chapterSub', { n: n + 1, total: World.LEVELS.length }), t: 3.2 };
    SND.startMusic(n);

    // level-start scenes run locally on BOTH devices (deterministic), no network needed
    if (n === 0) this.cutStart('intro', true);
    else this.cutStart('lvl', true);
    if (Main.syncSettings) Main.syncSettings();
    if (Main.syncWeaponUI) Main.syncWeaponUI();
  },

  nextLevel() {
    if (G.mode === 'guest') return; // guest waits for the host's 'lvl' message
    const n = G.levelIndex + 1;
    if (n >= World.LEVELS.length) return;
    this.emit('lvl', { n });
    this.loadLevel(n);
  },

  setDifficulty(diff) {
    if (!this.DIFF[diff]) diff = 'normal';
    G.difficulty = diff;
    if (G.level) this.applyDifficulty(G.level);
    if (Main.syncSettings) Main.syncSettings();
    Main.toast(Story.t('difficultySet', { diff: Story.t(diff) }));
  },

  gotoChapter(n) {
    n = U.clamp(n | 0, 0, World.LEVELS.length - 1);
    if (G.mode === 'guest') { Main.toast(Story.t('hostOnlyChapter')); return; }
    if (G.state !== 'play') { this.startGame(G.mode || 'solo', n); return; }
    this.hidePauseIfOpen();
    this.emit('lvl', { n });
    this.loadLevel(n);
  },

  hidePauseIfOpen() {
    if (G.paused) Main.hidePause();
  },

  DIFF: {
    easy: { hp: .75, dmg: .75 },
    normal: { hp: 1, dmg: 1 },
    hard: { hp: 1.35, dmg: 1.25 }
  },

  applyDifficulty(level) {
    const diff = G.difficulty || 'normal';
    const mod = this.DIFF[diff] || this.DIFF.normal;
    const old = this.DIFF[level._difficultyApplied || 'normal'] || this.DIFF.normal;
    const hpScale = mod.hp / old.hp;
    const dmgScale = mod.dmg / old.dmg;
    for (const e of level.foes) this.scaleThreat(e, hpScale, dmgScale);
    if (level.boss) {
      this.scaleThreat(level.boss, hpScale, dmgScale);
    }
    level._difficultyApplied = diff;
  },

  scaleThreat(e, hpScale, dmgScale) {
    const hpFrac = e.maxHp > 0 ? e.hp / e.maxHp : 1;
    e.maxHp = Math.max(1, Math.round(e.maxHp * hpScale));
    e.hp = e.dead ? 0 : Math.max(0, Math.min(e.maxHp, Math.round(e.maxHp * hpFrac)));
    e.dmg = Math.max(1, Math.round(e.dmg * dmgScale));
  },

  byChar(c) { return G.me.char === c ? G.me : G.mate; },
  applyLoadout() {
    if (!G.me || !G.mate) return;
    for (const c of ['joku', 'jolie']) {
      const p = this.byChar(c);
      p.weapon = G.loadout && G.loadout[c] && Weapons[G.loadout[c]] ? G.loadout[c] : null;
      p.weaponCd = 0;
    }
  },
  setWeapon(char, weapon) {
    const p = this.byChar(char);
    const next = weapon && Weapons[weapon] ? weapon : null;
    p.weapon = next;
    p.weaponCd = 0;
    G.loadout[char] = next;
    if (char === G.me.char && Main.syncWeaponUI) Main.syncWeaponUI();
  },
  currentLoadout() {
    if (!G.me || !G.mate) return Object.assign({ joku: null, jolie: null }, G.loadout || {});
    return {
      joku: this.byChar('joku')?.weapon || G.loadout.joku || null,
      jolie: this.byChar('jolie')?.weapon || G.loadout.jolie || null
    };
  },
  enemiesAll() {
    const b = G.level && G.level.boss;
    return (b && !b.dead && (G.bossActive || b.dying > 0)) ? G.level.foes.concat([b]) : (G.level ? G.level.foes : []);
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
    const meInp = (G.paused || G.kissCin > 0 || G.chapterVictory) ? { ax: 0 } : Ent.localInput();
    this.captureTrialInput(meInp);
    Ent.updatePlayer(G.me, dt, meInp);

    // ----- partner: bot or remote -----
    if (G.mate.bot) {
      Ent.updatePlayer(G.mate, dt, Ent.botInput(G.mate, dt));
    } else {
      this.updateRemoteMate(dt);
    }

    // ----- heart button: love actions -----
    if (G.kissCin <= 0 && !G.cut && !G.dialog && !G.paused) this.updateLoveActions(dt);
    if (G.kissCin <= 0 && !G.cut && !G.dialog && !G.paused && Input.take('drop')) this.dropMyWeapon();

    // ----- pets, enemies, projectiles, auras -----
    for (const pet of G.pets) Ent.updatePet(pet, dt);
    if (G.mode !== 'guest' && !G.cut && G.kissCin <= 0) {
      Ent.updateEnemies(dt);
      if (G.bossActive) Ent.updateBoss(dt);
    } else if (G.mode === 'guest') {
      this.lerpGuestEnemies(dt);
    }
    Ent.updateProjectiles(dt);
    this.updateItems(dt);
    this.updateAuras(dt);
    if (!G.cut && !G.dialog && G.kissCin <= 0 && !G.chapterVictory) this.updateLoveTrials(dt);
    if (!G.cut && G.kissCin <= 0) this.enforceProgressLocks(dt);
    if (G.mode !== 'guest' && !G.cut && !G.dialog && G.kissCin <= 0) this.updateDateJourney(dt);

    // ----- touch damage from enemies -----
    if (!G.me.down && G.me.invuln <= 0 && G.kissCin <= 0 && !G.cut) {
      for (const e of this.enemiesAll()) {
        if (e.dead || e.dying > 0) continue;
        const r = e.type === 'boss' ? 78 : (e.bossTier ? 46 : 26);
        if (Math.abs(e.x - G.me.x) < r && Math.abs((e.y - 14) - (G.me.y - 26)) < r + 14) {
          this.damageMe(e.dmg, e.x);
          break;
        }
      }
    }
    if (G.kissCin <= 0 && !G.cut) this.updatePetDamage(dt);

    // ----- pickups -----
    for (const it of L.items) {
      if (it.taken) continue;
      for (const p of [G.me, G.mate]) {
        if (p.remote || p.down) continue;
        if (it.kind === 'weapon') continue;
        if (Math.abs(it.x - p.x) < 30 && Math.abs(it.y - (p.y - 26)) < 42) {
          this.pickup(it, p === G.me ? G.me.char : G.mate.char, false);
          break;
        }
      }
    }

    // ----- downed logic -----
    if (G.me.down) {
      G.me.downT += dt;
      if (G.me.downT > 20) this.respawnMe(.45);
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
    const trialCinematic = (L.loveTrials || []).some(tr => !tr.done && tr.stage >= 2 && tr.stage <= 4);
    if (G._trialShrineT > 0 && G.mode !== 'guest' && !G.cut && !G.dialog) {
      G._trialShrineT -= dt;
      if (G._trialShrineT <= 0 && !L.shrineDone) this.cutStart('shrine');
    }
    if (G.mode !== 'guest' && !G.cut && G.kissCin <= 0 && !trialCinematic && G._trialShrineT <= 0) {
      if (!L.shrineDone && L.shrineX && (Math.abs(G.me.x - L.shrineX) < 110 || Math.abs(G.mate.x - L.shrineX) < 110)) {
        this.cutStart('shrine');
      }
      if (L.gateX && !L.gateOpen && Math.abs(G.me.x - L.gateX) < 120 && Math.abs(G.mate.x - L.gateX) < 120) {
        this.cutStart('gate');
      }
    }

    // ----- camera -----
    this.updateCamera(dt);
    this.updateBossCues(dt);

    // ----- ambient & fx -----
    Ptc.update(dt);
    this.updateAmbient(dt);
    G.hugCd -= dt;
    G.shakeT -= dt;
    if (G._lockHintT > 0) G._lockHintT -= dt;
    G._uiSyncT -= dt;
    if (G._uiSyncT <= 0) { G._uiSyncT = .12; if (Main.syncWeaponUI) Main.syncWeaponUI(); }
    if (G.announce) { G.announce.t -= dt; if (G.announce.t <= 0) G.announce = null; }
    if (G._comboToastT > 0) G._comboToastT -= dt;
    if (G.chapterVictory) this.updateChapterVictory(dt);
    if (G.nextLevelT > 0 && G.mode !== 'guest') {
      G.nextLevelT -= dt;
      if (G.nextLevelT <= 0) this.nextLevel();
    }

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
      if (G.netT.p <= 0) { G.netT.p = .033; this.sendState(); }
      if (G.mode === 'host') {
        G.netT.w -= dt;
        if (G.netT.w <= 0) { G.netT.w = .08; this.sendWorld(); }
      }
    }
  },

  /* ================= remote partner smoothing ================= */
  updateRemoteMate(dt) {
    const m = G.mate, s = this.sampleMateState();
    if (!s) return;
    if (!G.cut && G.kissCin <= 0) {
      const k = Math.min(1, 18 * dt);
      m.x += (s.x - m.x) * k;
      m.y += (s.y - m.y) * k;
      if (Math.abs(s.x - m.x) > 200 || Math.abs(s.y - m.y) > 260) { m.x = s.x; m.y = s.y; }
      m.vx = s.vx; m.vy = s.vy; m.dir = s.dir;
    }
    m.hp = s.hp; m.mp = s.mp;
    m.weapon = s.wp || null;
    G.loadout[m.char] = m.weapon;
    m.glide = s.gl; m.holding = s.hh; m.heartHeld = !!s.he;
    m.onGround = s.og;
    if (s.dn && !m.down) { m.down = true; m.pose = 'down'; }
    if (!s.dn && m.down) { m.down = false; m.pose = null; }
    if (s.wg) m.wing = 1;
    m.wing = Math.max(0, m.wing - dt * 1.6);
    m.hurtT = s.ht ? .2 : 0;
    m.cheerT = s.ch ? .2 : 0;
    if (s.at) { if (m.atkT > .3) m.atkT = 0; } // mirror attack pose
    m.atkT += dt;
    m.animT += dt * Math.min(1.4, Math.abs(m.vx) / 300 + .0001);
    m.invuln = 0; m.squash = 0;
  },

  lerpGuestEnemies(dt) {
    for (const e of this.enemiesAll()) {
      if (e.dead) continue;
      e.t += dt; e.flash -= dt; e.hurtShow -= dt;
      if (e.dying > 0) {
        e.dying += dt;
        if (e.type === 'boss' && e.dying > 1.35) { e.dead = true; e.dying = 0; G.bossActive = false; }
        continue;
      }
      if (e.tx != null) {
        const k = Math.min(1, 10 * dt);
        e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k;
        if (Math.abs(e.tx - e.x) > 300) { e.x = e.tx; e.y = e.ty; }
      }
      if (e.type === 'slime') e.hopY = Math.max(0, (e.plat ? e.plat.y : e.y) - e.y);
    }
  },

  currentBossThreat() {
    if (!G.level) return null;
    const b = G.level.boss;
    if (b && !b.dead && (G.bossActive || b.dying > 0)) return b;
    let best = null, bd = 1e9;
    for (const e of G.level.foes) {
      if (!e.bossTier || e.dead || e.dying > 0) continue;
      const d = Math.min(Math.abs(e.x - G.me.x), Math.abs(e.x - G.mate.x));
      if (d < bd) { bd = d; best = e; }
    }
    return best && bd < 720 ? best : null;
  },

  updateBossCues(dt) {
    const threat = this.currentBossThreat();
    if (threat && threat.bossTier) {
      if (!threat.announced) {
        threat.announced = true;
        G.announce = { txt: threat.bossName || Story.t('strongBoss'), sub: Story.t('readyTogether'), t: 2.8 };
        SND.sfx('boss');
      }
      if (G.activeMiniBoss !== threat.id) {
        G.activeMiniBoss = threat.id;
        SND.startMusic(G.levelIndex, true);
      }
    }
    if (!threat && G.activeMiniBoss && !G.bossActive) {
      G.activeMiniBoss = null;
      SND.startMusic(G.levelIndex, false);
    }
  },

  trialPads(tr) {
    const r = 64;
    const leftX = tr.x - 58, rightX = tr.x + 58;
    const me = G.me, mate = G.mate;
    const meL = me && U.dist(me.x, me.y, leftX, tr.y) < r;
    const meR = me && U.dist(me.x, me.y, rightX, tr.y) < r;
    const mateL = mate && U.dist(mate.x, mate.y, leftX, tr.y) < r;
    const mateR = mate && U.dist(mate.x, mate.y, rightX, tr.y) < r;
    return {
      leftX, rightX,
      leftOn: meL || mateL,
      rightOn: meR || mateR,
      split: (meL && mateR) || (meR && mateL)
    };
  },

  assistBotTrial(tr, dt) {
    if (!G.mate || !G.mate.bot || G.mate.down || G.cut || G.dialog) return;
    const pads = this.trialPads(tr);
    if (U.dist(G.me.x, G.me.y, tr.x, tr.y) > 210) return;
    const targetX = Math.abs(G.me.x - pads.leftX) < Math.abs(G.me.x - pads.rightX) ? pads.rightX : pads.leftX;
    G.mate.x += (targetX - G.mate.x) * Math.min(1, 5 * dt);
    G.mate.y += (tr.y - G.mate.y) * Math.min(1, 8 * dt);
    G.mate.vx *= .4;
    G.mate.dir = G.me.x > G.mate.x ? 1 : -1;
  },

  activeLoveTrial() {
    return G.level && (G.level.loveTrials || []).find(tr => !tr.done);
  },

  trialRoleBit(char) {
    return char === 'joku' ? 1 : char === 'jolie' ? 2 : 0;
  },

  captureTrialInput(inp) {
    if (!inp || !G.level || G.cut || G.dialog || G.paused) return;
    const tr = this.activeLoveTrial();
    if (!tr || tr.stage < 2 || tr.stage > 4) return;
    if (tr.stage === 3 && inp.special) this.activateTrialSkill(tr, G.me.char, false);
    // Kiss, power invocation, and shared traversal are deliberate co-op moments.
    // Consume combat movement so the normal character skills cannot fire underneath them.
    inp.ax = 0;
    inp.jump = false;
    inp.jumpHeld = false;
    inp.attack = false;
    inp.special = false;
    inp.weaponSkill = false;
  },

  trialSkillVisual(tr, char) {
    const p = this.byChar(char);
    if (!p) return;
    const bit = this.trialRoleBit(char);
    const color = char === 'joku' ? '#72ddff' : '#ff9fce';
    p.cheerT = Math.max(p.cheerT || 0, 1.1);
    p.trialPowerT = 1.4;
    SND.sfx(char === 'joku' ? 'powerWater' : 'powerFlower');
    Ptc.add({ kind: 'ring', x: p.x, y: p.y - 38, vx: 0, vy: 0, r: 108, life: .75, color: color + 'dd' });
    Ptc.burst(char === 'joku' ? 'dot' : 'petal', p.x, p.y - 42, 15, { color, sp: 155, r: 6, life: 1.1 });
    if (typeof ASSETS !== 'undefined' && ASSETS.has && ASSETS.has('fx_rings')) {
      ASSETS.playFB('fx_rings', p.x, p.y - 35, 155, .55, char === 'joku' ? 1 : 5);
    }
    const powers = Story.trialPowers(G.levelIndex);
    const own = powers[char];
    if (char === G.me.char && own) {
      G.announce = { txt: own.name, sub: Story.t('trialWaitingPower', { power: own.name }), t: 3.1 };
    } else if (bit && own && G._lockHintT <= 0) {
      G.announce = { txt: own.name, sub: own.effect, t: 2.6 };
      G._lockHintT = 1.8;
    }
  },

  activateTrialSkill(tr, char, fromNet) {
    if (!tr || tr.done || tr.stage !== 3) return false;
    const bit = this.trialRoleBit(char);
    if (!bit || (tr.skillMask & bit)) return false;
    tr.skillMask = (tr.skillMask || 0) | bit;
    this.trialSkillVisual(tr, char);
    if (!fromNet && G.mode === 'guest') this.emit('trialSkill', { id: tr.id, char });
    return true;
  },

  announceTrialPower(tr) {
    if (!tr || tr._powerPrompted) return;
    tr._powerPrompted = true;
    const powers = Story.trialPowers(G.levelIndex);
    const own = powers[G.me.char];
    if (!own) return;
    G.announce = { txt: own.name, sub: Story.t('trialUseSpecial', { power: own.name }), t: 4.1 };
    SND.sfx('gate');
  },

  startTrialTraversal(tr, fromNet = false) {
    if (!tr || tr.done) return;
    if (tr.stage === 4 && tr._travelPrompted) return;
    tr.stage = 4;
    tr.travel = Math.max(0, tr.travel || 0);
    tr.charge = 1;
    tr._travelPrompted = true;
    const powers = Story.trialPowers(G.levelIndex);
    G.announce = { txt: Story.t('trialBothPowers'), sub: powers.travel, t: 4.4 };
    SND.sfx('trialRide');
    this.shake(6);
    for (const p of [this.byChar('joku'), this.byChar('jolie')]) {
      if (!p) continue;
      p.trialRide = true;
      p.invuln = Math.max(p.invuln, (tr.travelDur || 5) + 1);
      p.vx = p.vy = 0;
    }
    if (!fromNet && G.mode === 'host') this.emit('trialRide', { id: tr.id });
  },

  trialRoutePoint(tr, amount) {
    const k = U.easeInOut(U.clamp(amount || 0, 0, 1));
    const sx = tr.routeStartX != null ? tr.routeStartX : tr.x + 34;
    const ex = tr.endX != null ? tr.endX : tr.x + 900;
    const sy = tr.y;
    const ey = tr.endY != null ? tr.endY : tr.y;
    const arc = tr.travelArc || 150;
    let lift = Math.sin(k * Math.PI) * arc;
    if (tr.kind === 'flowerLift') lift += Math.sin(Math.min(1, k * 1.7) * Math.PI) * 55;
    if (tr.kind === 'oceanPhoenix') lift += Math.sin(k * Math.PI * 3) * 18;
    if (tr.kind === 'starMirror') lift += Math.sin(k * Math.PI * 4) * 24;
    if (tr.kind === 'shadowLantern') lift += Math.sin(k * Math.PI * 2) * 12;
    return { x: U.lerp(sx, ex, k), y: U.lerp(sy, ey, k) - lift, k };
  },

  applyTrialTraversal(tr) {
    const pt = this.trialRoutePoint(tr, tr.travel || 0);
    tr.rideX = pt.x;
    tr.rideY = pt.y;
    const joku = this.byChar('joku'), jolie = this.byChar('jolie');
    const spread = tr.kind === 'oceanPhoenix' ? 24 : 28;
    for (const [p, off] of [[joku, -spread], [jolie, spread]]) {
      if (!p) continue;
      p.x = pt.x + off;
      p.y = pt.y - (p.char === 'jolie' ? 2 : 0);
      p.vx = (tr.endX - (tr.routeStartX || tr.x)) / Math.max(1, tr.travelDur || 5);
      p.vy = 0;
      p.onGround = false;
      p.trialRide = true;
      p.invuln = Math.max(p.invuln, .35);
      p.dir = 1;
      p.safeX = p.x;
      p.safeY = p.y;
    }
    for (const pet of G.pets || []) {
      const side = pet.kind === 'dog' ? -58 : 58;
      pet.x = pt.x + side;
      pet.y = pt.y + 10;
      pet.vx = 0;
      pet.dir = 1;
    }
  },

  trialCoopPulse(tr, dt) {
    const colors = {
      forestBridge: '#9be27d', oceanPhoenix: '#56d6ff', flowerLift: '#ff9fce',
      shadowLantern: '#d9b6ff', emberRain: '#ffb36b', starMirror: '#fff3a8', giongBridge: '#e8c65f'
    };
    const color = colors[tr.kind] || '#ff9fce';
    const x = tr.rideX != null ? tr.rideX : tr.x;
    const y = tr.rideY != null ? tr.rideY : tr.y;
    if (Math.random() < dt * 12) {
      const side = Math.random() < .5 ? -1 : 1;
      Ptc.add({ kind: tr.kind === 'flowerLift' ? 'petal' : 'star', x: x + side * 58 + (Math.random() - .5) * 20, y: y - 28 - Math.random() * 48, vx: (Math.random() - .5) * 35, vy: -50, r: 4 + Math.random() * 3, life: 1, color });
    }
  },

  updateLoveTrials(dt) {
    const trials = (G.level && G.level.loveTrials) || [];
    const tr = trials.find(x => !x.done);
    if (!tr) return;
    const me = G.me, mate = G.mate;
    if (G.mode !== 'guest') this.assistBotTrial(tr, dt);
    const pads = this.trialPads(tr);
    tr.padL = pads.leftOn;
    tr.padR = pads.rightOn;
    const nearMe = U.dist(me.x, me.y, tr.x, tr.y) < 135;
    const nearMate = U.dist(mate.x, mate.y, tr.x, tr.y) < 135;
    const together = nearMe && nearMate && !me.down && !mate.down;
    const linked = (G.handHold || me.holding || mate.holding || mate.heartHeld || (Input.held('heart') && U.dist(me.x, me.y, mate.x, mate.y) < 170)) && !me.down && !mate.down;
    const ready = tr.stage === 1 ? (together && linked) : (pads.split && linked);
    if (tr.stage >= 1 && tr.stage <= 4) {
      me.invuln = Math.max(me.invuln, .35);
      mate.invuln = Math.max(mate.invuln, .35);
    }

    if (tr.stage === 2) {
      tr.kissT = (tr.kissT || 1.05) - dt;
      me.pose = mate.pose = 'kiss'; me.poseT = mate.poseT = .25;
      me.dir = tr.x >= me.x ? 1 : -1; mate.dir = -me.dir;
      if (Math.random() < dt * 16) Ptc.add({ kind: 'heart', x: tr.x + (Math.random() - .5) * 55, y: tr.y - 70 - Math.random() * 25, vx: (Math.random() - .5) * 45, vy: -65, r: 5, life: 1.1, color: '#ff9fce' });
      if (tr.kissT <= 0 && G.mode !== 'guest') {
        tr.stage = 3;
        tr.charge = 0;
        tr.skillMask = 0;
        tr.powerT = 0;
        tr._powerPrompted = false;
        G.stats.kisses++;
        this.announceTrialPower(tr);
      }
      return;
    }

    if (tr.stage === 3) {
      tr.powerT = (tr.powerT || 0) + dt;
      this.announceTrialPower(tr);
      me.vx = mate.vx = 0;
      if (G.mode === 'solo' && tr.powerT > .75) this.activateTrialSkill(tr, G.mate.char, true);
      if ((tr.skillMask || 0) === 3 && G.mode !== 'guest') this.startTrialTraversal(tr, false);
      return;
    }

    if (tr.stage === 4) {
      const dur = Math.max(2, tr.travelDur || 5);
      tr.travel = U.clamp((tr.travel || 0) + dt / dur, 0, 1);
      this.applyTrialTraversal(tr);
      this.trialCoopPulse(tr, dt * 1.6);
      if (G.mode !== 'guest' && tr.travel >= 1) this.finishLoveTrial(tr, false);
      return;
    }

    if (G.mode === 'guest') {
      if ((nearMe || pads.leftOn || pads.rightOn) && G._lockHintT <= 0) {
        const info = Story.trialInfo(G.levelIndex, tr.id);
        G.announce = { txt: info.title, sub: info.hint, t: 2.4 };
        G._lockHintT = 3;
      }
      return;
    }

    if (ready) {
      tr.charge = U.clamp((tr.charge || 0) + dt / (tr.stage === 1 ? 1.35 : 1.25), 0, 1);
      if (!tr.started) {
        tr.started = true;
        const info = Story.trialInfo(G.levelIndex, tr.id);
        SND.sfx('heart');
        G.announce = { txt: info.title, sub: tr.stage === 1 ? Story.t('trialKissPrompt') : info.hint, t: 2.8 };
      }
      this.trialCoopPulse(tr, dt);
      if (Math.random() < dt * 12) {
        Ptc.add({ kind: 'heart', x: tr.x + (Math.random() - .5) * 90, y: tr.y - 24 - Math.random() * 70, vx: (Math.random() - .5) * 35, vy: -45, r: 4 + Math.random() * 4, life: 1, color: '#ff9fce' });
      }
      if (tr.charge >= 1 && tr.stage !== 1) {
        tr.stage = 1; tr.charge = 0; tr.started = false;
        me.pose = mate.pose = 'hug'; me.poseT = mate.poseT = 1.25;
        this.hugHearts(tr.x);
        SND.sfx('heal');
        G.announce = { txt: Story.t('trialHugAwake'), sub: Story.t('trialHugSub'), t: 2.7 };
      } else if (tr.charge >= 1) {
        tr.stage = 2; tr.charge = 0; tr.kissT = 1.05;
        SND.sfx('kiss');
        Ptc.add({ kind: 'ring', x: tr.x, y: tr.y - 45, vx: 0, vy: 0, r: 110, life: .65, color: 'rgba(255,170,210,.85)' });
      }
    } else {
      tr.started = false;
      tr.charge = Math.max(0, (tr.charge || 0) - dt * .35);
      if ((nearMe || nearMate || pads.leftOn || pads.rightOn) && !G._lockHintT) {
        const info = Story.trialInfo(G.levelIndex, tr.id);
        G.announce = { txt: info.title, sub: info.hint, t: 2.4 };
        G._lockHintT = 3;
      }
    }
  },

  finishLoveTrial(tr, fromNet) {
    if (!tr) return;
    if (tr._celebrated) return;
    tr.done = true;
    tr.charge = 1;
    tr.stage = 5;
    tr.travel = 1;
    tr._celebrated = true;
    const rewardX = tr.endX != null ? tr.endX : tr.x;
    const rewardY = tr.endY != null ? tr.endY : tr.y;
    const joku = this.byChar('joku'), jolie = this.byChar('jolie');
    for (const [p, off] of [[joku, -28], [jolie, 28]]) {
      if (!p) continue;
      p.x = rewardX + off;
      p.y = rewardY;
      p.vx = p.vy = 0;
      p.onGround = true;
      p.trialRide = false;
      p.pose = null;
      p.safeX = p.x;
      p.safeY = p.y;
    }
    for (const pet of G.pets || []) {
      pet.x = rewardX + (pet.kind === 'dog' ? -72 : 72);
      pet.y = rewardY;
      pet.vx = 0;
    }
    this.setCheckpoint(rewardX, rewardY, Story.t('loveTrial'), true);
    if (!fromNet && G.mode !== 'guest' && !G.level.shrineDone && G.level.shrineX > tr.routeStartX && G.level.shrineX < rewardX) {
      G._trialShrineT = 2.9;
    }
    const info = Story.trialInfo(G.levelIndex, tr.id);
    SND.sfx('gate');
    if (G.level && G.level.theme === 'village') SND.sfx('drum');
    G.announce = { txt: info.done, sub: Story.t('trialRewardSub'), t: 3.2 };
    Ptc.add({ kind: 'ring', x: rewardX, y: rewardY - 24, vx: 0, vy: 0, r: 180, life: .9, color: 'rgba(255,170,210,.9)' });
    Ptc.burst('heart', rewardX, rewardY - 60, 18, { sp: 170, r: 7, life: 1.3 });
    if (!fromNet && G.mode !== 'guest') {
      this.loveAdd(18);
      this.dropWeapons(rewardX, rewardY - 8, 2);
      this.emit('trial', { id: tr.id });
    } else {
      SND.sfx('weaponDrop');
    }
  },

  progressLocks() {
    const L = G.level;
    if (!L) return [];
    const locks = [];
    const trial = (L.loveTrials || []).find(t => !t.done && (t.stage || 0) < 4);
    if (trial) {
      const info = Story.trialInfo(G.levelIndex, trial.id);
      locks.push({ x: trial.x, limit: trial.lockLimit || trial.x + 190, txt: info.title, sub: Story.t('trialExtremeLock') });
    }
    for (const e of L.foes) {
      if (e.bossTier && !e.dead && !(e.dying > 0)) {
        locks.push({ x: e.x, limit: e.x + 330, txt: e.bossName || Story.t('strongBoss'), sub: Story.t('strongBossLock') });
      }
    }
    if (L.gateX && !L.gateOpen) {
      locks.push({ x: L.gateX, limit: L.gateX + 135, txt: Story.t('heartGate'), sub: Story.t('heartGateSub') });
    }
    if (L.boss && G.bossActive && !L.boss.dead && !(L.boss.dying > 0)) {
      locks.push({ x: L.boss.x, limit: L.boss.x + 420, txt: L.boss.bossName || Story.t('finalBoss'), sub: Story.t('finalBossLock') });
    }
    for (const lock of locks) {
      const span = Math.round(lock.limit - lock.x);
      if (span === 330) lock.sub = Story.t('strongBossLock');
      else if (span === 135) { lock.txt = Story.t('heartGate'); lock.sub = Story.t('heartGateSub'); }
      else if (span === 420) lock.sub = Story.t('finalBossLock');
    }
    return locks.sort((a, b) => a.x - b.x);
  },

  enforceProgressLocks(dt) {
    const locks = this.progressLocks();
    if (!locks.length) return;
    const actors = G.mate && G.mate.bot ? [G.me, G.mate] : [G.me];
    for (const p of actors) {
      if (!p || p.down) continue;
      const lock = locks.find(l => p.x > l.limit);
      if (!lock) continue;
      p.x = lock.limit;
      p.vx = Math.min(0, p.vx);
      const ground = World.topAt(G.level, p.x, p.y - 120) || World.topAt(G.level, p.x);
      if (ground !== null && p.y > ground + 6) {
        p.y = ground; p.vy = 0; p.onGround = true;
      }
      if (p.safeX > lock.limit) { p.safeX = lock.limit - 20; p.safeY = ground || p.safeY; }
      if (G._lockHintT <= 0) {
        G.announce = { txt: lock.txt, sub: lock.sub, t: 2.5 };
        SND.sfx('ui');
        G._lockHintT = 2.4;
      }
    }
  },

  setCheckpoint(x, y, label, quiet) {
    if (!G.level) return;
    const top = World.topAt(G.level, x, y - 120) || World.topAt(G.level, x) || y || 520;
    G.checkpoint = { x, y: top };
    if (!quiet && label) this.toastMsg(Story.t('savePoint', { label }));
    Ptc.add({ kind: 'ring', x, y: top - 20, vx: 0, vy: 0, r: 95, life: .7, color: 'rgba(170,230,255,.8)' });
  },

  updatePetDamage(dt) {
    if (!G.level) return;
    for (const pet of G.pets) {
      if (pet.hp <= 0 || pet.hurtCd > 0) continue;
      for (const e of this.enemiesAll()) {
        if (e.dead || e.dying > 0) continue;
        const r = e.type === 'boss' ? 86 : (e.bossTier ? 54 : 30);
        if (Math.abs(e.x - pet.x) < r && Math.abs((e.y - 14) - (pet.y - 18)) < r) {
          this.damagePet(pet, Math.max(4, e.dmg * .45), e.x);
          break;
        }
      }
    }
  },

  damagePet(pet, dmg, fromX) {
    pet.hp = Math.max(0, pet.hp - dmg);
    pet.hurtCd = 1.2;
    pet.vx = Math.sign(pet.x - fromX) * 180 || 180;
    SND.sfx('hit');
    Ptc.burst('spark', pet.x, pet.y - 22, 5, { color: pet.kind === 'dog' ? '#9fd8ff' : '#ffc4dc', sp: 120, g: 350, r: 4, life: .45 });
    if (pet.hp <= 0) {
      pet.mode = 'follow';
      pet.downT = 0;
      this.toastMsg(Story.t('petRecover', { name: Story.NAMES[pet.kind] }));
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
          this.loveAdd(10);
          Ptc.burst('heart', mate.x, mate.y - 40, 12, { sp: 140, r: 7, life: 1.2 });
          if (mate.bot) { mate.down = false; mate.pose = null; mate.hp = mate.maxHp * .6; mate.cheerT = 1; }
          else { mate.down = false; mate.pose = null; mate.hp = Math.max(mate.hp, mate.maxHp * .45); }
          this.reviveKiss((me.x + mate.x) / 2);
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
      this.toastMsg('💗 ' + Story.t('getCloser'));
    }
  },

  applyLove(kind, x) {
    const me = G.me, mate = G.mate;
    switch (kind) {
      case 'hold':
        G.handHold = true; me.holding = mate.holding = true;
        SND.sfx('heart');
        Ptc.burst('heart', (me.x + mate.x) / 2, Math.min(me.y, mate.y) - 50, 6, { sp: 90, r: 6, life: 1 });
        this.toastMsg('🤝 ' + Story.t('holdingHands'));
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
          if (Math.abs(e.x - G.kissX) < 700) this.hitEnemy(e, 110, 'love');
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
    if (G.love >= 100 && was < 100) G.announce = { txt: '💋 ' + Story.t('kissReady'), sub: Story.t('kissReadySub'), t: 2.4 };
  },

  /* ================= combat ================= */
  addProj(o, fromNet) {
    o.t = 0;
    G.projs.push(o);
    if (!fromNet) {
      if (o.mine) this.emit('shoot', { kind: o.kind, color: o.color, x: o.x, y: o.y, vx: o.vx, vy: o.vy, life: o.life, g: o.g });
      else if (o.host && G.mode === 'host') this.emit('shoot', { kind: o.kind, color: o.color, x: o.x, y: o.y, vx: o.vx, vy: o.vy, life: o.life, g: o.g, foe: true, dmg: o.dmg });
    }
  },

  addAura(x, y, mine) {
    G.auras.push({ x, y, t: 3.5, mine });
  },

  weaponSpecial(p, w) {
    const dir = p.dir || 1;
    const color = w.color || '#fff3a8';
    const mine = !p.remote;
    p.weaponPose = Math.max(p.weaponPose || 0, .55);
    p.cheerT = Math.max(p.cheerT || 0, .35);
    const shoot = (kind, vx, vy, dmg, life = 1.2, g = 0, x = p.x + dir * 20, y = p.y - 40) => {
      this.addProj({ kind, color, x, y, vx, vy, dmg, life, g, mine, owner: p.char });
    };
    const team = [G.me, G.mate].filter(q => q && !q.down && U.dist(q.x, q.y, p.x, p.y) < 320);
    const healTeam = (hp, mp = 0) => {
      for (const q of team) {
        q.hp = Math.min(q.maxHp, q.hp + hp);
        q.mp = Math.min(q.maxMp, q.mp + mp);
      }
    };
    const areaHit = (dmg, radius, slow = 0) => {
      for (const e of this.enemiesAll()) {
        if (!e.dead && !(e.dying > 0) && U.dist(e.x, e.y, p.x, p.y) < radius) {
          this.hitEnemy(e, dmg, p.char);
          if (slow) e.atkT = Math.max(e.atkT, slow);
        }
      }
    };
    SND.sfx('weaponPickup');
    switch (w.special) {
      case 'tideDash':
        p.dashT = .42; p.invuln = Math.max(p.invuln, .65); this.emitFx('dash', p.x, p.y); break;
      case 'roseBloom':
        this.addAura(p.x, p.y, mine); this.emitFx('bloom', p.x, p.y); break;
      case 'starRain':
        for (let i = -2; i <= 2; i++) shoot('starshot', dir * (250 + i * 25), -340 - Math.abs(i) * 30, 19, 1.3, 520, p.x + i * 28, p.y - 120);
        break;
      case 'heartHeal':
        for (const q of [G.me, G.mate]) if (!q.down && U.dist(q.x, q.y, p.x, p.y) < 260) q.hp = Math.min(q.maxHp, q.hp + 28);
        Ptc.burst('heart', p.x, p.y - 48, 16, { sp: 120, r: 7, life: 1 });
        this.loveAdd(6); break;
      case 'moonVolley':
        for (const a of [-.35, -.18, 0, .18, .35]) shoot('bolt', dir * 680 * Math.cos(a), 680 * Math.sin(a), 17, 1.15);
        break;
      case 'emberArc':
        for (let i = 0; i < 4; i++) shoot('bolt', dir * (400 + i * 80), -230 - i * 35, 22, 1.15, 620);
        break;
      case 'thunderSlam':
        this.shake(9);
        Ptc.add({ kind: 'ring', x: p.x, y: p.y - 18, vx: 0, vy: 0, r: 170, life: .55, color: color + 'dd' });
        areaHit(28, 230, 1.1);
        for (const side of [-1, 1]) shoot('shock', side * 390, 0, 24, 1.8, 0, p.x + side * 42, p.y);
        break;
      case 'crystalBurst':
        for (let i = 0; i < 8; i++) { const a = i * U.TAU / 8; shoot('bolt', Math.cos(a) * 420, Math.sin(a) * 420, 14, .9); }
        break;
      case 'shadowBlink':
        p.x += dir * 180; p.invuln = Math.max(p.invuln, 1); Ptc.burst('dot', p.x, p.y - 35, 18, { color, sp: 160, r: 7, life: .7 }); break;
      case 'sunGuard':
        for (const q of team) q.invuln = Math.max(q.invuln, q === p ? 2.6 : 1.9);
        areaHit(14, 190, .8);
        Ptc.add({ kind: 'ring', x: p.x, y: p.y - 32, vx: 0, vy: 0, r: 170, life: .8, color: color + 'dd' }); break;
      case 'lotusWind':
        for (const a of [-.45, -.22, 0, .22, .45]) shoot('petal', dir * 560 * Math.cos(a), 560 * Math.sin(a), 13, 1.2);
        this.addAura(p.x + dir * 90, p.y, mine); break;
      case 'riverWall':
        for (let i = 0; i < 5; i++) shoot('phoenix', dir * 360, -220 + i * 110, 16, 1.25, 0, p.x + dir * 28, p.y - 95 + i * 24);
        break;
      case 'cometDash':
        p.dashT = .34; p.invuln = Math.max(p.invuln, .7); shoot('starshot', dir * 820, -80, 30, .9, 0); break;
      case 'pandaGift':
        healTeam(24, 34);
        this.loveAdd(8);
        for (let i = -1; i <= 1; i++) {
          G.level.items.push({ id: 'd' + (G._dropId++), kind: i === 0 ? 'heartDrop' : 'mote', x: p.x + i * 34, y: p.y - 48, taken: false });
        }
        break;
      case 'luluHowl':
        areaHit(28, 330, 1.4);
        Ptc.text(p.x, p.y - 88, 'HOWL!', color); break;
      case 'phoenixNova':
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * U.TAU / 10; shoot('phoenix', Math.cos(a) * 430, Math.sin(a) * 430, 18, 1.1); }
        break;
      case 'dreamSong':
        this.loveAdd(16); areaHit(16, 380, 2.4); healTeam(8, 10);
        Ptc.text(p.x, p.y - 82, '♪', color); break;
      case 'vineSnare':
        areaHit(22, 440, 1.7);
        break;
      case 'auroraShield':
        p.invuln = Math.max(p.invuln, 1.4); for (let i = 0; i < 6; i++) { const a = i * U.TAU / 6; shoot('bolt', Math.cos(a) * 330, Math.sin(a) * 330, 12, 1); }
        break;
      case 'bambooPhalanx':
        for (let i = -2; i <= 2; i++) shoot('bamboo', dir * (520 + Math.abs(i) * 45), i * 62, 19, 1.25, 0, p.x + dir * 26, p.y - 48 + i * 9);
        areaHit(12, 210, 1.1);
        break;
      case 'buffaloCharge':
        for (const q of team) q.invuln = Math.max(q.invuln, q === p ? 1.8 : 1.25);
        p.dashT = .5; p.invuln = Math.max(p.invuln, 1.1);
        areaHit(24, 190, .9);
        for (const side of [-1, 1]) shoot('shock', side * 430, 0, 20, 1.65, 0, p.x + side * 36, p.y);
        this.shake(7);
        break;
      case 'harvestArc':
        for (const side of [-1, 1]) shoot('sickle', side * 520, -80, 20, 1.35, 100, p.x + side * 22, p.y - 48);
        healTeam(10, 6); this.loveAdd(4);
        break;
      case 'sandalRicochet':
        for (const side of [-1, 1]) for (const vy of [-150, 20, 150]) shoot('sandal', side * 560, vy, 15, 1.28, 0, p.x + side * 20, p.y - 44);
        break;
      case 'loveBeacon':
      default:
        this.loveAdd(20); this.hugHearts(p.x); healTeam(18, 14);
        Ptc.add({ kind: 'ring', x: p.x, y: p.y - 35, vx: 0, vy: 0, r: 145, life: .75, color: color + 'dd' });
        break;
    }
    this.weaponBondBonus(p, w);
    this.weaponBurst(p.x, p.y - 45, p.weapon, .75);
    this.emitFx('weapon', p.x, p.y, { special: w.special, weapon: p.weapon });
  },

  weaponBondBonus(p, w) {
    const mate = p === G.me ? G.mate : G.me;
    if (!mate || mate.down || U.dist(p.x, p.y, mate.x, mate.y) > 260) return;
    const role = (w.role || '').toLowerCase();
    if (role.includes('defense')) {
      p.invuln = Math.max(p.invuln, .8);
      mate.invuln = Math.max(mate.invuln, .8);
    } else if (role.includes('love') || role.includes('support')) {
      p.hp = Math.min(p.maxHp, p.hp + 10);
      mate.hp = Math.min(mate.maxHp, mate.hp + 14);
      p.mp = Math.min(p.maxMp, p.mp + 8);
      mate.mp = Math.min(mate.maxMp, mate.mp + 10);
    } else if (role.includes('control')) {
      for (const e of this.enemiesAll()) {
        if (!e.dead && U.dist(e.x, e.y, mate.x, mate.y) < 260) e.atkT = Math.max(e.atkT, 1.1);
      }
      mate.mp = Math.min(mate.maxMp, mate.mp + 10);
    } else {
      mate.mp = Math.min(mate.maxMp, mate.mp + 12);
    }
    this.loveAdd(4, true);
    Ptc.text((p.x + mate.x) / 2, Math.min(p.y, mate.y) - 88, Story.t('bondBonus'), '#ff9fce');
    Ptc.burst('heart', (p.x + mate.x) / 2, Math.min(p.y, mate.y) - 58, 7, { sp: 95, r: 5, life: .9 });
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
    if (e.type === 'boss' && e.shieldT > 0) {
      dmg = Math.max(1, Math.round(dmg * .35));
      if (!fromNet) {
        Ptc.text(e.x, e.y - 92, 'GUARD', '#bff7ff');
        Ptc.add({ kind: 'ring', x: e.x, y: e.y - 12, vx: 0, vy: 0, r: 120, life: .35, color: this.bossColor(e.bossKind) + 'cc' });
        SND.sfx('orb');
      }
    }
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
        this.loveAdd(8);
        if (!G.me.down && !G.mate.down && U.dist(G.me.x, G.me.y, G.mate.x, G.mate.y) < 220) {
          G.me.invuln = Math.max(G.me.invuln, .55);
          G.mate.invuln = Math.max(G.mate.invuln, .55);
          G.me.mp = Math.min(G.me.maxMp, G.me.mp + 8);
          G.mate.mp = Math.min(G.mate.maxMp, G.mate.mp + 8);
          Ptc.burst('heart', (G.me.x + G.mate.x) / 2, Math.min(G.me.y, G.mate.y) - 56, 6, { sp: 100, r: 5, life: .8 });
        }
        if (G._comboToastT <= 0) {
          G._comboToastT = 2.5;
          Ptc.text(e.x, e.y - 58, Story.t('togetherStrike'), '#ff9fce');
          SND.sfx('heart');
        }
      }
      e._lastBy = by; e._lastByT = G.time;
    }
    if (e.hp <= 0) {
      if (e.type === 'boss') this.bossDefeated();
      else this.killEnemy(e, by);
    }
  },

  killEnemy(e, by) {
    e.dead = true;
    G.stats.kills++;
    this.loveAdd(3);
    SND.sfx('ekill');
    // victory cheer for the local hero who landed it
    if (by === G.me.char) G.me.cheerT = .9;
    else if (G.mate.bot && by === G.mate.char) G.mate.cheerT = .9;
    Ptc.burst('dot', e.x, e.y - 14, 10, { color: '#b28fe8', sp: 160, r: 7, life: .6 });
    Ptc.burst('spark', e.x, e.y - 14, 6, { sp: 190, g: 500, r: 4, life: .6 });
    if (e.bossTier) this.setCheckpoint(Math.max(140, e.x - 120), World.topAt(G.level, e.x) || e.y, e.bossName || 'Boss', true);
    if (G.mode !== 'guest') {
      if (e.bossTier) {
        this.dropWeapons(e.x, e.y, 2);
        G.announce = { txt: Story.t('bossDefeated'), sub: Story.t('bossDropSub'), t: 2.8 };
        SND.startMusic(G.levelIndex, false);
      }
      // loot
      const r = Math.random();
      let kind = null;
      if (!e.bossTier && r < .1) {
        this.dropWeapons(e.x, e.y, 1);
      } else if (r < .5) kind = 'mote';
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
    me.hurtT = .6; me.cheerT = 0;
    me.vx = Math.sign(me.x - fromX) * 300 || 300;
    me.vy = -260;
    SND.sfx('hit');
    this.shake(6);
    Ptc.burst('spark', me.x, me.y - 30, 6, { color: '#ff8f8f', sp: 170, g: 400, r: 4, life: .5 });
    if (me.hp <= 0) {
      me.hp = 0; me.down = true; me.downT = 0; me.pose = 'down';
      SND.sfx('down');
      this.emit('down', {});
      this.toastMsg('💔 ' + Story.t(me.char === 'joku' ? 'downJoku' : 'downJolie'));
    }
  },

  fell(p) {
    if (p === G.me) {
      G.me.hp = Math.max(5, G.me.hp - 12);
      SND.sfx('hit');
      this.shake(5);
      this.toastMsg('🌫 ' + Story.t('mist'));
    }
    Ptc.burst('drop', p.x, World.DEATH_Y - 80, 12, { sp: 200, up: 300, g: 700, r: 5, life: .8 });
    p.x = p.safeX; p.y = p.safeY - 4; p.vx = 0; p.vy = 0;
    p.invuln = 1.5; p._fell = false;
  },

  reviveMe() {
    if (!G.me.down) return;
    G.me.down = false; G.me.pose = null; G.me.downT = 0;
    G.me.hp = G.me.maxHp * .6; G.me.invuln = 2.5;
    G.me.cheerT = 1;
    this.loveAdd(10);
    SND.sfx('revive');
    Ptc.burst('heart', G.me.x, G.me.y - 40, 12, { sp: 140, r: 7, life: 1.2 });
    this.reviveKiss((G.me.x + G.mate.x) / 2);
    this.toastMsg('💞 ' + Story.t('revive'));
  },

  reviveKiss(x) {
    const joku = this.byChar('joku'), jolie = this.byChar('jolie');
    if (!joku || !jolie) return;
    x = x || (joku.x + jolie.x) / 2;
    joku.pose = jolie.pose = 'kiss';
    joku.poseT = jolie.poseT = .85;
    joku.dir = x >= joku.x ? 1 : -1;
    jolie.dir = -joku.dir;
    SND.sfx('kiss');
    Ptc.add({ kind: 'ring', x, y: Math.min(joku.y, jolie.y) - 42, vx: 0, vy: 0, r: 120, life: .65, color: 'rgba(255,170,210,.85)' });
    Ptc.burst('heart', x, Math.min(joku.y, jolie.y) - 62, 10, { sp: 120, r: 6, life: 1 });
  },

  respawnPlayer(p, hpFrac) {
    p.down = false; p.pose = null; p.downT = 0;
    p.hp = p.maxHp * hpFrac; p.mp = Math.max(p.mp, p.maxMp * .35); p.invuln = 2.5;
    p.x = G.checkpoint.x + (p.char === 'jolie' ? 46 : 0);
    p.y = (World.topAt(G.level, p.x) || G.checkpoint.y);
    p.vx = p.vy = 0;
    Ptc.burst('heart', p.x, p.y - 40, 8, { sp: 110, r: 6, life: 1 });
  },

  respawnMe(hpFrac) {
    this.respawnPlayer(G.me, hpFrac);
  },

  applyWipe() {
    G._wiping = false;
    this.respawnMe(.6);
    if (G.mate && G.mate.bot) this.respawnPlayer(G.mate, .6);
    this.toastMsg('💞 Love never gives up! Back to the shrine.');
  },

  /* ================= pickups ================= */
  weaponDropItem(weapon, x, y, vx = 0, vy = -90, id = null) {
    return {
      id: id || 'w' + (G._dropId++),
      kind: 'weapon',
      weapon,
      x, y,
      vx: 0, vy,
      rot: Math.random() * U.TAU,
      vr: (Math.random() - .5) * 4,
      grounded: false,
      anchored: false,
      _staticX: null,
      _staticY: null,
      owner: null,
      follow: false,
      taken: false
    };
  },

  freezeWeaponItem(it, x = it.x, y = it.y) {
    it.x = it._staticX = x;
    it.y = it._staticY = y;
    it.vx = 0;
    it.vy = 0;
    it.vr = 0;
    it.grounded = true;
    it.anchored = true;
    it.owner = null;
    it.follow = false;
    return it;
  },

  updateItems(dt) {
    if (!G.level) return;
    for (const it of G.level.items) {
      if (it.taken || it.kind !== 'weapon') continue;
      if (it.vx == null) it.vx = 0;
      if (it.vy == null) it.vy = it.grounded ? 0 : 40;
      if (it.rot == null) it.rot = 0;
      if (it.vr == null) it.vr = 0;

      if (it.grounded || it.anchored) {
        const sx = it._staticX != null ? it._staticX : it.x;
        const sy = it._staticY != null ? it._staticY : it.y;
        this.freezeWeaponItem(it, sx, sy);
        continue;
      }

      it.vy += 1700 * dt;
      it.y += it.vy * dt;
      it.rot += it.vr * dt;

      const top = World.topAt(G.level, it.x, it.y - 80);
      const groundY = top == null ? null : top - 32;
      if (groundY != null && it.y >= groundY && it.vy >= 0) {
        if (!it.grounded && Math.abs(it.vy) > 180) {
          SND.sfx('weaponDrop');
          Ptc.add({ kind: 'ring', x: it.x, y: groundY + 10, vx: 0, vy: 0, r: 34, life: .35, color: (Weapons[it.weapon]?.color || '#fff3a8') + '88' });
        }
        it.y = groundY;
        this.freezeWeaponItem(it, it.x, groundY);
      } else {
        it.grounded = false;
        it.anchored = false;
        it._staticX = null;
        it._staticY = null;
        it.vx = 0;
      }

      if (it.y > World.DEATH_Y + 160) {
        const safeTop = World.topAt(G.level, U.clamp(it.x, 60, G.level.width - 60)) || 620;
        this.freezeWeaponItem(it, it.x, safeTop - 32);
      }
    }
  },

  nearestWeapon(p = G.me, radius = 76) {
    if (!p || !G.level) return null;
    let best = null, bd = radius * radius;
    for (const it of G.level.items) {
      if (it.taken || it.kind !== 'weapon') continue;
      if (!it.grounded && !it.anchored) continue;
      const dx = it.x - p.x, dy = it.y - (p.y - 28);
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  },

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
      case 'weapon': {
        const weapon = Weapons[it.weapon] ? it.weapon : 'tideSpear';
        const p = this.byChar(by);
        if (!fromNet && !it.grounded && !it.anchored) {
          it.taken = false;
          return;
        }
        if (!fromNet && p.weapon && p.weapon !== weapon) {
          const old = p.weapon;
          const oldIt = this.weaponDropItem(old, p.x + (p.dir || 1) * 34, p.y - 46, 0, -70);
          G.level.items.push(oldIt);
          this.emit('drop', { id: oldIt.id, kind: oldIt.kind, weapon: old, x: oldIt.x, y: oldIt.y, vx: oldIt.vx, vy: oldIt.vy });
          this.weaponBurst(oldIt.x, oldIt.y, old, .75);
        }
        this.setWeapon(by, weapon);
        p.weaponPose = .9;
        p.cheerT = Math.max(p.cheerT || 0, .55);
        if (forMe) this.toastMsg(Story.t('equipped', { weapon: Story.weaponText(weapon, 'name') || Weapons[weapon].name, keys: Input.touchMode ? '✦' : 'U/O/B' }));
        if (!fromNet) SND.sfx('weaponPickup');
        this.weaponBurst(it.x, it.y, weapon, 1.15);
        break;
      }
    }
    if (!fromNet && forMe && Main.showItemPopup) Main.showItemPopup(it.kind, { weapon: it.weapon });
    if (!fromNet) this.emit('pick', { id: it.id, by });
  },

  randomWeapon(pool = Weapons.IDS) {
    return pool[(Math.random() * pool.length) | 0];
  },

  weaponBurst(x, y, weapon, power = 1) {
    const def = Weapons[weapon] || Weapons.tideSpear;
    Ptc.add({ kind: 'ring', x, y, vx: 0, vy: 0, r: 42 * power, life: .55, color: def.color + 'cc' });
    Ptc.burst('star', x, y, Math.round(12 * power), { color: def.color, sp: 145 * power, r: 6, life: .9 });
    Ptc.burst('dot', x, y - 8, Math.round(8 * power), { color: '#ffffff', sp: 90 * power, r: 3, life: .55 });
  },

  dropWeapons(x, y, n = 2) {
    if (G.mode === 'guest') return;
    SND.sfx('weaponDrop');
    const villagePool = ['sacredBamboo', 'buffaloShield', 'goldenRiceSickle', 'toOngSandal'];
    for (let i = 0; i < n; i++) {
      const themed = G.level && G.level.theme === 'village' && Math.random() < .72;
      const weapon = this.randomWeapon(themed ? villagePool : Weapons.IDS);
      const side = i % 2 ? 1 : -1;
      const it = this.weaponDropItem(weapon, x + side * (38 + i * 8), y - 62, 0, -105 - i * 16);
      G.level.items.push(it);
      this.weaponBurst(it.x, it.y, weapon, .9);
      this.emit('drop', { id: it.id, kind: it.kind, weapon, x: it.x, y: it.y, vx: it.vx, vy: it.vy });
    }
  },

  dropMyWeapon() {
    const p = G.me;
    if (!p || G.state !== 'play') return;
    const near = this.nearestWeapon(p);
    if (near) {
      this.pickup(near, p.char, false);
      return;
    }
    if (!p.weapon) { this.toastMsg(Story.t('noWeapon')); return; }
    const weapon = p.weapon;
    this.setWeapon(p.char, null);
    const it = this.weaponDropItem(weapon, p.x + p.dir * 34, p.y - 46, 0, -70);
    G.level.items.push(it);
    this.emit('drop', { id: it.id, kind: it.kind, weapon, x: it.x, y: it.y, vx: it.vx, vy: it.vy });
    SND.sfx('weaponDrop');
    this.weaponBurst(it.x, it.y, weapon, .9);
    this.toastMsg(Story.t('dropped', { weapon: (Weapons[weapon] ? (Story.weaponText(weapon, 'name') || Weapons[weapon].name) : 'weapon') }));
  },

  /* ================= boss ================= */
  bossColor(kind) {
    return ({
      root: '#63d18a', tide: '#56d6ff', briar: '#ff86b8',
      gloom: '#9e5eff', ember: '#ff8a4a', eclipse: '#d7b7ff', horde: '#8b78d6'
    })[kind || (G.level && G.level.boss && G.level.boss.bossKind)] || '#9e5eff';
  },

  miniBossSpecial(e, tgt) {
    const color = this.bossColor(e.bossStyle);
    const rank = e.bossRank || 0;
    e.bossAtkT = rank ? 2.25 : 1.75;
    e.flash = .2;
    SND.sfx(rank ? 'slam' : 'boss');
    if (rank === 0) {
      for (const off of [-.28, 0, .28]) {
        const a = Math.atan2((tgt.y - 34) - e.y, tgt.x - e.x) + off;
        this.addProj({ kind: 'darkball', color, x: e.x, y: e.y - 34, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, dmg: e.dmg + 4, life: 2.6, mine: false, foe: true, host: true });
      }
      Ptc.add({ kind: 'ring', x: e.x, y: e.y - 28, vx: 0, vy: 0, r: 90, life: .45, color: color + 'bb' });
    } else {
      this.bossSlam(e.x, e.dmg + 3);
      for (const dir of [-1, 1]) {
        this.addProj({ kind: 'darkball', color, x: e.x, y: e.y - 75, vx: dir * 250, vy: -260, dmg: e.dmg, life: 2.4, g: 360, mine: false, foe: true, host: true });
      }
    }
  },

  bossWake() {
    G.bossActive = true;
    const b = G.level.boss;
    if (b) G.announce = { txt: b.bossName || 'Chapter Boss', sub: 'final boss fight', t: 3 };
    SND.startMusic(G.levelIndex, true);
    SND.sfx('boss');
    this.shake(8);
  },
  bossSlam(x, dmg = 18) {
    SND.sfx('slam');
    this.shake(11);
    Ptc.burst('dot', x, 500, 14, { color: '#9e5eff', sp: 260, r: 9, life: .6 });
    Ptc.add({ kind: 'ring', x, y: 500, vx: 0, vy: 0, r: 160, life: .5, color: 'rgba(158,94,255,.8)' });
    for (const dir of [-1, 1]) {
      this.addProj({ kind: 'shock', x: x + dir * 60, y: 520, vx: dir * 330, vy: 0, dmg, life: 2.4, mine: false, foe: true, host: true });
    }
  },
  bossVolley(b) {
    const color = this.bossColor(b.bossKind);
    const phase = b.phase || 0;
    const players = [G.me, G.mate].filter(p => p && !p.down);
    const mid = this.playersMidX();
    const shoot = (kind, x, y, vx, vy, dmg = 17, life = 3, g = 0) => {
      this.addProj({ kind, color, x, y, vx, vy, dmg, life, g, mine: false, foe: true, host: true });
    };
    SND.sfx('boss');
    this.shake(8 + phase * 2);
    Ptc.add({ kind: 'ring', x: b.x, y: b.y - 24, vx: 0, vy: 0, r: 170 + phase * 24, life: .55, color: color + 'bb' });

    switch (b.bossKind) {
      case 'root':
        for (const p of players) {
          const gy = World.topAt(G.level, p.x) || p.y;
          for (const off of [-110, 0, 110]) shoot('darkball', p.x + off, gy - 6, 0, -440 - phase * 45, 18 + phase * 2, 1.35, 760);
        }
        break;
      case 'tide':
        for (let i = 0; i < 4 + phase; i++) {
          const y = b.y - 120 + i * 42;
          shoot('darkball', b.x - 420 - i * 18, y, 430 + phase * 45, 70 - i * 16, 17 + phase * 2, 2.7, 70);
          shoot('darkball', b.x + 420 + i * 18, y, -430 - phase * 45, 70 - i * 16, 17 + phase * 2, 2.7, 70);
        }
        break;
      case 'briar': {
        const n = 12 + phase * 3;
        for (let i = 0; i < n; i++) {
          const a = i * U.TAU / n + b.t * .4;
          const sp = 250 + (i % 3) * 42 + phase * 35;
          shoot('darkball', b.x, b.y - 22, Math.cos(a) * sp, Math.sin(a) * sp, 16 + phase * 2, 2.5);
        }
        break;
      }
      case 'ember':
        for (let i = 0; i < 7 + phase * 2; i++) {
          const x = mid - 360 + i * 120 + (Math.random() - .5) * 34;
          shoot('darkball', x, b.y - 430 - Math.random() * 90, (Math.random() - .5) * 120, 90 + Math.random() * 70, 22 + phase * 3, 3.3, 620);
        }
        break;
      case 'eclipse': {
        const n = 14 + phase * 4;
        for (let i = 0; i < n; i++) {
          const a = i * U.TAU / n + b.t * .35;
          shoot(i % 3 === 0 ? 'starshot' : 'darkball', b.x, b.y - 18, Math.cos(a) * (285 + phase * 34), Math.sin(a) * (285 + phase * 34), 17 + phase * 2, 2.55);
        }
        for (const p of players) shoot('darkball', p.x, p.y - 260, 0, 250 + phase * 30, 20 + phase * 2, 2.3, 150);
        break;
      }
      case 'horde': {
        const count = 8 + phase * 3;
        for (const p of players) {
          for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 54;
            shoot('arrow', p.x + spread, p.y - 410 - (i % 3) * 45, spread * -.08, 120 + (i % 2) * 35, 19 + phase * 3, 2.7, 360);
          }
        }
        for (const side of [-1, 1]) {
          shoot('darkball', b.x, b.y - 54, side * (460 + phase * 50), -40, 21 + phase * 2, 2.1);
        }
        break;
      }
      case 'gloom':
      default:
        b.x = U.clamp(mid + (Math.random() < .5 ? -230 : 230), 320, G.level.width - 320);
        for (const p of players) {
          for (const off of [-90, 0, 90]) shoot('darkball', p.x + off, p.y - 250 - Math.abs(off) * .35, off * .55, 245 + phase * 38, 18 + phase * 2, 2.5, 130);
        }
        break;
    }
  },
  bossSpecial(b) {
    const color = this.bossColor(b.bossKind);
    const mid = this.playersMidX();
    SND.sfx('boss');
    this.shake(7 + b.phase * 2);
    Ptc.add({ kind: 'ring', x: b.x, y: b.y - 10, vx: 0, vy: 0, r: 210, life: .75, color: color + 'bb' });
    const shoot = (x, y, vx, vy, dmg = 17, life = 3, g = 0, kind = 'darkball') => {
      this.addProj({ kind, color, x, y, vx, vy, dmg, life, g, mine: false, foe: true, host: true });
    };
    switch (b.bossKind) {
      case 'root':
        b.shieldT = Math.max(b.shieldT || 0, 1.4 + b.phase * .35);
        for (let i = -3; i <= 3; i++) shoot(mid + i * 95, 520, 0, -360 - Math.abs(i) * 22, 17 + b.phase * 2, 1.4, 620);
        break;
      case 'tide':
        b.shieldT = Math.max(b.shieldT || 0, .85 + b.phase * .25);
        for (let i = 0; i < 6 + b.phase; i++) shoot(b.x - 260 + i * 104, b.y - 60, Math.sin(i) * 80, 260, 16, 2.4, 80);
        break;
      case 'briar':
        b.shieldT = Math.max(b.shieldT || 0, 1.15 + b.phase * .3);
        for (let i = 0; i < 10; i++) { const a = -Math.PI + i * Math.PI / 9; shoot(b.x, b.y - 20, Math.cos(a) * 360, Math.sin(a) * 360, 15, 2.2); }
        break;
      case 'ember':
        b.shieldT = Math.max(b.shieldT || 0, .7 + b.phase * .2);
        for (let i = 0; i < 5 + b.phase; i++) shoot(mid - 260 + i * 130, b.y - 360, (Math.random() - .5) * 90, 120, 22, 3.4, 520);
        break;
      case 'eclipse':
        b.shieldT = Math.max(b.shieldT || 0, 1.7 + b.phase * .45);
        for (let i = 0; i < 12; i++) { const a = i * U.TAU / 12 + b.t * .2; shoot(b.x, b.y - 15, Math.cos(a) * 300, Math.sin(a) * 300, 16, 2.2); }
        break;
      case 'horde': {
        b.shieldT = Math.max(b.shieldT || 0, 1.9 + b.phase * .45);
        const side = Math.random() < .5 ? -1 : 1;
        b.x = U.clamp(mid + side * 330, 320, G.level.width - 320);
        for (const dir of [-1, 1]) {
          this.addProj({ kind: 'shock', color, x: b.x + dir * 55, y: 520, vx: dir * (430 + b.phase * 45), vy: 0, dmg: 23 + b.phase * 3, life: 2.5, mine: false, foe: true, host: true });
        }
        for (let i = 0; i < 10 + b.phase * 2; i++) {
          const a = i * U.TAU / (10 + b.phase * 2);
          shoot(b.x, b.y - 36, Math.cos(a) * (310 + b.phase * 35), Math.sin(a) * (310 + b.phase * 35), 18 + b.phase * 2, 2.2, 0, 'arrow');
        }
        break;
      }
      case 'gloom':
      default:
        b.shieldT = Math.max(b.shieldT || 0, 1.0 + b.phase * .3);
        b.x = U.clamp(mid + (Math.random() < .5 ? -210 : 210), 320, G.level.width - 320);
        for (const p of [G.me, G.mate]) if (!p.down) shoot(p.x, p.y - 240, 0, 220, 19, 2.2, 180);
        break;
    }
  },
  bossSummon(n = 2) {
    const b = G.level.boss;
    // don't flood the arena — the couple needs room to love AND fight
    const alive = G.level.foes.filter(f => !f.dead).length;
    n = Math.min(n, Math.max(0, 3 - alive));
    if (n <= 0) return;
    SND.sfx('boss');
    const pl = G.level.plats.find(p => p.type === 'ground' && b.x >= p.x && b.x <= p.x + p.w) || G.level.plats[G.level.plats.length - 1];
    const summonTypes = G.level.theme === 'village' ? ['slime', 'thorn', 'wisp', 'imp'] :
      G.level.theme === 'ember' ? ['golem', 'imp', 'bat'] :
      G.level.theme === 'star' ? ['bat', 'wisp', 'golem'] :
      G.level.theme === 'shadow' ? ['wisp', 'bat', 'thorn'] : ['slime', 'thorn', 'wisp'];
    for (const off of [-140, 140, -260, 260].slice(0, n)) {
      const type = summonTypes[(Math.random() * summonTypes.length) | 0];
      const hp = type === 'golem' ? 145 : type === 'thorn' ? 85 : type === 'slime' ? 55 : 58;
      const f = {
        id: 'bs' + (G._dropId++), type, variant: G.level.theme, x: U.clamp(b.x + off, pl.x + 40, pl.x + pl.w - 40), y: pl.y, homeX: b.x + off, homeY: pl.y - (type === 'bat' || type === 'wisp' ? 170 : 0), plat: pl,
        vx: 0, vy: 0, dir: 1, hp, maxHp: hp, dmg: type === 'golem' ? 22 : 13, t: 0, atkT: .6, hopY: 0, flash: 0, hurtShow: 0, dead: false
      };
      if (type === 'bat' || type === 'wisp') f.y = f.homeY;
      G.level.foes.push(f);
      this.emit('spawn', { id: f.id, type: f.type, variant: f.variant, x: f.x, y: f.y, hp: f.hp, dmg: f.dmg });
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
    this.setCheckpoint(Math.max(140, b.x - 220), World.topAt(G.level, b.x) || b.y + 125, b.bossName || 'Final Boss', true);
    this.dropWeapons(b.x, b.y, 2);
    this.emit('bossdead', {});
    SND.startMusic(G.levelIndex, false);
    const journey = G.level.postBoss;
    if (!journey) {
      this.startChapterVictory(G.levelIndex >= World.LEVELS.length - 1, false);
      return;
    }
    journey.unlocked = true;
    journey.ready = 0;
    this.setCheckpoint(journey.start, World.topAt(G.level, journey.start) || b.y + 125, Story.t('dateJourney'), true);
    const info = Story.dateJourney(G.levelIndex);
    G.announce = { txt: Story.t('dateJourney'), sub: info.title, t: 3.8 };
    Ptc.burst('heart', journey.start + 40, (World.topAt(G.level, journey.start) || b.y) - 72, 14, { sp: 150, r: 7, life: 1.2 });
    this.emit('journey', { unlocked: 1, ready: 0 });
  },

  updateDateJourney(dt) {
    const journey = G.level && G.level.postBoss;
    if (!journey || !journey.unlocked || journey.completed) return;
    const atDoor = p => p && !p.down && Math.abs(p.x - journey.doorX) < 94 && Math.abs(p.y - journey.doorY) < 115;
    const bothHere = atDoor(G.me) && atDoor(G.mate);
    journey.ready = bothHere ? Math.min(1, (journey.ready || 0) + dt) : Math.max(0, (journey.ready || 0) - dt * 2.5);

    const oneHere = atDoor(G.me) || atDoor(G.mate);
    if (oneHere && !bothHere && G._lockHintT <= 0) {
      G.announce = { txt: Story.t('dateDoor'), sub: Story.t('dateDoorSub'), t: 2.3 };
      G._lockHintT = 2.1;
    }
    if (!bothHere || journey.ready < .72) return;

    journey.completed = true;
    journey.ready = 1;
    SND.sfx('gate');
    this.shake(5);
    Ptc.add({ kind: 'ring', x: journey.doorX, y: journey.doorY - 70, vx: 0, vy: 0, r: 180, life: .9, color: 'rgba(255,190,225,.92)' });
    Ptc.burst('heart', journey.doorX, journey.doorY - 70, 18, { sp: 180, r: 7, life: 1.35 });
    this.startChapterVictory(G.levelIndex >= World.LEVELS.length - 1, false);
  },

  startChapterVictory(finalChapter, fromNet = false) {
    if (G.chapterVictory) return;
    if (typeof ASSETS !== 'undefined' && ASSETS.request) {
      ASSETS.request(finalChapter ? ['cg_victory', 'cg_ending'] : ['cg_victory'], true);
    }
    G.chapterVictory = { t: 4.6, dur: 4.6, final: !!finalChapter };
    G.announce = null;
    G.nextLevelT = 0;
    SND.stopMusic();
    SND.sfx('victory');
    for (const p of [G.me, G.mate]) {
      if (!p) continue;
      p.vx = p.vy = 0;
      p.pose = null;
      p.cheerT = 5;
      p.invuln = Math.max(p.invuln, 5);
    }
    if (!fromNet && G.mode !== 'solo') {
      this.emit('journey', { unlocked: 1, completed: 1, ready: 100, victory: 1, final: finalChapter ? 1 : 0 });
    }
  },

  updateChapterVictory(dt) {
    const v = G.chapterVictory;
    if (!v) return;
    for (const p of [G.me, G.mate]) {
      if (!p) continue;
      p.vx = p.vy = 0;
      p.cheerT = Math.max(p.cheerT || 0, .25);
    }
    v.t -= dt;
    if (v.t > 0) return;
    G.chapterVictory = null;
    if (G.mode === 'guest') return;
    if (v.final) this.cutStart('ending');
    else this.nextLevel();
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
  dlgOpen(key, fromNet = false) {
    const src = Story.dialog ? Story.dialog(key) : Story.DLG[key];
    if (!src || !src.length) { return; }
    const lines = src.map(line => [line[0], typeof line[1] === 'function' ? line[1]() : line[1]]);
    G.dialog = { key, lines, i: 0, chars: 0 };
    if (G.mode === 'host' && !fromNet) this.emit('dlg', { key, i: 0, open: true });
  },

  dlgAdvance(fromNet) {
    const d = G.dialog;
    if (!d) return;
    if (G.mode === 'guest' && !fromNet) { this.emit('dlgReq', {}); return; }
    const full = d.lines[d.i][1].length;
    if (d.chars < full) {
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
      const src = Story.dialog ? Story.dialog(data.key) : (Story.DLG[data.key] || []);
      if (data.i < src.length) this.dlgOpen(data.key, true);
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
      else if (th === 'village') Ptc.add({ kind: Math.random() < .6 ? 'petal' : 'star', x, y: G.cam.y - 280, vx: 15 + Math.random() * 22, vy: 28 + Math.random() * 24, r: 3 + Math.random() * 2, life: 5.5, color: '#f2cf58', spin: 1 });
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
    // The quiet post-boss route is intentionally more romantic than dangerous.
    const journey = G.level.postBoss;
    if (journey && journey.unlocked && G.cam.x > journey.start - 320 && G.cam.x < journey.end + 320 && Math.random() < dt * 4) {
      const x = U.clamp(G.cam.x + (Math.random() - .5) * this.cssW / this.scale, journey.start, journey.end);
      const y = (World.topAt(G.level, x) || journey.doorY) - 64 - Math.random() * 105;
      const kind = th === 'blossom' ? 'petal' : (th === 'star' ? 'star' : 'heart');
      Ptc.add({ kind, x, y, vx: (Math.random() - .5) * 24, vy: -18 - Math.random() * 25, r: 4 + Math.random() * 3, life: 2.4, color: th === 'falls' ? '#9fd8ff' : '#ffb4d6', spin: 1 });
    }
    // collectibles twinkle
    if (Math.random() < dt * 2.5 && G.level.items.length) {
      const it = G.level.items[(Math.random() * G.level.items.length) | 0];
      if (it && !it.taken && Math.abs(it.x - G.cam.x) < this.cssW / this.scale / 2) {
        Ptc.add({ kind: 'star', x: it.x + (Math.random() - .5) * 12, y: it.y - 6 - Math.random() * 10, vx: 0, vy: -14, r: 4, life: .6, color: it.kind === 'orb' ? '#bfeaff' : '#ffd7ec' });
      }
    }
  },

  toastMsg(txt) {
    const raw = String(txt || '');
    if (raw.includes('Love never gives up')) txt = '💞 ' + Story.t('shrineReturn');
    else if (raw.includes('Joku is down')) txt = '💔 ' + Story.t('downJoku');
    else if (raw.includes('Jolie is down')) txt = '💔 ' + Story.t('downJolie');
    Main.toast(txt);
  },

  /* ================= networking ================= */
  resetNetSmoothing() {
    G.netT = { p: 0, w: 0, seq: 0, wseq: 0 };
    G.mateNet = null;
    G.mateBuf = [];
    G.lastMateSeq = 0;
    G.lastWorldSeq = 0;
  },
  queueMateState(s) {
    if (s.q && G.lastMateSeq && s.q <= G.lastMateSeq) return;
    if (s.q) G.lastMateSeq = s.q;
    const snap = Object.assign({}, s, { rx: performance.now() / 1000 });
    G.mateNet = snap;
    G.mateBuf.push(snap);
    while (G.mateBuf.length > 8) G.mateBuf.shift();
  },
  sampleMateState() {
    const buf = G.mateBuf;
    if (!buf.length) return G.mateNet;
    const now = performance.now() / 1000;
    const viewT = now - 0.09;
    while (buf.length > 2 && buf[1].rx < viewT - 0.18) buf.shift();

    let a = null, b = null;
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i].rx <= viewT && buf[i + 1].rx >= viewT) {
        a = buf[i]; b = buf[i + 1]; break;
      }
    }
    if (a && b && b.rx > a.rx) {
      const t = U.clamp((viewT - a.rx) / (b.rx - a.rx), 0, 1);
      return Object.assign({}, b, {
        x: U.lerp(a.x, b.x, t),
        y: U.lerp(a.y, b.y, t),
        vx: U.lerp(a.vx, b.vx, t),
        vy: U.lerp(a.vy, b.vy, t)
      });
    }

    const latest = buf[buf.length - 1];
    const age = U.clamp(now - latest.rx - 0.09, 0, 0.16);
    return Object.assign({}, latest, {
      x: latest.x + latest.vx * age,
      y: latest.y + latest.vy * age
    });
  },
  emit(k, data) {
    if (G.mode === 'solo') return;
    NET.send({ t: 'ev', k, d: data });
  },
  emitFx(kind, x, y, extra) {
    this.emit('fx', Object.assign({ kind, x, y }, extra || {}));
  },

  sendState() {
    const p = G.me;
    NET.send({
      t: 'p', q: ++G.netT.seq, x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy),
      dir: p.dir, hp: Math.round(p.hp), mp: Math.round(p.mp),
      gl: p.glide, hh: p.holding, he: Input.held('heart'), dn: p.down, wg: p.wing > .3, at: p.atkT < .15, og: p.onGround,
      ht: p.hurtT > .05, ch: p.cheerT > .05, wp: p.weapon || ''
    }, { volatile: true, maxBuffered: 24576 });
  },

  sendWorld() {
    const foes = [];
    for (const e of G.level.foes) {
      if (!e.dead) foes.push([e.id, Math.round(e.x), Math.round(e.y), e.dir, Math.round(e.hp)]);
    }
    const b = G.level.boss;
    const journey = G.level.postBoss;
    const trials = (G.level.loveTrials || []).map(t => [
      t.id, t.done ? 1 : 0, Math.round((t.charge || 0) * 100), t.stage || 0,
      t.skillMask || 0, Math.round((t.travel || 0) * 1000)
    ]);
    const dead = G.level.foes.filter(e => e.dead).map(e => e.id);
    const items = G.level.items
      .filter(it => !it.taken && (it.id[0] === 'w' || it.id[0] === 'd'))
      .map(it => [
        it.id, it.kind, it.weapon || '',
        Math.round((it.grounded || it.anchored) && it._staticX != null ? it._staticX : it.x),
        Math.round((it.grounded || it.anchored) && it._staticY != null ? it._staticY : it.y),
        Math.round(it.vx || 0), Math.round(it.vy || 0),
        (it.grounded || it.anchored) ? 1 : 0
      ]);
    NET.send({
      t: 'w', q: ++G.netT.wseq, love: Math.round(G.love), foes,
      dead, items, trials, gate: G.level.gateOpen ? 1 : 0, shrine: G.level.shrineDone ? 1 : 0,
      bossActive: G.bossActive ? 1 : 0,
      journey: journey ? [journey.unlocked ? 1 : 0, journey.completed ? 1 : 0, Math.round((journey.ready || 0) * 100)] : null,
      cp: [Math.round(G.checkpoint.x), Math.round(G.checkpoint.y)],
      boss: b ? [Math.round(b.x), Math.round(b.y), Math.round(b.hp), b.dying > 0 ? 1 : 0] : null
    }, { volatile: true, maxBuffered: 32768 });
  },

  onNet(m) {
    if (!m || !m.t) return;
    // world messages are only meaningful once we're in the game
    if (m.t !== 'hello' && m.t !== 'init' && (G.state !== 'play' || !G.level)) return;
    switch (m.t) {
      case 'hello': // guest arrived — send them the world
        if (NET.mode === 'host') {
          this.resetNetSmoothing();
          const reconnecting = G.state === 'play' && !G._freshOnlineStart;
          NET.send({
            t: 'init', lvl: G.levelIndex, started: reconnecting, weapons: this.currentLoadout(), diff: G.difficulty,
            cp: G.checkpoint ? [Math.round(G.checkpoint.x), Math.round(G.checkpoint.y)] : null,
            hostP: G.me ? [Math.round(G.me.x), Math.round(G.me.y)] : null
          });
          G._freshOnlineStart = false;
        }
        break;
      case 'init':
        if (NET.mode === 'guest') {
          this.resetNetSmoothing();
          if (m.weapons) G.loadout = Object.assign({ joku: null, jolie: null }, m.weapons);
          if (m.diff) G.difficulty = m.diff;
          if (G.state !== 'play') {
            Main.hideOverlays();
            this.startGame('guest', m.lvl, { loadout: G.loadout, skipStory: m.started });
          } else if (G.levelIndex !== m.lvl) {
            this.loadLevel(m.lvl); // reconnected mid-adventure
            if (m.started) { G.cut = null; G.dialog = null; G.fade = 0; G.fadeDir = -1; }
          } else {
            if (m.diff) this.applyDifficulty(G.level);
            this.applyLoadout();
          }
          if (m.cp) G.checkpoint = { x: m.cp[0], y: m.cp[1] };
          if (m.hostP && G.me && G.mate) {
            G.mate.x = m.hostP[0]; G.mate.y = m.hostP[1];
            G.me.x = m.hostP[0] + 52; G.me.y = World.topAt(G.level, G.me.x) || m.hostP[1];
            G.me.vx = G.me.vy = G.mate.vx = G.mate.vy = 0;
            G.cam.x = G.me.x; G.cam.y = G.me.y - 100;
          }
        }
        break;
      case 'p': this.queueMateState(m); break;
      case 'w': {
        if (G.mode !== 'guest') break;
        if (m.q && G.lastWorldSeq && m.q <= G.lastWorldSeq) break;
        if (m.q) G.lastWorldSeq = m.q;
        G.love = m.love;
        if (m.gate != null) G.level.gateOpen = !!m.gate;
        if (m.shrine != null) G.level.shrineDone = !!m.shrine;
        if (m.bossActive != null) G.bossActive = !!m.bossActive;
        if (m.journey && G.level.postBoss) {
          G.level.postBoss.unlocked = !!m.journey[0];
          G.level.postBoss.completed = !!m.journey[1];
          G.level.postBoss.ready = (m.journey[2] || 0) / 100;
        }
        if (m.cp) G.checkpoint = { x: m.cp[0], y: m.cp[1] };
        if (m.dead) {
          for (const id of m.dead) {
            const e = G.level.foes.find(x => x.id === id);
            if (e) e.dead = true;
          }
        }
        for (const f of m.foes) {
          const e = G.level.foes.find(x => x.id === f[0]);
          if (e && !e.dead) { e.tx = f[1]; e.ty = f[2]; e.dir = f[3]; e.hp = f[4]; }
        }
        if (m.items) {
          const liveItems = new Set();
          for (const it of m.items) {
            liveItems.add(it[0]);
            const local = G.level.items.find(x => x.id === it[0]);
            if (local) {
              local.x = it[3]; local.y = it[4];
              local.vx = it[5] || 0; local.vy = it[6] || 0; local.grounded = !!it[7];
              if (local.grounded) this.freezeWeaponItem(local, local.x, local.y);
              else { local.anchored = false; local._staticX = null; local._staticY = null; local.owner = null; local.follow = false; }
              continue;
            }
            if (it[1] === 'weapon') {
              const dropped = this.weaponDropItem(it[2] || 'tideSpear', it[3], it[4], it[5] || 0, it[6] || 0, it[0]);
              if (it[7]) this.freezeWeaponItem(dropped, it[3], it[4]);
              G.level.items.push(dropped);
            } else {
              G.level.items.push({ id: it[0], kind: it[1], weapon: it[2] || null, x: it[3], y: it[4], taken: false });
            }
          }
          for (const it of G.level.items) {
            if (!it.taken && (it.id[0] === 'w' || it.id[0] === 'd') && !liveItems.has(it.id)) it.taken = true;
          }
        }
        if (m.trials) {
          for (const tr of m.trials) {
            const local = (G.level.loveTrials || []).find(x => x.id === tr[0]);
            if (!local) continue;
            const wasDone = !!local.done;
            const oldStage = local.stage || 0;
            const oldMask = local.skillMask || 0;
            const nextStage = tr[3] || 0;
            const nextMask = tr[4] || 0;
            local.charge = (tr[2] || 0) / 100;
            local.stage = nextStage;
            local.skillMask = oldMask | nextMask;
            local.travel = Math.max(local.travel || 0, (tr[5] || 0) / 1000);
            for (const [char, bit] of [['joku', 1], ['jolie', 2]]) {
              if (!(oldMask & bit) && (nextMask & bit)) this.trialSkillVisual(local, char);
            }
            if (oldStage < 3 && nextStage === 3) this.announceTrialPower(local);
            if (oldStage < 4 && nextStage === 4) this.startTrialTraversal(local, true);
            if (!wasDone && tr[1]) this.finishLoveTrial(local, true);
            else local.done = !!tr[1];
          }
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
        this.addProj({ kind: d.kind, color: d.color, x: d.x, y: d.y, vx: d.vx, vy: d.vy, dmg: d.foe ? (d.dmg || 14) : 0, life: d.life, g: d.g, mine: false, foe: !!d.foe }, true);
        if (d.kind === 'phoenix') SND.sfx('shootJ');
        else if (d.kind === 'petal') SND.sfx('shootP');
        break;
      case 'pick': {
        const it = G.level.items.find(x => x.id === d.id);
        if (it) this.pickup(it, d.by, true);
        break;
      }
      case 'drop':
        {
          let item = G.level.items.find(x => x.id === d.id);
          if (!item) {
            item = d.kind === 'weapon'
              ? this.weaponDropItem(d.weapon, d.x, d.y, d.vx || 0, d.vy || 40, d.id)
              : { id: d.id, kind: d.kind, weapon: d.weapon, x: d.x, y: d.y, taken: false };
            G.level.items.push(item);
          } else {
            item.kind = d.kind; item.weapon = d.weapon; item.x = d.x; item.y = d.y; item.taken = false;
            if (d.kind === 'weapon') { item.vx = 0; item.vy = d.vy || 40; item.grounded = false; item.anchored = false; item._staticX = null; item._staticY = null; item.owner = null; item.follow = false; }
          }
        }
        if (d.kind === 'weapon') { SND.sfx('weaponDrop'); this.weaponBurst(d.x, d.y, d.weapon, .85); }
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
        const pl = G.level.plats.find(p => p.type === 'ground' && d.x >= p.x && d.x <= p.x + p.w) || G.level.plats[G.level.plats.length - 1];
        const type = d.type || 'slime';
        const hp = d.hp || (type === 'golem' ? 145 : type === 'thorn' ? 85 : type === 'slime' ? 55 : 58);
        G.level.foes.push({
          id: d.id, type, variant: d.variant || G.level.theme, x: d.x, y: d.y, homeX: d.x, homeY: d.y, plat: pl, tx: d.x, ty: d.y,
          vx: 0, vy: 0, dir: 1, hp, maxHp: hp, dmg: d.dmg || 13, t: 0, atkT: 1, hopY: 0, flash: 0, hurtShow: 0, dead: false
        });
        break;
      }
      case 'love': this.applyLove(d.kind, d.x); break;
      case 'trial': {
        const tr = (G.level.loveTrials || []).find(x => x.id === d.id);
        this.finishLoveTrial(tr, true);
        break;
      }
      case 'trialSkill': {
        if (G.mode !== 'host' || !d || d.char !== G.mate.char) break;
        const tr = (G.level.loveTrials || []).find(x => x.id === d.id);
        this.activateTrialSkill(tr, d.char, true);
        break;
      }
      case 'trialRide': {
        if (G.mode !== 'guest') break;
        const tr = (G.level.loveTrials || []).find(x => x.id === d.id);
        this.startTrialTraversal(tr, true);
        break;
      }
      case 'down':
        SND.sfx('down');
        this.toastMsg('💔 ' + Story.t(G.mate.char === 'joku' ? 'downJoku' : 'downJolie'));
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
      case 'journey': {
        const journey = G.level.postBoss;
        if (!journey) break;
        const wasLocked = !journey.unlocked;
        if (d.unlocked != null) journey.unlocked = !!d.unlocked;
        if (d.completed != null) journey.completed = !!d.completed;
        if (d.ready != null) journey.ready = Math.min(1, (d.ready || 0) / 100);
        if (wasLocked && journey.unlocked) {
          const info = Story.dateJourney(G.levelIndex);
          G.announce = { txt: Story.t('dateJourney'), sub: info.title, t: 3.8 };
          SND.sfx('gate');
        }
        if (d.victory) this.startChapterVictory(!!d.final, true);
        break;
      }
      case 'fx':
        if (d.kind === 'dash') { SND.sfx('dash'); }
        if (d.kind === 'bloom') { SND.sfx('bloom'); this.addAura(d.x, d.y, false); }
        if (d.kind === 'weapon') {
          const def = Weapons[d.weapon] || Weapons.tideSpear;
          SND.sfx('weaponPickup');
          this.weaponBurst(d.x, d.y - 45, d.weapon, .55);
          if (!G.me.down && U.dist(G.me.x, G.me.y, d.x, d.y) < 320) {
            if (['heartHeal', 'loveBeacon', 'pandaGift'].includes(d.special)) {
              G.me.hp = Math.min(G.me.maxHp, G.me.hp + (d.special === 'pandaGift' ? 18 : 24));
              G.me.mp = Math.min(G.me.maxMp, G.me.mp + (d.special === 'pandaGift' ? 24 : 8));
              if (G.mode !== 'guest') this.loveAdd(d.special === 'loveBeacon' ? 18 : 6);
              Ptc.burst('heart', G.me.x, G.me.y - 48, 10, { sp: 110, r: 6, life: 1 });
            } else if (['sunGuard', 'auroraShield'].includes(d.special)) {
              G.me.invuln = Math.max(G.me.invuln, d.special === 'sunGuard' ? 2.0 : 1.3);
              Ptc.add({ kind: 'ring', x: G.me.x, y: G.me.y - 32, vx: 0, vy: 0, r: 110, life: .7, color: def.color + 'cc' });
            } else if (d.special === 'dreamSong') {
              if (G.mode !== 'guest') this.loveAdd(10);
              Ptc.text(G.me.x, G.me.y - 78, '♪', def.color);
            }
          }
        }
        break;
    }
  },

  drawDateJourney(ctx, journey, pal, t, viewL, viewR) {
    if (!journey || journey.end < viewL || journey.start > viewR) return;
    const colors = {
      forest: ['#b6f4a0', '#ffb4d6'], falls: ['#a8ecff', '#fff2ae'], blossom: ['#ffafd8', '#fff0b5'],
      shadow: ['#c5a6ff', '#a9edff'], ember: ['#ffad80', '#9eeeff'], star: ['#fff2ad', '#cbb8ff'],
      village: ['#f4d66e', '#9be27d']
    }[journey.theme] || ['#ffd0e6', '#b5efff'];
    const active = journey.unlocked ? 1 : .28;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < journey.lights.length; i++) {
      const light = journey.lights[i];
      if (light.x < viewL - 60 || light.x > viewR + 60) continue;
      const pulse = .38 + Math.sin(t * 2.4 + light.phase) * .16;
      Art.glow(ctx, light.x, light.y, light.size * (1 + pulse), colors[i % colors.length], active * (.45 + pulse));
      if (journey.unlocked && i % 2 === 0) Art.star(ctx, light.x, light.y, 4.5, colors[(i + 1) % colors.length]);
    }
    const ready = journey.ready || 0;
    Art.glow(ctx, journey.doorX, journey.doorY - 115, 64 + ready * 58, '#ffb6db', active * (.28 + ready * .52));
    if (journey.unlocked && typeof ASSETS !== 'undefined' && ASSETS.has && ASSETS.has('fx_rings')) {
      ASSETS.draw(ctx, 'fx_rings', journey.theme === 'star' ? 5 : 0, journey.doorX, journey.doorY - 112, {
        h: 128 + ready * 34, anchor: 'center', add: 1, alpha: .22 + ready * .38, rot: t * .22
      });
    }
    ctx.globalCompositeOperation = 'source-over';

    const nearDoor = Math.abs(G.me.x - journey.doorX) < 170 || Math.abs(G.mate.x - journey.doorX) < 170;
    Art.drawGate(ctx, journey.doorX, journey.doorY, t, nearDoor && journey.unlocked);
    if (journey.unlocked && journey.doorX > viewL && journey.doorX < viewR) {
      const info = Story.dateJourney(G.levelIndex);
      ctx.textAlign = 'center';
      ctx.font = '600 14px Fredoka, sans-serif';
      ctx.fillStyle = 'rgba(255,243,220,.94)';
      ctx.shadowColor = 'rgba(12,8,20,.82)'; ctx.shadowBlur = 7;
      ctx.fillText(info.title, journey.doorX, journey.doorY - 238);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
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
      const drawH = H, drawW = (layer.w || 1920) * (H / 1080);
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
    if (typeof ASSETS !== 'undefined' && ASSETS.drawVillageProp) {
      for (const prop of (L.culturalProps || [])) {
        if (prop.x < viewL - 180 || prop.x > viewR + 180) continue;
        ASSETS.drawVillageProp(ctx, prop, t);
      }
    }
    this.drawDateJourney(ctx, L.postBoss, pal, t, viewL, viewR);
    for (const ob of (L.coopObstacles || [])) {
      if (ob.x + ob.w < viewL || ob.x > viewR) continue;
      const tr = (L.loveTrials || []).find(x => x.id === ob.trialId);
      Art.drawCoopObstacle(ctx, ob, tr, pal, t);
    }
    // shrine & gate
    if (L.shrineX) Art.drawShrine(ctx, L.shrineX, L.shrineY, t, L.shrineDone);
    if (L.gateX) Art.drawGate(ctx, L.gateX, L.gateY, t, L.gateOpen || (Math.abs(G.me.x - L.gateX) < 160 && Math.abs(G.mate.x - L.gateX) < 160));
    for (const tr of (L.loveTrials || [])) {
      if (tr.x < viewL || tr.x > viewR) continue;
      Art.drawLoveTrial(ctx, tr, t);
    }
    for (const tr of (L.loveTrials || [])) {
      const fx = tr.rideX != null ? tr.rideX : tr.x;
      if ((tr.stage || 0) < 3 || fx < viewL - 280 || fx > viewR + 280) continue;
      Art.drawTrialTraversal(ctx, tr, t);
    }

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
    if (L.boss && !L.boss.dead && (G.bossActive || L.boss.dying > 0)) {
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
    if (L.boss && !L.boss.dead && (G.bossActive || L.boss.dying > 0)) Art.drawBoss(ctx, L.boss, t);

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
    const dog = G.pets.find(p => p.kind === 'dog'), panda = G.pets.find(p => p.kind === 'panda');
    if (dog) this.drawPetCard(ctx, 10, ch + 14, small ? 116 : 142, small ? 30 : 34, dog, small);
    if (panda) this.drawPetCard(ctx, W - (small ? 116 : 142) - 10, ch + 14, small ? 116 : 142, small ? 30 : 34, panda, small);

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

    const miniBoss = this.currentBossThreat();
    if (L.boss && (G.bossActive || L.boss.dying > 0)) {
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
        ctx.fillText(b.bossName || 'Chapter Boss', W / 2, py + 42);
      }
    } else if (miniBoss && miniBoss.bossTier) {
      const bw = Math.min(360, W * .38);
      ctx.fillStyle = 'rgba(10,6,20,.65)';
      ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, py + 18, bw, 10, 5); ctx.fill();
      const frac = Math.max(0, miniBoss.hp / miniBoss.maxHp);
      ctx.fillStyle = '#ff86b8';
      if (frac > 0) { ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2 + 1, py + 19, (bw - 2) * frac, 8, 4); ctx.fill(); }
      ctx.font = `600 ${small ? 10 : 11}px Fredoka, sans-serif`;
      ctx.fillStyle = '#ffd7ec';
      ctx.fillText(miniBoss.bossName || 'Strong Boss', W / 2, py + 42);
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
    const bossHud = (L.boss && (G.bossActive || L.boss.dying > 0)) || (miniBoss && miniBoss.bossTier);
    const lw = small ? 120 : 170, lx = W / 2 - lw / 2, ly = py + (bossHud ? 48 : 32);
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
    if (G.me.weapon && Weapons[G.me.weapon]) {
      const def = Weapons[G.me.weapon];
      const wy = ly + (full ? 42 : 27);
      Art.drawWeaponGlyph(ctx, G.me.weapon, W / 2 - (small ? 62 : 76), wy - 6, small ? 18 : 22, G.time);
      ctx.font = `600 ${small ? 10 : 12}px Fredoka, sans-serif`;
      ctx.fillStyle = def.color;
      ctx.fillText(def.name + ' - ' + def.skill, W / 2 + 8, wy);
    }
    this.drawSkillCooldowns(ctx, W / 2, ly + (full ? 62 : 47), small);

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
      ctx.fillText(`${Story.NAMES[G.mate.char]} can revive you (hold ❤ close) — or respawn in ${Math.ceil(20 - G.me.downT)}s`, W / 2, H * .3 + 30);
      ctx.shadowBlur = 0;
    }
  },

  drawSkillCooldowns(ctx, cx, y, small) {
    const p = G.me;
    if (!p) return;
    const w = p.weapon && Weapons[p.weapon] ? Weapons[p.weapon] : null;
    const items = [
      { icon: '⚔', kit: 'attack', label: 'Atk', cd: Math.max(0, p.atkCd) / (p.char === 'joku' ? .38 : .46), color: '#ffffff' },
      { icon: p.char === 'joku' ? '🌊' : '🌸', kit: p.char === 'joku' ? 'water' : 'heart', label: 'Sp', cd: Math.max(0, p.spCd) / 2.2, color: p.char === 'joku' ? '#7fd8ff' : '#ff9fce' },
      { icon: w ? w.skillIcon : '✦', kit: w && ['heartHeal', 'loveBeacon', 'pandaGift'].includes(w.special) ? 'gift' : 'star', label: 'Wpn', cd: w ? Math.max(0, p.weaponCd || 0) / (w.cd || 6) : 1, color: w ? w.color : '#fff3a8' },
    ];
    const r = small ? 12 : 14;
    const gap = small ? 34 : 40;
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < items.length; i++) {
      const it = items[i], x = cx + (i - (items.length - 1) / 2) * gap;
      ctx.fillStyle = 'rgba(8,18,30,.62)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = it.color + 'aa';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.stroke();
      const cd = U.clamp(it.cd || 0, 0, 1);
      if (cd > .01) {
        ctx.fillStyle = 'rgba(4,8,14,.74)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r + 1, -Math.PI / 2, -Math.PI / 2 + U.TAU * cd);
        ctx.closePath(); ctx.fill();
      }
      const kitDrawn = typeof ASSETS !== 'undefined' && ASSETS.drawUiKit &&
        ASSETS.drawUiKit(ctx, it.kit, x - r * .72, y - r * .72, r * 1.44, r * 1.44, { alpha: cd > .01 ? .58 : 1 });
      if (!kitDrawn) {
        ctx.font = `${small ? 12 : 14}px Fredoka, sans-serif`;
        ctx.fillStyle = cd > .01 ? 'rgba(255,255,255,.58)' : '#ffffff';
        ctx.fillText(it.icon, x, y + (small ? 4 : 5));
      }
      ctx.font = `600 ${small ? 8 : 9}px Fredoka, sans-serif`;
      ctx.fillStyle = cd > .01 ? 'rgba(220,235,245,.62)' : it.color;
      const max = it.label === 'Sp' ? 2.2 : it.label === 'Wpn' && w ? (w.cd || 6) : .45;
      ctx.fillText(cd > .01 ? (it.label === 'Wpn' && !w ? '-' : Math.ceil(cd * max) + 's') : 'ready', x, y + r + 10);
    }
    ctx.restore();
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

  drawPetCard(ctx, x, y, w, h, pet, small) {
    const name = Story.NAMES[pet.kind] || pet.kind;
    ctx.fillStyle = 'rgba(8,24,34,.48)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = pet.kind === 'dog' ? 'rgba(110,190,255,.45)' : 'rgba(255,150,200,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `700 ${small ? 9 : 10}px Fredoka, sans-serif`;
    ctx.fillStyle = pet.kind === 'dog' ? '#aadfff' : '#ffc4dc';
    ctx.fillText(name, x + 8, y + 11);
    const bx = x + (small ? 52 : 62), bw = w - (small ? 60 : 72), hpY = y + 6;
    const hp = U.clamp(pet.hp / pet.maxHp, 0, 1), mp = U.clamp(pet.mp / pet.maxMp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.beginPath(); ctx.roundRect(bx, hpY, bw, 7, 3.5); ctx.fill();
    ctx.fillStyle = '#e85858';
    ctx.beginPath(); ctx.roundRect(bx + 1, hpY + 1, Math.max(0, (bw - 2) * hp), 5, 2.5); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.beginPath(); ctx.roundRect(bx, hpY + 11, bw * .85, 6, 3); ctx.fill();
    ctx.fillStyle = '#4fc8ff';
    ctx.beginPath(); ctx.roundRect(bx + 1, hpY + 12, Math.max(0, (bw * .85 - 2) * mp), 4, 2); ctx.fill();
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
    const fit = (text, maxSize, minSize, maxWidth, weight) => {
      let size = maxSize;
      while (size > minSize) {
        ctx.font = `${weight} ${size}px Fredoka, sans-serif`;
        if (ctx.measureText(String(text)).width <= maxWidth) break;
        size--;
      }
      return size;
    };
    const wrap = (text, maxWidth, size, weight, maxLines = 3) => {
      ctx.font = `${weight} ${size}px Fredoka, sans-serif`;
      const words = String(text || '').split(/\s+/);
      const lines = [];
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const next = line ? line + ' ' + word : word;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          if (lines.length === maxLines - 1) {
            const rest = words.slice(i);
            let last = '';
            let used = 0;
            while (used < rest.length) {
              const candidate = last ? last + ' ' + rest[used] : rest[used];
              const suffix = used < rest.length - 1 ? '...' : '';
              if (last && ctx.measureText(candidate + suffix).width > maxWidth) break;
              last = candidate;
              used++;
            }
            lines.push(last + (used < rest.length ? '...' : ''));
            return lines;
          }
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      return lines.slice(0, maxLines);
    };
    ctx.save();
    ctx.globalAlpha = U.clamp(k, 0, 1);
    ctx.textAlign = 'center';
    const phoneLandscape = H < 500 && W < 1000;
    const textWidth = phoneLandscape ? W * .44 : W * .9;
    const titleY = phoneLandscape ? Math.max(152, H * .38) : H * .3;
    const titleSize = fit(a.txt, phoneLandscape ? 29 : Math.min(46, W * .06), phoneLandscape ? 17 : 21, textWidth, 700);
    ctx.font = `700 ${titleSize}px Fredoka, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14;
    const gr = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
    gr.addColorStop(0, '#7fd8ff'); gr.addColorStop(1, '#ffa9d8');
    ctx.fillStyle = gr;
    ctx.fillText(a.txt, W / 2, titleY);
    const subSize = phoneLandscape ? 12 : Math.max(12, Math.min(18, W * .024));
    const lines = wrap(a.sub, textWidth, subSize, 600, phoneLandscape ? 4 : 3);
    ctx.font = `600 ${subSize}px Fredoka, sans-serif`;
    ctx.fillStyle = '#e8f4fc';
    const subY = titleY + (phoneLandscape ? 24 : 32);
    lines.forEach((line, i) => ctx.fillText(line, W / 2, subY + i * (subSize + 4)));
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
      const drawW = (layer.w || 1920) * (H / 1080);
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
