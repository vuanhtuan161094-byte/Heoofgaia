// === NL-CLASSIC-A5-A9-V1: offline classic WEB systems ===
// All amounts, gates, AI opponents and rewards are PROJECT_SIMULATED.
// Historical references: 17173 2011-05-16 (official rank), Lequ 2012-05-31
// (morale/levy, appointment, dispatch, city siege), Lequ 2011-09-17 (trial, seals,
// fourth-tier after rebirth). No multiplayer server, no second combat or save owner.
const nlClassicGrowthPolicy=(()=>{
 const n=id=>Math.min(10,Math.max(0,Math.floor(Number(game.nlClassicWorldA4?.rebirth?.[id])||0)));
 const advanced=id=>Boolean(game.nlClassicAdvanced?.growth?.[id]?.advanced);
 return {cap:id=>advanced(id)?Math.min(110,60+5*n(id)):40,rebirthGate:id=>advanced(id)?60+5*n(id):Infinity,limit:10,
  bonus:id=>Math.min(10,n(id))*.03,trainingBonus:()=>Math.min(.18,Math.max(0,(game.nlCity?.levels?.nl_city_drillground||0)*.03+(game.nlCity?.levels?.nl_city_manor||0)*.02))};
})();
(()=>{
'use strict';
const VERSION=1, HOUR=3600000;
const RANKS=[['Bạch thân',0,0],['Hiệu Úy',80,250],['Đô Úy',200,450],['Thái Thú',450,800],['Trung Lang Tướng',900,1300],['Đại Tướng Quân',1800,2200],['Châu Mục',3500,3400],['Vương',6000,5000]];
const TARGETS=[['changan','Trường An',2,'neutral'],['xuchang','Hứa Xương',4,'wei'],['chengdu','Thành Đô',5,'shu'],['jianye','Kiến Nghiệp',8,'wu'],['hefei','Hợp Phì',12,'wei'],['hanzhong','Hán Trung',16,'shu'],['wuchang','Vũ Xương',20,'wu'],['luoyang','Lạc Dương',24,'neutral']];
const MERCHANTS=[['horse','Thương nhân chiến mã',500,1,850,0],['book','Thương nhân binh thư',800,2,0,180],['treasure','Thương nhân bảo vật',1200,3,1800,60]];
const TASKS=[['rank','Thăng quan lần đầu',1,500,40],['dispatch','Hoàn thành ủy phái',1,400,50],['guild','Gia nhập quân đoàn',1,500,60],['capture','Chiếm thành PvE',1,800,100],['advanced','Đột phá võ tướng',1,1000,150],['trial','Thắng thử thách',1,500,70],['naval','Hoàn thành vận tải biển',1,650,80]];
const EVENTS=[['relief','Cứu tế dân chúng',300,100,30],['supply','Tiếp tế quân nhu',0,250,65],['investment','Đầu tư thương mại',500,0,90]];
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const nat=x=>Number.isSafeInteger(x)&&x>=0?x:0;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const owned=id=>typeof id==='string'&&game.roster.includes(id)&&Object.hasOwn(game.hero,id);
const completed=n=>game.cleared.includes(n);
const lv=id=>clamp(nat(game.nlCity?.levels?.[id]),0,20);
const nation=()=>game.nlClassicWorldA4?.nation||'neutral';
const today=()=>dayId();
function state(){
 if(!obj(game.nlClassicAdvanced))game.nlClassicAdvanced={};
 const s=game.nlClassicAdvanced;s.version=VERSION;
 for(const k of ['growth','territories','milestones','daily','guild','dispatch','naval'])if(!obj(s[k]))s[k]={};
 for(const k of ['claimed','receipts'])if(!Array.isArray(s[k]))s[k]=[];
 s.rank=clamp(nat(s.rank),0,RANKS.length-1);s.happiness=Number.isFinite(s.happiness)?clamp(Math.round(s.happiness),0,100):80;
 if(s.day!==today()){s.day=today();s.daily={};}
 for(const k of ['relief','invest','event','war','trial','donate','ship'])s.daily[k]=nat(s.daily[k]);
 s.guild.level=clamp(nat(s.guild.level),0,10);s.guild.contribution=nat(s.guild.contribution);
 s.naval.ships=clamp(nat(s.naval.ships),0,10);
 return s;
}
function mark(s,k){s.milestones[k]=nat(s.milestones[k])+1;}
function record(s,id,delta={}){
 s.receipts.push({id,at:Date.now(),delta});s.receipts=s.receipts.slice(-200);save();return true;
}
function done(s,id,delta={}){record(s,id,delta);renderResources();render();return true;}
function canGain(delta){
 return obj(delta)&&Object.entries(delta).every(([k,v])=>['silver','grain','prestige','merit'].includes(k)&&Number.isSafeInteger(v)&&v>=0&&Number.isSafeInteger((k==='merit'?nlAState():game)[k]+v));
}
function gain(delta){for(const [k,v] of Object.entries(delta))(k==='merit'?nlAState():game)[k]+=v;}
function pay(cost){return !battle&&payment(cost);}
function rankUp(){
 const s=state(),next=RANKS[s.rank+1];
 if(battle||nation()==='neutral'||!next||game.prestige<next[1])return false;
 s.rank++;mark(s,'rank');return done(s,'rank:'+s.rank);
}
function salary(){
 const s=state(),r=RANKS[s.rank],delta={silver:Math.floor(r[2]*(.5+s.happiness/200))};
 if(battle||!s.rank||s.salaryDay===today()||!canGain(delta))return false;
 s.salaryDay=today();gain(delta);return done(s,'salary:'+today(),delta);
}
function relief(){
 const s=state();if(s.happiness>=100||s.daily.relief>=3||!pay({grain:120}))return false;
 s.happiness=Math.min(100,s.happiness+12);s.daily.relief++;return done(s,'relief:'+today()+':'+s.daily.relief,{grain:-120});
}
function invest(){
 const s=state(),delta={prestige:25+lv('nl_city_state_office')*4};
 if(nation()==='neutral'||s.daily.invest>=5||!canGain(delta)||!pay({silver:400}))return false;
 gain(delta);s.daily.invest++;return done(s,'investment:'+today()+':'+s.daily.invest,delta);
}
// Existing 12-tax owner still calculates and credits the tax once; A5 only records sentiment.
const priorTax=nlATax;
nlATax=function(){const before=nlAState().taxUsed,out=priorTax.apply(this,arguments);
 if(nlAState().taxUsed>before){const s=state();s.happiness=Math.max(0,s.happiness-3);record(s,'tax-sentiment:'+today()+':'+nlAState().taxUsed);render();}
 return out;
};
function dispatch(id){
 const s=state(),m=MERCHANTS.find(x=>x[0]===id);
 if(!m||s.dispatch.job||!completed(4)||!pay({silver:m[2]}))return false;
 const bonus=Math.min(.25,lv('nl_city_bank')*.04+lv('nl_city_trade_society')*.02);
 const reward={silver:Math.floor(m[4]*(1+bonus)),merit:m[5]};
 s.dispatch.job={id,until:Date.now()+m[3]*HOUR,reward};return done(s,'dispatch:'+id,{silver:-m[2]});
}
function collectDispatch(){
 const s=state(),j=s.dispatch.job;if(battle||!obj(j)||Date.now()<j.until||!canGain(j.reward))return false;
 delete s.dispatch.job;gain(j.reward);mark(s,'dispatch');return done(s,'dispatch-collect:'+j.id,j.reward);
}
// A6: offline guild and territorial objectives; the actual battle is native P2 campaign.
// Cleared stages are used as garrison opponents; no original stage or skill ID is mutated.
function joinGuild(){
 const s=state();if(s.guild.level||nation()==='neutral'||!completed(4)||!pay({silver:1000}))return false;
 s.guild={level:1,nation:nation(),contribution:0};mark(s,'guild');return done(s,'guild-join',{silver:-1000});
}
function donate(){
 const s=state();if(!s.guild.level||s.daily.donate>=5||s.guild.level>=10||!pay({silver:500}))return false;
 s.guild.contribution+=100;s.daily.donate++;s.guild.level=Math.min(10,1+Math.floor(s.guild.contribution/500));return done(s,'guild-donate:'+today()+':'+s.daily.donate,{silver:-500});
}
function challenge(kind,id){
 const s=state(),t=TARGETS.find(x=>x[0]===id);
 if(battle||!t||!completed(t[2])||!Array.isArray(game.slots)||!game.slots.some(Boolean)||nlAState().orders<1)return false;
 if(kind==='war'&&(!s.guild.level||nation()==='neutral'||s.territories[id]||t[3]===nation()||s.daily.war>=3))return false;
 if(kind==='trial'&&(s.daily.trial>=3||!completed(4)))return false;
 if(!['war','trial'].includes(kind))return false;
 const prior=battle;beginBattle(t[2],'campaign');
 if(prior||!battle||battle.replay||battle.mode!=='campaign'||battle.stage!==t[2]||battle.finished)return false;
 battle.nlAdvancedObjective={kind,id,nation:nation(),stage:t[2]};
 s.daily[kind]++;record(s,kind+'-start:'+id);return true;
}
const priorFinish=finishBattle;
finishBattle=function(){
 const b=battle,o=b?.nlAdvancedObjective,live=b&&!b.finished&&!b.replay&&o;
 const result=priorFinish.apply(this,arguments);
 if(!live||battle!==b||!b.finished||!b.won||b.nlAdvancedSettled)return result;
 b.nlAdvancedSettled=true;const s=state();
 // Native first-clear/loot settlement has already happened. This is a distinct one-time objective reward.
 if(o.kind==='war'&&!s.territories[o.id]){s.territories[o.id]={nation:o.nation,at:Date.now()};mark(s,'capture');}
 if(o.kind==='trial'&&!s.milestones['trial:'+o.id]){s.milestones['trial:'+o.id]=1;mark(s,'trial');}
 record(s,o.kind+'-victory:'+o.id);return result;
};
function territoryIncome(){
 const s=state(),count=Object.keys(s.territories).filter(id=>TARGETS.some(t=>t[0]===id)&&s.territories[id]?.nation===nation()).length;
 const delta={silver:count*350,prestige:count*15};
 if(battle||!count||s.territoryDay===today()||!canGain(delta))return false;
 s.territoryDay=today();gain(delta);return done(s,'territory-income:'+today(),delta);
}
// A7: same hero records and existing A4 rebirth map. No second rebirth count.
function growth(id){const s=state();if(!owned(id))return null;if(!obj(s.growth[id]))s.growth[id]={};return s.growth[id];}
function breakthrough(id){
 const s=state(),h=owned(id)?game.hero[id]:null,g=growth(id);
 if(!h||h.level<40||g.advanced||!completed(12)||!pay({silver:3000,merit:300}))return false;
 g.advanced=true;mark(s,'advanced');return done(s,'breakthrough:'+id,{silver:-3000,merit:-300});
}
function advancedTrain(id){
 const s=state(),h=owned(id)?game.hero[id]:null,g=growth(id),d=NL_GAME_DATA.heroes.training;
 if(!h||!g.advanced||h.level>=nlClassicGrowthPolicy.cap(id)||!pay({silver:900,merit:60}))return false;
 const xp=Math.floor(900*(1+nlClassicGrowthPolicy.trainingBonus()));h.xp=nat(h.xp)+xp;
 while(h.level<nlClassicGrowthPolicy.cap(id)&&h.xp>=h.level*d.xpRequiredPerHeroLevel){h.xp-=h.level*d.xpRequiredPerHeroLevel;h.level++;}
 countTask('train');return done(s,'advanced-train:'+id,{silver:-900,merit:-60});
}
function awaken(id){
 const s=state(),h=owned(id)?game.hero[id]:null,g=growth(id);
 if(!h||!g.advanced||g.awakened||h.level<50||nat(game.nlClassicWorldA4?.rebirth?.[id])<1||!pay({silver:5000,merit:800}))return false;
 g.awakened=true;return done(s,'awaken:'+id,{silver:-5000,merit:-800});
}
const priorUnit=p2Unit;
p2Unit=function(id,team,slot,stage){
 const u=priorUnit(id,team,slot,stage);
 if(team!=='p'||!u||!owned(id)||battle?.mode==='cltq')return u;
 const g=game.nlClassicAdvanced?.growth?.[id];
 if(g?.awakened)for(const k of ['atk','catk','matk'])if(Number.isFinite(u[k]))u[k]=Math.round(u[k]*1.05);
 return u;
};
// A8: achievements, daily activities, repeatable native battles and first-win progress.
function event(id){
 const s=state(),e=EVENTS.find(x=>x[0]===id),delta=e?{merit:e[4]}:{};
 if(!e||s.daily.event>=3||!completed(2)||!canGain(delta)||!pay({silver:e[2],grain:e[3]}))return false;
 if(id==='relief')s.happiness=Math.min(100,s.happiness+8);
 gain(delta);s.daily.event++;return done(s,'event:'+today()+':'+s.daily.event,delta);
}
function achievement(id){
 const s=state(),q=TASKS.find(x=>x[0]===id),delta=q?{silver:q[3],merit:q[4]}:{};
 if(battle||!q||s.claimed.includes(id)||nat(s.milestones[id])<q[2]||!canGain(delta))return false;
 s.claimed.push(id);gain(delta);return done(s,'achievement:'+id,delta);
}
// A9: consume actual built facility levels, not duplicate city production/timers.
// Naval is offline cargo logistics only, not a claim of naval combat parity.
function buildShip(){
 const s=state(),cap=Math.min(10,lv('nl_city_dock'));
 if(s.naval.ships>=cap||lv('nl_city_naval_port')<1||!pay({silver:2500,grain:600}))return false;
 s.naval.ships++;return done(s,'ship-build:'+s.naval.ships,{silver:-2500,grain:-600});
}
function seaTrade(){
 const s=state();if(!s.naval.ships||s.naval.job||lv('nl_city_cargo_port')<1||s.daily.ship>=2||!pay({grain:400,silver:600}))return false;
 const cap=Math.min(2000,lv('nl_city_navy_warehouse')*200),training=Math.min(.21,lv('nl_city_naval_drill')*.035),
 bonus=Math.min(.25,lv('nl_city_cargo_port')*.03),time=Math.floor(2*HOUR*(1-Math.min(.12,lv('nl_city_lighthouse')*.02)));
 const reward={silver:Math.floor((1100+s.naval.ships*100+cap*.1)*(1+bonus)),merit:Math.floor(50*(1+training))};
 s.naval.job={until:Date.now()+time,reward};s.daily.ship++;return done(s,'sea-start:'+today()+':'+s.daily.ship,{grain:-400,silver:-600});
}
function collectSea(){
 const s=state(),j=s.naval.job;if(battle||!obj(j)||Date.now()<j.until||!canGain(j.reward))return false;
 delete s.naval.job;gain(j.reward);mark(s,'naval');return done(s,'sea-collect',j.reward);
}
let tabA='office',page=0,hero='';
const tabs=[['office','Quan chức'],['merchant','Ủy phái'],['guild','Quân đoàn'],['war','Quốc chiến'],['growth','Dưỡng tướng'],['trial','Thí luyện'],['events','Hoạt động'],['achieve','Thành tựu'],['naval','Hải vận'],['facility','Công trình']];
const btn=(action,id,label,disabled=false)=>'<button class="gold-button" data-nla59-action="'+action+'" data-nla59-id="'+esc(id)+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>';
const row=(title,desc,actions='')=>'<div class="nla59-row"><div><b>'+esc(title)+'</b><small>'+esc(desc)+'</small></div><div>'+actions+'</div></div>';
const countdown=j=>Date.now()>=j.until?'Có thể nhận':Math.ceil((j.until-Date.now())/60000)+' phút';
const pages=(list,renderRow)=>list.slice(page*4,page*4+4).map(renderRow).join('')+(list.length>4?'<div class="nla59-tabs">'+btn('page','prev','Trước',page===0)+btn('page','next','Sau',page>=Math.ceil(list.length/4)-1)+'</div>':'');
function panel(){
 const s=state(),locked=Boolean(battle);let b='';
 if(!owned(hero))hero=game.roster[0]||'';
 if(tabA==='office'){
  const rank=RANKS[s.rank],next=RANKS[s.rank+1];
  b=row(rank[0],'Uy danh '+fmt(game.prestige)+' · '+(next?'Tiếp: '+next[0]+' / '+next[1]:'Đã tối đa'),btn('rank','','Thăng quan',locked||nation()==='neutral'||!next||game.prestige<next[1]))+
  row('Bổng lộc','Hằng ngày · cơ sở '+fmt(rank[2])+' Bạc · dân tâm ảnh hưởng',btn('salary','','Nhận',locked||!s.rank||s.salaryDay===today()))+
  row('Dân tâm',s.happiness+'/100 · cứu tế 120 Lương',btn('relief','','Cứu tế',locked||s.happiness>=100||s.daily.relief>=3))+
  row('Đầu tư quốc gia','400 Bạc → Uy danh · '+s.daily.invest+'/5',btn('invest','','Đầu tư',locked||nation()==='neutral'||s.daily.invest>=5));
 }else if(tabA==='merchant'){
  b=s.dispatch.job?row('Ủy phái đang thực hiện',countdown(s.dispatch.job),btn('dispatch-collect','','Nhận',locked||Date.now()<s.dispatch.job.until)):MERCHANTS.map(m=>row(m[1],m[2]+' Bạc · '+m[3]+' giờ · thu Bạc/Chiến công mô phỏng',btn('dispatch',m[0],'Ủy phái',locked||!completed(4)))).join('');
 }else if(tabA==='guild'){
  b=row('Quân đoàn '+(s.guild.level?({'wei':'Ngụy','shu':'Thục','wu':'Ngô'}[s.guild.nation]||''):'chưa gia nhập'),'Offline · cấp '+s.guild.level+' · cống hiến '+s.guild.contribution,btn('join','','Gia nhập',locked||s.guild.level>0||nation()==='neutral'||!completed(4)))+
  row('Cống hiến','500 Bạc → 100 cống hiến · '+s.daily.donate+'/5',btn('donate','','Đóng góp',locked||!s.guild.level||s.daily.donate>=5||s.guild.level>=10))+
  row('Thu nhập lãnh địa',Object.keys(s.territories).length+' thành đã chiếm',btn('territory','','Thu',locked||s.territoryDay===today()||!Object.keys(s.territories).length));
 }else if(tabA==='war'||tabA==='trial'){
  const war=tabA==='war';
  b='<p class="tiny">'+(war?'Quốc chiến PvE offline · quân địch mô phỏng từ ải đã thắng.':'Thử thách bổ sung trên P2 · không thay Tháp Thí Luyện gốc.')+' Lượt '+s.daily[tabA]+'/3 · tốn 1 Quân lệnh theo lõi.</p>'+
  pages(TARGETS,t=>row(t[1],(s.territories[t[0]]&&war?'Đã chiếm':s.milestones['trial:'+t[0]]&&!war?'Đã thắng':'Ải đối thủ '+t[2]),btn(tabA,t[0],war?'Công thành':'Thử sức',locked||!completed(t[2])||s.daily[tabA]>=3||(war&&(!s.guild.level||t[3]===nation()||!!s.territories[t[0]])))));
 }else if(tabA==='growth'){
  const h=owned(hero)?game.hero[hero]:null,g=h?growth(hero):null,n=nat(game.nlClassicWorldA4?.rebirth?.[hero]);
  b='<label>Võ tướng <select data-nla59-hero>'+game.roster.filter(owned).map(id=>'<option value="'+esc(id)+'" '+(id===hero?'selected':'')+'>'+esc(HEROES[id]?.name||id)+'</option>').join('')+'</select></label>';
  if(h)b+=row('Đột phá','Cấp '+h.level+' · mở trần '+(g.advanced?nlClassicGrowthPolicy.cap(hero):60)+' · qua ải 12',btn('breakthrough',hero,'Đột phá',locked||g.advanced||h.level<40||!completed(12)))+
  row('Huấn luyện cao cấp','900 Bạc + 60 Chiến công · XP chịu ảnh hưởng Thao Trường/Dinh Phủ',btn('train',hero,'Luyện',locked||!g.advanced||h.level>=nlClassicGrowthPolicy.cap(hero)))+
  row('Chuyển sinh','Lần '+n+'/10 · yêu cầu cấp '+(g.advanced?nlClassicGrowthPolicy.rebirthGate(hero):'60 sau đột phá')+' · về cấp 1 · 2.000 Bạc + 500 Chiến công',btn('rebirth',hero,'Chuyển sinh',locked||!g.advanced||n>=10||h.level<nlClassicGrowthPolicy.rebirthGate(hero)))+
  row('Giác ngộ',g.awakened?'Đã giác ngộ':'Cấp 50, chuyển sinh ≥1 · +5% công',btn('awaken',hero,'Giác ngộ',locked||!g.advanced||g.awakened||h.level<50||n<1));
 }else if(tabA==='events'){
  b=EVENTS.map(e=>row(e[0]==='relief'?'Cứu tế':e[0]==='supply'?'Tiếp tế':'Thương mại',e[2]+' Bạc + '+e[3]+' Lương → '+e[4]+' Chiến công',btn('event',e[0],'Thực hiện',locked||s.daily.event>=3||!completed(2)))).join('')+'<p>Hoạt động '+s.daily.event+'/3 hôm nay.</p>';
 }else if(tabA==='achieve'){
  b=pages(TASKS,q=>row(q[1],Math.min(nat(s.milestones[q[0]]),q[2])+'/'+q[2]+' · '+q[3]+' Bạc + '+q[4]+' Chiến công',btn('achievement',q[0],s.claimed.includes(q[0])?'Đã nhận':'Nhận',locked||s.claimed.includes(q[0])||nat(s.milestones[q[0]])<q[2])));
 }else if(tabA==='naval'){
  b=row('Đóng tàu hậu cần','Tàu '+s.naval.ships+'/'+Math.min(10,lv('nl_city_dock'))+' · cần Hải Cảng, Bến Thuyền',btn('ship','','Đóng tàu',locked||lv('nl_city_naval_port')<1||s.naval.ships>=Math.min(10,lv('nl_city_dock'))))+
  (s.naval.job?row('Vận tải biển',countdown(s.naval.job),btn('sea-collect','','Nhận',locked||Date.now()<s.naval.job.until)):row('Vận tải biển','600 Bạc + 400 Lương · cần Cảng Hàng Hóa',btn('sea','','Xuất hải',locked||!s.naval.ships||lv('nl_city_cargo_port')<1||s.daily.ship>=2)));
 }else{
  b=pages([['nl_city_drillground','Thao Trường','XP huấn luyện'],['nl_city_manor','Dinh Phủ','XP huấn luyện'],['nl_city_state_office','Quốc Chính','Uy danh khi đầu tư'],['nl_city_bank','Tiền Trang','Lợi nhuận ủy phái'],['nl_city_trade_society','Thương Xã','Lợi nhuận ủy phái'],['nl_city_dock','Bến Thuyền','Số tàu vận tải'],['nl_city_cargo_port','Cảng Hàng Hóa','Thu nhập hải vận'],['nl_city_naval_drill','Thao Trường Thủy Quân','Chiến công hải vận'],['nl_city_navy_warehouse','Kho Hải Quân','Sức chứa hải vận'],['nl_city_lighthouse','Hải Đăng','Thời gian vận tải'],['nl_city_workshop','Công Tượng Phường','Giảm Bạc khi cường hóa'],['nl_city_engraving','Khắc Văn','Giảm Bạc khi cường hóa'],['nl_city_warehouse','Kho','+5 ô trang bị mỗi cấp']],x=>row(x[1],'Cấp '+lv(x[0])+' · '+x[2]));
 }
 return '<section class="panel mini-box nla59" data-nla59-panel><h3>Triều Chính · Quân Đoàn · Thiên Hạ</h3><div class="nla59-tabs">'+tabs.map(t=>'<button class="dark-button '+(tabA===t[0]?'picked':'')+'" data-nla59-tab="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>'+b+'<p class="tiny">Mô phỏng WEB cổ điển · offline · Save v5.</p></section>';
}
const previousCity=renderCity;renderCity=function(){return previousCity()+panel();};
document.addEventListener('click',e=>{
 const t=e.target.closest?.('[data-nla59-tab]');if(t){tabA=t.dataset.nla59Tab;page=0;render();return;}
 const b=e.target.closest?.('[data-nla59-action]');if(!b||b.disabled)return;
 const k=b.dataset.nla59Action,id=b.dataset.nla59Id;
 if(k==='page'){page=Math.max(0,page+(id==='next'?1:-1));render();return;}
 if(k==='rebirth'){if(window.confirm('Chuyển sinh đưa tướng về cấp 1, tốn 2.000 Bạc và 500 Chiến công. Xác nhận?')&&!nlClassicA4Rebirth(id))toast('Chưa đủ điều kiện.');return;}
 const actions={rank:rankUp,salary,relief,invest,dispatch,'dispatch-collect':collectDispatch,join:joinGuild,donate,territory:territoryIncome,war:id=>challenge('war',id),trial:id=>challenge('trial',id),breakthrough,train:advancedTrain,awaken,event,achievement,ship:buildShip,sea:seaTrade,'sea-collect':collectSea};
 if(typeof actions[k]==='function'&&!actions[k](id))toast('Chưa đủ điều kiện hoặc tài nguyên.');
});
document.addEventListener('change',e=>{if(e.target.matches?.('[data-nla59-hero]')&&owned(e.target.value)){hero=e.target.value;render();}});
const css=document.createElement('style');css.textContent='.nla59-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0}.nla59-tabs button,.nla59-row button{font-size:11px;padding:5px 8px}.nla59-row{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #665e43;padding:5px 0}.nla59-row b,.nla59-row small{display:block}.nla59-row small{font-size:10px;color:#c4bda8}.nla59 p{font-size:11px;margin:5px 0}.nla59 select{max-width:100%}@media(max-width:480px){.nla59{padding:6px}.nla59-row{padding:3px 0}.nla59-tabs button{padding:4px 6px}}';document.head.appendChild(css);
if(window.__P2_ENABLE_QA__)window.__NL_ADVANCED_QA__=Object.freeze({state:()=>structuredClone(state()),rankUp,salary,relief,invest,dispatch,collectDispatch,joinGuild,donate,challenge,territoryIncome,breakthrough,advancedTrain,awaken,event,achievement,buildShip,seaTrade,collectSea,panel,source:'PROJECT_SIMULATED'});
})();
// === end NL-CLASSIC-A5-A9-V1 ===
