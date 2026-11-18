"use strict";
/**
 * Ngọa Long hero guide facts, second evidence lane.
 * The 2026 VNG-hosted faction guides provide base stats and rebirth growth,
 * not proof of current evolved-grade attributes or an authorized Save mapping.
 * No automatic merging with the source Wiki index or runtime roster.
 */
const fs=require("node:fs");
const path=require("node:path");

const EXPECTED={THUC:{RENOWN:20,TRIAL_TOWER:21},NGO:{RENOWN:20,TRIAL_TOWER:21}};
const DIR=__dirname;
const GUIDE_FILE="guide_thuc_ngo_20260930_v1.json";
const indexFile="wiki_catalogue_v1.json";

function fail(msg){throw new Error("NL_HERO_GUIDE: "+msg);}
function guard(value,msg){if(!value)fail(msg);}
function loadJSON(filename){return JSON.parse(fs.readFileSync(path.join(DIR,filename),"utf8"));}
function identityKey(n){return n.normalize("NFC").trim().toLocaleLowerCase("vi-VN");}
function finiteRange(n,min,max){return typeof n==="number"&&Number.isFinite(n)&&n>=min&&n<=max;}
function flatStats(stats){return [stats.leadership,stats.martial,stats.intelligence];}

function validateGuidePack(pack,index){
 guard(pack.schemaVersion===1&&pack.edition==="VNG_MOBILE_GUIDE_20260930","wrong guide edition");
 guard(pack.count===82&&Array.isArray(pack.records)&&pack.records.length===82,"expected 82 dated guide records");
 guard(pack.checkedAt==="2026-11-19","source snapshot timestamp drift");
 guard(pack.sources.THUC?.url==="https://ngoalong.vnggames.com/tin-tuc/huong-dan/cam-nang-thuc-quoc.html","Thuc source URL wrong");
 guard(pack.sources.NGO?.url==="https://ngoalong.vnggames.com/tin-tuc/huong-dan/cam-nang-ngo-quoc.html","Ngo source URL wrong");
 const validWiki=new Map(index.heroes.map(x=>[x.id,x]));
 const guideIds=new Set(),counts={THUC:{RENOWN:0,TRIAL_TOWER:0},NGO:{RENOWN:0,TRIAL_TOWER:0}};
 const exactMatches=new Map();
 const unresolved=[];
 const byName=new Map();
 for(const wiki of index.heroes){
  const key=identityKey(wiki.name);byName.set(key,[...(byName.get(key)||[]),wiki.id]);
 }
 for(let i=0;i<pack.records.length;i++){
  const x=pack.records[i],loc="record "+(i+1);
  guard(x.guideRecordId==="guide-20260930-"+String(i+1).padStart(3,"0"),loc+" unstable ID");
  guard(!guideIds.has(x.guideRecordId),loc+" duplicate ID");
  guideIds.add(x.guideRecordId);
  guard(Object.hasOwn(EXPECTED,x.guideRealm)&&Object.hasOwn(EXPECTED[x.guideRealm],x.guideSection),loc+" section");
  counts[x.guideRealm][x.guideSection]++;
  guard(x.sourceId===(x.guideRealm==="THUC"?"GUIDE_THUC_20260930":"GUIDE_NGO_20260930"),loc+" provenance key");
  guard(x.sourceUrl===pack.sources[x.guideRealm].url&&x.publicationDate==="2026-09-30",loc+" date/source");
  guard(x.evidence?.classification==="VERIFIED"&&x.evidence.scope==="PUBLISHED_GUIDE_TABLE_20260930"&&x.evidence.notWikiIndexCurrentStage===true,loc+" evidence tier");
  guard(x.runtimeEligible===false,loc+" not allowed to auto-enable combat");
  guard(typeof x.listedBaseSkillName==="string"&&x.listedBaseSkillName.length>0&&typeof x.listedRole==="string"&&x.listedRole.length>0,loc+" skill/role missing");
  guard(flatStats(x.attributes).every(n=>finiteRange(n,0,100)),loc+" attributes out of range");
  guard(flatStats(x.rebirthGrowth).every(n=>finiteRange(n,0,10)),loc+" rebirth growth out of range");
  const a=x.acquisition;
  if(x.guideSection==="RENOWN")guard(a.kind==="RENOWN"&&Number.isInteger(a.requiredRenown)&&a.requiredRenown>=0&&Number.isInteger(a.recruitFeeSilver)&&a.recruitFeeSilver>0,loc+" renown acquire");
  else guard(a.kind==="TRIAL_TOWER"&&Number.isInteger(a.minFloor)&&a.minFloor>0&&Number.isInteger(a.soulCost)&&a.soulCost>0,loc+" tower acquire");
  const candidates=byName.get(identityKey(x.sourceName))||[];
  const expectedStatus=candidates.length===1?"NAME_MATCH_SINGLE":candidates.length>1?"AMBIGUOUS_SAME_NAME":"MISSING_IN_INDEX";
  guard(x.identityLink.status===expectedStatus,loc+" stale name collision status");
  guard(JSON.stringify(x.identityLink.candidateWikiIds)===JSON.stringify(candidates),loc+" candidate IDs changed");
  guard(x.identityLink.canonicalWikiHeroId===null,loc+" auto identity promotion blocked");
  if(expectedStatus==="NAME_MATCH_SINGLE"){
    guard(validWiki.has(candidates[0]),loc+" unknown canonical candidate");
    const matches=exactMatches.get(candidates[0])||[];matches.push(x);
    exactMatches.set(candidates[0],matches);
  }else unresolved.push(x);
 }
 for(const [realm,groups]of Object.entries(EXPECTED))for(const [type,n]of Object.entries(groups))guard(counts[realm][type]===n,"bad "+realm+"/"+type+" count");
 guard(unresolved.length===10,"unresolved count changed");
 // Same historical hero in Thuc and Ngo guides must have exactly the same facts
 // when they refer to the identical tower source; reject version conflation.
 const multiSourceDuplicates=[];
 for(const [heroId,rows]of exactMatches){
   if(rows.length>1){
     const [first,...rest]=rows;
     for(const x of rest){
       guard(x.listedBaseSkillName===first.listedBaseSkillName&&x.listedRole===first.listedRole,heroId+" skill conflict across guides");
       guard(JSON.stringify(x.attributes)===JSON.stringify(first.attributes),heroId+" stats conflict across guides");
       guard(JSON.stringify(x.rebirthGrowth)===JSON.stringify(first.rebirthGrowth),heroId+" growth conflict across guides");
       guard(JSON.stringify(x.acquisition)===JSON.stringify(first.acquisition),heroId+" acquisition conflict across guides");
     }
     multiSourceDuplicates.push({heroId,rows:rows.map(x=>x.guideRecordId)});
   }
 }
 return {
   rowCount:pack.records.length,
   counts,
   exactNameMatchedRecords:[...exactMatches.values()].reduce((n,arr)=>n+arr.length,0),
   uniquelyNamedCandidateHeroes:exactMatches.size,
   crossRealmDuplicates:multiSourceDuplicates,
   unresolvedNameCases:unresolved.map(x=>({guideRecordId:x.guideRecordId,name:x.sourceName,status:x.identityLink.status,candidates:x.identityLink.candidateWikiIds})),
   currentEditionBindingAllowed:false,
   gameplayEligible:0
 };
}

