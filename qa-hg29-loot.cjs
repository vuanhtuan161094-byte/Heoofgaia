/* HG29: real battle rewards and explicit fragment crafting fixtures. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js'.split(' ');
const ctx=vm.createContext({console});for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;let pass=0;
function chk(name,fn){try{const info=fn()||{};pass++;console.log('HG29 PASS '+name+' '+JSON.stringify(info));}catch(e){process.exitCode=1;console.error('HG29 FAIL '+name+' '+e.stack)}}
function saved(s){assert(E.strictSave(s));const out=E.parseSave(E.serializeSave(s));assert(E.strictSave(out));return out;}
function battleUntilWin(s){let out,turns=0;while(s.battle&&turns++<70)out=E.battleAct(s,'attack');assert.equal(out?.type,'win');return {out,turns};}
chk('New Game 4 races, v07 migration and 6 zero-balance shards',()=>{
 for(const race of ['human','elf','orc','undead']){let s=E.make(race,1e6);assert(s.hg29);assert(Object.values(s.hg29.shards).every(n=>n===0));assert.equal(s.version,7);saved(s);
 const legacy=JSON.parse(E.serializeSave(s));delete legacy.state.hg29;let loaded=E.parseSave(JSON.stringify(legacy));assert(loaded.hg29);assert(loaded.hg29.history.length===0);saved(loaded);}
 return {races:4,materials:6,saveVersion:7};
});
chk('Odds total 10000, deterministic previews and 7 valid recipe outputs',()=>{
 const s=E.make('human',1e6);for(const [id,t] of Object.entries(E.HG29_TABLES))assert.equal(t.roll.reduce((n,r)=>n+r[3],0),10000,id);
 for(const r of E.HG29_RECIPES)if(r.output.kind==='gear')assert(E.ITEMS[r.output.id]);else assert(E.HG18_MATERIALS[r.output.id]);
 const npc=E.TILES.find(t=>t.kind==='npc'&&t.level===1);
 const p=E.hg29Preview(s,{kind:'npc',target:npc.key});assert.equal(p.source,'npc_low');assert.equal(p.noDropPercent,20);
 const b=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier>=11);
 assert.equal(E.hg29Preview(s,{kind:'npc',target:b.key}).source,'npc_boss');
 assert.equal(E.hg29Preview(s,{kind:'tower',target:'tower',floor:5}).guaranteed[0].count,2);
 return {pools:Object.keys(E.HG29_TABLES).length,recipes:E.HG29_RECIPES.length};
});
chk('Real Tower battle, one guaranteed rune, persists Save reload without duplicate',()=>{
 let s=E.make('human',1e6);E.autoFormation(s);E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 const {out,turns}=battleUntilWin(s);assert(out.claimed);assert.equal(s.hg29.shards.tower,1);
 assert.equal(s.hg29.history[0].source,'tower');assert.equal(s.hg29.history[0].ordinal,1);
 s=saved(s);assert.equal(s.hg29.towerWins,1);assert.equal(s.hg29.history.length,1);return {turns,award:s.hg29.shards.tower};
});
chk('Real unseeded NPC 1 star victory pays only after completed fight',()=>{
 let s=E.make('human',1e6);E.autoFormation(s);const home=E.getTile(E.activeCity(s).key);
 const target=E.TILES.filter(t=>t.kind==='npc'&&t.level===1).sort((a,b)=>
 Math.abs(a.x-home.x)+Math.abs(a.y-home.y)-Math.abs(b.x-home.x)-Math.abs(b.y-home.y))[0];
 assert(target);E.startMarch(s,target.key);let ticks=0;
 while(s.march&&ticks++<18)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
 assert(s.battle);assert.equal(s.hg29.history.length,0);saved(s);const {turns}=battleUntilWin(s);
 assert.equal(s.hg29.history.length,1);assert.equal(s.hg29.history[0].source,'npc_low');assert.equal(s.hg29.world,s.hg18.victories);
 s=saved(s);assert.equal(s.hg29.history.length,1);return {target:target.key,turns,drops:s.hg29.last.drops};
});
chk('Ongoing encounter pays nothing; deterministic reload of same combat receipt',()=>{
 const s=E.make('human',1e6);E.autoFormation(s);E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 const r=E.battleAct(s,'attack');assert.equal(r.type,'continue');assert.equal(s.hg29.shards.tower,0);assert.equal(s.hg29.history.length,0);
 const a=saved(s),b=saved(s);battleUntilWin(a);battleUntilWin(b);
 assert.deepEqual(JSON.parse(JSON.stringify(a.hg29.last)),JSON.parse(JSON.stringify(b.hg29.last)));
 return {reroll:'blocked',drops:a.hg29.last.drops};
});
chk('Fixture: spend exact fragment counts for selected gear and stones, Save reload',()=>{
 let s=E.make('elf',1e6);for(const id of Object.keys(s.hg29.shards))s.hg29.shards[id]=60;
 const n=s.inventory.length,before={...s.hg29.shards};const out=E.hg29Craft(s,'sentinel_plate');
 assert.equal(out.output.itemId,'sentinel_plate');assert.equal(s.inventory.length,n+1);
 assert.equal(s.hg29.shards.gear,before.gear-16);assert.equal(s.hg29.shards.hunter,before.hunter-8);assert.equal(s.hg29.shards.tower,before.tower-3);
 const m=s.hg18.materials.enhance_stone;E.hg29Craft(s,'stone');assert.equal(s.hg18.materials.enhance_stone,m+2);
 s=saved(s);assert.equal(s.hg29.crafted,2);return {crafted:2,armor:'sentinel_plate',stones:2};
});
chk('Reject empty wallet and corrupted Save; historical Save v07 migration works',()=>{
 const s=E.make('orc',1e6),before=E.serializeSave(s);
 assert.throws(()=>E.hg29Craft(s,'astral'),/Không đủ/);
 assert.deepEqual(JSON.parse(E.serializeSave(s)).state,JSON.parse(before).state);
 let corrupt=JSON.parse(before);corrupt.state.hg29.shards.abyss=-1;assert.throws(()=>E.parseSave(JSON.stringify(corrupt)));
 corrupt=JSON.parse(before);corrupt.state.hg29.history=[{channel:'world',source:'unknown',ordinal:1,target:'1,1',drops:[]}];
 assert.throws(()=>E.parseSave(JSON.stringify(corrupt)));
 const legacy=JSON.parse(before);delete legacy.state.hg29;const migrated=E.parseSave(JSON.stringify(legacy));
 assert.equal(migrated.hg29.world,legacy.state.hg18.victories);
 assert.equal(migrated.hg29.towerWins,legacy.state.hg20.tower.victories);
 return {corrupted:2,noFreeCraft:true};
});
console.log('HG29 '+pass+'/7 '+(process.exitCode?'FAIL':'PASS'));if(pass!==7)process.exitCode=1;
