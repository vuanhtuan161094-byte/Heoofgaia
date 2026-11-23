// === NL-R03 — original troop lineages and tactical challenge encounters ===
// All branch effects, costs and encounter tuning are project-authored simulations.
const NLR03_BRANCHES={};
for(const record of NL_GAME_DATA.evolution.branches){
 const category=record.category;
 if(!NLR03_BRANCHES[category])NLR03_BRANCHES[category]=[];
 NLR03_BRANCHES[category].push({
  id:record.id,name:record.name,desc:record.description,stats:record.statMultipliers||{},
  troop:record.troop,combatType:record.combatType,pierce:record.pierce,speed:record.speed,crit:record.crit,
  skillMult:record.skillMultiplier,skillPattern:record.skillPattern,doublePatternMultiplier:record.doublePatternMultiplier,
  burnChance:record.burnChance,drainMorale:record.drainMorale,healMult:record.healMultiplier,
  drumBonus:record.drumBonus,targetBack:record.targetBack
 });
}
const NLR03_BRANCH_BY_ID=Object.fromEntries(Object.entries(NLR03_BRANCHES).flatMap(([type,branches])=>branches.map(branch=>[branch.id,{...branch,type}])));
const NLR03_EVOLUTION_COST=Object.fromEntries(Object.entries(NL_GAME_DATA.evolution.cost).filter(([,value])=>Number.isFinite(value)));
const NLR03_STAGE_CONTENT=NL_GAME_DATA.campaign.encounters.filter(item=>item.stage>=25).map(encounter=>{
 const map=NL_GAME_DATA.campaign.maps.find(item=>item.id===encounter.mapId),npc=NL_GAME_DATA.campaign.npcs.find(item=>item.id===encounter.npcId);
 return [map.name,npc.name,encounter.tactic,encounter.rewards.silver,encounter.rewards.grain,encounter.rewards.prestige];
});
STAGES.push(...NLR03_STAGE_CONTENT);

