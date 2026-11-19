'use strict';
/*
 * CHAT06 — numeric troop Wiki IDs observed in NPC formation sources.
 * Cross-references CHAT02 identity names without pretending CHAT02 confirmed
 * numeric IDs, tiers, runtime mechanics or Mobile/classic equivalence.
 */
(function(root){
 const norm=x=>typeof x==='string'?x.normalize('NFC').toLocaleLowerCase('vi').trim().replace(/\s+/g,' '):'';
 const arr=x=>Array.isArray(x)?x:[];
 function guard(ok,what){if(!ok)throw Error('NL06 TROOP-ID: '+what)}
 function sourcePairs(manifest,shards){
   guard(manifest?.kind==='NGOALONG_CAMPAIGN_SHARD_INDEX'&&
     manifest.sourceEdition==='CURRENT_VNG_MOBILE'&&
     manifest.classicWebgameParity==='UNKNOWN'&&manifest.runtimeEnabled===false,
     'untrusted manifest/edition/runtime');
   const locator=manifest.mapLocator||{},expected=Object.keys(locator);
   guard(expected.length>0,'no indexed source maps');
   const visited=new Set(),npcKeys=new Set(),pairs=new Map();
   let maps=0,npcs=0,unitSlots=0,missingId=0,missingName=0;
   for(const s of arr(shards)){
     guard(s?.kind==='NGOALONG_CAMPAIGN_SHARD'&&
       s.sourceEdition===manifest.sourceEdition&&
       s.classicWebgameParity==='UNKNOWN'&&s.runtimeAuthority===false&&
       s.runtimeEnabled===false,'untrusted source shard');
     for(const m of arr(s.maps)){
       guard(locator[m.id]&&locator[m.id].wikiMapId===m.wikiMapId&&
         locator[m.id].npcCount===arr(m.npcs).length&&!visited.has(m.id),
         'map locator mismatch: '+m.id);
       visited.add(m.id);maps++;
       for(const npc of arr(m.npcs)){
         guard(npc.id&&npc.mapId===m.id&&!npcKeys.has(npc.id),'duplicate/cross-map NPC');
         npcKeys.add(npc.id);npcs++;
         const slots=new Set();
         for(const u of arr(npc.formation)){
           guard(Number.isInteger(u.wikiSlot)&&u.wikiSlot>=1&&u.wikiSlot<=9&&
             u.formationSlot===u.wikiSlot-1&&!slots.has(u.wikiSlot),
             'invalid 3x3 slot in '+npc.id);
           slots.add(u.wikiSlot);unitSlots++;
           if(!Number.isSafeInteger(u.troopWikiId)||u.troopWikiId<=0){missingId++;continue}
           if(!norm(u.troopName)){missingName++;continue}
           const key=String(u.troopWikiId)+'|'+norm(u.troopName);
           if(!pairs.has(key))pairs.set(key,{
             wikiTroopId:u.troopWikiId,wikiTroopName:u.troopName,count:0,examples:[]});
           const row=pairs.get(key);
           row.count++;
           if(row.examples.length<2)row.examples.push({
             mapId:m.wikiMapId,npcId:npc.id,wikiSlot:u.wikiSlot,
             url:npc.sourceUrl||m.sourceUrl||null});
         }
       }
     }
   }
   guard(visited.size===expected.length,'incomplete source shard coverage');
   if(manifest.counts?.maps!=null)guard(maps===manifest.counts.maps,'map count mismatch');
   if(manifest.counts?.npcRows!=null)guard(npcs===manifest.counts.npcRows,'NPC count mismatch');
   return {maps,npcs,unitSlots,missingId,missingName,
     pairs:[...pairs.values()].sort((a,b)=>a.wikiTroopId-b.wikiTroopId||
       norm(a.wikiTroopName).localeCompare(norm(b.wikiTroopName),'vi'))};
 }
 function reconcile(groups,registry,source={}){
   guard(Array.isArray(groups)&&groups.length>0,'no observed source batches');
   guard(registry?.kind==='NL06_CROSS_CHAT_REFERENCE_SNAPSHOT_V1'&&
     registry.runtimeEnabled===false&&registry.authority==='REFERENCE_ONLY'&&
     registry.sourceHeads?.troops?.sha,'CHAT02 snapshot unpinned');
   guard(registry.counts?.wikiTroops===arr(registry.wikiTroops).length,
     'CHAT02 reference count drift');
   const identities=new Map(),numbers=new Map(),observed=new Map(),shardSet=new Set(),shardPins=new Map();
   for(const unit of registry.wikiTroops){
     const k=norm(unit.name);if(!identities.has(k))identities.set(k,[]);
     identities.get(k).push({id:unit.id,name:unit.name,family:unit.family||null,
       groupLabel:unit.groupLabel||null,tier:unit.tier??null});
   }
   let maps=0,npcs=0,unitSlots=0,missingId=0,missingName=0;
   for(const batch of groups){
     maps+=batch.maps||0;npcs+=batch.npcs||0;unitSlots+=batch.unitSlots??batch.unitOccurrences??0;
     missingId+=batch.missingId||0;missingName+=batch.missingName||0;
     for(const shard of arr(batch.sourceShards)){
       guard(typeof shard.path==='string'&&shard.sha,'missing source shard SHA');
       guard(!shardSet.has(shard.path),'duplicate source shard '+shard.path);shardSet.add(shard.path);shardPins.set(shard.path,shard.sha);
     }
     for(const row of arr(batch.pairs)){
       guard(Number.isSafeInteger(row.wikiTroopId)&&row.wikiTroopId>0&&norm(row.wikiTroopName)&&
         Number.isSafeInteger(row.count)&&row.count>0,'invalid source pair');
       const id=row.wikiTroopId,k=norm(row.wikiTroopName),pair=id+'|'+k;
       if(!numbers.has(id))numbers.set(id,new Map());
       numbers.get(id).set(k,(numbers.get(id).get(k)||0)+row.count);
       if(!observed.has(pair))observed.set(pair,{wikiTroopId:id,wikiTroopName:row.wikiTroopName,
         count:0,examples:[]});
       const target=observed.get(pair);target.count+=row.count;
       for(const ex of arr(row.examples)){
         if(target.examples.length>=2)break;
         if(!target.examples.some(y=>y.npcId===ex.npcId&&y.wikiSlot===ex.wikiSlot))
           target.examples.push(ex);
       }
     }
   }
   guard(shardSet.size>0,'missing shard provenance');
   const nameToIds=new Map();
   for(const [id,names] of numbers)for(const key of names.keys()){
     if(!nameToIds.has(key))nameToIds.set(key,new Set());
     nameToIds.get(key).add(id);
   }
   const all=[...numbers.keys()].sort((a,b)=>a-b).map(id=>{
     const occurrences=[...numbers.get(id).entries()].sort((a,b)=>b[1]-a[1]||
       a[0].localeCompare(b[0],'vi'));
     const primary=observed.get(id+'|'+occurrences[0][0]);
     const catalogue=identities.get(occurrences[0][0])||[];
     const stable=occurrences.length===1;
     const nameShared=nameToIds.get(occurrences[0][0]).size>1;
     const catalogueStatus=!stable?'SOURCE_ID_NAME_CONFLICT':
       catalogue.length===0?'NOT_IN_CHAT02_CATALOGUE':
       catalogue.length>1?'CHAT02_NAME_AMBIGUOUS':
       nameShared?'NAME_USED_BY_OTHER_NUMERIC_ID':'EXACT_UNIQUE_NAME_CANDIDATE';
     return {
       wikiTroopId:id,wikiTroopName:primary.wikiTroopName,
       sourceEvidence:'NPC_FORMATION_WIKI_EXTRACT',sourceIdNameConsistency:
         stable?'CONSISTENT':'CONFLICT',occurrences:occurrences.reduce((s,x)=>s+x[1],0),
       observedLabels:occurrences.map(([label,count])=>({label,count})),
       otherNumericIdsSameName:[...nameToIds.get(occurrences[0][0])]
         .filter(x=>x!==id).sort((a,b)=>a-b),
       chat02CandidateIds:catalogue.map(x=>x.id),
       chat02Candidates:catalogue,catalogueStatus,
       sourceExamples:primary.examples,sourceEdition:'CURRENT_VNG_MOBILE',
       classicParity:'UNKNOWN',numericIdIndependentlyVerified:false,
       approvedRuntimeTroopId:null,approvedNumericIdentity:false,
       status:'SOURCE_CROSSWALK_REFERENCE_ONLY'
     };
   });
   const matchedByName=all.filter(x=>x.catalogueStatus==='EXACT_UNIQUE_NAME_CANDIDATE');
   const unmatched=all.filter(x=>x.catalogueStatus==='NOT_IN_CHAT02_CATALOGUE');
   const ambiguous=all.filter(x=>x.catalogueStatus==='CHAT02_NAME_AMBIGUOUS'||
       x.catalogueStatus==='NAME_USED_BY_OTHER_NUMERIC_ID');
   const conflicted=all.filter(x=>x.catalogueStatus==='SOURCE_ID_NAME_CONFLICT');
   const unitCount=all.reduce((s,x)=>s+x.occurrences,0)+missingId+missingName;
   guard(unitCount===unitSlots,'source occurrence count drift');
   return {schemaVersion:2,kind:'NL06_NPC_NUMERIC_TROOP_CROSSWALK_V2',
     sourceEdition:'CURRENT_VNG_MOBILE',classicParity:'UNKNOWN',
     authority:'REFERENCE_ONLY',runtimeEnabled:false,
     sourceHeads:{troops:registry.sourceHeads.troops,
       campaign:source.campaignHead||null},
     sourceManifestBlobSha:source.manifestBlobSha||null,
     sourceShardBlobs:[...shardSet].sort().map(path=>({path,sha:shardPins.get(path)})),
     method:'SOURCE_NPC_ID_PLUS_NAME_TO_CHAT02_EXACT_NAME_CANDIDATE',
     policy:{numericIdIndependentConfirmation:'PENDING',candidateNamesNotRuntimeBindings:true,
       noUnprovenTierInference:true,unknownAndAmbiguousStayBlocked:true,
       CHAT02MustApproveNumericIdPerIdentity:true},
     counts:{maps,npcs,unitSlots,missingNumericIds:missingId,
       missingTroopNames:missingName,distinctNumericIds:all.length,
       sourceIdNameConflicts:conflicted.length,
       exactUniqueCatalogueNameCandidates:matchedByName.length,
       ambiguousCatalogueMatches:ambiguous.length,
       missingCatalogueNames:unmatched.length,
       sourceNumericIdsVerifiedForCombat:0,runtimePlayableBindings:0,
       candidateUnitOccurrences:matchedByName.reduce((s,x)=>s+x.occurrences,0),
       ambiguousUnitOccurrences:ambiguous.reduce((s,x)=>s+x.occurrences,0),
       missingCatalogueUnitOccurrences:unmatched.reduce((s,x)=>s+x.occurrences,0)},
     records:all};
 }
 function resolve(crosswalk,wikiTroopId,sourceName){
   guard(crosswalk?.kind==='NL06_NPC_NUMERIC_TROOP_CROSSWALK_V2'&&
     crosswalk.runtimeEnabled===false,'untrusted report');
   const row=arr(crosswalk.records).find(x=>x.wikiTroopId===wikiTroopId);
   if(!row||norm(row.wikiTroopName)!==norm(sourceName))
     return {status:'UNRESOLVED_SOURCE_ID_OR_NAME',runtimeTroopId:null};
   return {status:row.catalogueStatus,candidates:row.chat02CandidateIds,
     numericIdIndependentlyVerified:false,runtimeTroopId:null};
 }
 function main(){
   const fs=require('node:fs'),path=require('node:path');
   const base=path.join(process.cwd(),'data/ngoalong/modules/campaign');
   const read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
   const manifest=read('source_shards/manifest.json');
   const filenames=[...new Set(Object.values(manifest.mapLocator).map(x=>x.shard))].sort();
   const shards=filenames.map(x=>read('source_shards/'+x));
   const result=sourcePairs(manifest,shards);
   // Source-shard Git SHA annotations are pinned in the committed review report.
   const pins=read('troop_id_source_pins_v2.json');
   result.sourceShards=filenames.map(name=>{
     const p=pins.sourceShards.find(x=>x.path.endsWith('/'+name));
     guard(p&&p.sha,'missing source pin '+name);return p;
   });
   const report=reconcile([result],read('crosschat_dependencies_v1.json'),
     {campaignHead:pins.campaignHead,manifestBlobSha:pins.manifestBlobSha});
   const target=path.join(base,'npc_numeric_troop_crosswalk_v2.json');
   const payload=JSON.stringify(report,null,2)+'\n';
   if(process.argv.includes('--check')){
     guard(fs.existsSync(target)&&fs.readFileSync(target,'utf8')===payload,'crosswalk report drift');
   }else fs.writeFileSync(target,payload,'utf8');
   process.stdout.write(JSON.stringify(report.counts)+'\n');
 }
 const api=Object.freeze({sourcePairs,reconcile,resolve,normalize:norm});
 if(typeof module!=='undefined'&&module.exports){
   module.exports=api;
   if(typeof require!=='undefined'&&require.main===module)main();
 }else root.NL06_NPC_TROOP_ID_V2=api;
})(typeof globalThis!=='undefined'?globalThis:this);
