/* HG93: real engine regression checks, no fake gameplay PASS. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({console,Date,Math});
const modules='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg42-boss-screen.js hg43-troop-profiles.js hg71-quest-heroes.js hg73-gear-prestige.js hg93-world-realms.js'.split(' ');
for(const p of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),ctx,{filename:p});
const E=ctx.HOG_ENGINE,sites=E.hg93Realms;
assert.equal(E.WIDTH,200);assert.equal(E.HEIGHT,200);assert.equal(E.TILES.length,40000);
assert.equal(sites.length,20);assert.equal(sites.filter(t=>t.worldTier==='saint').length,16);
assert.equal(sites.filter(t=>t.worldTier==='divine').length,4);
assert.equal(new Set(sites.map(t=>t.key)).size,20);
for(const race of ['human','elf','orc','undead']){
 const cities=sites.filter(t=>t.race===race);
 assert.equal(cities.length,5);assert.equal(cities.filter(t=>t.worldTier==='saint').length,4);
 assert.equal(cities.filter(t=>t.worldTier==='divine').length,1);
}
assert(sites.every(t=>t.kind==='castle'&&t.aiOwner&&t.guardCS===(t.worldTier==='divine'?5:3)));
assert.equal(E.getTile('3,4').kind,'castle');assert.equal(E.getTile('6,3').kind,'mine');
assert(E.hg20PrivateWorldBosses.every(t=>t.x<100&&t.y<100),'original private Boss sector moved');
const state=E.make('human',1000000);
assert(E.strictSave(state),'new v07 state must validate');
assert.equal(Object.keys(state.aiCities).filter(key=>!!E.getTile(key)?.worldTier).length,20);
for(const tile of sites){
 const ai=state.aiCities[tile.key];
 assert(ai&&ai.guardianCS===tile.guardCS,'missing guardian CS');
 assert.equal(Object.keys(ai.garrison).length,3,'three capped top-tier stacks');
 assert(Object.keys(ai.garrison).every(id=>['_8','_9','_10'].some(s=>id.endsWith(s))));
 const quote=E.hg93Quote(state,tile.key,1);
 assert(!quote.owned&&!quote.allowed,'special units must not be available for free');
 assert.equal(quote.unit.realmFactor,tile.worldTier==='divine'?5:3);
 const base=E.C.units[tile.race].slice().sort((a,b)=>b.tier-a.tier||b.atk-a.atk)[0];
 assert.equal(quote.unit.hp,base.hp*quote.unit.realmFactor);
 assert.equal(quote.unit.atk,base.atk*quote.unit.realmFactor);
 assert.equal(quote.unit.def,base.def*quote.unit.realmFactor);
}
const old=E.serializeSave(state),newState=E.parseSave(old);
assert(E.strictSave(newState),'roundtrip Save v07');
assert.equal(newState.version,7);assert.equal(newState.aiCities[sites[0].key].guardianCS,sites[0].guardCS);
assert.throws(()=>E.hg93Recruit(newState,sites[0].key,1),/Phải chiếm/);
assert(E.strictSave(newState),'blocked recruitment cannot corrupt save');
console.log('HG93 PASS four realms/40000 tiles/20 real castles/legacy Save v07');