// Existing owner-authored content and IDs are kept; only the catalog authority
// moves to the validated JSON pack. Wiki slot taxonomy remains a separate source.
for(const id of Object.keys(EQUIPMENT))delete EQUIPMENT[id];
for(const record of NL_GAME_DATA.equipment.projectItems){
 EQUIPMENT[record.id]={name:record.name,icon:record.icon,slot:record.slot,rarity:record.rarity,...record.stats,cost:{...record.cost},provenance:record.provenance};
}
for(const id of Object.keys(TECHNOLOGY))delete TECHNOLOGY[id];
for(const record of NL_GAME_DATA.research.catalog){
 TECHNOLOGY[record.id]={name:record.name,icon:record.icon,desc:record.description,max:record.maxLevel,effects:record.effects,provenance:record.provenance};
 if(!Number.isFinite(game.technology?.[record.id]))game.technology[record.id]=0;
}
const NLR03_ITEM_BY_ID=Object.fromEntries(NL_GAME_DATA.equipment.projectItems.map(item=>[item.id,item]));
const NLR03_RESEARCH=NL_GAME_DATA.research;
const NLR03_REINFORCEMENT=NL_GAME_DATA.equipment.progression.reinforcement;
function nlTechValue(target){
 let value=0;
 for(const [id,technology] of Object.entries(TECHNOLOGY)){
  const level=Math.max(0,Number(game.technology?.[id])||0);
  for(const effect of technology.effects||[])if(effect.target===target)value+=level*effect.valuePerLevel;
 }
 return value;
}
function nlr03TechCost(id){
 const level=Math.max(0,Math.floor(Number(game.technology?.[id])||0)),next=level+1;
 const formulas=NLR03_RESEARCH.progression.cost,result={};
 for(const [resource,formula] of Object.entries(formulas)){
  result[resource]=resource==='prestige'&&formula.freeFirstLevel&&next===1?0:Math.round(formula.base*Math.pow(next,formula.nextLevelExponent));
 }
 return result;
}
shopCost=function(id){const item=NLR03_ITEM_BY_ID[id];return item?{...item.cost}:{};};
equipmentStats=function(id){
 const result={atk:0,def:0,int:0,hp:0,tdef:0,mdef:0,weaponAtk:0,horseAtk:0},step=NLR03_REINFORCEMENT.statBonusPerLevel;
 for(const uid of Object.values(game.gear[id]||{})){
  const instance=game.items.find(item=>item.uid===uid),base=instance&&EQUIPMENT[instance.base];if(!base)continue;
  const factor=1+(Math.max(1,Number(instance.lv)||1)-1)*step;
  for(const key of ['atk','def','int','hp','tdef','mdef'])result[key]+=Math.round((base[key]||0)*factor);
  if(base.slot==='weapon')result.weaponAtk+=Math.round((base.atk||0)*factor);
  if(base.slot==='horse')result.horseAtk+=Math.round((base.atk||0)*factor);
 }
 return result;
};
techCost=nlr03TechCost;
research=function(id){
 const technology=TECHNOLOGY[id];if(!technology)return;
 const level=game.technology[id],next=level+1,gate=NLR03_RESEARCH.progression.academyLevelsPerTechLevel;
 if(level>=technology.max)return toast('Đã đạt cấp tối đa.');
 if(game.buildings.academy<Math.ceil(next/gate))return toast('Cần nâng Quân Sư Phủ để nghiên cứu tiếp.');
 const cost=nlr03TechCost(id);if(!payment(cost))return toast('Thiếu bạc, sắt hoặc uy danh.');
 game.technology[id]=next;game.techSpent+=cost.prestige||0;countTask('research');
 log(`Nghiên cứu ${technology.name} cấp ${next}.`);save();toast('Hoàn tất khoa kỹ: '+technology.name);render();
};
reinforce=function(uid){
 const item=game.items.find(entry=>entry.uid===uid),rule=NLR03_REINFORCEMENT,costRule=rule.cost;if(!item)return;
 if(item.lv>=rule.maxLevel)return toast(`Trang bị đã tối đa +${rule.maxLevel}.`);
 const cost={silver:Math.round(costRule.silverBase*Math.pow(item.lv,costRule.silverLevelExponent)),iron:Math.round(costRule.ironBase*Math.pow(item.lv,costRule.ironLevelExponent))};
 if(!payment(cost))return toast('Không đủ bạc hoặc sắt để cường hóa.');
 item.lv++;log(`Cường hóa ${EQUIPMENT[item.base].name} lên +${item.lv}.`);save();toast('Cường hóa thành công +'+item.lv);render();
};
renderTechnology=function(){
 const gate=NLR03_RESEARCH.progression.academyLevelsPerTechLevel;
 const cards=Object.entries(TECHNOLOGY).map(([id,technology])=>{
  const level=game.technology[id]||0,next=level+1,cost=nlr03TechCost(id),max=level>=technology.max,locked=game.buildings.academy<Math.ceil(next/gate);
  return `<div class="panel feature-card" data-research-card="${id}"><div class="feature-title"><span class="feature-icon">${technology.icon}</span><div><h3>${esc(technology.name)}</h3><div class="tiny">Cấp ${level}/${technology.max}</div></div></div><p>${esc(technology.desc)}</p><div class="progress"><div style="width:${Math.min(100,level/technology.max*100)}%"></div></div><div class="feature-footer"><span class="cost">${earnedText(cost)}</span><button class="gold-button" data-research="${id}" ${max||locked?'disabled':''}>${max?'Tối đa':locked?'Cần học viện':'Nghiên cứu'}</button></div></div>`;
 }).join('');
 return head('Binh pháp kỳ mưu','Quân Sư Phủ · Khoa Kỹ','Nghiên cứu đọc từ catalog dự án; mọi hệ số là SIMULATED.',`<span class="pill">Học viện cấp ${game.buildings.academy}</span>`)+`<div class="panel mini-box" style="margin-bottom:16px"><h3>📚 Nghiên cứu chiến lược</h3><div class="tiny">Mức tối đa, chi phí, điều kiện mở và hiệu ứng được điều khiển bởi data pack. Cấp Quân Sư Phủ giới hạn nghiên cứu.</div></div><div class="feature-grid">${cards}</div>`;
};
train=function(id){
 const data=NL_GAME_DATA.heroes.training,hero=game.hero[id];if(!hero)return;
 if(game.silver<data.silverCost)return toast(`Không đủ ${fmt(data.silverCost)} bạc.`);
 if(hero.level>=data.maxLevel)return toast('Tướng đạt cấp tối đa.');
 game.silver-=data.silverCost;hero.xp+=data.baseXp+game.buildings.academy*data.academyXpPerLevel;let gained=0;
 while(hero.xp>=hero.level*data.xpRequiredPerHeroLevel&&hero.level<data.maxLevel){hero.xp-=hero.level*data.xpRequiredPerHeroLevel;hero.level++;gained++;}
 countTask('train');log(`Huấn luyện ${HEROES[id].name}${gained?` lên cấp ${hero.level}`:''}.`);save();
 toast(gained?`${HEROES[id].name} đã lên cấp ${hero.level}!`:'Đã tăng kinh nghiệm võ tướng.');render();
};

