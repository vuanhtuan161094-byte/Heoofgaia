'use strict';
/* CHAT06: battle bridge; source provenance is distinct from project combat mechanics. */
(function(root) {
 const C = (typeof module !== 'undefined' && module.exports)
   ? require('./nl_campaign_core_v1.js') : root.NL_CAMPAIGN_CORE_V1;
 if (!C) throw Error('NL06 missing campaign core');
 const rows=v=>Array.isArray(v)?v:[];
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 const error=s=>{throw Error('NL06: '+s)};
 function grid(npc){
   const a=Array(9).fill(null);
   for(const u of rows(npc.formation)){
     if(!Number.isInteger(u.formationSlot)||u.formationSlot<0||u.formationSlot>8||a[u.formationSlot])error('invalid 3x3');
     a[u.formationSlot]={wikiSlot:u.wikiSlot,slot:u.formationSlot,name:u.name,
       troop:u.troopName,soldiers:u.soldiers,
       skillLabel:u.skill?.label??null,skillOrigin:u.skill?.origin??null,
       troopId:u.troopId,heroId:u.heroId,skillId:u.skill?.skillId??null};
   }
   return a;
 }
 function inspect(catalogue,progress,mapId,cityLevel) {
   C.validateCatalogue(catalogue);
   const map=rows(catalogue.maps).find(m=>m.id===mapId);
   if(!map)error('unknown map');
   const state=C.makeState(progress), cleared=new Set(state.clearedNpcIds);
   const unlocked=C.canEnterMap(catalogue,state,map,cityLevel);
   return {id:map.id,name:map.name,sourceEdition:map.sourceEdition,
     unlockCityLevel:map.cityLevelRequired,unlocked,ready:map.readyForIntegration,
     blockers:copy(map.blockers),
     npcs:map.npcs.map(n=>{
       const previous=map.npcs.filter(x=>x.order<n.order).every(x=>cleared.has(x.id));
       return {id:n.id,order:n.order,name:n.name,level:n.level,boss:n.boss,
         totalSoldiers:n.totalSoldiersRaw,cleared:cleared.has(n.id),
         canFight:!!(unlocked&&n.readyForIntegration&&previous),
         blockers:copy(n.blockers),formation:grid(n)};
     })};
 }
 function prepare(catalogue,progress,selection,registry) {
   if(!registry||typeof registry.resolveUnit!=='function'||typeof registry.resolveEffect!=='function')
     error('combat registry missing');
   const started=C.beginEncounter(catalogue,progress,selection),npc=started.enemy;
   const enemies=npc.formation.map(u=>{
     if(u.bindingStatus!=='APPROVED_ADAPTER'||!u.skill?.skillId||
        !Number.isInteger(u.level)||!Number.isInteger(u.soldiers))error('unit not approved');
     const r=registry.resolveUnit({heroId:u.heroId,troopId:u.troopId,
       skillId:u.skill.skillId,skillOrigin:u.skill.origin,
       slot:u.formationSlot,level:u.level,soldiers:u.soldiers});
     if(!r||r.reviewed!==true||r.heroId!==u.heroId||
       r.troopId!==u.troopId||r.skillId!==u.skill.skillId||!r.stats)error('unit profile mismatch');
     return {id:npc.id+':'+u.wikiSlot,heroId:u.heroId,troopId:u.troopId,
       skillId:u.skill.skillId,skillOrigin:u.skill.origin,
       slot:u.formationSlot,wikiSlot:u.wikiSlot,level:u.level,soldiers:u.soldiers,
       stats:copy(r.stats),statsSource:r.statsSource||'SIMULATED',
       statusIds:copy(r.statusIds||[]),sourceUrl:u.sourceUrl};
   });
   const worldRules=started.worldRules.map(rule=>{
     const r=registry.resolveEffect(rule.runtimeEffectId);
     if(rule.status!=='APPROVED_ADAPTER'||!r||r.reviewed!==true||
       r.id!==rule.runtimeEffectId)error('world rule not approved');
     return {origin:'MAP_WIDE',effectId:r.id,source:copy(rule.label)};
   });
   return {state:started.state,battle:{
     id:selection.battleId,mapId:selection.mapId,npcId:npc.id,
     order:npc.order,boss:npc.boss,enemyUnits:enemies,
     stageSkills:copy(npc.stageExtraSkills),worldRules,
     firstMoverObserved:npc.firstMoverObserved,
     sourceEdition:catalogue.sourceEdition,disallowDirectReward:true
   }};
 }
 function settle(catalogue,progress,report,authority){
   if(!authority||typeof authority.verifyReport!=='function'||
      typeof authority.atomicCommit!=='function')error('Save/receipt authority missing');
   const prior=C.makeState(progress);
   if(!prior.pending||!report||report.battleId!==prior.pending.battleId||
     authority.verifyReport(report,copy(prior.pending))!==true)error('report not authoritative');
   const result=C.settleEncounter(catalogue,prior,
     {battleId:report.battleId,result:report.result,combatVerified:true});
   return authority.atomicCommit({before:prior,after:result.state,
     receiptInstructions:result.rewardInstructions,report:copy(report)});
 }
 const api=Object.freeze({grid,inspect,prepare,settle});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.NL_CAMPAIGN_BATTLE_V1=api;
})(typeof globalThis!=='undefined'?globalThis:this);
