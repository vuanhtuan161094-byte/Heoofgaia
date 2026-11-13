/* HG84: real probability, escalating Boss/Tower payout and legendary combat balance.
 * Any manually seeded ordinal/unit/currency is an explicit QA fixture, never a game reward.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({console,Date,Math});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js'.split(' ');
for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
const E=ctx.HOG_ENGINE,tests=[];
function check(name,fn){
 try{const value=fn()||{};tests.push({name,pass:true});console.log('HG84 PASS '+name+' '+JSON.stringify(value));}
 catch(e){tests.push({name,pass:false});console.error('HG84 FAIL '+name+' '+String(e.stack||e));process.exitCode=1;}
}
const fresh=(race='human')=>E.make(race,1000000);
const saved=s=>{assert(E.strictSave(s));const r=E.parseSave(E.serializeSave(s));assert(E.strictSave(r));return r;};
const hash=v=>{let n=2166136261;for(let i=0;i<v.length;i++)n=Math.imul(n^v.charCodeAt(i),16777619);return n>>>0;};
const win=s=>{let n=0,out;while(s.battle&&n++<90)out=E.battleAct(s,'attack');assert.equal(out?.type,'win');return {out,turns:n};};
check('Six normalized HG29 roll tables, increased rare materials without synthetic loot',()=>{
 const odds={npc_low:{gear:32,hero:6,none:12},npc_elite:{gear:35,hero:18,none:1},
  npc_boss:{gear:27,hero:22,none:15},tower:{gear:38,hero:28,none:20}};
 for(const [key,t] of Object.entries(E.HG29_TABLES)){
  assert.equal(t.roll.reduce((n,r)=>n+r[3],0),10000,key);
  const counts=Object.fromEntries(t.roll.map(r=>[r[0],r[3]/100]));
  if(odds[key])for(const [id,chance] of Object.entries(odds[key]))
   assert.equal(counts[id],chance,key+' '+id);
 }
 const s=fresh();assert.equal(s.inventory.length,0);assert(Object.values(s.hg29.shards).every(x=>x===0));
 saved(s);return {sources:Object.keys(E.HG29_TABLES).length,verified:odds};
});
check('Boss tier 11/12/13 guarantees are tied to real map target and do not mutate state',()=>{
 const s=fresh(),before=E.serializeSave(s),proof=[];
 for(let tier=11;tier<=13;tier++){
  const tile=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===tier);
  assert(tile,'missing actual Boss tier '+tier);
  const preview=E.hg29Preview(s,{kind:'npc',target:tile.key});
  const guarantee=Object.fromEntries(preview.guaranteed.map(q=>[q.id,q.count]));
  assert.equal(preview.source,'npc_boss');assert.equal(guarantee.abyss,tier-10);
  assert.equal(guarantee.hero||0,tier===13?1:0);
  assert.equal(E.hg29Expected('npc_boss',1,tile.key).abyss,tier-10);
  assert.equal(E.hg84CrownChance('npc',tier),{11:200,12:500,13:1000}[tier]);
  proof.push({tier,abyss:guarantee.abyss,hero:guarantee.hero||0,dropRate:E.hg84CrownChance('npc',tier)/100});
 }
 assert.equal(E.serializeSave(s),before);
 return {proof,viewOnly:true};
});
check('Paid Tower milestones scale at 5/10/25, no income on expired claims',()=>{
 const s=fresh(),rows=[];
 for(const floor of [1,5,10,20,25,30]){
  const p=E.hg29Preview(s,{kind:'tower',floor,target:'floor-'+floor});
  const by=Object.fromEntries(p.guaranteed.map(q=>[q.id,q.count]));
  const tower= floor>=25&&floor%5===0?3:floor%5===0?2:1;
  const hero=floor>=10&&floor%10===0?1:0;
  assert.equal(by.tower,tower);assert.equal(by.hero||0,hero);
  assert.equal(E.hg29Expected('tower',floor).tower,tower);
  rows.push({floor,tower,hero});
 }
 assert.equal(E.hg84CrownChance('tower',0,20),500);
 assert.equal(E.hg84CrownChance('tower',0,25),0);
 assert.equal(E.hg84CrownChance('tower',0,10),0);
 s.hg20.tower.claims=5;
 const out=E.hg29Preview(s,{kind:'tower',floor:25});
 assert.equal(out.paid,false);assert.equal(out.guaranteed.length,0);assert.equal(out.chances.length,0);
 saved(s);return {milestones:rows,practiceHasNoLoot:true};
});
check('Crown Relic is stronger than Dragon in same slot but below Platinum and Divine; no free UIDs',()=>{
 const s=fresh(),oldCount=s.inventory.length;
 const ids=['dragon_blade',E.hg83ItemId('human','weapon'),'star_blade','hg47_human_divine_weapon'];
 const rows=ids.map(id=>E.addItem(s,id,'HG84 explicit grade QA fixture'));
 const atk=rows.map(r=>E.hg46Stats(r).atk);
 assert(atk[1]>atk[0],'Crown must outperform Dragon in attack at equal +0');
 assert(atk[1]<atk[2],'Platinum Star remains higher than Crown');
 assert(atk[2]<atk[3],'Divine weapon remains strongest');
 assert.equal(E.hg73Kind(rows[1]),'legendary');assert.equal(s.inventory.length-oldCount,4);
 const before=JSON.stringify(rows.map(r=>E.hg73Affixes(r)));
 const restored=saved(s);
 assert.equal(JSON.stringify(restored.inventory.map(r=>E.hg73Affixes(r))),before);
 return {atk,rank:['dragon','crown','platinum','divine'],version:restored.version};
});
check('3/6/10 race-set milestones are real, capped and preserve canonical ownership',()=>{
 const s=fresh('human'),rows=E.HG47_SLOTS.map(([slot])=>E.addItem(s,E.hg83ItemId('human',slot),'HG84 10-slot QA fixture'));
 const levels=[];
 for(let i=0;i<rows.length;i++){
  E.equipItem(s,rows[i].uid,1);
  const m=E.combatModifiers(s,1),count=E.hg83SetProgress(s,1)[0].count;
  assert(count===i+1);
  assert(m.damageReduction<=.24+1e-9&&m.damageBonus<=.32+1e-9);
  if([3,6,10].includes(count))levels.push({count,reduction:m.damageReduction});
 }
 assert.equal(levels.length,3);assert(levels[0].reduction>=.024);
 assert(levels[1].reduction>=levels[0].reduction);
 assert(levels[2].reduction>=levels[1].reduction);
 assert.equal(s.inventory.length,10);
 saved(s);return {milestones:levels,equipped:10,save:7};
});
check('Actual T11 Boss unlocks owned jackpot only on victory, once per ordinal and reload',()=>{
 const s=fresh(),hero=s.heroes[0];
 hero.level=100;hero.atk=240000;hero.def=240000;hero.spd=100;
 s.army.human_10=500;s.ap=700;
 const tile=E.hg24RecommendBoss(s).find(x=>x.eliteTier===11);assert(tile);
 let ordinal=0;
 for(let n=1;n<2000;n++){
  const key='HG84|crown|npc|'+tile.key+'|'+n+'|'+s.race;
  if(hash(key)%10000<200){ordinal=n;break;}
 }
 assert(ordinal>0,'Expected at least one deterministic T11 jackpot seed');
 // This QA fixture imitates the counters AFTER earlier legitimate wins.
 const previous=ordinal-1;
 s.hg18.victories=previous;s.hg29.world=previous;s.hg31.worldSeen=previous;
 s.hg47.worldSeen=previous;s.hg27.processedWorld=previous;
 assert(E.strictSave(s),'no invalid counters before actual battle');
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);
 E.startMarch(s,tile.key);let ticks=0;
 while(s.march&&ticks++<12)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle,'real battle required');
 assert.equal(s.inventory.length,0,'must never pre-mint item on battle start');
 const result=win(s);
 assert(result.out.hg84CrownDrop,'Boss victory should pay the deterministic rare UID');
 const entry=s.inventory.find(q=>q.uid===result.out.hg84CrownDrop.uid);
 assert(entry&&E.ITEMS[entry.itemId].hg83&&entry.itemId.startsWith('hg83_human_'));
 assert.equal(s.hg29.shards.abyss,1);
 assert.equal(s.hg47.history.filter(q=>q.channel==='world').length,2);
 const reload=saved(s);assert.equal(reload.inventory.filter(q=>q.uid===entry.uid).length,1);
 assert.equal(reload.hg47.worldSeen,ordinal);
 return {target:tile.key,ordinal,uid:entry.uid,itemId:entry.itemId,turns:result.turns,save:7};
});
console.log('HG84 '+tests.filter(x=>x.pass).length+'/'+tests.length+' '+(process.exitCode?'FAIL':'PASS'));
if(tests.some(x=>!x.pass))process.exitCode=1;
