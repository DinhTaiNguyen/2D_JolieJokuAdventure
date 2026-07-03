'use strict';
/* ============ unified input: keyboard + virtual joystick + touch buttons ============ */
const Input = {
  keys: {},          // raw key state
  edges: {},         // one-shot presses, consumed by game
  stickX: 0, stickY: 0,
  vbtn: {},          // virtual button held state
  touchMode: false,
  _stickId: null, _stickOx: 0, _stickOy: 0,

  KEYMAP: {
    'arrowleft': 'left', 'a': 'left',
    'arrowright': 'right', 'd': 'right',
    'arrowup': 'jump', 'w': 'jump', ' ': 'jump',
    'arrowdown': 'downk', 's': 'downk',
    'j': 'attack', 'z': 'attack',
    'k': 'special', 'x': 'special',
    'l': 'heart', 'c': 'heart', 'e': 'heart',
    'enter': 'confirm', 'escape': 'pause'
  },

  init() {
    addEventListener('keydown', e => {
      const k = this.KEYMAP[e.key.toLowerCase()];
      if (!k) return;
      e.preventDefault();
      if (!this.keys[k]) this.edges[k] = true;
      this.keys[k] = true;
    });
    addEventListener('keyup', e => {
      const k = this.KEYMAP[e.key.toLowerCase()];
      if (k) { e.preventDefault(); this.keys[k] = false; }
    });

    // any tap on the canvas = dialog advance + audio unlock
    document.getElementById('game').addEventListener('pointerdown', () => {
      this.edges.tap = true; SND.unlock();
    });

    /* ---- virtual joystick ---- */
    const zone = document.getElementById('stickZone');
    const base = document.getElementById('stickBase');
    const knob = document.getElementById('stickKnob');
    const setKnob = (dx, dy) => { knob.style.left = (32 + dx) + 'px'; knob.style.top = (32 + dy) + 'px'; };

    zone.addEventListener('pointerdown', e => {
      this.touchMode = true; SND.unlock();
      this._stickId = e.pointerId;
      this._stickOx = e.clientX; this._stickOy = e.clientY;
      base.style.display = 'block';
      base.style.left = (e.clientX - 62) + 'px';
      base.style.top = (e.clientY - 62) + 'px';
      setKnob(0, 0);
      zone.setPointerCapture(e.pointerId);
      this.edges.tap = true;
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== this._stickId) return;
      let dx = e.clientX - this._stickOx, dy = e.clientY - this._stickOy;
      const d = Math.hypot(dx, dy), max = 48;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      this.stickX = dx / max; this.stickY = dy / max;
      setKnob(dx, dy);
      // flick up = jump
      if (this.stickY < -.72 && !this._stickJump) { this._stickJump = true; this.edges.jump = true; this.keys.jumpStick = true; }
      if (this.stickY > -.5) { this._stickJump = false; this.keys.jumpStick = false; }
    });
    const stickEnd = e => {
      if (e.pointerId !== this._stickId) return;
      this._stickId = null; this.stickX = 0; this.stickY = 0;
      this.keys.jumpStick = false; this._stickJump = false;
      base.style.display = 'none';
    };
    zone.addEventListener('pointerup', stickEnd);
    zone.addEventListener('pointercancel', stickEnd);

    /* ---- touch buttons ---- */
    const bind = (id, name) => {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); this.touchMode = true; SND.unlock();
        el.setPointerCapture(e.pointerId);
        el.classList.add('pressed');
        if (!this.vbtn[name]) this.edges[name] = true;
        this.vbtn[name] = true;
      });
      const up = e => { el.classList.remove('pressed'); this.vbtn[name] = false; };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    };
    bind('tJump', 'jump'); bind('tAtk', 'attack'); bind('tSp', 'special'); bind('tHeart', 'heart');

    document.addEventListener('contextmenu', e => e.preventDefault());

    // reveal touch UI on coarse pointers
    if (matchMedia('(pointer: coarse)').matches) this.touchMode = true;
  },

  axisX() {
    let x = 0;
    if (this.keys.left) x -= 1;
    if (this.keys.right) x += 1;
    if (Math.abs(this.stickX) > .18) x += this.stickX;
    return U.clamp(x, -1, 1);
  },
  held(name) { return !!(this.keys[name] || this.vbtn[name] || (name === 'jump' && this.keys.jumpStick)); },
  take(name) { const v = this.edges[name]; this.edges[name] = false; return !!v; },
  clearEdges() { this.edges = {}; }
};
