/* Muu Dinh Tam Quoc: 6 original formation families x 4 historical plans.
 * Strictly data-only: preserves old p3PresetId (family-plan), Save unchanged.
 * All combat coefficients are project SIMULATED, not official VNG formulas.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.NLCombatFormationV2=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";
  const fail=m=>{throw new Error("NL_FORMATION_V2: "+m);};
  const numeric=v=>typeof v==="number"&&Number.isFinite(v);
  const familiesExpected=["spear","shield","arc","fish","goose","turtle"];
  const plansExpected=["van","dieu","thu","kich"];
  const styles=["pressure","counter","protect","finish"];
  function compile(source){
    if(!source||!Array.isArray(source.families)||!Array.isArray(source.plans)||
       source.families.length!==6||source.plans.length!==4)fail("requires six families and four plans");
    const familyIds=new Set(),planIds=new Set();
    for(const f of source.families){
      if(!f||typeof f.id!=="string"||familyIds.has(f.id)||!familiesExpected.includes(f.id))fail("duplicate/unknown family");
      familyIds.add(f.id);
      if(f.provenance?.classification!=="SIMULATED")fail("family must be SIMULATED");
      for(const field of ["atk","def","int","crit"])
        if(!numeric(f.combatModifiers?.[field])||Math.abs(f.combatModifiers[field])>1)fail("invalid modifier "+field);
    }
    for(const p of source.plans){
      if(!p||typeof p.key!=="string"||planIds.has(p.key)||!plansExpected.includes(p.key))fail("unknown plan");
      planIds.add(p.key);
      if(!styles.includes(p.style)||p.provenance?.classification!=="SIMULATED")fail("invalid plan style/source");
      if(!Array.isArray(p.slots)||p.slots.length!==5||new Set(p.slots).size!==5||
         p.slots.some(n=>!Number.isInteger(n)||n<0||n>8))fail("invalid 0-based 3x3 slots");
    }
    return source.families.flatMap(f=>source.plans.map(p=>{
      const m=f.combatModifiers;
      return Object.freeze({
        presetId:f.id+"-"+p.key,formationId:f.id,planId:p.key,
        name:f.name+" · "+p.name,planStyle:p.style,
        // Native P3 uses 0-based slots. V2 resolver uses 1-based slots.
        nativeSlots:Object.freeze([...p.slots]),
        resolverSlots:Object.freeze(p.slots.map(x=>x+1)),
        bonuses:Object.freeze({
          attack:m.atk,defense:m.def,magic:m.int,crit:m.crit,
          planStyle:p.style,presetId:f.id+"-"+p.key
        }),
        provenance:Object.freeze({classification:"SIMULATED",sourceId:"project-alpha"})
      });
    }));
  }
  function preset(catalog,id){
    const p=catalog.find(x=>x.presetId===id);
    if(!p)fail("unknown p3PresetId "+String(id));
    return p;
  }
  function deploy(units,compiled,id,side){
    if(!["p","e"].includes(side))fail("invalid side");
    if(!Array.isArray(units)||units.length>5)fail("max five generals");
    const p=preset(compiled,id);
    return units.map((u,i)=>({...u,side,slot:p.resolverSlots[i]}));
  }
  function formPair(compiled,playerId,enemyId){
    return {p:{...preset(compiled,playerId).bonuses},e:{...preset(compiled,enemyId).bonuses}};
  }
  return Object.freeze({compile,preset,deploy,formPair});
});
