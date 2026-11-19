'use strict';
/* Rebuild the early Wiki-only campaign reference; never invent missing teams. */
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const A='data/ngoalong/group02_wiki/early_campaign_10.json';
const B='data/ngoalong/group02_wiki/npc_details.json';
const TARGET='data/ngoalong/modules/campaign/starter_wiki_reference_v1.json';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function build(early,details){
 if(early.edition!=='CURRENT_MOBILE'||details.edition!=='CURRENT_MOBILE'||
   early.classicParity!=='UNKNOWN'||details.classicParity!=='UNKNOWN')
   throw Error('source version not reviewed');
 return {
  schemaVersion:1,kind:'NGOALONG_CAMPAIGN_VERIFIED_EARLY_REFERENCE',
  sourceEdition:'CURRENT_VNG_MOBILE',classicWebgameParity:'UNKNOWN',
  runtimeAuthority:false,runtimeEnabled:false,sourceInputs:[A,B],
  generatedFrom:'Existing Group02 Wiki reference, no invented NPC units',
  maps:early.maps.map(m=>({
   id:m.wikiMapQueryId===null?m.id:'wiki-map-'+m.wikiMapQueryId,
   mapWikiId:m.wikiMapQueryId??null,campaignOrder:m.campaignOrder,
   name:m.name,faction:m.faction??null,mapLevel:m.mapLevel??null,
   cityLevelRequired:m.cityLevelRequired??null,
   advertisedNpcCount:m.npcCountAdvertised??null,
   rosterSourceVerified:m.npcListStatus==='VERIFIED'&&m.npcList.length===m.npcCountAdvertised,
   reward:clone(m.achievementRewards??null),displayedDrops:clone(m.displayedDrops??[]),
   sourceUrl:m.wikiDetailUrl??m.wikiEntryPage??null,
   npcs:m.npcList.map(n=>({
    id:'wiki-m'+m.wikiMapQueryId+'-ai'+n.aiId,wikiAiId:n.aiId,order:n.order,
    name:n.name,kind:n.kind,boss:n.kind==='BOSS',level:n.level??null,
    totalSoldiers:n.soldiers??null,merit:n.merit??null,
    displayedDrop:clone(n.displayedDrop??null),
    detailedFormationStatus:'UNKNOWN',sourceUrl:n.detailUrl,provenance:clone(n.fieldStatus)
   })),
   partialDetailSnapshots:details.npcDetails.filter(d=>d.mapQueryId===m.wikiMapQueryId).map(n=>({
    wikiAiId:n.aiQueryId,npcName:n.npcName,kind:n.encounterType,level:n.level,
    firstMover:n.firstMover,selectedUnit:clone(n.selectedUnit??null),
    selectedUnitCombatFact:clone(n.selectedUnitCombatFact??null),
    selectedDrop:clone(n.selectedDrop??null),fullEnemyTeamVerified:false,
    sourceDepth:n.sourceDepth??null,
    sourceUrl:'https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?map='+
      n.mapQueryId+'&ai='+n.aiQueryId+'&side=vn'
   })),
   playable:false,blockers:['NPC_FORMATIONS_AND_SKILLS_NOT_FULLY_VERIFIED',
      'RUNTIME_HERO_TROOP_SKILL_BINDINGS_NOT_APPROVED']
  })),
  coverage:{
   mapCount:early.maps.length,
   mapsWithVerifiedCompleteRoster:early.maps.filter(m=>m.npcListStatus==='VERIFIED'&&
     m.npcList.length===m.npcCountAdvertised).length,
   indexedNpcRows:early.maps.reduce((s,m)=>s+m.npcList.length,0),
   detailedSingleUnitSnapshots:details.npcDetails.length,playableMapCount:0
  }
 };
}
function main(args){
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const content=JSON.stringify(build(read(A),read(B)),null,2)+'\n';
 const target=path.join(ROOT,TARGET);
 if(args.includes('--check')){
  if(fs.readFileSync(target,'utf8')!==content)throw Error('stale source-derived starter');
 }else fs.writeFileSync(target,content);
 console.log('PASS early campaign source reproducibility');
}
if(require.main===module) {
 try{main(process.argv.slice(2))}
 catch(e){console.error(e.stack||String(e));process.exitCode=1}
}
module.exports={build,main};