/**
 * Stronger data shape for future Chat 08 import, but no automatic deployment.
 * Current-stage ability source remains separate and unknown.
 */
function buildCandidates(pack,index) {
 const audit=validateGuidePack(pack,index);
 const byId=new Map();
 for(const row of pack.records) {
   const x=row.identityLink.candidateWikiIds;
   if(row.identityLink.status!=="NAME_MATCH_SINGLE"||x.length!==1)continue;
   const heroId=x[0],current=byId.get(heroId);
   if(current){
     current.guideRecords.push(row.guideRecordId);
     continue;
   }
   byId.set(heroId,{
     heroId,guideRecords:[row.guideRecordId],
     baseAttributes:{...row.attributes},
     rebirthGrowth:{...row.rebirthGrowth},
     roleLabel:row.listedRole,
     normalSkillName:row.listedBaseSkillName,
     acquisitionTerms:{...row.acquisition},
     sourceEdition:pack.edition,
     evidence:"PUBLISHED_GUIDE_TABLE_20260930",
     identityLink:"NAME_MATCH_ONLY",
     sourceStatus:"VERIFIED_GUIDE_FACTS",
     mobileWikiEvolvedGradeStats:null,
     runtimeStats:null,
     skillFormula:null,
     readiness:"REFERENCE_ONLY",
     runtimeEligible:false
   });
 }
 return {audit,candidates:[...byId.values()].sort((a,b)=>a.heroId.localeCompare(b.heroId))};
}

