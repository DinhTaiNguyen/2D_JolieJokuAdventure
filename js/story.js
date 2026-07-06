'use strict';
/* ============ Vietnamese love story, dialogues & cutscene scripts ============ */
const Story = {
  NAMES: { joku: 'Joku', jolie: 'Jolie', dog: 'Lulu', panda: 'Biscuit' },
  COLORS: { joku: '#7fd8ff', jolie: '#ffa9d8', dog: '#9fd0ff', panda: '#ffc4dc' },
  LANG: 'en',

  setLanguage(lang) { this.LANG = lang === 'vi' ? 'vi' : 'en'; },
  isVietnamese() { return this.LANG === 'vi'; },
  dialog(key) {
    const primary = this.isVietnamese() ? this.DLG : this.DLG_EN;
    const fallback = this.isVietnamese() ? this.DLG_EN : this.DLG;
    return (primary && primary[key]) || (fallback && fallback[key]) || [];
  },
  hasDialog(key) { return this.dialog(key).length > 0; },
  loveLines() {
    const lines = this.isVietnamese() ? this.LOVE_LINES : this.LOVE_LINES_EN;
    return lines || this.LOVE_LINES || [];
  },

  LOVE_LINES: [
    'Joku và Jolie đã chứng minh rằng tình yêu mạnh nhất khi Lulu và Biscuit cùng chạy bên cạnh.',
    'Mỗi chương sáng hơn vì Joku, Jolie, Lulu và Biscuit luôn chọn bảo vệ nhau.',
    'Khu rừng sẽ nhớ mãi: hai trái tim, hai bạn đồng hành, và một cuộc phiêu lưu không bao giờ hết yêu.',
    'Lulu sủa vang, Biscuit reo mừng, còn Joku và Jolie biến mọi bóng tối thành chuyện tình rực sáng.'
  ],

  TRIALS: [
    [
      { title: 'Lời hứa dưới tán lá', hint: 'Cả hai đứng trong vòng và nắm tay để cây rừng tin vào tình yêu.', done: 'Rừng đã nghe lời hứa của hai bạn!' },
      { title: 'Cành hoa cần hai nhịp tim', hint: 'Đứng sát nhau, giữ trái tim, và cùng sưởi ấm mầm hoa.', done: 'Mầm hoa nở ra một món quà sáng!' }
    ],
    [
      { title: 'Cầu vồng bên thác', hint: 'Nắm tay trong vòng sáng để nối lại cầu vồng bị vỡ.', done: 'Cầu vồng đã trở lại trên mặt nước!' },
      { title: 'Dòng nước chung nhịp', hint: 'Hai người cùng giữ trái tim để dòng thác dịu lại.', done: 'Dòng thác mở đường bằng ánh bạc!' }
    ],
    [
      { title: 'Điệu múa hoa đào', hint: 'Cùng đứng trong vòng, nắm tay và để cánh hoa xoay quanh hai bạn.', done: 'Hoa đào tặng vũ khí cho tình yêu!' },
      { title: 'Lời chúc của vườn hoa', hint: 'Joku và Jolie cần ở cạnh nhau để khu vườn tiếp tục nở.', done: 'Khu vườn đã chúc phúc cho hai bạn!' }
    ],
    [
      { title: 'Ngọn đèn trong hang tối', hint: 'Đứng gần nhau và nắm tay để thắp sáng bóng đêm.', done: 'Bóng tối lùi lại trước ánh đèn tình yêu!' },
      { title: 'Cánh cửa không cô đơn', hint: 'Hai trái tim cùng giữ nhịp để cánh cửa chịu mở.', done: 'Cánh cửa đã hiểu rằng không ai bị bỏ lại!' }
    ],
    [
      { title: 'Mưa mát dưới tán lửa', hint: 'Cùng nắm tay để gọi cơn mưa nhỏ làm dịu đám cháy.', done: 'Ngọn lửa hóa thành ánh ấm bảo vệ hai bạn!' },
      { title: 'Than hồng biết yêu', hint: 'Đứng trong vòng và giữ trái tim cho đến khi than hồng đổi màu.', done: 'Than hồng tặng lại một báu vật lấp lánh!' }
    ],
    [
      { title: 'Lời thề dưới trời sao', hint: 'Hai người cùng nắm tay để những vì sao ghi nhớ lời hứa.', done: 'Các vì sao mở lối cho chương cuối!' },
      { title: 'Chòm sao của bốn người bạn', hint: 'Joku, Jolie, Lulu và Biscuit cần cùng một nhịp yêu thương.', done: 'Chòm sao tình yêu đã sáng trọn vẹn!' }
    ],
  ],
  COOP_TRIALS: [
    { title: 'Nàng tiên hoa và cây cầu rừng', hint: 'Mỗi người đứng trên một dấu sáng, nắm tay bằng trái tim để nàng tiên mọc cầu dây leo.', done: 'Cây cầu hoa đã mở. Hai bạn đã qua được khe rừng!' },
    { title: 'Phượng hoàng biển gọi sóng', hint: 'Đứng hai bên vòng sáng, giữ trái tim để Joku gọi nước và Jolie giữ nhịp hoa băng qua đại dương.', done: 'Phượng hoàng biển đã hạ cánh, sóng mở thành lối đi!' },
    { title: 'Tiên hoa nâng núi', hint: 'Chia nhau giữ hai dấu sáng để hoa tiên dựng bậc thang lên sườn núi.', done: 'Những bậc hoa đã nâng hai bạn vượt qua vách núi!' },
    { title: 'Đèn đôi trong hang tối', hint: 'Hai người thắp hai ngọn đèn cùng lúc bằng trái tim, đừng để bóng tối tách ra.', done: 'Hai ngọn đèn đã nhập một, hang tối nhường đường!' },
    { title: 'Mưa tình yêu dập lửa', hint: 'Joku giữ dấu nước, Jolie giữ dấu hoa, cùng nắm tay để gọi cơn mưa dịu lửa.', done: 'Ngọn lửa đã tắt, tro nóng biến thành đường an toàn!' },
    { title: 'Gương sao của bốn trái tim', hint: 'Đứng trên hai gương sao và giữ trái tim để Lulu, Biscuit nối chòm sao còn thiếu.', done: 'Chòm sao đã thẳng hàng, con đường cuối cùng sáng lên!' },
  ],

  trialInfo(levelIdx, id) {
    const coop = this.isVietnamese() ? this.COOP_TRIALS : this.COOP_TRIALS_EN;
    const trials = this.isVietnamese() ? this.TRIALS : this.TRIALS_EN;
    if (String(id || '') === 'trial0' && coop && coop[levelIdx]) return coop[levelIdx];
    const set = (trials && (trials[levelIdx] || trials[0])) || this.TRIALS[levelIdx] || this.TRIALS[0];
    const n = U.clamp(parseInt(String(id || '0').replace(/\D/g, ''), 10) || 0, 0, set.length - 1);
    return set[n] || (trials && trials[0] && trials[0][0]) || this.TRIALS[0][0];
  },

  DLG: {
    intro: [
      ['jolie', 'Joku, ánh sáng trong rừng đang yếu dần. Những bông hoa như đang run lên.'],
      ['joku', 'Gloomheart lại đánh cắp tình yêu của khu rừng. Nhưng lần này chúng ta không đi một mình.'],
      ['dog', 'Gâu gâu! Lulu ngửi thấy rắc rối phía trước!'],
      ['panda', 'Biscuit nghe thấy tiếng đồ ăn... à không, tiếng nhiệm vụ!'],
      ['joku', 'Jolie, cứ ở gần anh. Sóng nước của anh sẽ che chở cho em.'],
      ['jolie', 'Còn hoa của em sẽ chữa lành cho anh. Luôn luôn là vậy.'],
      ['jolie', 'Đi thôi. Chúng ta mang ánh sáng trở lại bằng tình yêu của mình.'],
    ],
    shrine0: [
      ['panda', 'Biscuit thấy Miếu Trái Tim đang thức dậy!'],
      ['jolie', 'Nơi này nhớ chúng ta. Joku, nếu lạc nhau, hãy quay lại điểm sáng này.'],
      ['joku', 'Và nếu một người ngã xuống, người kia sẽ kéo người ấy đứng dậy bằng một nụ hôn thật nhẹ.'],
      ['dog', 'Lulu sẽ canh gác. Không con quái nào được phá khoảnh khắc đó!'],
    ],
    gate0: [
      ['joku', 'Cổng trái tim đầu tiên. Nó chỉ mở khi hai người cùng đứng cạnh nhau.'],
      ['jolie', 'Vậy thì dễ rồi. Trái tim em luôn ở cạnh anh.'],
    ],
    lvl1: [
      ['jolie', 'Thác Pha Lê đẹp quá, nhưng tiếng nước nghe như đang khóc.'],
      ['joku', 'Chúng ta sẽ trả lại tiếng hát cho dòng thác. Cẩn thận đá trơn nhé.'],
      ['dog', 'Lulu không sợ nước. Lulu chỉ không thích bị gọi là bánh quy ướt!'],
    ],
    shrine1: [
      ['jolie', 'Miếu ở đây mát như sương. Em cảm thấy phép hoa mạnh hơn khi anh đứng gần.'],
      ['joku', 'Nếu chúng ta đánh cùng một mục tiêu, tình yêu cũng lớn nhanh hơn. Anh đã thấy điều đó.'],
      ['panda', 'Biscuit đề nghị: đánh quái nhanh, rồi nghỉ ăn bánh bên thác.'],
    ],
    gate1: [
      ['jolie', 'Cổng này nghe tiếng thác. Nó muốn biết chúng ta có cùng nhịp không.'],
      ['joku', 'Vậy ta bước cùng nhau. Một nhịp của em, một nhịp của anh.'],
    ],
    lvl2: [
      ['joku', 'Thung lũng Hoa Đào giống em quá, Jolie. Đẹp, dịu, nhưng không hề yếu đuối.'],
      ['jolie', 'Anh nói vậy là em có thêm lý do để thắng boss rồi đó.'],
      ['panda', 'Biscuit xin bảo vệ tất cả bông hoa. Và một ít mật ong nếu có.'],
    ],
    shrine2: [
      ['joku', 'Miếu này được bao quanh bởi lời chúc của hoa.'],
      ['jolie', 'Hoa nói rằng tình yêu không phải chỉ là ôm nhau, mà là cùng nhau đi tiếp khi đường khó.'],
      ['dog', 'Lulu đồng ý. Đi tiếp, nhưng nhớ gọi Lulu khi có quái lớn!'],
    ],
    gate2: [
      ['jolie', 'Cổng hoa không mở cho người vội vàng. Nó muốn chúng ta bình tĩnh.'],
      ['joku', 'Anh bình tĩnh rồi. Miễn là em vẫn nắm tay anh.'],
    ],
    lvl3: [
      ['joku', 'Hang Gloomheart tối hơn anh tưởng. Jolie, đừng rời xa ánh sáng của anh.'],
      ['jolie', 'Em không sợ. Vì bên cạnh em có anh, Lulu và Biscuit.'],
      ['dog', 'Gâu! Lulu sẽ sủa vào bóng tối cho đến khi nó xin lỗi!'],
    ],
    shrine3: [
      ['jolie', 'Miếu này yếu quá. Nó như một trái tim bị bỏ quên trong hang.'],
      ['joku', 'Vậy chúng ta sẽ cho nó thấy không ai phải cô đơn.'],
      ['panda', 'Biscuit sẽ ôm miếu. Biscuit ôm rất giỏi.'],
    ],
    gate3: [
      ['joku', 'Cổng tối này thử lòng chúng ta. Nếu một người chạy trước, nó sẽ đóng lại.'],
      ['jolie', 'Vậy không ai chạy một mình. Chúng ta cùng mở, cùng chiến đấu.'],
    ],
    lvl4: [
      ['jolie', 'Tán Cây Than Hồng đang cháy vì tình yêu bị lấy mất.'],
      ['joku', 'Anh sẽ gọi nước, em gọi hoa. Một bên làm dịu, một bên làm sống lại.'],
      ['panda', 'Biscuit đã chuẩn bị lòng can đảm. Và vài món ăn dự phòng.'],
    ],
    shrine4: [
      ['joku', 'Miếu này nóng quá. Nhưng tim em còn ấm hơn mọi ngọn lửa ở đây.'],
      ['jolie', 'Vậy dùng hơi ấm đó đúng cách: cứu rừng trước, tán tỉnh sau.'],
      ['dog', 'Lulu nghe thấy chữ cứu rừng. Lulu sẵn sàng!'],
    ],
    gate4: [
      ['jolie', 'Cổng lửa sẽ không mở nếu chúng ta chỉ đánh nhau. Nó cần sự dịu dàng nữa.'],
      ['joku', 'Anh hiểu. Sức mạnh để bảo vệ, dịu dàng để chữa lành.'],
    ],
    lvl5: [
      ['joku', 'Rừng Sao là con đường cuối. Mọi ánh sao như đang nhìn chúng ta.'],
      ['jolie', 'Vậy hãy để chúng thấy bốn người bạn kết thúc chuyện này bằng tình yêu.'],
      ['dog', 'Lulu và Biscuit cũng là sao hôm nay!'],
    ],
    shrine5: [
      ['jolie', 'Miếu cuối cùng. Em nghe thấy rất nhiều lời ước trong ánh sao.'],
      ['joku', 'Anh chỉ ước một điều: sau trận này, chúng ta vẫn cùng nhau cười.'],
      ['panda', 'Biscuit ước thêm đồ ăn mừng chiến thắng. Nhưng cũng ước hai bạn hạnh phúc.'],
    ],
    gate5: [
      ['joku', 'Cổng cuối. Sau nó là trái tim mạnh nhất của bóng tối.'],
      ['jolie', 'Không sao. Trái tim của chúng ta còn mạnh hơn.'],
      ['dog', 'Lulu đi trước một bước... à không, đi cùng mọi người!'],
    ],
    bossGate: [
      ['joku', 'Một cổng boss. Hít thở nào, Jolie. Chúng ta chuẩn bị rồi mới bước vào.'],
      ['jolie', 'Cùng nhau. Lulu, Biscuit, ở gần phía sau nhé.'],
      ['panda', 'Quá muộn rồi. Biscuit đã can đảm sẵn.'],
    ],
    bossIntro0: [
      ['jolie', 'Rễ cây kia đang siết cả khu rừng. Nó sợ tình yêu làm mình mềm lại.'],
      ['joku', 'Vậy ta dùng nước mở đường, dùng hoa giữ nhau đứng vững. Lulu, Biscuit, ở gần nhé.'],
      ['dog', 'Lulu sẽ cắn dây leo nào dám chạm vào Jolie!'],
    ],
    bossIntro1: [
      ['joku', 'Con thủy quái đang kéo thác xuống bóng tối. Sóng của nó mạnh hơn boss trước nhiều.'],
      ['jolie', 'Nếu nó cuốn anh đi, em sẽ gọi hoa níu anh lại. Mình đừng tách xa nhau.'],
      ['panda', 'Biscuit bỏ phiếu: né sóng trước, ăn mừng sau.'],
    ],
    bossIntro2: [
      ['jolie', 'Nữ hoàng gai dùng cái đẹp để giấu độc. Đừng để những bông hoa giả lừa mình.'],
      ['joku', 'Hoa thật là em. Gai nào cũng sẽ gãy nếu hai trái tim đánh cùng nhịp.'],
      ['dog', 'Gâu! Lulu phân biệt được hoa thơm và hoa xấu tính!'],
    ],
    bossIntro3: [
      ['joku', 'Gloomheart ở đây không chỉ tấn công. Nó sẽ biến mất, phòng thủ, rồi đánh vào người đứng xa.'],
      ['jolie', 'Vậy ta ở gần nhau. Nếu bóng tối muốn chia đôi chúng ta, nó đã thua từ đầu.'],
      ['panda', 'Biscuit sẽ làm ánh sáng nhỏ. Nhỏ nhưng rất bướng.'],
    ],
    bossIntro4: [
      ['jolie', 'Vương miện than hồng đang cháy dữ quá. Nó muốn chúng ta hoảng sợ và chạy riêng.'],
      ['joku', 'Không. Anh làm mát lửa, em giữ nhịp tim. Cùng tiến, cùng lùi.'],
      ['dog', 'Lulu không thích lửa, nhưng Lulu thích bảo vệ gia đình hơn!'],
    ],
    bossIntro5: [
      ['joku', 'Trái tim nhật thực đã dựng khiên sao quanh nó. Đây là trận cuối, Jolie.'],
      ['jolie', 'Vậy để các vì sao nhìn thấy tình yêu của chúng ta không né tránh bóng tối.'],
      ['panda', 'Biscuit và Lulu cũng là một phần lời thề này. Đi cùng nhau nào!'],
    ],
    bossIntro: [
      ['joku', () => 'Nó kia rồi! ' + ((G.level && G.level.boss && G.level.boss.bossName) || 'Boss cuối') + ' đang giữ tình yêu của chương này!'],
      ['jolie', 'Nó không chỉ hung dữ. Nó cô đơn. Nhưng cô đơn không được phép làm đau người khác.'],
      ['joku', 'Vậy chúng ta nhắc nó nhớ: nước, hoa, và hai trái tim cùng chiến đấu.'],
      ['jolie', 'Tránh sóng chấn động, giữ nhau gần, và khi tình yêu đầy thì trao nụ hôn mạnh nhất!'],
    ],
    ending: [
      ['jolie', () => 'Nhìn kìa! ' + ((G.level && G.level.boss && G.level.boss.bossName) || 'Boss cuối') + ' không còn giận dữ nữa. Ánh sáng đang trở lại!'],
      ['joku', 'Nó chỉ cần thấy tình yêu thật sự trông như thế nào.'],
      ['dog', 'Lulu thấy đèn rừng sáng lên rồi!'],
      ['panda', 'Biscuit tuyên bố: chiến thắng này cần một bữa ăn thật lớn!'],
      ['jolie', 'Joku, chúng ta làm được rồi.'],
      ['joku', 'Chúng ta luôn làm được, vì em là cuộc phiêu lưu mãi mãi của anh.'],
      ['jolie', 'Vậy thì hết lời thoại rồi. Lại đây hôn em đi.'],
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
        const key = Story.hasDialog('shrine' + L.idx) ? 'shrine' + L.idx : 'shrine0';
        return [
          { a: 'move2', jx: sx - 46, lx: sx + 46 },
          { a: 'face' },
          { a: 'fn', f: () => {
            L.shrineDone = true;
            SND.sfx('heal');
            Game.shake(4);
            Game.setCheckpoint(sx, L.shrineY || 500, 'Miếu Trái Tim', true);
            Ptc.burst('heart', sx, (L.shrineY || 500) - 70, 14, { sp: 130, r: 7, life: 1.2 });
            Game.toastMsg('Miếu Trái Tim đã lưu hành trình.');
          } },
          { a: 'dlg', key },
          { a: 'wait', t: .3 },
        ];
      }
      case 'gate': {
        const gx = L.gateX;
        const key = Story.hasDialog('gate' + L.idx) ? 'gate' + L.idx : 'bossGate';
        const bossKey = Story.hasDialog('bossIntro' + L.idx) ? 'bossIntro' + L.idx : 'bossIntro';
        return [
          { a: 'move2', jx: gx - 26, lx: gx + 26 },
          { a: 'face' },
          { a: 'dlg', key },
          { a: 'pose', pose: 'hug', t: 2.2 },
          { a: 'fn', f: () => { SND.sfx('heart'); Game.hugHearts(gx); G.stats.hugs++; } },
          { a: 'wait', t: 1.6 },
          { a: 'fn', f: () => { SND.sfx('gate'); G.level.gateOpen = true; Game.shake(5); } },
          { a: 'wait', t: .9 },
          { a: 'dlg', key: bossKey },
          { a: 'fn', f: () => Game.bossWake() },
        ];
      }
      case 'lvl':
        return [{ a: 'wait', t: .6 }, { a: 'dlg', key: 'lvl' + L.idx }];
      case 'bossIntro': {
        const bossKey = Story.hasDialog('bossIntro' + L.idx) ? 'bossIntro' + L.idx : 'bossIntro';
        return [{ a: 'wait', t: .5 }, { a: 'dlg', key: bossKey }, { a: 'fn', f: () => Game.bossWake() }];
      }
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

Story.LOVE_LINES_EN = [
  'Joku and Jolie proved that love is strongest when Lulu and Biscuit run beside it.',
  'Every chapter became brighter because Joku, Jolie, Lulu, and Biscuit kept choosing each other.',
  'The forest will remember this: two hearts, two supporters, and one adventure that never runs out of love.',
  'Lulu barked, Biscuit cheered, and Joku and Jolie turned every shadow into a brighter love story.'
];

Story.TRIALS_EN = [
  [
    { title: 'Promise Under the Leaves', hint: 'Both players stand in the glow and hold hands so the forest can trust your love.', done: 'The forest heard your promise!' },
    { title: 'A Bloom Needs Two Hearts', hint: 'Stand close, hold the heart, and warm the flower bud together.', done: 'The bud opened and offered a shining gift!' }
  ],
  [
    { title: 'Rainbow by the Falls', hint: 'Hold hands inside the glow to rebuild the broken rainbow bridge.', done: 'The rainbow returned above the water!' },
    { title: 'One Rhythm of Water', hint: 'Both players hold the heart until the waterfall calms down.', done: 'The waterfall opened a silver path!' }
  ],
  [
    { title: 'Dance of Cherry Blossoms', hint: 'Stand together in the ring, hold hands, and let petals spin around you.', done: 'The blossoms rewarded your love with a weapon!' },
    { title: 'Blessing of the Garden', hint: 'Joku and Jolie must stay close so the garden can keep blooming.', done: 'The garden blessed both of you!' }
  ],
  [
    { title: 'Lantern in the Dark Cave', hint: 'Stand near each other and hold hands to light the dark.', done: 'The darkness stepped back from your light!' },
    { title: 'A Door That Hates Loneliness', hint: 'Keep both hearts together until the door agrees to open.', done: 'The door learned that nobody is left behind!' }
  ],
  [
    { title: 'Rain Beneath Fire Leaves', hint: 'Hold hands together to call gentle rain over the flames.', done: 'The fire became warm guardian light!' },
    { title: 'Embers That Remember Love', hint: 'Stand in the ring and hold the heart until the embers change color.', done: 'The embers gave back a bright treasure!' }
  ],
  [
    { title: 'Vow Under the Stars', hint: 'Hold hands together so the stars can remember your promise.', done: 'The stars opened the final chapter path!' },
    { title: 'Constellation of Four Friends', hint: 'Joku, Jolie, Lulu, and Biscuit need the same loving rhythm.', done: 'The love constellation shone completely!' }
  ],
];

Story.COOP_TRIALS_EN = [
  { title: 'Flower Fairy and the Forest Bridge', hint: 'Each player stands on a glowing mark and holds the heart so the fairy can grow a vine bridge.', done: 'The flower bridge opened. You crossed the forest gap together!' },
  { title: 'Ocean Phoenix Calls the Waves', hint: 'Stand on both sides of the glow and hold the heart so Joku calls water while Jolie keeps the flower rhythm.', done: 'The ocean phoenix landed, and the waves became a safe path!' },
  { title: 'Flower Fairy Lifts the Mountain', hint: 'Split across the two glowing marks so the fairy can grow flower steps up the cliff.', done: 'Flower steps lifted both of you over the mountain wall!' },
  { title: 'Twin Lanterns in the Dark Cave', hint: 'Light both lanterns at the same time with the heart button before the darkness separates you.', done: 'The twin lanterns joined, and the cave gave way!' },
  { title: 'Love Rain Stops the Fire', hint: 'Joku holds the water mark, Jolie holds the flower mark, and both hold the heart to call cooling rain.', done: 'The fire went out, and warm ash became a safe road!' },
  { title: 'Star Mirror of Four Hearts', hint: 'Stand on the two star mirrors and hold the heart so Lulu and Biscuit complete the constellation.', done: 'The stars lined up, and the final path lit ahead!' },
];

Story.DLG_EN = {
  intro: [
    ['jolie', 'Joku, the light in the forest is fading. Even the flowers are trembling.'],
    ['joku', 'Gloomheart stole the forest love again, but this time we are not alone.'],
    ['dog', 'Woof! Lulu smells trouble ahead!'],
    ['panda', 'Biscuit hears snacks... no, missions! Definitely missions!'],
    ['joku', 'Stay close, Jolie. My water will guard you.'],
    ['jolie', 'And my flowers will heal you. Always.'],
    ['jolie', 'Let us bring the light back with our love.']
  ],
  shrine0: [
    ['panda', 'Biscuit sees the Heart Shrine waking up!'],
    ['jolie', 'This place remembers us. If we get separated, come back to this light.'],
    ['joku', 'And if one of us falls, the other will bring them back with a gentle kiss.'],
    ['dog', 'Lulu will guard the moment. No shadow gets to ruin it!']
  ],
  gate0: [
    ['joku', 'The first heart gate only opens when two people stand together.'],
    ['jolie', 'Easy. My heart is always beside yours.']
  ],
  lvl1: [
    ['jolie', 'Crystal Falls is beautiful, but the water sounds like it is crying.'],
    ['joku', 'We will return its song. Watch the slippery stones.'],
    ['dog', 'Lulu is not scared of water. Lulu just dislikes being called a wet biscuit!']
  ],
  shrine1: [
    ['jolie', 'This shrine feels cool as mist. My flower magic grows stronger when you stand near me.'],
    ['joku', 'When we attack the same target, our love grows faster too. I can feel it.'],
    ['panda', 'Biscuit suggests we defeat shadows quickly, then eat by the falls.']
  ],
  gate1: [
    ['jolie', 'This gate listens to the waterfall. It wants to know if we share one rhythm.'],
    ['joku', 'Then we step together. One beat from you, one beat from me.']
  ],
  lvl2: [
    ['joku', 'Cherry Blossom Valley reminds me of you, Jolie: gentle, beautiful, and never weak.'],
    ['jolie', 'Say that again after we beat the boss. It gives me extra power.'],
    ['panda', 'Biscuit will protect all flowers, and maybe a little honey if we find some.']
  ],
  shrine2: [
    ['joku', 'This shrine is surrounded by flower blessings.'],
    ['jolie', 'The flowers say love is not only hugging. It is moving forward together when the road is hard.'],
    ['dog', 'Lulu agrees. Keep going, but call Lulu when the big shadows arrive!']
  ],
  gate2: [
    ['jolie', 'The flower gate will not open for anyone rushing alone. It asks us to stay calm.'],
    ['joku', 'I am calm when your hand is near mine.']
  ],
  lvl3: [
    ['joku', 'Gloomheart Cave is darker than I imagined. Jolie, stay near my light.'],
    ['jolie', 'I am not afraid. I have you, Lulu, and Biscuit beside me.'],
    ['dog', 'Woof! Lulu will bark at the darkness until it apologizes!']
  ],
  shrine3: [
    ['jolie', 'This shrine feels weak, like a forgotten heart inside the cave.'],
    ['joku', 'Then we show it that nobody has to be alone.'],
    ['panda', 'Biscuit can hug a shrine. Biscuit is very good at hugs.']
  ],
  gate3: [
    ['joku', 'This dark gate tests our trust. If one person runs ahead, it closes.'],
    ['jolie', 'Then nobody runs alone. We open it together and fight together.']
  ],
  lvl4: [
    ['jolie', 'The Ember Canopy burns because love was stolen from it.'],
    ['joku', 'I will call water, and you call flowers. One cools the fire, one brings life back.'],
    ['panda', 'Biscuit prepared courage, and several emergency snacks.']
  ],
  shrine4: [
    ['joku', 'This shrine is hot, but your heart is warmer than any flame here.'],
    ['jolie', 'Use that warmth properly: save the forest first, flirt later.'],
    ['dog', 'Lulu heard "save the forest." Lulu is ready!']
  ],
  gate4: [
    ['jolie', 'The fire gate will not open if we only attack. It also needs gentleness.'],
    ['joku', 'I understand. Strength to protect, gentleness to heal.']
  ],
  lvl5: [
    ['joku', 'The Star Forest is the final road. Every star seems to be watching us.'],
    ['jolie', 'Then let them see four friends finish this with love.'],
    ['dog', 'Lulu and Biscuit are stars today too!']
  ],
  shrine5: [
    ['jolie', 'The last shrine. I can hear many wishes inside the starlight.'],
    ['joku', 'I only wish for one thing: after this battle, we are still laughing together.'],
    ['panda', 'Biscuit wishes for victory food. Also your happiness, of course.']
  ],
  gate5: [
    ['joku', 'The final gate. Behind it is the strongest heart of darkness.'],
    ['jolie', 'That is fine. Our hearts are stronger.'],
    ['dog', 'Lulu will go first... wait, no, together!']
  ],
  bossGate: [
    ['joku', 'A boss gate. Breathe with me, Jolie. We enter when we are ready.'],
    ['jolie', 'Together. Lulu, Biscuit, stay close behind us.'],
    ['panda', 'Too late. Biscuit is already brave.']
  ],
  bossIntro0: [
    ['jolie', 'Those roots are squeezing the whole forest. It fears love because love can soften it.'],
    ['joku', 'Then we use water to open the way and flowers to keep each other standing.'],
    ['dog', 'Lulu will bite any vine that touches Jolie!']
  ],
  bossIntro1: [
    ['joku', 'That water beast is dragging the falls into darkness. Its waves are stronger than before.'],
    ['jolie', 'If it pulls you away, my flowers will hold you. Do not drift too far from me.'],
    ['panda', 'Biscuit votes: dodge waves first, celebrate later.']
  ],
  bossIntro2: [
    ['jolie', 'The thorn queen hides poison behind beauty. Do not trust the false flowers.'],
    ['joku', 'The true flower is you. Any thorn breaks when two hearts strike together.'],
    ['dog', 'Woof! Lulu can smell nice flowers and mean flowers!']
  ],
  bossIntro3: [
    ['joku', 'Gloomheart will vanish, defend itself, then attack whoever stands alone.'],
    ['jolie', 'Then we stay close. If darkness wants to split us, it has already lost.'],
    ['panda', 'Biscuit will be a small light. Small, but stubborn.']
  ],
  bossIntro4: [
    ['jolie', 'The ember crown wants us scared and running in different directions.'],
    ['joku', 'No. I cool the fire, you keep our rhythm. Forward together, back together.'],
    ['dog', 'Lulu dislikes fire, but Lulu loves protecting family more!']
  ],
  bossIntro5: [
    ['joku', 'The eclipse heart has raised star shields around itself. This is the final fight, Jolie.'],
    ['jolie', 'Then let the stars see that our love does not run from darkness.'],
    ['panda', 'Biscuit and Lulu are part of this promise too. Together!']
  ],
  bossIntro: [
    ['joku', () => 'There it is! ' + ((G.level && G.level.boss && G.level.boss.bossName) || 'the boss') + ' is holding this chapter love hostage!'],
    ['jolie', 'It is not only angry. It is lonely. But loneliness is not allowed to hurt others.'],
    ['joku', 'Then we remind it: water, flowers, and two hearts fighting as one.'],
    ['jolie', 'Dodge the shockwaves, stay close, and when the Love Meter fills, kiss with all your power!']
  ],
  ending: [
    ['jolie', () => 'Look! ' + ((G.level && G.level.boss && G.level.boss.bossName) || 'the final boss') + ' is not angry anymore. The light is returning!'],
    ['joku', 'It only needed to see what real love looks like.'],
    ['dog', 'Lulu sees the forest lights turning on!'],
    ['panda', 'Biscuit declares this victory needs a very large meal!'],
    ['jolie', 'Joku, we did it.'],
    ['joku', 'We always do, because you are my forever adventure.'],
    ['jolie', 'Then the dialogue is over. Come kiss me.']
  ],
};
