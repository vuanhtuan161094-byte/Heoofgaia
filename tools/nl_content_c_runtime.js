// === NL-CONTENT-C-V1: sourced roster and project-simulated native P2 expansion ===
const NL_CONTENT_C=__NL_CONTENT_C_DATA__;
const NL_C_TIER4=__NL_CONTENT_C_TIER4__;
let nlContentCSettle;
(()=>{
'use strict';
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x), nat=x=>Number.isSafeInteger(x)&&x>=0?x:0, clamp=(v,l,h)=>Math.min(h,Math.max(l,v));
const owned=id=>game.roster.includes(id)&&!!game.hero[id];
const MAPS=NL_CONTENT_C.maps, HERO=new Map(NL_CONTENT_C.heroes.map(h=>[h.id,h]));
const NPC=new Map(), MAP=new Map(MAPS.map(m=>[m.id,m]));
for(const m of MAPS)m.npcs.forEach((n,i)=>NPC.set(n.id,{map:m,n,index:i}));
if(MAPS.length!==249||NPC.size!==4903||Object.keys(NL_CONTENT_C.heroAliases).length!==364)throw Error('C source counts');
for(const h of HERO.values()){
 const {descriptor,gate,silver,provenance,...profile}=h;HEROES[h.id]=profile;P2_SKILLS[h.id]={...descriptor};
}
const originalAddExp=addExp;
addExp=function(id,amount){
 const h=game.hero[id],cap=typeof nlClassicGrowthPolicy==='undefined'?40:nlClassicGrowthPolicy.cap(id);
 if(!h||cap<=40)return originalAddExp(id,amount);
 h.xp=nat(h.xp)+Math.max(0,nat(amount));while(h.level<cap&&h.xp>=h.level*90){h.xp-=h.level*90;h.level++;}
};
function state(){
 if(!obj(game.nlContentC))game.nlContentC={};
 const s=game.nlContentC;s.version=1;
 for(const k of ['cleared','mapsCleared','seals','recruits'])if(!obj(s[k]))s[k]={};
 if(!Array.isArray(s.equippedSeals))s.equippedSeals=[];
 s.extraFloor=clamp(nat(s.extraFloor),0,80);s.soul=nat(s.soul);
 return s;
}
const floor=()=>Math.max(0,Math.min(20,nat(game.towerFloor)))+state().extraFloor;
function heroReady(h){return h.towerGate?floor()>=h.towerGate&&state().soul>=h.soulCost:game.cleared.includes(h.gate);}
function recruit(id){
 const h=HERO.get(id),s=state();
 if(battle||!h||owned(id)||!heroReady(h)||!payment({silver:h.silver}))return false;
 if(h.towerGate)s.soul-=h.soulCost;
 game.roster.push(id);game.hero[id]={level:1,xp:0,troops:160};game.troopModes[id]=h.type;
 s.recruits[id]=true;countTask('recruit');save();render();return true;
}
function family(label){
 const s=String(label||'').toLocaleLowerCase('vi');
 if(/trống|cổ thủ|cổ hiệu|kỳ cổ|cổ vũ|鼓/.test(s))return 'drum';
 if(/vũ nữ|vũ cơ|舞/.test(s))return 'dancer';
 if(/cung|nỏ|xạ|tiễn|pháo|弓|弩/.test(s))return 'archer';
 if(/kỵ|mã|tượng|骑/.test(s))return 'cavalry';
 if(/thương|kích|mâu|枪/.test(s))return 'spear';
 if(/văn|sĩ|sư|pháp|thuật|quan văn|文/.test(s))return 'strategist';
 if(/y quan|hồi phục|hỗ trợ/.test(s))return 'support';
 return 'infantry';
}
function descriptor(label,role,boss){
 const s=String(label||'Chiến pháp'),l=s.toLocaleLowerCase('vi'),mult=boss?1.6:1.35;
 if(/hồi|trị|cứu|nhân đức|y thuật/.test(l)||role==='support')return {tag:s,pattern:'heal',kind:'magic',mult,healCount:2,bonusMorale:8};
 if(/hoành|hàng ngang|quét/.test(l))return {tag:s,pattern:'row',kind:'tactic',mult:.95};
 if(/xuyên|liên|đột phá/.test(l))return {tag:s,pattern:'column',kind:'tactic',mult:1.05};
 if(/ly gián|li gián|huyễn|loạn|trấn/.test(l))return {tag:s,pattern:'single',kind:'magic',mult,drainMorale:20};
 if(/hỏa|viêm|lửa/.test(l))return {tag:s,pattern:'row',kind:'magic',mult:1.05,apply:'burn',applyChance:.35};
 if(role==='archer')return {tag:s,pattern:'back',kind:'physical',mult};
 return {tag:s,pattern:'single',kind:role==='strategist'?'magic':role==='cavalry'?'tactic':'physical',mult};
}
function readyNpc(id){
 const row=NPC.get(id),s=state();if(!row||!game.cleared.includes(row.map.gate)||s.cleared[id])return false;
 return row.index===0||!!s.cleared[row.map.npcs[row.index-1].id];
}
function openObjective(o,units,scale){
 if(battle||nlAState().orders<1||!game.cleared.includes(1)||!game.slots.some(id=>id&&game.hero[id]?.troops>=30))return false;
 // Existing cleared stage 1 provides native launch, grain, order, turn and animation authority.
 beginBattle(1,'campaign');
 if(!battle||battle.replay||battle.finished||battle.stage!==1||battle.mode!=='campaign')return false;
 battle.nlContentC=o;
 battle.e=units.map((u,i)=>{
  const role=family(u[2]),slot=u[0],boss=!!o.boss&&i===units.length-1;
  const e=p2Unit('e','e',boss?4:i,Math.min(28,Math.max(1,scale)));
  e.id='c-'+i;e.slot=slot;e.name=u[1];e.troop=role;e.type=role==='spear'?'infantry':(['drum','dancer'].includes(role)?'support':role);
  e.icon=({archer:'🏹',cavalry:'🐎',spear:'🔱',strategist:'🪶',support:'📜',drum:'🥁',dancer:'💃'})[role]||'🛡️';
  e.skill=u[3];e.nlCDescriptor=descriptor(u[3],role,boss);
  const ratio=clamp(Math.sqrt(Math.max(1,u[4])/Math.max(200,250+scale*90)),.75,1.45);
  const difficulty=clamp(1+Math.max(0,scale-28)*.025,1,2.8);
  for(const k of ['atk','catk','matk','def','tdef','mdef'])e[k]=Math.max(1,Math.round(e[k]*ratio*difficulty));
  e.hp=e.maxHp=Math.max(1,Math.round(e.maxHp*ratio*difficulty));e.effects=[];e.morale=boss?60:40;
  return e;
 });
 battle.order=null;battle.orderIndex=0;battle.opening=p2Snapshot();
 if(o.kind==='tower'){game.activity.towerTries--;battleLastTab='tower';}
 save();renderBattleShell();return true;
}
function startNpc(id){
 if(!readyNpc(id))return false;const r=NPC.get(id),scale=r.map.gate;
 return openObjective({kind:'npc',id,mapId:r.map.id,title:r.map.name+' · '+r.n.name,boss:r.n.boss,xp:95+scale*12},r.n.units,scale);
}
const towerRoles=['Bộ','Thương','Kỵ','Cung','Quan văn','Kỳ Cổ Thủ'];
function startTower(){
 const n=floor()+1;if(n<=20||n>100||battle||!game.activity||game.activity.towerTries<=0)return false;
 const slots=[2,5,8,4,7],units=slots.slice(0,Math.min(5,3+Math.floor(n/30))).map((slot,i)=>[slot,'Tháp '+n+' · '+['Tiền quân','Hộ vệ','Xung kích','Quân sư','Thủ lĩnh'][i],towerRoles[(n+i)%towerRoles.length],['Thiết Bích','Hoành Tảo','Xuyên Phong','Huyễn Thuật','Bộc Viêm'][(n+i)%5],500+n*90,n]);
 return openObjective({kind:'tower',id:'tower-'+n,floor:n,title:'Tháp Thí Luyện · Tầng '+n,boss:n%5===0,xp:95+n*12},units,n);
}
// Called only inside native finishBattle's victory branch. Native credit, losses, XP,
// report and replay are still the sole settlement owner; no legacy stage reward/loot.
nlContentCSettle=function(o){
 const s=state();
 if(o.kind==='npc'){
  const r=NPC.get(o.id);if(!r||s.cleared[o.id])return {};
  s.cleared[o.id]=true;s.soul+=r.n.boss?15:5;
  if(r.map.npcs.every(n=>s.cleared[n.id]))s.mapsCleared[r.map.id]=true;
  return {silver:350+r.map.gate*85,grain:120+r.map.gate*25,prestige:r.n.boss?30+r.map.gate*3:10+r.map.gate};
 }
 if(o.kind==='tower'&&o.floor===floor()+1&&o.floor<=100){
  s.extraFloor++;s.soul+=30+o.floor;return {silver:1100+o.floor*420,grain:150+o.floor*30,prestige:60+o.floor*30};
 }
 return {};
};
const oldSkill=p2Skill;
p2Skill=function(actor){
 if(actor?.team==='e'&&battle?.nlContentC&&actor.nlCDescriptor)return actor.nlCDescriptor;
 const awake=actor?.team==='p'&&battle?.mode!=='cltq'&&game.nlClassicAdvanced?.growth?.[actor.id]?.awakened&&NL_CONTENT_C.awakeningSkills?.[actor.id];
 return awake?{...awake.descriptor}:oldSkill(actor);
};
const oldReport=p2StoreReport;
p2StoreReport=function(rewards,loot){oldReport(rewards,loot);if(battle?.nlContentC&&battle.report)battle.report.nlContentC=structuredClone(battle.nlContentC);};
const oldShell=renderBattleShell;
renderBattleShell=function(){oldShell();const o=battle?.nlContentC||battle?.report?.nlContentC;
 if(o){const head=document.querySelector('.battle-head');if(head&&!document.querySelector('[data-nlc-battle]'))head.insertAdjacentHTML('afterend','<div data-nlc-battle class="nl-a1-live">'+esc(o.title)+' · PROJECT_SIMULATED</div>');}
};
// Tier 4 names and six historical source coefficients use the B4 assignment map,
// without mutating the original 55-entry catalogue or introducing another unit owner.
for(const t of NL_C_TIER4)NLW_B4_BY_ID.set(t.id,t);
const tier4=new Map(NL_C_TIER4.map(t=>[t.id,t])),oldCan=nlwB4CanSelect;
nlwB4CanSelect=function(id,tid){if(tier4.has(tid))return false;return oldCan(id,tid);};
function choose4(id,tid){
 const t=tier4.get(tid),s=state();
 if(battle||!t||!owned(id)||game.buildings.barracks<4||floor()<40||nat(game.nlClassicWorldA4?.rebirth?.[id])<10||s.soul<300||nlwB4Active(id)?.id===tid||!payment({silver:5000}))return false;
 s.soul-=300;const b=nlwB4State();b.assigned[id]=tid;b.selectionReceipts.push({heroId:id,troopId:tid,silver:5000,at:Date.now(),source:'PROJECT_SIMULATED_C'});b.selectionReceipts=b.selectionReceipts.slice(-250);save();render();return true;
}
const SEALS=[
 ['sword','Lợi Kiếm','atk',25,'stage',4],['iron','Thiết Giáp','def',22,'stage',8],['dragon','Long Ngâm','hp',160,'npc',20],
 ['reverse','Nghịch Sách','mdef',30,'npc',40],['precision','Tinh Chuẩn','catk',64,'tower',50],['stratagem','Quỷ Kế','matk',42,'tower',35],
 ['holy','Thánh Bồng','tdef',37,'stage',20],['boulder','Cự Thạch','matk',64,'prestige',5000],['control','Chưởng Khống','hp',140,'heroes',228],
 ['command','Ngự Binh','hp',120,'heroes',180],['strength','Lực Lượng','atk',35,'territory',1],['turtle','Quy Giáp','def',28,'tower',20],
 ['steel','Kiên Giáp','def',13,'prestige',2000],['hoof','Thiết Đề','catk',25,'stage',12],['storm','Lôi Vũ','matk',25,'npc',60],
 ['flame','Liệt Diễm','mdef',13,'seals',5],['charge','Liệt Mã','catk',42,'tower',60],['diamond','Kim Cang','def',37,'npc',100]
];
function sealReady(r){
 const s=state(),v={stage:game.cleared.length,npc:Object.keys(s.cleared).length,tower:floor(),prestige:game.prestige,heroes:game.roster.length,territory:Object.keys(game.nlClassicAdvanced?.territories||{}).length,seals:Object.keys(s.seals).length};
 return v[r[4]]>=r[5];
}
function unlockSeal(id){const s=state(),r=SEALS.find(x=>x[0]===id);if(battle||!r||s.seals[id]||!sealReady(r))return false;s.seals[id]=true;save();render();return true;}
function equipSeal(id){const s=state();if(battle||!s.seals[id]||!SEALS.some(r=>r[0]===id))return false;
 if(s.equippedSeals.includes(id))s.equippedSeals=s.equippedSeals.filter(x=>x!==id);
 else {if(s.equippedSeals.length>=3)return false;s.equippedSeals.push(id);}save();render();return true;}
const priorUnit=p2Unit;
p2Unit=function(id,team,slot,stage){
 const u=priorUnit(id,team,slot,stage);if(team!=='p'||!u||battle?.mode==='cltq')return u;
 const awake=game.nlClassicAdvanced?.growth?.[id]?.awakened&&NL_CONTENT_C.awakeningSkills?.[id];if(awake)u.skill=awake.descriptor.tag;
 const s=state(),used=new Set();
 for(const sid of s.equippedSeals.slice(0,3)){const r=SEALS.find(x=>x[0]===sid);if(!r||!s.seals[sid]||used.has(sid))continue;used.add(sid);
  if(Number.isFinite(u[r[2]])){u[r[2]]+=r[3];if(r[2]==='hp')u.maxHp+=r[3];}}
 if(tier4.has(nlwB4Active(id)?.id))for(const k of ['atk','catk','matk','def','tdef','mdef'])if(Number.isFinite(u[k]))u[k]=Math.round(u[k]*1.08);
 return u;
};
let mapPage=0,npcPage=0,heroPage=0,unitPage=0,sealPage=0,mapId=MAPS[0].id,heroId='',search='';
const btn=(a,id,label,disabled=false)=>'<button class="gold-button" data-nlc-action="'+a+'" data-nlc-id="'+esc(id)+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>';
const row=(title,desc,action='')=>'<div class="nlc-row"><div><b>'+esc(title)+'</b><small>'+esc(desc)+'</small></div>'+action+'</div>';
const pane=(name,title,body)=>'<section class="panel mini-box nlc-pane" data-nlc-panel="'+name+'"><h3>'+title+'</h3>'+body+'<p class="tiny">Dữ liệu Wiki tham chiếu; chiến đấu và cân bằng PROJECT_SIMULATED.</p></section>';
const pages=(a,n,cb,action)=>a.slice(n*4,n*4+4).map(cb).join('')+'<div class="nlc-nav">'+btn(action,'prev','Trước',n===0)+' <span>'+(n+1)+'/'+Math.max(1,Math.ceil(a.length/4))+'</span> '+btn(action,'next','Sau',n>=Math.ceil(a.length/4)-1)+'</div>';
function campaignPanel(){const s=state(),m=MAP.get(mapId)||MAPS[0],list=MAPS.filter(x=>x.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
 const options=list.slice(mapPage*20,mapPage*20+20).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===m.id?'selected':'')+'>'+esc(x.name)+' · '+x.npcs.length+' NPC · ải '+x.gate+'</option>').join('');
 return pane('campaign','Thiên Hạ Wiki · 249 phó bản / 4.903 NPC','<p>Đã vượt '+Object.keys(s.cleared).length+' NPC · '+Object.keys(s.mapsCleared).length+' bản đồ · '+s.soul+' Tướng Hồn</p><input data-nlc-search placeholder="Tìm phó bản" value="'+esc(search)+'"><select data-nlc-map>'+options+'</select><div class="nlc-nav">'+btn('map-page','prev','Bản đồ trước',mapPage===0)+btn('map-page','next','Bản đồ sau',mapPage>=Math.ceil(list.length/20)-1)+'</div><b>'+esc(m.name)+'</b>'+pages(m.npcs,npcPage,n=>row(n.name,(n.boss?'Boss · ':'')+n.units.length+' đội · '+(n.sourceFormationIncomplete?'ngoại suy đội hình':'ô đội hình nguồn'),btn('npc',n.id,s.cleared[n.id]?'Đã thắng':'Xuất chiến',!readyNpc(n.id)||!!battle)),'npc-page'));
}
function heroPanel(){const s=state(),rows=[...HERO.values()];return pane('heroes','Danh tướng Wiki bổ sung · '+HERO.size,'<p>364 hồ sơ Wiki được ánh xạ · '+NL_CONTENT_C.counts.runtimeHeroes+' danh tính runtime, gồm tướng cũ.</p>'+pages(rows,heroPage,h=>row(h.name,(h.faction||'')+' · '+h.skill+' · '+(h.towerGate?'Tháp '+h.towerGate+' · '+h.soulCost+' Tướng Hồn':'ải '+h.gate)+' · '+h.silver+' Bạc',btn('recruit',h.id,owned(h.id)?'Đã có':'Chiêu mộ',owned(h.id)||!!battle||!heroReady(h)||game.silver<h.silver)),'hero-page'));}
function troopPanel(){if(!owned(heroId))heroId=game.roster[0]||'';return pane('troops','Quân cấp 4 · '+tier4.size,'<p>40 quân WEB 2011 · mở sau 10 chuyển sinh, Tháp 40, Doanh Trại 4 · 300 Tướng Hồn + 5.000 Bạc.</p><select data-nlc-hero>'+game.roster.map(id=>'<option value="'+esc(id)+'" '+(id===heroId?'selected':'')+'>'+esc(HEROES[id]?.name||id)+'</option>').join('')+'</select>'+pages(NL_C_TIER4,unitPage,t=>row(t.name,t.sourceName+' · '+t.familyName,btn('tier4',t.id,nlwB4Active(heroId)?.id===t.id?'Đang dùng':'Chuyển quân',!!battle||!owned(heroId)||floor()<40||nat(game.nlClassicWorldA4?.rebirth?.[heroId])<10||game.buildings.barracks<4||state().soul<300||game.silver<5000)),'unit-page'));}
function towerPanel(){return pane('tower','Tháp mở rộng · 100 tầng','<p>Đã vượt '+floor()+'/100 · lượt '+(game.activity?.towerTries||0)+'/3 · Tướng Hồn '+state().soul+'</p>'+row('Tầng '+Math.min(100,floor()+1),floor()<20?'Hoàn thành 20 tầng gốc trước.':'Đối thủ tăng dần · thưởng Bạc/Lương/Uy danh/Tướng Hồn',btn('tower','','Khiêu chiến',!!battle||floor()<20||floor()>=100||!game.activity?.towerTries)));}
function sealPanel(){const s=state();return pane('seals','Quân ấn · '+SEALS.length+' mẫu','<p>Đã mở '+Object.keys(s.seals).length+' · trang bị '+s.equippedSeals.length+'/3 · chỉ số cộng cho đội.</p>'+pages(SEALS,sealPage,r=>row(r[1],r[2]+' +'+r[3]+' · '+({stage:'Ải',npc:'NPC Wiki',tower:'Tầng',prestige:'Uy danh',heroes:'Võ tướng',territory:'Lãnh địa',seals:'Quân ấn'})[r[4]]+' '+r[5],s.seals[r[0]]?btn('equip-seal',r[0],s.equippedSeals.includes(r[0])?'Tháo':'Trang bị',!!battle||(!s.equippedSeals.includes(r[0])&&s.equippedSeals.length>=3)):btn('unlock-seal',r[0],'Nhận',!!battle||!sealReady(r))),'seal-page'));}
const c0=renderCampaign,h0=renderHeroes,b0=renderBarracks,t0=renderTower,f0=renderFormation;
renderCampaign=function(){return c0()+campaignPanel();};renderHeroes=function(){return h0()+heroPanel();};renderBarracks=function(){return b0()+troopPanel();};renderTower=function(){return t0()+towerPanel();};renderFormation=function(){return f0()+sealPanel();};
document.addEventListener('change',e=>{if(e.target.matches?.('[data-nlc-map]')&&MAP.has(e.target.value)){mapId=e.target.value;npcPage=0;render();}else if(e.target.matches?.('[data-nlc-hero]')){heroId=e.target.value;render();}else if(e.target.matches?.('[data-nlc-search]')){search=e.target.value;mapPage=0;const match=MAPS.find(x=>x.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));if(match){mapId=match.id;npcPage=0;}render();}});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-nlc-action]');if(!b||b.disabled)return;const a=b.dataset.nlcAction,id=b.dataset.nlcId,delta=id==='next'?1:-1;
 if(a==='map-page'){mapPage=Math.max(0,mapPage+delta);const list=MAPS.filter(x=>x.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));if(list[mapPage*20]){mapId=list[mapPage*20].id;npcPage=0;}render();return;}
 if(a==='npc-page')npcPage=Math.max(0,npcPage+delta);else if(a==='hero-page')heroPage=Math.max(0,heroPage+delta);else if(a==='unit-page')unitPage=Math.max(0,unitPage+delta);else if(a==='seal-page')sealPage=Math.max(0,sealPage+delta);else {const fn={npc:startNpc,recruit,tier4:tid=>choose4(heroId,tid),tower:startTower,'unlock-seal':unlockSeal,'equip-seal':equipSeal}[a];if(fn&&!fn(id))toast('Chưa đủ điều kiện hoặc tài nguyên.');return;}render();});
const style=document.createElement('style');style.textContent='.nlc-row{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #665e43}.nlc-row b,.nlc-row small{display:block}.nlc-row small,.nlc-pane p{font-size:10px}.nlc-row button,.nlc-nav button{font-size:11px;padding:5px 8px;white-space:nowrap}.nlc-nav{display:flex;align-items:center;gap:6px;margin:4px 0}.nlc-pane input,.nlc-pane select{max-width:100%;font-size:12px}.nlc-pane h3{margin:4px 0}';document.head.appendChild(style);
if(window.__P2_ENABLE_QA__)window.__NL_CONTENT_C_QA__=Object.freeze({counts:NL_CONTENT_C.counts,state:()=>structuredClone(state()),map:id=>MAP.get(id),npc:id=>NPC.get(id)?.n,readyNpc,startNpc,startTower,recruit,choose4,unlockSeal,equipSeal,floor,descriptor,family,tiers:()=>NL_C_TIER4.length,seals:()=>SEALS.length,panels:()=>[campaignPanel(),heroPanel(),troopPanel(),towerPanel(),sealPanel()]});
})();
// === end NL-CONTENT-C-V1 ===
