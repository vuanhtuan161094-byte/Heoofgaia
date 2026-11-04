/* HG18.2 focused original balance contract: no Save schema migration.
 * Sources: SRC45 NPC 4-8-star base XP and SRC20 Fame AP table remain unchanged.
 * Battle combat setups are explicitly synthetic; the HG18.1 organic test
 * performs real-gameplay build, recruit, battle and rebirth without grants.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({console});
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG,tests=[];
function clean(){return E.make('human',1_000_000)}
function test(name,fn){
 try{const data=fn();tests.push({name,pass:true,details:data});console.log('PASS '+name+' '+JSON.stringify(data||{}));}
 catch(err){tests.push({name,pass:false,error:String(err.stack||err)});console.error('FAIL '+name+' '+(err.stack||err));process.exitCode=1;}
}
function unitArmy(s,id,count){
 const hero=s.heroes[0];hero.level=28; // disclosed combat-only fixture
 s.army[id]=count;
 E.setFormation(s,Array.from({length:7},(_,i)=>({unitId:id,count:Math.floor(count/7)+(i<count%7?1:0)})));
}
function fight(s,target){
 s.battle=E.makeBattle(s,target.key);
 let out;for(let n=0;n<71&&s.battle;n++)out=E.battleAct(s,'attack');
 assert(out&&out.type!=='continue','Battle did not resolve');return out;
}
test('Historical SRC45 base XP and SRC20 Fame AP rates are unchanged',()=>{
 const expected={4:1000,5:4000,6:9000,7:18000,8:30000};
 for(const [star,base] of Object.entries(expected))assert.equal(E.battleExperienceReward({kind:'npc',level:+star}).baseXp,base);
 assert.equal(E.fameApStats(5).perHour,15);assert.equal(E.fameApStats(1_000_000).perHour,70);
 assert.equal(E.heroLimit(1),11500);assert.equal(E.heroLimit(100),4062500);
 const s=clean();assert.equal(s.version,7);
 assert.equal(E.hg182MarchCost(s,E.TILES.find(t=>t.kind==='npc'&&t.level===8).key),8);
 return {src45:expected,apBase:8,saveVersion:s.version};
});
test('Scout levels 1-3 spend exactly 7/6/5 AP for NPC 4+ and fail atomically',()=>{
 const npc=E.TILES.find(t=>t.kind==='npc'&&t.level===8&&E.pathfind('3,4',t.key));
 assert(npc,'No reachable 8-star NPC');
 for(const scout of [0,1,2,3]){
  const s=clean();s.spells.scouting=scout;
  const expected=8-Math.min(3,scout);s.ap=expected;
  assert.equal(E.hg182MarchCost(s,npc.key),expected);
  E.startMarch(s,npc.key);
  assert.equal(s.ap,0);assert.equal(s.march.target,npc.key);
  assert(E.strictSave(s),'AP-discounted march invalidates Save');
 }
 const denied=clean();denied.spells.scouting=3;denied.ap=4;const before=JSON.stringify(denied);
 assert.throws(()=>E.startMarch(denied,npc.key),/Thiếu AP/);
 assert.equal(JSON.stringify(denied),before,'Insufficient AP must not partially mutate expedition');
 return {costs:[8,7,6,5],atomicRejection:true};
});
test('Non-NPC march costs and original Fame recovery are preserved',()=>{
 const s=clean();s.spells.scouting=10;
 const mine=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));
 assert(mine);assert.equal(E.hg182MarchCost(s,mine.key),6);
 assert.equal(E.hg182MarchCost(s,'3,4'),8);
 s.ap=0;s.speed=1;E.tick(s,s.lastTick+3600000);
 assert.equal(s.ap,15);
 return {mineCost:6,oneHourAp:15};
});
test('T9/T10 cost efficiency needs high Blacksmith and Manufacturing investment',()=>{
 const s=clean(),elite=C.units.human[9],base={...elite.cost};
 const plain=E.recruitCost(s,elite,1);
 assert.equal(plain.wood,base.wood);assert.equal(plain.ore,base.ore);
 s.buildings.blacksmith=10;s.spells.manufacturing=9;s.spells.bootcamp=9;
 const discount=E.recruitCost(s,elite,1);
 assert(discount.wood<plain.wood||discount.ore<plain.ore||discount.sulfur<plain.sulfur||discount.crystal<plain.crystal);
 assert.equal(discount.gold,Math.ceil(base.gold*(1-Math.min(.2,9*.02)))); // Level 9 Manufacturing = 18%, not 20%.
 const low=C.units.human[0],lowCost=E.recruitCost(s,low,1);
 assert.equal(lowCost.wood,low.cost.wood,'T1 cost cannot be reduced by elite efficiency');
 assert.equal(JSON.stringify(elite.cost),JSON.stringify(base),'Unit catalog changed');
 return {original:plain,paidElite:discount,lowTierWood:lowCost.wood};
});
test('Elite paid queue debits exactly displayed prices, speeds training, and cold-loads v07',()=>{
 const s=clean(),u=C.units.human[9];
 for(const k of Object.keys(s.buildings))s.buildings[k]=10;
 for(const k of C.keys)s.res[k]=E.limits(s)[k];
 for(const k of Object.keys(C.spells))s.spells[k]=9;
 const before={...s.res},cost=E.recruitCost(s,u,1);
 E.recruit(s,u.id,1);
 assert.equal(s.training.length,1);
 for(const k of C.keys)assert(Math.abs(s.res[k]-(before[k]-cost[k]))<1e-5,'Debited wrong '+k);
 const originalTraining=Math.ceil(u.timeSec*.8),newTime=s.training[0].total;
 assert(newTime<originalTraining,'T10 production time not improved');
 const mid=E.parseSave(E.serializeSave(s));assert.equal(mid.training[0].total,newTime);
 E.tick(mid,mid.lastTick+(newTime+2)*1000/mid.speed);
 assert.equal(mid.army[u.id],1);assert.equal(mid.training.length,0);assert(E.strictSave(mid));
 return {originalTraining,newTime,cost,recruitDelivered:true};
});
test('First-clear high-star NPC receives a one-time model bonus and exact battle receipt',()=>{
 const s=clean();s.buildings.heroTower=9;s.spells.scouting=3;
 unitArmy(s,'human_10',90);
 const npc=E.TILES.find(t=>t.kind==='npc'&&t.level===8);
 assert(npc);
 const plan=E.hg182CombatXpPreview(s,8,true);
 assert(plan.extra>0&&plan.campaignFactor>5);
 const first=fight(s,npc);assert.equal(first.type,'win');
 const xp1=s.battleReports[0].heroXp;
 assert(xp1>30000,'Expected meaningful bonus in actual battle report');
 const again=fight(s,npc);assert.equal(again.type,'win');
 const xp2=s.battleReports[0].heroXp;
 assert(xp2<xp1,'First-clear bonus replayed on same NPC');
 assert(E.strictSave(s));
 const loaded=E.parseSave(E.serializeSave(s));
 assert.equal(loaded.battleReports[0].heroXp,xp2);
 E.tick(loaded,loaded.lastTick);assert.equal(loaded.battleReports[0].heroXp,xp2);
 return {firstBattleXp:xp1,repeatedBattleXp:xp2,firstClearOnce:true,save:true};
});
test('Modeled 9-star boss grants substantial real victory XP, not 270-XP fallback',()=>{
 const s=clean();s.buildings.heroTower=9;s.spells.scouting=3;unitArmy(s,'human_10',90);
 const tile=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===11);
 assert(tile);const plan=E.hg182CombatXpPreview(s,9,true);
 assert(plan.extra>100000,'Modeled boss XP remains too low');
 const result=fight(s,tile);assert.equal(result.type,'win');
 const r=s.battleReports[0];assert(r.heroXp>100000);assert(E.strictSave(s));
 const parsed=E.parseSave(E.serializeSave(s));assert.equal(parsed.battleReports[0].heroXp,r.heroXp);
 return {boss:tile.key,heroXp:r.heroXp,sourceBase:270,balanceBonus:plan.extra};
});
const output={kind:'HG18.2 balance no-save-schema change',passed:tests.filter(t=>t.pass).length,
 failed:tests.filter(t=>!t.pass).length,tests};
fs.mkdirSync(path.join(__dirname,'docs/qa/hg182'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg182/balance.json'),JSON.stringify(output,null,2));
console.log('HG182 BALANCE '+output.passed+'/'+tests.length+' '+(output.failed?'FAIL':'PASS'));
