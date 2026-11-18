"use strict";
/** Chat 01 hero-only focused checks. No browser, generator, Save or CI mutation. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  loadCatalogue,validateIndex,materializeProfiles,validateProfiles,
  buildSkillDescriptors,keyOfName
} = require("../tools/nl_hero_catalogue.js");
const root = path.resolve(__dirname, "..");
const read = p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const index = read("data/ngoalong/modules/heroes/wiki_catalogue_v1.json");
const refs = read("data/ngoalong/group02_wiki/heroes.json").heroes;
const handoff = read("data/ngoalong/modules/heroes/skills_handoff_v1.json");
const contract = read("data/ngoalong/modules/heroes/hero_development_contract_v1.json");
const result = loadCatalogue(root);
let checks = 0;
function check(name,fn){ fn(); checks++; console.log("PASS NL_HERO: "+name); }
function invalid(mutator){
  const broken = structuredClone(index);
  mutator(broken);
  assert.throws(()=>validateIndex(broken,refs), /NL_HERO_CONTRACT/);
}
check("364 unique IDs and source-confirmed faction distribution",()=>{
  assert.equal(result.inventory.wikiRecords,364);
  assert.deepEqual(result.inventory.byFaction,{"Ngụy":40,"Thục":38,"Ngô":39,"Quần":174,"Trung lập":73});
  assert.equal(new Set(result.profiles.map(x=>x.id)).size,364);
});
check("363 distinct names; two Trương Hoành entries retained for review",()=>{
  assert.equal(result.inventory.uniqueNames,363);
  assert.equal(result.inventory.unresolvedNameCollisions.length,1);
  const x=result.profiles.filter(h=>keyOfName(h.name)==="trương hoành");
  assert.equal(x.length,2);
  assert.deepEqual(x.map(h=>h.faction),["Ngô","Trung lập"]);
  assert(x.every(h=>h.identityStatus==="HOMONYM_REVIEW"));
});
check("all 50 earlier source profiles match by name/faction/grade",()=>{
  assert.equal(result.inventory.legacyReferenceMatches,50);
  assert.equal(result.profiles.filter(x=>x.aliases.legacyReferenceId).length,50);
});
check("364 explicit UNKNOWN mechanics and no unreviewed playable promotion",()=>{
  assert.equal(result.readiness.REFERENCE_ONLY,364);
  assert(validateProfiles(result.profiles));
  for(const h of result.profiles){
    assert.equal(h.role,null);assert.equal(h.stats,null);assert.equal(h.skills.active,null);
    assert.equal(h.training,null);assert.equal(h.awakening,null);assert.equal(h.evolution,null);
    assert.equal(h.fieldProvenance.role,"UNKNOWN");
    assert.equal(h.fieldProvenance.skills,"UNKNOWN");
  }
});
check("14 project runtime generals and original simulated skill ownership unchanged",()=>{
  assert.equal(result.project.projectRuntimeCount,14);
  assert.equal(result.project.projectSkillCount,14);
  assert.equal(result.project.runtimeEditPerformed,false);
  assert.equal(result.project.possibleNameOverlaps.length,10);
});
check("four runtime names not in current Wiki index require manual reconciliation",()=>{
  const missing=new Set(["Lưu Bị","Tào Tháo","Tôn Quyền","Tuân Úc"]);
  const names=new Set(result.project.possibleNameOverlaps.map(x=>x.projectName));
  for(const x of missing) assert(!names.has(x));
});
check("364 Chat 05 descriptor bundles, zero invented combat mechanics",()=>{
  assert.equal(handoff.count,364);
  assert.deepEqual(buildSkillDescriptors(result.profiles),handoff.heroes);
  assert(handoff.heroes.every(x=>x.runtimeImport===false && x.active===null && x.factStatus==="UNKNOWN"));
});
check("progression formula remains Wiki UNKNOWN, existing project SIMULATED",()=>{
  assert.equal(contract.progression.wikiMobile.evidence,"UNKNOWN");
  assert.equal(contract.progression.wikiMobile.enabledForRuntime,false);
  assert.equal(contract.progression.existingProjectSimulation.training.maxLevel,40);
  assert.equal(contract.progression.existingProjectSimulation.training.provenance.classification,"SIMULATED");
});
check("negative: duplicate ID blocked",()=>invalid(x=>{x.heroes[3].id=x.heroes[2].id}));
check("negative: faction total shift blocked",()=>invalid(x=>{x.heroes[0].faction="Thục"}));
check("negative: unverified source URL blocked",()=>invalid(x=>{x.heroes[0].sourceUrl="https://example.invalid"}));
check("negative: invented runtime upgrade blocked",()=>invalid(x=>{x.heroes[0].runtimeStatus="PLAYABLE"}));
check("negative: changed listed grade breaks 50 known references",()=>invalid(x=>{x.heroes[0].indexGrade="Thường"}));
console.log("NL_HERO focused QA: "+checks+"/"+checks+" PASS (not a runtime/release gate)");
