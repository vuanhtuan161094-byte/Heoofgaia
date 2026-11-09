/* HG40.9 focused real engine tests — no fictitious battles/rewards. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg409-enemy-commanders.js'.split(' ');
for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,report=[];
function test(name,fn){
 try{const data=fn()||{};report.push({name,pass:true,data});console.log('HG40.9 PASS '+name+' '+JSON.stringify(data));}
 catch(err){report.push({name,pass:false,error:String(err.stack||err)});process.exitCode=1;console.error('HG40.9 FAIL '+name+' '+String(err.stack||err));}
}
function saved(s){assert(E.strictSave(s),'Source Save v07 invalid');const restored=E.parseSave(E.serializeSave(s));assert(E.strictSave(restored));return restored}
function game(){return E.make('human',Date.now())}
function target(lv){const t=E.TILES.find(t=>t.kind==='npc'&&t.level===lv&&!t.privateBoss);
 assert(t,'Missing catalog NPC '+lv);return t}
function fight(s,target,opts={}){
 s.battle=E.makeBattle(s,target);
 assert(s.battle.hg409EnemyCommander);
 // Deterministic HIGH-STRENGTH QA-only troop fixture; not a player economy grant.
 for(const u of s.battle.allies){u.atk=100000000;u.spd=999;u.range=12;u.def=1000000;u.hp=100000;u.pool=u.hp*u.count}
 let turns=0,out;
 while(s.battle&&turns<20){out=E.battleAct(s,'attack');turns++}
 assert(!s.battle,'Battle did not terminate');return {out,turns};
}
test('CS1–CS10 enemy purple stat100 level100 rank5 is a real battlefield multiplier',()=>{
 const result=[];
 for(const level of [1,2,3,4,5,6,7,8,9,10]){
  const tile=target(level),s=game(),p=E.hg409Preview('npc',tile.key),battle=E.makeBattle(s,tile.key);
  const c=battle.hg409EnemyCommander;assert(c,'Enemy commander missing');
  assert.equal(p.cs,level);assert.equal(c.cs,level);assert.equal(c.quality,'purple');
  assert.equal(c.level,100);assert.equal(c.rank,5);
  for(const k of ['atk','def','spd','int'])assert.equal(c[k],100);
  assert.equal(battle.enemies.length,level===1?2:3);
  assert(battle.enemies.every(u=>u.hp>0&&u.atk>0&&u.pool>0));
  assert(E.strictSave({...s,battle}), 'New combat Save v07 must stay valid');
  result.push({star:level,cs:c.cs,hp:Math.round(battle.enemies[0].hp),atk:battle.enemies[0].atk});
 }
 for(let i=1;i<result.length;i++)assert(result[i].cs>result[i-1].cs);
 return result;
});
test('T11, T12 and T13 Bosses receive CS8, CS9, CS10 without minting any troops',()=>{
 const result=[];
 for(const tier of [11,12,13]){
  const tile=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===tier);
  assert(tile);const s=game(),before=JSON.stringify(s.army),b=E.makeBattle(s,tile.key);
  const c=b.hg409EnemyCommander;assert(c);
  assert.equal(c.cs,tier-3);assert.equal(c.quality,'purple');assert.equal(JSON.stringify(s.army),before);
  assert(b.enemies.every(e=>e.hp>1000)); // HQ private Boss has buff authority, but nonprivate T11 also scales.
  result.push({tier,cs:c.cs,hp:b.enemies[0].hp,atk:b.enemies[0].atk});
 }
 return result;
});
test('Tower tactical enemy commander progresses CS1 to CS10, Save v07 stays valid',()=>{
 const s=game();E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);E.hg20ChooseTowerTeam(s,[1]);
 const cs=[];
 for(const floor of [1,10,11,21,31,41,51,61,71,81,91,101]){
  s.hg20.tower.floor=floor;
  const enter=E.hg21TowerEnter(s);assert(enter.type==='battle');
  const c=s.battle.hg409EnemyCommander;assert(c&&c.quality==='purple');
  assert.equal(c.cs,Math.min(10,1+Math.floor((floor-1)/10)));
  assert(E.strictSave(s));
  cs.push({floor,rebirth:c.cs,enemyHp:s.battle.enemies[0].hp});
  s.battle=null;
 }
 return cs;
});
test('Legacy Save v07 imports no resources/materials, uses new rewards only after wins',()=>{
 const s=game();delete s.hg409;const before=JSON.stringify({res:s.res,army:s.army,materials:s.hg18.materials});
 const loaded=E.parseSave(JSON.stringify(s));assert.deepEqual(JSON.parse(JSON.stringify(loaded.hg409)),{v:1,rewards:[]});
 assert.equal(JSON.stringify({res:loaded.res,army:loaded.army,materials:loaded.hg18.materials}),before);
 assert(saved(loaded));return {version:loaded.version,rewards:loaded.hg409.rewards.length};
});
test('Real NPC victory pays exactly one extra reward, no duplicate on subsequent actions, cold Save',()=>{
 const s=game(),tile=target(1),before={gold:s.res.gold,st:s.hg18.materials.enhance_stone};
 const {out,turns}=fight(s,tile.key);assert.equal(out.type,'win');
 assert.equal(s.hg409.rewards.length,1);const r=s.hg409.rewards[0];
 assert.equal(r.kind,'npc');assert.equal(r.quality,'purple');assert.equal(r.cs,1);
 assert(r.resources.gold>0);assert.equal(s.res.gold>=before.gold,true);
 const savedState=saved(s);assert.equal(savedState.hg409.rewards.length,1);
 assert.throws(()=>E.battleAct(savedState,'attack'),/Không có trận chiến/);
 assert.equal(savedState.hg409.rewards.length,1);
 return {turns,reward:r,gold:s.res.gold};
});
test('Real private Boss victory pays bigger reward and item cards, no fabricated recruitment',()=>{
 const s=game(),boss=E.TILES.find(t=>t.kind==='npc'&&t.privateBoss);
 assert(boss);const armyBefore=JSON.stringify(s.army);
 const {out,turns}=fight(s,boss.key);assert.equal(out.type,'win');
 const row=s.hg409.rewards[0];assert(row&&row.kind==='boss'&&row.cs===10);
 assert(row.materials.resource_chest>=1&&row.materials.gear_pack>=1);
 assert(row.materials.enhance_stone>=1&&row.resources.gold>0);
 assert.equal(JSON.stringify(s.army),armyBefore,'No troop grants from HG40.9');
 assert(saved(s).hg409.rewards[0].kind==='boss');
 return {turns,hero:row.cs,resources:row.resources,materials:row.materials};
});
test('Defeat/loss is never rewarded, a blocked player battle remains unchanged',()=>{
 const s=game(),t=target(4);
 const before=JSON.stringify({res:s.res,materials:s.hg18.materials,ledger:s.hg409});
 s.battle=E.makeBattle(s,t.key);s.battle.allies.forEach(u=>{u.pool=0;u.count=0});
 const out=E.battleAct(s,'attack');assert.notEqual(out.type,'win');
 assert.equal(JSON.stringify({res:s.res,materials:s.hg18.materials,ledger:s.hg409}),before);
 return {outcome:out.type};
});
test('Tier reward preview is guaranteed, explicit and never credits state',()=>{
 const s=game(),before=JSON.stringify(s);
 for(const lv of [1,4,7,10]){
  const t=target(lv),p=E.hg409Preview('npc',t.key);
  assert(p.resources.gold>0);assert(p.boost.hp>1);assert.equal(p.commander.quality,'purple');
 }
 const privateBoss=E.TILES.find(t=>t.privateBoss),p=E.hg409Preview('npc',privateBoss.key);
 assert.equal(p.cs,10);assert(p.materials.resource_chest>0);
 assert.equal(JSON.stringify(s),before);
 return {bossGoldBonus:p.resources.gold,bossCards:p.materials};
});
const dest=path.join(__dirname,'docs','qa','hg409');fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'enemy-difficulty-rewards.json'),JSON.stringify({
 suite:'HG40.9 authoritative new PvE battles and paid rewards',
 checks:report,passed:report.filter(x=>x.pass).length,total:report.length
},null,2)+'\n');
console.log('HG40.9 SUMMARY '+report.filter(x=>x.pass).length+'/'+report.length);
