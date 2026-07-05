'use strict';
/* ============ Vietnamese love story, dialogues & cutscene scripts ============ */
const Story = {
  NAMES: { joku: 'Joku', jolie: 'Jolie', dog: 'Lulu', panda: 'Biscuit' },
  COLORS: { joku: '#7fd8ff', jolie: '#ffa9d8', dog: '#9fd0ff', panda: '#ffc4dc' },

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

  trialInfo(levelIdx, id) {
    const n = U.clamp(parseInt(String(id || '0').replace(/\D/g, ''), 10) || 0, 0, 1);
    return (this.TRIALS[levelIdx] && this.TRIALS[levelIdx][n]) || this.TRIALS[0][n];
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
        const key = Story.DLG['shrine' + L.idx] ? 'shrine' + L.idx : 'shrine0';
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
        const key = Story.DLG['gate' + L.idx] ? 'gate' + L.idx : 'bossGate';
        return [
          { a: 'move2', jx: gx - 26, lx: gx + 26 },
          { a: 'face' },
          { a: 'dlg', key },
          { a: 'pose', pose: 'hug', t: 2.2 },
          { a: 'fn', f: () => { SND.sfx('heart'); Game.hugHearts(gx); G.stats.hugs++; } },
          { a: 'wait', t: 1.6 },
          { a: 'fn', f: () => { SND.sfx('gate'); G.level.gateOpen = true; Game.shake(5); } },
          { a: 'wait', t: .9 },
          { a: 'dlg', key: 'bossIntro' },
          { a: 'fn', f: () => Game.bossWake() },
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
