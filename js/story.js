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
  t(key, vars = {}) {
    const table = this.isVietnamese() ? this.UI_VI : this.UI_EN;
    const fallback = this.isVietnamese() ? this.UI_EN : this.UI_VI;
    let s = (table && table[key]) || (fallback && fallback[key]) || key;
    return String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
  },
  levelName(i) {
    const names = this.isVietnamese() ? this.LEVEL_NAMES_VI : this.LEVEL_NAMES_EN;
    return (names && names[i]) || (World.LEVELS[i] && World.LEVELS[i].name) || ('Chapter ' + (i + 1));
  },
  dateJourney(i) {
    const list = this.isVietnamese() ? this.DATE_JOURNEYS_VI : this.DATE_JOURNEYS_EN;
    return (list && list[i]) || (list && list[0]) || { title: 'Moonlit Walk', sub: 'Reach the Heartwood Door together.' };
  },
  weaponText(id, field) {
    if (typeof Weapons === 'undefined' || !Weapons[id]) return '';
    if (this.isVietnamese()) return Weapons[id][field + 'Vi'] || Weapons[id][field] || '';
    return Weapons[id][field] || Weapons[id][field + 'Vi'] || '';
  },

  LOVE_LINES: [
    'Joku và Jolie đã chứng minh rằng tình yêu mạnh nhất khi Lulu và Biscuit cùng chạy bên cạnh.',
    'Mỗi chương sáng hơn vì Joku, Jolie, Lulu và Biscuit luôn chọn bảo vệ nhau.',
    'Khu rừng sẽ nhớ mãi: hai trái tim, hai bạn đồng hành, và một cuộc phiêu lưu không bao giờ hết yêu.',
    'Lulu sủa vang, Biscuit reo mừng, còn Joku và Jolie biến mọi bóng tối thành chuyện tình rực sáng.'
  ],

  DATE_JOURNEYS_EN: [
    { title: 'Lantern Canopy Walk', sub: 'Run beneath waking leaves to the Heartwood Door.' },
    { title: 'Rainbow Falls Balcony', sub: 'Leap across the mist and meet at the water-lit door.' },
    { title: 'Petal Moonbridge', sub: 'Follow the floating blossoms to a garden made for two.' },
    { title: 'Lantern Mirror Grotto', sub: 'Light the quiet cave path and find each other at the door.' },
    { title: 'Rainfire Skywalk', sub: 'Cross the cooled embers beneath a sky of warm rain.' },
    { title: 'Starlight Promise Terrace', sub: 'Reach the next door together beneath the constellation.' },
    { title: 'Golden Harvest Date', sub: 'Cross the bamboo skywalk, rest by the hammock, and meet at the village door.' }
  ],
  DATE_JOURNEYS_VI: [
    { title: 'Duong den long den', sub: 'Cung chay duoi tan la den cua trai tim.' },
    { title: 'Ban cong thac cau vong', sub: 'Cung nhay qua suong mu den cua nuoc sang.' },
    { title: 'Cau hoa duoi trang', sub: 'Theo canh hoa bay den khu vuon danh cho hai nguoi.' },
    { title: 'Hang guong den long', sub: 'Cung thap den va tim den cua trai tim.' },
    { title: 'Cau troi mua lua', sub: 'Vuot than hong duoi con mua am ap.' },
    { title: 'San hen duoi anh sao', sub: 'Cung den canh cua tiep theo duoi chom sao.' },
    { title: 'Hen nhau mua gat vang', sub: 'Qua cau tre, nghi ben vong, roi cung den cong lang.' }
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
    [
      { title: 'Lời thề của tre thần', hint: 'Mỗi người giữ một dấu trống, nắm tay qua biển lũ, rồi ôm và hôn để đánh thức người bảo hộ.', done: 'Thánh Gióng đã đáp lời, tre thần kết thành cầu!' },
      { title: 'Lời hứa mùa gặt', hint: 'Đứng bên lúa vàng và cùng giữ nhịp trái tim.', done: 'Mùa gặt vàng đã chúc phúc hành trình!' }
    ],
  ],
  COOP_TRIALS: [
    { title: 'Nàng tiên hoa và cây cầu rừng', hint: 'Mỗi người đứng trên một dấu sáng, nắm tay bằng trái tim để nàng tiên mọc cầu dây leo.', done: 'Cây cầu hoa đã mở. Hai bạn đã qua được khe rừng!' },
    { title: 'Phượng hoàng biển gọi sóng', hint: 'Đứng hai bên vòng sáng, giữ trái tim để Joku gọi nước và Jolie giữ nhịp hoa băng qua đại dương.', done: 'Phượng hoàng biển đã hạ cánh, sóng mở thành lối đi!' },
    { title: 'Tiên hoa nâng núi', hint: 'Chia nhau giữ hai dấu sáng để hoa tiên dựng bậc thang lên sườn núi.', done: 'Những bậc hoa đã nâng hai bạn vượt qua vách núi!' },
    { title: 'Đèn đôi trong hang tối', hint: 'Hai người thắp hai ngọn đèn cùng lúc bằng trái tim, đừng để bóng tối tách ra.', done: 'Hai ngọn đèn đã nhập một, hang tối nhường đường!' },
    { title: 'Mưa tình yêu dập lửa', hint: 'Joku giữ dấu nước, Jolie giữ dấu hoa, cùng nắm tay để gọi cơn mưa dịu lửa.', done: 'Ngọn lửa đã tắt, tro nóng biến thành đường an toàn!' },
    { title: 'Gương sao của bốn trái tim', hint: 'Đứng trên hai gương sao và giữ trái tim để Lulu, Biscuit nối chòm sao còn thiếu.', done: 'Chòm sao đã thẳng hàng, con đường cuối cùng sáng lên!' },
    { title: 'Thánh Gióng và biển lũ', hint: 'Mỗi người giữ một dấu trống làng, phối hợp nước và hoa, rồi nắm tay, ôm và hôn để dựng cầu tre thần.', done: 'Ngựa sắt đã qua trời, tre thần mở đường cho hai trái tim!' },
  ],

  trialInfo(levelIdx, id) {
    const coop = this.isVietnamese() ? (this.COOP_TRIALS_VI || this.COOP_TRIALS) : this.COOP_TRIALS_EN;
    const trials = this.isVietnamese() ? this.TRIALS : this.TRIALS_EN;
    if (String(id || '') === 'trial0' && coop && coop[levelIdx]) return coop[levelIdx];
    const set = (trials && (trials[levelIdx] || trials[0])) || this.TRIALS[levelIdx] || this.TRIALS[0];
    const n = U.clamp(parseInt(String(id || '0').replace(/\D/g, ''), 10) || 0, 0, set.length - 1);
    return set[n] || (trials && trials[0] && trials[0][0]) || this.TRIALS[0][0];
  },

  trialPowers(levelIdx) {
    const list = this.isVietnamese() ? this.COOP_POWERS_VI : this.COOP_POWERS_EN;
    return (list && list[levelIdx]) || (list && list[0]) || {
      joku: { name: 'Water Bond', icon: 'W', effect: 'Stabilizes the path.' },
      jolie: { name: 'Flower Bond', icon: 'F', effect: 'Completes the path.' },
      travel: 'Your two powers join and carry you safely onward.'
    };
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
      ['joku', 'Rừng Sao đang chỉ một con đường vàng về phía quê tre. Mọi ánh sao như đang nhìn chúng ta.'],
      ['jolie', 'Vậy hãy để chúng thấy bốn người bạn mở con đường ấy bằng tình yêu.'],
      ['dog', 'Lulu và Biscuit cũng là sao hôm nay!'],
    ],
    shrine5: [
      ['jolie', 'Miếu sao này đang giữ một lời ước dẫn về quê hương. Em nghe thấy tiếng tre trong gió.'],
      ['joku', 'Anh chỉ ước một điều: sau trận này, chúng ta vẫn cùng nhau cười.'],
      ['panda', 'Biscuit ước thêm đồ ăn mừng chiến thắng. Nhưng cũng ước hai bạn hạnh phúc.'],
    ],
    gate5: [
      ['joku', 'Cổng sao này không phải kết thúc. Sau nó là con đường trở về Làng Tre.'],
      ['jolie', 'Không sao. Trái tim của chúng ta còn mạnh hơn.'],
      ['dog', 'Lulu đi trước một bước... à không, đi cùng mọi người!'],
    ],
    lvl6: [
      ['jolie', 'Làng Tre đẹp như một ký ức: lúa chín, trâu nằm bên ruộng, võng tre đợi dưới mái làng. Nhưng bầu trời đang mang tiếng vó ngựa của chiến tranh xưa.'],
      ['joku', 'Gloomheart đã biến ký ức những cuộc xâm lược thành bóng ma. Ta bảo vệ quê hương, nhưng không mang thù hận vào hiện tại.'],
      ['dog', 'Lulu sẽ canh ruộng lúa và cây tre! Không bóng ma nào được giẫm lên mùa gặt!'],
      ['panda', 'Biscuit sẽ bảo vệ trống làng. Và kiểm tra chuối hột, rượu Bàu Đá... chỉ để nghiên cứu văn hóa thôi!'],
    ],
    shrine6: [
      ['joku', 'Miếu quê hương nhớ sức mạnh của cây tre: mềm trong gió, nhưng đứng cùng nhau thì không dễ gãy.'],
      ['jolie', 'Giống chúng ta. Anh dập lửa, em kết tre; không ai tự vượt trận lũ này được.'],
      ['panda', 'Qua thử thách rồi mình nghỉ ở võng nhé. Biscuit nhận phần canh đồ ăn.'],
    ],
    gate6: [
      ['jolie', 'Sau cổng là bóng ma thiết kỵ của cuộc xâm lược thế kỷ mười ba. Nó có mưa tên, ngựa sắt và khiên tà thuật.'],
      ['joku', 'Ta né cùng nhịp, phá khiên cùng lúc, rồi dùng sức mạnh Thánh Gióng đẩy nó ra khỏi ký ức của ngôi làng.'],
      ['dog', 'Cả bốn cùng vào. Không ai bị bỏ lại phía sau!'],
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
      ['joku', 'Trái tim nhật thực đã dựng khiên sao quanh nó. Phía sau nó còn một cánh cửa vàng, Jolie.'],
      ['jolie', 'Vậy để các vì sao nhìn thấy tình yêu của chúng ta không né tránh bóng tối.'],
      ['panda', 'Biscuit và Lulu cũng là một phần lời thề này. Đi cùng nhau nào!'],
    ],
    bossIntro6: [
      ['joku', 'Hắc Thiết Tướng Quân Mông chỉ là bóng ma của đoàn quân xâm lược xưa, nhưng mưa tên và vó ngựa của nó là thật trong giấc mộng này.'],
      ['jolie', 'Khi nó dựng khiên, mình ở gần nhau và chờ thời điểm. Khi tên rơi, mình đổi phía cùng nhịp.'],
      ['dog', 'Lulu nghe trống làng rồi. Thánh Gióng đang ở bên chúng ta!'],
      ['panda', 'Biscuit giữ tình yêu, hai bạn giữ đội hình. Đưa mùa lúa trở về nào!'],
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
        const bx = L.postBoss ? L.postBoss.doorX : (G.level.boss ? G.level.boss.x : L.width * .6);
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
  [
    { title: 'Oath of Sacred Bamboo', hint: 'Take one drum mark each, hold hands across the flood, then hug and kiss to awaken the guardian.', done: 'Thánh Gióng answered, and sacred bamboo became a bridge!' },
    { title: 'Harvest Promise', hint: 'Stand beside the rice sheaves and keep the heart rhythm together.', done: 'The golden harvest blessed your journey!' }
  ],
];

