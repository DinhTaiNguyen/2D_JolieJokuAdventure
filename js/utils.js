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
  loveLantern: { name: 'Love Lantern', color: '#ff9fce', shape: 'lantern', icon: '♡', skillIcon: '💞', skill: 'love beacon', special: 'loveBeacon', dmg: 1.0, mpSave: true },
  sacredBamboo: { name: 'Sacred Bamboo Spear', nameVi: 'Thương Tre Thánh', color: '#a9dc62', shape: 'spear', icon: '🎋', skillIcon: '🎋', skill: 'bamboo phalanx', special: 'bambooPhalanx', dmg: 1.26, range: .18, speed: 1.08 },
  buffaloShield: { name: 'Buffalo Horn Shield', nameVi: 'Khiên Sừng Trâu', color: '#7fd8a6', shape: 'shield', icon: '🐃', skillIcon: '🛡', skill: 'guardian charge', special: 'buffaloCharge', dmg: 1.08 },
  goldenRiceSickle: { name: 'Golden Rice Sickle', nameVi: 'Liềm Lúa Vàng', color: '#f2cf58', shape: 'sickle', icon: '🌾', skillIcon: '🌾', skill: 'harvest moon', special: 'harvestArc', dmg: 1.22, speed: 1.06 },
  toOngSandal: { name: 'Dép Tổ Ong Boomerang', nameVi: 'Dép Tổ Ong Hồi Quy', color: '#e6bb73', shape: 'sandal', icon: '🩴', skillIcon: '🌀', skill: 'returning sandal', special: 'sandalRicochet', dmg: 1.12, speed: 1.12 }
};
const WeaponRoles = {
  tideSpear: 'Attack / mobility',
  roseScepter: 'Attack / healing field',
  starBlade: 'Attack',
  heartStaff: 'Love / healing',
  moonBow: 'Attack',
  emberAxe: 'Attack',
  thunderHammer: 'Attack / stun',
  crystalDagger: 'Attack',
  shadowKatana: 'Defense / mobility',
  sunShield: 'Defense',
  lotusFan: 'Attack / support',
  riverBow: 'Defense / attack',
  cometSword: 'Attack / mobility',
  pandaBell: 'Support / rewards',
  luluClaw: 'Attack / support',
  phoenixWand: 'Attack',
  dreamLyre: 'Love / control',
  vineScythe: 'Control / attack',
  auroraOrb: 'Defense / attack',
  loveLantern: 'Love / support',
  sacredBamboo: 'Attack / control',
  buffaloShield: 'Defense / mobility',
  goldenRiceSickle: 'Attack / support',
  toOngSandal: 'Attack / crowd control'
};
for (const id in WeaponRoles) if (Weapons[id]) Weapons[id].role = WeaponRoles[id];
const WeaponRolesVI = {
  tideSpear: 'Tan cong / di chuyen',
  roseScepter: 'Tan cong / hoi mau',
  starBlade: 'Tan cong',
  heartStaff: 'Tinh yeu / hoi mau',
  moonBow: 'Tan cong',
  emberAxe: 'Tan cong',
  thunderHammer: 'Tan cong / lam choang',
  crystalDagger: 'Tan cong',
  shadowKatana: 'Phong thu / di chuyen',
  sunShield: 'Phong thu',
  lotusFan: 'Tan cong / ho tro',
  riverBow: 'Phong thu / tan cong',
  cometSword: 'Tan cong / di chuyen',
  pandaBell: 'Ho tro / hoi phuc',
  luluClaw: 'Tan cong / ho tro',
  phoenixWand: 'Tan cong',
  dreamLyre: 'Tinh yeu / khong che',
  vineScythe: 'Khong che / tan cong',
  auroraOrb: 'Phong thu / tan cong',
  loveLantern: 'Tinh yeu / ho tro',
  sacredBamboo: 'Tan cong / khong che',
  buffaloShield: 'Phong thu / di chuyen',
  goldenRiceSickle: 'Tan cong / ho tro',
  toOngSandal: 'Tan cong / don nhieu quai'
};
for (const id in WeaponRolesVI) if (Weapons[id]) Weapons[id].roleVi = WeaponRolesVI[id];
const WeaponSkillText = {
  tideSpear: 'Tide dash strike',
  roseScepter: 'Rose healing field',
  starBlade: 'Falling star rain',
  heartStaff: 'Nearby heart heal',
  moonBow: 'Wide moon arrow volley',
  emberAxe: 'Heavy flame arc',
  thunderHammer: 'Friendly thunder slam',
  crystalDagger: 'Eight-way crystal burst',
  shadowKatana: 'Safe shadow blink',
  sunShield: 'Team sun guard',
  lotusFan: 'Lotus wind and field',
  riverBow: 'River wall barrage',
  cometSword: 'Comet dash shot',
  pandaBell: 'Biscuit snack blessing',
  luluClaw: 'Lulu loyal howl',
  phoenixWand: 'Phoenix nova circle',
  dreamLyre: 'Love sleep song',
  vineScythe: 'Vine snare control',
  auroraOrb: 'Aurora guard burst',
  loveLantern: 'Love beacon heal',
  sacredBamboo: 'Sacred bamboo phalanx',
  buffaloShield: 'Guardian buffalo charge',
  goldenRiceSickle: 'Golden harvest moon',
  toOngSandal: 'Returning sandal ricochet'
};
for (const id in WeaponSkillText) if (Weapons[id]) Weapons[id].skill = WeaponSkillText[id];
const WeaponSkillTextVI = {
  tideSpear: 'Luot song dam xuyen',
  roseScepter: 'Vung hoa hoi mau',
  starBlade: 'Mua sao roi',
  heartStaff: 'Hoi mau trai tim gan ben',
  moonBow: 'Loat ten trang rong',
  emberAxe: 'Vong lua nang',
  thunderHammer: 'Sam than dong minh',
  crystalDagger: 'Pha le no tam huong',
  shadowKatana: 'Luot bong toi an toan',
  sunShield: 'Khien mat troi cho doi',
  lotusFan: 'Gio sen va vung hoa',
  riverBow: 'Tuong song ban pha',
  cometSword: 'Kiem sao choi luot toi',
  pandaBell: 'Phuc lanh do an Biscuit',
  luluClaw: 'Tieng hua trung thanh Lulu',
  phoenixWand: 'Vong lua phuong hoang',
  dreamLyre: 'Khuc ru tinh yeu',
  vineScythe: 'Day leo troi chan',
  auroraOrb: 'Khien cuc quang bung no',
  loveLantern: 'Den tinh yeu hoi mau',
  sacredBamboo: 'Trận thương tre thần',
  buffaloShield: 'Trâu hộ mệnh xung phong',
  goldenRiceSickle: 'Trăng gặt lúa vàng',
  toOngSandal: 'Dép tổ ong hồi quy'
};
for (const id in WeaponSkillTextVI) if (Weapons[id]) Weapons[id].skillVi = WeaponSkillTextVI[id];
const WeaponDesc = {
  tideSpear: 'Dash forward safely and strike through a line of enemies.',
  roseScepter: 'Creates a healing flower field that also hurts nearby monsters.',
  starBlade: 'Drops five arcing stars, useful against flying and tall enemies.',
  heartStaff: 'Heals both nearby players and adds Love Meter safely.',
  moonBow: 'Fires a wide fan of fast arrows for crowd control.',
  emberAxe: 'Throws heavy flaming arcs that hit hard and fall onto enemies.',
  thunderHammer: 'Creates friendly shockwaves and stuns enemies around you.',
  crystalDagger: 'Bursts in every direction, excellent when surrounded.',
  shadowKatana: 'Blinks forward with invulnerability and damages nearby shadows.',
  sunShield: 'Protects both players and pushes back nearby enemies.',
  lotusFan: 'Fires petals and places a short healing/damage field ahead.',
  riverBow: 'Builds a vertical river barrage to cover both players.',
  cometSword: 'Dashes and fires a high-damage comet shot straight ahead.',
  pandaBell: 'Biscuit restores HP/MP and drops recovery items for the team.',
  luluClaw: 'Lulu howls, damaging and slowing enemies near both players.',
  phoenixWand: 'Explodes phoenix shots in a full circle for large fights.',
  dreamLyre: 'Adds love, damages weak enemies, and delays enemy attacks.',
  vineScythe: 'Roots a wide area, damages enemies, and slows their attacks.',
  auroraOrb: 'Gives a shield and fires orbiting bolts around the player.',
  loveLantern: 'Heals both players, adds love, and creates a safe beacon.',
  sacredBamboo: 'Fires a disciplined line of bamboo spears that pierces and delays enemy attacks.',
  buffaloShield: 'Guards both players, then charges forward with two protective ground waves.',
  goldenRiceSickle: 'Throws returning harvest arcs that damage enemies and restore a little HP to nearby partners.',
  toOngSandal: 'Throws playful returning sandals in both directions, excellent for enemies surrounding the couple.'
};
const WeaponDescVI = {
  tideSpear: 'Luot toi an toan va dam xuyen mot hang quai.',
  roseScepter: 'Tao vung hoa hoi mau va gay sat thuong quai o gan.',
  starBlade: 'Thả nam ngoi sao vong cung, rat tot de danh quai bay va quai cao.',
  heartStaff: 'Hoi mau cho ca hai nguoi o gan va tang thanh Love an toan.',
  moonBow: 'Ban loat ten nhanh va rong de don nhieu quai.',
  emberAxe: 'Nem vong lua nang, sat thuong cao va roi xuong dau quai.',
  thunderHammer: 'Tao song sam cua dong minh va lam choang quai quanh ban.',
  crystalDagger: 'No pha le tam huong, rat tot khi bi vay quanh.',
  shadowKatana: 'Luot toi co bat tu ngan va danh quai gan do.',
  sunShield: 'Bao ve ca hai nguoi va day lui quai o gan.',
  lotusFan: 'Ban canh hoa va dat vung hoi mau/gay sat thuong phia truoc.',
  riverBow: 'Dung tuong song de che chan va tan cong cho ca doi.',
  cometSword: 'Luot toi va ban sao choi sat thuong cao theo duong thang.',
  pandaBell: 'Biscuit hoi HP/MP va tha vat pham hoi phuc cho doi.',
  luluClaw: 'Lulu hua vang, gay sat thuong va lam cham quai gan ca hai.',
  phoenixWand: 'Ban phuong hoang vong tron, manh trong tran danh lon.',
  dreamLyre: 'Tang tinh yeu, gay sat thuong nhe, va lam cham don tan cong cua quai.',
  vineScythe: 'Troi chan vung rong, gay sat thuong va lam cham quai.',
  auroraOrb: 'Tao khien va ban tia sang quay quanh nguoi choi.',
  loveLantern: 'Hoi mau ca hai, tang tinh yeu, va tao diem an toan.',
  sacredBamboo: 'Phóng một hàng thương tre xuyên qua và làm chậm đòn đánh của quái.',
  buffaloShield: 'Bảo vệ cả hai người rồi xung phong cùng hai làn sóng hộ vệ.',
  goldenRiceSickle: 'Ném liềm gặt hồi quy, gây sát thương và hồi một ít HP cho người yêu ở gần.',
  toOngSandal: 'Ném dép tổ ong quay về theo hai hướng, rất hữu ích khi cả hai bị bao vây.'
};
for (const id in WeaponDesc) if (Weapons[id]) Weapons[id].desc = WeaponDesc[id];
for (const id in WeaponDescVI) if (Weapons[id]) Weapons[id].descVi = WeaponDescVI[id];
const WeaponCooldowns = {
  tideSpear: 5.2, roseScepter: 6.4, starBlade: 6.2, heartStaff: 7.2, moonBow: 5.6,
  emberAxe: 6.2, thunderHammer: 6.8, crystalDagger: 5.1, shadowKatana: 5.4, sunShield: 7.2,
  lotusFan: 6.0, riverBow: 6.1, cometSword: 5.8, pandaBell: 7.5, luluClaw: 6.4,
  phoenixWand: 7.0, dreamLyre: 6.8, vineScythe: 6.2, auroraOrb: 6.5, loveLantern: 7.0,
  sacredBamboo: 5.8, buffaloShield: 7.0, goldenRiceSickle: 6.2, toOngSandal: 5.4
};
for (const id in WeaponCooldowns) if (Weapons[id]) Weapons[id].cd = WeaponCooldowns[id];
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
