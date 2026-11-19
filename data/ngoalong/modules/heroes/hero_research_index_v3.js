"use strict";
/**
 * Chat 01 — source-grade read-only research index.
 * Consolidates historic VNG skill bulletins and guide stats, without claiming
 * skill versions/current stats are live or changing Alpha/Save/combat.
 */
const fs=require("node:fs");
const path=require("node:path");
const {loadCatalogue}=require("../../../../tools/nl_hero_catalogue.js");
const {loadGuide}=require("./guide_stats_adapter_v1.js");
const {getSnapshotForReview}=require("./balance_release_overlay_v1.js");

const PACKS=Object.freeze([
 {file:"wiki_orange_skills_2023_apr_v1.json",count:19,section:"ORANGE_2023_APR",field:"events"},
 {file:"wiki_gold_supplement_2025_2026_v1.json",count:23,section:"GOLD_SUPPLEMENT",field:"events"},
 {file:"wiki_orange_skills_2023_sep_v1.json",count:12,section:"ORANGE_2023",field:"events"},
 {file:"wiki_orange_stage_supplement_2024_2025_v1.json",count:19,section:"ORANGE_2024_2025",field:"events"},
 {file:"wiki_skill_stages_20240903_v1.json",count:23,section:"STAGES_2024SEP",field:"operations"}
]);
const VALID_STAGES=new Set(["BLUE","GREEN","RED","PURPLE","ORANGE","GOLD"]);
const VALID_OPS=new Set(["DAMAGE","STATUS","MORALE","HEAL","BRANCH_MORALE","DISPEL","DEFENSE_CHANGE","MORALE_COST","ATTACK_CHANGE","MORALE_REGEN_CHANGE","ON_DISPEL_MORALE"]);
const MODULE_DIR=__dirname;
function check(x,message){if(!x)throw new Error("NL_HERO_RESEARCH_V3: "+message);}
function readFile(name,dir=MODULE_DIR){return JSON.parse(fs.readFileSync(path.join(dir,name),"utf8"));}
function exactIdMap(index){
 const byName=new Map(),byId=new Map();
 for(const hero of index.heroes){
  const ids=byName.get(hero.name)||[];ids.push(hero.id);byName.set(hero.name,ids);
  byId.set(hero.id,hero);
 }
 return {byName,byId};
}
function listSkillOperations(r,p){
 const arr=p.field==="operations"?r.operations:r.events;
 check(Array.isArray(arr)&&arr.length>0,"missing operation sequence: "+r.name+"/"+r.stage);
 for(const [i,op]of arr.entries()){
   check(VALID_OPS.has(op.op),"unreviewed op "+r.name+" "+i+" "+op.op);
   if(op.op==="DAMAGE"){
    check(typeof op.pct==="number"&&op.pct>=0&&Number.isInteger(op.hits)&&op.hits>0&&typeof op.target==="string","damage coefficient missing: "+r.name);
   }
   if(op.op==="HEAL")check((op.pct===null&&op.unquantified===true)||(typeof op.pct==="number"&&op.pct>=0),"heal coefficient must be sourced: "+r.name);
   if(op.op==="STATUS")check(typeof (op.name||op.effect)==="string"&&typeof op.target==="string"&&(op.turns===null||Number.isInteger(op.turns)),"invalid status "+r.name);
 }
 return arr;
}
function verifyExtraPack(p,pack,index){
 const {byName,byId}=exactIdMap(index);
 check(pack.schemaVersion===1&&pack.count===p.count&&pack.records.length===p.count,"unexpected source count in "+p.file);
 check(Array.isArray(pack.records)&&pack.records.every(x=>x.runtimeEligible===false||x.executable===false),"source-only status broken "+p.file);
 check(typeof pack.sourceUrl==="string"||pack.sources||pack.sourceBatches,"missing source provenance "+p.file);
 const keys=new Set();
 for(const [i,r]of pack.records.entries()){
  const sourceKey=(r.id||r.skillId);
  check(typeof sourceKey==="string"&&sourceKey.length>0,"missing source skill id "+p.file+"/"+i);
  check(!keys.has(sourceKey),"duplicate source record ID "+sourceKey);
  keys.add(sourceKey);
  check(VALID_STAGES.has(r.stage),"invalid skill stage "+r.stage);
  check(typeof r.skillName==="string"&&r.skillName.length>0&&typeof r.sourceUrl==="string"&&r.sourceUrl.startsWith("https://ngoalong.vnggames.com/"),"invalid source URL "+sourceKey);
  check(/^20\d\d-\d\d-\d\d$/.test(r.sourceDate),"invalid date "+sourceKey);
  check(r.currentVersionVerified===false||r.currentStageVerified===false,"current version must not be inferred "+sourceKey);
  check(r.runtimeEligible===false||r.executable===false,"source record executable "+sourceKey);
  check(r.classification==="VERIFIED"||r.evidence==="VERIFIED_2023_BULLETIN","unverified fact "+sourceKey);
  listSkillOperations(r,p);
  const matches=byName.get(r.name)||[];
  if(r.heroId===null){
   check(matches.length!==1,"unlinked exact unique hero: "+r.name);
  }else{
   check(matches.length===1&&matches[0]===r.heroId&&byId.has(r.heroId),"source alias promoted without proof: "+r.name);
  }
 }
 return pack.records.map(r=>({
  heroId:r.heroId||null,name:r.name,stage:r.stage,
  skillId:r.skillId||r.id,skillName:r.skillName,
  sourceUrl:r.sourceUrl,sourceDate:r.sourceDate,
  lane:r.lane||r.damageLane||null,
  operations:listSkillOperations(r,p),
  sourcePack:p.section,
  sourceStatus:"VERIFIED_DATED_RELEASE",
  currentStage:null,equipped:false,executable:false,
  historicalCaveat:"HISTORICAL_STAGE_NOT_CURRENT_GAME_STATE"
 }));
}
function readExtraStageSkills(root=MODULE_DIR,index){
 const rows=[];
 for(const p of PACKS)rows.push(...verifyExtraPack(p,readFile(p.file,root),index));
 check(rows.length===96,"expected 96 additional sourced versions");
 check(rows.filter(r=>r.heroId===null).length===7,"source names not in Wiki changed");
 return rows;
}
function editionHandoff(){
 const original=loadCatalogue(),guide=loadGuide();
 const old=original.wikiStageSkills;
 const additional=readExtraStageSkills(MODULE_DIR,original.index);
 const guideById=new Map(guide.candidates.map(r=>[r.heroId,r]));
 const byHeroId=new Map();
 const sourceRows=[
  ...old.map(r=>({
   heroId:r.heroId,name:r.name,stage:r.stage,skillId:r.skillId,skillName:r.skillName,
   sourceUrl:r.sourceUrl,sourceDate:r.sourceDate,lane:r.lane||null,
   operations:r.events,sourcePack:"PRIOR_V1_STAGES",
   sourceStatus:"VERIFIED_DATED_RELEASE",currentStage:null,equipped:false,executable:false
  })),
  ...additional
 ];
 const globalIds=new Set();
 for(const row of sourceRows){
   check(!globalIds.has(row.skillId),"duplicated source skill id across packs "+row.skillId);
   globalIds.add(row.skillId);
   if(!row.heroId)continue;
   const arr=byHeroId.get(row.heroId)||[];arr.push(row);byHeroId.set(row.heroId,arr);
 }
 check(sourceRows.length===151,"stage source rows should be 151");
 const rows=original.profiles.map(hero=>{
   const datedSkills=byHeroId.get(hero.id)||[],guideCandidate=guideById.get(hero.id)||null;
   const stages={};
   for(const skill of datedSkills){stages[skill.stage]=(stages[skill.stage]||0)+1;}
   const ambiguousStages=Object.entries(stages).filter(([,n])=>n>1).map(([stage])=>stage);
   return {
    heroId:hero.id,name:hero.name,faction:hero.faction,
    wikiListedGrade:hero.grade.listed,
    indexSourceUrl:hero.source.url,
    guideSource:guideCandidate,
    sourcedSkillVersions:datedSkills,
    stageCounts:stages,
    ambiguousStages,
    sourceEvidence:{
     wikiIndex:true,
     guideBaseStats:guideCandidate!==null,
     guideRecruitmentTerms:guideCandidate!==null,
     hasSourcedStageSkill:datedSkills.length>0,
     activeHeroStats:false,
     actualEquippedSkill:false,
     completedAwakeningCost:false
    },
    readiness:"REFERENCE_ONLY",currentActiveStage:null,runtimeEnabled:false
   };
 });
 check(rows.length===364,"Wiki profile coverage regression");
 const factions={};for(const hero of rows){
  const item=factions[hero.faction]||{total:0,withDetails:0,withGuide:0,withSkill:0,missingDetails:0};
  item.total++;
  if(hero.guideSource||hero.sourcedSkillVersions.length)item.withDetails++;else item.missingDetails++;
  if(hero.guideSource)item.withGuide++;
  if(hero.sourcedSkillVersions.length)item.withSkill++;
  factions[hero.faction]=item;
 }
 const missing=rows.filter(r=>!r.guideSource&&!r.sourcedSkillVersions.length);
 const datedBalance=getSnapshotForReview("Quan Vũ");
 return {
  schemaVersion:3,
  edition:"VNG_WIKI_MOBILE_SOURCE_RESEARCH",
  checkedAt:"2026-11-19",
  total:rows.length,heroes:rows,sourceRows,
  unlinkedSourceSkills:sourceRows.filter(r=>!r.heroId),
  unresolvedGuideNames:guide.audit.unresolvedNameCases,
  missingIds:missing.map(r=>r.heroId),
  missingByFaction:factions,
  historicalQuanVuBalance:datedBalance,
  counts:{
   index:364,guideSourceRows:guide.audit.rowCount,
   guideUniqueCandidates:guide.candidates.length,
   priorSkillVersions:old.length,
   supplementarySkillVersions:additional.length,
   allDatedStageVersions:sourceRows.length,
   detailedHeroCandidates:rows.length-missing.length,
   remainingWithoutDeepFacts:missing.length,
   playableFromWiki:0
  },
  runtimeImport:false,
  owner:{research:"CHAT_01",combat:"CHAT_05",integration:"CHAT_08"}
 };
}
function selectHero(bundle,heroId){
 check(typeof heroId==="string"&&heroId.length>0,"heroId required");
 return bundle.heroes.find(r=>r.heroId===heroId)||null;
}
if(require.main===module){
 const d=editionHandoff();
 console.log(JSON.stringify({counts:d.counts,byFaction:d.missingByFaction,unlinkedSkills:d.unlinkedSourceSkills.map(x=>x.name)},null,2));
}
module.exports={PACKS,VALID_OPS,listSkillOperations,verifyExtraPack,readExtraStageSkills,editionHandoff,selectHero};
