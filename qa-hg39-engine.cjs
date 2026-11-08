/* HG39 focused engine checks: real HG20 hero plans, v07 migration and pacing. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname,ctx=vm.createContext({console});
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js'])
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;
function test(name,run){run();console.log('PASS '+name)}

test('HG39 pacing applies exactly once after full HG38 HG20 production and storage',()=>{
 const s=E.make('human',1_000_000),config=E.HG39_CONFIG;
 assert.deepEqual(JSON.parse(JSON.stringify(config)),{productionMultiplier:20,recruitSpeedMultiplier:5000,constructionSpeedMultiplier:10,warehouseCapacityMultiplier:100,minimumRecruitGameSeconds:1,minimumConstructionGameSeconds:1});
 assert.equal(E.rate(s).gold,160*5*20);assert.equal(E.rate(s).wood,12*5*20);assert.equal(E.rate(s).ore,12*5*20);assert.equal(E.rate(s).sulfur,6*5*20);assert.equal(E.rate(s).crystal,6*5*20);
 const cap=E.limits(s);assert.equal(cap.gold,15_000*10*100);assert.equal(cap.wood,1_500*10*100);assert.equal(cap.ore,1_500*10*100);assert.equal(cap.sulfur,750*10*100);assert.equal(cap.crystal,750*10*100);
 const base=E.rate(s);s.mines=Object.entries(E.MINE_HOURLY).map(([res],i)=>({key:`hg39-${i}`,res,level:1,cityId:'main'}));
 for(const [res,amount] of Object.entries(E.MINE_HOURLY))assert.equal(E.rate(s)[res]-base[res],amount*5*20,res);
});

test('HG39 old v07 active queues scale once and preserve the saved work fraction',()=>{
 const s=E.make('human',1_000_000);delete s.hg39;
 s.buildingQueue={id:s.serial++,key:'hall',level:2,total:294,remaining:147};
 s.training=[{id:s.serial++,unitId:'human_1',count:2,total:100,remaining:50}];const paid={...s.res};
 const migrated=E.parseSave(JSON.stringify(s));assert.equal(migrated.version,7);
 assert.equal(migrated.buildingQueue.total,30);assert.equal(migrated.buildingQueue.remaining,14.7);
 assert.equal(migrated.training[0].total,2);assert.equal(migrated.training[0].remaining,1);
 assert.deepEqual({...migrated.res},paid);const snapshot=JSON.stringify(migrated);
 assert.equal(JSON.stringify(E.parseSave(E.serializeSave(migrated))),snapshot);assert(E.strictSave(migrated));
});

test('HG39 dispatch selector honors hero reservations and launches only the chosen real army',()=>{
 const s=E.make('human',1_000_000),offer=s.tavern.offers[0];assert(offer);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:10}]);const second=E.hireCandidate(s,offer.id);
 assert.throws(()=>E.hg20SetHeroPlan(s,second,[{unitId:'human_1',count:7}]),/Không đủ/);
 E.hg20SetHeroPlan(s,second,[{unitId:'human_1',count:6}]);
 assert.equal(E.hg20Reservations(s,1).human_1,6);assert.equal(s.army.human_1-E.hg20Reservations(s,1).human_1,10);
 const target=E.NPC_CAMPS_2009.find(n=>E.pathfind('3,4',n.key));assert(target);
 E.selectHero(s,1);E.startMarch(s,target.key);
 assert.equal(s.army.human_1,6);assert.equal(s.expedition.army.human_1,10);assert.equal(E.hg20HeroRole(s,1).status,'marching');
 const reloaded=E.parseSave(E.serializeSave(s));assert.equal(reloaded.army.human_1,6);assert.equal(reloaded.expedition.army.human_1,10);
 assert.equal(E.hg20HeroPlan(reloaded,second)[0].count,6);assert(E.strictSave(reloaded));
});
console.log('TOTAL HG39 focused engine checks 3/3 PASS');
