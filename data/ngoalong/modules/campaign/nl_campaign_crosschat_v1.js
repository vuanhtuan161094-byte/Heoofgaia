'use strict';
/**
 * CHAT06 cross-chat NPC/skill/effect/troop reconciliation.
 * READ-ONLY evidence: a name match is NEVER a runtime skill or troop binding.
 * Source packs: CHAT01 heroes, CHAT02 troops, CHAT05 effects/skills, CHAT06 shards.
 * CHAT08 alone may promote approved bindings into combat/Save/generator.
 */
(function(root){
 const N = v => typeof v==='string' ? v.normalize('NFC').toLocaleLowerCase('vi').trim().replace(/\s+/g,' ') : '';
 const arr = v => Array.isArray(v) ? v : [];
 const fail = s => { throw new Error('NL06 CROSSCHAT: '+s); };
 const has = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
 function group(rows, key){
   const x=new Map();
   for(const row of rows){const k=N(key(row));if(!k)continue;
     if(!x.has(k))x.set(k,[]);x.get(k).push(row);}
   return x;
 }
 function uniqueSorted(rows){return [...new Set(rows)].sort((a,b)=>String(a).localeCompare(String(b),'vi'));}
 function indexOf(deps){
   if(!deps||deps.kind!=='NL06_CROSS_CHAT_REFERENCE_SNAPSHOT_V1'||
       deps.authority!=='REFERENCE_ONLY'||deps.runtimeEnabled!==false||
       deps.sourceEdition!=='VNG_WIKI_MOBILE_CURRENT'||deps.classicParity!=='UNKNOWN')
     fail('untrusted dependency snapshot');
   if(!deps.sourceHeads?.heroes?.sha||!deps.sourceHeads?.troops?.sha||!deps.sourceHeads?.combat?.sha)
     fail('unpinned CHAT01/02/05 source HEADs');
   for(const [field,expected] of Object.entries(deps.counts||{})){
     if(!Array.isArray(deps[field])||deps[field].length!==expected)
       fail('dependency count drift '+field);
   }
   const allTroopIds=arr(deps.wikiTroops).map(x=>x.id);
   if(new Set(allTroopIds).size!==allTroopIds.length)fail('duplicate troop registry IDs');
   const numerics=new Map();
   for(const t of arr(deps.wikiTroops)) {
     if(t.wikiNumericId==null)continue;
     if(!Number.isSafeInteger(t.wikiNumericId) || t.wikiNumericId<1)
       fail('invalid wiki numeric troop id in registry');
     if(!numerics.has(t.wikiNumericId))numerics.set(t.wikiNumericId,[]);
     numerics.get(t.wikiNumericId).push(t);
   }
   return {heroes:group(deps.heroes,x=>x.name),
     troops:group(deps.wikiTroops,x=>x.name),
     effects:group(deps.wikiEffects,x=>x.label), numerics};
 }
 function names(index,label){return arr(index.get(N(label))).map(x=>x.id).sort();}
 function labelOf(row){
   if(typeof row==='string')return row;
   if(row&&typeof row==='object')return row.skillName||row.label||row.name||null;
   return null;
 }
 function sourceSkills(value,origin,ctx,stats) {
   if(value===null||value===undefined){stats.unknownNpcSkillCollections++;return [];}
   if(!Array.isArray(value)){
     if(typeof value==='string'||(value&&typeof value==='object'&&labelOf(value)))
       value=[value];
     else {stats.unknownNpcSkillCollections++;return [];}
   }
   const result=[];
   for(const s of value){
     const label=labelOf(s),evidence=label?names(ctx.effects,label):[];
     if(evidence.length)stats.npcSkillLabelsWithWikiEffectNameCandidate++;
     result.push({origin,label,sourceRecord:s,effectNameCandidates:evidence,
       verifiedCombatBinding:false,status:label?'LABEL_ONLY_NOT_RUNTIME_RULE':'LABEL_UNKNOWN'});
   }
   return result;
 }
 function audit(manifest,shards,deps,secondary={}){
   if(!manifest||manifest.kind!=='NGOALONG_CAMPAIGN_SHARD_INDEX'||
       manifest.sourceEdition!=='CURRENT_VNG_MOBILE'||
       manifest.classicWebgameParity!=='UNKNOWN'||manifest.runtimeEnabled!==false)
     fail('source scope or runtime gate changed');
   const expected=Object.keys(manifest.mapLocator||{});
   if(!expected.length||!Array.isArray(shards)||!shards.length)
     fail('missing source catalogue');
   const ctx=indexOf(deps),visited=new Set(),npcsSeen=new Set(),slotsSeen=new Set();
   const mapRows=[],uniqueTroops=new Map(),uniqueSkills=new Map(),effectFacts=[];
   const factsByNpc=new Map(arr(secondary.facts).map(f=>[f.npcId,f]));
   const stats={maps:0,npcs:0,bosses:0,units:0,missingTroopWikiIds:0,
     numericTroopIdsWithoutVerifiedRegistry:0,uniqueTroopLabelCandidates:0,
     ambiguousTroopLabels:0,uniqueHeroNameCandidates:0,ambiguousHeroNames:0,
     missingSkillLabels:0,npcExclusiveUnitSkillRows:0,
     heroStageSkillLabelCandidates:0,heroEquippedSkillBindings:0,
     unknownNpcSkillCollections:0,npcSkillLabelsWithWikiEffectNameCandidate:0,
     selectedUnitFacts:0,selectedUnitEffectLabels:0,selectedUnitEffectNameCandidates:0,
     mapWideSourceRules:0,sourceReadyForCombat:0,approvedBindings:0,
     runtimeEnabledMaps:0};
   for(const shard of shards){
     if(shard?.kind!=='NGOALONG_CAMPAIGN_SHARD'||
         shard.sourceEdition!==manifest.sourceEdition||
         shard.classicWebgameParity!=='UNKNOWN'||
         shard.runtimeEnabled!==false||shard.runtimeAuthority!==false)
       fail('invalid shard or runtime authority');
     for(const m of arr(shard.maps)){
       const pointer=manifest.mapLocator[m.id];
       if(!has(manifest.mapLocator,m.id)||visited.has(m.id)||pointer.wikiMapId!==m.wikiMapId||
           pointer.npcCount!==arr(m.npcs).length)fail('map locator mismatch '+m.id);
       if(m.readyForIntegration!==false)fail('unexpected source map approval '+m.id);
       visited.add(m.id);stats.maps++;
       let mapUnits=0,mapExclusives=0,mapMissingTroops=0,mapMissingSkills=0;
       const npcs=[];
       for(const npc of arr(m.npcs)){
         if(!npc.id||npcsSeen.has(npc.id)||npc.mapId!==m.id)
           fail('duplicate or invalid NPC '+npc.id);
         npcsSeen.add(npc.id);stats.npcs++;
         if(npc.boss===true)stats.bosses++;
         if(npc.readyForIntegration!==false)fail('unexpected NPC battle approval '+npc.id);
         const npcSkills=[
           ...sourceSkills(npc.wikiNpcLordSkills,'NPC_LORD',ctx,stats),
           ...sourceSkills(npc.wikiNpcPassiveSkills,'NPC_PASSIVE',ctx,stats),
           ...sourceSkills(npc.wikiNpcStageSkills,'NPC_STAGE_ADDITION',ctx,stats)
         ];
         const units=[];
         for(const u of arr(npc.formation)){
           if(!Number.isInteger(u.wikiSlot)||u.wikiSlot<1||u.wikiSlot>9||
               u.formationSlot!==u.wikiSlot-1)fail('invalid 3x3 source slot '+npc.id);
           const unitKey=npc.id+':'+u.wikiSlot;
           if(slotsSeen.has(unitKey))fail('duplicate formation slot '+unitKey);
           slotsSeen.add(unitKey);stats.units++;mapUnits++;
           if(u.bindingStatus==='APPROVED_ADAPTER'||u.heroId||u.troopId||u.skill?.skillId)
             fail('source unit already bound without CHAT08 '+unitKey);
           const troopNameIds=names(ctx.troops,u.troopName);
           const numericMatches=ctx.numerics.get(u.troopWikiId)||[];
           const numericVerified=numericMatches.filter(t=>t.numericIdVerified===true);
           const heroIds=names(ctx.heroes,u.name);
           const skillLabel=u.skill?.label??null;
           const namespace=u.skill?.sourceNamespace||'UNKNOWN';
           const exclusive=namespace==='NPC_EXCLUSIVE_LABEL'||
             namespace==='NPC_STAGE_ADDITION'||u.skill?.sourceType==='NPC_EXCLUSIVE_SKILL';
           if(exclusive){stats.npcExclusiveUnitSkillRows++;mapExclusives++;}
           if(!skillLabel){stats.missingSkillLabels++;mapMissingSkills++;}
           if(u.troopWikiId==null){stats.missingTroopWikiIds++;mapMissingTroops++;}
           else if(numericVerified.length!==1)stats.numericTroopIdsWithoutVerifiedRegistry++;
           if(troopNameIds.length===1)stats.uniqueTroopLabelCandidates++;
           if(troopNameIds.length>1)stats.ambiguousTroopLabels++;
           if(heroIds.length===1)stats.uniqueHeroNameCandidates++;
           if(heroIds.length>1)stats.ambiguousHeroNames++;
           const stageCandidates=exclusive?[]:uniqueSorted(heroIds.flatMap(id=>
             arr(deps.heroes.find(h=>h.id===id)?.stageSkillCandidates)
               .filter(s=>N(s.name)===N(skillLabel)).map(s=>s.id)));
           if(stageCandidates.length)stats.heroStageSkillLabelCandidates++;
           const troopKey=String(u.troopWikiId??'UNKNOWN')+'|'+N(u.troopName);
           if(!uniqueTroops.has(troopKey))uniqueTroops.set(troopKey,{
             wikiTroopId:u.troopWikiId??null,sourceName:u.troopName??null,
             nameCandidateIds:troopNameIds,numericVerifiedIds:numericVerified.map(x=>x.id),
             status:'NOT_APPROVED',uses:0});
           uniqueTroops.get(troopKey).uses++;
           const skillKey=namespace+'|'+N(skillLabel);
           if(!uniqueSkills.has(skillKey))uniqueSkills.set(skillKey,{
             sourceNamespace:namespace,skillLabel,originLane:exclusive?'NPC_STAGE_ADDITION':
               (namespace==='HERO_ACTIVE'?'HERO_ACTIVE':
                namespace==='TROOP_ACTIVE'?'TROOP_ACTIVE':'ORIGIN_UNVERIFIED'),
             status:'SOURCE_LABEL_NOT_COMBAT_BINDING',uses:0});
           uniqueSkills.get(skillKey).uses++;
           units.push({unitKey,wikiSlot:u.wikiSlot,sourceHeroName:u.name??null,
             sourceTroopWikiId:u.troopWikiId??null,sourceTroopName:u.troopName??null,
             heroNameCandidateIds:heroIds,troopNameCandidateIds:troopNameIds,
             verifiedTroopNumericIds:numericVerified.map(x=>x.id),
             skillLabel,skillSourceNamespace:namespace,
             skillOrigin:exclusive?'NPC_STAGE_ADDITION':'NOT_VERIFIED',
             stageSkillNameCandidateIds:stageCandidates,
             blockers:uniqueSorted([
               'NO_APPROVED_COMBAT_UNIT_BINDING',
               u.troopWikiId==null?'WIKI_TROOP_ID_MISSING':'WIKI_TROOP_NUMERIC_ID_UNVERIFIED',
               !skillLabel?'SKILL_SOURCE_LABEL_MISSING':'SKILL_ORIGIN_OR_RUNTIME_ID_UNVERIFIED',
               exclusive?'NPC_EXCLUSIVE_NOT_HERO_ACTIVE':'HERO_EQUIPPED_STAGE_UNKNOWN'
             ])});
         }
         const selected=factsByNpc.get(npc.id);
         if(selected) {
           stats.selectedUnitFacts++;
           for(const fx of arr(selected.selectedUnitCombatFact?.appliedEffects)){
             stats.selectedUnitEffectLabels++;
             const candidates=names(ctx.effects,fx.name);
             if(candidates.length)stats.selectedUnitEffectNameCandidates++;
             effectFacts.push({npcId:npc.id,sourceScope:'ONE_SELECTED_UNIT_ONLY',
               label:fx.name,sourceTarget:fx.target??null,
               effectNameCandidateIds:candidates,approvedEffectId:null,
               status:'REFERENCE_LABEL_ONLY_NOT_RESOLVED_OPERATION'});
           }
         }
         npcs.push({npcId:npc.id,boss:npc.boss===true,order:npc.order,
           sourceNpcSkillLanes:npcSkills,units,readyForIntegration:false});
       }
       const ruleRows=arr(m.mapRules).map(r=>{
         stats.mapWideSourceRules++;
         return {origin:'MAP_WIDE',sourceLabel:r.label??null,
           status:'SOURCE_ONLY_NOT_RUNTIME_EFFECT',
           candidateEffectIds:names(ctx.effects,r.label?.name||r.label?.label||null)};
       });
       mapRows.push({mapId:m.id,wikiMapId:m.wikiMapId,name:m.name,npcCount:npcs.length,
         unitCount:mapUnits,missingTroopIdSlots:mapMissingTroops,
         missingSkillLabelSlots:mapMissingSkills,npcExclusiveUnitSkills:mapExclusives,
         mapRules:ruleRows,readyForIntegration:false,npcs});
     }
   }
   if(visited.size!==expected.length)fail('incomplete source map coverage');
   if(manifest.counts?.maps!=null&&stats.maps!==manifest.counts.maps)fail('map count drift');
   if(manifest.counts?.npcRows!=null&&stats.npcs!==manifest.counts.npcRows)fail('NPC count drift');
   mapRows.sort((a,b)=>a.wikiMapId-b.wikiMapId);
   return {schemaVersion:1,kind:'NL06_CROSS_CHAT_RECONCILIATION_V1',
     edition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',runtimeAuthority:false,
     runtimeEnabled:false,verifiedCombatBindings:0,gameplayReadyMaps:0,
     dependencies:deps.sourceHeads,counts:stats,
     troopCrosswalk:[...uniqueTroops.values()].sort((a,b)=>b.uses-a.uses),
     skillCrosswalk:[...uniqueSkills.values()].sort((a,b)=>b.uses-a.uses),
     selectedUnitEffectFacts:effectFacts,maps:mapRows};
 }
 function runCli(){
   const fs=require('node:fs'),path=require('node:path');
   const base=path.join(process.cwd(),'data/ngoalong/modules/campaign');
   const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
   const manifest=read('source_shards/manifest.json');
   const shards=uniqueSorted(Object.values(manifest.mapLocator).map(x=>x.shard))
     .map(name=>read('source_shards/'+name));
   const data=audit(manifest,shards,read('crosschat_dependencies_v1.json'),
     read('verified_secondary_wiki_facts_v5.json'));
   const target=path.join(base,'crosschat_reconciliation_v1.json');
   const encoded=JSON.stringify(data,null,2)+'\n';
   if(process.argv.includes('--check')){
     if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==encoded)
       fail('reconciliation output missing or drifted');
   }else fs.writeFileSync(target,encoded,'utf8');
   process.stdout.write(JSON.stringify({counts:data.counts,
     maps:data.maps.length,playable:data.gameplayReadyMaps,
     mode:process.argv.includes('--check')?'CHECK':'GENERATED'})+'\n');
 }
 const api=Object.freeze({audit,normalize:N});
 if(typeof module!=='undefined'&&module.exports){
   module.exports=api;
   if(typeof require!=='undefined'&&require.main===module)runCli();
 } else root.NL06_CROSSCHAT_V1=api;
})(typeof globalThis!=='undefined'?globalThis:this);
