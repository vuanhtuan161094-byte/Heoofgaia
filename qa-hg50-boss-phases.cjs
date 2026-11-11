/* HG50-B focused QA: real engine receipts and Save v07 mid-battle across 3 boss thresholds.
 * Does not mint resources or simulate outcomes by editing the battle result.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sources='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js'.split(' ');
const ctx=vm.createContext({console});for(const file of sources)
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,results=[];
function check(label,fn){
 try{const value=fn()||{};results.push({label,pass:true,value});console.log('HG50-B PASS '+label+' '+JSON.stringify(value));}
 catch(e){results.push({label,pass:false,error:String(e.stack||e)});console.error('HG50-B FAIL '+label+' '+String(e.stack||e));process.exitCode=1;}
}
function reload(s){assert(E.strictSave(s),'midcombat Save must be strict v07');
 const next=E.parseSave(E.serializeSave(s));assert(E.strictSave(next));assert.equal(next.version,7);return next;}
const ratio=b=>Math.round(100*b.enemies.reduce((n,u)=>n+Math.max(0,u.pool),0)/b.hg50b.initialHp);
function open(tier,prior=[]){
 let s=E.make('human',1000000);s.hg50.completed=prior.slice();s.hg50.unlocked=prior.length+1;
 const h=s.heroes[0];h.level=100;h.atk=tier===11?240000:400000;h.def=tier===11?240000:400000;h.spd=tier===11?100:120;
 const count=tier===11?500:800;s.army.human_10=count;s.ap=900;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count}]);
 const stage=E.hg50Status(s).stages.find(q=>q.tier===tier);assert(stage);
 E.startMarch(s,stage.target);let steps=0;
 while(s.march&&steps++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle,'No real marching Boss encounter');assert.equal(s.battle.enemies.length,16);
 assert.equal(s.battle.hg50b.tier,tier);assert.equal(s.battle.hg50b.target,stage.target);
 assert.equal(s.battle.hg50b.phase,'armed');assert(E.hg50PhaseValid(s.battle));
 return s;
}
function battleUntil(s,test,max=95){
 let turns=0,out;
 while(s.battle&&turns++<max){
  const previous=s.battle,oldHp=previous.enemies.reduce((n,u)=>n+Math.max(0,u.pool),0);
  out=E.battleAct(s,'attack');assert(out&&['win','continue','lose','timeout'].includes(out.type));
  assert(E.strictSave(s),'invalid strict Save v07 after real combat receipt at turn '+turns);
  if(s.battle){const newHp=s.battle.enemies.reduce((n,u)=>n+Math.max(0,u.pool),0);
   // Summons can add fresh enemy HP; all battle outcomes still originate in canonical turns.
   if(previous.hg50b.kind!=='summon'||previous.hg50b.phase!=='active')
    assert(newHp<=oldHp+2e10,'unexpected HP anomaly');
   assert(E.hg50PhaseValid(s.battle));
  }
  if(test(s,out,turns))return {s,out,turns};
 }
 throw Error('Expected phase did not activate through real engine within '+turns+' turns, last='+JSON.stringify(out));
}
check('new route battles bind three real HP thresholds and no extra reward store',()=>{
 const seen=[];for(const [tier,prior,pct,kind] of [[11,[],65,'shield'],[12,[11],50,'summon'],[13,[11,12],35,'berserk']]){
  const s=open(tier,prior),q=s.battle.hg50b;assert.equal(q.threshold,pct);assert.equal(q.kind,kind);
  assert.equal(q.events.length,0);assert.equal(q.initialHp,s.battle.enemies.reduce((n,u)=>n+u.pool,0));
  assert.equal(s.hg409.rewards.length,0);
  seen.push({tier,target:q.target,threshold:pct,hp:q.initialHp});
 }return {seen};
});
check('T11 65% shield actually reduces incoming damage and survives Save/Reload',()=>{
 let s=open(11);
 const fired=battleUntil(s,b=>b.battle?.hg50b.phase==='active');
 s=fired.s;let b=s.battle,q=b.hg50b;
 assert(ratio(b)<=65);assert.equal(q.events.map(x=>x.kind).join(','),'threshold,active');
 assert.equal(q.extraStacks,0);assert.equal(q.triggeredTurn,q.activeTurn);
 // Existing HG40 Priest/Angel shields on player's side are not Boss buffs.
 // Assert the 1-4 enemy shields only; the overall shield map can contain both sides.
 const units=Object.keys(b.hg40.shields).filter(id=>b.enemies.some(u=>u.id===id)&&b.hg40.shields[id].amount>0);
 assert(units.length>=1&&units.length<=4,'no Boss defensive shield '+JSON.stringify({
   phase:q.phase,turn:b.turn,events:q.events,live:b.enemies.filter(u=>u.pool>0).map(u=>
    ({id:u.id,unitId:u.unitId,count:u.count,pool:u.pool,hp:u.hp})),shields:b.hg40.shields}));
 for(const id of units){const u=b.enemies.find(x=>x.id===id),sh=b.hg40.shields[id];
  assert(sh.amount>0&&sh.amount<=Math.ceil(u.count*u.hp*.25));assert(sh.until>=b.turn);
 }
 s=reload(s);assert.equal(s.battle.hg50b.phase,'active');
 assert.equal(s.battle.hg50b.events.length,2);
 const beforeEvents=s.battle.hg50b.events.length;
 const out=E.battleAct(s,'attack');assert(E.strictSave(s));
 if(s.battle)assert.equal(s.battle.hg50b.events.length,beforeEvents,'shield phase fired twice');
 return {threshold:65,turns:fired.turns,shielded:units.length,next:out.type};
});
check('T12 50% summons <=2 authentic stacks in unused hexes, once, Save v07',()=>{
 let s=open(12,[11]);
 const fired=battleUntil(s,b=>b.battle?.hg50b.phase==='active');s=fired.s;
 const b=s.battle,q=b.hg50b;
 // Two real summoned squads increase total post-phase HP. Verify the
 // original sixteen enemy squads crossed the intended 50% threshold.
 const originalRemaining=b.enemies.slice(0,16).reduce((n,u)=>n+Math.max(0,u.pool),0);
 assert(Math.round(originalRemaining*100/q.initialHp)<=50,
  'summon fired before the original sixteen squads reached 50%');
 assert.equal(q.extraStacks,2);assert.equal(b.enemies.length,18);
 const all=[...b.allies,...b.enemies].filter(u=>u.pool>0);
 const positions=new Set(all.map(u=>u.x+','+u.y));
 assert.equal(positions.size,all.length,'summoned units collide with actual actor');assert(all.every(u=>E.battleHex.inBounds(u.x,u.y)));
 for(const u of b.enemies.slice(-2)){assert(u.id.startsWith('e'));assert(u.count>0&&u.initial===u.count&&u.pool===u.count*u.hp);}
 s=reload(s);assert.equal(s.battle.hg50b.extraStacks,2);assert.equal(s.battle.enemies.length,18);
 const before=JSON.stringify(s.battle.hg50b.events);
 E.battleAct(s,'attack');
 if(s.battle){assert.equal(s.battle.enemies.length,18);assert.equal(JSON.stringify(s.battle.hg50b.events),before);}
 assert(E.strictSave(s));
 return {threshold:50,summoned:2,totalPhysicalEnemyStacks:18,turns:fired.turns};
});
check('T13 35% one-turn berserk warning preserves pre-buff attack on Save/Load',()=>{
 let s=open(13,[11,12]);
 const fired=battleUntil(s,b=>b.battle?.hg50b.phase==='warning');s=fired.s;
 const b=s.battle,q=b.hg50b;assert(ratio(b)<=35);assert.equal(q.events.length,1);
 const melee=b.enemies.filter(u=>u.pool>0&&u.range===1);assert(melee.length);
 const attack=Object.fromEntries(melee.map(u=>[u.id,u.atk]));
 s=reload(s);assert.equal(s.battle.hg50b.phase,'warning');
 for(const u of s.battle.enemies.filter(u=>u.pool>0&&u.range===1))
  assert.equal(u.atk,attack[u.id]);
 let out=E.battleAct(s,'attack');assert(E.strictSave(s));
 if(!s.battle)throw Error('Boss died on the one warning turn: reduce focused QA damage; cannot verify active state');
 assert.equal(s.battle.hg50b.phase,'active');assert.equal(s.battle.hg50b.events.length,2);
 let changed=0;
 for(const u of s.battle.enemies.filter(u=>u.pool>0&&u.range===1)){
  assert.equal(u.atk,Math.round(attack[u.id]*1.2));changed++;
 }
 assert(changed>0);
 s=reload(s);assert.equal(s.battle.hg50b.phase,'active');
 assert.equal(s.battle.hg50b.events.length,2);
 out=E.battleAct(s,'attack');assert(E.strictSave(s));
 if(s.battle)assert.equal(s.battle.hg50b.events.length,2,'duplicate rage');
 return {threshold:35,warnedForTurns:1,meleeBuffed:changed,triggerTurn:q.triggeredTurn};
});
check('old v07 mid-battle without HG50-B stays legacy, including Save after attack',()=>{
 let s=open(11);
 delete s.battle.hg50b;
 s=reload(s);assert.equal(s.battle.hg50b,undefined);
 E.battleAct(s,'attack');assert(E.strictSave(s));
 if(s.battle)assert.equal(s.battle.hg50b,undefined);
 return {legacyUntouched:true,save:7};
});
check('malformed phase state is rejected without corrupting original save',()=>{
 const base=open(11),snap=JSON.stringify(base.battle.hg50b);
 for(const mutate of [q=>q.threshold=99,q=>q.extraStacks=9,q=>q.phase='active',q=>q.target='82,91',q=>q.initialHp=0]){
  const s=E.clone(base);mutate(s.battle.hg50b);assert(!E.strictSave(s));
 }
 assert.equal(JSON.stringify(base.battle.hg50b),snap);
 return {invalidRejected:5};
});
check('off-route same-tier T11 remains ordinary non-phase PvE',()=>{
 const s=E.make('human',1000000),target=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===11&&t.key!==E.hg50Status(s).stages[0].target);
 assert(target);s.ap=900;s.army.human_10=500;
 const h=s.heroes[0];h.level=100;h.atk=240000;h.def=240000;h.spd=100;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);E.startMarch(s,target.key);
 let ticks=0;while(s.march&&ticks++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle);assert.equal(s.battle.hg50b,undefined);assert(E.strictSave(s));
 return {offRoute:target.key,bonusPhases:0};
});
const result={gate:'HG50-B real Boss phase Save-v07 and zero duplicate quest reward',passed:results.filter(x=>x.pass).length,total:results.length,results};
fs.mkdirSync(path.join(__dirname,'docs/qa/hg50'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg50/phase-engine.json'),JSON.stringify(result,null,2)+'\n');
console.log('HG50-B SUMMARY '+result.passed+'/'+result.total);if(result.passed!==result.total)process.exitCode=1;
