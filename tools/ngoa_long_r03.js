// === NL-R03 — original troop lineages and tactical challenge encounters ===
// All branch effects, costs and encounter tuning are project-authored simulations.
const NLR03_BRANCHES={
 infantry:[
  {id:'bulwark',name:'Thiết Thành',desc:'Tăng 17% ba phòng thủ; giữ vững tuyến trước.',stats:{def:1.17,tdef:1.17,mdef:1.17}},
  {id:'crusher',name:'Phá Trận',desc:'Tăng 12% công; xuyên thêm giáp trong đòn thường.',stats:{atk:1.12,catk:1.12},pierce:.08},
  {id:'spearwall',name:'Thương Phá Kỵ',desc:'Chuyển Bộ tướng sang Thương binh; dùng Chiến Công và khắc chế Kỵ.',troop:'spear',combatType:'cavalry',stats:{catk:1.10,tdef:1.10}}
 ],
 cavalry:[
  {id:'shock',name:'Xung Kích',desc:'Tăng 16% Chiến Công và 8 tốc độ.',stats:{catk:1.16},speed:8,skillMult:1.10},
  {id:'raider',name:'Kỵ Tập Hậu',desc:'Tăng 6% công; AI đánh thường nhắm hàng sau.',stats:{atk:1.06,catk:1.06},speed:4,targetBack:true}
 ],
 archer:[
  {id:'marksman',name:'Thần Xạ',desc:'Tăng 9% công và 10 điểm chí mạng.',stats:{atk:1.09},crit:.10,skillMult:1.05},
  {id:'volley',name:'Liên Nỗ',desc:'Kỹ năng đơn mục tiêu bắn thêm một nhịp; kỹ năng hai nhịp được tăng lực nhẹ.',stats:{atk:1.04},skillPattern:'double'}
 ],
 strategist:[
  {id:'ember',name:'Hỏa Cơ',desc:'Tăng 12% Mưu Công; chiến pháp có cơ hội gây thiêu đốt.',stats:{matk:1.12},burnChance:.58},
  {id:'disrupt',name:'Nhiễu Tâm',desc:'Kỹ năng rút thêm 18 sĩ khí, gây rối nhịp địch.',stats:{matk:1.06},drainMorale:18}
 ],
 support:[
  {id:'medic',name:'Dưỡng Quân',desc:'Kỹ năng hồi phục tăng 28%.',stats:{matk:1.05},healMult:1.28},
  {id:'rally',name:'Hiệu Lệnh',desc:'Khi chuyển sang Cổ Hiệu Quân, tăng thêm 12 sĩ khí mỗi nhịp trống.',stats:{matk:1.04},drumBonus:12}
 ]
};
const NLR03_BRANCH_BY_ID=Object.fromEntries(Object.entries(NLR03_BRANCHES).flatMap(([type,branches])=>branches.map(branch=>[branch.id,{...branch,type}])));
const NLR03_EVOLUTION_COST={silver:1100,grain:520,iron:280};
const NLR03_STAGE_CONTENT=[
 ['Thiết Môn Quan','Đội trưởng Thiết Môn','Đồn cửa có hộ vệ giữ tuyến trước; hai đơn vị đầu trận vào thế thủ.',16200,4900,2080],
 ['Hẻm Hỏa Tinh','Tư Tế Hỏa Tinh','Mưu sĩ tinh nhuệ mở trận bằng chiến pháp hỏa công.',17000,5200,2200],
 ['Đèo Kỵ Phục','Chỉ Huy Kỵ Phục','Kỵ đội cơ động tăng tốc và tìm cách tập hậu.',18000,5500,2320],
 ['Đài Cổ Hiệu','Đại Hiệu Úy','Cổ hiệu quân địch mở đầu bằng một lượt cổ vũ toàn đội.',19000,5800,2500]
];
STAGES.push(...NLR03_STAGE_CONTENT);

function nlr03Hydrate(){
 if(!game.nlr03||typeof game.nlr03!=='object'||Array.isArray(game.nlr03))game.nlr03={schema:1,evolutions:{}};
 const prior=game.nlr03.evolutions&&typeof game.nlr03.evolutions==='object'&&!Array.isArray(game.nlr03.evolutions)?game.nlr03.evolutions:{};
 const evolutions={};
 for(const [hero,id] of Object.entries(prior)){
  const branch=NLR03_BRANCH_BY_ID[id];
  if(game.roster.includes(hero)&&game.hero[hero]&&branch&&branch.type===HEROES[hero]?.type)evolutions[hero]=id;
 }
 game.nlr03={schema:1,evolutions};
}
const nlr03PriorFresh=fresh;
fresh=function(){const value=nlr03PriorFresh();value.nlr03={schema:1,evolutions:{}};return value;};
const nlr03PriorHydrate=hydrateExtension;
hydrateExtension=function(){nlr03PriorHydrate();nlr03Hydrate();save();};
nlr03Hydrate();

