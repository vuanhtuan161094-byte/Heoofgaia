/* HG43 — 40-unit encyclopedia and live battle intel.
 * PRESENTATION ONLY. Read E.HG40_TRAITS (real 40 skills), E.C.units (original
 * catalog stats), and b.hg40.cd/statuses (actual combat receipts). No new RNG,
 * Save v07 field, damage modifier, passive, hero/AI or second offline game.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE,C=root.HOG_CATALOG,traits=E?.HG40_TRAITS;
if(!E||!C||!traits||Object.keys(traits).length!==40)
 throw Error('HG43 requires 40 canonical HG40 troop traits');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>E.fmt?.(n)??String(n);
const pct=n=>Number((Number(n||0)*100).toFixed(2)).toLocaleString('vi-VN')+'%';
const names={T:'Đỡ đòn',C:'Đột kích',X:'Xạ kích',H:'Hỗ trợ'};
const statusNames={atkdown:'Giảm ATK',defdown:'Phá giáp',slow:'Chậm',root:'Trói',
 stun:'Choáng',damageDown:'Suy yếu',dot:'Sát thương theo lượt',mark:'Đánh dấu',
 buff:'Cường hóa',dash:'Bứt tốc'};
const passive=new Set(['guard','rangedGuard','meleeGuard','firstGuard','thirdBonus','thirdPierce',
 'rage','wounded','antiMelee','antiRanged','killBuff']);
const combinations={C:'X',X:'H',H:'T'};
const guardCounters={T:'Khi bị vai trò Đột kích (C) tấn công: giảm 10% sát thương; không có +12% sát thương chủ động.',
 C:'Đánh vai trò Xạ kích (X): +12% sát thương (chưa tính các hiệu ứng khác).',
 X:'Đánh vai trò Hỗ trợ (H): +12% sát thương (chưa tính các hiệu ứng khác).',
 H:'Đánh vai trò Đỡ đòn (T): +12% sát thương (chưa tính các hiệu ứng khác).'};
function description(t){
 if(!t)return {condition:'Không có kỹ năng HG40 cho đơn vị này',effect:'Không áp dụng'};
 const a=pct(t.a),b=pct(t.b);
 switch(t.kind){
  case 'guard':return {condition:'Khi nhận đòn',effect:'Giảm '+a+' sát thương; '+b+' nếu có đồng minh đứng cạnh 1 ô'};
  case 'rangedGuard':return {condition:'Khi bị quân đánh xa tấn công',effect:'Giảm '+a+' sát thương'};
  case 'meleeGuard':return {condition:'Khi bị quân cận chiến tấn công',effect:'Giảm '+a+' sát thương'};
  case 'firstGuard':return {condition:'Đòn đánh đầu tiên nhận trong trận',effect:'Giảm '+a+' sát thương, một lần cho mỗi stack'};
  case 'thirdBonus':return {condition:'Mỗi đòn đánh trúng thứ ba của stack',effect:'Tăng '+a+' sát thương cho đòn thứ ba'};
  case 'thirdPierce':return {condition:'Mỗi đòn đánh trúng thứ ba',effect:'Xuyên giáp '+a+'; riêng Boss tối đa '+b+'; chịu trần xuyên giáp chung'};
  case 'rage':return {condition:'Khi HP stack còn dưới 50% HP ban đầu',effect:'Tăng '+a+' sát thương'};
  case 'wounded':return {condition:'Đánh mục tiêu đã mất HP',effect:'Tăng '+a+' sát thương'};
  case 'antiMelee':return {condition:'Đánh quân cận chiến',effect:'Tăng '+a+' sát thương; '+b+' nếu có đồng minh áp sát mục tiêu'};
  case 'antiRanged':return {condition:'Áp sát quân đánh xa ở khoảng cách 1 ô',effect:'Tăng '+a+' sát thương'};
  case 'killBuff':return {condition:'Đòn đánh làm đối phương mất ít nhất 1 lính',effect:'Tự tăng '+a+' sát thương trong '+t.b+' lượt'};
  case 'mark':return {condition:'Đánh trúng địch và kỹ năng sẵn sàng',effect:'Đánh dấu '+t.b+' lượt: đòn từ cùng tướng lên mục tiêu tăng '+a+' sát thương'};
  case 'charge':return {condition:'Vừa di chuyển rồi tấn công trúng ở lượt kỹ năng sẵn sàng',effect:'Tăng '+a+' sát thương đòn xung phong'};
  case 'heal':return {condition:'Đánh trúng; đồng minh trong 2 ô bị thương',effect:'Hồi '+a+' HP tối đa của stack đồng minh được chọn (không vượt trần)'};
  case 'shield':return {condition:'Đánh trúng; có đồng minh trong 2 ô',effect:'Tạo khiên '+a+' HP tối đa cho 1 stack; trần khiên 25%, tối đa 2 lượt'};
  case 'multiShield':return {condition:'Đánh trúng; có đồng minh trong 2 ô',effect:'Mỗi stack trong tối đa 2 stack đồng minh nhận khiên '+a+' HP; trần 25%, tối đa 2 lượt'};
  case 'judgment':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Tăng '+b+' sát thương với địch thường; '+a+' với Boss'};
  case 'slow':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Giảm 1 bước di chuyển của địch trong '+t.b+' lượt, từ lượt sau'};
  case 'dash':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Tăng 1 bước di chuyển ở lượt kế tiếp'};
  case 'root':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Trói '+t.b+' lượt; với Boss đổi thành Chậm'};
  case 'cleanse':return {condition:'Đánh trúng; đồng minh trong 2 ô có hiệu ứng xấu',effect:'Xóa 1 hiệu ứng xấu; nếu không có sẽ thử tạo khiên '+a+' cho đồng minh'};
  case 'splash':return {condition:'Đánh trúng; có một mục tiêu khác đứng cạnh đích 1 ô',effect:'Gây thêm '+a+' sát thương đòn trúng lên 1 mục tiêu lân cận'};
  case 'splashSlow':return {condition:'Đánh trúng; có một mục tiêu khác đứng cạnh đích 1 ô',effect:'Gây thêm '+a+' sát thương lên 1 mục tiêu lân cận và làm Chậm 1 lượt'};
  case 'defdown':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Giảm '+a+' DEF trong '+t.b+' lượt; với Boss bị giới hạn 10–15% tùy kỹ năng'};
  case 'atkdown':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Giảm '+a+' ATK trong '+t.b+' lượt'};
  case 'dot':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Mỗi lượt gây '+a+' sát thương đã trúng, tối thiểu 1 HP; trong '+t.b+' lượt'};
  case 'stun':return {condition:'Đánh trúng khi kỹ năng sẵn sàng',effect:'Choáng địch thường 1 lượt (có miễn nhiễm choáng 4 lượt); Boss chỉ bị giảm '+a+' sát thương trong 1 lượt'};
  case 'lifesteal':return {condition:'Đánh trúng khi kỹ năng sẵn sàng và stack chưa đầy HP',effect:'Hút '+a+' sát thương đã gây để hồi HP cho chính stack, không vượt HP tối đa'};
  default:throw Error('HG43 lacks real HG40 kind '+t.kind);
 }
}
function baseUnit(id){
 return Object.values(C.units).flat().find(u=>u.id===id)||null;
}
function profile(id){
 const unit=baseUnit(id),trait=traits[id];
 if(!unit||!trait)return null;
 return {unit,trait,role:names[trait.role]||trait.role,description:description(trait),
  passive:passive.has(trait.kind),cooldown:trait.cd,range:E.unitTacticalRange(unit),movement:E.unitTacticalMovement(unit),
  counter:guardCounters[trait.role]};
}
function timing(b,actor){
 const t=traits[actor?.unitId];if(!t)return 'Không có kỹ năng HG40';
 if(passive.has(t.kind))return 'Nội tại · không CD';
 if(!b?.hg40||b.hg40.v!==1)return 'Chưa có trạng thái HG40';
 const ready=Number(b.hg40.cd?.[actor.id+':'+t.kind]||1);
 const remain=Math.max(0,ready-b.turn);
 return remain?'CD còn '+remain+' lượt':'Sẵn sàng khi đủ điều kiện';
}
function statuses(b,actor){
 if(!actor||!b?.hg40)return [];
 const h=b.hg40;
 const active=(h.statuses||[]).filter(x=>x.target===actor.id&&x.until>=b.turn).map(x=>{
  const pending=(x.starts??0)>b.turn,amount=['atkdown','defdown','damageDown','mark','buff'].includes(x.kind)?' '+pct(x.value):
   x.kind==='dot'?' '+fmt(x.value)+' HP/lượt':'';
  return (pending?'Sắp hiệu lực: ':'')+(statusNames[x.kind]||x.kind)+amount+
   ' · '+Math.max(0,x.until-b.turn+1)+' lượt';
 });
 const shield=h.shields?.[actor.id];
 if(shield?.amount>0&&shield.until>b.turn)active.unshift('Khiên '+fmt(Math.max(0,Math.min(shield.amount,Math.ceil(actor.count*actor.hp*.25))))+' HP');
 return active;
}
function matchup(self,other){
 const a=traits[self?.unitId],b=traits[other?.unitId];
 if(!a||!b)return 'Không xác định: đối thủ không có vai trò HG40 trong danh mục 40 quân.';
 const parts=[];
 if(combinations[a.role]===b.role)parts.push('Có lợi: +12% sát thương theo vai trò');
 if(combinations[b.role]===a.role)parts.push('Bất lợi: đối thủ +12% sát thương theo vai trò');
 if(a.role==='C'&&b.role==='T')parts.push('Đỡ đòn đối phương giảm 10% sát thương từ Đột kích');
 if(a.role==='T'&&b.role==='C')parts.push('Bạn giảm 10% sát thương từ Đột kích đối phương');
 return parts.join(' · ')||'Trung tính theo vai trò; kỹ năng riêng vẫn có thể tạo lợi thế.';
}
function card(u,{art='',compact=false}={}){
 const p=profile(u?.id);if(!p)return '';
 const {trait,unit,role,description:d}=p;
 const body='<div class="hg43-unit-stats">'+[
  ['HP',fmt(unit.hp)],['ATK',fmt(unit.atk)],['DEF',fmt(unit.def)],
  ['SPD bản đồ',fmt(unit.spd)],['Di chuyển',p.movement+' ô/lượt'],['Tầm đánh',p.range+' ô'],['Chở',fmt(unit.load)]
 ].map(([key,val])=>'<span><small>'+key+'</small><b>'+val+'</b></span>').join('')+'</div>'+
 '<p class="hg43-skill-desc"><b>Điều kiện:</b> '+safe(d.condition)+'</p>'+
 '<p class="hg43-skill-desc"><b>Mức hiệu ứng:</b> '+safe(d.effect)+'</p>'+
 '<div class="hg43-counter"><b>⚖ Khắc chế:</b> '+safe(p.counter)+'</div>';
 if(compact)return '<details class="hg43-recruit-intel" data-hg43-unit="'+safe(unit.id)+'"><summary>✦ '+
  safe(trait.name)+' · '+safe(role)+' · '+(p.passive?'Nội tại':'CD '+p.cooldown+' lượt')+
  '</summary>'+body+'</details>';
 return '<article class="hg43-profile-card" data-hg43-unit="'+safe(unit.id)+'">'+
  '<div class="hg43-profile-head">'+art+'<div><small>'+safe(C.races[unit.race]?.name||unit.race)+
  ' · Bậc '+unit.tier+' · '+safe(unit.type)+'</small><h3>'+safe(unit.name)+'</h3>'+
  '<div class="hg43-skill-name">✦ '+safe(trait.name)+' <span class="hg43-skill-pill">'+safe(role)+
  ' · '+(p.passive?'Nội tại / 0 CD':'CD '+p.cooldown+' lượt')+'</span></div></div></div>'+
  body+'</article>';
}
function codex(race,art){
 if(!C.units[race])throw Error('Chủng tộc không hợp lệ');
 const namesRace={human:'👑 Human',elf:'🌿 Elf',orc:'🔥 Orc',undead:'☠ Undead'};
 return '<section class="hg43-codex" data-hg43-race="'+safe(race)+'">'+
 '<header><div><span class="eyebrow">HG43 • BÁCH KHOA CHIẾN THUẬT</span><h2>📖 Hồ sơ 40 binh chủng</h2>'+
 '<p>Chọn chủng tộc để xem đủ 10 quân mỗi tộc. HP/ATK/DEF là chỉ số chiến đấu, SPD chỉ tăng tốc hành quân/trinh sát trên bản đồ; số ô di chuyển xác định theo loại quân và kỹ năng.</p></div><span class="hg43-tally">40/40 kỹ năng</span></header>'+
 '<nav class="hg43-race-tabs" aria-label="Chủng tộc trong bách khoa">'+Object.keys(namesRace).map(r=>
 '<button type="button" data-action="hg43-army-race" data-race="'+r+'" aria-pressed="'+(race===r)+'" class="'+(race===r?'active':'')+'">'+namesRace[r]+' · 10</button>').join('')+'</nav>'+
 '<div class="hg43-codex-grid">'+C.units[race].map(u=>card(u,{art:art?.(u)||''})).join('')+'</div>'+
 '<p class="hg43-source-note">Không có xác suất ngẫu nhiên mặc định: các % là độ mạnh của hiệu ứng. Vai trò: C → X → H → T (+12% sát thương theo cặp); T giảm 10% sát thương từ C. Chỉ số thực chiến còn chịu thay đổi từ tướng, Boss, phép và trạng thái.</p></section>';
}
function battleCard(b,actor,other,side){
 if(!actor)return '<div class="hg43-battle-unit empty">'+(side==='player'?'Chạm đội quân ta để xem hồ sơ.':'Chạm một đội quân địch để xem hồ sơ.')+'</div>';
 const p=profile(actor.unitId),unit=p?.unit;
 const pctHP=actor.count*actor.hp?Math.min(100,Math.max(0,actor.pool/(actor.initial*actor.hp)*100)):0;
 const rows=[
  ['Quân',fmt(actor.count)],['HP thực',fmt(Math.ceil(actor.pool))+' / '+fmt(actor.initial*actor.hp)],
  ['ATK',fmt(actor.atk)],['DEF',fmt(actor.def)],['SPD bản đồ',fmt(Number(actor.spd.toFixed(2)))],
  ['Tầm đánh',actor.range+' ô'],['Di chuyển',E.battleMoveSteps(b,actor.id)+' ô/lượt']
 ];
 return '<section class="hg43-battle-unit" data-hg43-combat-unit="'+safe(actor.id)+'" data-side="'+safe(side)+'">'+
  '<header><b>'+safe(actor.name)+'</b><span>'+safe(p?p.role:'Quái / Boss')+
   (side==='enemy'&&b.focused!==actor.id?' · Xem trước':' · Đang chọn')+'</span></header>'+
  '<div class="hg43-battle-stats">'+rows.map(([key,val])=>'<span><small>'+key+'</small><b>'+val+'</b></span>').join('')+'</div>'+
  '<div class="hg43-battle-hp"><i style="width:'+pctHP.toFixed(2)+'%"></i></div>'+
  (p?'<div class="hg43-battle-skill"><b>✦ '+safe(p.trait.name)+'</b><span>'+
    (p.passive?'Nội tại':('CD '+p.cooldown+' lượt · '+safe(timing(b,actor))))+
    '</span></div><p>'+safe(p.description.condition)+'</p><p>'+safe(p.description.effect)+'</p>'+
    '<small>Khắc chế: '+safe(p.counter)+'</small>':
   '<p class="hg43-unknown">Quái/Boss không thuộc 40 kỹ năng của bốn chủng tộc; không tự gán kỹ năng.</p>')+
  (unit?'<small class="hg43-base-note">Chỉ số gốc: HP '+fmt(unit.hp)+' · ATK '+fmt(unit.atk)+' · DEF '+fmt(unit.def)+
    ' · SPD bản đồ '+fmt(unit.spd)+'</small>':'')+
  '<p class="hg43-live-matchup">⚖ '+safe(matchup(actor,other))+'</p>'+
  '<div class="hg43-live-status"><b>Trạng thái:</b> '+(statuses(b,actor).map(s=>'<em>'+safe(s)+'</em>').join('')||
    '<span>Không có hiệu ứng HG40 đang hoạt động</span>')+'</div></section>';
}
function battle(b,selected,focused){
 if(!b)return '';
 return '<section class="hg43-combat-intel" data-hg43-combat-intel="true">'+
  '<div class="hg43-combat-intel-head"><b>📖 HỒ SƠ QUÂN & KỸ NĂNG TRONG TRẬN</b><small>Đọc từ stack thật · CD theo lượt</small></div>'+
  '<div class="hg43-combat-cards">'+battleCard(b,selected,focused,'player')+
   battleCard(b,focused,selected,'enemy')+'</div></section>';
}
root.HOG_HG43_UI=Object.freeze({
 version:1,total:40,profile,description,timing,statuses,matchup,card,codex,battle,
 roles:Object.freeze({...names})
});
})(typeof globalThis!=='undefined'?globalThis:this);
