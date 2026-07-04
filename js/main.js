'use strict';
/* ============ menus, connection flow, DOM glue ============ */
const Main = {
  el(id) { return document.getElementById(id); },
  _toastT: null, _rotDismissed: false,

  init() {
    const $ = id => this.el(id);

    /* ---- menu buttons ---- */
    $('btnSolo').onclick = () => { SND.unlock(); SND.sfx('ui'); NET.mode = 'solo'; Game.startGame('solo'); };
    $('btnHost').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      if (!NET.available()) { this.toast('🌐 Online play needs internet — try Practice Solo!'); return; }
      this.showConnect('host');
      NET.host();
    };
    $('btnJoin').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      if (!NET.available()) { this.toast('🌐 Online play needs internet — try Practice Solo!'); return; }
      this.showConnect('join');
    };
    $('btnConnGo').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      const code = $('codeInput').value.trim();
      if (code.length < 4) { $('joinStatus').textContent = 'Enter the 4-letter code 💕'; return; }
      $('joinStatus').textContent = 'Connecting…';
      NET.join(code);
    };
    $('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnConnGo').click(); });
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
    $('btnFull').onclick = () => { SND.unlock(); this.goFullscreen(); };

    /* ---- pause ---- */
    $('pauseBtn').onclick = () => { SND.sfx('ui'); this.togglePause(); };
    $('btnResume').onclick = () => { SND.sfx('ui'); this.togglePause(); };
    $('btnQuit').onclick = () => { SND.sfx('ui'); this.hidePause(); Game.quitToMenu(); };

    /* ---- network status wiring ---- */
    NET.onStatus = (kind, msg) => {
      if (NET.mode === 'host') {
        if (kind === 'code') { $('codeBig').textContent = msg; $('hostStatus').textContent = 'Waiting for Jolie to join… 💗'; }
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
    };

    /* ---- rotate hint (dismissible) ---- */
    this.el('rotateHint').onclick = () => { this._rotDismissed = true; this.checkRotate(); };
    addEventListener('resize', () => this.checkRotate());
    this.checkRotate();

    /* ---- copy invite link (host) ---- */
    $('btnCopyLink').onclick = () => {
      const url = location.origin + location.pathname + '?join=' + NET.code;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        () => this.toast('💌 Invite link copied — send it to Jolie!'),
        () => this.toast(url)
      );
    };

    this.showMenu();

    /* ---- deep links: ?join=CODE auto-joins; ?solo&lvl=N for quick play/testing ---- */
    const q = new URLSearchParams(location.search);
    if (q.get('join')) {
      this.showConnect('join');
      $('codeInput').value = q.get('join').toUpperCase();
      $('joinStatus').textContent = 'Connecting…';
      NET.join(q.get('join'));
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

  checkRotate() {
    const portrait = innerHeight > innerWidth;
    const show = portrait && matchMedia('(pointer: coarse)').matches && !this._rotDismissed;
    this.el('rotateHint').classList.toggle('hidden', !show);
  },

  goFullscreen() {
    const de = document.documentElement;
    const fs = de.requestFullscreen || de.webkitRequestFullscreen;
    if (fs) fs.call(de).catch(() => {});
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  },

  showMenu() {
    this.el('menu').classList.remove('hidden');
    this.el('connect').classList.add('hidden');
    this.el('helpPanel').classList.add('hidden');
    this.el('pausePanel').classList.add('hidden');
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
    if (mode === 'host') { this.el('codeBig').textContent = '····'; this.el('hostStatus').textContent = 'Opening the magic portal…'; }
    else { this.el('joinStatus').textContent = ''; setTimeout(() => this.el('codeInput').focus(), 100); }
  },

  hideOverlays() {
    this.el('menu').classList.add('hidden');
    this.el('connect').classList.add('hidden');
    this.el('helpPanel').classList.add('hidden');
  },

  showGameUI(myChar) {
    this.hideOverlays();
    this.el('pauseBtn').classList.remove('hidden');
    if (Input.touchMode) {
      this.el('touchUI').classList.remove('hidden');
      this.el('tSp').textContent = myChar === 'joku' ? '🌊' : '🌸';
    }
    // keep the screen awake on phones
    if (navigator.wakeLock && !this._wl) {
      navigator.wakeLock.request('screen').then(wl => { this._wl = wl; }).catch(() => {});
    }
  },

  togglePause() {
    if (G.state !== 'play') return;
    G.paused = !G.paused;
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
    ep = document.createElement('div');
    ep.id = 'endPanel';
    ep.className = 'overlay';
    ep.innerHTML = `
      <div class="panel">
        <h2>💞 You brought the love back! 💞</h2>
        <p style="font-size:16px">The Gloomheart glows pink, the forest lights shine again,<br>
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

/* ============ boot ============ */
addEventListener('DOMContentLoaded', () => {
  Game.boot();
  Main.init();
});
