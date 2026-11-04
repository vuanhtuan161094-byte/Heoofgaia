/* HG27 live PvE earning plus explicit exchange fixtures, Save v07. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const scripts=['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js','hg24-private-automation.js','hg26-boss-autohunt.js','hg261-joint-boss.js','hg27-farm-exchange.js','art-pack.js'];
const ctx=vm.createContext({console});for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;let passed=0;
function check(name,test){try{const result=test()||{};passed++;console.log('HG27 PASS '+name+' '+JSON.stringify(result));}catch(e){console.error('HG27 FAIL '+name+' '+(e.stack||e));process.exitCode=1;}}
function reload(s){assert(E.strictSave(s));const out=E.parseSave(E.serializeSave(s));assert(E.strictSave(out));return out;}
check('New Game four races, no free tokens, Save v07 and independent special art',()=>{
 for(const race of ['human','elf','orc','undead']){const s=E.make(race,1000000);assert.equal(s.hg27.marks,0);assert.equal(s.hg27.tower,0);assert.equal(s.hg27.boss,0);reload(s);for(const kind of ['quest_guard','tower_sovereign'])assert(ctx.HOG_ART_PACK.hasUnit(race+'_'+kind));}
 return {races:4,specialSVG:8};
});
check('Earn Tower token ONLY on actual first-floor win; Save prevents duplicate receipts',()=>{
 const s=E.make('human',1e6);E.autoFormation(s);E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 let out,turns=0;while(s.battle&&turns++<70)out=E.battleAct(s,'attack');assert.equal(out.type,'win');assert(out.claimed);assert.equal(s.hg27.tower,1);const a=reload(s);assert.equal(a.hg27.tower,1);assert.equal(a.hg27.processedTower,1);return {turns,earned:a.hg27.tower};
});
check('Organic world NPC 1-star win earns one mark, not instant rewards',()=>{
 const s=E.make('human',1e6);E.autoFormation(s);const pos=E.getTile(E.activeCity(s).key);
 const target=E.TILES.filter(t=>t.kind==='npc'&&t.level===1).sort((a,b)=>(Math.abs(a.x-pos.x)+Math.abs(a.y-pos.y))-(Math.abs(b.x-pos.x)+Math.abs(b.y-pos.y)))[0];assert(target);
 E.startMarch(s,target.key);let i=0;while(s.march&&i++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));assert(s.battle);
 let out,turns=0;while(s.battle&&turns++<70)out=E.battleAct(s,'attack');assert.equal(out.type,'win');assert.equal(s.hg27.marks,1);assert.equal(s.hg27.boss,0);reload(s);return {target:target.key,turns,earned:1};
});
check('Fixture: 12 unreserved base troops + marks/tower + gold -> one special, exact once after reload',()=>{
 const s=E.make('human',1e6),h=s.hg27;h.marks=40;h.tower=20;h.boss=10;s.hg20.tower.floor=8;
 const before=s.army.human_1,gold=s.res.gold,receipt=E.hg27Exchange(s,'guard');
 assert.equal(receipt.output.unitId,'human_quest_guard');assert.equal(s.army.human_1,before-12);assert.equal(s.army.human_quest_guard,1);assert.equal(s.res.gold,gold-3000);assert.equal(h.marks,28);assert.equal(h.tower,17);
 const a=reload(s);assert.equal(a.army.human_quest_guard,1);assert.equal(a.hg27.exchanges,1);assert.throws(()=>E.hg27Exchange(a,'guard'),/Thiếu/);return {converted:1,spentOrdinary:12,exchanges:a.hg27.exchanges};
});
check('Fixture: craft Sentinel and Astral items using separate earned currencies; reject impossible exchange',()=>{
 const s=E.make('elf',1e6);s.hg27.marks=80;s.hg27.tower=50;s.hg27.boss=10;s.hg20.tower.floor=8;
 const n=s.inventory.length;E.hg27Exchange(s,'sentinel_plate');E.hg27Exchange(s,'astral_sword');assert.equal(s.inventory.length,n+2);assert.equal(s.inventory[n].itemId,'sentinel_plate');assert.equal(s.inventory[n+1].itemId,'astral_sword');reload(s);
 assert.throws(()=>E.hg27Exchange(s,'unknown'),/không tồn tại/);return {crafted:2,valid:E.strictSave(s)};
});
console.log('HG27 '+passed+'/5 checks '+(process.exitCode?'FAIL':'PASS'));
if(passed!==5)process.exitCode=1;