Story.COOP_TRIALS_EN = [
  { title: 'Flower Fairy and the Impossible Bridge', hint: 'The ravine is too wide to jump. Split onto both glowing marks, hold hands, hug, then kiss so the fairy can grow the bridge.', done: 'The flower bridge opened. You crossed the forest gap together!' },
  { title: 'Ocean Phoenix and the Endless Sea', hint: 'The ocean is far too long to fly over. Stand on both marks and hold the heart so Joku calls water while Jolie keeps the flower rhythm.', done: 'The ocean phoenix landed, and the waves became a safe path!' },
  { title: 'Flower Fairy and the Unclimbable Mountain', hint: 'The mountain wall is impossible alone. Split across the two glowing marks and hold the heart to grow flower steps.', done: 'Flower steps lifted both of you over the mountain wall!' },
  { title: 'Twin Lanterns in the Sealed Cave', hint: 'The cave wall blocks all paths. Light both lanterns together with the heart button before the darkness separates you.', done: 'The twin lanterns joined, and the cave gave way!' },
  { title: 'Love Rain and the Fire Wall', hint: 'The fire is too tall to pass. Joku holds the water mark, Jolie holds the flower mark, and both hold the heart to call cooling rain.', done: 'The fire went out, and warm ash became a safe road!' },
  { title: 'Star Mirror and the Endless Void', hint: 'The star void cannot be crossed normally. Stand on the two mirrors and hold the heart so Lulu and Biscuit complete the constellation.', done: 'The stars lined up, and the final path lit ahead!' },
  { title: "Thánh Gióng's Sacred Bridge", hint: 'Take one drum mark each. Joku cools the fire, Jolie binds the bamboo; then hold hands, hug, and kiss to awaken Thánh Gióng.', done: 'The guardian rode across the sky. Sacred bamboo formed a bridge for both hearts!' },
];

