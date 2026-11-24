// === NL-CLASSIC-WEB-B4-V1: 55 named classic WEB troops, ten battle formations and original battle art ===
// The 2018 Lequ historical table supplies tier/name/coefficient reference data.
// All playable damage scalars, placement patterns, unlocks and change costs are PROJECT_SIMULATED.
// One native P2 battle; no added tick, Save owner, hit, morale receipt or reward resolver.
const NLW_B4=__NL_B4_DATA__;
if(NLW_B4.troops.length!==55||NLW_B4.formations.length!==10||
   [1,2,3].some((tier,i)=>NLW_B4.troops.filter(t=>t.tier===tier).length!==[5,10,40][i]))
  throw Error('NLW_B4: classic WEB 5/10/40 or formation contract drift');
const NLW_B4_BY_ID=new Map(NLW_B4.troops.map(unit=>[unit.id,unit]));
if(NLW_B4_BY_ID.size!==55)throw Error('NLW_B4: duplicate troop IDs');
const NLW_B4_FAMILIES={infantry:'Bộ',spear:'Thương',cavalry:'Kỵ',archer:'Cung',strategist:'Văn'};
const NLW_B4_OLD_P3_COUNT=P3_PRESETS.length;
// Add exactly the five families absent from B3; retain all 24 old Save-v5 presets.
for(const row of NLW_B4.formations){
 if(FORMATIONS[row.id])continue;
 if(!row.modifiers)throw Error('NLW_B4: missing project modifiers for '+row.id);
 FORMATIONS[row.id]={name:row.name,desc:row.role,...row.modifiers};
 P3_PRESETS.push({id:row.id+'-van',formation:row.id,title:row.name,
   slots:[...row.slots],style:'counter',desc:row.role,source:'CLASSIC_WEB_NAME_PROJECT_BALANCE'});
}
if(P3_PRESETS.length!==NLW_B4_OLD_P3_COUNT+5)throw Error('NLW_B4: conflicting historical formation families');
const NLW_B4_FORM_BY_ID=new Map(NLW_B4.formations.map(f=>[f.id,f]));
function nlwB4State(){
 if(!game.nlClassicWebB4||typeof game.nlClassicWebB4!=='object'||Array.isArray(game.nlClassicWebB4))
   game.nlClassicWebB4={version:1,assigned:{},selectionReceipts:[],source:'PROJECT_SIMULATED_55_WEB'};
 const state=game.nlClassicWebB4;
 if(!state.assigned||typeof state.assigned!=='object'||Array.isArray(state.assigned))state.assigned={};
 if(!Array.isArray(state.selectionReceipts))state.selectionReceipts=[];
 return state;
}
function nlwB4Active(heroId){return NLW_B4_BY_ID.get(nlwB4State().assigned[heroId])||null;}
function nlwB4Cost(tier){return tier===1?0:250*(tier-1);}
function nlwB4CanSelect(heroId,troopId){
 const troop=NLW_B4_BY_ID.get(troopId);
 return !!(troop&&game.hero?.[heroId]&&game.roster.includes(heroId)&&!battle&&
   (game.buildings.barracks||0)>=troop.tier&&game.silver>=nlwB4Cost(troop.tier));
}
function nlwB4Select(heroId,troopId){
 const troop=NLW_B4_BY_ID.get(troopId),state=nlwB4State();
 if(!troop||!nlwB4CanSelect(heroId,troopId)){
   toast('Chưa đủ cấp Doanh Trại hoặc Bạc để chuyển quân.');return false;
 }
 if(state.assigned[heroId]===troopId)return false;
 const silver=nlwB4Cost(troop.tier);
 if(!payment({silver}))return false;
 state.assigned[heroId]=troopId;
 state.selectionReceipts.push({heroId,troopId,silver,at:Date.now(),source:'PROJECT_SIMULATED'});
 if(state.selectionReceipts.length>250)state.selectionReceipts.splice(0,state.selectionReceipts.length-250);
 log('Đổi quân cho '+(HEROES[heroId]?.name||heroId)+' → '+troop.name+' (hệ số chiến đấu mô phỏng).');
 save();render();toast('Đã chuyển sang '+troop.name);return true;
}
// Use the six displayed source coefficients ONLY as inputs into bounded PROJECT
// normalization; original WEB combat formulas are not asserted or recreated.
const NLW_B4_BASE={atk:1,catk:1,matk:1,def:.3,tdef:.3,mdef:.3};
function nlwB4Factor(key,value,tier){
 const scaled=Number(value)/NLW_B4_BASE[key];
 return Math.max(.78,Math.min(1.25,(.82+.13*scaled)*(1+.07*(tier-1))));
}
const nlwB4PriorUnit=p2Unit;
p2Unit=function(id,team,slot,stage){
 const u=nlwB4PriorUnit(id,team,slot,stage);
 if(team!=='p'||battle?.mode==='cltq'||!u)return u;
 const troop=nlwB4Active(id);if(!troop)return u;
 const k=troop.sourceCoefficients;
 for(const [prop,source] of Object.entries({atk:'physicalAttack',catk:'tacticAttack',
   matk:'magicAttack',def:'physicalDefense',tdef:'tacticDefense',mdef:'magicDefense'})){
   if(Number.isFinite(u[prop]))u[prop]=Math.max(1,Math.round(u[prop]*nlwB4Factor(prop,k[source],troop.tier)));
 }
 u.nlClassicWebUnit=troop.id;u.nlClassicWebName=troop.name;
 u.nlClassicWebAbility=troop.ability;u.nlClassicWebPattern=troop.skillPattern;
 u.troop=troop.ability==='drum'?'drum':troop.ability==='dancer'?'dancer':troop.family;
 u.type=troop.family==='spear'?'infantry':troop.family;
 if(troop.ability==='drum'||troop.ability==='dancer')u.type='support';
 return u;
};
// Native target selector / skill resolver retain all attack, morale and receipt ownership.
// The project approximation for long-range / line skills applies to ONE original action.
const nlwB4PriorTarget=p2Target;
p2Target=function(actor,mode='front'){
 if(actor?.team==='p'&&battle?.mode==='campaign'&&actor.nlClassicWebPattern==='back'&&mode==='front')
   mode='back';
 return nlwB4PriorTarget(actor,mode);
};
const nlwB4PriorSkill=p2Skill;
p2Skill=function(actor){
 const descriptor=nlwB4PriorSkill(actor);
 if(!actor||actor.team!=='p'||battle?.mode!=='campaign'||!descriptor)return descriptor;
 const kind=actor.nlClassicWebPattern;
 if(['row','column','back'].includes(kind)&&descriptor.pattern==='single')
   return {...descriptor,pattern:kind,mult:descriptor.mult*.75};
 return descriptor;
};
const nlwB4PriorHit=p2Hit;
p2Hit=function(actor,target,kind,mult=1,opts={}){
 if(battle?.mode!=='campaign'||!actor||!target)return nlwB4PriorHit(actor,target,kind,mult,opts);
 if(actor.team==='p'&&actor.nlClassicWebAbility==='crit'&&['physical','tactic'].includes(kind))
   opts={...opts,crit:(opts.crit||0)+.045};
 if(target.team==='p'&&target.nlClassicWebAbility==='guard'&&kind==='physical')mult*=.93;
 return nlwB4PriorHit(actor,target,kind,mult,opts);
};
// Original 2D courtyard art: project-generated, NOT a source-game image.
const NLW_B4_BACKGROUND=new Image();
NLW_B4_BACKGROUND.src='data:image/webp;base64,__NL_B4_IMAGE_BASE64__';
const nlwB4PriorBackground=drawBackground;
drawBackground=function(ctx,now){
 if(!NLW_B4_BACKGROUND.complete||NLW_B4_BACKGROUND.naturalWidth<1)
   return nlwB4PriorBackground(ctx,now);
 ctx.save();ctx.drawImage(NLW_B4_BACKGROUND,0,0,1056,480);
 ctx.fillStyle='rgba(3,21,23,.17)';ctx.fillRect(0,0,1056,480);
 let shade=ctx.createLinearGradient(0,0,0,125);shade.addColorStop(0,'rgba(4,17,19,.75)');shade.addColorStop(1,'rgba(4,17,19,0)');
 ctx.fillStyle=shade;ctx.fillRect(0,0,1056,125);
 ctx.textAlign='center';ctx.font='bold 17px Georgia';ctx.fillStyle='#f7e3ba';
 ctx.shadowColor='#132126';ctx.shadowBlur=5;
 ctx.fillText((NATIONS[game.nation]?.name||'ĐỒNG MINH').toUpperCase()+' QUÂN',190,43);
 ctx.fillText('QUÂN ĐỊCH',858,43);ctx.font='bold 27px Georgia';ctx.fillText('VS',526,51);
 ctx.restore();
};
const nlwB4PriorDrawUnit=drawUnit;
drawUnit=function(ctx,unit,now){
 nlwB4PriorDrawUnit(ctx,unit,now);
 if(!unit?.nlClassicWebName)return;
 const pos=coords(unit);ctx.save();ctx.textAlign='center';ctx.font='bold 10px sans-serif';
 ctx.lineWidth=3;ctx.strokeStyle='rgba(7,19,19,.85)';ctx.fillStyle='#fff1cb';
 ctx.strokeText(unit.nlClassicWebName,pos.x,pos.y+61);ctx.fillText(unit.nlClassicWebName,pos.x,pos.y+61);
 ctx.restore();
};
const NLW_B4_GLYPHS={
 infantry:'<path d="M31 7l19 10-4 26-15 13-15-13-4-26z M31 14v34"/>',
 spear:'<path d="M32 5l8 13-6 7v33h-5V25l-6-7z M18 42h29"/>',
 cavalry:'<path d="M17 50l3-16 9-9 9 5 8 2 3 9-5 12h-6v-9H25l-2 9z M21 31l1-13 11-7 11 7-5 11"/>',
 archer:'<path d="M20 8q34 24 0 48 M17 7l29 24-29 24 M42 31H9 M40 27l7 4-7 4"/>',
 strategist:'<path d="M19 9h27v44H19z M25 17h15 M25 26h14 M25 35h11 M31 9v44"/>'
};
function nlwB4Glyph(u){return '<span class="nlw-crest nlw-family-'+u.family+' nlw-tier-'+u.tier+'">'+
 '<svg viewBox="0 0 64 64" width="47" height="47" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+
 (NLW_B4_GLYPHS[u.family]||NLW_B4_GLYPHS.infantry)+'</g></svg></span>';}
