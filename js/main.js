'use strict';
/* ============ menus, connection flow, DOM glue ============ */
const Main = {
  el(id) { return document.getElementById(id); },
  _toastT: null, _rotDismissed: false,

  init() {
    const $ = id => this.el(id);
    this.preventMobileZoom();

    /* ---- menu buttons ---- */
    $('btnSolo').onclick = () => { SND.unlock(); SND.sfx('ui'); this.preparePhonePlay(); NET.mode = 'solo'; Game.startGame('solo'); };
    $('btnHost').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      if (!NET.available()) { this.toast('🌐 Online play needs internet — try Practice Solo!'); return; }
      this.preparePhonePlay();
      this.showConnect('host');
      this.hostFromInput();
    };
    $('btnJoin').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      if (!NET.available()) { this.toast('🌐 Online play needs internet — try Practice Solo!'); return; }
      this.showConnect('join');
    };
    $('btnConnGo').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      const code = this.cleanCodeInput('codeInput');
      if (code.length < 4) { $('joinStatus').textContent = 'Enter the 4-letter code 💕'; return; }
      $('joinStatus').textContent = 'Connecting…';
      this.preparePhonePlay();
      NET.join(code);
    };
    $('btnHostGo').onclick = () => { SND.unlock(); SND.sfx('ui'); this.hostFromInput(); };
    for (const id of ['codeInput', 'hostCodeInput', 'settingsCodeInput']) {
      $(id).addEventListener('input', () => this.cleanCodeInput(id));
      $(id).addEventListener('paste', e => {
        e.preventDefault();
        const clip = e.clipboardData || window.clipboardData;
        $(id).value = NET.normalizeCode(clip ? clip.getData('text') : '');
      });
    }
    $('hostCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnHostGo').click(); });
    $('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnConnGo').click(); });
    $('settingsCodeInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') (G.mode === 'guest' ? $('btnReconnectJoin') : $('btnReconnectHost')).click();
    });
    $('btnConnCancel').onclick = () => { SND.sfx('ui'); NET.close(); this.showMenu(); };

    $('btnHelp').onclick = () => { SND.unlock(); SND.sfx('ui'); $('helpPanel').classList.remove('hidden'); };
    $('helpClose').onclick = () => { SND.sfx('ui'); $('helpPanel').classList.add('hidden'); };

    const updSound = () => {
      $('btnSound').textContent = SND.enabled ? '🔊' : '🔇';
      $('btnSound').classList.toggle('off', !SND.enabled);
      $('btnSound2').textContent = SND.enabled ? '🔊 Sound: on' : '🔇 Sound: off';
    };
    $('btnSound').onclick = () => { SND.unlock(); SND.setEnabled(!SND.enabled); updSound(); };
    $('btnSound2').onclick = () => { SND.unlock(); SND.setEnabled(!SND.enabled); updSound(); };
    $('btnFull').onclick = () => { SND.unlock(); this.toggleFullscreen(); };
    $('gameFullBtn').onclick = () => { SND.unlock(); this.toggleFullscreen(); };
    $('rotateFullBtn').onclick = e => { e.stopPropagation(); SND.unlock(); this.toggleFullscreen(); };

    /* ---- pause ---- */
    $('pauseBtn').onclick = () => { SND.sfx('ui'); this.togglePause(); };
    $('btnResume').onclick = () => { SND.sfx('ui'); this.togglePause(); };
    $('difficultySelect').onchange = () => { Game.setDifficulty($('difficultySelect').value); };
    $('btnGoChapter').onclick = () => { SND.sfx('ui'); Game.gotoChapter(+$('chapterSelect').value); };
    $('btnDropWeapon').onclick = () => { SND.sfx('ui'); Game.dropMyWeapon(); };
    $('btnReconnectHost').onclick = () => { SND.unlock(); SND.sfx('ui'); this.reconnectAsHost(); };
    $('btnReconnectJoin').onclick = () => { SND.unlock(); SND.sfx('ui'); this.reconnectAsJoin(); };
    $('btnQuit').onclick = () => { SND.sfx('ui'); this.hidePause(); Game.quitToMenu(); };

    /* ---- network status wiring ---- */
    NET.onStatus = (kind, msg) => {
      if (NET.mode === 'host') {
        if (kind === 'code') {
          $('codeBig').textContent = msg; $('hostCodeInput').value = msg; $('hostStatus').textContent = 'Waiting for Jolie to join… 💗';
        } else if (kind === 'ok') $('hostStatus').textContent = 'Connected! 💞';
        else if (kind === 'err') $('hostStatus').textContent = msg;
        else if (kind === 'info') $('hostStatus').textContent = msg;
      } else {
        if (kind === 'err') $('joinStatus').textContent = msg;
        else if (kind === 'info') $('joinStatus').textContent = msg;
        else if (kind === 'ok') {
          $('joinStatus').textContent = 'Connected! Starting… 💞';
          NET.send({ t: 'hello' });
        }
      }
      this.syncConnectionSettings(kind, msg);
    };
    NET.onPeerJoin = () => {
      if (G.state !== 'play') {
        this.hideOverlays();
        Game.startGame('host');
        this.toast('💗 Jolie has joined your adventure!');
      } else {
        this.toast('💗 Jolie reconnected!');
      }
    };
    NET.onDrop = () => {
      this.toast('💔 Connection lost… ' + (NET.mode === 'host' ? 'Jolie can rejoin with the same code.' : 'Rejoin from the menu with the same code.'));
      if (NET.mode === 'guest' && G.state === 'play' && !G.paused) this.togglePause();
      this.syncConnectionSettings();
    };

    /* ---- rotate hint (dismissible) ---- */
    this.el('rotateHint').onclick = () => { this._rotDismissed = true; this.checkRotate(); };
    addEventListener('resize', () => this.checkRotate());
    addEventListener('orientationchange', () => setTimeout(() => this.checkRotate(), 250));
    document.addEventListener('fullscreenchange', () => { this.updateFullscreenButtons(); this.checkRotate(); });
    document.addEventListener('webkitfullscreenchange', () => { this.updateFullscreenButtons(); this.checkRotate(); });
    this.checkRotate();

    /* ---- copy invite link (host) ---- */
    $('btnCopyLink').onclick = () => {
      const code = NET.code || this.cleanCodeInput('hostCodeInput') || '1234';
      const url = location.origin + location.pathname + '?join=' + code;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        () => this.toast('💌 Invite link copied — send it to Jolie!'),
        () => this.toast(url)
      );
    };

    this.populateSettings();
    this.showMenu();

    /* ---- deep links: ?join=CODE auto-joins; ?solo&lvl=N for quick play/testing ---- */
    const q = new URLSearchParams(location.search);
    if (q.get('join')) {
      const joinCode = NET.normalizeCode(q.get('join'));
      this.showConnect('join');
      $('codeInput').value = joinCode;
      $('joinStatus').textContent = 'Connecting…';
      NET.join(joinCode);
    } else if (q.has('solo')) {
      if (q.has('touch')) Input.touchMode = true;
      const lvl = U.clamp(parseInt(q.get('lvl') || '0', 10) || 0, 0, World.LEVELS.length - 1);
      Game.startGame('solo', lvl);
      if (q.has('skip')) { G.cut = null; G.dialog = null; G.fade = 0; G.fadeDir = -1; }
      if (q.has('x')) {
        const xx = q.get('x') === 'gate' ? G.level.gateX - 100 : +q.get('x');
        G.me.x = xx; G.mate.x = xx + 46;
        const ty = World.topAt(G.level, xx);
        if (ty !== null) { G.me.y = ty; G.mate.y = ty; }
        G.cam.x = xx;
      }
      if (q.has('boss')) G.bossActive = true;
      if (q.has('zoom')) G.devZoom = +q.get('zoom') || 1;
      if (q.has('auto')) G.autoDlg = true;
      if (q.has('kiss')) { G.love = 100; Game.applyLove('kiss', (G.me.x + G.mate.x) / 2); }
      if (q.has('bloom')) Game.addAura(G.me.x + 80, G.me.y, false);
      if (q.has('phx')) Game.addProj({ kind: 'phoenix', x: G.me.x + 130, y: G.me.y - 70, vx: 8, vy: 0, dmg: 0, life: 300, mine: false }, true);
      if (q.has('zoo')) { // test hook: one of each devil, lined up
        ['slime', 'thorn', 'wisp', 'imp'].forEach((type, i) => {
          const fx = G.me.x + 170 + i * 115;
          const gy = World.topAt(G.level, fx) || 520;
          const air = type === 'wisp' ? 150 : type === 'imp' ? 170 : 0;
          const pl = G.level.plats.find(p => fx >= p.x && fx <= p.x + p.w && p.type === 'ground') || G.level.plats[0];
          G.level.foes.push({
            id: 'zoo' + i, type, x: fx, y: gy - air, homeX: fx, homeY: gy - air, plat: pl,
            vx: 0, vy: 0, dir: -1, hp: 55, maxHp: 55, dmg: 13, t: i * 1.3, atkT: 2 + i, hopY: 0, flash: 0, hurtShow: 0, dead: false
          });
        });
      }
      if (q.has('sim')) { // test hook: fast-forward the simulation
        const n = ((+q.get('sim') || 5) * 60) | 0;
        const fire = q.has('fire');
        for (let i = 0; i < n; i++) {
          if (fire) { Input.keys.attack = true; if (i % 100 === 50) Input.edges.special = true; }
          Game.update(1 / 60);
        }
        Input.keys.attack = false;
      }
    }
  },

  populateSettings() {
    const sel = this.el('chapterSelect');
    sel.innerHTML = '';
    World.LEVELS.forEach((lvl, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = (i + 1) + '. ' + lvl.name;
      sel.appendChild(opt);
    });
    this.syncSettings();
  },

  syncSettings() {
    const ch = this.el('chapterSelect');
    const diff = this.el('difficultySelect');
    if (ch) ch.value = String(G.levelIndex || 0);
    if (diff) diff.value = G.difficulty || 'normal';
    this.syncConnectionSettings();
    this.syncWeaponUI();
  },

  syncConnectionSettings(kind, msg) {
    const input = this.el('settingsCodeInput');
    if (!input) return;
    const code = NET.code || input.value || this.el('hostCodeInput')?.value || this.el('codeInput')?.value || '1234';
    input.value = NET.normalizeCode(code) || '1234';
    const mode = NET.mode || G.mode || 'solo';
    const connected = NET.connected ? 'connected' : (NET.peer ? 'waiting' : 'offline');
    const modeLabel = mode === 'host' ? 'Host as Joku' : mode === 'guest' ? 'Join as Jolie' : 'Solo';
    this.el('settingsConnMode').textContent = 'Connection: ' + modeLabel + ' / ' + connected;
    const status = this.el('settingsConnStatus');
    if (status && kind === 'code') status.textContent = 'Hosting room ' + msg + '.';
    else if (status && kind === 'ok') status.textContent = 'Connected with room ' + (NET.code || input.value) + '.';
    else if (status && msg) status.textContent = msg;
    else if (status && !NET.connected && mode !== 'solo') status.textContent = 'Use the same code to reconnect and continue.';
    else if (status && NET.connected) status.textContent = 'Connected with room ' + (NET.code || input.value) + '.';
  },

  cleanCodeInput(id = 'codeInput') {
    const input = this.el(id);
    const code = NET.normalizeCode(input.value);
    if (input.value !== code) input.value = code;
    return code;
  },

  hostFromInput() {
    const code = this.cleanCodeInput('hostCodeInput') || '1234';
    this.el('hostCodeInput').value = code;
    if (!NET.validCode(code)) { this.el('hostStatus').textContent = 'Enter a 4-character room code.'; return; }
    this.el('hostStatus').textContent = 'Opening the magic portal...';
    this.el('codeBig').textContent = code;
    this.el('settingsCodeInput').value = code;
    NET.host(code);
    this.syncConnectionSettings();
  },

  reconnectAsHost() {
    if (G.state === 'play' && G.mode === 'guest') { this.toast('Jolie should use Join/Rejoin. Joku hosts the room.'); return; }
    if (G.state === 'play' && G.mode === 'solo') { this.toast('Start from Host as Joku to play online.'); return; }
    const code = this.cleanCodeInput('settingsCodeInput') || '1234';
    if (!NET.validCode(code)) { this.el('settingsConnStatus').textContent = 'Enter a 4-character room code.'; return; }
    NET.host(code);
    this.el('settingsConnStatus').textContent = 'Hosting room ' + code + '...';
    this.syncConnectionSettings();
  },

  reconnectAsJoin() {
    if (G.state === 'play' && G.mode === 'host') { this.toast('Joku should keep hosting. Jolie joins this code.'); return; }
    if (G.state === 'play' && G.mode === 'solo') { this.toast('Start from Join as Jolie to play online.'); return; }
    const code = this.cleanCodeInput('settingsCodeInput') || '1234';
    if (!NET.validCode(code)) { this.el('settingsConnStatus').textContent = 'Enter a 4-character room code.'; return; }
    NET.join(code);
    this.el('settingsConnStatus').textContent = 'Joining room ' + code + '...';
    this.syncConnectionSettings();
  },

  preventMobileZoom() {
    const editable = el => el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]');
    let lastTouchEnd = 0;
    document.addEventListener('touchend', e => {
      const now = Date.now();
      if (now - lastTouchEnd < 330 && !editable(e.target)) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
    document.addEventListener('dblclick', e => {
      if (!editable(e.target)) e.preventDefault();
    }, { passive: false });
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
      document.addEventListener(type, e => e.preventDefault(), { passive: false });
    }
  },

  preparePhonePlay() {
    if (matchMedia('(pointer: coarse)').matches && !this.isFullscreen()) this.enterFullscreen({ quiet: true });
  },

  checkRotate() {
    const portrait = innerHeight > innerWidth;
    const show = portrait && matchMedia('(pointer: coarse)').matches && !this._rotDismissed;
    this.el('rotateHint').classList.toggle('hidden', !show);
  },

  isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || this._softFull);
  },

  updateFullscreenButtons() {
    const on = this.isFullscreen();
    for (const id of ['btnFull', 'gameFullBtn']) {
      const el = this.el(id);
      if (el) {
        el.textContent = on ? '↙' : '⛶';
        el.title = on ? 'Exit fullscreen' : 'Fullscreen';
        el.setAttribute('aria-label', el.title);
      }
    }
  },

  toggleFullscreen() {
    if (this.isFullscreen()) this.exitFullscreen();
    else this.enterFullscreen();
  },

  enterFullscreen(opt = {}) {
    const de = document.documentElement;
    const fs = de.requestFullscreen || de.webkitRequestFullscreen || de.msRequestFullscreen;
    const fullscreenEl = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    let request = Promise.resolve(!!fullscreenEl);
    if (!fullscreenEl && fs) {
      try { request = Promise.resolve(fs.call(de)).then(() => true, () => false); } catch (e) { request = Promise.resolve(false); }
    }
    request.then(ok => {
      let lock = Promise.resolve(false);
      if (screen.orientation && screen.orientation.lock) {
        try { lock = screen.orientation.lock('landscape').then(() => true, () => false); } catch (e) {}
      }
      lock.then(locked => {
        if (!ok && !locked) {
          this._softFull = true;
          document.documentElement.classList.add('softFullscreen');
        }
        setTimeout(() => scrollTo(0, 1), 60);
        this.updateFullscreenButtons();
        this.checkRotate();
        if (!opt.quiet && !ok && !locked) this.toast('Rotate sideways; this browser limits fullscreen.');
      });
    });
  },

  exitFullscreen() {
    this._softFull = false;
    document.documentElement.classList.remove('softFullscreen');
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit && (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)) {
      try { Promise.resolve(exit.call(document)).finally(() => this.updateFullscreenButtons()); } catch (e) { this.updateFullscreenButtons(); }
    } else {
      this.updateFullscreenButtons();
    }
  },

  showMenu() {
    this.el('menu').classList.remove('hidden');
    this.el('connect').classList.add('hidden');
    this.el('helpPanel').classList.add('hidden');
    this.el('pausePanel').classList.add('hidden');
    this.el('gameFullBtn').classList.add('hidden');
    this.el('pauseBtn').classList.add('hidden');
    this.el('touchUI').classList.add('hidden');
    const ep = this.el('endPanel');
    if (ep) ep.remove();
    G.state = 'menu'; G.demo = null;
  },

  showConnect(mode) {
    this.el('menu').classList.add('hidden');
    this.el('connect').classList.remove('hidden');
    this.el('hostBox').classList.toggle('hidden', mode !== 'host');
    this.el('joinBox').classList.toggle('hidden', mode !== 'join');
    this.el('connTitle').textContent = mode === 'host' ? '💙 Hosting as Joku' : '💗 Joining as Jolie';
    if (mode === 'host') {
      const code = NET.normalizeCode(NET.code || this.el('hostCodeInput').value || '1234') || '1234';
      this.el('hostCodeInput').value = code;
      this.el('codeBig').textContent = code;
      this.el('hostStatus').textContent = 'Opening the magic portal…';
      this.el('settingsCodeInput').value = code;
      setTimeout(() => this.el('hostCodeInput').focus(), 100);
    }
    else { this.el('joinStatus').textContent = ''; this.el('codeInput').value = '1234'; setTimeout(() => this.el('codeInput').focus(), 100); }
  },

  hideOverlays() {
    this.el('menu').classList.add('hidden');
    this.el('connect').classList.add('hidden');
    this.el('helpPanel').classList.add('hidden');
  },

  showGameUI(myChar) {
    this.hideOverlays();
    this.syncSettings();
    this.el('gameFullBtn').classList.remove('hidden');
    this.el('pauseBtn').classList.remove('hidden');
    if (Input.touchMode) {
      this.el('touchUI').classList.remove('hidden');
      this.el('tSp').textContent = myChar === 'joku' ? '🌊' : '🌸';
      this.el('tSkill2').textContent = myChar === 'joku' ? '🛡' : '🌺';
      this.el('tSkill2').textContent = myChar === 'joku' ? '🌊' : '🌹';
      this.el('tSkill2').textContent = myChar === 'joku' ? '🌀' : '🌹';
      this.el('tSkill2').title = myChar === 'joku' ? 'Tide Breaker' : 'Rose Barrage';
    }
    this.syncWeaponUI();
    // keep the screen awake on phones
    if (navigator.wakeLock && !this._wl) {
      navigator.wakeLock.request('screen').then(wl => { this._wl = wl; }).catch(() => {});
    }
  },

  setCooldownButton(id, frac, readyColor) {
    const el = this.el(id);
    if (!el) return;
    frac = U.clamp(frac || 0, 0, 1);
    if (frac > .01) {
      const deg = Math.round(frac * 360);
      el.style.backgroundImage = `conic-gradient(from -90deg, rgba(3,8,14,.84) 0deg, rgba(3,8,14,.84) ${deg}deg, rgba(255,255,255,.05) ${deg}deg 360deg), linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.05))`;
      el.style.filter = 'saturate(.75) brightness(.85)';
    } else {
      el.style.backgroundImage = '';
      el.style.filter = '';
      if (readyColor) el.style.boxShadow = `0 0 14px ${readyColor}88, 0 4px 14px rgba(0,0,0,.4)`;
    }
  },

  syncWeaponUI() {
    if (!G.me) return;
    const w = G.me.weapon && Weapons[G.me.weapon] ? Weapons[G.me.weapon] : null;
    const base = G.me.char === 'joku' ? '🌊' : '🌸';
    const sp = this.el('tSp');
    if (sp) {
      sp.textContent = w ? w.skillIcon : base;
      sp.title = w ? w.name + ': ' + w.skill : (G.me.char === 'joku' ? 'Water phoenix' : 'Healing bloom');
      sp.setAttribute('aria-label', sp.title);
      sp.style.borderColor = w ? w.color : '';
      sp.style.boxShadow = w ? '0 0 18px ' + w.color + '88, 0 4px 14px rgba(0,0,0,.4)' : '';
    }
    const near = (typeof Game !== 'undefined' && Game.nearestWeapon) ? Game.nearestWeapon(G.me) : null;
    const drop = this.el('btnDropWeapon');
    if (drop) {
      drop.textContent = near && Weapons[near.weapon] ? 'Pick ' + Weapons[near.weapon].name : (w ? 'Drop ' + w.name : 'Pick / Drop Weapon');
    }
    const tDrop = this.el('tDrop');
    if (tDrop) {
      if (near && Weapons[near.weapon]) {
        tDrop.textContent = '⬆';
        tDrop.title = 'Pick ' + Weapons[near.weapon].name;
      } else if (w) {
        tDrop.textContent = '⇩';
        tDrop.title = 'Drop ' + w.name;
      } else {
        tDrop.textContent = '◇';
        tDrop.title = 'Stand near a weapon to pick it';
      }
      tDrop.setAttribute('aria-label', tDrop.title);
    }
    const p = G.me;
    if (p) {
      const atkMax = p.char === 'joku' ? .38 : .46;
      this.setCooldownButton('tAtk', Math.max(0, p.atkCd) / atkMax, '#ffffff');
      this.setCooldownButton('tSp', Math.max(0, p.spCd) / 2.2, w ? w.color : (p.char === 'joku' ? '#7fd8ff' : '#ff9fce'));
      this.setCooldownButton('tSkill2', Math.max(0, p.skill2Cd) / 8, p.char === 'joku' ? '#7fd8ff' : '#ff86b8');
    }
  },

  togglePause() {
    if (G.state !== 'play') return;
    G.paused = !G.paused;
    if (G.paused) this.syncSettings();
    this.el('pausePanel').classList.toggle('hidden', !G.paused);
  },
  hidePause() {
    G.paused = false;
    this.el('pausePanel').classList.add('hidden');
  },

  toast(txt) {
    const t = this.el('toast');
    t.textContent = txt;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), 3000);
  },

  showEnd(stats, seconds) {
    let ep = this.el('endPanel');
    if (ep) ep.remove();
    const loveLines = [
      'Joku and Jolie proved that love is strongest when Lulu and Biscuit are running beside it.',
      'Every chapter became brighter because Joku, Jolie, Lulu, and Biscuit chose each other again.',
      'The forest will remember this: two hearts, two supporters, one forever adventure.',
      'Lulu barked, Biscuit cheered, and Joku and Jolie turned every shadow into a love story.'
    ];
    const loveLine = loveLines[(Math.random() * loveLines.length) | 0];
    const finalBoss = (G.level && G.level.boss && G.level.boss.bossName) || 'the final boss';
    ep = document.createElement('div');
    ep.id = 'endPanel';
    ep.className = 'overlay';
    ep.innerHTML = `
      <div class="panel">
        <h2>💞 You brought the love back! 💞</h2>
        <p style="font-size:17px"><b>Congratulations!</b></p>
        <p>${loveLine}</p>
        <p style="font-size:16px">${finalBoss} glows pink, the forest lights shine again,<br>
        and Joku &amp; Jolie lived happily — adventure after adventure.</p>
        <p style="font-size:15px; line-height:2">
          💧 Water orbs: <b>${stats.orbs}</b> &nbsp; 🌸 Flowers: <b>${stats.flowers}</b><br>
          💗 Hearts: <b>${stats.hearts}</b> &nbsp; 🤗 Hugs: <b>${stats.hugs}</b> &nbsp; 💋 Kisses: <b>${stats.kisses}</b><br>
          ⚔️ Shadows cleared: <b>${stats.kills}</b> &nbsp; ⏱ Time: <b>${U.fmtTime(seconds)}</b>
        </p>
        <p class="dim">made for Joku 💙 &amp; Jolie 💗</p>
        <button id="btnAgain" class="mbtn join">💕 Play Again</button>
        <button id="btnEndMenu" class="mbtn ghost">🏠 Menu</button>
      </div>`;
    this.el('ui').appendChild(ep);
    this.el('btnAgain').onclick = () => location.reload();
    this.el('btnEndMenu').onclick = () => { ep.remove(); Game.quitToMenu(); };
  }
};

