/* CHAT08: in-game preview of CHAT02/05 authoritative-source contracts.
 * Read-only: no combat event, Save mutation, reward or Wiki auto-promotion.
 * Designed for the existing single canonical Ngọa Long HTML.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else if(root)root.NLTacticalIntelViewV1=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";
  const html=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
  const categories={infantry:"Bộ",spear:"Thương",cavalry:"Kỵ",archer:"Cung",
    strategist:"Quan Văn",support:"Hỗ trợ",drum:"Trống"};
  function create({pack,director,troopBridge,projectTroops}={}){
    if(!pack||!director||!troopBridge||!projectTroops)throw Error("NL_TACTICAL_INTEL_INPUT_REQUIRED");
    const pve=director.compile(pack),audit=troopBridge.audit();
    if(pve.plans.length!==28||pve.bossStages.length!==8||audit.project!==25||
      audit.sourceWikiImported!==0||audit.liveIntegrated!==false||
      projectTroops.units?.length!==25)throw Error("NL_TACTICAL_INTEL_SOURCE_CONTRACT_MISMATCH");
    const map=new Map(pve.plans.map(p=>[p.stage,p]));
    function renderStage(stage){
      const plan=map.get(stage);
      if(!plan)return "";
      const units=plan.troops.map((type,i)=>
        "<li>Ô "+(plan.nativeSlots[i]+1)+": "+html(categories[type]||type)+"</li>").join("");
      const phase=plan.boss?
        "<p>Giai đoạn: "+html(plan.opening)+" → "+html(plan.pressure)+
        " → "+html(plan.desperate)+"</p>":"<p>Vai trò đội hình: "+html(plan.selectedProfile)+"</p>";
      return '<section class="nl-v2-intel" data-nl-v2-intel="'+plan.stage+
        '" data-nl-v2-boss="'+(plan.boss?1:0)+'"><h3>'+
        (plan.boss?'👑 Hồ sơ Boss V2: ':'🛡️ Đối chiếu đội hình V2: ')+
        html(plan.bossName||"Địch quân")+'</h3>'+
        '<p>Đội hình: '+plan.activeCount+' đơn vị · '+html(plan.presetId)+
        ' · '+html(plan.bossIdentity||"normal")+'</p>'+phase+
        '<details><summary>Vị trí 3×3 nguồn dự án</summary><ul>'+units+'</ul></details>'+
        '<small>Thông tin chiến thuật V2 là mô phỏng để đối chiếu; AI/Boss A1 chạy qua lõi P2; HP, sĩ khí, replay và phần thưởng chỉ do lõi P2 xử lý.</small></section>';
    }
    function renderTroops(){
      const rows=projectTroops.units.map(x=>
        '<li>'+html(x.name)+' · '+html(categories[x.family]||x.family)+
        ' · bậc '+html(x.projectTier)+' · '+html(x.combatBehavior?.mechanic)+'</li>').join('');
      return '<details class="nl-v2-intel" data-nl-v2-troops="25"><summary>'+
        'Danh mục 25 mẫu quân nguyên bản (CHAT02)</summary><ul>'+rows+
        '</ul><small>Bản A1 dùng 25 hồ sơ dự án để gắn ID vào trận và chỉ bật phụ trợ xung kích cơ bản; 372 bản ghi Wiki không tự trở thành quân playable.</small></details>';
    }
    function summary(){return Object.freeze({
      stagePlans:28,bossPlans:8,projectTroops:25,
      officialWikiTroopBindings:0,liveV2CombatEnabled:true,liveV2TroopAddons:"CHARGE_ONLY",
      saveAuthority:"native-v5",rewardAuthority:"native-p2",source:"SIMULATED"
    });}
    return Object.freeze({renderStage,renderTroops,summary});
  }
  return Object.freeze({create});
});