let nlwB4ActiveFamily='all',nlwB4Search='',nlwB4SelectedHero='',nlwB4Page=0;
function nlwB4Panel(){
 const known=game.roster.filter(id=>game.hero?.[id]);
 if(!known.includes(nlwB4SelectedHero))nlwB4SelectedHero=known[0]||'';
 const phrase=nlwB4Search.trim().toLocaleLowerCase('vi-VN');
 const list=NLW_B4.troops.filter(u=>
   (nlwB4ActiveFamily==='all'||u.family===nlwB4ActiveFamily)&&
   (!phrase||(u.name+' '+u.sourceName).toLocaleLowerCase('vi-VN').includes(phrase)));
 const pageMax=Math.max(0,Math.ceil(list.length/8)-1);nlwB4Page=Math.min(nlwB4Page,pageMax);
 const shown=list.slice(nlwB4Page*8,(nlwB4Page+1)*8);
 const selected=nlwB4Active(nlwB4SelectedHero);
 const tabs=[['all','Toàn bộ'],...Object.entries(NLW_B4_FAMILIES)];
 return '<section class="panel mini-box nlw-panel" data-nlw-b4-panel="troops">'+
 '<div class="nlw-title"><span class="nlw-seal">兵</span><div><h3>Ngũ Đại Binh Hệ · 55 Quân Chủng</h3><p class="tiny">5 cơ bản · 10 cấp hai · 40 cấp ba · Dữ liệu tên và chỉ số tham chiếu Lequ 2018; hiệu lực trận đánh thiết kế mô phỏng.</p></div></div>'+
 '<div class="nlw-toolbar"><label>Võ tướng <select data-nlw-hero>'+known.map(id=>'<option value="'+esc(id)+'" '+(id===nlwB4SelectedHero?'selected':'')+'>'+esc(HEROES[id]?.name||id)+'</option>').join('')+'</select></label>'+
 '<span class="nlw-current">'+esc(selected?'Đang chỉ huy: '+selected.name:'Chưa chọn quân chủng cổ điển')+'</span></div>'+
 '<div class="nlw-tabs">'+tabs.map(([id,n])=>'<button class="dark-button '+(id===nlwB4ActiveFamily?'picked':'')+'" data-nlw-filter="'+id+'">'+esc(n)+'</button>').join('')+'</div>'+
 '<label class="nlw-search">Tìm quân chủng <input type="search" data-nlw-search value="'+esc(nlwB4Search)+'" placeholder="Ví dụ: Hổ Báo Kỵ / 舞姬"></label>'+
 '<div class="nlw-grid">'+shown.map(u=>{
   const owned=selected?.id===u.id,level=game.buildings?.barracks||0,ready=nlwB4CanSelect(nlwB4SelectedHero,u.id),
     fee=nlwB4Cost(u.tier);
   return '<article class="nlw-unit" data-nlw-unit="'+esc(u.id)+'">'+nlwB4Glyph(u)+
   '<div class="nlw-txt"><b>'+esc(u.name)+'</b><small>'+esc(u.sourceName)+' · '+esc(u.familyName)+' · cấp '+u.tier+'</small>'+
   '<small>'+esc(({drum:'Cổ vũ sĩ khí',dancer:'Nhiễu loạn sĩ khí',line:'Đòn lan tuyến',back:'Tập kích hậu quân',guard:'Chống đỡ',crit:'Đòn chí mạng',counter:'Phản kích',control:'Kiềm chế',standard:'Công thủ cân bằng'})[u.ability]||'Hỗ trợ')+'</small></div>'+
   '<button class="gold-button" data-nlw-choose="'+esc(u.id)+'" '+(!ready||owned?'disabled':'')+'>'+
     (owned?'Đang dùng':level<u.tier?'Doanh Trại '+u.tier:'Chọn'+(fee?' · '+fmt(fee)+' Bạc':''))+'</button></article>';
 }).join('')+'</div>'+(!shown.length?'<p class="tiny">Không có kết quả.</p>':'')+
 '<div class="nlw-page"><button class="dark-button" data-nlw-page="prev" '+(nlwB4Page===0?'disabled':'')+'>◀ Trước</button>'+
 '<span>Trang '+(nlwB4Page+1)+'/'+(pageMax+1)+' · '+list.length+' loại quân</span>'+
 '<button class="dark-button" data-nlw-page="next" '+(nlwB4Page>=pageMax?'disabled':'')+'>Sau ▶</button></div>'+
 '<p class="tiny">Khi chuyển quân, đội hình và quân số vẫn giữ nguyên; chỉ số, chức năng dòng quân được áp dụng trong P2 và không tính hai lần. Cấp Doanh Trại/phí chuyển do dự án mô phỏng.</p></section>';
}
const nlwB4PriorBarracks=renderBarracks;
renderBarracks=function(){return nlwB4PriorBarracks()+nlwB4Panel();};
function nlwB4FormationPanel(){
 const current=NLW_B4.formations.find(f=>game.formation===f.id);
 return '<section class="panel mini-box nlw-panel" data-nlw-b4-panel="formations">'+
 '<div class="nlw-title"><span class="nlw-seal">陣</span><div><h3>Thập Đại Trận Pháp · 10 Trận Cổ Điển</h3><p class="tiny">Mười tên trận pháp WEB; các ô triển khai 3×3 và chỉ số là mô phỏng dự án, không sao chép bí quyết gốc.</p></div></div>'+
 '<div class="nlw-form-grid">'+NLW_B4.formations.map(f=>{
  const on=current?.id===f.id,settled=P3_PRESETS.some(p=>p.id===f.id+'-van');
  return '<div class="nlw-form" data-nlw-form="'+esc(f.id)+'"><div class="nlw-mini-grid">'+Array.from({length:9},(_,i)=>'<span class="'+(f.slots.includes(i)?'filled':'')+'"></span>').join('')+'</div>'+
   '<div><b>'+esc(f.name)+'</b><small>'+esc(f.role)+'</small><small>'+esc(f.lane)+' · '+(settled?'bổ sung runtime':'tương thích Save cũ')+'</small></div>'+
   '<button class="gold-button" data-nlw-formation="'+esc(f.id)+'" '+(on||battle?'disabled':'')+'>'+(on?'Đang dùng':'Bày trận')+'</button></div>';
 }).join('')+'</div>'+
 '<p class="tiny">Các preset 24 phương án dự án và trận Huyền Vũ cũ vẫn được giữ để Save v5 không mất đội hình.</p></section>';
}
const nlwB4PriorFormation=renderFormation;
renderFormation=function(){return nlwB4PriorFormation()+nlwB4FormationPanel();};
document.addEventListener('click',ev=>{
 const b=ev.target.closest?.('[data-nlw-filter],[data-nlw-page],[data-nlw-choose],[data-nlw-formation]');
 if(!b||b.disabled)return;
 if(b.dataset.nlwFilter){nlwB4ActiveFamily=b.dataset.nlwFilter;nlwB4Page=0;render();}
 else if(b.dataset.nlwPage){nlwB4Page=Math.max(0,nlwB4Page+(b.dataset.nlwPage==='next'?1:-1));render();}
 else if(b.dataset.nlwChoose)nlwB4Select(nlwB4SelectedHero,b.dataset.nlwChoose);
 else if(b.dataset.nlwFormation){const f=NLW_B4_FORM_BY_ID.get(b.dataset.nlwFormation);
   if(f){const ok=p3AssignPreset(f.id+'-van');if(ok)toast('Đã dùng '+f.name);}}
});
document.addEventListener('change',ev=>{
 if(ev.target.matches?.('[data-nlw-hero]')){nlwB4SelectedHero=ev.target.value;render();}
 if(ev.target.matches?.('[data-nlw-search]')){nlwB4Search=ev.target.value;nlwB4Page=0;render();}
});
const nlwB4Style=document.createElement('style');
nlwB4Style.textContent=__NL_B4_CSS__;document.head.appendChild(nlwB4Style);
if(window.__P2_ENABLE_QA__)window.__NL_WEB55_QA__=Object.freeze({
 troops:NLW_B4.troops,formations:NLW_B4.formations,choose:nlwB4Select,
 state:()=>structuredClone(nlwB4State()),active:nlwB4Active,
 unit:p2Unit,panel:nlwB4Panel,formationPanel:nlwB4FormationPanel,
 oldPresets:NLW_B4_OLD_P3_COUNT,newPresets:P3_PRESETS.length,
 source:'2018_DETAILS_2011_STRUCTURE',effectCoefficients:'PROJECT_SIMULATED',nativeAuthority:'P2_ONLY'});
// === end NL-CLASSIC-WEB-B4-V1 ===
