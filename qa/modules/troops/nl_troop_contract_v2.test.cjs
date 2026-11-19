"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"../../..");
const {getDesignData,describeTroop,findProjectUnit,tierStatProfile,evolutionOptions,nextTierDesignQuote,resolveWikiStatusTags}=require("../../../data/ngoalong/modules/troops/troop_design_v2.cjs");
const d=getDesignData(root);
const core=require("../../../data/ngoalong/references/combat_troops_mobile_v1.json");
const supp=require("../../../data/ngoalong/references/combat_troops_wiki_supplement_v1.json");
const mech=require("../../../data/ngoalong/references/troop_mechanics_wiki_v1.json");
const bridge=require("../../../data/ngoalong/references/troop_effect_bridge_wiki_v1.json");
let checks=0;
function test(name,fn){fn();checks++;process.stdout.write("PASS "+name+"\n");}
test("372 source appearances reused without missing or invented identities",()=>{
 assert.equal(d.wiki.records.length,372);assert.equal(core.units.length,213);assert.equal(supp.units.length,159);
 assert.deepEqual(new Set(d.wiki.records.map(x=>x.id)),new Set([...core.units,...supp.units].map(x=>x.id)));
});
test("all source identifiers unique; no Wiki unit runs in gameplay",()=>{
 assert.equal(new Set(d.wiki.records.map(x=>x.id)).size,372);
 assert.ok(d.wiki.records.every(x=>x.runtimeState==="REFERENCE_ONLY"&&x.combat.autoImport===false&&x.recruitable==="UNKNOWN"));
});
test("eight group totals and Naval out-of-scope remain intact",()=>{
 const counts=d.wiki.records.reduce((a,x)=>(a[x.family]=(a[x.family]||0)+1,a),{});
 assert.deepEqual(counts,{infantry:73,spear:64,cavalry:62,archer:59,strategist:105,"ship-small":3,"ship-medium":3,"ship-large":3});
});
test("NPC badge truth is not conflated with special or recruitability",()=>{
 const extras=d.wiki.records.filter(x=>x.rosterType==="WIKI_SPECIAL_OR_NPC");
 assert.equal(extras.length,54);assert.equal(extras.filter(x=>x.wikiNpcBadgeVisible===true).length,48);
 assert.equal(extras.filter(x=>x.wikiNpcBadgeVisible===false).length,6);
});
test("source mechanic operations and provenance preserved without execution",()=>{
 const got=d.wiki.records.reduce((n,x)=>n+x.combat.operations.length,0);
 const expected=mech.records.reduce((n,x)=>n+x.mechanics.length,0);
 assert.equal(got,501);assert.equal(got,expected);
 assert.equal(d.wiki.records.reduce((n,x)=>n+x.combat.sourceEventIds.length,0),bridge.events.length);
 assert.ok(d.wiki.records.flatMap(x=>x.combat.operations).every(x=>!x.runtimeEnabled&&x.runtimeStatusId===null&&x.fieldProvenance));
});
test("mechanic completeness explicit: 235 structured / 78 qualitative / 59 pending",()=>{
 const count=k=>d.wiki.records.filter(x=>x.combat.coverage===k).length;
 assert.equal(count("STRUCTURED_FROM_VISIBLE_WIKI"),235);
 assert.equal(count("QUALITATIVE_DERIVED_NOT_FIELD_VERIFIED"),78);
 assert.equal(count("NOT_YET_FIELD_EXTRACTED"),59);
});
test("named Wiki parents and children still UNKNOWN, no inferred links",()=>{
 assert.equal(d.evolution.sourceNamedEdges.length,0);
 assert.equal(d.evolution.wikiTierOnlyAdjacency.length,30);
 assert.ok(d.wiki.records.every(x=>x.evolution.namedEdgeStatus==="UNKNOWN"&&!x.evolution.namedParentIds.length&&!x.evolution.namedChildIds.length));
});
test("project units 7 bases + 18 branches are independent of Wiki appearance IDs",()=>{
 assert.equal(d.project.units.length,25);
 assert.equal(d.evolution.projectEdges.length,18);
 assert.equal(d.project.units.filter(x=>x.branchType==="PROJECT_BASE").length,7);
 assert.ok(d.project.units.every(x=>x.provenance.stats==="SIMULATED"&&x.runtimeState==="DESIGN_READY_NOT_INTEGRATED"&&x.wikiIdentityId===null));
});
test("each project unit has a distinct meaningful behavior descriptor",()=>{
 const units=d.project.units;
 assert.equal(new Set(units.map(x=>x.combatBehavior.mechanic)).size,25);
 assert.equal(new Set(units.map(x=>[x.combatBehavior.trigger,x.combatBehavior.target,x.combatBehavior.lane,x.combatBehavior.effectIntent,x.combatBehavior.value].join("|"))).size,25);
 for(const x of units)assert.ok(x.combatBehavior.trigger&&x.combatBehavior.target&&x.combatBehavior.effectIntent);
});
test("project specialization references valid parents and are acyclic",()=>{
 const ids=new Set(d.project.units.map(x=>x.id));
 for(const x of d.project.units){if(x.parentId){assert.ok(ids.has(x.parentId));assert.notEqual(x.parentId,x.id);}}
 assert.ok(d.evolution.projectEdges.every(e=>ids.has(e.from)&&ids.has(e.to)&&e.classification==="SIMULATED"));
});
test("tier curve capped at seven and contains no Save side-effects",()=>{
 const a=tierStatProfile(d,"nlp-infantry",1),b=tierStatProfile(d,"nlp-infantry",7);
 assert.ok(b.stats.hp>a.stats.hp);assert.equal(a.stats.morale,b.stats.morale);assert.equal(b.runtimeWired,false);
 assert.throws(()=>tierStatProfile(d,"nlp-infantry",8));
 assert.equal(nextTierDesignQuote(d,"infantry",4,{barracksLevel:10,resources:{silver:999999,grain:999999,iron:999999}}).withinExistingRuntimeCap,false);
});
test("project evolution blocks underfunded/barracks insufficient",()=>{
 const fail=evolutionOptions(d,"infantry",{barracksLevel:1,resources:{silver:0}});assert.ok(fail.length>=1&&fail.every(x=>!x.eligible&&!x.gameSaveMutated));
 const pass=evolutionOptions(d,"infantry",{barracksLevel:2,resources:{silver:9999,grain:9999,iron:9999}});assert.ok(pass.length>=1&&pass.every(x=>x.eligible));
});
test("troop and effect descriptors never silently bind source statuses to runtime",()=>{
 const candidate=d.wiki.records.find(x=>x.combat.requiredStatusTags.length);
 assert.ok(candidate);assert.ok(resolveWikiStatusTags(d,candidate.id).every(x=>x.runtimeEffectId===null&&!x.autoImport));
 assert.equal(describeTroop(d,candidate.id).active,false);
 assert.equal(describeTroop(d,"nlp-bulwark").active,false);
 assert.equal(findProjectUnit(d,"invalid"),null);
});
test("art metadata unique, original, frame-by-frame, four directions",()=>{
 assert.equal(new Set(d.wiki.records.map(x=>x.art.artKey)).size,372);
 assert.ok(d.wiki.records.every(x=>x.art.actions.length===6&&x.art.directions.length===4&&x.art.method==="FRAME_BY_FRAME_NO_RIG"&&x.art.effectsSeparate));
});
process.stdout.write("NL TROOP CONTRACT "+checks+"/"+checks+" PASS\n");
