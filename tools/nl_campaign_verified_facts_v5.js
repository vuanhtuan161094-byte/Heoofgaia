'use strict';
/* CHAT06: deterministic reference-only selected NPC combat facts (not full teams). */
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const A='data/ngoalong/group02_wiki/npc_details.json';
const B='data/ngoalong/group02_wiki/maps_npcs.json';
const C='data/ngoalong/modules/campaign/evidence_batches/batch-001.json';
const OUT='data/ngoalong/modules/campaign/verified_secondary_wiki_facts_v5.json';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function build(details,indexed,reference){
 if(details.edition!=='CURRENT_MOBILE'||details.classicParity!=='UNKNOWN'||
  indexed.classicParity!=='UNKNOWN'||
  reference.kind!=='NGOALONG_CAMPAIGN_EVIDENCE_BATCH'||
  reference.sourceEdition!=='CURRENT_VNG_MOBILE')
  throw Error('NL06: secondary sources are not reviewed for this edition');
 const byId=new Map(reference.maps.flatMap(m=>m.npcs.map(n=>[n.id,n])));
 const facts=details.npcDetails.map(n=>{
  const id='wiki-m'+n.mapQueryId+'-ai'+n.aiQueryId;
  const p=byId.get(id);
  if(!p?.snapshot||p.snapshot.conflictCount!==0)
    throw Error('NL06: selected NPC snapshot not corroborated: '+id);
  return {
   npcId:id,wikiMapId:n.mapQueryId,wikiAiId:n.aiQueryId,npcName:n.npcName,
   wikiDetailUrl:'https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?map='+
      n.mapQueryId+'&ai='+n.aiQueryId+'&side=vn',
   scope:'ONE_SELECTED_UNIT_ONLY',firstMoverObserved:n.firstMover||null,
   attackCoefficientDisplay:n.attackCoefficientDisplay??null,
   attackCoefficientMeaning:'UNKNOWN',
   selectedUnit:clone(n.selectedUnit??null),
   selectedUnitCombatFact:clone(n.selectedUnitCombatFact??null),
   displayedSelectedDrop:clone(n.selectedDrop??null),
   verifiedComparisons:p.snapshot.agreementCount,
   pendingComparisons:p.snapshot.unknownCount,
   sourceDepth:n.sourceDepth??null,
   status:'CORROBORATED_SOURCE_REFERENCE_NOT_GAMEPLAY_RULE',
   approvedCombatSkillId:null,approvedCombatEffectId:null,
   fullNpcFormationVerified:false,autoAppliedToGame:false
  };
 });
 return {
  schemaVersion:1,kind:'NGOALONG_CAMPAIGN_SINGLE_UNIT_WIKI_FACTS_V5',
  edition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',runtimeAuthority:false,
  sourceFile:A,sourceScope:'SEVEN_EXAMPLES_NOT_FULL_NPC_SKILLS',
  counts:{npcSnapshots:facts.length,skillFacts:facts.filter(x=>x.selectedUnitCombatFact!=null).length,
    verifiedFieldComparisons:facts.reduce((a,x)=>a+x.verifiedComparisons,0),
    gameplaySkillBindings:0},facts,
  indexedMapSourceFacts:indexed.maps.map(m=>({
   mapId:'wiki-map-'+m.mapQueryId,wikiMapId:m.mapQueryId,
   name:m.name,sourceId:m.sourceId,evidenceAccess:m.evidenceAccess,
   needsLiveBrowserConfirmation:m.needsLiveBrowserConfirmation,
   mapLevel:m.mapLevel??null,cityLevel:m.cityLevelUnlock??null,
   observedClearReward:m.clearReward??null,observedDrops:m.drops??[],
   revenueOrRewardRuntimeApproved:false,
   observedNpcRows:m.npcs?.length??0,
   sourceNotes:'SEARCH_INDEXED_REFERENCE_ONLY_UNVERIFIED_RUNTIME',
   autoAppliedToGame:false
  }))
 };
}
function main(args){
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const result=build(read(A),read(B),read(C)),content=JSON.stringify(result,null,2)+'\n';
 const dest=path.join(ROOT,OUT);
 if(args.includes('--check')){
  if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==content)
    throw Error('NL06: secondary Wiki skill facts out of sync');
 } else fs.writeFileSync(dest,content,'utf8');
 console.log(JSON.stringify(result.counts));
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){console.error(e.stack||String(e));process.exitCode=1}
}
module.exports={build,main};
