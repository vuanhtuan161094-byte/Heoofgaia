"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const units=require('../data/ngoalong/modules/troops/project_playable_v1.json').units;
const pack=require('../data/ngoalong/alpha_content.json');
const formation=require('../data/ngoalong/modules/combat/formation_adapter_v2.js');
const bridge=require('../data/ngoalong/modules/troops/troop_live_bridge_v2.js');
const contract=require('../data/ngoalong/modules/troops/live_integration_contract_v2.json');
const evolution=require('../data/ngoalong/modules/troops/evolution_contract_v1.json');
test('25 project-only identities: 7 bases + 18 R03 evolutions, not 55 historic WEB types',()=>{
 assert.equal(units.length,25);
 assert.equal(new Set(units.map(x=>x.id)).size,25);
 assert.equal(units.filter(x=>!x.legacyEngineMapping.legacyEvolutionId).length,7);
 assert.equal(units.filter(x=>!!x.legacyEngineMapping.legacyEvolutionId).length,18);
 assert.ok(units.every(x=>x.provenance.identity==='SIMULATED'));
 const b=bridge.create(contract,{units},evolution);
 assert.equal(b.audit().project,25);
 assert.equal(b.audit().sourceWikiImported,0);
 assert.equal(b.audit().standaloneStepBattleEnabled,false);
 for(const u of units)assert.equal(b.lookup(u.id).projectId,u.id);
});
test('6x4 formation source has 24 unique preserved Save-preset keys and valid 3x3 slot layouts',()=>{
 const forms=formation.compile(pack.formations);
 assert.equal(forms.length,24);assert.equal(new Set(forms.map(x=>x.presetId)).size,24);
 for(const f of forms){
  assert.equal(f.nativeSlots.length,5);
  assert.equal(new Set(f.nativeSlots).size,5);
  assert.ok(f.nativeSlots.every(x=>x>=0&&x<9));
  assert.equal(f.provenance.classification,'SIMULATED');
  assert.deepEqual(f.resolverSlots,f.nativeSlots.map(x=>x+1));
 }
});
test('all 14 core +207 project hero skill descriptors remain deterministic',()=>{
 const skills={...pack.skills.heroById,...pack.skills.hero207ById};
 assert.equal(Object.keys(pack.skills.heroById).length,14);
 assert.equal(Object.keys(pack.skills.hero207ById).length,207);
 assert.equal(Object.keys(skills).length,221);
 assert.ok(Object.values(skills).every(s=>['physical','tactic','magic'].includes(s.kind)&&
  ['single','double','row','column','all','back','heal'].includes(s.pattern)&&
  s.provenance.classification==='SIMULATED'));
});