function nlr03Hydrate(){
 if(!game.nlr03||typeof game.nlr03!=='object'||Array.isArray(game.nlr03))game.nlr03={schema:1,evolutions:{}};
 if(!game.technology||typeof game.technology!=='object'||Array.isArray(game.technology))game.technology={};
 for(const id of Object.keys(TECHNOLOGY))if(!Number.isFinite(game.technology[id]))game.technology[id]=0;
 const prior=game.nlr03.evolutions&&typeof game.nlr03.evolutions==='object'&&!Array.isArray(game.nlr03.evolutions)?game.nlr03.evolutions:{};
 const evolutions={};
 for(const [hero,id] of Object.entries(prior)){
  const branch=NLR03_BRANCH_BY_ID[id],heroType=HEROES[hero]?.type;
  if(game.roster.includes(hero)&&game.hero[hero]&&branch&&(branch.type===heroType||(branch.type==='spear'&&heroType==='infantry')))evolutions[hero]=id;
 }
 game.nlr03={schema:1,evolutions};
}
const nlr03PriorFresh=fresh;
fresh=function(){const value=nlr03PriorFresh();value.nlr03={schema:1,evolutions:{}};return value;};
const nlr03PriorHydrate=hydrateExtension;
hydrateExtension=function(){nlr03PriorHydrate();nlr03Hydrate();save();};
nlr03Hydrate();

function nlr03BranchFor(id){return NLR03_BRANCH_BY_ID[game.nlr03?.evolutions?.[id]]||null;}
function nlr03BranchOptions(id){const type=HEROES[id]?.type;return [...(NLR03_BRANCHES[type]||[]),...(type==='infantry'?(NLR03_BRANCHES.spear||[]):[])];}
function nlr03Evolve(id,branchId){
 const hero=HEROES[id],owned=game.roster.includes(id)&&!!game.hero[id],branch=NLR03_BRANCH_BY_ID[branchId];
 if(battle||!owned||!branch||!(branch.type===hero?.type||(branch.type==='spear'&&hero?.type==='infantry')))return false;
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
 return `<section class="panel mini-box nlr03-panel" data-r03-lineage="1"><h3>🌿 R03 · Ngả Rẽ Binh Chủng</h3><p class="tiny">Chọn nhánh Bộ, Thương, Kỵ, Cung, Quan Văn hoặc Hỗ trợ. Lựa chọn làm đổi chỉ số, chiến pháp hoặc binh chủng trong trận; chuyển nhánh tốn ${fmt(NLR03_EVOLUTION_COST.silver)} bạc, ${fmt(NLR03_EVOLUTION_COST.grain)} lương và ${fmt(NLR03_EVOLUTION_COST.iron)} sắt. Cần Doanh Trại cấp 2.</p>${rows}<div class="nlr03-foot">Các nhánh và hệ số là thiết kế mô phỏng của Mưu Định Tam Quốc; Thương binh khắc chế Kỵ binh. Không sao chép công thức độc quyền.</div></section>`;
}
const nlr03PriorBarracks=renderBarracks;
renderBarracks=function(){return nlr03PriorBarracks()+nlr03LineagePanel();};
document.addEventListener('click',ev=>{
 const button=ev.target.closest('[data-r03-evolve]');if(!button||button.disabled)return;
 const row=button.closest('[data-r03-row]'),select=row?.querySelector('[data-r03-select]');
 if(select)nlr03Evolve(button.dataset.r03Evolve,select.value);
});

