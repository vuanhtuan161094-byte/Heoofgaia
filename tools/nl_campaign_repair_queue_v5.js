'use strict';
/* CHAT06 — rank gaps in 249 source-reconciled maps; never infer unknown values. */
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const IN='data/ngoalong/modules/campaign/source_reconciliation_index_v5.json';
const OUT='data/ngoalong/modules/campaign/source_repair_queue_v5.json';
const tiers={
 P0:'STRUCTURAL_SOURCE_COMPLETE_REQUIRES_MECHANICS',
 P1:'EARLY_MAIN_ROUTE_SMALL_SOLDIER_GAP',
 P2:'OTHER_SMALL_SOURCE_GAP',
 P3:'NUMERIC_SOLDIER_CONTRADICTIONS',
 P4:'MISSING_NPC_FORMATION',
 P5:'INCOMPLETE_NPC_ROSTER',
 P6:'LARGE_OR_UNVERIFIED_UNIT_SOLDIER_GAP'
};
function classify(m){
 if(m.rosterComplete&&m.missingUnitSoldiers===0&&
   m.soldierDiscrepancies===0&&m.nonExhaustiveFormations===0)return 'P0';
 if([1,2].includes(m.wikiMapId)&&m.rosterComplete&&m.missingUnitSoldiers<=3&&
    m.soldierDiscrepancies===0&&m.nonExhaustiveFormations===0)return 'P1';
 if(m.rosterComplete&&m.missingUnitSoldiers>0&&m.missingUnitSoldiers<=5&&
    m.soldierDiscrepancies===0&&m.nonExhaustiveFormations===0)return 'P2';
 if(m.soldierDiscrepancies>0)return 'P3';
 if(m.nonExhaustiveFormations>0)return 'P4';
 if(!m.rosterComplete)return 'P5';
 return 'P6';
}
function make(index){
 if(index?.kind!=='NGOALONG_CAMPAIGN_EVIDENCE_AUDIT_V5'||
  index.classicParity!=='UNKNOWN'||index.runtimeAuthority!==false||
  index.gameplayEnabled!==false||index.counts?.maps!==249)
  throw Error('NL06 repair queue: source scope not accepted');
 const seen=new Set();
 const rows=index.maps.map(m=>{
  if(seen.has(m.id))throw Error('duplicate map');seen.add(m.id);
  const tier=classify(m);
  const actions=[];
  if(!m.rosterComplete)actions.push('VERIFY_NPC_INDEX_COUNT_AND_MISSING_AI_IDS');
  if(m.nonExhaustiveFormations)actions.push('REVIEW_3X3_NPC_FORMATIONS');
  if(m.missingUnitSoldiers)actions.push('VERIFY_WIKI_UNIT_SOLDIER_COUNTS');
  if(m.zeroRemainderAmbiguities)actions.push('RECHECK_ZERO_REMAINDER_UNKNOWN_UNITS_NO_AUTOFILL');
  if(m.soldierDiscrepancies)actions.push('RESOLVE_REPORTED_TOTAL_VS_OBSERVED_UNIT_SUM');
  if(m.missingSkillLabels)actions.push('VERIFY_SOURCE_SKILL_LABELS');
  if(m.missingTroopIds)actions.push('VERIFY_SOURCE_TROOP_IDENTITIES');
  actions.push('REVIEW_MOBILE_PATCH_AND_NPC_EXCLUSIVE_SKILL_EFFECTS');
  actions.push('BIND_REVIEWED_TROOP_HERO_SKILL_IDS_WITH_CHAT01_02_05');
  actions.push('CHAT08_INTEGRATE_REAL_COMBAT_AND_SAVE_RECEIPTS');
  return {
   wikiMapId:m.wikiMapId,name:m.name,id:m.id,sourceUrl:m.sourceUrl,
   cityLevelRequired:m.cityLevelRequired,priority:tier,priorityMeaning:tiers[tier],
   rosterComplete:m.rosterComplete,npcRows:m.npcCount,
   missingUnitSoldiers:m.missingUnitSoldiers,
   sourceSoldierDiscrepancies:m.soldierDiscrepancies,
   nonExhaustiveFormations:m.nonExhaustiveFormations,
   zeroRemainderAmbiguities:m.zeroRemainderAmbiguities,
   requiredActions:actions,
   sourceDataApprovedForCombat:false,
   currentStatus:'REFERENCE_ONLY'
  };
 }).sort((a,b)=>a.priority.localeCompare(b.priority)||
   a.missingUnitSoldiers-b.missingUnitSoldiers||a.wikiMapId-b.wikiMapId);
 const counts=Object.fromEntries(Object.keys(tiers).map(p=>[p,rows.filter(r=>r.priority===p).length]));
 if(rows.length!==249||Object.values(counts).reduce((a,b)=>a+b,0)!==249)
  throw Error('NL06 repair queue: incomplete map coverage');
 return {
  schemaVersion:1,kind:'NGOALONG_CAMPAIGN_249_MAP_SOURCE_REPAIR_QUEUE',
  edition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',
  runtimeAuthority:false,gameplayEnabled:false,
  sourceAuditIndex:IN,counts,tierDescriptions:tiers,maps:rows
 };
}
function main(args){
 const index=JSON.parse(fs.readFileSync(path.join(ROOT,IN),'utf8'));
 const out=JSON.stringify(make(index),null,2)+'\n',target=path.join(ROOT,OUT);
 if(args.includes('--check')){
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==out)
   throw Error('NL06: stale repair queue');
 }else fs.writeFileSync(target,out,'utf8');
 console.log(JSON.stringify(make(index).counts));
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){console.error(e.stack||String(e));process.exitCode=1}
}
module.exports={classify,make,main};
