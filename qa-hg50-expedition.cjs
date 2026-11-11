/* HG50-A focused engine QA — real T11/T12/T13 fights and strict Save v07. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js'.split(' ');
const ctx=vm.createContext({console});
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,results=[];
function check(label,fn){
 try{const detail=fn()||{};results.push({label,pass:true,detail});console.log('HG50 PASS '+label+' '+JSON.stringify(detail))}
 catch(e){results.push({label,pass:false,error:String(e.stack||e)});console.error('HG50 FAIL '+label+' '+String(e.stack||e));process.exitCode=1}
}
const game=()=>E.make('human',1e6);
function reload(s){assert(E.strictSave(s));const recovered=E.parseSave(E.serializeSave(s));assert(E.strictSave(recovered));return recovered;}
function realBoss(tier,priorStages=[]){
 // Explicit battle-capable QA fixture (not free loot or actual earned old stages).
 let s=game();s.hg50.completed=priorStages.slice();s.hg50.unlocked=priorStages.length+1;
 const hero=s.heroes[0];hero.level=100;hero.atk=tier===11?240000:400000;
 hero.def=tier===11?240000:400000;hero.spd=tier===11?100:120;
 const count=tier===11?500:800;s.army.human_10=count;s.ap=900;
 const data=E.hg50Status(s).stages.find(q=>q.tier===tier);
 assert(data?.target,'World Boss target missing T'+tier);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count}]);
 E.startMarch(s,data.target);
 let ticks=0;while(s.march&&ticks++<15)
  E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle,'No real battle starts');
 const before=E.hg50Status(s).completed.length;
 let out,turns=0;const rounds=[];
 while(s.battle&&turns++<110){
  const b=s.battle,p=b.allies[0],beforeHP=p?.pool,enemyHP=b.enemies.reduce((n,u)=>n+Math.max(0,u.pool),0);
  out=E.battleAct(s,'attack');
  if(tier===13&&(turns<=3||turns%3===0||!s.battle)){
   const ev=b.lastEvents?.find(e=>e.actorId==='p0');
   rounds.push({turn:turns,poolBefore:beforeHP,poolAfter:p?.pool,
    action:ev?.order,moved:ev?.path?.length||0,damage:ev?.damage||0,
    enemyBefore:enemyHP,enemyAfter:b.enemies.reduce((n,u)=>n+Math.max(0,u.pool),0),
    control:b.hg40?.statuses?.filter(x=>x.target==='p0').map(x=>({kind:x.kind,starts:x.starts,until:x.until})),
    result:out.type});
  }
 }
 assert.equal(out?.type,'win','Battle did not resolve through real engine win '+JSON.stringify({tier,turns,final:out?.type,rounds,alive:s.battle?.allies.filter(u=>u.pool>0).map(u=>({id:u.id,pool:u.pool,x:u.x,y:u.y})),enemies:s.battle?.enemies.filter(u=>u.pool>0).map(u=>({id:u.id,unitId:u.unitId,pool:u.pool,x:u.x,y:u.y})),effects:s.battle?.hg40?.statuses?.slice(-12)}));
 assert(E.strictSave(s));
 return {s,out,turns,target:data.target,before};
}
check('four races have stage-1 locked route and strict Save v07',()=>{
 for(const race of ['human','elf','orc','undead']){
  const s=E.make(race,1e6),status=E.hg50Status(s);
  assert.equal(s.version,7);assert.equal(status.unlocked,1);
  assert.equal(status.completed.length,0);assert.equal(status.stages.length,3);
  assert.equal(status.stages.filter(x=>x.unlocked).length,1);
  assert.deepEqual(status.stages.map(x=>x.tier).join(','),'11,12,13');
  assert.equal(s.inventory.length,0);reload(s);
 }
 return {races:4,stages:[11,12,13],version:7};
});
check('status read is pure and cannot create victory or inventory',()=>{
 const s=game(),before=JSON.stringify(s);E.hg50Status(s);E.hg50Status(s);
 assert.equal(JSON.stringify(s),before);assert.equal(s.hg409.rewards.length,0);
 return {unchanged:true};
});
check('cannot forge unlock, duplicate or out-of-order stage in Save',()=>{
 const invalid=[
  {v:1,unlocked:3,completed:[]},
  {v:1,unlocked:2,completed:[12]},
  {v:1,unlocked:3,completed:[11,11]},
  {v:1,unlocked:2,completed:[11],freeGold:1}
 ];
 for(const q of invalid){const s=game();s.hg50=q;assert.equal(E.strictSave(s),false);}
 return {malformedRejected:invalid.length};
});
check('T11 actual Boss win upgrades route, preserves HG47 and HG409 rewards once',()=>{
 let {s,out,turns,target,before}=realBoss(11);
 assert.equal(before,0);assert.equal(out.hg50Stage,11);
 assert.equal(E.hg50Status(s).unlocked,2);
 assert.equal(s.hg47.fragments[E.hg47ItemId('human','rare','weapon')],2);
 assert.equal(s.hg409.rewards.length,1);
 s=reload(s);assert.equal(s.hg50.completed.join(','),'11');
 assert.equal(s.hg409.rewards.length,1);
 return {target,turns,unlocked:s.hg50.unlocked,existingHG47Rare:2,existingHG409Receipts:1};
});
check('T12 actual Boss win counts only after stage-1 QA fixture and unlocks T13',()=>{
 let {s,out,turns,target}=realBoss(12,[11]);
 assert.equal(out.hg50Stage,12);assert.equal(E.hg50Status(s).unlocked,3);
 s=reload(s);assert.equal(s.hg50.completed.join(','),'11,12');
 return {target,turns,unlocked:s.hg50.unlocked};
});
check('T13 actual private Boss win finishes route with exact Save, no duplicate quest payout',()=>{
 let {s,out,turns,target}=realBoss(13,[11,12]);
 assert.equal(out.hg50Stage,13);assert.equal(s.hg50.unlocked,4);
 assert.equal(s.hg50.completed.join(','),'11,12,13');
 assert.equal(s.hg409.rewards.length,1);
 s=reload(s);assert.equal(E.hg50Status(s).done,true);
 return {target,turns,done:true,existingHG409Receipts:1};
});
check('defeating T11 after route advanced to T12 does not advance again',()=>{
 const {s,out,turns}=realBoss(11,[11]);
 assert.equal(out.hg50Stage,undefined);assert.equal(s.hg50.unlocked,2);
 assert.equal(s.hg50.completed.join(','),'11');
 return {turns,unlocked:2,noExtraProgress:true};
});
check('same-tier T11 Boss outside selected route pays normal Boss but cannot unlock HG50',()=>{
 const s=game();
 const canonical=E.hg50Status(s).stages[0].target;
 const other=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===11&&t.key!==canonical);
 assert(other,'A second real T11 Boss tile must exist for regression');
 const hero=s.heroes[0];hero.level=100;hero.atk=240000;hero.def=240000;hero.spd=100;
 s.army.human_10=500;s.ap=900;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);
 E.startMarch(s,other.key);
 let ticks=0;while(s.march&&ticks++<15)
  E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle,'Real outside-route Boss did not start');
 let out,turns=0;while(s.battle&&turns++<110)out=E.battleAct(s,'attack');
 assert.equal(out?.type,'win');
 assert.equal(out.hg50Stage,undefined,'Out-of-route same-tier victory advanced expedition');
 assert.equal(s.hg50.completed.length,0);
 assert.equal(s.hg50.unlocked,1);
 assert.equal(s.hg409.rewards.length,1,'Normal real Boss reward was lost');
 assert(E.strictSave(s));reload(s);
 return {canonical,outside:other.key,turns,expeditionUnlocked:1,normalBossReceipts:1};
});
check('historical v07 without HG50 migrates to empty route, no retroactive Boss grants',()=>{
 let s=game();let obj=JSON.parse(E.serializeSave(s));delete obj.state.hg50;
 s=E.parseSave(JSON.stringify(obj));
 assert.equal(s.hg50.unlocked,1);assert.equal(s.hg50.completed.length,0);
 assert(E.strictSave(s));return {save:s.version,unlocked:1,retroactive:false};
});
const report={gate:'HG50-A real Boss stages, Save v07 exact-once',passed:results.filter(x=>x.pass).length,total:results.length,results};
const out=path.join(__dirname,'docs/qa/hg50/engine.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log('HG50 SUMMARY '+report.passed+'/'+report.total);
if(report.passed!==report.total)process.exitCode=1;