Main.showEnd = function(stats, seconds) {
  let ep = this.el('endPanel');
  if (ep) ep.remove();
  const loveLines = (typeof Story !== 'undefined' && Story.LOVE_LINES) || ['Joku, Jolie, Lulu và Biscuit đã cùng nhau đưa ánh sáng trở lại.'];
  const loveLine = loveLines[(Math.random() * loveLines.length) | 0];
  const finalBoss = (G.level && G.level.boss && G.level.boss.bossName) || 'boss cuối';
  ep = document.createElement('div');
  ep.id = 'endPanel';
  ep.className = 'overlay';
  ep.innerHTML = `
    <div class="panel">
      <h2>💞 Tình yêu đã trở lại! 💞</h2>
      <p style="font-size:17px"><b>Chúc mừng Joku và Jolie!</b></p>
      <p>${loveLine}</p>
      <p style="font-size:16px">${finalBoss} đã dịu lại, ánh sáng rừng bừng lên lần nữa,<br>
      và Joku &amp; Jolie tiếp tục yêu nhau qua từng cuộc phiêu lưu.</p>
      <p style="font-size:15px; line-height:2">
        💧 Ngọc nước: <b>${stats.orbs}</b> &nbsp; 🌸 Hoa: <b>${stats.flowers}</b><br>
        💗 Trái tim: <b>${stats.hearts}</b> &nbsp; 🤗 Ôm: <b>${stats.hugs}</b> &nbsp; 💋 Hôn: <b>${stats.kisses}</b><br>
        ⚔️ Bóng tối đã dọn: <b>${stats.kills}</b> &nbsp; ⏱ Thời gian: <b>${U.fmtTime(seconds)}</b>
      </p>
      <p class="dim">dành cho Joku 💙 &amp; Jolie 💗</p>
      <button id="btnAgain" class="mbtn join">💕 Chơi lại</button>
      <button id="btnEndMenu" class="mbtn ghost">🏠 Menu</button>
    </div>`;
  this.el('ui').appendChild(ep);
  this.el('btnAgain').onclick = () => location.reload();
  this.el('btnEndMenu').onclick = () => { ep.remove(); Game.quitToMenu(); };
};

/* ============ boot ============ */
addEventListener('DOMContentLoaded', () => {
  Game.boot();
  Main.init();
});
