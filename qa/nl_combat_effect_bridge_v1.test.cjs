"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const Engine=require("../tools/nl_combat_effects_v1.js");
const Bridge=require("../tools/nl_combat_effect_bridge_v1.js");
const catalog=JSON.parse(fs.readFileSync("data/ngoalong/modules/combat/effects_v1.json","utf8"));
const alpha=JSON.parse(fs.readFileSync("data/ngoalong/alpha_content.json","utf8"));
const api=Bridge.create(catalog,alpha.statusEffects);
let checks=0;
function check(label,action){action();checks++;console.log("PASS "+checks+" "+label);}
const unit=()=>({id:"test",team:"p",hp:100,maxHp:100,morale:30,effects:[]});
check("V1 catalog is valid",()=>assert.equal(Engine.validateCatalog(catalog),true));
check("all six legacy IDs remain distinct",()=>assert.deepEqual(api.legacyIds,["break","guard","daze","burn","morale-seal","ward"]));
check("only seven additive original effects",()=>assert.deepEqual(api.additionalIds,["sleep","fear","anchored","ironwall","focus","repel-blessing","surge"]));
check("four coefficient/behavior conflicts explicitly reported",()=>assert.equal(api.legacyDifferences.length,4));
check("six old entries unaffected",()=>{
 const u=unit();u.effects.push({kind:"burn",turns:2});
 assert.throws(()=>api.apply(u,"burn"),/must NOT be replaced/);
 assert.deepEqual(u.effects,[{kind:"burn",turns:2}]);
});
check("focus applies to live battle unit",()=>{
 const u=unit();assert.equal(api.apply(u,"focus").accepted,true);
 assert.equal(u.effects[0].kind,"focus");assert.equal(u.effects[0].nlEffectV1,true);
});
check("focus stacks cap at three",()=>{
 const u=unit();for(let i=0;i<7;i++)api.apply(u,"focus");
 assert.equal(u.effects[0].stacks,3);
});
check("focus modifies actual hit multiplier",()=>{
 const u=unit();api.apply(u,"focus");assert.equal(api.modifiers(u).outgoingDamageMultiplier,1.08);
});
check("surge replaces, does not stack",()=>{
 const u=unit();api.apply(u,"surge");api.apply(u,"surge");
 assert.equal(u.effects[0].stacks,1);
});
check("refresh two-round effect via engine",()=>{
 const u=unit();api.apply(u,"focus");api.endRound(u);assert.equal(u.effects[0].turns,1);
 api.apply(u,"focus");assert.equal(u.effects[0].turns,2);
});
check("two round-end ticks expire focus",()=>{
 const u=unit();api.apply(u,"focus");api.endRound(u);api.endRound(u);
 assert.equal(u.effects.length,0);
});
check("ironwall blocks exactly one incoming event",()=>{
 const u=unit();api.apply(u,"ironwall");
 assert.equal(api.consumeShield(u),true);assert.equal(api.consumeShield(u),false);
 assert.equal(u.hp,100);
});
check("repel blessing blocks new beneficial focus",()=>{
 const u=unit();api.apply(u,"repel-blessing");
 assert.equal(api.apply(u,"focus").accepted,false);
});
check("generic cleanse dispels removable extra harmful",()=>{
 const u=unit();api.apply(u,"sleep");assert.deepEqual(api.dispel(u,"harmful",1).removed,["sleep"]);
});
check("generic cleanse leaves anchored",()=>{
 const u=unit();api.apply(u,"anchored");assert.deepEqual(api.dispel(u,"all").removed,[]);
 assert.equal(u.effects[0].kind,"anchored");
});
check("sleep prevents one owner action",()=>{
 const u=unit();api.apply(u,"sleep");
 assert.equal(api.startAction(u).canAct,false);
 assert.equal(u.effects.length,0);
});
check("fear prevents one owner action",()=>{
 const u=unit();api.apply(u,"fear");
 assert.equal(api.startAction(u).canAct,false);
});
check("legacy burn and new focus coexist without replacement",()=>{
 const u=unit();u.effects.push({kind:"burn",turns:2,stacks:2});
 api.apply(u,"focus");api.endRound(u);
 assert.deepEqual(u.effects.find(x=>x.kind==="burn"),{kind:"burn",turns:2,stacks:2});
});
check("no unknown Wiki status imported",()=>{
 assert.equal(catalog.autoImport,false);
 assert.ok(api.additionalIds.every(id=>catalog.effects.find(x=>x.id===id).provenance.classification==="SIMULATED"));
});
console.log("RESULT "+checks+"/"+checks+" PASS");
