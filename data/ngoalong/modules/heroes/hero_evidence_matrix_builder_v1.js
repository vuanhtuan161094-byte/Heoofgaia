"use strict";
/** 364-row per-field source evidence matrix, deterministic and runtime-inert. */
const fs=require("node:fs"),path=require("node:path");
const {editionHandoff}=require("./hero_research_index_v3.js");
const dir=__dirname;
const FIELDS=["historicalBaseAttributes","historicalRebirthGrowth","historicalListedRole","historicalRecruitmentTerms","historicalStageSkill","currentAttributes","currentEquippedSkill","currentRecruitmentRules","individualAwakeningMaterialsAndCosts","combatEffectBinding"];
const PRIORITIES=Object.freeze({"Ngụy":1,"Quần":2,"Trung lập":3,"Thục":4,"Ngô":5});
function fail(msg){throw Error("NL_HERO_MATRIX: "+msg)}
function createMatrix(source=editionHandoff()){
 if(source.heroes.length!==364)fail("source index mismatch");
 const entries=source.heroes.map(h=>{
  const guide=h.guideSource,skills=h.sourcedSkillVersions;
  const facts={
   historicalBaseAttributes:guide?"VERIFIED_GUIDE_BASELINE":"UNKNOWN",
   historicalRebirthGrowth:guide?"VERIFIED_GUIDE_BASELINE":"UNKNOWN",
   historicalListedRole:guide?"VERIFIED_GUIDE_BASELINE":"UNKNOWN",
   historicalRecruitmentTerms:guide?"VERIFIED_GUIDE_BASELINE":"UNKNOWN",
   historicalStageSkill:skills.length?"VERIFIED_DATED_ABILITY":"UNKNOWN",
   currentAttributes:"UNKNOWN",currentEquippedSkill:"UNKNOWN",
   currentRecruitmentRules:"UNKNOWN",
   individualAwakeningMaterialsAndCosts:"UNKNOWN",combatEffectBinding:"NOT_INTEGRATED"
  };
  const completeness=guide&&skills.length?"GUIDE_AND_STAGE_SKILLS":
    guide?"GUIDE_ONLY":skills.length?"HISTORICAL_SKILLS_ONLY":"INDEX_ONLY";
  return {
   heroId:h.heroId,name:h.name,faction:h.faction,wikiListedGrade:h.wikiListedGrade,
   sourceScope:"VNG_WIKI_MOBILE",researchState:completeness,
   currentRuntimeStatus:"REFERENCE_ONLY",playable:false,individualAwakeningEligible:null,
   sourceReferences:{
    index:h.indexSourceUrl,
    guideRecordIds:guide?.guideRecords||[],
    datedSkills:skills.map(s=>({skillId:s.skillId,stage:s.stage,sourceDate:s.sourceDate,sourceUrl:s.sourceUrl}))
   },
   fieldStatus:facts,
   versionConflicts:h.ambiguousStages,
   researchNext:completeness==="INDEX_ONLY"?
    ["FIND_DETAIL_SOURCE","VERIFY_BASE_STATS","VERIFY_SKILL_ROLE","VERIFY_RECRUITMENT","VERIFY_AWAKENING"]:
    ["VERIFY_CURRENT_STAGE","VERIFY_CURRENT_STATS","VERIFY_SKILL_VERSION","VERIFY_STAGE_COST","CHAT05_COMBAT_BINDING"],
   researchPriority:PRIORITIES[h.faction],
   authoritativeCurrentSkillsConfirmed:0
  };
 });
 entries.sort((a,b)=>a.researchPriority-b.researchPriority||a.heroId.localeCompare(b.heroId));
 const count=entries.reduce((acc,r)=>{
  acc[r.researchState]=(acc[r.researchState]||0)+1;return acc;
 },{});
 const byFaction={};
 for(const [key,value]of Object.entries(source.missingByFaction))byFaction[key]={...value};
 if(count.INDEX_ONLY!==230)fail("unknown backlog count changed");
 if(count.GUIDE_AND_STAGE_SKILLS+count.GUIDE_ONLY+count.HISTORICAL_SKILLS_ONLY+count.INDEX_ONLY!==364)fail("matrix coverage invalid");
 if(entries.some(r=>r.playable||r.currentRuntimeStatus!=="REFERENCE_ONLY"))fail("illegal runtime promotion");
 return {
  schemaVersion:3,snapshotAt:"2026-11-19",sourceEdition:"VNG_WIKI_MOBILE_RESEARCH",
  indexCount:364,groupCount:count,byFaction,allFields:FIELDS,
  owner:"CHAT_01",runtimeImport:false,
  reportLimitations:[
   "INDEX_ONLY is not a detailed hero profile",
   "GUIDE status refers to historical published baseline attributes, not current evolved-grade stats",
   "Dated skill versions do not establish equipped or latest skill",
   "No source-less awaken cost, formula or recruitment chance may be invented",
   "Chat 05 owns combat, Chat 08 owns integration; neither is claimed complete"
  ],
  entries
 };
}
function getPriorityBacklog(matrix=createMatrix(),options={}){
 const priority=options.priority||null;
 const onlyUnresearched=options.onlyUnresearched!==false;
 return matrix.entries.filter(e=>(!onlyUnresearched||e.researchState==="INDEX_ONLY")&&(!priority||e.faction===priority));
}
if(require.main===module){
 const m=createMatrix();
 fs.writeFileSync(path.join(dir,"hero_evidence_matrix_v3.json"),JSON.stringify(m,null,2)+"\n");
 console.log(JSON.stringify({groups:m.groupCount,byFaction:m.byFaction},null,2));
}
module.exports={createMatrix,getPriorityBacklog,FIELDS,PRIORITIES};