/** Check published guide unlock/cost, without consuming currencies or granting heroes. */
function checkRecruitment(candidate,resources) {
 guard(candidate&&candidate.runtimeEligible===false,"candidate must stay reference-only");
 guard(resources&&typeof resources==="object","missing resources");
 const required=candidate.acquisitionTerms;
 if(required.kind==="RENOWN"){
   const renown=resources.renown,silver=resources.silver;
   guard(Number.isInteger(renown)&&renown>=0&&Number.isInteger(silver)&&silver>=0,"invalid resource counts");
   return {
     unlockedByGuide:renown>=required.requiredRenown,
     canPayGuideFee:silver>=required.recruitFeeSilver,
     meetsPublishedTerms:renown>=required.requiredRenown&&silver>=required.recruitFeeSilver,
     spendSilver:0,grantHero:false,receipt:null,
     authority:"REFERENCE_QUOTE_ONLY",
     currentVersionEligibility:"UNKNOWN"
   };
 }
 const floor=resources.towerFloor,souls=resources.heroSouls;
 guard(Number.isInteger(floor)&&floor>=0&&Number.isInteger(souls)&&souls>=0,"invalid tower resource counts");
 return {
  unlockedByGuide:floor>=required.minFloor,
  canPayGuideFee:souls>=required.soulCost,
  meetsPublishedTerms:floor>=required.minFloor&&souls>=required.soulCost,
  spendHeroSouls:0,grantHero:false,receipt:null,
  authority:"REFERENCE_QUOTE_ONLY",
  currentVersionEligibility:"UNKNOWN"
 };
}

/** Explicit SIMULATED formula, not claimed as the VNG stat formula. */
function projectPreviewRebirthStats(candidate,count,{maxPreview=50}={}){
 guard(candidate&&candidate.sourceStatus==="VERIFIED_GUIDE_FACTS","not an audited guide candidate");
 guard(Number.isInteger(count)&&count>=0&&count<=maxPreview,"invalid preview rebirth count");
 const stats=Object.fromEntries(Object.keys(candidate.baseAttributes).map(k=>[
   k,Math.round((candidate.baseAttributes[k]+count*candidate.rebirthGrowth[k])*100)/100
 ]));
 return {heroId:candidate.heroId,rebirthCount:count,previewAttributes:stats,
         formulaAuthority:"SIMULATED_PROJECT_LINEAR_PREVIEW",appliesToRuntime:false};
}
function loadGuide(pack=loadJSON(GUIDE_FILE),index=loadJSON(indexFile)){return buildCandidates(pack,index);}
if(require.main===module){
 const result=loadGuide();
 console.log(JSON.stringify({
   audit:result.audit,candidateCount:result.candidates.length,
   source:"VNG public guide — not a playable content pack"
 },null,2));
}
module.exports={validateGuidePack,buildCandidates,loadGuide,checkRecruitment,projectPreviewRebirthStats,identityKey};
