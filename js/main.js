'use strict';
/* ============ menus, connection flow, DOM glue ============ */
const Main = {
  el(id) { return document.getElementById(id); },
  _toastT: null, _itemPopupT: null, _itemPopupHideT: null, _rotDismissed: false, _pausedForNet: false,

  init() {
    const $ = id => this.el(id);
    this.preventMobileZoom();

    /* ---- menu buttons ---- */
    $('btnSolo').onclick = () => { SND.unlock(); SND.sfx('ui'); this.preparePhonePlay(); NET.mode = 'solo'; Game.startGame('solo'); };
    $('btnHost').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      if (!NET.available()) { this.toast('🌐 ' + Story.t('onlineNeedsInternet')); return; }
      this.preparePhonePlay();
      this.showConnect('host');
      this.hostFromInput();
    };
    $('btnJoin').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      if (!NET.available()) { this.toast('🌐 ' + Story.t('onlineNeedsInternet')); return; }
      this.showConnect('join');
    };
    $('btnConnGo').onclick = () => {
      SND.unlock(); SND.sfx('ui');
      const code = this.cleanCodeInput('codeInput');
      if (code.length < 4) { $('joinStatus').textContent = Story.t('enterCode'); return; }
      $('joinStatus').textContent = Story.t('openingPortal');
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
      if (e.key === 'Enter') $('btnReconnect').click();
    });
    $('btnConnCancel').onclick = () => { SND.sfx('ui'); NET.close(); this.showMenu(); };

    this.setLanguage(this.storedLanguage(), true);
    $('helpPanel').addEventListener('click', e => {
      if (e.target && e.target.id === 'helpClose') {
        SND.sfx('ui');
        $('helpPanel').classList.add('hidden');
      }
    });
    $('btnHelp').onclick = () => this.openHelp();
    $('btnHelpSettings').onclick = () => this.openHelp();
    $('languageSelect').onchange = () => this.setLanguage($('languageSelect').value);

    SND.setVolume(SND.storedVolume(), true);
    $('volumeSlider').value = String(Math.round(SND.volume * 100));
    $('volumeValue').textContent = Math.round(SND.volume * 100) + '%';
    const updSound = () => {
      $('btnSound').textContent = SND.enabled ? '🔊' : '🔇';
      $('btnSound').classList.toggle('off', !SND.enabled);
      $('btnSound2').textContent = SND.enabled ? '🔊 ' + Story.t('soundOn') : '🔇 ' + Story.t('soundOff');
    };
    $('volumeSlider').oninput = () => {
      SND.unlock();
      const value = SND.setVolume(+$('volumeSlider').value / 100);
      $('volumeValue').textContent = Math.round(value * 100) + '%';
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
    $('btnReconnect').onclick = () => { SND.unlock(); SND.sfx('ui'); this.reconnectCurrent(); };
    $('btnQuit').onclick = () => { SND.sfx('ui'); this.hidePause(); Game.quitToMenu(); };

    /* ---- network status wiring ---- */
    NET.onStatus = (kind, msg) => {
      if (NET.mode === 'host') {
        if (kind === 'code') {
          const localHint = NET.isLocalOrigin() ? ' ' + Story.t('localTestLink') : '';
          $('codeBig').textContent = msg; $('hostCodeInput').value = msg; $('hostStatus').textContent = Story.t('waitingJoin') + ' 💗' + localHint;
        } else if (kind === 'ok') $('hostStatus').textContent = Story.t('connectedShort') + ' 💞';
        else if (kind === 'route') $('hostStatus').textContent = msg;
        else if (kind === 'err') $('hostStatus').textContent = msg;
        else if (kind === 'info') $('hostStatus').textContent = msg;
      } else {
        if (kind === 'err') $('joinStatus').textContent = msg;
        else if (kind === 'info') $('joinStatus').textContent = msg;
        else if (kind === 'route') $('joinStatus').textContent = msg;
        else if (kind === 'ok') {
          $('joinStatus').textContent = Story.t('connectedStart') + ' 💞';
          NET.send({ t: 'hello' });
          if (this._pausedForNet) {
            this._pausedForNet = false;
            this.toast('💗 ' + Story.t('reconnectedAdventure'));
            if (G.paused) this.togglePause();
          }
        }
      }
      this.syncConnectionSettings(kind, msg);
    };
    NET.onPeerJoin = () => {
      if (G.state !== 'play') {
        this.hideOverlays();
        G._freshOnlineStart = true;
        Game.startGame('host');
        this.toast('💗 ' + Story.t('joinedAdventure'));
      } else {
        this.toast('💗 ' + Story.t('reconnectedAdventure'));
      }
    };
    NET.onDrop = () => {
      this.toast('💔 ' + Story.t(NET.mode === 'host' ? 'connectionLostHost' : 'connectionLostGuest'));
      if (NET.mode === 'guest' && G.state === 'play' && !G.paused) {
        this._pausedForNet = true;
        this.togglePause();
      }
      this.syncConnectionSettings();
    };
    NET.init();

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
      const url = NET.inviteUrl(code);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        () => this.toast('💌 ' + Story.t('copiedInvite')),
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
      $('joinStatus').textContent = Story.t('openingPortal');
      NET.join(joinCode);
    } else if (q.has('solo')) {
      if (q.has('touch')) Input.touchMode = true;
      const lvl = U.clamp(parseInt(q.get('lvl') || '0', 10) || 0, 0, World.LEVELS.length - 1);
      Game.startGame('solo', lvl);
      if (q.has('skip')) { G.cut = null; G.dialog = null; G.fade = 0; G.fadeDir = -1; }
      if (q.has('x')) {
        const xTarget = q.get('x');
        const trialTarget = xTarget === 'trial' && G.level.loveTrials && G.level.loveTrials[0]
          ? G.level.loveTrials[0] : null;
        const xx = xTarget === 'gate' ? G.level.gateX - 100
          : trialTarget ? trialTarget.x
          : +xTarget;
        G.me.x = trialTarget ? xx - 58 : xx;
        G.mate.x = trialTarget ? xx + 58 : xx + 46;
        const ty = trialTarget ? trialTarget.y : World.topAt(G.level, xx);
        if (ty !== null) { G.me.y = ty; G.mate.y = ty; }
        G.cam.x = xx;
      }
      if (q.has('boss')) G.bossActive = true;
      if (q.has('qaTrial') && G.level.loveTrials && G.level.loveTrials[0]) { // test hook: begin at the two-power step
        const trial = G.level.loveTrials[0];
        G.cut = null; G.dialog = null; G.fade = 0; G.fadeDir = -1;
        for (const foe of G.level.foes || []) {
          if (foe.bossTier && foe.x < trial.x) { foe.dead = true; foe.dying = 0; }
        }
        G.level.shrineDone = true;
        trial.stage = 3; trial.charge = 0; trial.skillMask = 0; trial.powerT = 0;
        trial._powerPrompted = false; trial._travelPrompted = false;
        const writeQaState = () => {
          document.documentElement.dataset.jjQa = JSON.stringify({
            me: { x: G.me.x, y: G.me.y, vy: G.me.vy, safeX: G.me.safeX, safeY: G.me.safeY },
            mate: { x: G.mate.x, y: G.mate.y, vy: G.mate.vy },
            trial: { x: trial.x, y: trial.y, stage: trial.stage, mask: trial.skillMask, travel: trial.travel, done: trial.done },
            ground: World.topAt(G.level, G.me.x), announcement: G.announce && G.announce.txt
          });
        };
        writeQaState();
        setInterval(writeQaState, 100);
        if (q.get('qaTrial') === 'ride') {
          trial.skillMask = 3;
          Game.startTrialTraversal(trial, false);
        }
      }
      if (q.has('qaBoss') || q.has('qaDate')) { // test hook: bypass progression for visual QA
        for (const tr of G.level.loveTrials || []) { tr.done = true; tr._celebrated = true; tr.stage = 3; }
        for (const foe of G.level.foes || []) if (foe.bossTier) { foe.dead = true; foe.dying = 0; }
        G.level.shrineDone = true;
        G.level.gateOpen = true;
        G.cut = null; G.dialog = null; G.announce = null;

        const dateMode = q.has('qaDate') && G.level.postBoss;
        if (dateMode) {
          G.level.boss.dead = true;
          G.level.boss.dying = 0;
          G.bossActive = false;
          G.level.postBoss.unlocked = true;
          const first = G.level.postBoss.platforms[0];
          const xx = q.get('qaDate') === 'end'
            ? G.level.postBoss.doorX - 520
            : first.x + Math.min(90, first.w * .25);
          const ty = World.topAt(G.level, xx) || first.y;
          G.me.x = xx; G.mate.x = xx + 46;
          G.me.y = G.mate.y = ty;
          G.cam.x = xx;
        } else {
          G.bossActive = true;
          const xx = G.level.boss.x - 300;
          const ty = World.topAt(G.level, xx) || G.level.gateY || 520;
          G.me.x = xx; G.mate.x = xx + 46;
          G.me.y = G.mate.y = ty;
          G.cam.x = G.level.boss.x - 70;
        }
      }
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

  storedLanguage() {
    try { return localStorage.getItem('jjLang') || 'en'; }
    catch (e) { return 'en'; }
  },

  setLanguage(lang, quiet = false) {
    lang = lang === 'vi' ? 'vi' : 'en';
    try { localStorage.setItem('jjLang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    if (typeof Story !== 'undefined' && Story.setLanguage) Story.setLanguage(lang);
    const sel = this.el('languageSelect');
    if (sel) sel.value = lang;
    this.applyLanguage();
    if (this.el('chapterSelect') && this.el('chapterSelect').options.length) this.populateSettings();
    this.renderHelp();
    this.syncWeaponInfo(true);
    if (!quiet) this.toast(Story.t(lang === 'vi' ? 'languageVietnamese' : 'languageEnglish'));
  },

  applyLanguage() {
    if (typeof Story === 'undefined') return;
    const set = (id, txt) => { const el = this.el(id); if (el) el.textContent = txt; };
    const labelFor = (id, txt) => {
      const el = this.el(id);
      const label = el && el.closest('label');
      if (label && label.firstChild) label.firstChild.nodeValue = txt + ' ';
    };
    set('btnHost', '💙 ' + Story.t('host'));
    set('btnJoin', '💗 ' + Story.t('join'));
    set('btnSolo', '🐾 ' + Story.t('solo'));
    const subtitle = document.querySelector('#menu .subtitle');
    if (subtitle) subtitle.textContent = Story.t('subtitle');
    const credit = document.querySelector('#menu .credit');
    if (credit) credit.textContent = Story.t('credit') + ' 💞';
    set('btnHelpSettings', Story.t('help'));
    set('btnGoChapter', Story.t('goChapter'));
    set('btnDropWeapon', Story.t('dropWeapon'));
    set('btnResume', '▶ ' + Story.t('continue'));
    set('btnReconnect', Story.t('reconnect'));
    set('volumeLabelText', Story.t('gameVolume'));
    const volumeSlider = this.el('volumeSlider');
    if (volumeSlider) volumeSlider.setAttribute('aria-label', Story.t('gameVolume'));
    const roomInput = this.el('settingsCodeInput');
    if (roomInput) roomInput.setAttribute('aria-label', Story.t('roomCode'));
    set('btnQuit', '🚪 ' + Story.t('quitMenu'));
    set('btnSound2', (SND.enabled ? '🔊 ' : '🔇 ') + Story.t(SND.enabled ? 'soundOn' : 'soundOff'));
    set('btnHostGo', Story.t('hostRoom'));
    set('btnConnGo', '💗 ' + Story.t('joinJoku'));
    set('btnConnCancel', Story.t('back'));
    set('btnCopyLink', '💌 ' + Story.t('copyInvite'));
    const pauseTitle = document.querySelector('#pausePanel h2');
    if (pauseTitle) pauseTitle.textContent = Story.t('pause') + ' 💤';
    const hostPrompt = document.querySelector('#hostBox p');
    if (hostPrompt) hostPrompt.textContent = Story.t('hostPrompt');
    const currentRoom = document.querySelector('#hostBox .dim');
    if (currentRoom) currentRoom.textContent = Story.t('currentRoom');
    const joinPrompt = document.querySelector('#joinBox p');
    if (joinPrompt) joinPrompt.textContent = Story.t('joinPrompt');
    labelFor('difficultySelect', Story.t('difficulty'));
    labelFor('chapterSelect', Story.t('chapter'));
    labelFor('languageSelect', Story.t('language'));
    labelFor('settingsCodeInput', Story.t('roomCode'));
    const diff = this.el('difficultySelect');
    if (diff) {
      const labels = { easy: Story.t('easy'), normal: Story.t('normal'), hard: Story.t('hard') };
      for (const opt of diff.options) opt.textContent = labels[opt.value] || opt.value;
    }
    const lang = this.el('languageSelect');
    if (lang) {
      const en = lang.querySelector('option[value="en"]'), vi = lang.querySelector('option[value="vi"]');
      if (en) en.textContent = 'English';
      if (vi) vi.textContent = 'Tiếng Việt';
    }
    const help = this.el('btnHelp');
    if (help) help.title = Story.t('help');
    const full = this.el('btnFull');
    if (full) full.title = Story.t('fullscreen');
    this.updateFullscreenButtons();
    this.syncSettings();
  },

  openHelp() {
    SND.unlock();
    SND.sfx('ui');
    this.renderHelp();
    this.el('helpPanel').classList.remove('hidden');
  },

  renderHelp() {
    const panel = this.el('helpPanel') && this.el('helpPanel').querySelector('.panel');
    if (!panel) return;
    const vi = typeof Story !== 'undefined' && Story.isVietnamese && Story.isVietnamese();
    panel.innerHTML = vi ? `
      <h2>Huong dan choi</h2>
      <div class="helpCols">
        <div>
          <h3>Ban phim</h3>
          <p><b>Di chuyen</b> - A/D hoac mui ten trai/phai<br>
          <b>Nhay</b> - W / mui ten len / Space, bam lan nua de nhay doi<br>
          <b>Tan cong</b> - J hoac Z<br>
          <b>Ky nang dac biet</b> - K hoac X, dung MP<br>
          <b>Ky nang vu khi</b> - U, O, hoac B khi da cam vu khi<br>
          <b>Trai tim</b> - L, C, hoac E<br>
          <b>Nhat / tha vu khi</b> - Q</p>
        </div>
        <div>
          <h3>Cam ung</h3>
          <p>Ben trai la can dieu khien. Ben phai co cac nut Nhay, Tan cong, Dac biet, Ky nang vu khi, Trai tim, va Nhat/Tha.</p>
        </div>
      </div>
      <h3>Trai tim va hop tac</h3>
      <p>Dung gan nhau roi bam Trai tim de nam tay. Giu Trai tim de om va hoi mau. Khi thanh Love day, bam Trai tim de hon va tao bung sang tinh yeu.</p>
      <p class="dim">Vu khi khong tu dong nhat. Hay di den dung vi tri vu khi dang sang tren dat va bam Nhat/Tha. Vu khi da roi se nam yen tai vi tri do. Trong moi chuong, hay cung nhau dung tren cac dau sang, nam tay, om, va hon. Sau do, ca Joku va Jolie phai bam Dac biet de kich hoat hai nang luc tam thoi khac nhau. Hai nang luc ket hop se tao duong di rieng cua chuong.</p>
      <button id="helpClose" class="mbtn">Da hieu</button>
    ` : `
      <h2>How to Play</h2>
      <div class="helpCols">
        <div>
          <h3>Keyboard</h3>
          <p><b>Move</b> - A/D or Left/Right arrows<br>
          <b>Jump</b> - W / Up / Space, press again to double-jump<br>
          <b>Attack</b> - J or Z<br>
          <b>Special</b> - K or X, uses MP<br>
          <b>Weapon Skill</b> - U, O, or B after equipping a weapon<br>
          <b>Heart</b> - L, C, or E<br>
          <b>Pick / Drop Weapon</b> - Q</p>
        </div>
        <div>
          <h3>Touch</h3>
          <p>Left side is the joystick. Right side has Jump, Attack, Special, Weapon Skill, Heart, and Pick/Drop buttons.</p>
        </div>
      </div>
      <h3>Heart and Co-op</h3>
      <p>Stand close and tap Heart to hold hands. Hold Heart to hug and heal. When the Love Meter is full, press Heart for a kiss burst that heals and clears danger.</p>
      <p class="dim">Weapons do not auto-pickup. Move to the shining weapon on the ground and press Pick/Drop. Dropped weapons stay fixed exactly where they land. At each chapter challenge, meet on the glowing marks, hold hands, hug, and kiss. Then both Joku and Jolie must press Special to invoke their different temporary powers; only the combined powers create the chapter's spectacular crossing.</p>
      <button id="helpClose" class="mbtn">Got it</button>
    `;
    const close = this.el('helpClose');
    if (close) close.onclick = () => { SND.sfx('ui'); this.el('helpPanel').classList.add('hidden'); };
  },

  populateSettings() {
    const sel = this.el('chapterSelect');
    sel.innerHTML = '';
    World.LEVELS.forEach((lvl, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = (i + 1) + '. ' + (typeof Story !== 'undefined' ? Story.levelName(i) : lvl.name);
      sel.appendChild(opt);
    });
    this.syncSettings();
  },

  syncSettings() {
    const ch = this.el('chapterSelect');
    const diff = this.el('difficultySelect');
    const lang = this.el('languageSelect');
    if (ch) ch.value = String(G.levelIndex || 0);
    if (diff) diff.value = G.difficulty || 'normal';
    if (lang && typeof Story !== 'undefined') lang.value = Story.LANG || 'en';
    this.syncConnectionSettings();
    this.syncWeaponUI();
  },

  syncConnectionSettings(kind, msg) {
    const input = this.el('settingsCodeInput');
    if (!input) return;
    const code = NET.code || input.value || this.el('hostCodeInput')?.value || this.el('codeInput')?.value || '1234';
    input.value = NET.normalizeCode(code) || '1234';
    const mode = NET.mode || G.mode || 'solo';
    const connected = NET.connected ? Story.t('connected') : (NET.peer ? Story.t('waiting') : Story.t('offline'));
    const modeLabel = mode === 'host' ? Story.t('hostMode') : mode === 'guest' ? Story.t('guestMode') : Story.t('soloMode');
    this.el('settingsConnMode').textContent = Story.t('connection') + ': ' + modeLabel + ' / ' + connected;
    const reconnect = this.el('btnReconnect');
    if (reconnect) {
      reconnect.disabled = mode === 'solo';
      reconnect.classList.toggle('host', mode !== 'guest');
      reconnect.classList.toggle('join', mode === 'guest');
    }
    const status = this.el('settingsConnStatus');
    if (status && kind === 'code') status.textContent = Story.t('hostingRoom', { code: msg });
    else if (status && kind === 'ok') status.textContent = Story.t('connectedRoom', { code: NET.code || input.value });
    else if (status && msg) status.textContent = msg;
    else if (status && !NET.connected && mode !== 'solo') status.textContent = Story.t('reconnectHint');
    else if (status && NET.connected) status.textContent = Story.t('connectedRoom', { code: NET.code || input.value });
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
    if (!NET.validCode(code)) { this.el('hostStatus').textContent = Story.t('enterCode'); return; }
    this.el('hostStatus').textContent = Story.t('openingPortal');
    this.el('codeBig').textContent = code;
    this.el('settingsCodeInput').value = code;
    NET.host(code);
    this.syncConnectionSettings();
  },

  reconnectCurrent() {
    const role = NET.mode === 'host' || NET.mode === 'guest' ? NET.mode : G.mode;
    if (role !== 'host' && role !== 'guest') {
      this.toast(Story.t('soloNoReconnect'));
      return;
    }
    const code = this.cleanCodeInput('settingsCodeInput') || '1234';
    if (!NET.validCode(code)) { this.el('settingsConnStatus').textContent = Story.t('enterCode'); return; }
    if (NET.connected && NET.code === code) {
      this.el('settingsConnStatus').textContent = Story.t('alreadyConnected', { code });
      return;
    }
    this.el('settingsConnStatus').textContent = Story.t('reconnectingRoom', { code });
    NET.reconnect(code, role);
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
        el.title = on ? Story.t('exitFullscreen') : Story.t('fullscreen');
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
        if (!opt.quiet && !ok && !locked) this.toast(Story.t('rotate'));
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
    this.el('connTitle').textContent = mode === 'host' ? '💙 ' + Story.t('hostMode') : '💗 ' + Story.t('guestMode');
    if (mode === 'host') {
      const code = NET.normalizeCode(NET.code || this.el('hostCodeInput').value || '1234') || '1234';
      this.el('hostCodeInput').value = code;
      this.el('codeBig').textContent = code;
      this.el('hostStatus').textContent = Story.t('openingPortal');
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
      this.el('tWeapon').title = 'Weapon skill';
    }
    this.syncWeaponUI();
    // keep the screen awake on phones
    if (navigator.wakeLock && !this._wl) {
      navigator.wakeLock.request('screen').then(wl => { this._wl = wl; }).catch(() => {});
    }
  },

  skinTouchControls() {
    if (typeof ASSETS === 'undefined' || !ASSETS.skinTouchButton || !ASSETS.has('ui_kit')) return;
    ASSETS.skinTouchButton(this.el('tJump'), 'move', false);
    ASSETS.skinTouchButton(this.el('tAtk'), 'attack', false);
    ASSETS.skinTouchButton(this.el('tHeart'), 'heart', false);
    ASSETS.skinTouchButton(this.el('tSp'), G.me && G.me.char === 'jolie' ? 'star' : 'water', false);
    ASSETS.skinTouchButton(this.el('tDrop'), 'gift', true);
  },

  setTouchGlyph(id, glyph) {
    const el = this.el(id);
    if (!el) return null;
    let layer = el.querySelector('.tbtnGlyph');
    if (!layer) {
      for (const node of Array.from(el.childNodes)) if (node.nodeType === 3) node.remove();
      layer = document.createElement('span');
      layer.className = 'tbtnGlyph';
      layer.setAttribute('aria-hidden', 'true');
      el.prepend(layer);
    }
    layer.textContent = glyph || '';
    return layer;
  },

  setCooldownButton(id, remaining, total, readyColor, enabled = true) {
    const el = this.el(id);
    if (!el) return;
    remaining = Math.max(0, Number(remaining) || 0);
    total = Math.max(.01, Number(total) || 1);
    const frac = enabled ? U.clamp(remaining / total, 0, 1) : 0;
    const cooling = enabled && remaining > .025;
    el.classList.toggle('cooling', cooling);
    el.classList.toggle('skillReady', enabled && !cooling);
    el.classList.toggle('skillUnavailable', !enabled);
    el.style.setProperty('--cooldown-angle', Math.round(frac * 360) + 'deg');
    el.style.setProperty('--ready-color', readyColor || '#ffffff');
    el.style.backgroundImage = '';
    el.style.filter = '';
    let number = el.querySelector('.cooldownNumber');
    if (!number) {
      number = document.createElement('span');
      number.className = 'cooldownNumber';
      number.setAttribute('aria-hidden', 'true');
      el.appendChild(number);
    }
    number.textContent = cooling ? (remaining >= 1 ? String(Math.ceil(remaining)) : remaining.toFixed(1)) : '';
  },

  syncWeaponUI() {
    if (!G.me) return;
    this.skinTouchControls();
    const w = G.me.weapon && Weapons[G.me.weapon] ? Weapons[G.me.weapon] : null;
    const weaponName = id => (typeof Story !== 'undefined' && Story.weaponText ? Story.weaponText(id, 'name') : (Weapons[id] && Weapons[id].name)) || (Weapons[id] && Weapons[id].name) || 'weapon';
    const base = G.me.char === 'joku' ? '🌊' : '🌸';
    let temp = null;
    const sp = this.el('tSp');
    if (sp) {
      const tr = typeof Game !== 'undefined' && Game.activeLoveTrial ? Game.activeLoveTrial() : null;
      temp = tr && tr.stage === 3 ? Story.trialPowers(G.levelIndex)[G.me.char] : null;
      this.setTouchGlyph('tSp', temp ? temp.icon : base);
      sp.classList.toggle('trialPowerButton', !!temp);
      sp.title = temp ? temp.name + ': ' + temp.effect : (G.me.char === 'joku' ? Story.t('oceanDash') : Story.t('healingBloom'));
      sp.setAttribute('aria-label', sp.title);
      sp.style.borderColor = '';
      sp.style.boxShadow = '';
    }
    const wp = this.el('tWeapon');
    if (wp) {
      this.setTouchGlyph('tWeapon', '');
      if (typeof ASSETS !== 'undefined' && ASSETS.skinWeaponButton) ASSETS.skinWeaponButton(wp, w ? G.me.weapon : null);
      wp.title = w ? weaponName(G.me.weapon) + ': ' + Story.weaponText(G.me.weapon, 'skill') : Story.t('equipWeaponUnlock');
      wp.setAttribute('aria-label', wp.title);
      wp.style.borderColor = w ? w.color : '';
    }
    const near = (typeof Game !== 'undefined' && Game.nearestWeapon) ? Game.nearestWeapon(G.me) : null;
    const drop = this.el('btnDropWeapon');
    if (drop) {
      drop.textContent = near && Weapons[near.weapon] ? Story.t('pickWeapon', { weapon: weaponName(near.weapon) }) : (w ? Story.t('dropNamed', { weapon: weaponName(G.me.weapon) }) : Story.t('pickDropWeapon'));
    }
    const tDrop = this.el('tDrop');
    if (tDrop) {
      if (near && Weapons[near.weapon]) {
        this.setTouchGlyph('tDrop', '⬆');
        tDrop.title = Story.t('pickWeapon', { weapon: weaponName(near.weapon) });
      } else if (w) {
        this.setTouchGlyph('tDrop', '⇩');
        tDrop.title = Story.t('dropNamed', { weapon: weaponName(G.me.weapon) });
      } else {
        this.setTouchGlyph('tDrop', '◇');
        tDrop.title = Story.t('standNearWeapon');
      }
      tDrop.setAttribute('aria-label', tDrop.title);
    }
    const p = G.me;
    if (p) {
      const atkMax = p.char === 'joku' ? .38 : .46;
      this.setCooldownButton('tAtk', p.atkCd, atkMax, '#ffffff');
      this.setCooldownButton('tSp', temp ? 0 : p.spCd, 2.2, p.char === 'joku' ? '#7fd8ff' : '#ff9fce');
      this.setCooldownButton('tWeapon', w ? p.weaponCd : 0, w ? (w.cd || 6) : 1, w ? w.color : '#fff3a8', !!w);
    }
    this.syncWeaponInfo();
  },

  syncWeaponInfo() {
    const box = this.el('weaponInfo');
    if (!box || typeof Weapons === 'undefined') return;
    const vi = typeof Story !== 'undefined' && Story.isVietnamese && Story.isVietnamese();
    const id = G.me && G.me.weapon && Weapons[G.me.weapon] ? G.me.weapon : '';
    const w = id ? Weapons[id] : null;
    const key = [typeof Story !== 'undefined' && Story.LANG, id, w && w.name, w && w.role, w && w.skill, w && w.benefit, G.me && G.me.char, Input.touchMode].join('|');
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    if (!w) {
      box.innerHTML = `<h3>${Story.t('yourWeapon')}</h3><div class="weaponInfoEmpty">${Story.t('noWeaponInfo')}</div>`;
      return;
    }
    const who = G.me.char === 'joku' ? 'Joku' : 'Jolie';
    const trigger = Input.touchMode ? (vi ? 'nut Ky nang vu khi' : 'Weapon Skill button') : 'U/O/B';
    const skill = Story.weaponText(id, 'skill') || w.skill;
    const desc = Story.weaponText(id, 'desc') || '';
    const role = Story.weaponText(id, 'role') || w.role || 'Attack';
    const benefit = vi ? (w.benefitVi || w.benefit || desc) : (w.benefit || desc);
    const attack = Math.round((w.dmg || 1) * 100) + '%';
    const speed = Math.round((w.speed || 1) * 100) + '%';
    const cooldown = (w.cd || 6).toFixed(1) + 's';
    const text = Story.t('weaponUse', { skill, desc, trigger });
    box.innerHTML = `<h3>${Story.t('weaponOwner', { name: who })}</h3><div class="weaponInfoItem current"><span>${w.icon}</span><div><b>${Story.weaponText(id, 'name') || w.name}</b><br>${text}<div class="weaponInfoStats"><span class="weaponInfoStat"><b>${attack}</b>${Story.t('weaponAttack')}</span><span class="weaponInfoStat"><b>${speed}</b>${Story.t('weaponSpeed')}</span><span class="weaponInfoStat"><b>${cooldown}</b>${Story.t('weaponCooldown')}</span></div><span class="weaponInfoBenefit"><b>${Story.t('weaponTeamEffect')}:</b> ${benefit}</span></div><span class="weaponInfoRole">${role}</span></div>`;
  },

  showItemPopup(kind, data = {}) {
    const popup = this.el('itemPopup');
    if (!popup) return;
    let icon = '', title = '', summary = '', stats = '';
    if (kind === 'weapon') {
      const w = Weapons[data.weapon];
      if (!w) return;
      const vi = Story.isVietnamese && Story.isVietnamese();
      const skill = Story.weaponText(data.weapon, 'skill') || w.skill;
      const desc = Story.weaponText(data.weapon, 'desc') || w.desc || '';
      const role = Story.weaponText(data.weapon, 'role') || w.role || Story.t('weaponAttack');
      const benefit = vi ? (w.benefitVi || w.benefit || desc) : (w.benefit || desc);
      icon = '';
      title = Story.t('pickupEquipped') + ': ' + (Story.weaponText(data.weapon, 'name') || w.name);
      summary = skill + '. ' + benefit;
      stats = `${role} | ${Story.t('weaponAttack')} ${Math.round((w.dmg || 1) * 100)}% | ${Story.t('weaponSpeed')} ${Math.round((w.speed || 1) * 100)}% | ${Story.t('weaponCooldown')} ${(w.cd || 6).toFixed(1)}s`;
    } else {
      const pickups = {
        orb: ['orb', 'pickupOrb', 'pickupOrbEffect'],
        flower: ['flower', 'pickupFlower', 'pickupFlowerEffect'],
        heartDrop: ['heart', 'pickupHeart', 'pickupHeartEffect'],
        mote: ['mote', 'pickupMote', 'pickupMoteEffect']
      };
      const def = pickups[kind];
      if (!def) return;
      icon = { orb: 'MP', flower: 'HP', heart: 'LOVE', mote: 'MP' }[def[0]];
      title = Story.t(def[1]);
      summary = Story.t(def[2]);
    }
    const iconEl = this.el('itemPopupIcon');
    const weaponIcon = kind === 'weapon' && typeof ASSETS !== 'undefined' && ASSETS.weaponIconUrl ? ASSETS.weaponIconUrl(data.weapon) : '';
    iconEl.textContent = icon;
    iconEl.classList.toggle('weaponArt', !!weaponIcon);
    if (weaponIcon) iconEl.style.setProperty('--popup-weapon-icon', `url("${weaponIcon}")`);
    else iconEl.style.removeProperty('--popup-weapon-icon');
    this.el('itemPopupTitle').textContent = title;
    this.el('itemPopupText').textContent = summary;
    this.el('itemPopupStats').textContent = stats;
    clearTimeout(this._itemPopupT);
    clearTimeout(this._itemPopupHideT);
    popup.classList.remove('hidden');
    requestAnimationFrame(() => popup.classList.add('show'));
    this._itemPopupT = setTimeout(() => {
      popup.classList.remove('show');
      this._itemPopupHideT = setTimeout(() => popup.classList.add('hidden'), 160);
    }, kind === 'weapon' ? 2800 : 1350);
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

Main.showEnd = function(stats, seconds) {
  let ep = this.el('endPanel');
  if (ep) ep.remove();
  const vi = typeof Story !== 'undefined' && Story.isVietnamese && Story.isVietnamese();
  const loveLines = (typeof Story !== 'undefined' && Story.loveLines && Story.loveLines().length)
    ? Story.loveLines()
    : ['Joku and Jolie brought the light back together.'];
  const loveLine = loveLines[(Math.random() * loveLines.length) | 0];
  const finalBoss = (G.level && G.level.boss && G.level.boss.bossName) || (vi ? 'boss cuoi' : 'the final boss');
  ep = document.createElement('div');
  ep.id = 'endPanel';
  ep.className = 'overlay';
  ep.innerHTML = vi ? `
    <div class="panel">
      <h2>Tinh yeu da tro lai!</h2>
      <p style="font-size:17px"><b>Chuc mung Joku va Jolie!</b></p>
      <p>${loveLine}</p>
      <p style="font-size:16px">${finalBoss} da diu lai, anh sang rung bung len lan nua,<br>
      va Joku &amp; Jolie tiep tuc yeu nhau qua tung cuoc phieu luu.</p>
      <p style="font-size:15px; line-height:2">
        Water orbs: <b>${stats.orbs}</b> &nbsp; Flowers: <b>${stats.flowers}</b><br>
        Hearts: <b>${stats.hearts}</b> &nbsp; Hugs: <b>${stats.hugs}</b> &nbsp; Kisses: <b>${stats.kisses}</b><br>
        Shadows cleared: <b>${stats.kills}</b> &nbsp; Time: <b>${U.fmtTime(seconds)}</b>
      </p>
      <p class="dim">danh cho Joku &amp; Jolie</p>
      <button id="btnAgain" class="mbtn join">Choi lai</button>
      <button id="btnEndMenu" class="mbtn ghost">Menu</button>
    </div>` : `
    <div class="panel">
      <h2>Love has returned!</h2>
      <p style="font-size:17px"><b>Congratulations, Joku and Jolie!</b></p>
      <p>${loveLine}</p>
      <p style="font-size:16px">${finalBoss} softened, the forest lights shone again,<br>
      and Joku &amp; Jolie kept loving each other through every adventure.</p>
      <p style="font-size:15px; line-height:2">
        Water orbs: <b>${stats.orbs}</b> &nbsp; Flowers: <b>${stats.flowers}</b><br>
        Hearts: <b>${stats.hearts}</b> &nbsp; Hugs: <b>${stats.hugs}</b> &nbsp; Kisses: <b>${stats.kisses}</b><br>
        Shadows cleared: <b>${stats.kills}</b> &nbsp; Time: <b>${U.fmtTime(seconds)}</b>
      </p>
      <p class="dim">made for Joku &amp; Jolie</p>
      <button id="btnAgain" class="mbtn join">Play Again</button>
      <button id="btnEndMenu" class="mbtn ghost">Menu</button>
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