Story.COOP_TRIALS_VI = [
  { title: 'Tien hoa va cay cau khong the nhay qua', hint: 'Khe nui qua rong, khong the nhay qua mot minh. Hai nguoi chia nhau dung tren hai dau sang, nam tay, om, roi hon de tien hoa moc cau.', done: 'Cay cau hoa da mo. Hai ban vuot qua khe rung cung nhau!' },
  { title: 'Phuong hoang bien va dai duong bat tan', hint: 'Bien qua dai, khong the bay qua binh thuong. Dung tren hai dau sang va giu trai tim de Joku goi nuoc, Jolie giu nhip hoa.', done: 'Phuong hoang bien ha canh, song bien mo thanh duong an toan!' },
  { title: 'Tien hoa va ngon nui khong the leo', hint: 'Vach nui qua cao, mot nguoi khong the leo. Chia nhau giu hai dau sang va giu trai tim de moc bac thang hoa.', done: 'Nhung bac hoa da nang hai ban vuot qua vach nui!' },
  { title: 'Hai ngon den trong hang bi niem phong', hint: 'Buc tuong hang chan tat ca loi di. Thap hai den cung luc bang trai tim truoc khi bong toi tach hai ban ra.', done: 'Hai ngon den hoa mot, hang toi nhường duong!' },
  { title: 'Mua tinh yeu dap buc tuong lua', hint: 'Lua qua cao, khong the vuot qua. Joku giu dau nuoc, Jolie giu dau hoa, ca hai giu trai tim de goi mua mat.', done: 'Lua da tat, tro am bien thanh con duong an toan!' },
  { title: 'Guong sao va khoang khong vo tan', hint: 'Khoang khong sao khong the vuot binh thuong. Dung tren hai guong sao va giu trai tim de Lulu, Biscuit noi chom sao.', done: 'Cac vi sao thang hang, con duong cuoi cung sang len!' },
  { title: 'Cầu tre thần của Thánh Gióng', hint: 'Mỗi người giữ một dấu trống: Joku dập lửa, Jolie kết tre; rồi nắm tay, ôm và hôn để đánh thức Thánh Gióng.', done: 'Thánh Gióng cưỡi ngựa sắt qua trời. Tre thần kết thành cây cầu cho hai trái tim!' },
];

