// === NL-CLASSIC-A-RESEARCH-LATE: bind after R03 final research catalog ===
// R03 remains the authoritative combat technology progression. This replaces
// ONLY the payment contract to use Silver + Chiến công, not a second modifier.
if(typeof nlr03TechCost!=='function'||typeof nlAState!=='function'||typeof NLR03_RESEARCH==='undefined')
  throw Error('NL-CLASSIC-A: research dependencies missing');
techCost=function(id){
  const old=nlr03TechCost(id),level=game.technology[id]||0;
  return {silver:old.silver,merit:(level+1)*35};
};
research=function(id){
  const technology=TECHNOLOGY[id];if(!technology)return;
  const level=game.technology[id]||0,next=level+1,
    gate=NLR03_RESEARCH.progression.academyLevelsPerTechLevel;
  if(level>=technology.max)return toast('Đã đạt cấp tối đa.');
  if(game.buildings.academy<Math.ceil(next/gate))return toast('Cần nâng Quân Sư Phủ để nghiên cứu tiếp.');
  const cost=techCost(id);
  if(!payment(cost))return toast('Thiếu Bạc hoặc Chiến công để nghiên cứu.');
  game.technology[id]=next;
  nlAState().meritSpent+=cost.merit;
  countTask('research');
  log('Nghiên cứu '+technology.name+' cấp '+next+' bằng Bạc và Chiến công (SIMULATED).');
  save();toast('Hoàn tất khoa kỹ: '+technology.name);render();
};
renderTechnology=function(){
  const gate=NLR03_RESEARCH.progression.academyLevelsPerTechLevel;
  const cards=Object.entries(TECHNOLOGY).map(([id,technology])=>{
    const level=game.technology[id]||0,next=level+1,cost=techCost(id),
      max=level>=technology.max,locked=game.buildings.academy<Math.ceil(next/gate);
    return `<div class="panel feature-card" data-research-card="${id}"><div class="feature-title"><span class="feature-icon">${technology.icon}</span><div><h3>${esc(technology.name)}</h3><div class="tiny">Cấp ${level}/${technology.max}</div></div></div><p>${esc(technology.desc)}</p><div class="progress"><div style="width:${Math.min(100,level/technology.max*100)}%"></div></div><div class="feature-footer"><span class="cost">${earnedText(cost)}</span><button class="gold-button" data-research="${id}" ${max||locked?'disabled':''}>${max?'Tối đa':locked?'Cần học viện':'Nghiên cứu'}</button></div></div>`;
  }).join('');
  return head('Binh pháp kỳ mưu','Quân Sư Phủ · Khoa Kỹ',
    'Dùng Bạc và Chiến công để nghiên cứu. Mức phí SIMULATED; hiệu ứng dùng lõi chiến đấu R03.',
    `<span class="pill">Học viện cấp ${game.buildings.academy}</span>`)+
    `<div class="panel mini-box"><h3>📚 Khoa kỹ chiến đấu</h3><p class="tiny">Không còn bắt buộc dùng nguyên liệu Sắt hay Uy danh cho nghiên cứu cơ bản. Chiến công nhận từ vượt ải lần đầu.</p></div><div class="feature-grid">${cards}</div>`;
};
// === end NL-CLASSIC-A-RESEARCH-LATE ===