function nlr03BranchFor(id){return NLR03_BRANCH_BY_ID[game.nlr03?.evolutions?.[id]]||null;}
function nlr03BranchOptions(id){return NLR03_BRANCHES[HEROES[id]?.type]||[];}
function nlr03Evolve(id,branchId){
 const hero=HEROES[id],owned=game.roster.includes(id)&&!!game.hero[id],branch=NLR03_BRANCH_BY_ID[branchId];
 if(battle||!owned||!branch||branch.type!==hero?.type)return false;
 if(game.buildings.barracks<2)return toast('Nâng Doanh Trại lên cấp 2 để mở nhánh tiến hóa.'),false;
 if(game.nlr03.evolutions[id]===branchId)return toast('Tướng này đang dùng nhánh đó.'),false;
 if(!payment(NLR03_EVOLUTION_COST))return toast('Thiếu tài nguyên để tiến hóa binh chủng.'),false;
 game.nlr03.evolutions[id]=branchId;
 log(`${hero.name} chọn nhánh ${branch.name}.`);save();render();toast(`${hero.name} · ${branch.name}`);return true;
}
function nlr03LineagePanel(){
 const rows=game.roster.map(id=>{
  const hero=HEROES[id],branches=nlr03BranchOptions(id),current=nlr03BranchFor(id),locked=game.buildings.barracks<2;
  if(!branches.length)return '';
  return `<div class="nlr03-row" data-r03-row="${id}"><div><b>${hero.icon} ${esc(hero.name)} · ${esc(hero.role)}</b><small>${current?`Đang dùng: ${esc(current.name)}`:'Chưa chọn nhánh'} · ${P3_TIER_NAMES[p3Tier(id)]}</small></div><select data-r03-select="${id}" aria-label="Nhánh tiến hóa ${esc(hero.name)}"><option value="">Chọn nhánh</option>${branches.map(branch=>`<option value="${branch.id}" ${current?.id===branch.id?'selected':''}>${esc(branch.name)} — ${esc(branch.desc)}</option>`).join('')}</select><button class="dark-button" data-r03-evolve="${id}" ${locked?'disabled':''}>${locked?'Cần trại cấp 2':current?'Đổi nhánh':'Tiến hóa'}</button></div>`;
 }).join('');
 return `<section class="panel mini-box nlr03-panel" data-r03-lineage="1"><h3>🌿 R03 · Ngả Rẽ Binh Chủng</h3><p class="tiny">Chọn nhánh Bộ, Kỵ, Thương, Cung, Quan Văn hoặc Hỗ trợ. Lựa chọn làm đổi chỉ số, chiến pháp hoặc binh chủng trong trận; chuyển nhánh tốn ${fmt(NLR03_EVOLUTION_COST.silver)} bạc, ${fmt(NLR03_EVOLUTION_COST.grain)} lương và ${fmt(NLR03_EVOLUTION_COST.iron)} sắt. Cần Doanh Trại cấp 2.</p>${rows}<div class="nlr03-foot">Các nhánh và hệ số là thiết kế mô phỏng của Mưu Định Tam Quốc; Thương binh khắc chế Kỵ binh. Không sao chép công thức độc quyền.</div></section>`;
}
const nlr03PriorBarracks=renderBarracks;
renderBarracks=function(){return nlr03PriorBarracks()+nlr03LineagePanel();};
document.addEventListener('click',ev=>{
 const button=ev.target.closest('[data-r03-evolve]');if(!button||button.disabled)return;
 const row=button.closest('[data-r03-row]'),select=row?.querySelector('[data-r03-select]');
 if(select)nlr03Evolve(button.dataset.r03Evolve,select.value);
});

