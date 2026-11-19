"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const pack=require("../data/ngoalong/alpha_content.json");
const pve=require("../data/ngoalong/modules/combat/pve_director_v2.js");
const bridge=require("../data/ngoalong/modules/troops/troop_live_bridge_v2.js");
const contract=require("../data/ngoalong/modules/troops/live_integration_contract_v2.json");
const units=require("../data/ngoalong/modules/troops/project_playable_v1.json");
const evolutions=require("../data/ngoalong/modules/troops/evolution_contract_v1.json");
const UI=require("../data/ngoalong/integration/tactical_intel_view_v1.js");
const troop=bridge.create(contract,units,evolutions);
const view=UI.create({pack,director:pve,troopBridge:troop,projectTroops:units});

test("current canonical source covers 28 actual project stages and eight authored Boss plans",()=>{
  const s=view.summary();
  assert.equal(s.stagePlans,28);
  assert.equal(s.bossPlans,8);
  assert.equal(s.projectTroops,25);
});
test("unverified Wiki numeric identities do not become playable troops",()=>{
  const s=view.summary();
  assert.equal(s.officialWikiTroopBindings,0);
  assert.equal(s.liveV2CombatEnabled,true);
  assert.equal(s.liveV2TroopAddons,"CHARGE_ONLY");
  assert.equal(s.rewardAuthority,"native-p2");
});
test("all 28 tactical dossiers render without adding new gameplay rewards",()=>{
  const snapshot=JSON.stringify(pack);
  for(let stage=1;stage<=28;stage++){
    const html=view.renderStage(stage);
    assert.match(html,new RegExp('data-nl-v2-intel="'+stage+'"'));
    assert.match(html,/SIMULATED|mô phỏng|mô phỏng để đối chiếu/);
    assert.doesNotMatch(html,/<script|data-battle=|data-buy=/i);
  }
  assert.equal(JSON.stringify(pack),snapshot);
});
test("all eight Boss tactics preserve native P2 HP, morale and reward authority",()=>{
  const bosses=[2,5,8,12,16,20,24,28];
  for(const id of bosses){
    assert.match(view.renderStage(id),/data-nl-v2-boss="1"/);
    assert.match(view.renderStage(id),/HP, sĩ khí, replay và phần thưởng chỉ do lõi P2/);
  }
  assert.match(view.renderStage(28),/final-war-drum/);
  assert.match(view.renderStage(1),/data-nl-v2-boss="0"/);
});
test("25 original project units are disclosed without Wiki auto-import",()=>{
  const html=view.renderTroops();
  assert.match(html,/data-nl-v2-troops="25"/);
  assert.match(html,/25 hồ sơ dự án/);
  assert.match(html,/25 mẫu quân/);
  assert.equal((html.match(/<li>/g)||[]).length,25);
});