// The love ritual awakens two temporary powers. Both players must press Special;
// neither power can solve the chapter obstacle without the other one.
Story.COOP_POWERS_EN = [
  {
    joku: { name: 'Waterroot Anchor', icon: 'W', effect: 'Pins the ancient roots to both cliffs so the bridge cannot tear away.' },
    jolie: { name: 'Blossom-Vine Weave', icon: 'F', effect: 'Grows flowering vines across Joku\'s anchored roots and turns them into a living bridge.' },
    travel: 'The ravine answers both hearts: roots lock in place while a luminous flower bridge grows beneath you.'
  },
  {
    joku: { name: 'Phoenix Tide Call', icon: 'P', effect: 'Summons and steers the Ocean Phoenix above waves far beyond normal flight range.' },
    jolie: { name: 'Petal-Wind Saddle', icon: 'S', effect: 'Forms a protected flower saddle that keeps both riders together through wind and spray.' },
    travel: 'Ride together across the Endless Sea as the Ocean Phoenix climbs, dives, and leaves a shining wake.'
  },
  {
    joku: { name: 'Cloudwater Lift', icon: 'C', effect: 'Raises a cool upward current beside the mountain that no ordinary jump can climb.' },
    jolie: { name: 'Giant Bloom Steps', icon: 'B', effect: 'Grows enormous flowers inside the current, making safe shared footholds.' },
    travel: 'The flower fairy guides you up a vertical garden, then carries both hearts over the unclimbable peak.'
  },
  {
    joku: { name: 'Moonwater Lens', icon: 'M', effect: 'Reveals the true route through a cave that constantly rearranges its walls.' },
    jolie: { name: 'Heart Lantern Ward', icon: 'L', effect: 'Maintains a shared light shield so the darkness cannot separate or hurt either player.' },
    travel: 'Move inside one lantern sphere while hidden paths appear under Joku\'s moonwater beam.'
  },
  {
    joku: { name: 'Monsoon Break', icon: 'R', effect: 'Calls heavy cooling rain strong enough to weaken the chapter-spanning firestorm.' },
    jolie: { name: 'Rose Steam Canopy', icon: 'O', effect: 'Turns dangerous steam into a protective petal canopy over both players.' },
    travel: 'Advance beneath the rose canopy while rain parts the fire wall and turns embers into sparkling steam.'
  },
  {
    joku: { name: 'Comet Compass', icon: 'C', effect: 'Rotates the floating star mirrors until a route appears across the endless void.' },
    jolie: { name: 'Constellation Thread', icon: 'T', effect: 'Binds each aligned mirror with a ribbon of starlight that can carry the whole team.' },
    travel: 'Lulu and Biscuit complete the constellation as both players surf one starlight ribbon across the void.'
  },
  {
    joku: { name: 'Sacred Rain Drum', icon: 'D', effect: 'Beats a rain rhythm that cools the burning flood beneath the village.' },
    jolie: { name: 'Golden Bamboo Weave', icon: 'G', effect: 'Binds sacred bamboo into a bridge strong enough for two hearts and their supporters.' },
    travel: 'Thanh Giong rides above you while rain cools the flood and golden bamboo forms beneath every step.'
  }
];

