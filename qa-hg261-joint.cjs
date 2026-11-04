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
 // Isolate the owner-stat formula inside an otherwise *real tactical turn*:
 // keep the enemy alive and move two stacks in range to avoid an all-zero
 // first turn caused by the canonical 12x9 tactical battlefield distance.
 for(const u of s.battle.enemies){u.count=0;u.pool=0;}
 const foe=s.battle.enemies[0];foe.count=1;foe.hp=1000000000;foe.pool=1000000000;foe.atk=0;foe.def=0;
 s.battle.allies[0].x=9;s.battle.allies[0].y=2;
 s.battle.allies[2].x=9;s.battle.allies[2].y=3;
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
 for(const u of b.enemies){u.atk=100000;u.spd=999;u.range=E.TACTICAL_RANGE.ranged}
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
check('Three commander spells buff only their own two stacks in the same Boss fight',()=>{
 const x=setup(),s=x.s;takeoff(x);arrive(s);
 s.heroMagic.leadership=10;
 s.heroes[1].equippedSpells=['leadership']; // second hero casts
 const before=s.battle.allies.map(u=>u.atk);
 const cast=E.hg21TowerCast(s,2,'leadership');
 assert.deepEqual(Array.from(cast.targets),['p2','p3']);
 assert.equal(s.battle.allies[0].atk,before[0]);
 assert.equal(s.battle.allies[1].atk,before[1]);
 assert(s.battle.allies[2].atk>before[2]);
 assert(s.battle.allies[3].atk>before[3]);
 assert.equal(s.battle.allies[4].atk,before[4]);
 assert.equal(s.battle.allies[5].atk,before[5]);
 assert.throws(()=>E.hg21TowerCast(s,2,'leadership'),/một phép/);
 assert(E.strictSave(saved(s)));
 return {caster:2,affected:cast.targets,otherHeroesUnaffected:true};
});
check('Two consecutive Boss battles keep the SAME three commanders and exactly two canonical reports',()=>{
 const x=setup('elf'),s=x.s;
 for(const h of s.heroes){h.atk=250000;h.def=250000;h.spd=100} // synthetic high-tier combat fixture
 E.hg26Start(s,cfg(x,{maxRuns:2}));
 for(let i=0;i<2;i++){
  const sent=E.hg26Step(s);assert.equal(sent.type,'dispatched');assert.equal(sent.stacks,6);
  const live=arrive(s);assert.equal(live.hg261Joint.team.length,3);
  const outcome=fight(s);assert.equal(outcome.out.type,'win');
  assert.equal(s.hg26.runs,i+1);
  assert.equal(s.hg24.bossWins,i+1);
  assert.equal(s.battleReports.length,i+1);
  assert.equal(new Set(s.battleReports.map(r=>r.id)).size,i+1);
  E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
  assert.equal(E.hg26Step(s).type,'home');
  assert.equal(E.hg26Step(s).type,i===0?'refilled':'stopped');
  assert(E.strictSave(saved(s)));
 }
 return {heroes:3,stacksPerHero:2,bossWins:2,reportCount:s.battleReports.length,apTrips:2};
});
check('HG21 Tower three-hero selections survive a real joint Boss expedition and return',()=>{
 const x=setup(),s=x.s;
 for(const h of s.heroes){h.atk=240000;h.def=240000;h.spd=100}
 E.hg20ChooseTowerTeam(s,[1,2,3]);
 E.hg21SetTowerPicks(s,[1,2,3].map(heroId=>({heroId,slots:[0,1]})));
 E.hg26Start(s,cfg(x));
 assert.equal(E.hg26Step(s).type,'dispatched');
 assert.equal(s.hg20.tower.team.length,0,'Tower selection must pause while real troops are deployed');
 assert.equal(s.hg20.tower.picks.length,0);
 assert(E.strictSave(saved(s)));
 arrive(s);assert.equal(fight(s).out.type,'win');
 E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
 assert.equal(E.hg26Step(s).type,'home');
 assert.equal(E.hg26Step(s).type,'stopped');
 assert.deepEqual(Array.from(s.hg20.tower.team),[1,2,3]);
 assert.equal(s.hg20.tower.picks.length,3);
 assert(s.hg20.tower.picks.every(p=>p.slots.length===2));
 assert(E.strictSave(saved(s)));
 return {restoredHeroes:3,restoredPicks:6,worldBossRewards:1,towerFloor:s.hg20.tower.floor};
});
check('Crossing casualty threshold stops before next turn even with three heroes present (fixture)',()=>{
 const x=setup('orc'),s=x.s;E.hg26Start(s,cfg(x,{maxLossPercent:20}));
 E.hg26Step(s);arrive(s);
 for(const u of s.battle.allies.slice(0,2)){u.count=0;u.pool=0} // synthetic 4/12 casualty event >20%
 const before=s.battle.turn,reportCount=s.battleReports.length;
 const stopped=E.hg26Step(s);
 assert.equal(stopped.type,'stopped');assert.equal(s.hg26.enabled,false);
 assert.equal(s.battle.turn,before);assert.equal(s.battleReports.length,reportCount);
 assert(s.battle.hg26NeedsManual);
 return {liveHeroes:3,manual:true,extraTurns:0};
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
