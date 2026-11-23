// === NL-CLASSIC-B1-V1: one native battle, classic formation and morale advisor ===
// No resolver, hit, status or timer. Read-only hints from the authoritative
// Save-v5 roster, stage NPCs and native P2 battle. Pricing/formulas SIMULATED.
const NLB1_COUNTERS=Object.freeze(Object.fromEntries(
  NL_GAME_DATA.troops.counterCycle.map(e=>[e.attacker,e.defender])));
const NLB1_LABELS=Object.freeze({infantry:'Bộ Binh',spear:'Thương Binh',
  cavalry:'Kỵ Binh',archer:'Cung Binh',strategist:'Quan Văn',
  support:'Hỗ trợ',drum:'Kỳ Cổ Thủ'});
const NLB1_BOSS_STAGES=Object.freeze([2,5,8,12,16,20,24,28]);
function nlB1HeroTroop(id){
  const evolve=typeof nlr03BranchFor==='function'?nlr03BranchFor(id):null;
  return evolve?.troop||game.troopModes?.[id]||HEROES[id]?.type||'support';
}
function nlB1StageIntel(stage){
  const encounter=NL_GAME_DATA.campaign.encounters.find(x=>x.stage===stage);
  const npc=encounter&&NL_GAME_DATA.campaign.npcs.find(x=>x.id===encounter.npcId);
  const friendly=(game.slots||[]).slice(0,9).map((id,slot)=>id?({
    id,slot,troop:nlB1HeroTroop(id),name:HEROES[id]?.name||id
  }):null).filter(Boolean);
  const enemy=(npc?.units||[]).map((unit,index)=>({
    index,troop:unit.troopId||'unknown'
  }));
  const favorable=[],unfavorable=[];
  for(const friend of friendly)for(const foe of enemy){
    if(NLB1_COUNTERS[friend.troop]===foe.troop)
      favorable.push({hero:friend.name,against:foe.troop});
    else if(NLB1_COUNTERS[foe.troop]===friend.troop)
      unfavorable.push({hero:friend.name,against:foe.troop});
  }
  return {stage,boss:encounter?.boss===true,enemyName:npc?.name||'',
    deployed:friendly.length,slots:(game.slots||[]).slice(0,9),
    friendly,enemy,favorable,unfavorable,skillThreshold:100,
    provenance:'CLASSIC_WEB_2011_FAMILY_ORDER__PROJECT_SIMULATED_MULTIPLIERS'};
}
function nlB1TroopName(type){return NLB1_LABELS[type]||type;}
function nlB1Advisor(stage){
  const intel=nlB1StageIntel(stage);
  if(!intel.enemy.length)return '';
  const examples=intel.favorable.slice(0,3).map(
    x=>esc(x.hero)+' khắc '+esc(nlB1TroopName(x.against))).join(' · ');
  const risks=intel.unfavorable.slice(0,2).map(
    x=>esc(x.hero)+' bị '+esc(nlB1TroopName(x.against))+' khắc').join(' · ');
  return '<section class="panel mini-box nlb1-advisor" data-nlb1-advisor="'+stage+'">'+
    '<h3>🛡️ Tham mưu Ngọa Long · Khắc chế & sĩ khí</h3>'+
    '<p class="tiny">Đội hình 3×3: '+intel.deployed+'/5 tướng · Địch: '+esc(intel.enemyName)+
    (intel.boss?' · 👑 BOSS':'')+'.</p>'+
    '<div class="nlb1-facts"><span>Bộ → Thương → Kỵ → Bộ</span>'+
    '<span>Chiến pháp cần <b>100 sĩ khí</b></span>'+
    '<span>Kỳ Cổ Thủ hỗ trợ tích sĩ khí</span></div>'+
    '<p class="tiny">Lợi thế trong đội hiện tại: '+(examples||'Chưa có cặp đối đầu thuận lợi được nhận diện')+'.</p>'+
    '<p class="tiny">Cần đề phòng: '+(risks||'Chưa có cặp bị khắc chế trực tiếp')+'.</p>'+
    '<p class="tiny">Tư liệu web cổ điển xác nhận quan hệ và ngưỡng; mọi hệ số/AI trong game là SIMULATED.</p>'+
    '<button type="button" class="dark-button" data-nlb1-formation="1">🛡️ Mở Bày Trận để đổi chiến thuật</button>'+
    '</section>';
}
const nlB1PriorCampaign=renderCampaign;
renderCampaign=function(){return nlB1PriorCampaign()+nlB1Advisor(selectedStage);};
const nlB1PriorBattleShell=renderBattleShell;
renderBattleShell=function(){
  const value=nlB1PriorBattleShell();
  if(!battle||battle.mode!=='campaign')return value;
  const mount=$('battle-mount'),header=mount?.querySelector('.battle-head');
  if(!header)return value;
  mount.querySelector('[data-nlb1-battle]')?.remove();
  const prep=team=>battle[team].filter(u=>u.hp>0);
  const ready=team=>prep(team).filter(u=>u.morale>=100).length;
  header.insertAdjacentHTML('afterend',
    '<div class="nlb1-battle" data-nlb1-battle="1">⚔️ Sĩ khí 100 → chiến pháp · Ta: <b>'+
    ready('p')+'/'+prep('p').length+'</b> tướng sẵn sàng · Địch: <b>'+
    ready('e')+'/'+prep('e').length+'</b> · Nhịp trận '+battle.round+
    ' · Kỳ Cổ Thủ hỗ trợ sĩ khí</div>');
  return value;
};
document.addEventListener('click',function(e){
  const button=e.target.closest?.('[data-nlb1-formation]');
  if(!button)return;
  document.querySelector('.nav[data-tab="formation"]')?.click();
});
const nlB1Style=document.createElement('style');
nlB1Style.textContent='.nlb1-advisor{border-color:#b39756}.nlb1-advisor h3{font-size:15px;color:#ebd49e}.nlb1-facts{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0}.nlb1-facts span{border:1px solid #776e50;background:#27342f;padding:5px 9px;border-radius:5px;font-size:11px}.nlb1-battle{padding:5px 10px;font-size:11px;background:#283d32;color:#eadfbd;border:1px solid #87754a}.nlb1-battle b{color:#f2d69b}';
document.head.appendChild(nlB1Style);
if(window.__P2_ENABLE_QA__)window.__NL_B1_QA__=Object.freeze({
 version:1,stageIntel:nlB1StageIntel,advisor:nlB1Advisor,
 cycle:NLB1_COUNTERS,threshold:100,source:'CLASSIC_WEB_2011_REFERENCES',
 nativeAuthority:'P2',extraMoraleWrites:0,extraRewardWrites:0
});
// === end NL-CLASSIC-B1-V1 ===
