#!/usr/bin/env python3
"""Deterministic Ngọa Long-first UI build step for the canonical offline index.html.

The canonical distributable remains one generated index.html. The historical
5.5 MB base includes many embedded provenance-checked atlases: this build step
patches it in-place before QA and release, preserving all game/save logic.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from ngoalong_data import load_pack, runtime_pack
from nl_classic_phase_b2_native import apply_b2_native

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = "NL-REBUILD-01"
OLD_TITLE = "<title>Mưu Định Tam Quốc — V0.6 P4.1 Mỹ Thuật</title>"
NEW_TITLE = "<title>Mưu Định Tam Quốc — Chiến thuật trận hình</title>"
OLD_NAV = "const NAV=[['city','🏯','Thành Trì'],['heroes','⚔️','Võ Tướng'],['formation','🛡️','Bày Trận'],['campaign','🗺️','Chinh Phạt'],['barracks','🏹','Doanh Trại'],['journal','📜','Nhật Ký']];"
NEW_NAV = "const NAV=[['city','🏯','Thành Trì'],['formation','🛡️','Bày Trận'],['campaign','🗺️','Chinh Phạt'],['heroes','⚔️','Võ Tướng'],['barracks','🏹','Doanh Trại'],['journal','📜','Nhật Ký']];"
BOOT = "setInterval(tick,1000);setInterval(save,15000);window.addEventListener('beforeunload',save);tick();render();"

CSS = """
/* NL-REBUILD-01 — Ngọa Long-first command hub */
.nl-command{overflow:hidden;border:1px solid #b59762;border-radius:14px;background:linear-gradient(125deg,#1c2929,#152027 55%,#2b2720);box-shadow:0 12px 35px #05090b78;margin-bottom:18px;padding:20px;color:#f5e7ca}
.nl-command .nl-kicker{font-size:10px;letter-spacing:2.4px;color:#e2bc7e;font-weight:700}
.nl-command h2{font:700 clamp(20px,2.3vw,30px) Georgia,"Times New Roman",serif;color:#f4deaa;margin:7px 0 9px}
.nl-command p{font-size:12px;line-height:1.75;color:#cad1c6;max-width:850px;margin:0 0 12px}
.nl-command .nl-content{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(270px,.95fr);gap:17px;align-items:stretch}
.nl-command .nl-actions{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}.nl-command .nl-actions button{font-size:12px;padding:10px 13px;border-radius:6px}
.nl-command .nl-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
.nl-command .nl-fact{padding:11px 8px;background:#101c21b8;border:1px solid #60736b88;border-radius:7px;text-align:center}
.nl-command .nl-fact b{display:block;font-size:19px;color:#f2d192}.nl-command .nl-fact small{display:block;margin-top:3px;font-size:10px;color:#c3c9bd}
.nl-command .nl-panel{padding:13px;border-radius:9px;border:1px solid #60736b;background:#101b20ab}.nl-command .nl-panel h3{margin:0 0 11px;font-size:14px;color:#f0d8a9}
.nl-command .nl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(49px,auto));gap:5px}
.nl-command .nl-slot{border:1px solid #5d6d62;min-height:47px;border-radius:5px;background:#1a2d2c;display:grid;place-items:center;text-align:center;padding:4px;line-height:1.25}
.nl-command .nl-slot.occupied{border-color:#c69c5f;background:linear-gradient(150deg,#443c2b,#283536)}
.nl-command .nl-slot b{font-size:11px;color:#f7e1b8}.nl-command .nl-slot small{font-size:9px;color:#9caaa3}
.nl-command .nl-slot.empty{opacity:.48}.nl-command .nl-lines{font-size:11px;color:#cad3c6;line-height:1.65;margin-top:10px}
.nl-command .nl-footnote{font-size:10px;color:#a6b5aa;margin-top:8px;line-height:1.5}
.nl-command .nl-research-rule{padding:9px 10px;border-left:3px solid #d1a968;background:#111d20;color:#d4d5c8;font-size:11px;line-height:1.55;margin:9px 0}
.nl-command .nl-class-toggle{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #42564e;font-size:11px}
.nl-ai-reason{color:#e5ca91;font-size:10px;margin-top:4px}
/* Encounter reconnaissance: renders the actual selected NPC formation from the validated pack. */
.nl-chapter-route{border:1px solid #6b785e;border-radius:9px;background:#172821;color:#e7e7d6;padding:12px;margin:12px 0}
.nl-chapter-route h3{font-size:14px;margin:0 0 7px;color:#eed5a4}
.nl-chapter-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:6px}
.nl-chapter-step{border:1px solid #485a4d;border-radius:5px;background:#1b3028;padding:8px;min-width:0}
.nl-chapter-step b{display:block;font-size:11px;color:#f5dfb3}
.nl-chapter-step small{font-size:10px;color:#b9c8b9}
.nl-chapter-step.current{border-color:#e1be7b}
.nl-chapter-step.locked{opacity:.7}
.nl-enemy-intel{display:grid;grid-template-columns:minmax(0,1fr) minmax(185px,.8fr);gap:12px;border:1px solid #6e6050;border-radius:9px;background:#151e23;color:#e5e4d5;padding:12px;margin:12px 0}
.nl-enemy-intel h3{margin:0 0 7px;font-size:15px;color:#f4d6a0}
.nl-enemy-intel p{margin:6px 0;font-size:12px;line-height:1.5;color:#cad1c9}
.nl-intel-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
.nl-intel-slot{min-width:0;min-height:43px;border:1px solid #374b49;border-radius:5px;background:#15292b;padding:4px;display:flex;flex-direction:column;justify-content:center;text-align:center}
.nl-intel-slot b{font-size:11px;color:#fae0aa;overflow-wrap:anywhere}
.nl-intel-slot small{font-size:10px;color:#b9cfc3}
.nl-intel-slot.empty{opacity:.35}
@media(max-width:620px){.nl-enemy-intel{grid-template-columns:1fr}}
@media(max-width:850px){.nl-command .nl-content{grid-template-columns:1fr}.nl-command{padding:15px}}
@media(max-width:420px){.nl-command .nl-facts{gap:5px}.nl-command .nl-fact b{font-size:16px}.nl-command .nl-actions button{flex:1 1 43%}}
.nl207-recruit{display:flex;gap:8px;align-items:stretch;max-width:100%}.nl207-recruit select{flex:1 1 auto;min-width:0;max-width:100%;padding:8px;font-size:12px}.nl207-recruit button{flex:0 0 auto}.nl-hero207-cta{font-size:11px;color:#dcc59b;margin-top:8px}@media(max-width:480px){.nl207-recruit{flex-direction:column}.nl207-recruit button{width:100%}}
/* end NL-REBUILD-01 CSS */
"""

# This code is inserted INSIDE the existing game closure, after all gameplay
# upgrades/overrides and immediately before the existing final render().
PORTAL = r"""
// === NL-REBUILD-01: first-class 3x3 strategy dashboard ===
const NL_GAME_DATA = __NL_DATA_PACK__;
// Keep the complete original project roster in the validated data pack; this is not a Wiki hero import.
NL_GAME_DATA.heroes.projectRoster.forEach(hero=>{const {id,provenance,fieldProvenance,...profile}=hero;HEROES[id]={...HEROES[id],...profile};});
// Bind the original project's generic combat descriptors from JSON; separate expansion skills remain intact.
for(const [id,skill] of Object.entries(NL_GAME_DATA.skills.heroById)){const {provenance,...descriptor}=skill;P2_SKILLS[id]=descriptor;}
// Existing project IDs stay compatible, while their editable tactical catalog now lives in JSON.
Object.keys(FORMATIONS).forEach(id=>delete FORMATIONS[id]);
NL_GAME_DATA.formations.families.forEach(family=>{FORMATIONS[family.id]={name:family.name,desc:family.description,...family.combatModifiers};});
P3_VARIANTS.splice(0,P3_VARIANTS.length,...NL_GAME_DATA.formations.plans.map(plan=>({key:plan.key,name:plan.name,style:plan.style,slots:[...plan.slots],desc:plan.description})));
P3_PRESETS.splice(0,P3_PRESETS.length,...NL_GAME_DATA.formations.families.flatMap(family=>NL_GAME_DATA.formations.plans.map(plan=>({id:`${family.id}-${plan.key}`,formation:family.id,title:`${family.name} · ${plan.name}`,slots:[...plan.slots],style:plan.style,desc:plan.description}))));
if(window.__P3_QA__)window.__P3_QA__.presets=P3_PRESETS.map(item=>({...item,slots:[...item.slots]}));
function nlRebuildHub(){
  const current=Math.min(STAGES.length,game.cleared.length+1);
  const stage=STAGES[current-1],deployed=game.slots.filter(Boolean);
  const preset=typeof P3_PRESETS!=='undefined'?P3_PRESETS.find(p=>p.id===game.p3PresetId):null;
  const formation=FORMATIONS[game.formation];
  const slots=game.slots.map((id,i)=>`<div class="nl-slot ${id?'occupied':'empty'}" aria-label="Ô trận ${i+1}: ${id?(HEROES[id]?.name||id):'trống'}">${id?`<b>${esc(HEROES[id]?.name||id)}</b><small>${game.troopModes[id]==='spear'?'Thương binh':esc(HEROES[id]?.role||'Võ tướng')}</small>`:'<small>Ô trống</small>'}</div>`).join('');
  return `<section class="nl-command" data-nl-command="1"><div class="nl-kicker">TRUNG QUÂN · QUYẾT SÁCH</div><h2>Quân Cơ Phủ — Bày trận định thiên hạ</h2><p>Mưu Định Tam Quốc dùng 3×3, tối đa năm tướng, binh chủng và sĩ khí để tạo quyết định chiến thuật riêng. Các hệ số combat là mô phỏng của dự án; trận thắng mở ải và nhận thưởng một lần.</p><div class="nl-content"><div><div class="nl-facts"><div class="nl-fact"><b>${deployed.length}/5</b><small>Võ tướng xuất trận</small></div><div class="nl-fact"><b>${game.cleared.length}/${STAGES.length}</b><small>Ải hoàn thành</small></div><div class="nl-fact"><b>${esc(formation.name)}</b><small>Thế trận hiện tại</small></div></div><div class="nl-actions"><button class="gold-button" data-nl-route="formation">🛡️ Bày trận 3×3</button><button class="dark-button" data-nl-route="heroes">👑 Võ tướng</button><button class="dark-button" data-nl-route="barracks">🏹 Doanh Trại</button><button class="dark-button" data-nl-route="equipment">🗡️ Trang Bị</button><button class="dark-button" data-nl-route="tech">📜 Khoa kỹ</button><button class="dark-button" data-nl-route="campaign">🗺️ Phó bản</button></div><div class="nl-panel"><h3>⚔️ Phó bản tiếp theo — ${esc(stage[0])}</h3><p>Địch tướng: ${esc(stage[1])} · Ải ${current} · Chiến phí: ${fmt(100+current*25)} lương.</p><div class="nl-research-rule">${esc(stage.nlTactic||'Chọn trận hình và theo dõi sĩ khí trước khi xuất chiến.')}</div><button class="gold-button" data-battle="${current}" ${deployed.length===0?'disabled':''}>Xuất chiến · Sĩ khí & Chiến pháp</button><div class="nl-footnote">Thua trận không nhận thưởng; replay đọc báo cáo, không quyết toán lần hai.</div></div></div><div class="nl-panel"><h3>🛡️ Trận đồ 3×3 · Tuyến trước ở bên phải</h3><div class="nl-grid">${slots}</div><div class="nl-lines"><b>Phương án:</b> ${esc(preset?.title||formation.name)}<br><b>Sĩ khí:</b> đòn đánh, trống và chiến pháp có sổ sự kiện.<br><b>Khắc chế:</b> Bộ → Thương → Kỵ → Bộ; Cung đánh xa, Quan Văn hỗ trợ.</div><div class="nl-footnote">6 trận pháp / 24 phương án; các ID Save cũ vẫn được giữ.</div></div></div></section>`;
}
const nlPreviousCityRenderer=renderCity;
renderCity=function(){return nlRebuildHub()+nlPreviousCityRenderer();};
document.addEventListener('click',ev=>{
  const action=ev.target.closest('[data-nl-route]');
  if(!action||action.disabled)return;
  tab=action.dataset.nlRoute;
  render();
});

// === NL-R02: source-backed taxonomy + original deterministic combat policy ===
const NL_R02_COUNTERS=Object.fromEntries(NL_GAME_DATA.troops.counterCycle.map(edge=>[edge.attacker,edge.defender]));
const NL_R02_LEGACY_COUNTERS={...P2_COUNTERS};
P2_TROOPS.spear=NL_GAME_DATA.troops.profiles.find(item=>item.id==='spear')?.wikiGroup||'Thương binh';
const nlLegacyCounterFactor=p3CounterFactor;
p3CounterFactor=function(attacker,defender){
  if(battle?.mode==='cltq')return nlLegacyCounterFactor(attacker,defender);
  const edge=NL_GAME_DATA.troops.counterCycle.find(item=>item.attacker===attacker&&item.defender===defender);
  if(edge)return edge.multiplier;
  const reverse=NL_GAME_DATA.troops.counterCycle.find(item=>item.attacker===defender&&item.defender===attacker);
  if(reverse)return reverse.disadvantageMultiplier;
  return 1;
};
const nlSimaSkill=NL_GAME_DATA.skills.overrides['campaign-sima-seal'];
const nlBaseSkill=p2Skill;
p2Skill=function(unit){
  if(battle?.mode==='campaign'&&unit?.skillId&&NL_GAME_DATA.skills.overrides[unit.skillId])return NL_GAME_DATA.skills.overrides[unit.skillId];
  if(battle?.mode!=='cltq'&&unit?.team==='e')return NL_GAME_DATA.skills.enemyByCombatType[unit.type]||nlBaseSkill(unit);
  return nlBaseSkill(unit);
};
const nlBaseMorale=p2Morale;
p2Morale=function(unit,delta){
  if(delta>0&&unit){const factor=p2StatusFactor(unit,'moraleGainMultiplier');if(factor===0)return unit.morale||0;delta*=factor;}
  return nlBaseMorale(unit,delta);
};
const nlBaseHit=p2Hit;
p2Hit=function(attacker,target,kind,mult=1,opts={}){
  if(battle?.mode==='cltq')return nlBaseHit(attacker,target,kind,mult,opts);
  for(const key of Object.keys(P2_COUNTERS))delete P2_COUNTERS[key];
  Object.assign(P2_COUNTERS,NL_R02_COUNTERS);
  try{return nlBaseHit(attacker,target,kind,mult,opts);}
  finally{for(const key of Object.keys(P2_COUNTERS))delete P2_COUNTERS[key];Object.assign(P2_COUNTERS,NL_R02_LEGACY_COUNTERS);}
};

const NL_R02_ENCOUNTERS=NL_GAME_DATA.campaign.encounters.filter(item=>item.stage<=5).map(encounter=>({
  tactic:encounter.tactic,
  troops:NL_GAME_DATA.campaign.npcs.find(npc=>npc.id===encounter.npcId).units.map(unit=>unit.troopId),
  enemyPower:encounter.enemyPower
}));
NL_GAME_DATA.campaign.encounters.forEach(encounter=>{
  const map=NL_GAME_DATA.campaign.maps.find(item=>item.id===encounter.mapId);
  const npc=NL_GAME_DATA.campaign.npcs.find(item=>item.id===encounter.npcId);
  const stageData=STAGES[encounter.stage-1];if(!stageData||!map||!npc)return;
  stageData[0]=map.name;stageData[1]=npc.name;stageData[2]=encounter.tactic||map.synopsis||stageData[2];
  stageData[3]=encounter.rewards.silver;stageData[4]=encounter.rewards.grain;stageData[5]=encounter.rewards.prestige;
  stageData.nlTactic=encounter.tactic||map.synopsis||'';
});
// Scouting uses the same NPC/unit selection and deployment order as campaign beginBattle.
// The preview is project-authored encounter data, not a copy of the Mobile Wiki roster.
function nlEnemyIntel(stage){
  const encounter=NL_GAME_DATA.campaign.encounters.find(item=>item.stage===stage);
  const npc=NL_GAME_DATA.campaign.npcs.find(item=>item.id===encounter?.npcId);
  if(!npc||!encounter)return '';
  const number=Math.min(5,3+Math.floor((stage-1)/3));
  const deployed=Array.from({length:number},(_,i)=>npc.units[i===number-1?4:i]).filter(Boolean);
  const positions=encounter.deploymentSlots||[];
  const slots=new Map(deployed.map((unit,i)=>[positions[i]??unit.formationSlot,unit]));
  const troopName={infantry:'Bộ binh',spear:'Thương binh',cavalry:'Kỵ binh',archer:'Cung binh',strategist:'Quan Văn',support:'Hỗ trợ',drum:'Trống trận'};
  const grid=Array.from({length:9},(_,slot)=>{
    const unit=slots.get(slot),label=unit?troopName[unit.troopId]||unit.troopId:'Trống';
    return `<div class="nl-intel-slot ${unit?'':'empty'}" data-nl-intel-slot="${slot}" aria-label="Ô địch ${slot+1}: ${esc(label)}">${unit?`<b>${esc(label)}</b><small>Ô ${slot+1}</small>`:'<small>—</small>'}</div>`;
  }).join('');
  return `<section class="nl-enemy-intel" data-nl-enemy-intel="${stage}" aria-label="Trinh sát đội hình địch"><div><h3>🔎 Trinh sát quân địch</h3><p><b>${esc(npc.name)}</b> · ${deployed.length} đơn vị tham chiến</p><p>${esc(encounter.tactic||'Quan sát khắc chế và vị trí hàng trước, hàng sau.')}</p><p><small>Đội hình và loại quân do dự án mô phỏng; cấp, quân số, chỉ số Wiki chưa xác nhận sẽ không được tự điền.</small></p></div><div class="nl-intel-grid" data-nl-intel-grid="1">${grid}</div></section>`;
}
// Authored multi-NPC chapters preserve existing combat, rewards, stage IDs and Save.
function nlChapterRoute(stage){
  const all=NL_GAME_DATA.campaign.encounters;
  const chapter=NL_GAME_DATA.campaign.chapters.find(group=>group.encounterIds.some(id=>all.find(e=>e.id===id)?.stage===stage));
  if(!chapter)return '';
  const steps=chapter.encounterIds.map(id=>{
    const encounter=all.find(e=>e.id===id),npc=NL_GAME_DATA.campaign.npcs.find(n=>n.id===encounter.npcId);
    const done=game.cleared.includes(encounter.stage),current=encounter.stage===stage,locked=!done&&encounter.stage>game.cleared.length+1;
    const boss=encounter.boss===true;
    return `<div class="nl-chapter-step ${current?'current':''} ${locked?'locked':''}" data-nl-chapter-step="${encounter.stage}" ${boss?'data-nl-boss="1"':''}><b>${done?'✓ ':''}Cửa ${encounter.stage}: ${esc(npc.name)}${boss?' · 👑 BOSS':''}</b><small>${boss?esc(encounter.bossRule):done?'Đã thắng':locked?'Chưa mở':current?'Đang chọn':'Có thể đánh'}</small></div>`;
  }).join('');
  const count=chapter.encounterIds.filter(id=>game.cleared.includes(all.find(e=>e.id===id).stage)).length;
  return `<section class="nl-chapter-route" data-nl-chapter="${chapter.id}" aria-label="Lộ trình chương chiến dịch"><h3>🗺️ ${esc(chapter.name)} · ${count}/${chapter.encounterIds.length} trận</h3><div class="nl-chapter-steps">${steps}</div></section>`;
}
const nlPrepRenderCampaign=renderCampaign;
renderCampaign=function(){
  let html=nlPrepRenderCampaign();
  const dossier=nlChapterRoute(selectedStage)+nlEnemyIntel(selectedStage);
  const recommendation=NL_GAME_DATA.campaign.encounters.find(item=>item.stage===selectedStage)?.recommendedPreparation;
  if(!recommendation)return html.replace('<button class="gold-button" data-battle=',dossier+'<button class="gold-button" data-battle=');
  const recommendedPreset=NL_GAME_DATA.formations.presets?.find(item=>item.id===recommendation.recommendedPreset)||(()=>{const [familyId,planKey]=String(recommendation.recommendedPreset||'').split('-');const family=NL_GAME_DATA.formations.families.find(item=>item.id===familyId),plan=NL_GAME_DATA.formations.plans.find(item=>item.key===planKey);return family&&plan?{id:recommendation.recommendedPreset,title:`${family.name} · ${plan.name}`} : null;})();
  const presetApplied=recommendedPreset&&game.p3PresetId===recommendedPreset.id;
  const deployed=game.slots.filter(id=>id&&game.hero[id]?.troops>=30);
  const averageLevel=deployed.length?Math.round(deployed.reduce((sum,id)=>sum+(game.hero[id]?.level||1),0)/deployed.length):0;
  const below=deployed.length<recommendation.minimumGenerals||averageLevel<recommendation.averageHeroLevel;
  const hint=`<div class="panel mini-box" data-nl-preparation="${selectedStage}" role="note"><h3>🧭 Chuẩn bị trước cửa ải</h3><p class="tiny">Mốc thử nghiệm của Alpha: ${recommendation.minimumGenerals} tướng, cấp trung bình khoảng ${recommendation.averageHeroLevel}. Đây là gợi ý mô phỏng của dự án, không phải yêu cầu bắt buộc.</p>${recommendedPreset?`<p class="tiny" data-nl-recommended-preset="${recommendedPreset.id}">Đội hình gợi ý đã kiểm chứng: <b>${recommendedPreset.title}</b>.</p><button class="dark-button" data-p3-preset="${recommendedPreset.id}" data-nl-apply-recommended="${recommendedPreset.id}" ${presetApplied?'disabled':''}>${presetApplied?'✓ Đang dùng đội hình gợi ý':'Áp dụng đội hình gợi ý'}</button>`:''}<div class="line"><span>Đội hiện tại</span><b>${deployed.length}/5 tướng · cấp trung bình ${averageLevel}</b></div>${below?'<p class="tiny" style="color:#f0c97d">Cân nhắc chiêu mộ hoặc huấn luyện thêm trước khi thử cửa ải này.</p>':'<p class="tiny">Đội đã đạt mốc chuẩn bị thử nghiệm.</p>'}</div>`;
  return html.replace('<button class="gold-button" data-battle=',dossier+hint+'<button class="gold-button" data-battle=');
};
const nlBaseUnit=p2Unit;
p2Unit=function(id,team,slot,stage){
  const unit=nlBaseUnit(id,team,slot,stage);
  if(!unit)return unit;
  const encounter=team==='e'&&battle?.mode==='campaign'?NL_GAME_DATA.campaign.encounters.find(item=>item.stage===stage):null;
  const npc=encounter?NL_GAME_DATA.campaign.npcs.find(item=>item.id===encounter.npcId):null;
  const npcUnit=npc?.units.find(item=>item.deploymentIndex===slot);
  if(npcUnit){
    unit.troop=npcUnit.troopId;unit.npcUnitId=npcUnit.id;unit.npcProfileId=npcUnit.profileId;
    if(npcUnit.skillId){unit.skillId=npcUnit.skillId;if(npcUnit.skillKey)unit.skillKey=npcUnit.skillKey;}
    if(npcUnit.skillId&&NL_GAME_DATA.skills.overrides[npcUnit.skillId]?.tag)unit.skill=NL_GAME_DATA.skills.overrides[npcUnit.skillId].tag;
    if(npcUnit.nameOverride)unit.name=npcUnit.nameOverride;
    if(unit.troop==='drum')unit.skill='Cổ Vũ';
  }
  if(team==='p'&&game.troopModes[id]==='spear'&&HEROES[id]?.type==='infantry')unit.troop='spear';
  if(encounter&&encounter.enemyPower!==1){
    for(const key of ['atk','catk','matk','def','tdef','mdef'])unit[key]=Math.max(1,Math.round(unit[key]*encounter.enemyPower));
    unit.hp=unit.maxHp=Math.max(1,Math.round(unit.maxHp*encounter.enemyPower));
  }
  return unit;
};
const nlBaseBeginBattle=beginBattle;
beginBattle=function(stage,mode='campaign'){
  const previous=battle;nlBaseBeginBattle(stage,mode);
  if(!previous&&battle?.mode==='campaign'){
    const config=NL_GAME_DATA.campaign.encounters.find(item=>item.stage===stage);
    if(config?.deploymentSlots)battle.e.forEach((unit,index)=>unit.slot=config.deploymentSlots[index]??unit.slot);
    if(battle.opening)battle.opening.e=structuredClone(battle.e);
  }
};

const nlBaseTarget=p2Target;
p2Target=function(attacker,mode='front'){
  const target=nlBaseTarget(attacker,mode);
  if(!battle||!attacker||!target)return target;
  const opposing=p2CountAlive(attacker.team==='p'?'e':'p');
  const bypass=mode==='back'||attacker.troop==='archer';
  const edge=NL_R02_COUNTERS[attacker.troop]===target.troop?'counter':NL_R02_COUNTERS[target.troop]===attacker.troop?'countered':'neutral';
  const eligible=opposing.filter(unit=>bypass?unit.slot%3===Math.min(...opposing.map(x=>x.slot%3)):unit.slot%3===Math.max(...opposing.map(x=>x.slot%3)));
  const preset=P3_PRESETS.find(item=>item.id===game.p3PresetId)||P3_PRESETS[0];
  const style=attacker.team==='p'?preset.style:['pressure','counter','finish','protect'][battle.stage%4];
  function score(unit){
    if(mode==='back')return {row:-Math.abs(Math.floor(unit.slot/3)-Math.floor(attacker.slot/3)),selection:0};
    const hp=unit.maxHp>0?unit.hp/unit.maxHp:1,counter=p3CounterFactor(attacker.troop,unit.troop),role=unit.troop==='drum'?14:unit.troop==='support'?12:unit.troop==='strategist'?7:0,lane=Math.abs(Math.floor(unit.slot/3)-Math.floor(attacker.slot/3));
    const components={role:role*.45,wounded:(1-hp)*20,counter:(counter-1)*34,lane:-lane*2,variant:0,range:0};
    if(style==='finish')components.variant+=(1-hp)*32;
    if(style==='counter')components.variant+=(counter-1)*78;
    if(style==='pressure')components.variant+=(unit.maxHp<500?4:0)+(unit.troop==='archer'?4:0);
    if(style==='protect')components.variant+=(unit.troop==='drum'||unit.troop==='support'?9:0);
    if(bypass)components.range+=(2-unit.slot%3)*4+(unit.troop==='drum'?8:0);
    return components;
  }
  const candidates=eligible.map(unit=>{const components=score(unit);return {id:unit.id,slot:unit.slot,troop:unit.troop,score:Object.values(components).reduce((sum,value)=>sum+value,0),components};}).sort((a,b)=>b.score-a.score||a.slot-b.slot);
  const decision={round:battle.round,actorTeam:attacker.team,actorSlot:attacker.slot,actor:attacker.id,targetTeam:target.team,targetSlot:target.slot,target:target.id,mode,style,edge,candidates,reason:edge==='counter'?`${attacker.troop} khắc chế ${target.troop}`:edge==='countered'?`${target.troop} khắc chế ${attacker.troop}`:`ưu tiên ${style}, tuyến và trạng thái mục tiêu`};
  if(!Array.isArray(battle.aiDecisionLog))battle.aiDecisionLog=[];
  battle.aiDecisionLog.push(decision);battle.pendingAIDecision=decision;
  return target;
};
const nlBaseApplyFrame=p2ApplyFrame;
p2ApplyFrame=function(event){
  const decision=battle?.pendingAIDecision;
  if(decision&&event.actorTeam===decision.actorTeam&&event.actorSlot===decision.actorSlot){
    event.aiDecision=decision;
    event.description+=` · AI: ${decision.reason}.`;
    battle.pendingAIDecision=null;
  }
  return nlBaseApplyFrame(event);
};

const nlBaseRenderFormation=renderFormation;
renderFormation=function(){
  let html=nlBaseRenderFormation();
  html=html.replace('♟️ P3 · 24 đội hình chiến thuật thực','♟️ P3 · 6 trận pháp / 24 phương án');
  html=html.replace('Bộ &gt; Kỵ &gt; Cung &gt; Bộ; Mưu sĩ ép Bộ.','Bộ &gt; Thương &gt; Kỵ &gt; Bộ; Cung giữ tầm xa, Quan Văn hỗ trợ.');
  const foot=game.roster.filter(id=>HEROES[id]?.type==='infantry').map(id=>`<div class="nl-class-toggle"><span>${HEROES[id].icon} ${esc(HEROES[id].name)} · ${game.troopModes[id]==='spear'?'Thương binh':'Bộ binh'}</span><button class="dark-button" data-nl-spear="${id}" ${battle?'disabled':''}>${game.troopModes[id]==='spear'?'Đổi sang Bộ · 120 bạc / 60 lương':'Đổi sang Thương · 120 bạc / 60 lương'}</button></div>`).join('');
  return html+`<div class="panel mini-box" data-nl-troop-select><h3>Thương binh · lựa chọn quân chủng</h3><p class="tiny">Bộ → Thương → Kỵ → Bộ là khắc chế ghi trong Wiki VNG hiện hành. Chi phí đổi quân 120 bạc / 60 lương là SIMULATED của dự án.</p>${foot||'<p class="tiny">Cần tướng Bộ binh để đổi sang Thương binh.</p>'}</div>`;
};
const nlBaseRenderCampaign=renderCampaign;
renderCampaign=function(){
  return nlBaseRenderCampaign().replace('Lõi P3: Bộ thắng Kỵ · Kỵ thắng Cung · Cung thắng Bộ; cột 3 là tuyến trước; cung ưu tiên hàng sau. Sĩ khí 100 kích hoạt chiến pháp riêng. Trống tăng sĩ khí, bỏ sát thương. Có lưu replay từng lượt.','Bộ → Thương → Kỵ → Bộ. Cung đánh xa; Quan Văn hỗ trợ. Sĩ khí 100 kích hoạt chiến pháp; hiệu ứng khóa quân tâm có thể chặn tăng sĩ khí. 6 trận pháp / 24 phương án, replay đọc sự kiện đã lưu.');
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-nl-spear]');if(!button||button.disabled)return;
  const id=button.dataset.nlSpear;if(!game.hero[id]||HEROES[id]?.type!=='infantry')return;
  const switching=game.troopModes[id]!=='spear';
  if(!payment({silver:120,grain:60}))return toast('Không đủ 120 bạc và 60 lương để đổi quân chủng.');
  if(switching)game.troopModes[id]='spear';else delete game.troopModes[id];
  save();render();
});
if(window.__P2_ENABLE_QA__&&window.__P2_QA__)Object.assign(window.__P2_QA__,{p2Hit,p2Target,perform:p2Perform,morale:p2Morale,status:p2Status,cleanse:p2Cleanse,statusFactor:p2StatusFactor,roundEnd:p2BuffRound,registerStatusSpec:(id,spec)=>{NL_GAME_DATA.statusEffects.effects[id]=spec;},setEncounterPower:(stage,value)=>{const encounter=NL_GAME_DATA.campaign.encounters.find(row=>row.stage===stage);if(encounter)encounter.enemyPower=value;},encounters:NL_R02_ENCOUNTERS.map(item=>({...item,troops:[...item.troops]})),counters:{...NL_R02_COUNTERS},moraleSealSkill:nlSimaSkill.apply,data:structuredClone(NL_GAME_DATA)});
if(window.__P2_ENABLE_QA__&&window.__P3_QA__)Object.assign(window.__P3_QA__,{target:p2Target,counter:p3CounterFactor,unit:p2Unit});
// === end NL-REBUILD-01 ===
"""

def replace_once(source: str, old: str, new: str, what: str) -> str:
    if source.count(old) != 1:
        raise ValueError(f"Cannot uniquely replace {what}: matches={source.count(old)}")
    return source.replace(old, new, 1)

def replace_once_or_same(source: str, old: str, new: str, what: str) -> str:
    if source.count(old) == 1:
        return source.replace(old, new, 1)
    if source.count(old) == 0 and source.count(new) == 1:
        return source
    raise ValueError(f"Cannot uniquely prepare {what}: old={source.count(old)} new={source.count(new)}")

def prepare_combat_data_bindings(source: str) -> str:
    replacements = [
        (
            "const types=['infantry','archer','cavalry','strategist','support'],type=types[(slot+stage)%5],boss=slot===4;",
            "const types=NL_GAME_DATA.troops.combatTypeOrder,type=types[(slot+stage)%5],boss=slot===4;",
            "NPC combat type order",
        ),
        (
            "const scale=stage+(battle?.mode==='tower'?Math.floor(stage*.24):battle?.mode==='arena'?Math.floor(stage*.4):0);",
            "const profile=NL_GAME_DATA.campaign.statProfiles['campaign-npc-scaling-v1'],scale=stage+(battle?.mode==='tower'?Math.floor(stage*profile.modeScale.tower):battle?.mode==='arena'?Math.floor(stage*profile.modeScale.arena):0);",
            "NPC stat scaling profile",
        ),
        (
            "const hp=210+scale*74+(boss?70:slot*12),atk=42+scale*8+(boss?12:slot%3*4),def=18+scale*4+(boss?7:0);",
            "const hp=profile.base.hp+scale*profile.growth.hp+(boss?profile.bossBonus.hp:slot%3*profile.deploymentBonus.hp),atk=profile.base.atk+scale*profile.growth.atk+(boss?profile.bossBonus.atk:slot%3*profile.deploymentBonus.atk),def=profile.base.def+scale*profile.growth.def+(boss?profile.bossBonus.def:0);",
            "NPC base, growth and boss stats",
        ),
        (
            "name:boss?STAGES[Math.min(STAGES.length-1,Math.max(0,stage-1))][1]:['Tiền Quân','Hổ Vệ','Phó Tướng','Quân Sư','Hậu Quân'][slot],",
            "name:boss?STAGES[Math.min(STAGES.length-1,Math.max(0,stage-1))][1]:(NL_GAME_DATA.campaign.npcUnitTemplates[slot]?.displayName||['Tiền Quân','Hổ Vệ','Phó Tướng','Quân Sư','Hậu Quân'][slot]),",
            "NPC unit display-name template",
        ),
        (
            "icon:['🛡️','🏹','🐎','🪶','⚔️'][slot],type,troop,skill:",
            "icon:NL_GAME_DATA.campaign.npcUnitTemplates[slot]?.icon||['🛡️','🏹','🐎','🪶','⚔️'][slot],type,troop,skill:",
            "NPC unit icon template",
        ),
        (
            "skill:troop==='drum'?'Cổ Vũ':P2_ENEMY_SKILLS[type].tag,",
            "skill:troop==='drum'?'Cổ Vũ':(NL_GAME_DATA.skills.enemyByCombatType[type]?.tag||P2_ENEMY_SKILLS[type].tag),",
            "NPC data-driven skill tag",
        ),
        (
            "catk:Math.round(atk*1.07),matk:29+scale*7,def,tdef:Math.round(def*.95),mdef:Math.round(def*.85),",
            "catk:Math.round(atk*profile.derived.catkFromAtk),matk:profile.base.matk+scale*profile.growth.matk,def,tdef:Math.round(def*profile.derived.tdefFromDef),mdef:Math.round(def*profile.derived.mdefFromDef),",
            "NPC derived attack/defense lanes",
        ),
        (
            "speed:36+slot*8+scale*2,crit:.035,morale:boss?62:38,",
            "speed:profile.base.speed+slot*profile.deploymentBonus.speed+scale*profile.growth.speed,crit:profile.crit,morale:boss?profile.morale.boss:profile.morale.normal,",
            "NPC speed, critical chance and starting morale",
        ),
        (
            "const count=Math.min(5,mode==='arena'?5:3+Math.floor((stage-1)/3));",
            "const encounterConfig=mode==='campaign'?NL_GAME_DATA.campaign.encounters.find(item=>item.stage===stage):null,count=mode==='arena'?5:(encounterConfig?.activeCount||Math.min(5,3+Math.floor((stage-1)/3)));",
            "campaign NPC active unit count",
        ),
        (
            "const slots=[1,3,4,5,7].slice(0,count);",
            "const slots=(encounterConfig?.deploymentSlots||NL_GAME_DATA.campaign.defaultEnemyFormationSlots).slice(0,count);",
            "campaign NPC formation slots",
        ),
        (
            "if(P2_COUNTERS[a.troop]===t.troop)advantage=1.22;",
            "if(P2_COUNTERS[a.troop]===t.troop)advantage=battle?.mode==='cltq'?1.22:(NL_GAME_DATA.troops.counterCycle.find(edge=>edge.attacker===a.troop&&edge.defender===t.troop)?.multiplier||1);",
            "counter advantage multiplier",
        ),
        (
            "if(P2_COUNTERS[t.troop]===a.troop)advantage=.82;",
            "if(P2_COUNTERS[t.troop]===a.troop)advantage=battle?.mode==='cltq'?.82:(NL_GAME_DATA.troops.counterCycle.find(edge=>edge.attacker===t.troop&&edge.defender===a.troop)?.disadvantageMultiplier||1);",
            "counter disadvantage multiplier",
        ),
        (
            "descriptor.apply==='daze'?1:2",
            "(NL_GAME_DATA.statusEffects.effects[descriptor.apply]?.duration||2)",
            "applied status duration",
        ),
    ]
    for old, new, label in replacements:
        source = replace_once_or_same(source, old, new, label)
    return source

def prepare_progression_bindings(source: str) -> str:
    """Bind legacy UI/combat formulas to the validated research effect catalog."""
    replacements = [
        ("1+game.technology.commerce*.08", "1+nlTechValue('silverProductionMultiplierBonus')", 2, "silver production effect"),
        ("1+game.technology.harvest*.08", "1+nlTechValue('grainProductionMultiplierBonus')", 2, "grain production effect"),
        ("game.technology.recruit*50", "nlTechValue('reserveCapacityFlat')", 2, "reserve capacity effect"),
        ("(1+t.command*.05)", "(1+nlTechValue('hpMultiplierBonus'))", 1, "hero HP research effect"),
        ("(1+t.arms*.04)", "(1+nlTechValue('atkMultiplierBonus'))", 2, "physical/strategy attack research effect"),
        ("(1+t.strategy*.05)", "(1+nlTechValue('matkMultiplierBonus'))", 1, "magic attack research effect"),
        ("(1+t.armor*.04)", "(1+nlTechValue('defMultiplierBonus'))", 3, "defense research effect"),
        ("40+t.morale*6", "40+nlTechValue('startingMoraleFlat')", 1, "starting morale research effect"),
    ]
    for old, new, expected, label in replacements:
        count = source.count(old)
        if count == expected:
            source = source.replace(old, new)
        elif count == 0 and source.count(new) == expected:
            continue
        else:
            raise ValueError(f"Cannot uniquely prepare {label}: old={count} expected={expected} new={source.count(new)}")
    return source

def replace_marked_block(source: str, start: str, end: str, replacement: str, what: str) -> str:
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError(f"Cannot uniquely replace generated {what} block")
    start_at = source.index(start)
    end_at = source.index(end) + len(end)
    if end_at < start_at:
        raise ValueError(f"Generated {what} markers are out of order")
    return source[:start_at] + replacement.strip("\n") + source[end_at:]

def build(source: str) -> str:
    pack = runtime_pack(load_pack(ROOT))
    data_json = json.dumps(pack, ensure_ascii=False, separators=(",", ":"))
    source = prepare_combat_data_bindings(source)
    source = prepare_progression_bindings(source)
    # B2 modifies ONLY the original P2 implementation before extension adapters.
    source = apply_b2_native(source)
    portal = PORTAL.replace("__NL_DATA_PACK__", data_json)
    effect_catalog = json.loads((ROOT / "data/ngoalong/modules/combat/effects_v1.json").read_text(encoding="utf-8"))
    effect_json = json.dumps(effect_catalog, ensure_ascii=False, separators=(",", ":"))
    parts = [
        (ROOT / "tools/nl_combat_effects_v1.js").read_text(encoding="utf-8"),
        (ROOT / "tools/nl_combat_effect_bridge_v1.js").read_text(encoding="utf-8"),
        (ROOT / "tools/nl_combat_effect_wiring_v1.js").read_text(encoding="utf-8").replace(
            "__NL_EFFECT_V1_CATALOG__", effect_json
        ),
    ]

    # CHAT 03: the authoritative city engine and UI are embedded into the
    # existing offline HTML, inside the native game closure before BOOT.
    city_panel_source = (ROOT / "data/ngoalong/modules/city/city_panel_v1.js").read_text(encoding="utf-8")
    # Never show duplicate city research using legacy Sắt/Prestige payments;
    # Quân Sư Phủ (R03 + A1 late patch) is the only visible research owner.
    if city_panel_source.count("detail(dto)+researchPanel(dto)") != 1:
        raise ValueError("Cannot hide duplicate city research panel")
    city_panel_source = city_panel_source.replace("detail(dto)+researchPanel(dto)", "detail(dto)", 1)
    city_panel_source = city_panel_source.replace(
        "const finance=Object.entries(dto.resources).map",
        "const finance=Object.entries(dto.resources).filter(([id])=>id!=='iron').map",
        1
    )
    city_style_marker = "const stylesheet=String.raw`"
    if city_panel_source.count(city_style_marker) != 1:
        raise ValueError("Missing unique CHAT03 city stylesheet")
    city_css = city_panel_source.split(city_style_marker, 1)[1].split("`;", 1)[0]
    if not city_css or "</style>" in city_css.lower():
        raise ValueError("Invalid CHAT03 stylesheet")
    composed_css = CSS.replace("/* end NL-REBUILD-01 CSS */",
                               city_css + "\n/* end NL-REBUILD-01 CSS */", 1)
    city_catalog = json.loads((ROOT / "data/ngoalong/modules/city/catalog_v1.json").read_text(encoding="utf-8"))
    if len(city_catalog.get("buildings", [])) != 31 or len(city_catalog.get("legacy", [])) != 7:
        raise ValueError("CHAT03 building coverage changed; review required")
    # Phase A2 WEB: projection at build time, never modify the source Wiki/project
    # catalog or legacy Save-v5 balances. No iron/wood cost is required by 31
    # project buildings or their operations. Price conversion is SIMULATED.
    classic_priority = [
        "nl_city_hall", "nl_city_residence", "nl_city_tax_office",
        "nl_city_granary", "nl_city_shop", "nl_city_warehouse",
        "nl_city_treasury", "nl_city_mill", "nl_city_drillground",
        "nl_city_general_altar", "nl_city_workshop",
        "nl_city_military_office", "nl_city_stable", "nl_city_trial_tower"
    ]
    def classic_a2_cost(amounts):
        result=dict(amounts or {})
        iron=result.pop("iron", 0)
        wood=result.pop("wood", 0)
        if iron or wood:
            result["silver"]=result.get("silver", 0)+iron*4+wood*2
            result["grain"]=result.get("grain", 0)+(iron+1)//2+(wood+1)//2
        return result
    for facility in city_catalog["buildings"]:
        facility["baseCost"]=classic_a2_cost(facility["baseCost"])
        for action in facility.get("actions", []):
            action["cost"]=classic_a2_cost(action.get("cost", {}))
        facility["provenance"]["classicA2Cost"]="PROJECT_SIMULATED_CONVERSION"
    city_catalog["buildings"].sort(
        key=lambda building: (classic_priority.index(building["id"])
                              if building["id"] in classic_priority
                              else len(classic_priority), building["id"]))
    for legacy in city_catalog["legacy"]:
        if legacy["id"]=="mine":
            legacy["label"]="Mỏ Bạc"
            legacy["function"]="Bạc (Sắt di sản được giữ nguyên trong Save v5)"
    city_catalog["policy"]["classicA2"]={
        "source":"PROJECT_SIMULATED_A2", "silverPerHistoricIron":4,
        "legacyBalancesRetained":True, "researchOwner":"NL-R03",
        "classicPriorityIds":classic_priority
    }
    city_parts = [
        (ROOT / "tools/nl_city_engine.js").read_text(encoding="utf-8"),
        city_panel_source,
        (ROOT / "data/ngoalong/modules/city/city_runtime_hook_v1.js").read_text(encoding="utf-8"),
    ]
    city_boot = r"""
// === NL-CITY-CHAT03: canonical 31 project + 7 legacy city integration ===
const NL_CITY_CATALOG=__NL_CITY_CATALOG__;
const nlCityHook=NLCityRuntimeHook.createIntegration({
  catalog:NL_CITY_CATALOG,research:NL_GAME_DATA.research,
  engineApi:NLCityEngine,panelApi:NLCityPanel,
  getGame:()=>game,save:()=>save(),now:()=>Date.now(),
  findRoot:id=>document.getElementById(id),
  openLegacy:id=>{
    if(id==='academy'){tab='tech';render();return;}
    if(id==='barracks'){tab='barracks';render();return;}
    const nativeBtn=document.querySelector('[data-focus-building="'+id+'"]');
    if(nativeBtn){nativeBtn.click();return;}
    if(typeof toast==='function')toast('Công trình cũ này chưa có nút điều hướng riêng.');
  },
  onResult:result=>{if(!result.ok&&typeof toast==='function')toast('Thao tác công trình chưa thành công: '+result.code);}
});
renderCity=nlCityHook.wrapRenderCity(renderCity);
render=nlCityHook.wrapRender(render);
tick=nlCityHook.wrapTick(tick);
nlCityHook.advance();
if(window.__P2_ENABLE_QA__)window.__NL_CITY_QA__=Object.freeze({
  coverage:nlCityHook.coverage,
  snapshot:()=>structuredClone(game.nlCity),
  view:()=>nlCityHook.engine.view(game,Date.now())
});
// === end NL-CITY-CHAT03 ===
""".replace("__NL_CITY_CATALOG__", json.dumps(city_catalog, ensure_ascii=False, separators=(",", ":")))

    # Original CSS for Phase A2 UI is applied to the canonical single-file build.
    classic_a2_css = (ROOT / "tools/nl_classic_phase_a2.css").read_text(encoding="utf-8")
    if classic_a2_css.count("/* === NL-CLASSIC-A2-CSS === */") != 1:
        raise ValueError("A2 CSS contract drift")
    composed_css = composed_css.replace("/* end NL-REBUILD-01 CSS */",
        classic_a2_css + "\n/* end NL-REBUILD-01 CSS */", 1)

    # CHAT02 + CHAT05: register tested tactical domain source contracts without
    # transferring authoritative HP/morale/Save/reward ownership out of native P2.
    tactical_parts = [
        (ROOT / "data/ngoalong/modules/combat/resolver_v2.js").read_text(encoding="utf-8"),
        (ROOT / "data/ngoalong/modules/combat/formation_adapter_v2.js").read_text(encoding="utf-8"),
        (ROOT / "data/ngoalong/modules/combat/project_skill_adapter_v2.js").read_text(encoding="utf-8"),
        (ROOT / "data/ngoalong/modules/combat/tactical_ai_v2.js").read_text(encoding="utf-8"),
        (ROOT / "data/ngoalong/modules/combat/pve_director_v2.js").read_text(encoding="utf-8"),
        (ROOT / "data/ngoalong/modules/troops/troop_live_bridge_v2.js").read_text(encoding="utf-8"),
        (ROOT / "data/ngoalong/integration/tactical_intel_view_v1.js").read_text(encoding="utf-8"),
    ]
    def nl_json(path):
        return json.dumps(json.loads((ROOT / path).read_text(encoding="utf-8")),
                          ensure_ascii=False, separators=(",", ":"))
    tactical_boot = r"""
// === NL-TAC-V2: staged source + tactical reconnaissance, native battle unchanged ===
const NL_PROJECT_TROOPS_V2=__NL_PROJECT_TROOPS__;
const NL_TROOP_EVOLUTIONS_V2=__NL_TROOP_EVOLUTIONS__;
const NL_TROOP_LIVE_CONTRACT_V2=__NL_TROOP_LIVE_CONTRACT__;
const nlTroopContractV2=NLTroopLiveContractV2.create(
  NL_TROOP_LIVE_CONTRACT_V2,NL_PROJECT_TROOPS_V2,NL_TROOP_EVOLUTIONS_V2);
const nlTacticalIntelV2=NLTacticalIntelViewV1.create({
  pack:NL_GAME_DATA,director:NLPvETacticsV2,
  troopBridge:nlTroopContractV2,projectTroops:NL_PROJECT_TROOPS_V2});
const nlBaseEnemyIntelV2=nlEnemyIntel;
nlEnemyIntel=function(stage){
  return nlBaseEnemyIntelV2(stage)+nlTacticalIntelV2.renderStage(stage);
};
if(typeof renderBarracks==='function'){
  const nlBaseBarracksV2=renderBarracks;
  renderBarracks=function(){
    return nlBaseBarracksV2()+nlTacticalIntelV2.renderTroops();
  };
}
if(window.__P2_ENABLE_QA__)window.__NL_TACTICS_QA__=Object.freeze({
  summary:()=>nlTacticalIntelV2.summary(),
  renderStage:stage=>nlTacticalIntelV2.renderStage(stage),
  troopAudit:()=>nlTroopContractV2.audit()
});
// === end NL-TAC-V2 ===
"""
    for key, path in (
        ("__NL_PROJECT_TROOPS__", "data/ngoalong/modules/troops/project_playable_v1.json"),
        ("__NL_TROOP_EVOLUTIONS__", "data/ngoalong/modules/troops/evolution_contract_v1.json"),
        ("__NL_TROOP_LIVE_CONTRACT__", "data/ngoalong/modules/troops/live_integration_contract_v2.json"),
    ):
        tactical_boot = tactical_boot.replace(key, nl_json(path))
    if any("</script>" in part.lower() for part in tactical_parts + [tactical_boot]):
        raise ValueError("Unsafe tactical script terminator")
    tactical_css = """
.nl-v2-intel{border:1px solid #716341;border-radius:8px;padding:11px;margin:12px 0;background:#20282a;color:#e8ddc5}
.nl-v2-intel h3{font-size:14px;color:#eacb8d;margin:0 0 7px}
.nl-v2-intel p,.nl-v2-intel small{font-size:11px;line-height:1.55}
.nl-v2-intel details{margin:8px 0}.nl-v2-intel summary{cursor:pointer}
.nl-v2-intel ul{margin:8px 0;padding-left:22px;font-size:11px}
"""
    composed_css = composed_css.replace("/* end NL-REBUILD-01 CSS */",
                                        tactical_css + "\n/* end NL-REBUILD-01 CSS */", 1)

    native_a1 = (ROOT / "data/ngoalong/integration/native_pve_adapter_v2.js").read_text(encoding="utf-8")
    native_a1_boot = r"""
// === NL-NATIVE-A1: one authoritative P2 battle with V2 policy ===
const nlNativeA1=NLNativePvEAdapterV2.create({
  pack:NL_GAME_DATA,director:NLPvETacticsV2,troopBridge:nlTroopContractV2
});
// Only the real native P2 target function can execute attacks: policy chooses
// within native P3/R03 legal depth and never calls resolver_v2.resolveAction.
const nlA1LegacyTarget=p2Target;
p2Target=function(actor,mode='front'){
  const original=nlA1LegacyTarget(actor,mode);
  if(!battle||battle.mode!=='campaign'||!actor||!original||actor.team!=='e')return original;
  const choice=nlNativeA1.pickTarget({
    battle,attacker:actor,mode,baseline:original,opponents:p2CountAlive('p')});
  const target=choice.target||original;
  const decision=battle.pendingAIDecision;
  if(decision&&decision.actorTeam===actor.team&&decision.actorSlot===actor.slot){
    decision.nativeV2={source:choice.source||'legacy',profile:choice.profile,
      phase:choice.phase,boss:choice.boss,legalDepth:original.slot%3,
      candidates:choice.candidates};
    decision.target=target.id;decision.targetSlot=target.slot;
    decision.reason+='; A1 '+(choice.profile||'balanced')+' / '+(choice.phase||'opening')+
      ' · hợp lệ cột '+(target.slot%3+1);
  }
  return target;
};
const nlA1LegacySkill=p2Skill;
p2Skill=function(actor){
  const original=nlA1LegacySkill(actor);
  const choice=nlNativeA1.bossSkill(battle,actor,original);
  if(!choice)return original;
  if(actor.morale>=100)actor.skill=choice.descriptor.tag;
  actor.nlA1BossSkill={id:choice.id,phase:choice.phase,stage:choice.stage};
  return choice.descriptor; // Native p2Perform applies ONCE via original p2Hit/status.
};
const nlA1LegacyPerform=p2Perform;
p2Perform=function(actor){
  if(!battle||battle.mode!=='campaign'||!actor)return nlA1LegacyPerform(actor);
  const previous=battle.nlA1Action||null;
  battle.nlA1Action={actorId:actor.id,team:actor.team,normal:actor.morale<100,
    hitCount:0,applied:null};
  try{return nlA1LegacyPerform(actor);}
  finally{battle.nlA1Action=previous;}
};
const nlA1LegacyHit=p2Hit;
p2Hit=function(attacker,target,kind,mult=1,opts={}){
  const active=battle?.nlA1Action||null;
  const trait=nlNativeA1.bonusForBasicHit({
    battle,actor:attacker,game,action:active,hitIndex:active?.hitCount||0});
  if(active&&active.actorId===attacker?.id&&active.team===attacker?.team)
    active.hitCount++;
  if(trait&&active){active.applied=trait;mult*=trait.multiplier;}
  return nlA1LegacyHit(attacker,target,kind,mult,opts);
};
const nlA1LegacyApplyFrame=p2ApplyFrame;
p2ApplyFrame=function(event){
  if(battle?.mode==='campaign'&&!battle.replay&&event?.actorTeam){
    const actor=battle[event.actorTeam]?.find(u=>u.slot===event.actorSlot);
    if(actor&&event.actorTeam==='e'){
      const info=nlNativeA1.profile(battle,actor);
      event.nativeV2={stage:battle.stage,phase:info.phase,profile:info.profile,
        boss:info.boss,skillId:actor.nlA1BossSkill?.id||null,authority:'NATIVE_P2'};
      const hit=(event.hits||[]).find(h=>h.team==='p'&&h.amount>0);
      if(hit){
        const target=battle.p.find(u=>u.slot===hit.slot);
        if(target)battle.nlA1Focus=target.id;
      }
    }
    if(battle.nlA1Action?.applied)
      event.troopV2Passive=structuredClone(battle.nlA1Action.applied);
  }
  return nlA1LegacyApplyFrame(event);
};
const nlA1LegacyBeginBattle=beginBattle;
beginBattle=function(stage,mode='campaign'){
  const prior=battle;
  const result=nlA1LegacyBeginBattle(stage,mode);
  if(prior||!battle||battle.mode!=='campaign'||battle.stage!==stage)return result;
  const p=nlNativeA1.plan(stage);
  if(!p)return result;
  battle.nlA1={version:2,stage,boss:p.boss,identity:p.bossIdentity,
    p2Authority:true,secondResolver:false};
  for(const actor of [...battle.p,...battle.e]){
    const troop=nlNativeA1.troopOf(actor,battle,game);
    if(troop)actor.nlTroopV2={projectId:troop.projectId,provenance:'SIMULATED'};
  }
  battle.opening=p2Snapshot(); // Native R03 deployments are already finalized.
  const header=document.querySelector('.battle-head');
  if(header&&!document.querySelector('[data-nl-a1-live]')){
    header.insertAdjacentHTML('afterend',
      '<div class="nl-a1-live" data-nl-a1-live="'+stage+'">⚔ A1 · '+(p.boss?'BOSS '+esc(p.bossName||''):'Đội hình quân địch')+
      ' · AI V2 trên trận thật · HP/sĩ khí/thưởng do lõi P2 quản lý</div>');
  }
  return result;
};
if(window.__P2_ENABLE_QA__)window.__NL_NATIVE_A1_QA__=Object.freeze({
  coverage:()=>nlNativeA1.coverage(),
  phase:()=>nlNativeA1.phase(battle),
  stage:()=>battle?.nlA1||null,
  bossSkill:unit=>nlNativeA1.bossSkill(battle,unit,p2Skill(unit)),
  troop:unit=>nlNativeA1.troopOf(unit,battle,game),
  choose:(unit,mode='front')=>p2Target(unit,mode)?.id||null
});
// === end NL-NATIVE-A1 ===
"""
    if "</script>" in native_a1.lower() or "</script>" in native_a1_boot.lower():
        raise ValueError("Unsafe native A1 script terminator")
    composed_css = composed_css.replace("/* end NL-REBUILD-01 CSS */",
        ".nl-a1-live{padding:7px 12px;background:#29382d;color:#e4d9bc;font-size:11px;border-bottom:1px solid #7b7a57}\n/* end NL-REBUILD-01 CSS */", 1)
    hero207_module = (ROOT / "tools/nl_heroes207_runtime_v1.js").read_text(encoding="utf-8")
    if "// === NL-HERO207-V1:" not in hero207_module or "// === end NL-HERO207-V1 ===" not in hero207_module:
        raise ValueError("Missing Hero207 runtime module boundary markers")
    if any("</script>" in part.lower() for part in parts + [hero207_module] + city_parts + [city_boot]):
        raise ValueError("Effect integration contains an unsafe script terminator")
    qa_marker = "if(window.__P2_ENABLE_QA__&&window.__P2_QA__)Object.assign("
    if portal.count(qa_marker) != 1:
        raise ValueError("Cannot uniquely inject V1 effects before QA exports")
    portal = portal.replace(qa_marker, hero207_module + "\n" + qa_marker, 1)
    portal = portal.replace(qa_marker, "\n".join(parts) + "\n" + qa_marker, 1)
    # Integrate after existing effect and Hero207 wiring, never through a
    # second HTML file or a parallel tick/save timer.
    portal = portal.replace(qa_marker, "\n".join(city_parts) + "\n" + city_boot + "\n" + qa_marker, 1)
    portal = portal.replace(qa_marker, "\n".join(tactical_parts) + "\n" + tactical_boot + "\n" + qa_marker, 1)
    portal = portal.replace(qa_marker, native_a1 + "\n" + native_a1_boot + "\n" + qa_marker, 1)
    # WEB classic Phase A: real resources, three named recruitment paths and town taxes.
    # This executes AFTER Hero207/City/NativeA1, and BEFORE the final game BOOT.
    classic_a_js = (ROOT / "tools/nl_classic_phase_a.js").read_text(encoding="utf-8")
    classic_a_css = (ROOT / "tools/nl_classic_phase_a.css").read_text(encoding="utf-8")
    if "</script>" in classic_a_js.lower() or "</style>" in classic_a_css.lower():
        raise ValueError("Unsafe classic Phase A script/style terminator")
    if classic_a_js.count("// === NL-CLASSIC-A-V1:") != 1:
        raise ValueError("Missing classic Phase A module contract")
    portal = portal.replace(qa_marker, classic_a_js + "\n" + qa_marker, 1)
    composed_css = composed_css.replace("/* end NL-REBUILD-01 CSS */",
        classic_a_css + "\n/* end NL-REBUILD-01 CSS */", 1)
    css_start = "/* NL-REBUILD-01 — Ngọa Long-first command hub */"
    css_end = "/* end NL-REBUILD-01 CSS */"
    js_start = "// === NL-REBUILD-01: first-class 3x3 strategy dashboard ==="
    js_end = "// === end NL-REBUILD-01 ==="
    if any(marker in source for marker in (css_start, css_end, js_start, js_end)):
        source = replace_marked_block(source, css_start, css_end, composed_css, "CSS")
        source = replace_marked_block(source, js_start, js_end, portal, "runtime")
        if source.count("function nlRebuildHub(){") != 1 or source.count("NL-R02: source-backed taxonomy") != 1:
            raise ValueError("Ngọa Long build verification failed")
        return source
    source = replace_once(source, OLD_TITLE, NEW_TITLE, "HTML title")
    source = replace_once(source, "KIẾN THÀNH · DỤNG BINH · ĐỊNH THIÊN HẠ", "BÀY TRẬN · SĨ KHÍ · ĐỊNH THIÊN HẠ", "tagline")
    source = replace_once(source, "</style>", composed_css + "</style>", "stylesheet")
    source = replace_once(source, OLD_NAV, NEW_NAV, "NAV")
    source = replace_once(source, BOOT, portal + "\n" + BOOT, "runtime bootstrap")
    if source.count("function nlRebuildHub(){") != 1:
        raise ValueError("Hub build verification failed")
    return source

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="check markers without writing")
    args = ap.parse_args()
    original = INDEX.read_text(encoding="utf-8")
    assembled = build(original)
    if args.check and assembled == original:
        print("Already portal-ready")
        return
    if not args.check and assembled != original:
        INDEX.write_text(assembled, encoding="utf-8", newline="")
    digest = hashlib.sha256(assembled.encode("utf-8")).hexdigest()
    print(f"NL-REBUILD-01: bytes={len(assembled.encode('utf-8'))} sha256={digest} applied={assembled!=original} dry_run={args.check}")

if __name__ == "__main__":
    main()
