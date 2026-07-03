'use strict';
/* ============ players, pets, enemies, boss, projectiles ============ */
const Ent = {
  GRAV: 2300, SPEED: 330, JUMP: -800, JUMP2: -700,

  makePlayer(char) {
    return {
      char, x: 0, y: 0, vx: 0, vy: 0, dir: 1, half: 10,
      onGround: false, coyote: 0, jumps: 0, glide: false,
      hp: 100, maxHp: 100, mp: 100, maxMp: 100,
      atkCd: 0, spCd: 0, atkT: 9, dashT: 0, wing: 0,
      animT: 0, squash: 0, blink: 0, blinkT: 3,
      pose: null, poseT: 0, down: false, downT: 0,
      invuln: 0, hurtCd: 0, holding: false,
      safeX: 140, safeY: 400, remote: false, bot: false,
    };
  },

  makePet(kind, owner) {
    return { kind, owner, x: owner.x - 50, y: owner.y, vx: 0, dir: 1, animT: 0, emoteT: 4 };
  },

  localInput() {
    return {
      ax: Input.axisX(),
      jump: Input.take('jump'),
      jumpHeld: Input.held('jump'),
      attack: Input.take('attack') || Input.held('attack'),
      special: Input.take('special'),
    };
  },

  /* ---------------- player ---------------- */
  updatePlayer(p, dt, inp) {
    const L = G.level;
    if (p.down) { // knocked out — just settle on the ground
      p.vx *= (1 - 6 * dt); p.vy += this.GRAV * dt;
      this._movePlayer(p, dt);
      p.animT += dt;
      return;
    }
    const locked = G.cut || G.dialog; // cutscene/dialog: stand still (cutscene moves chars itself)
    const ax = locked ? 0 : inp.ax;
    const speedMul = p.holding ? 1.18 : 1;

    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dir * 900;
      p.vy = 0;
      p.wing = 1;
      if (Math.random() < .6) Ptc.burst('dot', p.x - p.dir * 14, p.y - 28, 1, { color: '#7fd8ff', sp: 60, r: 9, life: .4 });
      if (Math.random() < .4) Ptc.burst('drop', p.x, p.y - 20, 1, { sp: 140, up: 60, g: 700, r: 5, life: .5 });
      // dash damages enemies (owner side authoritative)
      if (!p.remote) {
        for (const e of G.enemiesAll()) {
          if (e.dead || e.dying > 0) continue;
          if (Math.abs(e.x - p.x) < 34 && Math.abs((e.y - 14) - (p.y - 26)) < 44 && (!e._dashCd || e._dashCd <= 0)) {
            e._dashCd = .5;
            Game.hitEnemy(e, 45, p.char);
          }
        }
      }
    } else {
      // horizontal
      const target = ax * this.SPEED * speedMul;
      const accel = p.onGround ? 2800 : 1900;
      if (p.vx < target) p.vx = Math.min(target, p.vx + accel * dt);
      else p.vx = Math.max(target, p.vx - accel * dt);
      if (ax !== 0 && p.atkT > .2) p.dir = ax > 0 ? 1 : -1;

      // jumping
      if (!locked && inp.jump) {
        if (p.coyote > 0) {
          p.vy = this.JUMP; p.coyote = 0; p.jumps = 1; p.onGround = false;
          p.squash = -.2; SND.sfx('jump');
          Ptc.burst('dot', p.x, p.y, 4, { color: '#cfeaff', sp: 90, r: 5, life: .35 });
        } else if (p.jumps > 0) {
          p.vy = this.JUMP2; p.jumps--;
          p.wing = 1; SND.sfx('jump2');
          if (p.char === 'jolie') Ptc.burst('petal', p.x, p.y - 20, 7, { sp: 130, r: 5, life: .7 });
          else Ptc.burst('dot', p.x, p.y - 20, 7, { color: '#6fc8ff', sp: 130, r: 7, life: .5 });
        }
      }
      // variable jump height + gravity
      let grav = this.GRAV;
      if (p.vy < 0 && !inp.jumpHeld) grav *= 1.9;
      p.glide = false;
      if (p.char === 'jolie' && !p.onGround && p.vy > 0 && inp.jumpHeld) {
        p.glide = true;
        p.vy = Math.min(p.vy + grav * dt * .12, 135);
      } else {
        p.vy += grav * dt;
      }
      p.vy = Math.min(p.vy, 1400);
    }

    // attack
    if (!locked && inp.attack && p.atkCd <= 0 && p.atkT > .18) {
      p.atkCd = p.char === 'joku' ? .38 : .46;
      p.atkT = 0;
      if (p.char === 'joku') {
        SND.sfx('shootJ');
        Game.addProj({ kind: 'phoenix', x: p.x + p.dir * 16, y: p.y - 36, vx: p.dir * 620, vy: 0, dmg: 26, life: 1.1, mine: !p.remote, owner: p.char });
      } else {
        SND.sfx('shootP');
        for (const sp of [-.22, 0, .22]) {
          Game.addProj({ kind: 'petal', x: p.x + p.dir * 14, y: p.y - 36, vx: p.dir * 540 * Math.cos(sp), vy: 540 * Math.sin(sp), dmg: 11, life: .9, mine: !p.remote, owner: p.char });
        }
      }
    }
    // special
    if (!locked && inp.special && p.spCd <= 0 && p.mp >= 35) {
      p.mp -= 35; p.spCd = 2.2; p.atkT = 0;
      if (p.char === 'joku') {
        p.dashT = .32; p.invuln = Math.max(p.invuln, .45);
        SND.sfx('dash');
        Game.emitFx('dash', p.x, p.y);
      } else {
        SND.sfx('bloom');
        Game.addAura(p.x, p.y, !p.remote);
        Game.emitFx('bloom', p.x, p.y);
      }
    }

    this._movePlayer(p, dt);

    // fell into the misty pits
    if (p.y > World.DEATH_Y && !p._fell) { p._fell = true; Game.fell(p); }

    // passive regen
    p.mp = Math.min(p.maxMp, p.mp + 7 * dt);

    // timers
    p.atkCd -= dt; p.spCd -= dt; p.atkT += dt;
    p.invuln -= dt; p.hurtCd -= dt;
    p.wing = Math.max(0, p.wing - dt * (p.dashT > 0 ? 0 : 1.6));
    p.squash *= (1 - 9 * dt);
    p.coyote -= dt;
    p.blinkT -= dt; p.blink -= dt;
    if (p.blinkT <= 0) { p.blink = .13; p.blinkT = 2 + Math.random() * 3; }
    p.animT += dt * Math.min(1.4, Math.abs(p.vx) / 300 + .0001);
    if (p.poseT > 0) { p.poseT -= dt; if (p.poseT <= 0 && !G.cut) p.pose = null; }
  },

  _movePlayer(p, dt) {
    const L = G.level;
    const prevFeet = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = U.clamp(p.x, -370, L.width + 370);

    // one-way platform tops
    let landed = false;
    if (p.vy >= 0) {
      for (const pl of World.platsNear(L, p.x)) {
        const top = pl.y;
        if (p.x > pl.x - 8 && p.x < pl.x + pl.w + 8 && prevFeet <= top + 6 && p.y >= top) {
          p.y = top; landed = true;
          if (p.vy > 620) { p.squash = .3; Ptc.burst('dot', p.x, p.y, 5, { color: '#b8d8c8', sp: 80, r: 4, life: .3 }); }
          p.vy = 0;
          break;
        }
      }
    }
    if (landed) {
      p.onGround = true; p.coyote = .13; p.jumps = 1; p._fell = false;
      // remember a safe respawn spot away from edges
      const top = World.topAt(L, p.x - 34), top2 = World.topAt(L, p.x + 34);
      if (top !== null && top2 !== null) { p.safeX = p.x; p.safeY = p.y; }
    } else if (p.coyote <= 0) {
      p.onGround = false;
    } else if (p.vy > 40) {
      p.onGround = false;
    }
  },

  /* ---------------- solo partner bot ---------------- */
  botInput(bot, dt) {
    const me = G.me, L = G.level;
    const inp = { ax: 0, jump: false, jumpHeld: bot.vy < -50, attack: false, special: false };
    if (G.cut || G.dialog) return inp;
    bot._thinkT = (bot._thinkT || 0) - dt;

    // stuck / far behind → magic catch-up
    if (Math.abs(me.x - bot.x) > 950 || bot.y > World.DEATH_Y - 60) {
      bot.x = me.x - 60 * me.dir; bot.y = me.y - 10; bot.vx = 0; bot.vy = 0;
      Ptc.burst('heart', bot.x, bot.y - 30, 6, { sp: 80, r: 6, life: .8 });
      return inp;
    }
    // revive the player
    if (me.down) {
      const dx = me.x - bot.x;
      if (Math.abs(dx) > 26) inp.ax = Math.sign(dx);
      return inp;
    }
    // pick a fight if an enemy is close
    let foe = null, fd = 260;
    for (const e of G.enemiesAll()) {
      if (e.dead || e.dying > 0) continue;
      const d = Math.abs(e.x - bot.x);
      if (d < fd && Math.abs(e.y - bot.y) < 140) { fd = d; foe = e; }
    }
    if (foe && bot.atkCd <= 0) {
      bot.dir = foe.x > bot.x ? 1 : -1;
      inp.attack = true;
      if (fd > 120) inp.ax = bot.dir * .5;
      return inp;
    }
    // follow the player
    const dx = me.x - bot.x;
    if (Math.abs(dx) > 85) inp.ax = Math.sign(dx);
    else if (Math.abs(dx) > 55) inp.ax = Math.sign(dx) * .4;

    // jump over gaps / follow upward
    if (bot.onGround) {
      const aheadX = bot.x + Math.sign(dx || bot.dir) * 74;
      const ahead = World.topAt(L, aheadX, bot.y - 140);
      if (inp.ax !== 0 && (ahead === null || ahead < bot.y - 50)) inp.jump = true;
      if (me.y < bot.y - 70 && Math.abs(dx) < 220) inp.jump = true;
    } else if (bot.vy > 300) {
      const below = World.topAt(L, bot.x, bot.y);
      if (below === null && bot.jumps > 0) inp.jump = true; // air-save double jump
      inp.jumpHeld = true; // jolie glides
    }
    return inp;
  },

  /* ---------------- pets ---------------- */
  updatePet(pet, dt) {
    const o = pet.owner, L = G.level;
    const tx = o.x - o.dir * 44;
    const dx = tx - pet.x;
    pet.vx = U.clamp(dx * 4.5, -460, 460);
    if (Math.abs(dx) < 6) pet.vx = 0;
    pet.x += pet.vx * dt;
    if (Math.abs(pet.vx) > 20) pet.dir = pet.vx > 0 ? 1 : -1;
    else pet.dir = o.dir;

    const top = World.topAt(L, pet.x, pet.y - 120);
    const ty = (top !== null) ? top : o.y;
    pet.y += (ty - pet.y) * Math.min(1, 12 * dt);
    if (Math.abs(pet.x - o.x) > 700) { pet.x = o.x - o.dir * 44; pet.y = o.y; }
    pet.animT += dt * Math.min(1.4, Math.abs(pet.vx) / 300 + .0001);

    // pets attract nearby goodies toward their owner
    for (const it of G.level.items) {
      if (it.taken) continue;
      if (Math.abs(it.x - pet.x) < 120 && Math.abs(it.y - pet.y) < 120) {
        const d = Math.max(1, U.dist(it.x, it.y, o.x, o.y - 26));
        it.x += (o.x - it.x) / d * 340 * dt;
        it.y += (o.y - 26 - it.y) / d * 340 * dt;
      }
    }
    // occasional cuteness
    pet.emoteT -= dt;
    if (pet.emoteT <= 0) {
      pet.emoteT = 5 + Math.random() * 6;
      Ptc.add({ kind: 'heart', x: pet.x, y: pet.y - 34, vx: 0, vy: -30, r: 5, life: 1, color: pet.kind === 'dog' ? '#8fc8ff' : '#ffb3d6' });
    }
  },

  /* ---------------- enemies (host / solo authoritative) ---------------- */
  updateEnemies(dt) {
    const L = G.level;
    for (const e of L.foes) {
      if (e.dead) continue;
      e.t += dt; e.flash -= dt; e.hurtShow -= dt; e.atkT -= dt;
      if (e._dashCd) e._dashCd -= dt;
      const tgt = Game.nearestPlayer(e.x, e.y);
      switch (e.type) {
        case 'slime': {
          if (e.hopY === 0 && e.vy === 0) { // grounded
            e.vx = 0;
            if (e.atkT <= 0 && tgt && Math.abs(tgt.x - e.x) < 520) {
              e.dir = tgt.x > e.x ? 1 : -1;
              e.vx = e.dir * 170; e.vy = -430; e.atkT = 1.15;
            }
          }
          e.vy += 1900 * dt;
          e.x = U.clamp(e.x + e.vx * dt, e.plat.x + 16, e.plat.x + e.plat.w - 16);
          e.y += e.vy * dt;
          if (e.y >= e.plat.y) { e.y = e.plat.y; e.vy = 0; e.vx = 0; }
          e.hopY = e.plat.y - e.y;
          break;
        }
        case 'thorn': {
          let sp = 62;
          if (tgt && Math.abs(tgt.x - e.x) < 260 && Math.abs(tgt.y - e.y) < 90) {
            e.dir = tgt.x > e.x ? 1 : -1; sp = 215;
          }
          e.x += e.dir * sp * dt;
          if (e.x < e.plat.x + 18 || e.x > e.plat.x + e.plat.w - 18 || Math.abs(e.x - e.homeX) > 260) {
            e.dir *= -1;
            e.x = U.clamp(e.x, e.plat.x + 18, e.plat.x + e.plat.w - 18);
          }
          e.y = e.plat.y;
          break;
        }
        case 'wisp': {
          e.x = e.homeX + Math.sin(e.t * .8) * 62;
          e.y = e.homeY + Math.sin(e.t * 1.5) * 26;
          if (e.atkT <= 0 && tgt && U.dist(tgt.x, tgt.y, e.x, e.y) < 470) {
            e.atkT = 2.7;
            const a = Math.atan2((tgt.y - 30) - e.y, tgt.x - e.x);
            Game.addProj({ kind: 'darkball', x: e.x, y: e.y - 14, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, dmg: e.dmg, life: 3, mine: false, foe: true, host: true });
          }
          break;
        }
      }
    }
  },

  /* ---------------- boss ---------------- */
  updateBoss(dt) {
    const b = G.level.boss;
    if (!b || b.dead) return;
    b.t += dt; b.flash -= dt; b.hurtShow -= dt;
    if (b.dying > 0) { b.dying += dt; b.y += Math.sin(b.t * 2) * dt * 10 - 14 * dt; return; }

    b.phase = b.hp < b.maxHp / 3 ? 2 : (b.hp < b.maxHp * 2 / 3 ? 1 : 0);
    const speedUp = 1 + b.phase * .3;
    b.modeT -= dt * speedUp;

    const mid = Game.playersMidX();
    switch (b.mode) {
      case 'idle': {
        b.x += U.clamp(mid - b.x, -90, 90) * dt * .8;
        b.x = U.clamp(b.x, 320, G.level.width - 320);
        b.y = b.homeY + Math.sin(b.t * 1.4) * 26;
        if (b.modeT <= 0) {
          b._cycle = ((b._cycle || 0) + 1) % 3;
          b.mode = ['slam', 'volley', 'summon'][b._cycle];
          b.modeT = b.mode === 'slam' ? .85 : (b.mode === 'volley' ? .7 : .5);
          if (b.mode === 'slam') b._slamX = U.clamp(mid, 320, G.level.width - 320);
        }
        break;
      }
      case 'slam': { // telegraph: rise & shudder, then crash
        if (!b._slammed) {
          b.x += (b._slamX - b.x) * Math.min(1, 3 * dt);
          b.y -= 120 * dt;
          if (b.modeT <= 0) { b._slammed = true; }
        } else {
          b.y += 1500 * dt;
          if (b.y >= 442) {
            b.y = 442;
            b._slammed = false;
            Game.bossSlam(b.x);
            b.mode = 'recover'; b.modeT = 1.1;
          }
        }
        break;
      }
      case 'volley': {
        if (b.modeT <= 0) {
          const n = 6 + b.phase * 2;
          for (let i = 0; i < n; i++) {
            const a = Math.PI * .25 + (i / (n - 1)) * Math.PI * .5;
            Game.addProj({ kind: 'darkball', x: b.x, y: b.y - 10, vx: Math.cos(a) * -0 + Math.cos(Math.PI - a) * 270, vy: Math.sin(a) * 270 * -1 + 120, dmg: 14, life: 4, mine: false, foe: true, host: true, g: 260 });
          }
          SND.sfx('boss');
          b.mode = 'recover'; b.modeT = 1.4;
        }
        break;
      }
      case 'summon': {
        if (b.modeT <= 0) {
          Game.bossSummon();
          b.mode = 'recover'; b.modeT = 1.6;
        }
        break;
      }
      case 'recover': {
        b.y += (b.homeY - b.y) * Math.min(1, 2 * dt);
        if (b.modeT <= 0) { b.mode = 'idle'; b.modeT = 2.6 - b.phase * .4; }
        break;
      }
    }
  },

  /* ---------------- projectiles ---------------- */
  updateProjectiles(dt) {
    const L = G.level;
    for (let i = G.projs.length - 1; i >= 0; i--) {
      const pr = G.projs[i];
      pr.t += dt;
      if (pr.g) pr.vy += pr.g * dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      let dead = pr.t >= pr.life;

      if (pr.kind === 'shock') { // hugs the ground
        const top = World.topAt(L, pr.x);
        if (top !== null) pr.y = top;
        if (Math.random() < .5) Ptc.burst('dot', pr.x, pr.y - 6, 1, { color: '#9e5eff', sp: 40, r: 6, life: .3 });
      }
      if (pr.kind === 'phoenix' && Math.random() < .7) {
        Ptc.burst('dot', pr.x - Math.sign(pr.vx) * 10, pr.y, 1, { color: '#5ab8ff', sp: 30, r: 7, life: .35 });
      }
      if (pr.kind === 'petal' && Math.random() < .4) {
        Ptc.burst('petal', pr.x, pr.y, 1, { sp: 40, r: 4, life: .4 });
      }

      // my shots hurt enemies (authoritative on the shooter's device)
      if (!dead && pr.mine && !pr.foe) {
        for (const e of G.enemiesAll()) {
          if (e.dead || (e.dying && e.dying > 0)) continue;
          const er = e.type === 'boss' ? 74 : 22;
          const ey = e.type === 'boss' ? e.y - 20 : e.y - 16;
          if (U.dist(pr.x, pr.y, e.x, ey) < er) {
            Game.hitEnemy(e, pr.dmg, pr.owner);
            Ptc.burst(pr.kind === 'petal' ? 'petal' : 'drop', pr.x, pr.y, 6, { sp: 150, g: 500, r: 5, life: .5 });
            dead = true;
            break;
          }
        }
      }
      // enemy shots hurt ME (each device watches its own player)
      if (!dead && pr.foe && !G.me.down) {
        const hitR = pr.kind === 'shock' ? 26 : 20;
        const py = pr.kind === 'shock' ? G.me.y - 10 : G.me.y - 30;
        if (G.me.invuln <= 0 && U.dist(pr.x, pr.y, G.me.x, py) < hitR) {
          if (!(pr.kind === 'shock' && !G.me.onGround)) { // jump over shockwaves!
            Game.damageMe(pr.dmg, pr.x);
            dead = true;
          }
        }
      }
      if (dead) G.projs.splice(i, 1);
    }
  }
};
