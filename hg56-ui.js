/* HG56 — display-only UI feedback. One global HUD, no Save/economy hooks.
 * All callbacks are event-driven. No permanent RAF, interval or particles.
 */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const hud=document.querySelector('#app > .top'),resources=document.getElementById('resources');
 if(!hud||!resources)return;
 const reduced=()=>typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const old=new Map();let checkPending=false,lastTap=0;
 function reconcile(){
  checkPending=false;
  const buttons=[...resources.querySelectorAll('button.resource')];
  if(buttons.length!==5)return; // intro/transition; do not fabricate values
  for(let i=0;i<buttons.length;i++){
   const b=buttons[i],raw=b.querySelector('b')?.textContent?.replace(/[^\d]/g,'')||'';
   const value=Number(raw),previous=old.get(i);
   if(!Number.isSafeInteger(value))continue;
   // Pulse ONLY notable grants, not background 1-second economy production.
   if(previous!==undefined&&value>previous&&value-previous>=Math.max(1000,Math.floor(previous*.005))&&!reduced())
    b.classList.add('hg56-gain');
   old.set(i,value);
  }
 }
 const observer=new MutationObserver(()=>{
  if(checkPending)return;checkPending=true;
  queueMicrotask(reconcile);
 });
 observer.observe(resources,{childList:true,subtree:false});
 reconcile();
 document.addEventListener('click',event=>{
  if(reduced()||!event.isTrusted)return;
  const el=event.target?.closest?.('#app button,#app summary');
  if(!el||el.disabled)return;
  const now=typeof performance!=='undefined'?performance.now():0;
  if(now-lastTap<110)return;lastTap=now;
  const rect=el.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return;
  const x=Number.isFinite(event.clientX)&&event.clientX?event.clientX:rect.left+rect.width/2,
   y=Number.isFinite(event.clientY)&&event.clientY?event.clientY:rect.top+rect.height/2;
  const spark=document.createElement('span');spark.className='hg56-tap-spark';
  spark.setAttribute('aria-hidden','true');
  spark.style.left=Math.max(3,Math.min(root.innerWidth-3,x))+'px';
  spark.style.top=Math.max(3,Math.min(root.innerHeight-3,y))+'px';
  document.body.appendChild(spark);
  spark.addEventListener('animationend',()=>spark.remove(),{once:true});
  // Fallback for browser tabs that suspend CSS animation while backgrounded.
  setTimeout(()=>spark.remove(),750);
 },{passive:true});
 root.HOG_HG56_UI=Object.freeze({version:1,saveChanged:false,persistentHud:true});
})(typeof globalThis!=='undefined'?globalThis:this);

/* HG91 — itch.io Early Access interface localization.
 * Language/audio preferences are DEVICE ONLY; they do not mutate Save v07.
 * Source text stays Vietnamese; unmatched gameplay prose falls back visibly.
 * No claim of complete translations until all dynamic/gameplay strings are covered.
 */
