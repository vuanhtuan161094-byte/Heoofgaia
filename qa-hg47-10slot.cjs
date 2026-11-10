/* HG47 real ten-slot, four-race fragments, paid Boss/Tower crafting and v07 QA.
 * Equipment/coins supplied by fixtures are always labeled; gameplay test uses
 * real battleAct win/claimed result for reward receipts.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js'.split(' ');
const ctx=vm.createContext({console});
for(const f of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
const E=ctx.HOG_ENGINE,tests=[];
const snapshot=s=>JSON.stringify(s);
const game=(race='human')=>E.make(race,1e6);
const reload=s=>{assert(E.strictSave(s));const out=E.parseSave(E.serializeSave(s));assert(E.strictSave(out));return out};
function check(name,fn){
 try{const result=fn()||{};tests.push({name,pass:true,result});console.log('HG47 PASS '+name+' '+JSON.stringify(result))}
 catch(err){tests.push({name,pass:false,error:String(err.stack||err)});console.error('HG47 FAIL '+name+' '+String(err.stack||err));process.exitCode=1}
}
function win(s){let result,turns=0;while(s.battle&&turns++<80)result=E.battleAct(s,'attack');assert.equal(result?.type,'win');return {result,turns}}
check('4 races x 2 rarities x 10 slots -> 80 actual items and 8 real sets; empty v07 wallet',()=>{
 assert.equal(E.HOG47,undefined);assert.equal(ctx.HOG_HG47.slotCount,10);
 assert.equal(ctx.HOG_HG47.gearCount,80);assert.equal(ctx.HOG_HG47.setCount,8);
 for(const race of Object.keys(E.HG47_RACES)){
  const s=game(race),rows=E.hg47Status(s,race,'rare');
  assert.equal(s.version,7);assert.equal(rows.length,10);assert.equal(s.inventory.length,0);
  assert.equal(Object.values(s.hg47.fragments).reduce((a,b)=>a+b,0),0);
  assert.equal(rows.filter(r=>r.canCraft).length,0);
  assert.equal(E.hg46Sets(s,1).length,6);
  reload(s);
 }
 return {raceCount:4,setCount:8,gearCount:80,save:7};
});
check('10 distinct wearable slots contribute real stats, 3/6/10 race buffs, stable affixes and saved UIDs',()=>{
 let s=game('elf');
 const before=E.heroStats(s,1),initial=E.combatModifiers(s,1);
 const minted=E.HG47_SLOTS.map(([slot])=>E.addItem(s,E.hg47ItemId('elf','rare',slot),'HG47 explicit 10-slot QA fixture'));
 let mod3,mod6;
 for(let i=0;i<minted.length;i++){
  E.equipItem(s,minted[i].uid,1);
  if(i===2)mod3=E.combatModifiers(s,1);
  if(i===5)mod6=E.combatModifiers(s,1);
 }
 assert.equal(Object.keys(s.equipment[1]).length,10);
 assert.equal(E.hg47SetCounts(s,1).elf_rare,10);
 const after=E.heroStats(s,1),mod10=E.combatModifiers(s,1);
 assert(after.atk>before.atk&&after.def>before.def);
 assert(mod3.rangedDamage>initial.rangedDamage);
 assert(mod6.rangedDamage>mod3.rangedDamage);
 assert(mod10.rangedDamage>mod6.rangedDamage);
 const aff=E.hg47Affixes(minted[0]);assert.equal(aff.length,1);
 s=reload(s);
 assert.deepEqual(JSON.parse(JSON.stringify(E.hg47Affixes(s.inventory[0]))),JSON.parse(JSON.stringify(aff)));
 assert.equal(Object.keys(s.equipment[1]).length,10);
 const uid=s.equipment[1].relic;E.unequipItem(s,'relic',1);
 assert(!E.hg46Owner(s,uid));assert.equal(s.inventory.length,10);
 return {slots:10,set:10,statsBefore:before,statsAfter:after,realBuff:mod10.rangedDamage};
});
check('Other-race equipment is blocked without mutation or stolen existing items',()=>{
 const s=game('human'),item=E.addItem(s,E.hg47ItemId('orc','rare','helm'),'HG47 foreign gear QA fixture');
 const before=snapshot(s);assert.throws(()=>E.equipItem(s,item.uid,1),/riêng/);
 assert.equal(snapshot(s),before);assert(E.strictSave(s));
 return {foreignUid:item.uid,blocked:true};
});
check('Real one-click optimizer can fill ten slots from unowned inventory with no resource change',()=>{
 const s=game('orc');
 E.HG47_SLOTS.forEach(([slot])=>E.addItem(s,E.hg47ItemId('orc','rare',slot),'HG47 auto QA fixture'));
 const wallet=snapshot(s.res),inventory=snapshot(s.inventory);
 const q=E.hg46Suggest(s,1,'balanced');
 assert(q.allowed&&q.gain>0);assert.equal(Object.keys(s.equipment[1]).length,0);
 const out=E.hg46AutoEquip(s,1,'balanced');
 assert(out.applied);assert.equal(Object.keys(s.equipment[1]).length,10);
 assert.equal(snapshot(s.res),wallet);assert.equal(snapshot(s.inventory),inventory);
 assert(E.strictSave(s));return {slots:10,changed:out.changed,gain:out.gain};
});
check('Set-aware optimizer crosses the 3-piece threshold without losing wallet or transferring gear',()=>{
 const s=game('human'),slots=['weapon','armor','charm'],commons=['copper_blade','iron_armor','quartz_ring'];
 const saved=commons.map(id=>({...E.ITEMS[id]}));
 try{
  const old=[],divine=[];
  for(let i=0;i<3;i++){
   const id=commons[i],high=E.hg47ItemId('human','divine',slots[i]),d=E.ITEMS[high],c=E.ITEMS[id];
   c.atk=d.atk;c.def=d.def;c.spd=d.spd;
   for(const k of ['damageBonus','meleeDamage','rangedDamage','damageReduction'])c[k]=0;
   const legacy=E.addItem(s,id,'HG47 optimizer fallback QA fixture');
   old.push(legacy);E.equipItem(s,legacy.uid,1);
   divine.push(E.addItem(s,high,'HG47 complete-set QA fixture'));
  }
  // Calibrate exactly half a point of individual disadvantage, without
  // changing the 3-piece Human mitigation bonus or touching production data.
  for(let i=0;i<3;i++){
   const start=E.hg46Metrics(s,1,'balanced').score,trial=E.clone(s);
   trial.equipment[1][slots[i]]=divine[i].uid;
   const single=E.hg46Metrics(trial,1,'balanced').score;
   if(single>start-.5)E.ITEMS[commons[i]].atk+=(single-start)+.6;
  }
  const before=E.hg46Metrics(s,1,'balanced').score;
  for(let i=0;i<3;i++){
   const trial=E.clone(s);trial.equipment[1][slots[i]]=divine[i].uid;
   assert(E.hg46Metrics(trial,1,'balanced').score<before,'individual replacement must lose');
  }
  const complete=E.clone(s);for(let i=0;i<3;i++)complete.equipment[1][slots[i]]=divine[i].uid;
  const achieved=E.hg46Metrics(complete,1,'balanced').score;
  assert(achieved>before,'3-piece set must beat three stronger singles');
  const bank=snapshot(s.res),inv=snapshot(s.inventory);
  const suggestion=E.hg46Suggest(s,1,'balanced');
  assert(suggestion.gain>0,JSON.stringify(suggestion));
  const out=E.hg46AutoEquip(s,1,'balanced');
  assert(out.applied);assert.equal(E.hg47SetCounts(s,1).human_divine,3);
  assert.equal(snapshot(s.res),bank);assert.equal(snapshot(s.inventory),inv);
  assert(E.strictSave(s));return {before,fullSet:achieved,auto:E.hg46Metrics(s,1,'balanced').score};
 }finally{
  for(let i=0;i<commons.length;i++){
   const target=E.ITEMS[commons[i]];
   for(const k of Object.keys(target))if(!(k in saved[i]))delete target[k];
   Object.assign(target,saved[i]);
  }
 }
});
check('Rare craft targeted slot consumes 8 earned-style shards, HG29 materials and paid gold once',()=>{
 let s=game('human');
 const id=E.hg47ItemId('human','rare','boots'),before=snapshot(s);
 assert.throws(()=>E.hg47Craft(s,id),/Chưa đủ/);
 assert.equal(snapshot(s),before);
 s.hg47.fragments[id]=8;s.hg29.shards.gear=5;s.hg29.shards.hunter=3;
 s.res.gold=Math.max(s.res.gold,3000);
 const gold=s.res.gold,boss=s.hg27.boss,tower=s.hg27.tower;
 const created=E.hg47Craft(s,id);assert.equal(s.res.gold,gold-3000);
 assert.equal(s.hg47.fragments[id],0);assert.equal(s.hg29.shards.gear,0);assert.equal(s.hg29.shards.hunter,0);
 assert.equal(s.hg27.boss,boss);assert.equal(s.hg27.tower,tower);
 assert(s.inventory.some(i=>i.uid===created.uid));
 assert.throws(()=>E.hg47Craft(s,id),/Chưa đủ/);
 s=reload(s);assert(s.inventory.some(i=>i.uid===created.uid));
 return {id,uid:created.uid,spentGold:3000,save:s.version};
});
check('Divine forge explicitly requires Boss/Tower progression AND both hard-earned tokens',()=>{
 let s=game('undead'),id=E.hg47ItemId('undead','divine','ring');
 s.hg47.fragments[id]=12;s.hg29.shards.abyss=3;s.hg29.shards.tower=6;
 s.hg29.shards.hero=2;s.hg27.boss=1;s.hg27.tower=1;s.res.gold=Math.max(s.res.gold,18000);
 let status=E.hg47Status(s,'undead','divine').find(x=>x.id===id);
 assert(status.gated&&!status.canCraft);
 const snap=snapshot(s);assert.throws(()=>E.hg47Craft(s,id),/Chưa đủ/);assert.equal(snap,snapshot(s));
 // Explicit GATE fixtures, not fabricated Boss/Tower victories or loot claims.
 s.hg31.bossWins=1;s.hg31.paidTowerWins=3;
 status=E.hg47Status(s,'undead','divine').find(x=>x.id===id);
 assert(!status.gated&&status.canCraft);
 const gold=s.res.gold,out=E.hg47Craft(s,id);
 assert.equal(s.res.gold,gold-18000);
 assert.equal(s.hg27.boss,0);assert.equal(s.hg27.tower,0);
 assert.equal(s.hg29.shards.abyss,0);assert.equal(s.hg29.shards.tower,0);
 assert.equal(s.hg29.shards.hero,0);assert.equal(s.hg47.fragments[id],0);
 assert.equal(E.hg47Affixes(s.inventory.find(x=>x.uid===out.uid)).length,2);
 s=reload(s);assert(s.inventory.some(i=>i.uid===out.uid));
 return {id,uid:out.uid,paidGold:18000,bossToken:1,towerToken:1,source:'explicit fixture only'};
});
check('Real paid Tower battle grants 1 focused rare + 2 divine fragments exactly once',()=>{
 let s=game('human');E.autoFormation(s);E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 const u=E.hg47ItemId('human','rare','weapon'),d=E.hg47ItemId('human','divine','weapon');
 assert.equal(s.hg47.fragments[u],0);assert.equal(s.hg47.fragments[d],0);
 const {result,turns}=win(s);assert(result.claimed);
 assert.equal(s.hg47.fragments[u],1);assert.equal(s.hg47.fragments[d],2);
 assert.equal(s.hg47.history.length,2);
 s=reload(s);
 assert.equal(s.hg47.history.length,2);assert.equal(s.hg47.fragments[d],2);
 return {turns,claimed:result.claimed,rare:1,divine:2,save:s.version};
});
check('Real unseeded 1-star NPC starts with no HG47 loot, pays only after completed victory',()=>{
 let s=game('human');E.autoFormation(s);
 const home=E.getTile(E.activeCity(s).key);
 const target=E.TILES.filter(t=>t.kind==='npc'&&t.level===1).sort((a,b)=>
  Math.abs(a.x-home.x)+Math.abs(a.y-home.y)-
  Math.abs(b.x-home.x)-Math.abs(b.y-home.y))[0];
 assert(target,'No 1-star NPC target');
 E.startMarch(s,target.key);let ticks=0;
 while(s.march&&ticks++<18)
  E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
 assert(s.battle);
 assert(Object.values(s.hg47.fragments).every(n=>n===0),'Never pay before a win');
 const {result,turns}=win(s);assert.equal(result.type,'win');
 const received=Object.values(s.hg47.fragments).reduce((sum,n)=>sum+n,0);
 assert(received===0||received===1,'A normal NPC drops at most 1 rare targeted shard');
 assert.equal(s.hg47.history.length,received);
 s=reload(s);
 assert.equal(Object.values(s.hg47.fragments).reduce((sum,n)=>sum+n,0),received);
 return {target:target.key,turns,received,save:s.version};
});
check('Real Boss T11 victory grants focused HG47 fragments alongside earned HG29 core',()=>{
 let s=game('human'),hero=s.heroes[0];hero.level=100;
 hero.atk=240000;hero.def=240000;hero.spd=100;
 s.army.human_10=500;s.ap=700;
 const target=E.hg24RecommendBoss(s).find(x=>x.eliteTier===11);
 assert(target,'No T11 Boss target in the actual world');
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);E.startMarch(s,target.key);
 let ticks=0;while(s.march&&ticks++<8)
  E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle);
 const before=E.hg47ItemId('human','divine','weapon');
 assert.equal(s.hg47.fragments[before],0);
 const {result,turns}=win(s);assert.equal(result.type,'win');
 assert.equal(s.hg47.fragments[E.hg47ItemId('human','rare','weapon')],2);
 assert.equal(s.hg47.fragments[before],2);
 assert(s.hg29.shards.abyss>=1,'HG29 Boss core must also be earned');
 assert.equal(s.hg47.history.filter(x=>x.channel==='world').length,2);
 s=reload(s);
 assert.equal(s.hg47.fragments[before],2);
 return {boss:target.key,turns,rare:2,divine:2,abyss:s.hg29.shards.abyss};
});
check('Practice Tower victory after 5 claimed wins grants ZERO HG47 drops',()=>{
 let s=game('human');s.hg20.tower.claims=5;E.autoFormation(s);
 E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 const {result}=win(s);
 assert.equal(result.claimed,false);
 assert.equal(s.hg47.history.length,0);
 assert(Object.values(s.hg47.fragments).every(n=>n===0));
 s=reload(s);return {claimed:result.claimed,fragments:0,save:s.version};
});
check('Historical Save v07 with no hg47 section migrates to 80 zero wallets without retro rewards',()=>{
 const s=game('elf'),doc=JSON.parse(E.serializeSave(s));
 delete doc.state.hg47;const migrated=E.parseSave(JSON.stringify(doc));
 assert(migrated.hg47);assert.equal(migrated.version,7);
 assert(Object.values(migrated.hg47.fragments).every(n=>n===0));
 assert.equal(migrated.hg47.worldSeen,migrated.hg18.victories);
 return {wallets:80,save:migrated.version,retroactive:false};
});
check('No duplicate equipped UID and no corrupt fragment counts pass strict v07',()=>{
 const s=game('human');const it=E.addItem(s,E.hg47ItemId('human','rare','helm'),'HG47 duplicate QA fixture');
 E.equipItem(s,it.uid,1);
 const copy=E.clone(s);copy.equipment[1].ring=it.uid;assert.equal(E.strictSave(copy),false);
 const corrupt=E.clone(s);corrupt.hg47.fragments[E.hg47ItemId('human','rare','helm')]=-1;
 assert.equal(E.strictSave(corrupt),false);assert(E.strictSave(s));
 return {duplicateRejected:true,negativeShardRejected:true};
});
const out=path.join(__dirname,'docs','qa','hg47');fs.mkdirSync(out,{recursive:true});
const report={suite:'HG47 ten-slot earned-four-race-equipment',passed:tests.filter(t=>t.pass).length,total:tests.length,tests};
fs.writeFileSync(path.join(out,'engine.json'),JSON.stringify(report,null,2)+'\n');
console.log('HG47 SUMMARY '+report.passed+'/'+report.total);if(report.passed!==report.total)process.exitCode=1;
