'use strict';
/*
 * CHAT06: source-faithful crosswalk backlog for NPC Wiki unit identities.
 * Candidate name matches to Group01 reference units are NOT approved bindings.
 * Never infer missing hero IDs, skill mechanics, probabilities or source versions.
 */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const SOURCE='data/ngoalong/group02_wiki/wiki_dungeons_extracted.json';
const TARGET='data/ngoalong/modules/campaign/wiki_binding_backlog_v1.json';
const TROOPS=[
 'data/ngoalong/references/combat_troops_mobile_v1.json',
 'data/ngoalong/references/combat_troops_wiki_supplement_v1.json'
];
const valid=x=>x!==null&&x!==undefined;
function make(source, referenceUnits=[]){
 if(!source||source.edition!=='CURRENT_VNG_MOBILE'||
   source.classicParity!=='UNKNOWN'||!Array.isArray(source.maps))
   throw Error('NL06 crosswalk: invalid Wiki version or missing maps');
 const names=new Map(),troops=new Map(),skills=new Map();
 for(const r of referenceUnits){
   if(!r||typeof r.name!=='string'||typeof r.id!=='string')continue;
   const key=r.name.normalize('NFC').trim();
   if(!names.has(key))names.set(key,[]);
   names.get(key).push({referenceId:r.id,family:r.family??null,
     tier:r.tier??null,referenceOnly:true});
 }
 let npcCount=0,unitCount=0,unknownSoldier=0,npcExclusiveOccurrences=0;
 const perMap=[];
 for(const map of source.maps){
   let mapUnits=0,mapUnknown=0,mapExclusives=0;
   for(const npc of map.npcs||[]){
     npcCount++;
     for(const u of npc.unitsObserved||[]){
       unitCount++;mapUnits++;
       if(!valid(u.soldiers)){unknownSoldier++;mapUnknown++;}
       const sourceUrl=npc.url||map.url||null;
       const id=valid(u.troopWikiId)?String(u.troopWikiId):'UNKNOWN';
       if(!troops.has(id))troops.set(id,{wikiTroopId:valid(u.troopWikiId)?u.troopWikiId:null,
         names:[],occurrences:0,sample:null});
       const row=troops.get(id);
       row.occurrences++;
       if(valid(u.troopName)&&!row.names.includes(u.troopName))row.names.push(u.troopName);
       if(row.sample===null)row.sample={mapId:map.mapId,npcAiId:npc.aiId,wikiSlot:u.slot,sourceUrl};
       const skillName=u.skillName??null;
       const namespace=skillName&&/\[\s*NPC\s*\]/i.test(skillName)?
          'NPC_EXCLUSIVE_LABEL':'NPC_UNIT_ACTIVE';
       if(namespace==='NPC_EXCLUSIVE_LABEL'){npcExclusiveOccurrences++;mapExclusives++;}
       const skillKey=namespace+'\u0001'+(skillName??'UNKNOWN');
       if(!skills.has(skillKey))skills.set(skillKey,{sourceLabel:skillName,namespace,
         occurrences:0,sample:null});
       const sr=skills.get(skillKey);sr.occurrences++;
       if(sr.sample===null)sr.sample={mapId:map.mapId,npcAiId:npc.aiId,wikiSlot:u.slot,sourceUrl};
     }
   }
   perMap.push({wikiMapId:map.mapId,name:map.name??null,
     sourceNpcRows:(map.npcs||[]).length,advertisedNpcRows:map.advertisedNpcCount??null,
     sourceUnitRows:mapUnits,missingSoldierRows:mapUnknown,
     npcExclusiveSkillOccurrences:mapExclusives,
     fullRoster:Boolean(map.npcListComplete===true&&
       map.advertisedNpcCount===(map.npcs||[]).length),
     reviewedInRuntime:false});
 }
 const troopRows=[...troops.values()].sort((a,b)=>
   String(a.wikiTroopId??'').localeCompare(String(b.wikiTroopId??''),undefined,{numeric:true}))
   .map(r=>{
     const candidates=[...new Map(r.names.flatMap(n=>names.get(n)||[])
       .map(c=>[c.referenceId,c])).values()];
     return {
       wikiTroopId:r.wikiTroopId,sourceNames:r.names.sort(),occurrences:r.occurrences,
       sourceExample:r.sample,
       referenceNameCandidates:candidates,
       candidateMatchStatus:candidates.length===0?'NO_REFERENCE_NAME_MATCH':
         candidates.length===1?'UNVERIFIED_NAME_MATCH':'AMBIGUOUS_NAME_MATCH',
       approvedRuntimeTroopId:null,
       status:'REFERENCE_ONLY_REQUIRES_IDENTITY_REVIEW'
     };
   });
 const skillRows=[...skills.values()].sort((a,b)=>
   String(a.sourceLabel).localeCompare(String(b.sourceLabel),'vi'))
   .map(r=>({...r,approvedRuntimeSkillId:null,
     skillMechanics:'UNKNOWN',status:'REFERENCE_ONLY_REQUIRES_VERSION_REVIEW'}));
 const missing=troopRows.filter(t=>t.wikiTroopId===null).length;
 return {
   schemaVersion:1,kind:'NGOALONG_WIKI_NPC_BINDING_BACKLOG',
   sourceEdition:'CURRENT_VNG_MOBILE',classicWebgameParity:'UNKNOWN',
   runtimeEnabled:false,sourceFile:SOURCE,
   troopReferenceFiles:TROOPS,
   policy:'Exact name match is a candidate ONLY; a Wiki numeric troop ID does NOT identify a Group01 runtime troop ID. Skill level/patch and NPC exclusivity require individual review.',
   counts:{
     maps:source.maps.length,npcRows:npcCount,unitRows:unitCount,
     unitSoldiersUnknown:unknownSoldier,uniqueWikiTroopIds:troopRows.length-missing,
     uniqueSkillNamespaceLabels:skillRows.length,
     npcExclusiveSkillOccurrences:npcExclusiveOccurrences,
     npcExclusiveSkillLabels:skillRows.filter(x=>x.namespace==='NPC_EXCLUSIVE_LABEL').length,
     troopIdsWithOneNameCandidate:troopRows.filter(x=>x.candidateMatchStatus==='UNVERIFIED_NAME_MATCH').length,
     troopIdsWithAmbiguousNameCandidates:troopRows.filter(x=>x.candidateMatchStatus==='AMBIGUOUS_NAME_MATCH').length,
     troopsApproved:0,skillsApproved:0
   },
   troopCrosswalk:troopRows,
   skillCrosswalk:skillRows,
   mapReview:perMap
 };
}
function main(args){
 const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
 const refs=TROOPS.flatMap(f=>read(f).units||[]);
 const content=JSON.stringify(make(read(SOURCE),refs),null,2)+'\n';
 const target=path.join(ROOT,TARGET);
 if(args.includes('--check')){
   if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)
     throw Error('stale Wiki binding backlog');
 }else fs.writeFileSync(target,content,'utf8');
 console.log('PASS Wiki NPC ID/skill binding backlog');
}
if(require.main===module) {
 try{main(process.argv.slice(2))}
 catch(error){console.error(error.stack||String(error));process.exitCode=1}
}
module.exports={make,main};