Story.COOP_POWERS_VI = [
  {
    joku: { name: 'Neo Re Nuoc', icon: 'N', effect: 'Ghim re co vao hai vach nui de cay cau khong bi xeu.' },
    jolie: { name: 'Det Day Hoa', icon: 'H', effect: 'Moc day leo hoa quanh re da neo, tao thanh cay cau song.' },
    travel: 'Re cay khoa chat, hoa no duoi chan, va hai ban cung vuot khe nui tren mot cay cau song.'
  },
  {
    joku: { name: 'Goi Phuong Hoang Bien', icon: 'P', effect: 'Trieu hoi va dieu khien Phuong Hoang Bien qua dai duong xa hon moi lan bay thuong.' },
    jolie: { name: 'Yen Gio Canh Hoa', icon: 'Y', effect: 'Tao yen hoa bao ve de ca hai luon ngoi cung nhau giua gio va song.' },
    travel: 'Cung cuoi Phuong Hoang Bien qua dai duong bat tan, bay cao, lao xuong va de lai duong song sang.'
  },
  {
    joku: { name: 'Thang May May Nuoc', icon: 'M', effect: 'Tao luong khi mat bay thang len vach nui khong the nhay qua.' },
    jolie: { name: 'Bac Hoa Khong Lo', icon: 'B', effect: 'Moc hoa lon trong luong khi de tao diem tua an toan cho ca hai.' },
    travel: 'Tien hoa dan hai ban leo vuon hoa thang dung roi nang qua dinh nui khong the leo.'
  },
  {
    joku: { name: 'Kinh Trang Nuoc', icon: 'K', effect: 'Soi ra duong that trong hang dong lien tuc thay doi.' },
    jolie: { name: 'Khien Den Trai Tim', icon: 'D', effect: 'Giu mot vong sang chung de bong toi khong the tach hay lam hai ca hai.' },
    travel: 'Cung di trong mot bong den khi tia trang nuoc cua Joku mo tung loi an.'
  },
  {
    joku: { name: 'Mua Lon Pha Lua', icon: 'M', effect: 'Goi mua mat du manh de lam yeu buc tuong lua keo dai khap chuong.' },
    jolie: { name: 'Mai Hoa Chan Hoi', icon: 'H', effect: 'Bien hoi nong thanh mai canh hoa bao ve ca hai nguoi.' },
    travel: 'Cung tien duoi mai hoa khi mua xe lua va bien than hong thanh hoi sang.'
  },
  {
    joku: { name: 'La Ban Sao Choi', icon: 'S', effect: 'Xoay guong sao troi noi de hien ra duong qua khoang khong vo tan.' },
    jolie: { name: 'Chi Chom Sao', icon: 'C', effect: 'Noi cac guong da thang hang bang dai sang co the cho ca doi di qua.' },
    travel: 'Lulu va Biscuit hoan tat chom sao, con hai ban cung luot tren mot dai anh sao.'
  },
  {
    joku: { name: 'Trong Mua Thanh', icon: 'T', effect: 'Danh nhip mua lam mat bien lua dang nhan chim lang.' },
    jolie: { name: 'Det Tre Vang', icon: 'V', effect: 'Ket tre thanh cay cau du vung cho hai trai tim va hai ban dong hanh.' },
    travel: 'Thanh Giong cuoi ngua tren cao, mua dap lu, va tre vang moc duoi tung buoc chan.'
  }
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
    ['joku', 'The Star Forest is pointing toward a golden road home. Every star seems to be watching us.'],
    ['jolie', 'Then let them see four friends open that road with love.'],
    ['dog', 'Lulu and Biscuit are stars today too!']
  ],
  shrine5: [
    ['jolie', 'This star shrine holds a wish that leads home. I can hear bamboo moving in its light.'],
    ['joku', 'I only wish for one thing: after this battle, we are still laughing together.'],
    ['panda', 'Biscuit wishes for victory food. Also your happiness, of course.']
  ],
  gate5: [
    ['joku', 'This star gate is not the end. Behind it is the road to the Bamboo Homeland.'],
    ['jolie', 'That is fine. Our hearts are stronger.'],
    ['dog', 'Lulu will go first... wait, no, together!']
  ],
  lvl6: [
    ['jolie', 'The Bamboo Homeland feels like a treasured memory: ripe rice, a buffalo by the field, and a hammock beneath the village roof. But the sky carries hoofbeats from an old war.'],
    ['joku', 'Gloomheart turned memories of invasion into spirits. We protect this homeland without carrying old hatred into the present.'],
    ['dog', 'Lulu will guard the rice and bamboo! No shadow steps on this harvest!'],
    ['panda', 'Biscuit will guard the village drum, and inspect the Bàu Đá and banana-seed rice wine strictly for cultural research.']
  ],
  shrine6: [
    ['joku', 'The homeland shrine remembers bamboo: it bends in the wind, but a whole grove is hard to break.'],
    ['jolie', 'Like us. You cool the fire, I bind the bamboo, and neither of us can cross this flood alone.'],
    ['panda', 'After the trial, we rest by the hammock. Biscuit volunteers to guard the picnic.']
  ],
  gate6: [
    ['jolie', 'Beyond this gate is a supernatural memory of the thirteenth-century Mongol invasion. It attacks with arrow rain, iron cavalry, and a cursed shield.'],
    ['joku', 'We dodge in one rhythm, break its guard together, and let Thánh Gióng carry courage into the final fight.'],
    ['dog', 'All four go in. Nobody gets left behind!']
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
    ['joku', 'The eclipse heart has raised star shields around itself. A golden door still waits beyond it, Jolie.'],
    ['jolie', 'Then let the stars see that our love does not run from darkness.'],
    ['panda', 'Biscuit and Lulu are part of this promise too. Together!']
  ],
  bossIntro6: [
    ['joku', 'The Mongol Iron Warlord is a spirit of an invading army from long ago, but its arrow rain and iron horse are real inside this dream.'],
    ['jolie', 'When it raises the shield, stay close and wait. When the arrows fall, we change sides in the same rhythm.'],
    ['dog', 'Lulu hears the village drum. Thánh Gióng is riding with us!'],
    ['panda', 'Biscuit holds the love; you two hold the formation. Bring the golden harvest back!']
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

Story.LEVEL_NAMES_EN = [
  'Enchanted Forest',
  'Crystal Falls',
  'Blossom Glade',
  'Gloomheart Hollow',
  'Ember Canopy',
  'Starlit Grove',
  'Bamboo Homeland'
];

Story.LEVEL_NAMES_VI = [
  'Rung Phep Yeu',
  'Thac Pha Le',
  'Thung Lung Hoa No',
  'Hang Tim Bong Toi',
  'Tan Cay Lua Hong',
  'Rung Sao',
  'Làng Tre Thánh Gióng'
];

Story.UI_EN = {
  host: 'Host as Joku',
  join: 'Join as Jolie',
  solo: 'Practice Solo',
  subtitle: 'An Enchanted Forest Love Adventure',
  credit: 'made with love, for playing together',
  help: 'How to Play',
  pause: 'Paused',
  continue: 'Continue',
  difficulty: 'Difficulty',
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  chapter: 'Chapter',
  language: 'Language',
  goChapter: 'Go to Chapter',
  pickDropWeapon: 'Pick / Drop Weapon',
  dropWeapon: 'Drop Weapon',
  roomCode: 'Room Code',
  hostReopen: 'Host/Reopen',
  joinRejoin: 'Join/Rejoin',
  reconnect: 'Reconnect',
  reconnectingRoom: 'Reconnecting to room {code}...',
  alreadyConnected: 'You are already connected to room {code}.',
  soloNoReconnect: 'Reconnect is available after starting an online room.',
  quitMenu: 'Quit to Menu',
  soundOn: 'Sound: on',
  soundOff: 'Sound: off',
  gameVolume: 'Game Volume',
  hostGame: 'Host Game',
  hostPrompt: 'Choose the room code for Jolie:',
  hostRoom: 'Host Room',
  currentRoom: 'Current room code:',
  copyInvite: 'Copy invite link',
  settingPortal: 'Setting up the magic portal...',
  joinPrompt: 'Enter the room code from Joku:',
  joinJoku: 'Join Joku',
  back: 'Back',
  connection: 'Connection',
  offline: 'offline',
  connected: 'connected',
  waiting: 'waiting',
  soloMode: 'Solo',
  hostMode: 'Host as Joku',
  guestMode: 'Join as Jolie',
  hostingRoom: 'Hosting room {code}.',
  connectedRoom: 'Connected with room {code}.',
  reconnectHint: 'Use the same code to reconnect and continue.',
  enterCode: 'Enter a 4-character room code.',
  openingPortal: 'Opening the magic portal...',
  waitingJoin: 'Waiting for Jolie to join...',
  connectedStart: 'Connected! Starting...',
  connectedShort: 'Connected!',
  copiedInvite: 'Invite link copied. Send it to Jolie!',
  onlineNeedsInternet: 'Online play needs internet. Try Practice Solo.',
  localTestLink: 'This local page is for testing; the invite button shares the published HTTPS game for overseas play.',
  networkBackOnline: 'Internet is back. Reconnecting...',
  networkOffline: 'Internet connection lost. Waiting for it to return...',
  networkUnavailable: 'Online play is not available in this browser.',
  networkOpening: 'Opening the online room...',
  networkVersionMismatch: 'Both players must open the latest published game.',
  networkRoomInUse: 'Room {code} is already in use. Change the code and host again.',
  networkSignalRetry: 'The connection service paused. Reconnecting...',
  networkFindingHost: 'Finding Joku online...',
  networkFindingRelay: 'Direct connection was blocked. Trying the worldwide relay...',
  networkStillTrying: 'Could not connect yet. Keep Joku hosting room {code}; retrying automatically...',
  networkRelayUnavailable: 'The shared relay is unavailable. Keep Joku hosting room {code}; retrying direct and relay paths...',
  networkAutoReconnect: 'Connection lost. Reconnecting automatically...',
  networkWaitingReconnect: 'Waiting for Jolie to reconnect with room {code}...',
  networkConnectedRelay: 'Connected through the worldwide relay.',
  networkConnectedDirect: 'Connected directly over the internet.',
  joinedAdventure: 'Jolie has joined your adventure!',
  reconnectedAdventure: 'Jolie reconnected!',
  connectionLostHost: 'Connection lost. Jolie can rejoin with the same code.',
  connectionLostGuest: 'Connection lost. Reconnecting with the same code...',
  hostShouldHost: 'Jolie should use Join/Rejoin. Joku hosts the room.',
  soloStartHost: 'Start from Host as Joku to play online.',
  jokuKeepHosting: 'Joku should keep hosting. Jolie joins this code.',
  soloStartJoin: 'Start from Join as Jolie to play online.',
  rotate: 'Rotate sideways; this browser limits fullscreen.',
  languageEnglish: 'Language set to English.',
  languageVietnamese: 'Switched to Vietnamese.',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  chapterSub: 'Chapter {n} of {total}',
  difficultySet: 'Difficulty: {diff}',
  hostOnlyChapter: 'Only the host can change chapters online.',
  strongBoss: 'Strong Boss',
  readyTogether: 'get ready together',
  trialKissPrompt: 'Keep holding the heart together to unlock the kiss.',
  trialHugAwake: 'Team magic awakened',
  trialHugSub: 'Move close, keep holding the heart, then kiss to open the path.',
  trialUseSpecial: 'Press Special now: {power}',
  trialWaitingPower: '{power} is ready. Waiting for your partner\'s power.',
  trialBothPowers: 'Two powers, one path!',
  trialRewardSub: 'Two shining weapons appeared. Choose the best one for your team!',
  trialExtremeLock: 'This obstacle is impossible alone. Split onto both marks, hold hands, hug, and kiss to open the way.',
  strongBossLock: 'Defeat this boss to continue.',
  heartGate: 'Heart Gate',
  heartGateSub: 'Both players stand beside the gate to open the boss path.',
  finalBoss: 'Final Boss',
  finalBossLock: 'Defeat the final boss to finish this chapter.',
  savePoint: 'Save point: {label}',
  loveTrial: 'Love Trial',
  petRecover: '{name} needs a moment to recover!',
  getCloser: 'Get closer to your love!',
  holdingHands: 'Holding hands - stronger together!',
  kissReady: 'KISS READY!',
  kissReadySub: 'get close and press Heart',
  bossDefeated: 'Strong Boss Defeated!',
  bossDropSub: 'two weapons dropped',
  chapterClear: 'Chapter Clear!',
  nextAdventure: 'next adventure opening...',
  dateJourney: 'Date Journey Unlocked!',
  dateDoor: 'Heartwood Door',
  dateDoorSub: 'Both hearts need to stand here together.',
  dateComplete: 'The next chapter is opening...',
  downJoku: 'Joku is down! Jolie, hug him back up!',
  downJolie: 'Jolie is down! Joku, hug her back up!',
  mist: 'The mist caught you. Careful!',
  revive: 'Love Surge! Revived by love.',
  shrineReturn: 'Love never gives up! Back to the shrine.',
  noWeapon: 'Stand near a weapon to pick it.',
  equipped: 'Equipped {weapon}. Use Weapon Skill ({keys}) or Pick/Drop to change it.',
  dropped: 'Dropped {weapon}.',
  pickWeapon: 'Pick {weapon}',
  dropNamed: 'Drop {weapon}',
  standNearWeapon: 'Stand near a weapon to pick it',
  weaponSkill: 'Weapon skill',
  oceanDash: 'Ocean dash',
  healingBloom: 'Healing bloom',
  equipWeaponUnlock: 'Equip a weapon to unlock this skill',
  yourWeapon: 'Your Weapon',
  noWeaponInfo: 'No weapon equipped. Stand near a shining weapon on the ground and press Pick/Drop to equip it.',
  weaponOwner: "{name}'s Weapon",
  weaponUse: '{skill}. {desc} Use {trigger} when you want this power. Staying near your partner adds a bond bonus.',
  weaponAttack: 'Attack',
  weaponSpeed: 'Shot speed',
  weaponCooldown: 'Skill cooldown',
  weaponTeamEffect: 'Team effect',
  pickupOrb: 'Mana Orb',
  pickupOrbEffect: '+12 MP for your character.',
  pickupFlower: 'Healing Flower',
  pickupFlowerEffect: '+7 HP for your character.',
  pickupHeart: 'Love Heart',
  pickupHeartEffect: '+8 Love Meter for the team.',
  pickupMote: 'Magic Mote',
  pickupMoteEffect: '+10 MP for your character.',
  pickupEquipped: 'New weapon equipped',
  bondBonus: 'Bond Bonus',
  togetherStrike: 'TOGETHER STRIKE!',
  tapNext: 'tap >',
  spaceNext: 'space >'
};

Story.UI_VI = {
  host: 'Chu phong Joku',
  join: 'Tham gia Jolie',
  solo: 'Tap choi mot minh',
  subtitle: 'Cuoc phieu luu tinh yeu trong rung phep',
  credit: 'lam bang tinh yeu, de hai nguoi cung choi',
  help: 'Huong dan choi',
  pause: 'Tam dung',
  continue: 'Tiep tuc',
  difficulty: 'Do kho',
  easy: 'De',
  normal: 'Thuong',
  hard: 'Kho',
  chapter: 'Chuong',
  language: 'Ngon ngu',
  goChapter: 'Den chuong',
  pickDropWeapon: 'Nhat / Tha vu khi',
  dropWeapon: 'Tha vu khi',
  roomCode: 'Ma phong',
  hostReopen: 'Mo lai phong',
  joinRejoin: 'Vao lai phong',
  reconnect: 'Ket noi lai',
  reconnectingRoom: 'Dang ket noi lai phong {code}...',
  alreadyConnected: 'Ban dang ket noi voi phong {code}.',
  soloNoReconnect: 'Nut ket noi lai chi dung sau khi bat dau phong online.',
  quitMenu: 'Ve menu',
  soundOn: 'Am thanh: bat',
  soundOff: 'Am thanh: tat',
  gameVolume: 'Am luong game',
  hostGame: 'Tao phong',
  hostPrompt: 'Chon ma phong cho Jolie:',
  hostRoom: 'Mo phong',
  currentRoom: 'Ma phong hien tai:',
  copyInvite: 'Chep lien ket moi',
  settingPortal: 'Dang mo cong phep...',
  joinPrompt: 'Nhap ma phong tu Joku:',
  joinJoku: 'Vao cung Joku',
  back: 'Quay lai',
  connection: 'Ket noi',
  offline: 'mat ket noi',
  connected: 'da ket noi',
  waiting: 'dang cho',
  soloMode: 'Choi mot minh',
  hostMode: 'Chu phong Joku',
  guestMode: 'Jolie tham gia',
  hostingRoom: 'Dang mo phong {code}.',
  connectedRoom: 'Da ket noi phong {code}.',
  reconnectHint: 'Dung lai ma phong nay de ket noi lai va choi tiep.',
  enterCode: 'Nhap ma phong it nhat 4 ky tu.',
  openingPortal: 'Dang mo cong phep...',
  waitingJoin: 'Dang cho Jolie tham gia...',
  connectedStart: 'Da ket noi! Dang bat dau...',
  connectedShort: 'Da ket noi!',
  copiedInvite: 'Da chep lien ket moi. Gui cho Jolie nhe!',
  onlineNeedsInternet: 'Choi online can internet. Hay thu Tap choi mot minh.',
  localTestLink: 'Trang noi bo nay chi de thu; nut moi se chia se ban HTTPS da dang de choi tu nuoc ngoai.',
  networkBackOnline: 'Internet da tro lai. Dang ket noi lai...',
  networkOffline: 'Mat internet. Dang cho ket noi tro lai...',
  networkUnavailable: 'Trinh duyet nay khong ho tro choi online.',
  networkOpening: 'Dang mo phong online...',
  networkVersionMismatch: 'Ca hai nguoi can mo ban game moi nhat da dang.',
  networkRoomInUse: 'Phong {code} dang duoc su dung. Hay doi ma va mo lai.',
  networkSignalRetry: 'Dich vu ket noi tam dung. Dang ket noi lai...',
  networkFindingHost: 'Dang tim Joku tren internet...',
  networkFindingRelay: 'Ket noi truc tiep bi chan. Dang thu may chu chuyen tiep toan cau...',
  networkStillTrying: 'Chua ket noi duoc. Hay giu Joku mo phong {code}; game dang tu thu lai...',
  networkRelayUnavailable: 'May chu chuyen tiep chung dang ban. Hay giu Joku mo phong {code}; game dang thu lai ca duong truc tiep va chuyen tiep...',
  networkAutoReconnect: 'Mat ket noi. Dang tu dong ket noi lai...',
  networkWaitingReconnect: 'Dang cho Jolie ket noi lai vao phong {code}...',
  networkConnectedRelay: 'Da ket noi qua may chu chuyen tiep toan cau.',
  networkConnectedDirect: 'Da ket noi truc tiep qua internet.',
  joinedAdventure: 'Jolie da tham gia cuoc phieu luu!',
  reconnectedAdventure: 'Jolie da ket noi lai!',
  connectionLostHost: 'Mat ket noi. Jolie co the vao lai bang cung ma phong.',
  connectionLostGuest: 'Mat ket noi. Dang tu dong vao lai bang cung ma phong...',
  hostShouldHost: 'Jolie nen dung Vao lai phong. Joku la nguoi mo phong.',
  soloStartHost: 'Hay bat dau tu Chu phong Joku de choi online.',
  jokuKeepHosting: 'Joku nen giu phong. Jolie vao bang ma nay.',
  soloStartJoin: 'Hay bat dau tu Tham gia Jolie de choi online.',
  rotate: 'Xoay ngang man hinh; trinh duyet nay han che toan man hinh.',
  languageEnglish: 'Da chuyen sang tieng Anh.',
  languageVietnamese: 'Da chuyen sang tieng Viet.',
  fullscreen: 'Toan man hinh',
  exitFullscreen: 'Thoat toan man hinh',
  chapterSub: 'Chuong {n} / {total}',
  difficultySet: 'Do kho: {diff}',
  hostOnlyChapter: 'Chi chu phong moi duoc doi chuong khi choi online.',
  strongBoss: 'Boss manh',
  readyTogether: 'hay san sang cung nhau',
  trialKissPrompt: 'Tiep tuc giu trai tim cung nhau de mo khoa nu hon.',
  trialHugAwake: 'Phep hop suc da thuc day',
  trialHugSub: 'Lai gan nhau, giu trai tim, roi hon de mo duong.',
  trialUseSpecial: 'Bam Ky nang dac biet ngay: {power}',
  trialWaitingPower: '{power} da san sang. Dang cho suc manh cua nguoi yeu.',
  trialBothPowers: 'Hai suc manh, mot con duong!',
  trialRewardSub: 'Hai vu khi sang da xuat hien. Hay chon mon tot nhat cho doi!',
  trialExtremeLock: 'Vat can nay khong the vuot mot minh. Hay chia nhau dung tren hai dau sang, nam tay, om, va hon de mo duong.',
  strongBossLock: 'Danh bai boss nay de tiep tuc.',
  heartGate: 'Cong Trai Tim',
  heartGateSub: 'Ca hai dung canh cong de mo duong vao boss.',
  finalBoss: 'Boss cuoi',
  finalBossLock: 'Danh bai boss cuoi de ket thuc chuong.',
  savePoint: 'Diem luu: {label}',
  loveTrial: 'Thu thach tinh yeu',
  petRecover: '{name} can nghi mot chut!',
  getCloser: 'Hay lai gan nguoi yeu hon!',
  holdingHands: 'Dang nam tay - manh hon cung nhau!',
  kissReady: 'SAN SANG HON!',
  kissReadySub: 'lai gan va bam Trai tim',
  bossDefeated: 'Da danh bai Boss manh!',
  bossDropSub: 'roi hai vu khi',
  chapterClear: 'Qua chuong!',
  nextAdventure: 'cuoc phieu luu tiep theo dang mo...',
  dateJourney: 'Lo trinh hen ho da mo!',
  dateDoor: 'Cua trai tim',
  dateDoorSub: 'Ca hai can dung o day cung nhau.',
  dateComplete: 'Chuong tiep theo dang mo...',
  downJoku: 'Joku guc roi! Jolie, hay om va cuu anh ay!',
  downJolie: 'Jolie guc roi! Joku, hay om va cuu co ay!',
  mist: 'Suong mu da bat ban. Can than!',
  revive: 'Suc manh tinh yeu! Da hoi sinh.',
  shrineReturn: 'Tinh yeu khong bo cuoc! Tro lai den mieu.',
  noWeapon: 'Dung gan vu khi de nhat.',
  equipped: 'Da trang bi {weapon}. Dung Ky nang vu khi ({keys}) hoac Nhat/Tha de doi.',
  dropped: 'Da tha {weapon}.',
  pickWeapon: 'Nhat {weapon}',
  dropNamed: 'Tha {weapon}',
  standNearWeapon: 'Dung gan vu khi de nhat',
  weaponSkill: 'Ky nang vu khi',
  oceanDash: 'Luot song tan cong',
  healingBloom: 'Hoa bao ve hoi mau',
  equipWeaponUnlock: 'Trang bi vu khi de mo ky nang nay',
  yourWeapon: 'Vu khi cua ban',
  noWeaponInfo: 'Chua co vu khi. Dung gan vu khi dang sang tren mat dat va bam Nhat/Tha de trang bi.',
  weaponOwner: 'Vu khi cua {name}',
  weaponUse: '{skill}. {desc} Dung {trigger} khi can suc manh nay. O gan ban doi se co them thuong lien ket.',
  weaponAttack: 'Tan cong',
  weaponSpeed: 'Toc do dan',
  weaponCooldown: 'Hoi ky nang',
  weaponTeamEffect: 'Loi ich cho doi',
  pickupOrb: 'Ngoc mana',
  pickupOrbEffect: '+12 MP cho nhan vat cua ban.',
  pickupFlower: 'Hoa hoi mau',
  pickupFlowerEffect: '+7 HP cho nhan vat cua ban.',
  pickupHeart: 'Trai tim tinh yeu',
  pickupHeartEffect: '+8 thanh Love cho ca doi.',
  pickupMote: 'Hat phep',
  pickupMoteEffect: '+10 MP cho nhan vat cua ban.',
  pickupEquipped: 'Da trang bi vu khi moi',
  bondBonus: 'Thuong lien ket',
  togetherStrike: 'DON DANH CUNG NHAU!',
  tapNext: 'cham >',
  spaceNext: 'space >'
};
