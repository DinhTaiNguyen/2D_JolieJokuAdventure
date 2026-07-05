'use strict';
/* ============ small helpers ============ */
const U = {
  TAU: Math.PI * 2,
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  // deterministic RNG (mulberry32) so host & guest generate identical worlds
  rng(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  pick: (r, arr) => arr[(r() * arr.length) | 0],
  range: (r, a, b) => a + r() * (b - a),
  easeOut: t => 1 - Math.pow(1 - t, 3),
  easeInOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  fmtTime(s) { s |= 0; return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); }
};

const Weapons = {
  tideSpear: { name: 'Tide Spear', color: '#7fd8ff', shape: 'spear', icon: '🔱', skillIcon: '🌊', skill: 'longer phoenix', special: 'tideDash', dmg: 1.25, range: .22, speed: 1.1 },
  roseScepter: { name: 'Rose Scepter', color: '#ff86b8', shape: 'staff', icon: '🌹', skillIcon: '🌸', skill: 'rose bloom field', special: 'roseBloom', dmg: 1.18, shots: 2 },
  starBlade: { name: 'Star Blade', color: '#fff3a8', shape: 'sword', icon: '✦', skillIcon: '✨', skill: 'falling stars', special: 'starRain', dmg: 1.1, extra: 'starshot' },
  heartStaff: { name: 'Heart Staff', color: '#ffc4dc', shape: 'staff', icon: '♥', skillIcon: '💖', skill: 'heart heal', special: 'heartHeal', dmg: 1.0, mpSave: true },
  moonBow: { name: 'Moon Bow', color: '#c9d7ff', shape: 'bow', icon: '🏹', skillIcon: '🌙', skill: 'triple moon arrows', special: 'moonVolley', dmg: 1.08, shots: 3, spread: .18, speed: 1.18 },
  emberAxe: { name: 'Ember Axe', color: '#ff8a4a', shape: 'axe', icon: '🪓', skillIcon: '🔥', skill: 'flame arc', special: 'emberArc', dmg: 1.35, extra: 'ember' },
  thunderHammer: { name: 'Thunder Hammer', color: '#ffe66d', shape: 'hammer', icon: '🔨', skillIcon: '⚡', skill: 'thunder slam', special: 'thunderSlam', dmg: 1.3 },
  crystalDagger: { name: 'Crystal Dagger', color: '#9ff4ff', shape: 'dagger', icon: '♦', skillIcon: '💎', skill: 'crystal burst', special: 'crystalBurst', dmg: 1.05, shots: 2, speed: 1.35 },
  shadowKatana: { name: 'Shadow Katana', color: '#b58cff', shape: 'katana', icon: '刀', skillIcon: '🌑', skill: 'shadow blink', special: 'shadowBlink', dmg: 1.22, range: .08 },
  sunShield: { name: 'Sun Shield', color: '#ffd36e', shape: 'shield', icon: '🛡', skillIcon: '☀', skill: 'sun guard', special: 'sunGuard', dmg: 1.0 },
  lotusFan: { name: 'Lotus Fan', color: '#ffb6e6', shape: 'fan', icon: '🪭', skillIcon: '🪷', skill: 'lotus wind', special: 'lotusWind', dmg: 1.02, shots: 4, spread: .32 },
  riverBow: { name: 'River Bow', color: '#56d6ff', shape: 'bow', icon: '🏹', skillIcon: '💧', skill: 'river wall', special: 'riverWall', dmg: 1.12, shots: 2, speed: 1.22 },
  cometSword: { name: 'Comet Sword', color: '#f3f0ff', shape: 'sword', icon: '☄', skillIcon: '☄', skill: 'comet dash', special: 'cometDash', dmg: 1.2, extra: 'starshot' },
  pandaBell: { name: 'Biscuit Bell', color: '#f5e6c8', shape: 'bell', icon: '🔔', skillIcon: '🍯', skill: 'snack blessing', special: 'pandaGift', dmg: 1.0 },
  luluClaw: { name: 'Lulu Claw', color: '#9fd0ff', shape: 'claw', icon: '爪', skillIcon: '🐾', skill: 'loyal howl', special: 'luluHowl', dmg: 1.18, shots: 2 },
  phoenixWand: { name: 'Phoenix Wand', color: '#ffb36b', shape: 'wand', icon: '🪄', skillIcon: '🕊', skill: 'phoenix nova', special: 'phoenixNova', dmg: 1.15, range: .15 },
  dreamLyre: { name: 'Dream Lyre', color: '#d9b6ff', shape: 'lyre', icon: '♪', skillIcon: '🎵', skill: 'sleep song', special: 'dreamSong', dmg: 1.02 },
  vineScythe: { name: 'Vine Scythe', color: '#9be27d', shape: 'scythe', icon: '☘', skillIcon: '🌿', skill: 'vine snare', special: 'vineSnare', dmg: 1.24 },
  auroraOrb: { name: 'Aurora Orb', color: '#8fffe7', shape: 'orb', icon: '◉', skillIcon: '🫧', skill: 'aurora shield', special: 'auroraShield', dmg: 1.05, shots: 3, spread: .22 },
  loveLantern: { name: 'Love Lantern', color: '#ff9fce', shape: 'lantern', icon: '♡', skillIcon: '💞', skill: 'love beacon', special: 'loveBeacon', dmg: 1.0, mpSave: true }
};
Weapons.IDS = Object.keys(Weapons);

// surface uncaught errors on screen (helps debugging on phones too)
addEventListener('error', e => {
  let el = document.getElementById('errbox');
  if (!el) {
    el = document.createElement('div');
    el.id = 'errbox';
    el.style.cssText = 'position:fixed;left:0;top:0;z-index:999;background:rgba(70,0,10,.92);color:#ffd7d7;font:11px/1.5 monospace;padding:6px 10px;max-width:100vw;white-space:pre-wrap;pointer-events:none;';
    document.body.appendChild(el);
  }
  if (el.textContent.length < 900) {
    el.textContent += e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno + '\n';
  }
});

// roundRect fallback for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.arcTo(x + w, y, x + w, y + h, r[1]);
    this.arcTo(x + w, y + h, x, y + h, r[2]);
    this.arcTo(x, y + h, x, y, r[3]);
    this.arcTo(x, y, x + w, y, r[0]);
    this.closePath();
    return this;
  };
}
