/* HG74 release acceptance: actual v07, real 12x9 Tower and premium gear.
 * Only local QA fixtures; cannot grant the player's live save any reward.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console,Date,Math});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js'.split(' ');
for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
const E=ctx.HOG_ENGINE;let passed=0;
function check(label,fn){try{const out=fn()||{};console.log('HG74 PASS '+label,JSON.stringify(out));passed++}catch(e){console.error('HG74 FAIL '+label,e.stack||e);process.exitCode=1}}
function roundtrip(s){assert(E.strictSave(s));const t=E.parseSave(E.serializeSave(s));assert(E.strictSave(t));assert.equal(t.version,7);return t}
check('Four natural new games have no injected late-game gear',()=>{
 const out=[];for(const race of ['human','elf','orc','undead']){
  const s=E.make(race,1000000);
  assert.equal(s.version,7);assert.equal(s.inventory.length,0);
  assert.equal(s.hg18.v,1);assert(E.strictSave(s));
  out.push({race,heroes:s.heroes.length,items:s.inventory.length,city:s.cities.length});
 }
 return out;
});
check('Real one-hero Tower spawns within exact two edge columns 0/1 and 10/11',()=>{
 const s=E.make('human',1000000);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);
 E.hg20ChooseTowerTeam(s,[1]);
 E.hg21TowerEnableEndurance(s);
 const result=E.hg21TowerEnter(s);
 assert.equal(result.type,'battle');assert(s.battle.hg410?.v===1);
 const all=[...s.battle.allies,...s.battle.enemies],positions=new Set();
 for(const u of all){
  assert(Number.isInteger(u.x)&&Number.isInteger(u.y));
  assert(E.battleHex.inBounds(u.x,u.y));
  assert(u.side==='player'?[0,1].includes(u.x):[10,11].includes(u.x));
  assert(!positions.has(u.x+','+u.y));
  positions.add(u.x+','+u.y);
 }
 assert.equal(s.hg20.tower.claims,0);
 roundtrip(s);
 return {floor:s.hg20.tower.floor,heroes:result.heroes,allies:s.battle.allies.length,
  enemies:s.battle.enemies.length,distinct:positions.size,save:7};
});
check('An actually equipped divine weapon boosts ATK and combat without minting more inventory',()=>{
 const s=E.make('human',1000000),id=s.heroes[0].id;
 const before=E.heroStats(s,id).atk,loot=E.addItem(s,E.hg47ItemId('human','divine','weapon'),'HG74 explicit local QA item');
 const base=E.ITEMS[loot.itemId].atk;
 E.equipItem(s,loot.uid,id);
 const after=E.heroStats(s,id).atk,mod=E.combatModifiers(s,id),icon=E.hg73AuraForHero(s,id);
 assert(after>before+base);
 assert.equal(icon.tier,'divine');
 assert.equal(E.hg73Affixes(loot).length,4);
 assert.equal(s.inventory.length,1);
 assert(mod.damageBonus<=.32&&mod.damageReduction<=.24);
 const restored=roundtrip(s);
 assert.equal(restored.inventory[0].uid,loot.uid);
 assert.equal(restored.equipment[id].weapon,loot.uid);
 assert.equal(E.hg73AuraForHero(restored,id).tier,'divine');
 return {atkBefore:before,atkAfter:after,uid:loot.uid,affixes:E.hg73Affixes(loot).length};
});
check('No premium aura without genuine worn gear; removing it clears aura',()=>{
 const s=E.make('human',1000000),id=s.heroes[0].id;
 assert.equal(E.hg73AuraForHero(s,id),null);
 const item=E.addItem(s,'star_blade','HG74 explicit QA item');
 assert.equal(E.hg73AuraForHero(s,id),null,'owned but unworn must not render in combat');
 E.equipItem(s,item.uid,id);
 assert.equal(E.hg73AuraForHero(s,id).tier,'platinum');
 E.unequipItem(s,'weapon',id);
 assert.equal(E.hg73AuraForHero(s,id),null);
 assert.equal(s.inventory.length,1);roundtrip(s);
 return {inventory:1,ownerAuraCleared:true,save:7};
});
console.log('HG74 RELEASE CORE '+passed+'/4');
if(passed!==4)process.exitCode=1;
