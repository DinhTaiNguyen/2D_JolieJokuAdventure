'use strict';
/* ============ the love story — dialogues & cutscene scripts ============ */
const Story = {
  NAMES: { joku: 'Joku', jolie: 'Jolie', dog: 'Kai', panda: 'Momo' },
  COLORS: { joku: '#7fd8ff', jolie: '#ffa9d8', dog: '#9fd0ff', panda: '#ffc4dc' },

  DLG: {
    intro: [
      ['jolie', 'Joku, look… the forest lights are fading. The flowers are scared.'],
      ['joku', 'The Gloomheart is stealing the forest\'s love again.'],
      ['dog', 'Woof woof! (I smell trouble ahead!)'],
      ['panda', 'Bao~ (Can we still stop for snacks?)'],
      ['joku', 'Stay close to me, Jolie. My ocean will protect you. 💙'],
      ['jolie', 'And my flowers will heal you. Always. 💗'],
      ['jolie', 'Let\'s bring the light back — together!'],
    ],
    shrine0: [
      ['panda', 'Bao bao! (A Heart Shrine! It\'s waking up!)'],
      ['jolie', 'It remembers us… Joku, hold my hand when we\'re close — tap the ❤ button!'],
      ['joku', 'And if you\'re hurt, come here. Hold ❤ and I\'ll hug you back to full bloom.'],
      ['dog', 'Woof woof! (And I\'ll BITE anything that dares touch you two!)'],
      ['panda', 'Bao~ (I\'ll toss healing hearts when someone is hurt. Momo\'s got you!)'],
      ['jolie', 'When our Love Meter is full… maybe something magical happens? 💕'],
    ],
    gate0: [
      ['joku', 'The Heart Gate! It only opens for two hearts side by side.'],
      ['jolie', 'Then it\'s a good thing I never leave yours. Come here! 🤗'],
    ],
    lvl1: [
      ['jolie', 'Crystal Falls… Joku, it\'s beautiful! The water sings like you.'],
      ['joku', 'Careful on the wet mushrooms. If you fall, I\'ll catch you. Always.'],
      ['dog', 'Woof! (Last one to the waterfall is a soggy biscuit!)'],
    ],
    shrine1: [
      ['jolie', 'The shrine again! My petals feel stronger near you.'],
      ['joku', 'When we strike the same monster together, our love grows faster. Did you notice?'],
      ['jolie', 'Then let\'s fight side by side. Like always. 💞'],
    ],
    gate1: [
      ['jolie', 'Another gate… another hug? What a terrible fate. 😊'],
      ['joku', 'Truly the hardest part of this adventure.'],
    ],
    lvl2: [
      ['joku', 'Blossom Glade. Jolie… this whole valley looks like you.'],
      ['jolie', 'Flatterer. The Gloomheart\'s shadow is close, I can feel it.'],
      ['panda', 'Bao… (The flowers here are too pretty to be sad. Let\'s protect them!)'],
    ],
    shrine2: [
      ['joku', 'The last shrine. Beyond this glade… the Gloomheart is waiting.'],
      ['jolie', 'I\'m not afraid. You know why?'],
      ['joku', 'Because my phoenix burns brightest beside you.'],
      ['jolie', 'Because *we* do. Now kiss me for luck when the meter is full. 💋'],
    ],
    gate2: [
      ['jolie', 'This is it. Behind this gate — the Gloomheart.'],
      ['joku', 'Whatever happens in there… my heart already belongs to you.'],
      ['jolie', 'Then let\'s go give the Gloomheart what it\'s missing. 💗'],
    ],
    bossIntro: [
      ['joku', 'There it is! The Gloomheart — a heart that forgot how to love!'],
      ['jolie', 'It\'s not evil, Joku. It\'s just… lonely. Look at it.'],
      ['joku', 'Then let\'s remind it! Water and flowers, together!'],
      ['jolie', 'Jump over its shockwaves! And when our love is full — KISS! 💥'],
    ],
    ending: [
      ['jolie', 'Look! It\'s… smiling. The Gloomheart is glowing pink!'],
      ['joku', 'It just needed to see what real love looks like.'],
      ['dog', 'Woof woof woof! (The lights! The forest lights are coming back!)'],
      ['panda', 'Bao bao~! (Now THIS calls for snacks!)'],
      ['jolie', 'Joku… we did it. We really did it.'],
      ['joku', 'WE always do. You\'re my forever adventure, Jolie.'],
      ['jolie', 'And you\'re mine. Now shut up and kiss me. 💗'],
    ],
  },

  /* ---- cutscene step scripts ---- */
  scene(name) {
    const L = G.level;
    switch (name) {
      case 'intro':
        return [{ a: 'dlg', key: 'intro' }];
      case 'shrine': {
        const sx = L.shrineX;
        return [
          { a: 'move2', jx: sx - 46, lx: sx + 46 },
          { a: 'face' },
          { a: 'fn', f: () => { L.shrineDone = true; SND.sfx('heal'); Game.shake(4); Ptc.burst('heart', sx, (L.shrineY || 500) - 70, 14, { sp: 130, r: 7, life: 1.2 }); Game.toastMsg('💖 Heart Shrine restored — checkpoint!'); } },
          { a: 'dlg', key: 'shrine' + Math.min(L.idx, 2) },
          { a: 'wait', t: .3 },
        ];
      }
      case 'gate': {
        const gx = L.gateX;
        return [
          { a: 'move2', jx: gx - 26, lx: gx + 26 },
          { a: 'face' },
          { a: 'dlg', key: 'gate' + Math.min(L.idx, 2) },
          { a: 'pose', pose: 'hug', t: 2.2 },
          { a: 'fn', f: () => { SND.sfx('heart'); Game.hugHearts(gx); G.stats.hugs++; } },
          { a: 'wait', t: 1.6 },
          { a: 'fn', f: () => { SND.sfx('gate'); G.level.gateOpen = true; Game.shake(5); } },
          { a: 'wait', t: .9 },
          { a: 'fade' },
          { a: 'fn', f: () => Game.nextLevel() },
        ];
      }
      case 'lvl':
        return [{ a: 'wait', t: .6 }, { a: 'dlg', key: 'lvl' + L.idx }];
      case 'bossIntro':
        return [{ a: 'wait', t: .5 }, { a: 'dlg', key: 'bossIntro' }, { a: 'fn', f: () => Game.bossWake() }];
      case 'ending': {
        const bx = G.level.boss ? G.level.boss.x : L.width * .6;
        return [
          { a: 'wait', t: 1.2 },
          { a: 'dlg', key: 'ending' },
          { a: 'move2', jx: bx - 200 - 24, lx: bx - 200 + 24 },
          { a: 'face' },
          { a: 'pose', pose: 'hug', t: 1.4 },
          { a: 'pose', pose: 'kiss', t: 3 },
          { a: 'fn', f: () => { SND.sfx('kiss'); G.stats.kisses++; Game.kissFireworks(bx - 200); } },
          { a: 'wait', t: 2.8 },
          { a: 'fade' },
          { a: 'fn', f: () => Game.showEnding() },
        ];
      }
    }
    return [];
  }
};