const nlr03PriorUnit=p2Unit;
p2Unit=function(id,team,slot,stage){
 const unit=nlr03PriorUnit(id,team,slot,stage);
 if(team!=='p'||battle?.mode==='cltq')return unit;
 const branch=nlr03BranchFor(id);if(!branch)return unit;
 if(branch.troop)unit.troop=branch.troop;
 if(branch.combatType)unit.type=branch.combatType;
 for(const [key,factor] of Object.entries(branch.stats||{}))if(Number.isFinite(unit[key]))unit[key]=Math.round(unit[key]*factor);
 if(branch.speed)unit.speed+=branch.speed;
 if(branch.crit)unit.crit+=branch.crit;
 unit.r03Branch=branch.id;
 return unit;
};
P2_COUNTERS.spear='cavalry';P2_TROOPS.spear='Thương Binh';
const nlr03PriorHit=p2Hit;
p2Hit=function(attacker,target,kind,mult=1,opts={}){
 const branch=attacker?.team==='p'&&battle?.mode!=='cltq'?nlr03BranchFor(attacker.id):null;
 const adjusted={...opts};if(branch?.pierce)adjusted.pierce=(adjusted.pierce||0)+branch.pierce;
 if(branch?.crit)adjusted.crit=(adjusted.crit||0)+branch.crit*.25;
 return nlr03PriorHit(attacker,target,kind,mult,adjusted);
};
const nlr03PriorTarget=p2Target;
p2Target=function(attacker,mode='front'){
 const branch=attacker?.team==='p'&&battle?.mode!=='cltq'?nlr03BranchFor(attacker.id):null;
 if(branch?.targetBack&&mode==='front')mode='back';
 if(battle?.r03Encounter?.id==='r03-flank'&&attacker?.team==='e'&&attacker.troop==='cavalry'&&mode==='front')mode='back';
 return nlr03PriorTarget(attacker,mode);
};
const nlr03PriorSkill=p2Skill;
p2Skill=function(actor){
 const descriptor={...nlr03PriorSkill(actor)},branch=actor?.team==='p'&&battle?.mode!=='cltq'?nlr03BranchFor(actor.id):null;
 if(!branch)return descriptor;
 if(descriptor.pattern==='heal'&&branch.healMult)descriptor.mult*=branch.healMult;
 if(descriptor.pattern!=='heal'){
  if(branch.skillMult)descriptor.mult*=branch.skillMult;
  if(branch.skillPattern&&descriptor.pattern==='single'){descriptor.pattern=branch.skillPattern;descriptor.mult*=.62;}
  else if(branch.id==='volley'&&descriptor.pattern==='double')descriptor.mult*=1.08;
  if(branch.burnChance){descriptor.apply='burn';descriptor.applyChance=Math.max(descriptor.applyChance||0,branch.burnChance);}
  if(branch.drainMorale)descriptor.drainMorale=(descriptor.drainMorale||0)+branch.drainMorale;
 }
 if(branch.drumBonus&&actor.troop==='drum')descriptor.r03DrumBonus=branch.drumBonus;
 return descriptor;
};
const nlr03PriorPerform=p2Perform;
p2Perform=function(actor){
 const branch=actor?.team==='p'&&battle?.mode!=='cltq'?nlr03BranchFor(actor.id):null;
 if(!branch?.drumBonus||actor.troop!=='drum')return nlr03PriorPerform(actor);
 const prior=p2Morale;
 p2Morale=function(unit,delta){return prior(unit,delta===34||delta===55?delta+branch.drumBonus:delta);};
 try{return nlr03PriorPerform(actor);}finally{p2Morale=prior;}
};

