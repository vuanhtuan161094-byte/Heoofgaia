"use strict";
/**
 * CHAT01 source-lane overlay V4: VNG Mobile 2022 recruitment vs. older Ngọa Long
 * classic web 2012/2013 source tables and 2019 purple skills.
 *
 * Explicitly DOES NOT cross-promote classic facts into current Mobile formulas,
 * Save state, playable heroes, or source guide 2022 recruitment permissions.
 */
const fs=require("node:fs"),path=require("node:path");
const DIR=__dirname;
function read(name){return JSON.parse(fs.readFileSync(path.join(DIR,name),"utf8"));}
function guard(cond,msg){if(!cond)throw Error("HERO_SOURCE_LANES_V4: "+msg);}
function stableName(x){return x.normalize("NFC").trim();}
function arrayMapById(rows,identityField) {
 const out=new Map();
 for(const x of rows){
   const id=identityField(x);if(!id)continue;
   const current=out.get(id)||[];current.push(x);out.set(id,current);
 }
 return out;
}
function validateClassic(pack,base){
 guard(pack.schemaVersion===1&&pack.recordCount===41&&pack.records.length===41,"classic row count");
 guard(pack.byMethod.TRIAL_TOWER===21&&pack.byMethod.RENOWN===20,"classic method totals");
 guard(pack.sources.tower.url.startsWith("https://ngoalong.zing.vn/")&&pack.sources.renown.url.startsWith("https://ngoalongfc.wordpress.com/"),"classic source provenance");
 const ids=new Set(),heroIndex=new Map(base.entries.map(x=>[x.heroId,x]));
 const byName=new Map();for(const row of base.entries){const v=byName.get(row.name)||[];v.push(row.heroId);byName.set(row.name,v);}
 for(const row of pack.records){
  guard(typeof row.id==="string"&&!ids.has(row.id),"duplicate historic record identity");ids.add(row.id);
  guard(["TRIAL_TOWER","RENOWN"].includes(row.method),"bad recruitment method");
  const source=pack.sources[row.method==="TRIAL_TOWER"?"tower":"renown"];
  guard(row.sourceUrl===source.url&&row.sourceDate===source.date,"changed historic source URL/date");
  guard(row.currentMobileBinding===false&&row.combatExecutable===false,"historic row must not bind Mobile runtime");
  guard(row.sourceEdition.startsWith("HISTORIC_WEB_"),"cross-edition source status");
  const statFields=["leadership","martial","intelligence"];
  guard(statFields.every(k=>typeof row.baseAttributes[k]==="number"&&row.baseAttributes[k]>=0&&row.baseAttributes[k]<=100),"historic stats invalid");
  guard(statFields.every(k=>typeof row.rebirthGrowth[k]==="number"&&row.rebirthGrowth[k]>=0&&row.rebirthGrowth[k]<=10),"historic growth invalid");
  guard(typeof row.baseSkillName==="string"&&row.baseSkillName.length>0&&typeof row.role==="string"&&row.role.length>0,"historic role/skill missing");
  const matches=byName.get(row.sourceName)||[];
  guard(JSON.stringify(row.wikiCandidates)===JSON.stringify(matches),"historic name match changed");
  guard(matches.every(id=>heroIndex.has(id)),"bad candidate id");
 }
 guard(pack.targetWeiBacklog.length===18,"source Wei backlog size");
 const groups={};for(const x of pack.targetWeiBacklog){
  guard(x.wikiHeroId&&heroIndex.get(x.wikiHeroId)?.faction==="Ngụy","backlog hero not Wei");
  groups[x.status]=(groups[x.status]||0)+1;
 }
 guard(groups.EXACT_NAME_ARCHIVAL_FACTS===12&&groups.ALIAS_REVIEW===3&&groups.NOT_FOUND===3,"18-way confidence partition changed");
 for(const x of pack.aliases)guard(x.approved===false,"alias must require reviewed approval");
 return groups;
}
function validateMobileRecruitment(pack,base){
 guard(pack.schemaVersion===1&&pack.recordCount===14&&pack.records.length===14,"VNG 2022 recruitment row count");
 guard(pack.sourceUrl==="https://ngoalong.vnggames.com/tin-tuc-2022/tinh-nang/trai-nghiem-ngoa-long-890.html"&&pack.sourceDate==="2022-06-21","mobile source mismatch");
 const ids=new Set(),byName=new Map();for(const x of base.entries)byName.set(x.name,[...(byName.get(x.name)||[]),x.heroId]);
 let linked=0;
 for(const row of pack.records){
  guard(!ids.has(row.sourceFactId),"duplicate recruitment source fact");ids.add(row.sourceFactId);
  guard(row.sourceUrl===pack.sourceUrl&&row.sourceDate===pack.sourceDate,"recruitment URL/date mismatched");
  guard(row.runtimeEligible===false&&row.exactRecruitCost===null&&row.probability===null,"recruitment facts may not spend/grant");
  guard(row.classification==="VERIFIED_PUBLISHED_GUIDE_FACT","not verified as published guide");
  guard(JSON.stringify(row.wikiCandidateIds)===JSON.stringify(byName.get(row.sourceName)||[]),"improper recruitment alias binding");
  guard(["WILD_GENERAL_RECRUITMENT","DIALOGUE_RECRUITMENT"].includes(row.method),"unsupported recruitment method");
  if(row.wikiCandidateIds.length===1)linked++;
 }
 guard(linked===11,"expected 11 linked recruitment guide facts");
 return linked;
}
function validatePurple(pack,base){
 guard(pack.schemaVersion===1&&pack.count===4&&pack.records.length===4,"2019 historical purple source count");
 guard(pack.sourceUrl==="https://ngoalong.zing.vn/su-kien/phien-ban-moi-bach-khi-hoang-to-chi-tu/truyen-thuyet-tuong-tim.html","2019 source changed");
 const heroIds=new Map(base.entries.map(e=>[e.heroId,e.name]));
 const names=new Set();
 for(const row of pack.records){
  guard(!names.has(row.name),"2019 duplicate hero");names.add(row.name);
  guard(heroIds.get(row.heroId)===row.name,"2019 name binding changed");
  guard(row.stage==="PURPLE"&&row.sourceDate===pack.sourceDate&&row.sourceUrl===pack.sourceUrl,"purple stage source drift");
  guard(row.currentVersionVerified===false&&row.executable===false&&row.runtimeEligible===false,"historic skill cannot execute");
  guard(Array.isArray(row.events)&&row.events.length>0,"historic ability events missing");
  for(const op of row.events){
   guard(typeof op.op==="string"&&op.target,"untyped historical operation");
   if(op.op==="DAMAGE_UNQUANTIFIED"||op.op==="HEAL_UNQUANTIFIED")guard(op.coefficientPct===null,"historic unknown coefficient replaced with invention");
  }
 }
 return names.size;
}
function createV4({
 base=read("hero_evidence_matrix_v3.json"),
 classic=read("archive_wei_2012_2013_v1.json"),
 recruitment=read("mobile_recruitment_guide_2022_v1.json"),
 purple=read("wei_quan_purple_2019_v1.json")
}={}){
 guard(base.indexCount===364&&base.entries.length===364&&base.groupCount.INDEX_ONLY===230,"V3 research baseline not expected");
 const classicAudit=validateClassic(classic,base);
 const linkedRecruit=validateMobileRecruitment(recruitment,base);
 const purpleCount=validatePurple(purple,base);
 const oldClassic=arrayMapById(classic.records.filter(x=>x.wikiCandidates.length===1),x=>x.wikiCandidates[0]);
 const mobileRecruit=arrayMapById(recruitment.records.filter(x=>x.wikiCandidateIds.length===1),x=>x.wikiCandidateIds[0]);
 const historicPurple=arrayMapById(purple.records,x=>x.heroId);
 const entries=base.entries.map(row=>{
   const historic=oldClassic.get(row.heroId)||[],mobile=mobileRecruit.get(row.heroId)||[],stage=historicPurple.get(row.heroId)||[];
   const previousMobileDetails=row.researchState!=="INDEX_ONLY";
   const hasMobile=previousMobileDetails||mobile.length>0;
   const any=hasMobile||historic.length>0||stage.length>0;
   const category=previousMobileDetails?"MOBILE_DETAIL_EXISTING":
      mobile.length?"MOBILE_RECRUITMENT_ONLY":
      (historic.length||stage.length)?"CLASSIC_ARCHIVE_ONLY":"INDEX_ONLY";
   return {
    ...row,
    evidenceLanes:{
      mobileCurrentIndex:{name:true,listedGrade:true,sourceUrl:row.sourceReferences.index},
      mobile2022Recruitment:mobile.map(x=>({factId:x.sourceFactId,sourceDate:x.sourceDate,method:x.method,sourceUrl:x.sourceUrl,mechanicLabel:x.mechanicLabel})),
      classicBase2012_2013:historic.map(x=>({recordId:x.id,sourceName:x.sourceName,sourceDate:x.sourceDate,sourceUrl:x.sourceUrl,attributes:x.baseAttributes,rebirthGrowth:x.rebirthGrowth,baseSkillName:x.baseSkillName,acquisition:x.acquisition,role:x.role,sourceEdition:x.sourceEdition})),
      classicPurple2019:stage.map(x=>({skillId:x.skillId,sourceDate:x.sourceDate,sourceUrl:x.sourceUrl,skillName:x.skillName,stage:x.stage,events:x.events,specialWeapon:x.specialWeapon}))
    },
    verifiedCurrentMobileStats:false,
    currentMobileEquippedSkill:null,
    crossEditionParity:"UNKNOWN",
    sourceResearchClass:category,
    hasPublishedMobileDetail:hasMobile,
    hasAnyHistoricalDetail:any,
    currentRuntimeStatus:"REFERENCE_ONLY",
    playable:false
   };
 });
 const counts={MOBILE_DETAIL_EXISTING:0,MOBILE_RECRUITMENT_ONLY:0,CLASSIC_ARCHIVE_ONLY:0,INDEX_ONLY:0};
 for(const x of entries)counts[x.sourceResearchClass]++;
 const byFaction={};
 for(const f of ["Ngụy","Thục","Ngô","Quần","Trung lập"]){
  const a=entries.filter(x=>x.faction===f);
  byFaction[f]={total:a.length,mobileDetail:a.filter(x=>x.hasPublishedMobileDetail).length,withAnyHistoricSource:a.filter(x=>x.hasAnyHistoricalDetail).length,
   indexOnlyForMobile:a.filter(x=>!x.hasPublishedMobileDetail).length,indexOnlyAllSources:a.filter(x=>x.sourceResearchClass==="INDEX_ONLY").length};
 }
 const mobileDetails=counts.MOBILE_DETAIL_EXISTING+counts.MOBILE_RECRUITMENT_ONLY;
 const allSources=mobileDetails+counts.CLASSIC_ARCHIVE_ONLY;
 guard(counts.MOBILE_DETAIL_EXISTING===134&&counts.MOBILE_RECRUITMENT_ONLY===8,"VNG mobile research coverage drift");
 guard(counts.MOBILE_DETAIL_EXISTING+counts.MOBILE_RECRUITMENT_ONLY+counts.CLASSIC_ARCHIVE_ONLY+counts.INDEX_ONLY===364,"matrix count");
 guard(entries.every(x=>!x.playable&&x.currentMobileEquippedSkill===null&&x.crossEditionParity==="UNKNOWN"),"runtime/source parity promotion");
 return {
  schemaVersion:4,sourceEditions:["VNG_WIKI_MOBILE","VNG_MOBILE_GUIDE_2022","HISTORIC_WEB_2012","HISTORIC_WEB_2013","VNG_OFFICIAL_ARCHIVE_PURPLE_2019"],
  sourceScopePolicy:"SOURCE_LANE_STRICT_NO_CLASSIC_TO_MOBILE_AUTO_MAPPING",
  checkedAt:"2026-11-19",total:364,counts,byFaction,
  audit:{previousV3MobileDetailed:134,linkedMobileRecruitmentFacts:linkedRecruit,
    mobileDetailWithRecruitment:mobileDetails,archivalClassicRows:41,archivalWeiBacklog:classicAudit,
    purpleClassicSkills:purpleCount,withAnyDatedHistoricalSource:allSources,
    indexOnlyForMobile:364-mobileDetails,indexOnlyAcrossAllSources:counts.INDEX_ONLY,
    neverClaimCurrentFullyDetailed:364,playableFromNewData:0},
  review:{wei18:classic.targetWeiBacklog,unresolvedClassicAliases:classic.aliases,
    unresolvedMobileRecruitmentNames:recruitment.records.filter(x=>x.wikiCandidateIds.length!==1).map(x=>({name:x.sourceName,alias:x.possibleAlias}))},
  entries,runtimeImport:false,owner:{research:"CHAT_01",combat:"CHAT_05",runtime:"CHAT_08"}
 };
}
function getBacklog(m=createV4(),realm="Ngụy",mode="MOBILE"){
 guard(["MOBILE","ALL_SOURCES"].includes(mode),"unsupported backlog mode");
 return m.entries.filter(x=>x.faction===realm&&(mode==="MOBILE"?!x.hasPublishedMobileDetail:x.sourceResearchClass==="INDEX_ONLY"));
}
if(require.main===module){
 const x=createV4();
 fs.writeFileSync(path.join(DIR,"hero_source_evidence_matrix_v4.json"),JSON.stringify(x,null,2)+"\n");
 console.log(JSON.stringify({counts:x.counts,audit:x.audit,byFaction:x.byFaction},null,2));
}
module.exports={createV4,getBacklog,validateClassic,validateMobileRecruitment,validatePurple};