(function(root){'use strict';
 if(typeof document==='undefined')return;
 const languages=['vi','en','zh','ja','ko','th'];
 const rows=[["Thế giới","World","世界","ワールド","세계","โลก"],["Thành trì","Castle","城堡","城","성채","ปราสาท"],["Quân đội","Army","军队","軍隊","군대","กองทัพ"],["Tướng","Heroes","英雄","英雄","영웅","ฮีโร่"],["Pháp thuật","Magic","魔法","魔法","마법","เวทมนตร์"],["Rèn & Di vật","Forge & Relics","锻造与遗物","鍛冶と遺物","제작과 유물","หลอมอุปกรณ์และโบราณวัตถุ"],["Nhiệm vụ","Quests","任务","クエスト","퀘스트","ภารกิจ"],["Bí Cảnh","Tower","秘境之塔","秘境の塔","비경의 탑","หอคอยลี้ลับ"],["Chiến báo","Battle Reports","战报","戦闘報告","전투 보고서","รายงานการรบ"],["Tư liệu","Codex","资料","資料","자료","สารานุกรม"],["Lãnh địa","Domain","领地","領地","영지","อาณาเขต"],["Nhật ký","Journal","日志","記録","기록","บันทึก"],["Điều khiển","Controls","操作","操作","조작","การควบคุม"],["Lưu","Save","保存","保存","저장","บันทึก"],["Sao lưu","Export Save","导出存档","セーブを出力","저장 내보내기","ส่งออกเซฟ"],["Khôi phục","Import Save","导入存档","セーブを読み込む","저장 가져오기","นำเข้าเซฟ"],["Chơi lại","New Game","重新开始","最初から","새 게임","เริ่มใหม่"],["Cài đặt & hướng dẫn","Settings & Guide","设置与指南","設定とガイド","설정 및 안내","ตั้งค่าและคู่มือ"],["Cài đặt ngôn ngữ & hướng dẫn","Language & guide settings","语言及指南设置","言語とガイドの設定","언어 및 안내 설정","ตั้งค่าภาษาและคู่มือ"],["Ngôn ngữ","Language","语言","言語","언어","ภาษา"],["Lựa chọn ngôn ngữ","Select language","选择语言","言語を選択","언어 선택","เลือกภาษา"],["Âm thanh nút bấm","Button sound effects","按钮音效","ボタン効果音","버튼 효과음","เสียงปุ่ม"],["Bật âm thanh nút bấm","Enable button sounds","开启按钮音效","ボタン音を有効にする","버튼 소리 켜기","เปิดเสียงปุ่ม"],["Hướng dẫn nhanh","Quick Start Guide","新手指南","クイックガイド","빠른 시작 안내","คู่มือเริ่มต้น"],["Đóng","Close","关闭","閉じる","닫기","ปิด"],["Mở","Open","打开","開く","열기","เปิด"],["Tác vụ nhanh","Quick Actions","快捷操作","クイック操作","빠른 작업","คำสั่งด่วน"],["Tân thủ","Beginner","新手","初心者","초보자","ผู้เล่นใหม่"],["Thành trì khởi đầu","Starting Castle","初始城堡","最初の城","시작 성채","ปราสาทเริ่มต้น"],["BỐN CHỦNG TỘC • MỘT CHIẾN TRƯỜNG","FOUR FACTIONS • ONE BATTLEFIELD","四大阵营 · 同一战场","四つの陣営・一つの戦場","네 진영 · 하나의 전장","สี่เผ่า • สมรภูมิเดียว"],["Phát triển thành trì • dẫn quân vượt thế giới • chinh phục mỏ và quái vật","Build your castle • command armies • conquer mines and monsters","建设城堡 · 统领军队 · 征服矿场与怪物","城を築き、軍を率いて、鉱山と魔物を制圧しよう","성채 건설 · 군대 지휘 · 광산과 몬스터 정복","สร้างปราสาท • บัญชาการกองทัพ • พิชิตเหมืองและมอนสเตอร์"],["Chọn chủng tộc khởi đầu","Choose your starting faction","选择初始阵营","開始する勢力を選択","시작 진영 선택","เลือกเผ่าเริ่มต้น"],["Bộ phép chiến đấu","Combat Spell Set","战斗法术体系","戦闘魔法セット","전투 마법 세트","ชุดเวทต่อสู้"],["Quốc tế · Fandom","International · Fandom","国际版 · Fandom","国際版・Fandom","국제판 · Fandom","นานาชาติ · Fandom"],["Trung Quốc 2009 · Sina","China 2009 · Sina","中国2009版 · 新浪","中国2009年版・Sina","중국 2009 · Sina","จีน 2009 · Sina"],["Thành lập thành Gaia","Found Your Kingdom","建立王国","王国を築く","왕국 건설","ก่อตั้งอาณาจักร"],["Bắt đầu","Start","开始","開始","시작","เริ่ม"],["Tiếp tục","Continue","继续","続ける","계속","ดำเนินต่อ"],["Cài đặt","Settings","设置","設定","설정","ตั้งค่า"],["Trợ giúp","Help","帮助","ヘルプ","도움말","ความช่วยเหลือ"],["Chọn tướng & quân","Choose Heroes & Troops","选择英雄与军队","英雄と部隊を選択","영웅과 병력 선택","เลือกฮีโร่และทหาร"],["Tài nguyên & kho","Resources & Storage","资源与仓库","資源と倉庫","자원과 창고","ทรัพยากรและคลัง"],["Danh sách điểm đến","Destinations","目的地列表","目的地一覧","목적지 목록","รายชื่อจุดหมาย"],["Quản lý","Manage","管理","管理","관리","จัดการ"],["Bố trí nhanh","Auto Formation","快速布阵","自動編成","자동 편성","จัดทัพอัตโนมัติ"],["Điều binh","Manage Troops","调兵","部隊管理","병력 편성","จัดทัพ"],["Chiêu mộ","Recruit","招募","雇用","모집","รับสมัคร"],["Xác nhận","Confirm","确认","確認","확인","ยืนยัน"],["Hủy","Cancel","取消","キャンセル","취소","ยกเลิก"],["Quay lại","Back","返回","戻る","뒤로","ย้อนกลับ"],["Tìm kiếm","Search","搜索","検索","검색","ค้นหา"],["Tất cả","All","全部","すべて","전체","ทั้งหมด"],["Trống","Empty","空","空","비어 있음","ว่าง"],["Chưa mặc","Unequipped","未装备","未装備","미장착","ยังไม่ได้สวมใส่"],["Chưa có tướng","No Heroes","暂无英雄","英雄なし","영웅 없음","ยังไม่มีฮีโร่"],["Nâng cấp","Upgrade","升级","強化","강화","อัปเกรด"],["Mua","Buy","购买","購入","구매","ซื้อ"],["Bán","Sell","出售","売却","판매","ขาย"],["Vũ khí","Weapon","武器","武器","무기","อาวุธ"],["Giáp","Armor","护甲","防具","방어구","เกราะ"],["Thắng","Victory","胜利","勝利","승리","ชนะ"],["Thua","Defeat","失败","敗北","패배","แพ้"],["Sản lượng / giờ game:","Production / game hour:","每游戏小时产量：","ゲーム内1時間の生産量：","게임 시간당 생산량:","ผลผลิตต่อชั่วโมงในเกม:"],["Xây dựng:","Building:","建造：","建設：","건설:","สิ่งก่อสร้าง:"],["Hàng đợi:","Queue:","队列：","待機列：","대기열:","คิว:"],["Tướng đang chọn:","Selected Hero:","当前英雄：","選択中の英雄：","선택한 영웅:","ฮีโร่ที่เลือก:"],["Đã lưu game vào trình duyệt.","Game saved in this browser.","游戏已保存在此浏览器中。","このブラウザーにセーブしました。","브라우저에 게임을 저장했습니다.","บันทึกเกมลงในเบราว์เซอร์แล้ว"],["Đã xuất file sao lưu JSON.","JSON save backup exported.","JSON存档已导出。","JSONセーブを出力しました。","JSON 저장 파일을 내보냈습니다.","ส่งออกไฟล์เซฟ JSON แล้ว"],["Chế độ chơi offline; hình ảnh tự dựng, công thức chiến đấu hiện là thử nghiệm, chưa phải game chính thức.","Offline Early Access with independently created art and experimental balance.","离线抢先体验：原创美术，战斗平衡仍在测试。","独自制作のアートと調整中の戦闘バランスを備えたオフライン先行版です。","독립 제작 아트와 실험 중인 밸런스를 포함한 오프라인 얼리 액세스입니다.","เกมออฟไลน์ระหว่างพัฒนา พร้อมภาพที่สร้างขึ้นใหม่และสมดุลที่ยังทดสอบอยู่"],["Tự lưu vào trình duyệt. Phiên bản thử nghiệm offline, chưa có PvP hoặc máy chủ trực tuyến.","Saved locally in your browser. Early Access: no PvP or online server.","进度保存在本地浏览器。本作处于抢先体验阶段，暂无PVP或在线服务器。","セーブはブラウザー内に保存。先行版のためPvPやオンラインサーバーはありません。","브라우저에 로컬 저장됩니다. 얼리 액세스 버전에는 PvP와 온라인 서버가 없습니다.","บันทึกในเบราว์เซอร์ เวอร์ชัน Early Access ยังไม่มี PvP หรือเซิร์ฟเวอร์ออนไลน์"],["Chọn một chủng tộc và bắt đầu vương quốc mới.","Choose a faction to found your kingdom.","选择阵营，建立新王国。","勢力を選び、王国を築こう。","진영을 선택하고 왕국을 건설하세요.","เลือกเผ่าแล้วก่อตั้งอาณาจักรใหม่"],["Vào Thành trì để nâng cấp công trình và sản xuất tài nguyên.","Open Castle to upgrade buildings and produce resources.","进入城堡，升级建筑并生产资源。","城で施設を強化し、資源を生産しよう。","성채에서 건물을 강화하고 자원을 생산하세요.","ไปที่ปราสาทเพื่ออัปเกรดสิ่งก่อสร้างและผลิตทรัพยากร"],["Vào Quân đội để tuyển và bố trí lính cho một tướng.","Open Army to recruit troops and assign them to a hero.","进入军队，招募士兵并将其编入英雄部队。","軍隊で兵士を雇い、英雄に編成しよう。","군대에서 병력을 모집하고 영웅에게 배치하세요.","ไปที่กองทัพเพื่อรับสมัครทหารและจัดสรรให้ฮีโร่"],["Tìm quái trên bản đồ rồi xuất chinh, nhận EXP và chiến lợi phẩm.","Find monsters on the map and march to earn XP and loot.","在地图上寻找怪物，出征获取经验和战利品。","地図上で魔物を見つけ、出征して経験値と戦利品を獲得しよう。","지도에서 몬스터를 찾아 출정해 경험치와 전리품을 얻으세요.","หาเหล่ามอนสเตอร์บนแผนที่และออกศึกเพื่อรับ EXP และไอเทม"],["Dùng Sao lưu để tải tệp JSON trước khi đổi máy hoặc xóa dữ liệu.","Use Export Save to download your JSON before changing devices or clearing browser data.","换设备或清除浏览器数据前，请先导出JSON存档。","端末変更やブラウザーデータ削除の前にJSONセーブを出力してください。","기기를 바꾸거나 데이터를 지우기 전에 JSON 저장 파일을 내보내세요.","ส่งออกไฟล์เซฟ JSON ก่อนเปลี่ยนอุปกรณ์หรือล้างข้อมูลเบราว์เซอร์"],["Dữ liệu trên itch.io tách biệt với bản HTML offline. Hãy xuất/nhập Save JSON khi chuyển giữa hai nơi.","itch.io browser saves are separate from offline HTML saves. Use JSON export/import to transfer progress.","itch.io网页存档与离线HTML存档相互独立。请使用JSON导出与导入迁移进度。","itch.io版とオフラインHTML版のセーブは別です。JSONの出力・読み込みで移行してください。","itch.io 웹 버전의 저장 데이터는 오프라인 HTML과 별개입니다. JSON 내보내기/가져오기를 사용하세요.","เซฟบน itch.io แยกจากไฟล์ HTML ออฟไลน์ โปรดส่งออกและนำเข้า JSON เพื่อย้ายเซฟ"],["Bản dịch giao diện đang hoàn thiện; tên kỹ năng và mô tả chuyên sâu có thể còn tiếng Việt.","Localization is in progress; advanced skill names and descriptions may still be in Vietnamese.","本地化尚在进行中；高级技能名与部分说明可能仍为越南语。","翻訳は作業中です。スキル名や詳細説明にベトナム語が残る場合があります。","번역 작업 중입니다. 일부 기술명과 상세 설명은 베트남어로 표시될 수 있습니다.","กำลังแปลภาษาอยู่ ชื่อสกิลและคำอธิบายบางส่วนอาจยังเป็นภาษาเวียดนาม"]];
 const tables=Object.fromEntries(languages.slice(1).map((lang,i)=>[
    lang,new Map(rows.map(row=>[row[0],row[i+1]]))
 ]));
 const TEXT_KEY='heoofgaia_hg91_ui_locale',SOUND_KEY='heoofgaia_hg91_click_sound';
 const select=document.getElementById('hg91-language'),
       trigger=document.getElementById('hg91-settings-trigger'),
       panel=document.getElementById('hg91-menu'),
       close=document.getElementById('hg91-settings-close'),
       soundToggle=document.getElementById('hg91-sound');
 if(!select||!trigger||!panel||!close||!soundToggle)return;
 function read(key,fallback){try{return localStorage.getItem(key)||fallback}catch(_){return fallback}}
 let locale=read(TEXT_KEY,'vi');if(!languages.includes(locale))locale='vi';
 let sound=read(SOUND_KEY,'off')==='on',audio=null;
 const textOriginal=new WeakMap(),attrOriginal=new WeakMap();
 const attrNames=['title','aria-label','placeholder'];
 function localize(input){
  if(locale==='vi')return input;
  const dict=tables[locale],value=String(input),trimmed=value.trim();
  if(!trimmed)return value;
  const leading=value.slice(0,value.indexOf(trimmed));
  const trailing=value.slice(value.indexOf(trimmed)+trimmed.length);
  let translated=dict.get(trimmed);
  if(translated===undefined){
   const parts=/^([^\p{L}\p{N}]*)([\s\S]+)$/u.exec(trimmed);
   if(parts) {
    const word=parts[2].trim(),piece=dict.get(word);
    if(piece!==undefined)translated=parts[1]+piece;
   }
  }
  if(translated===undefined){
   for(const [original,translation] of dict){
    if(!original.endsWith(':'))continue;
    if(trimmed.startsWith(original)){
      translated=translation+trimmed.slice(original.length);break;
    }
   }
  }
  return translated===undefined?value:leading+translated+trailing;
 }
 function skip(node){const p=node.nodeType===1?node:node.parentElement;
  return !p||!!p.closest('script,style,textarea,pre,code,[data-hg91-fixed],.hg28-art-cache');
 }
 function renderText(node){
  if(skip(node))return;
  const current=node.nodeValue||'';let saved=textOriginal.get(node);
  if(!saved||(current!==saved.rendered&&current!==saved.source)){
   saved={source:current,rendered:current};
  }
  const converted=localize(saved.source);
  saved.rendered=converted;textOriginal.set(node,saved);
  if(current!==converted)node.nodeValue=converted;
 }
 function renderAttrs(el){
  if(skip(el))return;
  let data=attrOriginal.get(el);if(!data){data={};attrOriginal.set(el,data)}
  for(const key of attrNames)if(el.hasAttribute(key)){
    const value=el.getAttribute(key),record=data[key];
    const source=record&&(value===record.rendered||value===record.source)?record.source:value;
    const rendered=localize(source);data[key]={source,rendered};
    if(value!==rendered)el.setAttribute(key,rendered);
  }
 }
 function paintTree(base){
  if(!base)return;
  if(base.nodeType===3){renderText(base);return}
  if(base.nodeType!==1||skip(base))return;
  renderAttrs(base);
  const walker=document.createTreeWalker(base,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  let next;
  while(next=walker.nextNode()){
   if(next.nodeType===3)renderText(next);
   else if(!skip(next))renderAttrs(next);
  }
 }
 function translateCurrent(){
  document.documentElement.lang=locale==='zh'?'zh-CN':locale;
  select.value=locale;
  paintTree(document.getElementById('app'));paintTree(panel);
 }
 // A childList mutation is generated when game view HTML is replaced; content
 // translation never changes a command, input value, game tick, or Save ledger.
 const rootApp=document.getElementById('app');
 const observer=new MutationObserver(records=>{
  if(locale==='vi')return;
  for(const mutation of records){
   if(mutation.type==='characterData'){
     const item=textOriginal.get(mutation.target);
     if(!item||mutation.target.nodeValue!==item.rendered)renderText(mutation.target);
   }else{
     for(const node of mutation.addedNodes)paintTree(node);
   }
  }
 });
 observer.observe(rootApp,{childList:true,subtree:true,characterData:true});
 function setLocale(next){
  if(!languages.includes(next))return false;
  locale=next;try{localStorage.setItem(TEXT_KEY,locale)}catch(_){}
  translateCurrent();return true;
 }
 function hide(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()}
 function toggle(){
  panel.hidden=!panel.hidden;
  trigger.setAttribute('aria-expanded',String(!panel.hidden));
  if(!panel.hidden)select.focus();
 }
 trigger.addEventListener('click',toggle);
 close.addEventListener('click',hide);
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();hide()}
 },true);
 select.addEventListener('change',event=>setLocale(event.target.value));
 soundToggle.checked=sound;
 soundToggle.addEventListener('change',()=>{
  sound=soundToggle.checked;
  try{localStorage.setItem(SOUND_KEY,sound?'on':'off')}catch(_){}
 });
 // Tiny opt-in original synthesized UI tone: no fetched/third-party music.
 document.addEventListener('click',event=>{
  if(!sound||!event.isTrusted||!event.target.closest('button,summary'))return;
  try{
   const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;
   if(!audio)audio=new Audio();
   if(audio.state==='suspended')audio.resume();
   const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
   oscillator.type='sine';oscillator.frequency.setValueAtTime(620,now);
   oscillator.frequency.exponentialRampToValueAtTime(465,now+.048);
   gain.gain.setValueAtTime(.013,now);
   gain.gain.exponentialRampToValueAtTime(.0001,now+.052);
   oscillator.connect(gain);gain.connect(audio.destination);
   oscillator.start(now);oscillator.stop(now+.055);
  }catch(_){}
 },{passive:true});
 translateCurrent();
 root.HOG_HG91_I18N=Object.freeze({
  version:1,saveVersion:7,supported:languages.slice(),
  keys:rows.length,complete:false,getLocale:()=>locale,setLocale,
  translate:localize,has:(key,lang=locale)=>lang==='vi'||!!tables[lang]?.has(key)
 });
})(typeof globalThis!=='undefined'?globalThis:this);
