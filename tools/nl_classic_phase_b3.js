// === NL-CLASSIC-B3-V1: 25 original PROJECT troop contracts, 24 formations, 221 hero skill IDs ===
// B3 is a single P2 additive bridge, not a shadow combat or second resolver.
// Classic WEB 2011 actually catalogues 5+10+40 troop types and 10 formations;
// project keeps 25 playable identities and 6x4 project tactical variants.
// Branch damage coefficients are SIMULATED; no Wiki Mobile IDs imported.
const NLB3_UNITS=__NL_B3_UNITS__;
if(NLB3_UNITS.length!==25||new Set(NLB3_UNITS.map(x=>x.id)).size!==25)throw Error('NL_B3: duplicate or missing troop IDs');
const NLB3_BRANCHES=new Map(NL_GAME_DATA.evolution.branches.map(x=>[x.id,x]));
if(NLB3_BRANCHES.size!==18)throw Error('NL_B3: exactly 18 simulated evolutions required');
const NLB3_FORMATIONS=Object.freeze(NL_GAME_DATA.formations.families.flatMap(f=>
 NL_GAME_DATA.formations.plans.map(p=>Object.freeze({
  id:f.id+'-'+p.key,source:'PROJECT_SIMULATED',
  family:f.id,title:f.name+' · '+p.name,style:p.style,
  slots:[...p.slots],modifiers:{...f.combatModifiers}
 }))));