const NLR03_ENCOUNTERS={
 25:{id:'r03-bulwark',name:'Thiết Môn Quan',rule:'Hộ vệ địch bắt đầu trong thế thủ; cung thủ hoặc chiến pháp đánh hàng sau sẽ mở thế trận.',types:['infantry','infantry','archer','strategist','support']},
 26:{id:'r03-ember',name:'Hẻm Hỏa Tinh',rule:'Mưu sĩ địch bắt đầu đủ sĩ khí và có thể tung Hỏa Kế ngay lượt đầu.',types:['infantry','archer','cavalry','strategist','support']},
 27:{id:'r03-flank',name:'Đèo Kỵ Phục',rule:'Kỵ đội địch tăng tốc và chủ động tập hậu tuyến sau.',types:['cavalry','cavalry','infantry','archer','cavalry']},
 28:{id:'r03-drum',name:'Đài Cổ Hiệu',rule:'Đại Hiệu Úy mở trận bằng Cổ Hiệu, bơm sĩ khí cho toàn đội.',types:['infantry','archer','cavalry','strategist','drum']}
};
const nlr03PriorBegin=beginBattle;
beginBattle=function(stage,mode='campaign'){
 nlr03PriorBegin(stage,mode);
 const encounter=mode==='campaign'?NLR03_ENCOUNTERS[stage]:null;
 if(!battle||!encounter)return;
 battle.r03Encounter={id:encounter.id,name:encounter.name,rule:encounter.rule};
 battle.e.forEach((unit,index)=>{
  const type=encounter.types[index]||unit.type;unit.type=type==='drum'?'support':type;unit.troop=type;
  unit.skill=type==='drum'?'Cổ Vũ':P2_ENEMY_SKILLS[type].tag;
  unit.icon=({infantry:'🛡️',cavalry:'🐎',archer:'🏹',strategist:'🪶',support:'📜',drum:'🥁'})[type]||unit.icon;
  if(index===battle.e.length-1)unit.name=STAGES[stage-1][1];
  if(stage===27&&type==='cavalry')unit.speed+=18;
  if(stage===26&&type==='strategist')unit.morale=100;
  if(stage===28&&type==='drum')unit.morale=100;
 });
 if(stage===25)for(const unit of battle.e.slice(0,2))p2Status(unit,'guard',3);
 battle.opening=p2Snapshot();
 save();renderBattleShell();
};
const nlr03PriorStoreReport=p2StoreReport;
p2StoreReport=function(rewards,loot){
 nlr03PriorStoreReport(rewards,loot);
 if(battle?.report&&battle.r03Encounter)battle.report.r03Encounter=structuredClone(battle.r03Encounter);
};
const nlr03PriorBattleShell=renderBattleShell;
renderBattleShell=function(){
 nlr03PriorBattleShell();
 const encounter=battle?.r03Encounter||battle?.report?.r03Encounter;if(!encounter)return;
 const header=$('battle-mount').querySelector('.battle-head');
 if(header&&!header.querySelector('[data-r03-encounter]'))header.insertAdjacentHTML('afterend',`<div class="nlr03-encounter" data-r03-encounter="${encounter.id}"><b>${esc(encounter.name)} · CƠ CHẾ ẢI</b><span>${esc(encounter.rule)}</span></div>`);
};

const nlr03Style=document.createElement('style');
nlr03Style.textContent=`.nlr03-panel{margin-top:18px;border-color:#71835e;background:linear-gradient(135deg,#1d3029,#172522)}.nlr03-panel h3{margin:0 0 8px;color:#e3ca92}.nlr03-row{display:grid;grid-template-columns:minmax(180px,1fr) minmax(210px,1fr) auto;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid #42574b}.nlr03-row>div{display:grid;gap:4px}.nlr03-row b{font-size:11px;color:#f0dfbd}.nlr03-row small,.nlr03-foot{font-size:9px;color:#aebbac;line-height:1.5}.nlr03-row select{max-width:100%;min-width:0;padding:7px;background:#172622;color:#eadfc6;border:1px solid #596c5d;border-radius:4px;font-size:10px}.nlr03-row button{font-size:10px;white-space:nowrap}.nlr03-foot{margin-top:8px}.nlr03-encounter{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#392f1e;border:1px solid #8d7549;color:#ead9b6;font-size:10px}.nlr03-encounter b{color:#f0ce86;white-space:nowrap}.nlr03-encounter span{line-height:1.45}@media(max-width:620px){.nlr03-row{grid-template-columns:1fr auto}.nlr03-row select{grid-column:1}.nlr03-row button{grid-column:2;grid-row:2}.nlr03-encounter{align-items:flex-start;flex-direction:column}}`;
document.head.appendChild(nlr03Style);

if(window.__P2_QA__){window.__P2_QA__.beginBattle=beginBattle;window.__P2_QA__.makeUnit=makeUnit;window.__P2_QA__.p2Hit=p2Hit;window.__P2_QA__.p2Target=p2Target;}
if(window.__P3_QA__){window.__P3_QA__.unit=p2Unit;window.__P3_QA__.target=p2Target;}
if(window.__P2_ENABLE_QA__)window.__NL_R03_QA__={stages:NLR03_STAGE_CONTENT.map((stage,index)=>({number:25+index,name:stage[0]})),branches:NLR03_BRANCHES,branchFor:nlr03BranchFor,branchOptions:nlr03BranchOptions,evolve:nlr03Evolve,unit:p2Unit,skill:p2Skill,target:p2Target,getEncounter:()=>battle?.r03Encounter||null};
// === end NL-R03 ===
