'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {audit}=require('../../../data/ngoalong/modules/campaign/nl_campaign_crosschat_v1.js');
const base=path.resolve(__dirname,'../../../data/ngoalong/modules/campaign');
const source=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));
function fixture(){
 const deps={
  kind:'NL06_CROSS_CHAT_REFERENCE_SNAPSHOT_V1',authority:'REFERENCE_ONLY',
  sourceEdition:'VNG_WIKI_MOBILE_CURRENT',classicParity:'UNKNOWN',runtimeEnabled:false,
  sourceHeads:{heroes:{sha:'h'},troops:{sha:'t'},combat:{sha:'c'}},
  counts:{heroes:2,wikiTroops:2,wikiEffects:1,projectTroops:0,projectEffects:0,projectSkills:0},
  heroes:[{id:'hero-01',name:'Cao Thăng',stageSkillCandidates:[{id:'stage-a',name:'Thiết Bích'}]},
    {id:'hero-02',name:'Cao Thăng',stageSkillCandidates:[{id:'stage-b',name:'Thiết Bích'}]}],
  wikiTroops:[{id:'troop-a',name:'Bộ',wikiNumericId:null},
    {id:'troop-b',name:'Bộ',wikiNumericId:null}],
  wikiEffects:[{id:'wiki-effect-01',label:'Thiết bích',runtimeEnabled:false}],
  projectTroops:[],projectEffects:[],projectSkills:[]
 };
 const npc={id:'wiki-m1-ai77',mapId:'wiki-map-1',wikiAiId:77,boss:true,
  readyForIntegration:false,order:1,formation:[
   {wikiSlot:5,formationSlot:4,name:'Cao Thăng',troopWikiId:456,
    troopName:'Bộ',heroId:null,troopId:null,bindingStatus:'UNRESOLVED',
    skill:{label:'Thiết Bích',sourceNamespace:'NPC_EXCLUSIVE_LABEL',skillId:null}}
  ],wikiNpcLordSkills:[],wikiNpcPassiveSkills:null,wikiNpcStageSkills:[]};
 const map={id:'wiki-map-1',wikiMapId:1,name:'Khúc Dương',readyForIntegration:false,
  mapRules:[],npcs:[npc]};
 const shard={kind:'NGOALONG_CAMPAIGN_SHARD',sourceEdition:'CURRENT_VNG_MOBILE',
  classicWebgameParity:'UNKNOWN',runtimeAuthority:false,runtimeEnabled:false,maps:[map]};
 const manifest={kind:'NGOALONG_CAMPAIGN_SHARD_INDEX',sourceEdition:'CURRENT_VNG_MOBILE',
  classicWebgameParity:'UNKNOWN',runtimeEnabled:false,counts:{maps:1,npcRows:1},
  mapLocator:{'wiki-map-1':{wikiMapId:1,npcCount:1,shard:'shard-001.json'}}};
 const secondary={facts:[{npcId:'wiki-m1-ai77',selectedUnitCombatFact:{
   appliedEffects:[{name:'Thiết bích',target:'self',durationTurns:1}]}}]};
 return {manifest,shards:[shard],deps,secondary};
}
test('NPC exclusive skill stays in stage lane and has zero executable bindings',()=>{
 const {manifest,shards,deps,secondary}=fixture();
 const x=audit(manifest,shards,deps,secondary);
 const u=x.maps[0].npcs[0].units[0];
 assert.equal(x.counts.npcExclusiveUnitSkillRows,1);
 assert.equal(u.skillOrigin,'NPC_STAGE_ADDITION');
 assert.deepEqual(u.stageSkillNameCandidateIds,[]);
 assert.ok(u.blockers.includes('NPC_EXCLUSIVE_NOT_HERO_ACTIVE'));
 assert.deepEqual(u.heroNameCandidateIds,['hero-01','hero-02']);
 assert.deepEqual(u.troopNameCandidateIds,['troop-a','troop-b']);
 assert.deepEqual(u.verifiedTroopNumericIds,[]);
 assert.equal(x.counts.ambiguousHeroNames,1);
 assert.equal(x.counts.ambiguousTroopLabels,1);
 assert.equal(x.verifiedCombatBindings,0);
 assert.equal(x.runtimeEnabled,false);
});
test('source effect fact matches CHAT05 label but remains reference-only',()=>{
 const f=fixture();
 const x=audit(f.manifest,f.shards,f.deps,f.secondary);
 assert.deepEqual(x.selectedUnitEffectFacts[0].effectNameCandidateIds,['wiki-effect-01']);
 assert.equal(x.selectedUnitEffectFacts[0].approvedEffectId,null);
 assert.equal(x.selectedUnitEffectFacts[0].sourceScope,'ONE_SELECTED_UNIT_ONLY');
 assert.equal(x.gameplayReadyMaps,0);
});
test('hero skill name candidates are never equipped-stage proof',()=>{
 const f=fixture();
 f.shards[0].maps[0].npcs[0].formation[0].skill.sourceNamespace='HERO_ACTIVE';
 const x=audit(f.manifest,f.shards,f.deps,{facts:[]});
 const u=x.maps[0].npcs[0].units[0];
 assert.deepEqual(u.stageSkillNameCandidateIds,['stage-a','stage-b']);
 assert.equal(x.counts.heroStageSkillLabelCandidates,1);
 assert.equal(x.counts.heroEquippedSkillBindings,0);
 assert.ok(u.blockers.includes('HERO_EQUIPPED_STAGE_UNKNOWN'));
});
test('a missing numeric Wiki troop ID is not replaced by a similar name',()=>{
 const f=fixture();
 f.shards[0].maps[0].npcs[0].formation[0].troopWikiId=null;
 const x=audit(f.manifest,f.shards,f.deps,f.secondary);
 assert.equal(x.counts.missingTroopWikiIds,1);
 assert.equal(x.counts.numericTroopIdsWithoutVerifiedRegistry,0);
 assert.ok(x.maps[0].npcs[0].units[0].blockers.includes('WIKI_TROOP_ID_MISSING'));
});
test('duplicate formation position fails closed',()=>{
 const f=fixture();
 f.shards[0].maps[0].npcs[0].formation.push({
   ...f.shards[0].maps[0].npcs[0].formation[0]
 });
 assert.throws(()=>audit(f.manifest,f.shards,f.deps,f.secondary),/duplicate formation slot/);
});
test('edition, runtime flag, duplicate maps and unreviewed approval fail closed',()=>{
 const f=fixture();
 f.manifest.classicWebgameParity='VERIFIED';
 assert.throws(()=>audit(f.manifest,f.shards,f.deps,f.secondary),/source scope/);
 f.manifest.classicWebgameParity='UNKNOWN';
 f.shards[0].runtimeEnabled=true;
 assert.throws(()=>audit(f.manifest,f.shards,f.deps,f.secondary),/invalid shard/);
 f.shards[0].runtimeEnabled=false;
 f.shards[0].maps[0].readyForIntegration=true;
 assert.throws(()=>audit(f.manifest,f.shards,f.deps,f.secondary),/unexpected source map approval/);
 f.shards[0].maps[0].readyForIntegration=false;
 assert.throws(()=>audit(f.manifest,[f.shards[0],f.shards[0]],f.deps,f.secondary),/map locator mismatch/);
});
test('missing catalogue shard does not silently under-count',()=>{
 const f=fixture();
 f.manifest.mapLocator['wiki-map-2']={wikiMapId:2,npcCount:1,shard:'shard-002.json'};
 assert.throws(()=>audit(f.manifest,f.shards,f.deps,f.secondary),/incomplete source map coverage/);
});
test('all 249 committed source maps are auditable with pinned CHAT01/02/05 registry',()=>{
 const manifest=source('source_shards/manifest.json');
 const shards=[...new Set(Object.values(manifest.mapLocator).map(x=>x.shard))]
   .sort().map(file=>source('source_shards/'+file));
 const deps=source('crosschat_dependencies_v1.json');
 const x=audit(manifest,shards,deps,source('verified_secondary_wiki_facts_v5.json'));
 assert.equal(x.maps.length,249);
 assert.equal(x.counts.npcs,4903);
 assert.equal(x.counts.units,23914);
 assert.equal(x.gameplayReadyMaps,0);
 assert.equal(x.verifiedCombatBindings,0);
 assert.equal(x.runtimeEnabled,false);
 assert.equal(x.counts.heroEquippedSkillBindings,0);
 assert.equal(deps.counts.heroes,364);
 assert.equal(deps.counts.wikiTroops,372);
 assert.equal(deps.counts.wikiEffects,320);
});