if(NLB3_FORMATIONS.length!==24||new Set(NLB3_FORMATIONS.map(x=>x.id)).size!==24)throw Error('NL_B3: formation catalog changed');
const NLB3_SKILLS=Object.freeze({...NL_GAME_DATA.skills.heroById,...NL_GAME_DATA.skills.hero207ById});
if(Object.keys(NLB3_SKILLS).length!==221)throw Error('NL_B3: hero skill mapping 14+207 changed');
for(const [id,desc] of Object.entries(NLB3_SKILLS)){
 if(!desc||!['physical','tactic','magic'].includes(desc.kind)||
   !['single','double','row','column','all','back','heal'].includes(desc.pattern)||
   !Number.isFinite(desc.mult)||desc.mult<=0)
   throw Error('NL_B3: unsupported source skill '+id);
}
const NLB3_REGISTRY=Object.freeze(NLB3_UNITS.map(x=>({
 id:x.id,name:x.name,legacyId:x.legacyId,branch:x.legacyEngineMapping?.legacyEvolutionId||null,
 family:x.family,intent:x.combatBehavior.effectIntent,trigger:x.combatBehavior.trigger,
 value:x.combatBehavior.value,source:'PROJECT_SIMULATED',
 nativeStatus:x.legacyEngineMapping?.legacyEvolutionId?
  (NLB3_BRANCHES.has(x.legacyId)?'R03_NATIVE_BRANCH':'PENDING_RUNTIME'):
  'P2_NATIVE_BASE'
})));
let nlB3TroopSelected=NLB3_REGISTRY[0].id;
function nlB3BranchOf(unit){
 return unit?.team==='p'&&typeof nlr03BranchFor==='function'?nlr03BranchFor(unit.id):null;
}
// B3 narrow and bounded, through the existing authoritative p2Hit ONCE.
// Restores physical protection for two R03 phalanx identities whose static
// defense multipliers already work but charge-brace intent was still pending.
// Never changes damage output outside real campaign stages 1-24.
function nlB3HitModifier(attacker,target,kind,stage){
 if(!attacker||!target||target.team!=='p'||attacker.team!=='e'||
    !Number.isInteger(stage)||stage<1||stage>24||
    !['physical','tactic'].includes(kind)||attacker.troop!=='cavalry')return 1;
 const id=nlB3BranchOf(target)?.id;
 if(id==='phalanx')return .80;
 if(id==='spearwall')return .82;
 return 1;
}
const nlB3PriorHit=p2Hit;
p2Hit=function(attacker,target,kind,mult=1,opts={}){
 const coeff=battle?.mode==='campaign'?nlB3HitModifier(attacker,target,kind,battle.stage):1;
 return nlB3PriorHit(attacker,target,kind,mult*coeff,opts);
};
function nlB3TroopPanel(){
 const chosen=NLB3_REGISTRY.find(x=>x.id===nlB3TroopSelected)||NLB3_REGISTRY[0];
 const selectedBranch=chosen.branch?NLB3_BRANCHES.get(chosen.branch):null;
 const live=selectedBranch?'R03 tiến hóa có hiệu lực chỉ số/kỹ năng': 'Binh chủng nền của lõi P2';
 const open=chosen.branch?'Chọn nhánh tại bảng Tiến Hóa bên trên; cần Doanh Trại cấp 2.':'Dùng trực tiếp với tướng đúng hệ.';
 return '<section class="panel mini-box" data-nlb3-troops="1">'+
  '<h3>⚔️ B3 · Danh mục 25 binh chủng</h3>'+
  '<p class="tiny">7 binh chủng gốc + 18 nhánh dự án. Ngọa Long WEB 2011 có 55 loại; 25 đây KHÔNG phải toàn bộ danh mục gốc.</p>'+
  '<label for="nlb3-selector">Xem cơ chế binh chủng</label>'+
  '<select id="nlb3-selector" data-nlb3-select="1">'+
  NLB3_REGISTRY.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===chosen.id?' selected':'')+'>'+esc(x.name)+' · '+esc(x.family)+'</option>').join('')+'</select>'+
  '<div data-nlb3-detail="'+esc(chosen.id)+'"><b>'+esc(chosen.name)+'</b>'+
  '<p class="tiny">Nhóm: '+esc(chosen.family)+' · Hiệu ứng thiết kế: '+esc(chosen.intent)+' ('+esc(chosen.trigger)+')</p>'+
  '<p class="tiny">Lõi đang dùng: '+esc(live)+'. '+esc(open)+'</p>'+
  (chosen.branch==='phalanx'||chosen.branch==='spearwall'?
   '<p class="tiny">B3 đã nối giảm sát thương Kỵ binh vào p2Hit, chỉ tính một lần và chỉ ở chiến dịch 1–24.</p>':'')+
  '<p class="tiny">Chỉ số/effect chưa nối được giữ PENDING, không nhận là hiệu ứng Ngọa Long chính thức. Tất cả nhánh thiết kế SIMULATED.</p></div></section>';
}
function nlB3FormationPanel(){
 const f=NLB3_FORMATIONS.find(x=>x.id===game.p3PresetId)||NLB3_FORMATIONS[0];
 const m=f.modifiers,pc=x=>(x>=0?'+':'')+Math.round(x*100)+'%';
 const src=(game.slots||[]).slice(0,9).map((id,slot)=>id?
    '<span>'+esc(HEROES[id]?.name||id)+' · ô '+(slot+1)+'</span>':null).filter(Boolean).join(' · ');
 return '<section class="panel mini-box" data-nlb3-formations="1"><h3>♟️ B3 · Thông số trận pháp</h3>'+
   '<p><b>'+esc(f.title)+'</b> · '+esc(f.style)+'</p>'+
   '<p class="tiny">Công '+pc(m.atk)+' · Thủ '+pc(m.def)+' · Mưu '+pc(m.int)+' · Chí mạng '+pc(m.crit)+'.</p>'+
   '<p class="tiny">Ô chuẩn: '+f.slots.map(i=>i+1).join(' · ')+' · Đang ra trận: '+(src||'chưa có võ tướng')+'.</p>'+
   '<p class="tiny">Bộ 6 trận pháp × 4 phương án giữ nguyên ID Save v5. Thông số là SIMULATED, không phải 10 trận cổ điển.</p></section>';
}
function nlB3HeroSkillPanel(){
 const active=(game.slots||[]).filter(Boolean).slice(0,5);
 return '<section class="panel mini-box" data-nlb3-skills="1"><h3>📜 B3 · Chiến pháp võ tướng</h3>'+
   '<p class="tiny">14 kỹ năng nền + 207 kỹ năng tướng mở rộng có mô tả; khi vào trận dùng trực tiếp P2_SKILLS, không có bộ giải quyết kỹ năng thứ hai.</p>'+
   (active.length?active.map(id=>{
      const h=HEROES[id],skill=P2_SKILLS[id]||NLB3_SKILLS[id];
      return '<p class="tiny" data-nlb3-skill="'+esc(id)+'"><b>'+esc(h?.name||id)+'</b>: '+
        esc(skill?.tag||h?.skill||'Chưa gán')+' · '+esc(skill?.kind||'unknown')+
        ' · '+esc(skill?.pattern||'unknown')+' · 100 sĩ khí phát động.</p>';
    }).join(''):'<p class="tiny">Đặt tướng trong Bày Trận để xem chiến pháp.</p>')+
   '<p class="tiny">Công thức của 221 kỹ năng là thiết kế dự án SIMULATED, không suy ra rằng chúng khớp Wiki WEB.</p></section>';
}
const nlB3PriorBarracks=renderBarracks;
renderBarracks=function(){return nlB3PriorBarracks()+nlB3TroopPanel();};
const nlB3PriorFormation=renderFormation;
renderFormation=function(){return nlB3PriorFormation()+nlB3FormationPanel();};
const nlB3PriorHeroes=renderHeroes;
renderHeroes=function(){return nlB3PriorHeroes()+nlB3HeroSkillPanel();};
document.addEventListener('change',e=>{
 const select=e.target.closest?.('[data-nlb3-select]');
 if(!select||!NLB3_REGISTRY.some(x=>x.id===select.value))return;
 nlB3TroopSelected=select.value;render();
});
const nlB3Style=document.createElement('style');
nlB3Style.textContent='[data-nlb3-troops] select{max-width:100%;width:100%;padding:9px;background:#182a29;color:#f1e5c7;border:1px solid #95794b;border-radius:6px;font-size:12px}[data-nlb3-detail]{padding:9px 0}[data-nlb3-formations],[data-nlb3-skills],[data-nlb3-troops]{border-color:#a88750}[data-nlb3-skills] [data-nlb3-skill]{padding:4px;border-bottom:1px solid #70654a}';
document.head.appendChild(nlB3Style);
if(window.__P2_ENABLE_QA__)window.__NL_B3_QA__=Object.freeze({
 troops:NLB3_REGISTRY,formations:NLB3_FORMATIONS,
 skills:Object.keys(NLB3_SKILLS),skillCatalog:NLB3_SKILLS,
 modifier:nlB3HitModifier,hit:p2Hit,troopPanel:nlB3TroopPanel,
 formationPanel:nlB3FormationPanel,source:'PROJECT_SIMULATED',
 nativeAuthority:'P2',extraRewards:0,extraActions:0
});
// === end NL-CLASSIC-B3-V1 ===
