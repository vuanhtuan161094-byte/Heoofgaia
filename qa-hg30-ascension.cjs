/* HG30 focused: four factions, real battle receipts, two paid conversions and Save v07. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js art-pack.js'.split(' ');
const cx=vm.createContext({console});for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),cx,{filename:file});
const E=cx.HOG_ENGINE,assertEqual=(x,y)=>assert.equal(x,y);
let pass=0;
function check(name,fn){try{const x=fn()||{};pass++;console.log('HG30 PASS '+name+' '+JSON.stringify(x));}catch(e){console.error('HG30 FAIL '+name+' '+e.stack);process.exitCode=1}}
function saved(s){assert(E.strictSave(s));const ss=E.parseSave(E.serializeSave(s));assert(E.strictSave(ss));return ss;}
function fight(s){let n=0,out;while(s.battle&&n++<70)out=E.battleAct(s,'attack');assertEqual(out?.type,'win');return {turns:n,out};}
function enrich(s){ // declared QA fixture; not a claim of organically earned resources
 s.hg30.stage=1;s.hg30.npcWins=2;s.hg30.paidTowerWins=1;
 s.hg20.tower.floor=11;
 s.hg29.shards.wild=60;s.hg29.shards.hunter=60;s.hg29.shards.abyss=60;
 s.hg29.shards.hero=60;s.hg29.shards.tower=60;
 s.hg27.marks=60;s.hg27.tower=60;s.hg27.boss=60;
 s.res.gold+=50000;
 return s;
}
check('New Game four races have zero task counts, canonical special units, Save v07',()=>{
 for(const race of ['human','elf','orc','undead']){
 const s=E.make(race,1000000);assertEqual(s.hg30.stage,0);assertEqual(s.hg30.npcWins,0);assertEqual(s.hg30.guardMade,0);
 assert(E.getUnit(s,race+'_quest_guard'));assert(E.getUnit(s,race+'_tower_sovereign'));
 assert(cx.HOG_ART_PACK.hasUnit(race+'_quest_guard'));assert(cx.HOG_ART_PACK.hasUnit(race+'_tower_sovereign'));saved(s);}
 return {races:4,specialSprites:8};
});
check('Old v07 Save migrates without granting past wins or instant troop',()=>{
 const s=E.make('human',1000000);s.hg18.victories=5;s.hg20.tower.victories=2;
 const doc=JSON.parse(E.serializeSave(s));delete doc.state.hg30;
 const a=E.parseSave(JSON.stringify(doc));assertEqual(a.hg30.stage,0);
 assertEqual(a.hg30.npcWins,0);assertEqual(a.hg30.paidTowerWins,0);
 assertEqual(a.hg30.worldSeen,5);assertEqual(a.hg30.towerSeen,2);
 assertEqual(a.army.human_quest_guard||0,0);saved(a);
 return {migration:'no retroactive gifts'};
});
check('One real NPC win from New Game advances exactly one task, no direct reward troop',()=>{
 let s=E.make('human',1000000);E.autoFormation(s);
 const tile=E.getTile(E.activeCity(s).key);
 const npc=E.TILES.filter(t=>t.kind==='npc'&&t.level===1).sort((a,b)=>Math.abs(a.x-tile.x)+Math.abs(a.y-tile.y)-Math.abs(b.x-tile.x)-Math.abs(b.y-tile.y))[0];
 E.startMarch(s,npc.key);let i=0;
 while(s.march&&i++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
 assert(s.battle);assertEqual(s.hg30.npcWins,0);
 const {out}=fight(s);assertEqual(out.type,'win');assertEqual(s.hg30.npcWins,1);assertEqual(s.hg30.bossWins,0);
 assertEqual(s.hg30.stage,0);s=saved(s);assertEqual(s.hg30.npcWins,1);assertEqual(s.hg30.guardMade,0);
 return {npc:npc.key,earned:1};
});
check('One real Tower victory advances one task; reload cannot double count',()=>{
 let s=E.make('elf',1e6);E.autoFormation(s);E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 assertEqual(s.hg30.paidTowerWins,0);const {out}=fight(s);assert(out.claimed);
 assertEqual(s.hg30.paidTowerWins,1);s=saved(s);assertEqual(s.hg30.paidTowerWins,1);
 assertEqual(s.hg30.sovereignMade,0);return {tower:1,paid:true};
});
check('Fixture: first mission is claimed exactly once and requires genuine progress counters',()=>{
 const s=E.make('human',1e6);
 assert.throws(()=>E.hg30ClaimTrial(s),/hai trận/);
 s.hg30.npcWins=2;s.hg30.paidTowerWins=1;
 E.hg30ClaimTrial(s);assertEqual(s.hg30.stage,1);
 assert.throws(()=>E.hg30ClaimTrial(s),/hai trận/);saved(s);
 return {unlocked:1,once:true};
});
check('Fixture: 4 races convert 12 free T1 into real quest guard, all sinks exact, stage2',()=>{
 for(const race of ['human','elf','orc','undead']){
 const s=enrich(E.make(race,1e6)),unit=race+'_1',guard=race+'_quest_guard';
 const before={base:s.army[unit],guard:s.army[guard]||0,gold:s.res.gold,marks:s.hg27.marks,tower:s.hg27.tower,wild:s.hg29.shards.wild};
 const result=E.hg30Convert(s,'guard');assertEqual(result.toUnit,guard);
 assertEqual(s.army[unit],before.base-12);assertEqual(s.army[guard],before.guard+8);
 assertEqual(s.res.gold,before.gold-3000);assertEqual(s.hg27.marks,before.marks-12);
 assertEqual(s.hg27.tower,before.tower-3);assertEqual(s.hg29.shards.wild,before.wild-6);
 assertEqual(s.hg30.stage,2);assertEqual(s.hg30.guardMade,1);saved(s);}
 return {races:4,baseSpent:12,guardsAdded:8};
});
check('Cannot convert reserved T1, zero cost deducted on rejected action',()=>{
 const s=enrich(E.make('human',1e6));const unit='human_1';
 s.army[unit]=12;E.hg20SetHeroPlan(s,1,[{unitId:unit,count:12}]);
 const before={gold:s.res.gold,base:s.army[unit],wild:s.hg29.shards.wild,marks:s.hg27.marks};
 assert.throws(()=>E.hg30Convert(s,'guard'),/Số mẻ|chưa đủ/i);
 assertEqual(s.res.gold,before.gold);assertEqual(s.army[unit],before.base);
 assertEqual(s.hg29.shards.wild,before.wild);assertEqual(s.hg27.marks,before.marks);
 assertEqual(s.army.human_quest_guard||0,0);assert(E.strictSave(s));
 return {reserved:12,spent:0};
});
check('Fixture: 4 races convert earned guard to canonical sovereign, preserve battle stats and gear',()=>{
 for(const race of ['human','elf','orc','undead']){
 const s=enrich(E.make(race,1e6)),guard=race+'_quest_guard',king=race+'_tower_sovereign';
 E.hg30Convert(s,'guard');assertEqual(s.hg30.stage,2);
 assert.throws(()=>E.hg30Convert(s,'sovereign'),/Số mẻ|chưa đủ/i);
 s.hg30.bossWins=1;s.hg30.npcWins=3;s.hg30.paidTowerWins=3;
 const stock=s.army[guard],gold=s.res.gold;
 const out=E.hg30Convert(s,'sovereign');
 assertEqual(out.toUnit,king);assertEqual(s.army[guard],stock-2);assertEqual(s.army[king],4);
 assertEqual(s.res.gold,gold-20000);assertEqual(s.hg30.stage,3);assertEqual(s.hg30.sovereignMade,1);
 assert(E.getUnit(s,king)?.atk>0);saved(s);}
 return {races:4,sovereigns:4};
});
check('Repeatable post-unlock conversions require real fresh consumables, no false second gift',()=>{
 const s=enrich(E.make('human',1e6));E.hg30Convert(s,'guard');
 s.hg30.bossWins=1;s.hg30.npcWins=3;s.hg30.paidTowerWins=3;
 E.hg30Convert(s,'sovereign');assertEqual(s.hg30.stage,3);
 const first=s.hg30.sovereignMade;
 // HG81: eight earned quest guards can fund more than one real Sovereign batch.
 const second=E.hg30Convert(s,'sovereign');assert.equal(second.toCount,4);
 assertEqual(s.hg30.sovereignMade,first+1);
 const goldBefore=s.res.gold;s.hg29.shards.abyss=0;
 assert.throws(()=>E.hg30Convert(s,'sovereign'),/Số mẻ|chưa đủ/i);
 assertEqual(s.res.gold,goldBefore);
 // New ordinary troops below are explicitly injected in a fixture, not battle loot.
 s.army.human_1+=12;E.hg30Convert(s,'guard');assertEqual(s.hg30.guardMade,2);
 saved(s);return {repeatGuards:2,repeatSovereignWithRealGuards:true};
});
check('Reject corrupted stage/counters and undeclared receipts; old Save untouched',()=>{
 const s=E.make('orc',1e6),source=E.serializeSave(s),doc=JSON.parse(source);
 const original={army:{...s.army},res:{...s.res},tokens:{...s.hg27},shards:{...s.hg29.shards}};
 doc.state.hg30.stage=9;assert.throws(()=>E.parseSave(JSON.stringify(doc)));
 const x=JSON.parse(source);x.state.hg30.receipts=[{id:'phantom',race:'orc'}];assert.throws(()=>E.parseSave(JSON.stringify(x)));
 assert.deepEqual({...s.army},original.army);assert.deepEqual({...s.res},original.res);
 assert.deepEqual({...s.hg27},original.tokens);assert.deepEqual({...s.hg29.shards},original.shards);
 assert(E.strictSave(s));return {invalidStates:2};
});

check('Fixture: converted sovereign is an actual world battle unit, not decorative inventory',()=>{
 let s=enrich(E.make('human',1e6));E.hg30Convert(s,'guard');
 s.hg30.bossWins=1;s.hg30.npcWins=3;s.hg30.paidTowerWins=3;
 E.hg30Convert(s,'sovereign');
 s.heroes[0].level=10;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_tower_sovereign',count:1}]);
 const home=E.getTile(E.activeCity(s).key);
 const npc=E.TILES.filter(x=>x.kind==='npc'&&x.level===1).sort((a,b)=>
  Math.abs(a.x-home.x)+Math.abs(a.y-home.y)-Math.abs(b.x-home.x)-Math.abs(b.y-home.y))[0];
 E.startMarch(s,npc.key);
 let ticks=0;while(s.march&&ticks++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
 assert(s.battle);const stack=s.battle.allies.find(x=>x.unitId==='human_tower_sovereign');
 assert(stack&&stack.hp>0&&stack.atk>0&&stack.pool>0);
 s=saved(s);assert(s.battle.allies.some(x=>x.unitId==='human_tower_sovereign'));
 return {target:npc.key,worldBattle:true,heroLevel:10,unitId:stack.unitId};
});
console.log('HG30 '+pass+'/11 '+(process.exitCode?'FAIL':'PASS'));if(pass!==11)process.exitCode=1;
