#!/usr/bin/env python3
"""Deterministic Ngọa Long-first UI build step for the canonical offline index.html.

The canonical distributable remains one generated index.html. The historical
5.5 MB base includes many embedded provenance-checked atlases: this build step
patches it in-place before QA and release, preserving all game/save logic.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

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
@media(max-width:850px){.nl-command .nl-content{grid-template-columns:1fr}.nl-command{padding:15px}}
@media(max-width:420px){.nl-command .nl-facts{gap:5px}.nl-command .nl-fact b{font-size:16px}.nl-command .nl-actions button{flex:1 1 43%}}
/* end NL-REBUILD-01 CSS */
"""

# This code is inserted INSIDE the existing game closure, after all gameplay
# upgrades/overrides and immediately before the existing final render().
PORTAL = r"""
// === NL-REBUILD-01: first-class 3x3 strategy dashboard ===
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
const NL_R02_COUNTERS={infantry:'spear',spear:'cavalry',cavalry:'infantry'};
const NL_R02_LEGACY_COUNTERS={...P2_COUNTERS};
P2_TROOPS.spear='Thương binh';
const nlLegacyCounterFactor=p3CounterFactor;
p3CounterFactor=function(attacker,defender){
  if(battle?.mode==='cltq')return nlLegacyCounterFactor(attacker,defender);
  if(NL_R02_COUNTERS[attacker]===defender)return 1.22;
  if(NL_R02_COUNTERS[defender]===attacker)return .82;
  return 1;
};
const nlSimaSkill={...P2_SKILLS.sima,apply:'morale-seal',applyChance:1};
const nlBaseSkill=p2Skill;
p2Skill=function(unit){
  if(battle?.mode==='campaign'&&(unit?.id==='sima'||unit?.skillKey==='nl-sima'))return nlSimaSkill;
  return nlBaseSkill(unit);
};
const nlBaseMorale=p2Morale;
p2Morale=function(unit,delta){
  if(delta>0&&unit&&p2Has(unit,'morale-seal'))return unit.morale||0;
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

const NL_R02_ENCOUNTERS=[
  {tactic:'Hổ Lao Tiền Mâu: Bộ binh khắc chế Thương; bảo vệ tuyến trước.',troops:['spear','spear','infantry','archer','support']},
  {tactic:'Kỵ Đội Xung Phong: Thương binh khắc chế Kỵ; giữ giáo ở tuyến trước.',troops:['cavalry','cavalry','archer','strategist','support']},
  {tactic:'Thiết Thuẫn Trường Môn: Kỵ binh khắc chế Bộ; chọn mục tiêu để phá hàng chắn.',troops:['infantry','infantry','cavalry','archer','support']},
  {tactic:'Hậu Doanh Liên Nỏ: cung thủ bắn qua tuyến; dùng chiến pháp hàng sau hoặc khóa cung.',troops:['infantry','archer','archer','strategist','support']},
  {tactic:'Trống Khóa Quân Tâm: Tư Mã Ý rút sĩ khí; Điều Quân + Thương ưu tiên Kỵ, còn trống giữ nhịp quân tâm.',troops:['cavalry','spear','strategist','support','drum'],enemyPower:1.7}
];
NL_R02_ENCOUNTERS.forEach((encounter,index)=>{if(STAGES[index]){STAGES[index].nlTactic=encounter.tactic;STAGES[index][2]=encounter.tactic;}});
const nlBaseUnit=p2Unit;
p2Unit=function(id,team,slot,stage){
  const unit=nlBaseUnit(id,team,slot,stage);
  if(!unit)return unit;
  // Re-tune the legacy mid-campaign band after replacing its troop-counter table.
  // The 6% compensation is a project simulation, not a sourced Ngọa Long formula.
  if(team==='e'&&battle?.mode==='campaign'&&stage>=13&&stage<=20){for(const key of ['atk','catk','matk','def','tdef','mdef'])unit[key]=Math.max(1,Math.round(unit[key]*1.06));unit.hp=unit.maxHp=Math.max(1,Math.round(unit.hp*1.06));}
  if(team==='p'&&game.troopModes[id]==='spear'&&HEROES[id]?.type==='infantry')unit.troop='spear';
  if(team==='e'&&battle?.mode==='campaign'){
    const encounter=NL_R02_ENCOUNTERS[stage-1];
    if(encounter){
      unit.troop=encounter.troops[slot]||unit.troop;
      if(unit.troop==='drum')unit.skill='Cổ Vũ';
      if(encounter.enemyPower){for(const key of ['atk','catk','matk','def','tdef','mdef'])unit[key]=Math.round(unit[key]*encounter.enemyPower);unit.hp=unit.maxHp=Math.round(unit.maxHp*encounter.enemyPower);}
      if(stage===5&&slot===2){unit.name='Tư Mã Ý';unit.skill='Quỷ Mưu';unit.skillKey='nl-sima';}
    }
  }
  return unit;
};
const nlBaseBeginBattle=beginBattle;
beginBattle=function(stage,mode='campaign'){
  const previous=battle;nlBaseBeginBattle(stage,mode);
  if(!previous&&battle?.mode==='campaign'&&stage===5){
    const puzzleSlots=[2,5,8,3];
    battle.e.forEach((unit,index)=>unit.slot=puzzleSlots[index]??unit.slot);
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
if(window.__P2_ENABLE_QA__&&window.__P2_QA__)Object.assign(window.__P2_QA__,{p2Hit,p2Target,perform:p2Perform,morale:p2Morale,status:p2Status,encounters:NL_R02_ENCOUNTERS.map(item=>({...item,troops:[...item.troops]})),counters:{...NL_R02_COUNTERS},moraleSealSkill:nlSimaSkill.apply});
if(window.__P2_ENABLE_QA__&&window.__P3_QA__)Object.assign(window.__P3_QA__,{target:p2Target,counter:p3CounterFactor,unit:p2Unit});
// === end NL-REBUILD-01 ===
"""

