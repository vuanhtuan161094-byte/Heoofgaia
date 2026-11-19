"use strict";
/**
 * Source-grounded Ngọa Long hero development gate. Does NOT mutate Save, exp,
 * battle state or generator. No fabricated awakening formulas or costs.
 */
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const SOURCE_FILE=path.join(ROOT,"data","ngoalong","modules","heroes","wiki_progression_rules_v1.json");
function loadRules(root=ROOT){
  const data=JSON.parse(fs.readFileSync(path.join(root,"data","ngoalong","modules","heroes","wiki_progression_rules_v1.json"),"utf8"));
  if(data.schemaVersion!==1 || data.edition!=="VNG_WIKI_MOBILE_CURRENT")throw Error("NL_HERO_PROGRESS: invalid Wiki edition");
  const byName=new Map(data.sourceFacts.map(x=>[x.feature,x]));
  if(byName.get("ORANGE_AWAKENING")?.unlockMainCityLevel!==300||byName.get("GOLD_AWAKENING")?.unlockMainCityLevel!==380||byName.get("DESTINY_SYSTEM")?.unlockMainCityLevel!==400)throw Error("NL_HERO_PROGRESS: source threshold changed");
  if(!data.sourceFacts.every(x=>x.classification==="VERIFIED"&&x.sourceUrl.startsWith("https://ngoalong.vnggames.com/")))throw Error("NL_HERO_PROGRESS: missing provenance");
  return data;
}
function mainCityUnlocks(level,rules=loadRules()){
  if(!Number.isInteger(level)||level<0)throw Error("NL_HERO_PROGRESS: invalid main city level");
  const byName=new Map(rules.sourceFacts.map(x=>[x.feature,x.unlockMainCityLevel]));
  return {
    mainCityLevel:level,
    orangeSystemAvailable:level>=byName.get("ORANGE_AWAKENING"),
    goldSystemAvailable:level>=byName.get("GOLD_AWAKENING"),
    destinySystemAvailable:level>=byName.get("DESTINY_SYSTEM"),
    individualAwakeningEligibility:"UNKNOWN",
    verifiedActualStage:null,
    mutateRuntime:false
  };
}
function abilityForStage(heroId,stage,catalogue,mainCityLevel){
  if(!["ORANGE","GOLD"].includes(stage))return {status:"UNKNOWN_STAGE",ability:null};
  const unlock=mainCityUnlocks(mainCityLevel);
  const isOpen=stage==="ORANGE"?unlock.orangeSystemAvailable:unlock.goldSystemAvailable;
  if(!isOpen)return {status:"SYSTEM_LOCKED",ability:null};
  const hero=catalogue.skillDescriptors.find(x=>x.heroId===heroId);
  if(!hero)return {status:"HERO_NOT_IN_CURRENT_INDEX",ability:null};
  const candidates=hero.stageSkills.filter(x=>x.stage===stage&&x.executable===false);
  if(!candidates.length)return {status:"SOURCE_SKILL_UNKNOWN",ability:null};
  if(candidates.length>1)return {status:"VERSION_AMBIGUOUS",ability:null,sourceVersions:candidates.map(x=>x.sourceDate)};
  return {status:"REFERENCE_ONLY_NEEDS_AWAKENING_AND_CHAT_05",ability:candidates[0],executable:false};
}
function auditDevelopment(catalogue,level){
  const unlocked=mainCityUnlocks(level);
  return {
    ...unlocked,heroProfiles:catalogue.profiles.length,
    verifiedStageAbilities:catalogue.wikiStageSkills.length,
    designReady:catalogue.readiness.DESIGN_READY||0,
    playableFromWiki:0,
    owners:{combat:"CHAT_05",integration:"CHAT_08"}
  };
}
if(require.main===module){
 const {loadCatalogue}=require("./nl_hero_catalogue.js");
 console.log(JSON.stringify(auditDevelopment(loadCatalogue(),Number(process.argv[2]||0)),null,2));
}
module.exports={loadRules,mainCityUnlocks,abilityForStage,auditDevelopment};
