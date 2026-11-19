'use strict';
/*
 * CHAT06: adapt the existing Group02 Wiki crawler's extracted JSON (16 MB)
 * into the same normalized, fail-closed catalogue contract as its large builder.
 * Does not crawl, alter Group02, invent unknown soldiers/skills or touch Save.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const S = require('../data/ngoalong/modules/campaign/nl_campaign_shards_v1.js');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = 'data/ngoalong/group02_wiki/wiki_dungeons_extracted.json';
const REPORT = 'data/ngoalong/group02_wiki/wiki_dungeon_builder_report.json';
const APPROVALS = 'data/ngoalong/modules/campaign/approved_bindings_v1.json';
const OUTDIR = 'data/ngoalong/modules/campaign/source_shards';
const WIKI = 'https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban';
const SOURCE_GIT_SHA = '7318568320612ccd4c3c31bd762010609347c893';
function guard(value, msg) { if (!value) throw Error('NL06 source import: ' + msg); }
function validInt(v) { return Number.isInteger(v) && v >= 0; }
function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function field(value, url, derived=false) {
 return {classification:value==null?'UNKNOWN':derived?'DERIVED':'VERIFIED',
   sourceUrl:value==null?null:url};
}
function normalizeExtracted(source) {
 guard(source&&source.edition==='CURRENT_VNG_MOBILE'&&
   source.classicParity==='UNKNOWN'&&source.runtimeAuthority===false, 'version/parity');
 guard(Array.isArray(source.maps), 'map array missing');
 const ids=new Set(),records=[];
 for (const m of source.maps) {
   guard(validInt(m.mapId)&&m.mapId>0&&!ids.has(m.mapId), 'duplicate map');
   ids.add(m.mapId);
   const url=m.url||WIKI, aiIds=new Set(), npcs=[];
   for (const n of m.npcs||[]) {
     guard(validInt(n.aiId)&&n.aiId>0&&!aiIds.has(n.aiId), 'duplicate NPC');
     aiIds.add(n.aiId);
     const detail=n.url||url, observed=n.unitsObserved||[];
     guard(Array.isArray(observed), 'invalid observed units');
     const slots=observed.map(u=>u.slot);
     guard(slots.every(v=>Number.isInteger(v)&&v>=1&&v<=9), 'out of bounds Wiki slot');
     guard(new Set(slots).size===slots.length, 'duplicate Wiki slot');
     const completeSum=observed.length>0&&observed.every(u=>validInt(u.soldiers));
     const sum=completeSum?observed.reduce((t,u)=>t+u.soldiers,0):null;
     const delta=validInt(n.totalSoldiers)&&sum!==null?n.totalSoldiers-sum:null;
     const consistency=delta===null?'UNKNOWN':delta===0?'MATCH':'SOURCE_MISMATCH';
     const sourceFlag=n.unitSoldierSumValid;
     guard(sourceFlag===null||sourceFlag===undefined||
       sourceFlag===(consistency==='MATCH'), 'source soldier flag differs from raw sum at '+detail);
     const formationComplete=n.fullTeamVerified===true&&
       n.formationDeclaredUnitCount===observed.length &&
       Array.isArray(n.formationOccupiedSlots)&&
       [...n.formationOccupiedSlots].sort((a,b)=>a-b).join(',')===
         [...slots].sort((a,b)=>a-b).join(',');
     const unitsObserved=observed.map(u=>{
       const skill=u.skillName??null;
       const namespace=skill?(/\[\s*NPC\s*\]/i.test(skill)?
         'NPC_EXCLUSIVE_LABEL':'WIKI_HERO_ACTIVE'):null;
       return {
         slot:u.slot,name:u.name??null,level:u.level??null,soldiers:u.soldiers??null,
         troopWikiId:u.troopWikiId??null,troopName:u.troopName??null,
         troopLabel:u.troopLabel??null,skillName:skill,
         skillSourceType:skill?'NPC_UNIT_ACTIVE':null,
         skillNamespace:namespace,skillLevelShown:null,
         skillVersion:n.version??null,
         criticalPercent:u.criticalPercent??null,
         counterattackPercent:u.counterattackPercent??null,
         fieldStatus:{
           slot:field(u.slot,detail), soldiers:field(u.soldiers,detail),
           troopWikiId:field(u.troopWikiId,detail),skillName:field(skill,detail),
           formationSlot:field(u.slot==null?null:u.slot-1,detail,true)
         }
       };
     });
     npcs.push({
       aiId:n.aiId,listOrder:n.listOrder??null,name:n.name??null,
       kind:n.kind??null,level:n.level??null,totalSoldiers:n.totalSoldiers??null,
       merit:n.merit??null,attackCoefficientShown:n.attackCoefficientShown??null,
       unitsObserved,formationDeclaredUnitCount:n.formationDeclaredUnitCount??null,
       formationOccupiedSlots:copy(n.formationOccupiedSlots??null),
       fullTeamVerified:formationComplete,
       sourceFullTeamFlag:n.fullTeamVerified===true,
       observedUnitSoldierSum:sum,unitSoldierDiscrepancy:delta,
       soldierConsistency:consistency,
       version:n.version??null,url:detail,
       sourceFieldStatus:{
         name:field(n.name,detail),totalSoldiers:field(n.totalSoldiers,detail),
         order:field(n.listOrder,detail),formation:field(observed.length?observed:null,detail)
       }
     });
   }
   const listComplete=m.npcListComplete===true&&
     validInt(m.advertisedNpcCount)&&npcs.length===m.advertisedNpcCount;
   records.push({
     mapId:m.mapId,name:m.name??null,faction:m.faction??null,
     level:m.level??null,cityLevel:m.cityLevel??null,
     advertisedNpcCount:m.advertisedNpcCount??null,
     npcListComplete:listComplete,
     sourceIndexCountDisagrees:m.advertisedNpcCount!==npcs.length,
     mapWideRuleCoverage:'UNKNOWN',mapWideRulesObserved:[],
     dungeonType:null,unlockPrerequisite:null,clearReward:null,
     npcDetailComplete:m.npcDetailComplete===true,
     edition:'CURRENT_VNG_MOBILE',url,
     provenance:{name:field(m.name,url),level:field(m.level,url),
       cityLevel:field(m.cityLevel,url)},
     npcs
   });
 }
 return {
   schemaVersion:1,sourceEdition:'CURRENT_VNG_MOBILE',
   classicWebgameParity:'UNKNOWN',runtimeAuthority:false,
   source:WIKI,maps:records
 };
}
function toBlueprint(source) {
 const normalized=normalizeExtracted(source);
 return {schemaVersion:1,sourceEdition:normalized.sourceEdition,
   classicWebgameParity:normalized.classicWebgameParity,runtimeAuthority:false,
   source:normalized.source,
   maps:normalized.maps.map(m=>({
     wikiMapId:m.mapId,name:m.name,faction:m.faction,mapLevel:m.level,
     cityLevelRequired:m.cityLevel,
     advertisedNpcCount:m.advertisedNpcCount,npcListComplete:m.npcListComplete,
     npcCountIndexVsDetailMismatch:false,
     mapWideBattleRulesObserved:m.mapWideRulesObserved,
     dungeonType:null,historicalVersionStatus:'CURRENT_WIKI_SNAPSHOT_PATCH_LEDGER_SEPARATE',
     sourceUrl:m.url,fieldProvenance:m.provenance,
     npcs:m.npcs.map(n=>({
       wikiAiId:n.aiId,order:n.listOrder,name:n.name,kind:n.kind,level:n.level,
       totalSoldiers:n.totalSoldiers,observedUnitSoldierSum:n.observedUnitSoldierSum,
       unitSoldierDiscrepancy:n.unitSoldierDiscrepancy,
       unitSoldierConsistencyStatus:n.soldierConsistency,
       formationComplete:n.fullTeamVerified,
       firstMoverObserved:null,
       npcSkillVersion:n.version||'CURRENT_WIKI_UNDATED',
       sourceUrl:n.url,fieldProvenance:n.sourceFieldStatus,
       formationUnits:n.unitsObserved.map(u=>({
         wikiSlot:u.slot,formationSlot:u.slot-1,name:u.name,level:u.level,
         soldiers:u.soldiers,troopWikiId:u.troopWikiId,troopName:u.troopName,
         skillName:u.skillName,skillSourceType:u.skillSourceType,
         skillNamespace:u.skillNamespace,skillLevelShown:u.skillLevelShown,
         skillVersion:u.skillVersion,criticalPercent:u.criticalPercent,
         counterattackPercent:u.counterattackPercent,
         fieldProvenance:u.fieldStatus
       }))
     }))
   }))
 };
}
function build(source, approvals={},size=12) {
 const out=S.build(toBlueprint(source),approvals,size);
 out.manifest.inputFile=SOURCE;
 out.manifest.sourceGitBlobSha=SOURCE_GIT_SHA;
 out.manifest.mapWideRuleSourceCoverage='UNKNOWN_UNTIL_REVIEW';
 out.manifest.soldierDiscrepanciesAreRawNumeric=true;
 return out;
}
function audit(out, report) {
 const got=out.manifest.counts;
 const expected={
   maps:report.mapCount,npcRows:report.npcDetailCount,
   exhaustiveNpcFormations:report.fullNpcFormationCount,
   sourceSoldierContradictions:report.soldierTotalContradictions
 };
 for(const [key,v] of Object.entries(expected))
   guard(got[key]===v, 'Group02 report mismatch '+key+' expected '+v+' got '+got[key]);
 const actualRoster=Object.values(out.manifest.mapLocator)
   .filter(x=>!x.blockers.includes('NPC_ROSTER_INCOMPLETE')).length;
 guard(actualRoster===report.mapNpcRosterCompleteCount,
   'Group02 roster mismatch '+actualRoster+' vs '+report.mapNpcRosterCompleteCount);
 return {
   schemaVersion:1,sourceGitBlobSha:SOURCE_GIT_SHA,
   sourceEdition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',
   maps:got.maps,npcs:got.npcRows,
   sourceRosterComplete:actualRoster,
   sourceRosterIncomplete:got.maps-actualRoster,
   fullyEnumeratedFormations:got.exhaustiveNpcFormations,
   numericSoldierContradictions:got.sourceSoldierContradictions,
   playableMaps:got.mapsReadyForIntegration,
   playableNpcs:got.npcsReadyForIntegration,
   status:got.mapsReadyForIntegration?'AWAITING_INTEGRATION':'REFERENCE_ONLY',
   note:'Actual 249-map/4903-NPC source materialized. Gameplay disabled until reviewed identity/skills/rewards, Save and combat approvals.'
 };
}
function main(args) {
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const sourceRaw=fs.readFileSync(path.join(ROOT,SOURCE));
 const gitBlobSha=crypto.createHash('sha1').update('blob '+sourceRaw.length+'\0')
   .update(sourceRaw).digest('hex');
 guard(gitBlobSha===SOURCE_GIT_SHA,'source Git blob changed; re-review source before import');
 const source=JSON.parse(sourceRaw.toString('utf8'));
 const approved=read(APPROVALS), report=read(REPORT);
 const out=build(source,approved);
 const summary=audit(out,report);
 const dest=path.join(ROOT,OUTDIR),files=[
   ['manifest.json',JSON.stringify(out.manifest,null,2)+'\n'],
   ['coverage.json',JSON.stringify(summary,null,2)+'\n'],
   ...out.shards.map(s=>[s.filename,JSON.stringify(s.body)+'\n'])
 ];
 if(!args.includes('--check'))fs.mkdirSync(dest,{recursive:true});
 for(const [name,content] of files){
   const target=path.join(dest,name);
   if(args.includes('--check')){
     guard(fs.existsSync(target)&&fs.readFileSync(target,'utf8')===content,
       'missing or stale '+target);
   }else fs.writeFileSync(target,content);
 }
 const expected=new Set(files.map(x=>x[0]));
 for(const filename of fs.readdirSync(dest))
   if(/^shard-\d{3}\.json$/.test(filename)&&!expected.has(filename)){
     if(args.includes('--check'))throw Error('unexpected stale shard '+filename);
     fs.rmSync(path.join(dest,filename));
   }
 console.log(JSON.stringify({summary,sourceSha256:crypto.createHash('sha256')
   .update(sourceRaw).digest('hex'),shards:out.shards.length}));
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(error){console.error(error.stack||String(error));process.exitCode=1}
}
module.exports={normalizeExtracted,toBlueprint,build,audit,main};
