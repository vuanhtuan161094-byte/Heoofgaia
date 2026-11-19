/* Group 05: project skill descriptor → Combat V2 declarative contract.
 * Translating SIMULATED existing project descriptors, NOT importing Wiki skills.
 * Adapted targeting/proc/activation is a new project rule until Chat 08 verifies
 * parity against the actual legacy P2 runtime and owns integration.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.NLProjectSkillAdapterV2=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const fail=s=>{throw new Error("NL_SKILL_ADAPTER_V2: "+s);};
 const known=new Set(["single","double","row","column","all","back","heal"]);
 const statusAllowed=new Set(["break","guard","daze","burn","morale-seal","ward",
    "sleep","fear","anchored","ironwall","focus","repel-blessing","surge"]);
 const legacy=new Set(["break","guard","daze","burn","morale-seal","ward"]);
 function toSkill(id,descriptor,context={}){
   if(!descriptor||!known.has(descriptor.pattern)||!["physical","tactic","magic"].includes(descriptor.kind)||
      typeof descriptor.mult!=="number"||!Number.isFinite(descriptor.mult)||descriptor.mult<=0)
      fail("unresolved project combat descriptor "+id);
   if(descriptor.provenance?.classification!=="SIMULATED")fail("descriptor must be project SIMULATED");
   const healing=descriptor.pattern==="heal";
   const target=healing?{
      team:"ally",pattern:(descriptor.healCount||1)>1?"double":"lowest-hp",priority:"weakest",
      maxTargets:Math.min(5,Math.max(1,descriptor.healCount||1))
   }:{team:"enemy",pattern:descriptor.pattern==="double"?"single":descriptor.pattern,
      priority:descriptor.pattern==="back"?"back":"front"};
   const role=healing?"healer":descriptor.drainMorale?"morale-breaker":
      descriptor.bonusMorale?"support":descriptor.apply==="daze"?"controller":
      descriptor.kind==="magic"?"strategist":"attacker";
   const operations=[];
   if(healing)operations.push({op:"heal",coefficient:descriptor.mult,scope:"selected"});
   else operations.push({op:"damage",lane:descriptor.kind,coefficient:descriptor.mult,
      ...(descriptor.pierce!==undefined?{pierce:descriptor.pierce}:{}),
      ...(descriptor.crit!==undefined?{criticalChance:descriptor.crit}:{}),
      ...(descriptor.pattern==="double"?{repeat:2}:{}),
      scope:"selected"});
   if(descriptor.apply){
     if(!statusAllowed.has(descriptor.apply))fail("unknown project status "+descriptor.apply);
     operations.push({op:"status",effectId:descriptor.apply,scope:"selected",
       ...(legacy.has(descriptor.apply)?{legacyAdapter:true}:{}),
       ...(descriptor.applyChance===undefined?{}:{chance:descriptor.applyChance})});
   }
   if(descriptor.applyAlly){
     if(!statusAllowed.has(descriptor.applyAlly))fail("unknown ally status "+descriptor.applyAlly);
     operations.push({op:"status",effectId:descriptor.applyAlly,
       scope:healing?"selected":"self",
       ...(legacy.has(descriptor.applyAlly)?{legacyAdapter:true}:{})});
   }
   if(Number.isSafeInteger(descriptor.bonusMorale))
     operations.push({op:"morale",delta:descriptor.bonusMorale,scope:"all-allies"});
   if(Number.isSafeInteger(descriptor.drainMorale))
     operations.push({op:"morale",delta:-descriptor.drainMorale,scope:"selected"});
   if(Number.isSafeInteger(descriptor.cleanseNegative)&&descriptor.cleanseNegative>0)
     operations.push({op:"dispel",polarity:"harmful",maxRemove:descriptor.cleanseNegative,
       scope:healing?"selected":"self"});
   return {
      id,role,moraleCost:context.moraleCost??60,target,operations,
      originalTag:descriptor.tag||null,
      descriptorSource:context.path||null,
      adaptation:"SIMULATED_NOT_LEGACY_PARITY",
      notes:descriptor.pattern==="double"?
        "Project V2 interprets double as two independent strikes on one target; confirm native P2 semantics before integration":
        null,
      provenance:{classification:"SIMULATED",sourceId:"project-alpha"}
   };
 }
 function compile(pack,opts={}){
   if(!pack||!pack.skills||!pack.heroes||!Array.isArray(pack.heroes.projectRoster))fail("project source pack required");
   const skills=pack.skills;
   if(!skills.heroById||!skills.enemyByCombatType||!skills.overrides)fail("project skill registry missing");
   const byHero={},byEnemy={},byOverride={},out=[];
   for(const h of pack.heroes.projectRoster){
      if(!skills.heroById[h.id])fail("hero descriptor missing "+h.id);
      const id="project-hero-"+h.id;
      const skill=toSkill(id,skills.heroById[h.id],{path:"skills.heroById."+h.id,
         moraleCost:opts.moraleCost??60});
      byHero[h.id]=id;out.push(skill);
   }
   for(const [key,d] of Object.entries(skills.enemyByCombatType)){
      const id="project-enemy-"+key;byEnemy[key]=id;
      out.push(toSkill(id,d,{path:"skills.enemyByCombatType."+key,moraleCost:opts.moraleCost??60}));
   }
   for(const [key,d] of Object.entries(skills.overrides)){
      const id="project-override-"+key;byOverride[key]=id;
      out.push(toSkill(id,d,{path:"skills.overrides."+key,moraleCost:opts.moraleCost??60}));
   }
   if(new Set(out.map(s=>s.id)).size!==out.length)fail("duplicate skills");
   return {schemaVersion:2,source:"alpha_content.json / PROJECT_ORIGINAL",
      classification:"SIMULATED",adapterStatus:"DESIGN_READY_NOT_RUNTIME",
      skills:out,heroSkillIds:byHero,enemySkillIds:byEnemy,overrideSkillIds:byOverride};
 }
 return Object.freeze({toSkill,compile});
});
