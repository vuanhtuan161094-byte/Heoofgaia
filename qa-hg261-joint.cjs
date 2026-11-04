/* HG26.1 focused live-authority check: 3 commanders × max 2 stacks
 * occupy ONE WORLD BOSS battle. Fixtures adding 2 heroes are explicitly noted.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files=['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js',
'hg182.js','hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js',
'hg24-private-automation.js','hg26-boss-autohunt.js','hg261-joint-boss.js'];
function engine(list=files){const ctx=vm.createContext({console});for(const p of list)vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),ctx,{filename:p});return ctx.HOG_ENGINE;}
const E=engine();let passed=0;const checks=[];
function check(label,fn){try{const evidence=fn()||{};checks.push({label,pass:true,evidence});passed++;console.log('HG261 PASS '+label+' '+JSON.stringify(evidence))}
catch(e){checks.push({label,pass:false,error:String(e.stack||e)});process.exitCode=1;console.error('HG261 FAIL '+label+' '+(e.stack||e))}}
function saved(s){assert(E.strictSave(s));return E.parseSave(E.serializeSave(s))}
function setup(race='human',now=1e6){
 const s=E.make(race,now),base=JSON.parse(JSON.stringify(s.heroes[0]));
 for(let id=2;id<=3;id++)s.heroes.push({...base,id,name:race+' commander '+id});
 const unitId=race+'_1';
 for(let id=1;id<=3;id++)E.hg20SetHeroPlan(s,id,[{unitId,count:2},{unitId,count:2}]);
 const target=E.hg24RecommendBoss(s).filter(x=>!x.privateBoss).sort((a,b)=>a.stars-b.stars||a.distance-b.distance)[0];
 assert(target);
 const team=[1,2,3].map(heroId=>({heroId,slots:[0,1]}));
 return {s,unitId,target,team};
}
function cfg(x,override={}){
 return {target:x.target.key,heroId:null,maxRuns:1,keepAP:0,minUnits:12,
 minCoverage:100,maxLossPercent:100,autoHeal:false,autoRecruit:false,stopOnLoss:true,
 team:x.team,...override};
}
function takeoff(x){
 const before=x.s.ap,policy=E.hg26Start(x.s,cfg(x)),dispatch=E.hg26Step(x.s);
 assert.equal(dispatch.type,'dispatched');
 assert.equal(dispatch.stacks,6);assert.equal(dispatch.heroes,3);
 assert.equal(x.s.ap,before-8);
 assert.equal(x.s.expedition.formation.length,6);
 assert.equal(x.s.army[x.unitId],4);
 assert.equal(x.s.expedition.army[x.unitId],12);
 assert.equal(policy.team.length,3);
 return dispatch;
}
function arrive(s){
 assert(s.march?.phase==='outbound');
 E.tick(s,s.lastTick+Math.ceil((s.march.remaining+1)/s.speed*1000));
 assert(s.battle);
 const enter=E.hg26Step(s);assert.equal(enter.type,'battle_open');
 assert(s.battle.hg261Joint);return s.battle;
}
function fight(s,max=70){let n=0,out={type:'continue'};while(s.battle&&n<max){out=E.hg26Step(s);n++;}assert(!s.battle);return {out,n}}
for(const race of ['human','elf','orc','undead']){
 check(race+' three heroes share ONE battle, 2 slots each, real AP/army and Save',()=>{
  const x=setup(race),departure=takeoff(x);let s=saved(x.s);
  const b=arrive(s);
  assert.equal(b.allies.length,6);
  assert.deepEqual(Array.from(b.allies,u=>u.heroId),[1,1,2,2,3,3]);
  assert.equal(new Set(b.allies.map(u=>u.heroId)).size,3);
  assert(!b.hg21Tower&&b.hg261Joint&&b.kind==='npc');
  s=saved(s);
  assert.equal(s.battle.allies.length,6);assert.equal(s.hg26.joint.team.length,3);
  for(let i=1;i<=3;i++)assert(['fighting','marching'].includes(E.hg20HeroRole(s,i).status));
  assert.throws(()=>E.hg20SetHeroPlan(s,2,[{unitId:race+'_1',count:1}]),/tham gia|săn Boss/);
  return {race,heroes:3,stacks:departure.stacks,apSpent:departure.apSpent,garrison:s.army[x.unitId],save:s.version};
 });
}
check('Different commanders have owner-specific battle damage and no cross-buff',()=>{
 const x=setup(),s=x.s;takeoff(x);arrive(s);
 const left=saved(s),right=saved(s);
 left.heroes.find(h=>h.id===2).atk+=1000;
 const a=E.battleActCore(left,'attack'),b=E.battleActCore(right,'attack');
 const damages=(state,id)=>state.battle?.lastEvents?.filter(z=>z.actorId===id).reduce((n,z)=>n+z.damage,0)||0;
 assert.equal(damages(left,'p0'),damages(right,'p0'));
 assert.notEqual(damages(left,'p2'),damages(right,'p2'));
 return {hero1Unchanged:damages(left,'p0'),hero2Buffed:damages(left,'p2'),hero2Base:damages(right,'p2')};
});
check('Real casualty reduces combined expedition once, by 6 individual formation slots',()=>{
 const x=setup(),s=x.s;takeoff(x);const b=arrive(s),before=s.expedition.army.human_1;
 for(const u of b.enemies){u.atk=100000;u.spd=999}
 E.battleActCore(s,'attack');
 const lost=b.allies.reduce((n,u)=>n+u.initial-u.count,0);
 assert(lost>0);
 assert.equal(s.expedition.army.human_1,before-lost);
 assert.equal(s.expedition.formation.reduce((n,g)=>n+g.count,0),before-lost);
 assert(E.strictSave(s));
 return {before,lost,after:s.expedition.army.human_1};
});
check('Single real Boss victory shares hero EXP, pays loot once, returns one combined convoy',()=>{
 const x=setup(),s=x.s;
 for(const h of s.heroes){h.atk=250000;h.def=250000;h.spd=100} // fixture not earned organically
 takeoff(x);arrive(s);
 const xp=s.heroes.map(h=>h.xp),lootBefore=s.hg24.bossWins;
 const {out,n}=fight(s);
 assert.equal(out.type,'win');assert.equal(s.hg26.runs,1);
 assert.equal(s.hg26.wins,1);assert.equal(s.hg24.bossWins,lootBefore+1);
 assert.equal(s.battleReports.length,1);assert.equal(s.battleReports[0].id,s.hg26.last.reportId);
 for(const hero of s.heroes)assert(hero.level>1||hero.xp>0);
 assert(s.march?.phase==='return');
 let round=saved(s);
 const afterRewards=round.hg24.bossWins;
 assert.equal(E.hg26Step(round).type,'returning');
 E.tick(round,round.lastTick+Math.ceil((round.march.remaining+2)/round.speed*1000));
 assert(!round.march&&!round.expedition);
 assert.equal(E.hg26Step(round).type,'home');
 assert.equal(E.hg26Step(round).type,'stopped');
 assert.equal(round.hg24.bossWins,afterRewards);
 assert.equal(round.battleReports.length,1);
 assert(E.strictSave(saved(round)));
 return {turns:n,heroesWithXp:3,report:round.hg26.last.reportId,armyReturned:round.army.human_1};
});
check('Refuse same soldier being reserved for two heroes; reject >2 stacks and >3 leaders',()=>{
 const x=setup(),s=x.s;
 assert.throws(()=>E.hg26Start(s,cfg(x,{team:[{heroId:1,slots:[0,1,2]}]})),/2 slot|1 hoặc 2/);
 assert.throws(()=>E.hg26Start(s,cfg(x,{team:[...x.team,x.team[0]]})),/3 tướng/);
 assert.throws(()=>E.hg26Start(s,cfg(x,{team:[x.team[0],x.team[0]]})),/trùng/);
 s.army.human_1=11;
 assert.throws(()=>E.hg26Start(s,cfg(x)),/Không đủ quân/);
 assert.equal(s.hg26.enabled,false);
 return {remaining:s.army.human_1,collisionsRejected:true};
});
check('Old HG26 v07 solo save reads without forced change, HG21 3×2 Tower still real',()=>{
 const older=engine(files.slice(0,-1)),v=older.make('human',1e6);
 const s=E.parseSave(older.serializeSave(v));assert.equal(s.version,7);
 assert.equal(s.hg26.enabled,false);assert.equal(s.hg26.joint,undefined);
 const t=setup().s;E.hg20ChooseTowerTeam(t,[1,2,3]);
 E.hg21SetTowerPicks(t,[1,2,3].map(heroId=>({heroId,slots:[0,1]})));
 const enter=E.hg21TowerEnter(t);
 assert.equal(enter.stacks,6);assert(t.battle.hg21Tower&&!t.battle.hg261Joint);
 assert(E.strictSave(t));return {legacy:true,towerOwners:Array.from(new Set(t.battle.allies.map(u=>u.heroId)))};
});
fs.mkdirSync(path.join(__dirname,'docs/qa/hg261'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg261/joint-boss.json'),JSON.stringify({passed,total:checks.length,checks},null,2));
console.log('HG261 JOINT BOSS '+passed+'/'+checks.length+(passed===checks.length?' PASS':' FAIL'));
