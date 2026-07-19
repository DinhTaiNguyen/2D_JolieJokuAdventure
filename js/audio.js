'use strict';
/* ============ WebAudio: synth SFX + gentle music, no asset files ============ */
const SND = {
  ctx: null, master: null, musicGain: null, enabled: true, musicOn: true, volume: .5,
  _musicTimer: null, _step: 0, _theme: 0, _epic: false,

  storedVolume() {
    try {
      const raw = localStorage.getItem('jjVolume');
      return raw == null ? .5 : U.clamp(parseFloat(raw) || 0, 0, 1);
    } catch (e) { return .5; }
  },

  unlock() { // must be called from a user gesture (iOS/Android)
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = this.enabled ? this.volume : 0;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.16;
        this.musicGain.connect(this.master);
      } catch (e) { this.enabled = false; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  },

  setVolume(value, quiet = false) {
    this.volume = U.clamp(Number(value) || 0, 0, 1);
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    if (!quiet) {
      try { localStorage.setItem('jjVolume', String(this.volume)); } catch (e) {}
    }
    return this.volume;
  },

  tone(o) { // {f, f2, type, d, v, delay, curve}
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + (o.d || .15));
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.v || .2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (o.d || .15));
    osc.connect(g); g.connect(o.music ? this.musicGain : this.master);
    osc.start(t0); osc.stop(t0 + (o.d || .15) + .05);
  },

  noise(o) { // {d, v, f, delay} filtered noise burst
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + (o.delay || 0), d = o.d || .12;
    const len = Math.max(1, (d * c.sampleRate) | 0);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.f || 900;
    const g = c.createGain(); g.gain.value = o.v || .18;
    src.connect(fl); fl.connect(g); g.connect(this.master);
    src.start(t0);
  },

  sfx(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'ui':      this.tone({ f: 880, f2: 1320, type: 'sine', d: .07, v: .15 }); break;
      case 'jump':    this.tone({ f: 300, f2: 620, type: 'square', d: .12, v: .06 }); break;
      case 'jump2':   this.tone({ f: 420, f2: 860, type: 'square', d: .13, v: .06 });
                      this.tone({ f: 1200, f2: 2000, d: .1, v: .05, delay: .02 }); break;
      case 'shootJ':  this.tone({ f: 640, f2: 190, type: 'triangle', d: .18, v: .14 });
                      this.noise({ d: .1, v: .08, f: 1400 }); break;
      case 'shootP':  this.tone({ f: 980, f2: 1500, d: .08, v: .09 });
                      this.tone({ f: 1180, f2: 1700, d: .08, v: .07, delay: .05 }); break;
      case 'dash':    this.noise({ d: .25, v: .14, f: 700 });
                      this.tone({ f: 220, f2: 90, type: 'sawtooth', d: .25, v: .07 }); break;
      case 'bloom':   [523, 659, 784, 1046].forEach((f, i) => this.tone({ f, d: .3, v: .07, delay: i * .07 })); break;
      case 'hit':     this.noise({ d: .1, v: .2, f: 500 });
                      this.tone({ f: 200, f2: 70, type: 'sawtooth', d: .12, v: .1 }); break;
      case 'ehit':    this.noise({ d: .07, v: .12, f: 900 }); break;
      case 'ekill':   this.tone({ f: 320, f2: 60, type: 'square', d: .2, v: .09 });
                      this.noise({ d: .18, v: .12, f: 600 }); break;
      case 'orb':     this.tone({ f: 900, f2: 1350, d: .1, v: .1 });
                      this.tone({ f: 1350, f2: 1800, d: .12, v: .08, delay: .06 }); break;
      case 'weaponDrop':
                      this.tone({ f: 330, f2: 520, type: 'triangle', d: .16, v: .12 });
                      this.noise({ d: .16, v: .08, f: 1800, delay: .03 }); break;
      case 'weaponPickup':
                      [523, 784, 1175].forEach((f, i) => this.tone({ f, d: .18, v: .09, delay: i * .055 }));
                      this.tone({ f: 1568, f2: 2093, d: .18, v: .07, delay: .16 }); break;
      case 'flower':  this.tone({ f: 1100, f2: 1500, d: .09, v: .09 });
                      this.tone({ f: 1650, d: .1, v: .06, delay: .05 }); break;
      case 'heart':   this.tone({ f: 660, d: .1, v: .1 }); this.tone({ f: 990, d: .14, v: .1, delay: .07 }); break;
      case 'heal':    [660, 830, 990].forEach((f, i) => this.tone({ f, d: .2, v: .08, delay: i * .08 })); break;
      case 'kiss':    this.tone({ f: 500, f2: 1600, d: .5, v: .12 });
                      [784, 988, 1175, 1568].forEach((f, i) => this.tone({ f, d: .35, v: .09, delay: .25 + i * .09 })); break;
      case 'burst':   this.noise({ d: .5, v: .22, f: 2500 });
                      this.tone({ f: 180, f2: 60, type: 'sawtooth', d: .5, v: .12 });
                      [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ f, d: .4, v: .08, delay: .1 + i * .06 })); break;
      case 'gate':    [392, 494, 587, 784].forEach((f, i) => this.tone({ f, d: .5, v: .09, delay: i * .12 })); break;
      case 'down':    this.tone({ f: 300, f2: 70, type: 'triangle', d: .6, v: .14 }); break;
      case 'revive':  [440, 554, 659, 880].forEach((f, i) => this.tone({ f, d: .25, v: .09, delay: i * .07 })); break;
      case 'boss':    this.tone({ f: 90, f2: 45, type: 'sawtooth', d: .8, v: .18 });
                      this.noise({ d: .5, v: .15, f: 300 }); break;
      case 'slam':    this.noise({ d: .3, v: .25, f: 250 });
                      this.tone({ f: 100, f2: 40, type: 'sawtooth', d: .3, v: .16 }); break;
      case 'drum':    this.noise({ d: .32, v: .2, f: 260 });
                      this.tone({ f: 120, f2: 58, type: 'sine', d: .38, v: .17 });
                      this.tone({ f: 180, f2: 90, type: 'triangle', d: .24, v: .08, delay: .12 }); break;
      case 'powerWater':
                      this.noise({ d: .34, v: .12, f: 1700 });
                      [330, 494, 740, 988].forEach((f, i) => this.tone({ f, f2: f * 1.35, type: 'sine', d: .28, v: .08, delay: i * .055 })); break;
      case 'powerFlower':
                      [523, 659, 988, 1318].forEach((f, i) => this.tone({ f, f2: f * 1.18, d: .32, v: .075, delay: i * .065 })); break;
      case 'trialRide':
                      this.tone({ f: 196, f2: 392, type: 'triangle', d: .75, v: .12 });
                      [523, 659, 784, 1046].forEach((f, i) => this.tone({ f, d: .5, v: .08, delay: .12 + i * .09 })); break;
      case 'victory':
                      [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ f, d: .58, v: .09, delay: i * .1 })); break;
      case 'bark':    this.tone({ f: 520, f2: 340, type: 'square', d: .08, v: .11 });
                      this.tone({ f: 480, f2: 300, type: 'square', d: .09, v: .11, delay: .09 }); break;
    }
  },

  /* --------- tiny generative music: pad + arpeggio, theme per level --------- */
  THEMES: [ // [chord roots (Hz) cycled, arp scale intervals]
    { roots: [220.0, 174.6, 130.8, 196.0], mood: 1 },   // forest  Am F C G
    { roots: [146.8, 220.0, 174.6, 164.8], mood: 1 },   // falls   Dm Am F Em
    { roots: [174.6, 196.0, 220.0, 130.8], mood: 1.06 },// blossom F G Am C
    { roots: [110.0, 116.5, 110.0, 103.8], mood: .94 }, // shadow  darker
    { roots: [130.8, 164.8, 196.0, 146.8], mood: .98 }, // ember
    { roots: [196.0, 246.9, 164.8, 220.0], mood: 1.02 },// starlit
    { roots: [196.0, 220.0, 293.7, 246.9], mood: 1.0 }, // bamboo village, open pentatonic color
  ],
  ARP: [1, 1.5, 2, 2.4, 3, 4, 3, 2.4],

  startMusic(themeIdx, epic = false) {
    this._theme = U.clamp(themeIdx, 0, this.THEMES.length - 1);
    this._epic = epic;
    this.stopMusic();
    if (!this.ctx || !this.musicOn) return;
    this._step = 0;
    this._musicTimer = setInterval(() => this._musicStep(), epic ? 155 : 240);
  },
  stopMusic() { if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; } },
  _musicStep() {
    if (!this.enabled || !this.ctx || document.hidden) { this._step++; return; }
    const th = this.THEMES[this._theme];
    const bar = (this._step / 8 | 0) % th.roots.length;
    const root = th.roots[bar] * th.mood;
    const s = this._step % 8;
    if (s === 0) { // soft pad / boss drone
      this.tone({ f: root * (this._epic ? .5 : 1), type: this._epic ? 'sawtooth' : 'triangle', d: this._epic ? 1.2 : 1.9, v: this._epic ? .42 : .5, music: true });
      this.tone({ f: root * 1.5, type: 'triangle', d: this._epic ? 1.2 : 1.9, v: .3, music: true });
      this.tone({ f: root * 2.994, type: 'sine', d: this._epic ? 1 : 1.9, v: .22, music: true });
    }
    if (this._epic && this._step % 4 === 0) {
      this.noise({ d: .08, v: .045, f: 190, delay: 0 });
    }
    if (this._step % (this._epic ? 1 : 2) === 0) { // gentle/epic arp
      const n = this.ARP[(s + bar * 3) % 8];
      this.tone({ f: root * 2 * n, type: this._epic ? 'triangle' : 'sine', d: this._epic ? .18 : .32, v: this._epic ? .24 : .28, music: true });
    }
    this._step++;
  }
};

document.addEventListener('visibilitychange', () => {
  if (SND.ctx) { document.hidden ? SND.ctx.suspend() : SND.ctx.resume(); }
});
