'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const base=path.resolve(__dirname,'../../../data/ngoalong/modules/heroes');
const load=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));
const wiki=load('wiki_catalogue_v1.json');
const designs=load('a123_simulated_207_design_v7.json');
const foreign=load('a123_foreign_source_updates_v7.json');
const delta=load('a123_lequ_2021_recruitment_delta_v6.json');
const a123=load('a123_hero_research_audit_v5.json');
let checks=0;
function ok(pred,message){assert.ok(pred,message);checks++}
ok(designs.schemaVersion===7&&designs.status==='DESIGN_CANDIDATE_NOT_RUNTIME','schema and design status');
ok(designs.immutableRules.neverOverrideWikiMetadata&&designs.immutableRules.realMobileStatsRemainUnknown&&designs.immutableRules.doNotAutoImport,'no source authority overwrite');
ok(designs.heroes.length===207,'207 candidates');
ok(designs.summary.byGroup.A1===17&&designs.summary.byGroup.A2===121&&designs.summary.byGroup.A3===69,'A123 totals');
ok(designs.summary.withAnyHistoricOrExternalEvidence===200&&designs.summary.unsourced===7,'200 evidence and 7 simulated without foreign source');
ok(foreign.records.length===8&&foreign.summary.newAdditionalCasesFromPriorTwelve===5,'eight dated external facts');
ok(delta.rows.length===69,'2021 changes preserved');
const index=new Map(wiki.heroes.map(x=>[x.id,x]));
const used=new Set();
const usedActive=new Set();
const roles=new Set();
for(const row of designs.heroes){
 const w=index.get(row.heroId),d=row.proposedDesign,a=d.active;
 ok(Boolean(w)&&w.name===row.name&&w.faction===row.faction&&w.indexGrade===row.wikiIndexGrade,'wiki identity '+row.heroId);
 ok(!used.has(row.heroId),'unique ID '+row.heroId);used.add(row.heroId);
 ok(!usedActive.has(a.id),'unique skill '+row.heroId);usedActive.add(a.id);roles.add(d.role);
 ok(row.provenance.classification==='SIMULATED'&&!row.provenance.gameplayImport&&row.combatBinding===null&&row.saveBinding===null,'no executable authority '+row.heroId);
 ok(!row.researchEvidence.verifiedCurrentMobileStats&&!row.researchEvidence.verifiedCurrentMobileSkillCoefficient&&!row.researchEvidence.verifiedVngMobileRecruitment,'edition boundary '+row.heroId);
 ok(Object.values(d.baseAttributes).every(x=>Number.isInteger(x)&&x>=35&&x<=96),'stat bounds '+row.heroId);
 ok(Object.values(d.combatStats).every(x=>Number.isInteger(x)&&x>0),'derived stats '+row.heroId);
 ok(a.damageCoefficient>=0&&a.damageCoefficient<= (a.target==='SINGLE_ENEMY'?2.2:1.5),'damage bounds '+row.heroId);
 ok(a.moraleCost===100&&a.actionMaxPerRound===1&&a.canTriggerOnReplay===false&&a.cooldownTurns>=2,'replay and spam '+row.heroId);
 ok(a.statusChance>=0&&a.statusChance<=1&&a.targetCap<=5&&a.targetCap>=1,'target and chance '+row.heroId);
 ok(a.statusEffect!=='CONTROL'||a.statusChance<=.3,'control cap '+row.heroId);
 ok(a.healFractionOfStrategyAttack<=.55,'healing cap '+row.heroId);
 ok(d.passive.stackCap===1&&d.passive.triggerCapPerRound===1&&d.passive.magnitude<=.065,'passive cap '+row.heroId);
 ok(d.recruitment.stageNumber>=1&&d.recruitment.stageNumber<=28&&d.recruitment.guaranteedWhenObjectivesMet&&d.recruitment.recruitCountCap===1&&d.recruitment.rewardReceipt==='ONCE_PER_HERO_ID','non RNG recruitment '+row.heroId);
 ok(d.awakening.upgrades.length===2&&d.awakening.routeProbability===null&&d.awakening.maxTier==='ELITE','stage progression '+row.heroId);
 ok(row.researchEvidence.crossEditionParity==='UNKNOWN'&&row.runtimeStatus==='DESIGN_CANDIDATE_NOT_INTEGRATED','scope '+row.heroId);
}
ok(used.size===207&&usedActive.size===207,'unique rows and actives');
ok(roles.size>=6,'distinct roles');
const expected={
 A1:a123.a1.rows.filter(r=>r.wikiName!=='Tào Phi').map(r=>r.heroId),
 A2:a123.a2.rows.filter(r=>r.after==='STILL_MOBILE_UNKNOWN').map(r=>r.heroId),
 A3:a123.a3.rows.filter(r=>r.classification==='UNKNOWN_ROLE').map(r=>r.heroId)
};
for(const g of ['A1','A2','A3']){
 const a=designs.heroes.filter(x=>x.group===g).map(x=>x.heroId).sort();
 ok(a.join(',')===expected[g].sort().join(','),'exact backlog group '+g);
}
const named=new Map(designs.heroes.map(x=>[x.name,x]));
for(const name of ['Ngưu Kim','Văn Khâm','Triệu Phạm','Chu Chỉ','Quản Lộ']){
 ok(named.has(name)&&named.get(name).researchEvidence.foreignFactId,'fresh foreign evidence '+name);
}
ok(named.get('Nghiêm Dư').researchEvidence.sourceReferences.length===0,'unsourced neutral remains simulated');
ok(named.get('Quản Lộ').proposedDesign.recruitment.method==='ADVISOR_QUEST_TO_ALLY','Guan Lu advisor only proposal');
const result=spawnSync(process.execPath,[path.join(base,'a123_simulated_207_builder_v7.js'),'--check'],{encoding:'utf8'});
ok(result.status===0,'deterministic reproduction: '+result.stderr+' '+result.stdout);
console.log('A123 V7: '+checks+'/'+checks+' PASS, 207 proposals, 200 external-sourced backgrounds, 7 source-absent, all SIMULATED/not integrated');
