"use strict";
/** Immutable historical skill balance overlays for Chat 05 source handoff. */
const fs=require("node:fs");
const path=require("node:path");
const DIR=__dirname;
function check(v,m){if(!v)throw new Error("NL_HERO_BALANCE: "+m);}
function read(filename){return JSON.parse(fs.readFileSync(path.join(DIR,filename),"utf8"));}
function at(root,segments){return segments.reduce((obj,k)=>obj?.[k],root);}
function clone(v){return JSON.parse(JSON.stringify(v));}
function validateBalancePack(p,orange){
 check(p.schemaVersion===1&&p.edition==="VNG_WIKI_MOBILE_PATCH_HISTORY", "wrong patch edition");
 check(p.publicationDate==="2024-09-03"&&p.checkedAt==="2026-11-19","wrong patch date");
 check(p.sourceUrl==="https://ngoalong.vnggames.com/su-kien-2022/pbm-muu-dinh-tam-quoc/he-thong-tuong-cam-13958.html","unrecognized source");
 check(p.runtimeEligible===false,"cannot enable runtime");
 check(p.directSkillOverlays.length===3,"expected 3 evidenced overlays");
 check(p.versionedUnboundFacts.length===19,"expected 19 historical change facts");
 const patches=new Set();
 for(const q of p.directSkillOverlays){
   check(q.heroName==="Quan Vũ"&&q.skillId==="wiki-orange-05-20240102","unreviewed target");
   const src=orange.skills.find(x=>x.skillId===q.skillId);
   check(src&&src.name===q.heroName&&src.stage==="ORANGE"&&src.sourceDate==="2024-01-02","skill target mismatch");
   check(Array.isArray(q.fieldPath)&&q.fieldPath[0]==="events"&&q.fieldPath.length===3,"unscoped field");
   const key=q.skillId+":"+q.fieldPath.join(".");
   check(!patches.has(key),"duplicate edit "+key);
   patches.add(key);
   check(at(src,q.fieldPath)===q.previous,"pre-patch Wiki version drift for "+key);
   check(Number.isFinite(q.previous)&&Number.isFinite(q.next)&&q.next>=0,"invalid numeric correction");
 }
 for(const f of p.versionedUnboundFacts){
   check(typeof f.name==="string"&&typeof f.subject==="string"&&typeof f.field==="string","unbound fact identity");
   check(f.to!==null&&f.to!==undefined,"unbound fact value missing");
 }
 return {direct:p.directSkillOverlays.length,sourceOnly:p.versionedUnboundFacts.length};
}
function buildRevisedOrange(orange=read("wiki_orange_skills_2024_v1.json"),balance=read("wiki_skill_overrides_20240903_v1.json")){
 validateBalancePack(balance,orange);
 const c=clone(orange),look=new Map(c.skills.map(x=>[x.skillId,x]));
 const newVersion={oldVersion:"2024-01-02",revisedOn:balance.publicationDate,sourceUrl:balance.sourceUrl,classification:"VERIFIED",runtimeEligible:false};
 for(const update of balance.directSkillOverlays){
  const record=look.get(update.skillId);
  let obj=record;for(const k of update.fieldPath.slice(0,-1))obj=obj[k];
  obj[update.fieldPath.at(-1)]=update.next;
  record.sourceVersionOverrides=newVersion;
 }
 c.revision={publicationDate:balance.publicationDate,sourceUrl:balance.sourceUrl,revisionKind:"HISTORICAL_BALANCE_BULLETIN",currentServerParity:"UNKNOWN",autoEquip:false};
 return c;
}
function getSnapshotForReview(heroName){
 const original=read("wiki_orange_skills_2024_v1.json");
 const revised=buildRevisedOrange(original,read("wiki_skill_overrides_20240903_v1.json"));
 return {
  heroName,
  original:original.skills.filter(x=>x.name===heroName),
  revised:revised.skills.filter(x=>x.name===heroName),
  checkedForCurrentVersion:false,
  runtimeEligible:false
 };
}
if(require.main===module){
 const e=getSnapshotForReview("Quan Vũ");
 console.log(JSON.stringify({sourceVersion:e.revised[0]?.sourceVersionOverrides,hero:e.heroName,changedEvents:e.revised[0]?.events},null,2));
}
module.exports={validateBalancePack,buildRevisedOrange,getSnapshotForReview};