const nlr03PriorCampaignRender=renderCampaign;
renderCampaign=function(){
 const html=nlr03PriorCampaignRender();
 if(game.cleared.length<STAGES.length)return html;
 return html+`<section class="panel mini-box" data-nl-campaign-ending="1" role="status"><h2>🏆 Chiến dịch Ngọa Long hoàn tất</h2><p>Thành chủ đã vượt đủ 28 cửa ải thuộc 8 chương. Chiến báo cuối và các phần thưởng vẫn nằm trong sổ thông quan; xem lại replay không quyết toán lại.</p><p class="tiny">Kết thúc V1.0 · dữ liệu cân bằng và phần chưa có nguồn được đánh dấu SIMULATED.</p></section>`;
};
const nlr03PriorFinishBattle=finishBattle;
finishBattle=function(){
 nlr03PriorFinishBattle();
 if(battle?.mode==='campaign'&&battle.won&&game.cleared.length>=STAGES.length&&!battle.replay){
  const box=document.querySelector('#battle-result .result-box');
  if(box&&!box.querySelector('[data-nl-campaign-ending]'))box.insertAdjacentHTML('afterbegin','<section class="nl-campaign-ending" data-nl-campaign-ending="1"><h2>🏆 Hoàn tất chiến dịch Ngọa Long</h2><p>28/28 cửa ải · 8/8 chương</p></section>');
 }
};
if(window.__P2_ENABLE_QA__&&window.__P2_QA__)window.__P2_QA__.finishBattle=finishBattle;

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
 const flankRule=battle?.r03Encounter?.mechanics?.some(rule=>rule.type==='target-back-row'&&rule.target==='enemy'&&rule.troopId===attacker?.troop);
 if(flankRule&&attacker?.team==='e'&&mode==='front')mode='back';
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
  else if(branch.doublePatternMultiplier&&descriptor.pattern==='double')descriptor.mult*=branch.doublePatternMultiplier;
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
 p2Morale=function(unit,delta){return prior(unit,[25,34,45,55].includes(delta)?delta+branch.drumBonus:delta);};
 try{return nlr03PriorPerform(actor);}finally{p2Morale=prior;}
};

const NLR03_ENCOUNTERS=Object.fromEntries(NL_GAME_DATA.campaign.encounters.filter(item=>item.stage>=25).map(encounter=>{
 const map=NL_GAME_DATA.campaign.maps.find(item=>item.id===encounter.mapId),npc=NL_GAME_DATA.campaign.npcs.find(item=>item.id===encounter.npcId);
 return [encounter.stage,{id:encounter.id,name:map.name,rule:encounter.tactic,types:npc.units.map(unit=>unit.troopId),mechanics:encounter.mechanics||[]}];
}));
const nlr03PriorBegin=beginBattle;
beginBattle=function(stage,mode='campaign'){
 nlr03PriorBegin(stage,mode);
 const encounter=mode==='campaign'?NLR03_ENCOUNTERS[stage]:null;
 if(!battle||!encounter)return;
 battle.r03Encounter={id:encounter.id,name:encounter.name,rule:encounter.rule,mechanics:structuredClone(encounter.mechanics)};
 battle.e.forEach((unit,index)=>{
  const type=encounter.types[index]||unit.type;unit.type=type==='drum'?'support':type;unit.troop=type;
  unit.skill=type==='drum'?'Cổ Vũ':(NL_GAME_DATA.skills.enemyByCombatType[type]?.tag||unit.skill);
  unit.icon=({infantry:'🛡️',cavalry:'🐎',archer:'🏹',strategist:'🪶',support:'📜',drum:'🥁'})[type]||unit.icon;
  if(index===battle.e.length-1)unit.name=STAGES[stage-1][1];
 });
 for(const rule of encounter.mechanics){
  if(rule.type==='initial-status')for(const index of rule.unitIndices||[]){const unit=battle.e[index];if(unit)p2Status(unit,rule.statusId,rule.duration);}
  if(rule.type==='start-morale')for(const unit of battle.e)if(rule.target==='enemy'&&unit.troop===rule.troopId)unit.morale=rule.value;
  if(rule.type==='stat-adjustment')for(const unit of battle.e)if(rule.target==='enemy'&&unit.troop===rule.troopId&&Number.isFinite(unit[rule.stat]))unit[rule.stat]+=rule.add;
 }
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
if(window.__P2_ENABLE_QA__)window.__NL_R03_QA__={stages:NLR03_STAGE_CONTENT.map((stage,index)=>({number:25+index,name:stage[0]})),branches:NLR03_BRANCHES,branchFor:nlr03BranchFor,branchOptions:nlr03BranchOptions,evolve:nlr03Evolve,unit:p2Unit,skill:p2Skill,target:p2Target,getEncounter:()=>battle?.r03Encounter||null,catalog:{heroes:NL_GAME_DATA.heroes.projectRoster,runtimeHeroes:Object.fromEntries(Object.entries(HEROES).map(([id,hero])=>[id,{...hero}])),heroSkills:NL_GAME_DATA.skills.heroById,runtimeHeroSkills:Object.fromEntries(Object.entries(P2_SKILLS).map(([id,skill])=>[id,{...skill}])),equipment:NL_GAME_DATA.equipment.projectItems,research:NLR03_RESEARCH.catalog,training:NL_GAME_DATA.heroes.training},equipmentStats,shopCost,techCost,techValue:nlTechValue,research,reinforce,train,tick,renderBarracks};
// === end NL-R03 ===