def replace_once(source: str, old: str, new: str, what: str) -> str:
    if source.count(old) != 1:
        raise ValueError(f"Cannot uniquely replace {what}: matches={source.count(old)}")
    return source.replace(old, new, 1)

def replace_marked_block(source: str, start: str, end: str, replacement: str, what: str) -> str:
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError(f"Cannot uniquely replace generated {what} block")
    start_at = source.index(start)
    end_at = source.index(end) + len(end)
    if end_at < start_at:
        raise ValueError(f"Generated {what} markers are out of order")
    return source[:start_at] + replacement.strip("\n") + source[end_at:]

def build(source: str) -> str:
    css_start = "/* NL-REBUILD-01 — Ngọa Long-first command hub */"
    css_end = "/* end NL-REBUILD-01 CSS */"
    js_start = "// === NL-REBUILD-01: first-class 3x3 strategy dashboard ==="
    js_end = "// === end NL-REBUILD-01 ==="
    if any(marker in source for marker in (css_start, css_end, js_start, js_end)):
        source = replace_marked_block(source, css_start, css_end, CSS, "CSS")
        source = replace_marked_block(source, js_start, js_end, PORTAL, "runtime")
        if source.count("function nlRebuildHub(){") != 1 or source.count("NL-R02: source-backed taxonomy") != 1:
            raise ValueError("Ngọa Long build verification failed")
        return source
    source = replace_once(source, OLD_TITLE, NEW_TITLE, "HTML title")
    source = replace_once(source, "KIẾN THÀNH · DỤNG BINH · ĐỊNH THIÊN HẠ", "BÀY TRẬN · SĨ KHÍ · ĐỊNH THIÊN HẠ", "tagline")
    source = replace_once(source, "</style>", CSS + "</style>", "stylesheet")
    source = replace_once(source, OLD_NAV, NEW_NAV, "NAV")
    source = replace_once(source, BOOT, PORTAL + "\n" + BOOT, "runtime bootstrap")
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
