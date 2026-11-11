/* HG69: five daily LIVES instead of five rewarded floors, real EXP and 3 owner lanes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console,Date,Math});
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;
let passes=0;
function test(label,action){try{const q=action()||{};console.log('HG69 PASS '+label+' '+JSON.stringify(q));passes++}catch(e){console.error('HG69 FAIL '+label+'\n'+(e.stack||e));process.exitCode=1}}
function roundtrip(s){assert(E.strictSave(s),'invalid Save v07');const r=E.parseSave(E.serializeSave(s));assert(E.strictSave(r));return r}
function setup(){
 const s=E.make('human',1000000);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);E.hg20ChooseTowerTeam(s,[1]);
 return s;
}
function finish(s,win){
 E.hg21TowerEnter(s);const b=s.battle,a=b.allies[0];
 if(win){
  b.enemies.forEach((e,i)=>{
   e.count=i===0?1:0;e.initial=e.count;e.pool=e.count;e.hp=1;e.def=0;e.atk=0;
   e.x=i===0?a.x+1:11;e.y=i===0?a.y:Math.max(0,8-i);
  });
 }else{
  b.turn=70;b.enemies.forEach(e=>{e.atk=0;e.hp=1e6;e.def=1e6;e.count=100;e.initial=100;e.pool=1e8;});
 }
 assert(E.strictSave(s),'synthetic HP observation fixture must remain valid v07');
 let out;for(let n=0;n<30&&s.battle;n++)out=E.battleAct(s,win?'attack':'defend');
 assert(out&&!s.battle,'actual engine must settle');
 assert.equal(out.type,win?'win':'lose');
 return out;
}
test('Legacy v07 retains original paid-floor cap for old engine-only runs',()=>{
 const s=setup();assert(!s.hg20.tower.enduranceMode);
 s.hg20.tower.claims=5;
 const result=finish(s,true);
 assert.equal(result.claimed,false);assert.equal(s.hg20.tower.floor,1);
 return {legacyPractice:true,claims:s.hg20.tower.claims};
});
test('Five straight wins grant five floors, EXP, resources and NO life loss',()=>{
 let s=setup();E.hg21TowerEnableEndurance(s);
 const money=s.res.gold,starterLevel=s.heroes[0].level,starterXp=s.heroes[0].xp;
 for(let n=1;n<=5;n++){
  const out=finish(s,true);assert.equal(out.claimed,true);
  assert.equal(out.floor,n);assert.equal(s.hg20.tower.floor,n+1);
  assert.equal(s.hg20.tower.claims,0);
  assert.equal(out.heroXpByHero.length,1);
  assert(out.heroXp>0);
  s=roundtrip(s);
 }
 assert(s.res.gold>money);
 assert(s.heroes[0].xp>starterXp||s.heroes[0].level>starterLevel);
 return {floor:s.hg20.tower.floor,livesLeft:5,claims:s.hg20.tower.claims,level:s.heroes[0].level,
  exp:s.heroes[0].xp,winRewards:s.hg20.tower.victories};
});
test('Exactly five losses spend five lives, block sixth entry, reset on new UTC day',()=>{
 const s=setup();E.hg21TowerEnableEndurance(s);
 for(let i=1;i<=5;i++){const before=s.hg20.tower.floor;finish(s,false);
  assert.equal(s.hg20.tower.claims,i);assert.equal(s.hg20.tower.floor,before);
  assert.equal(s.hg20.tower.last.claimed,false);roundtrip(s);
 }
 assert.throws(()=>E.hg21TowerEnter(s),/hết 5 mạng/);
 s.lastTick+=86400000;E.hg20Ensure(s);
 assert.equal(s.hg20.tower.claims,0);
 assert(E.strictSave(s));
 return {consumed:5,tomorrowRestored:5};
});
test('Three heroes occupy three readable lanes with 2 distinct hexes each',()=>{
 const s=setup(),h=s.heroes[0];
 s.heroes.push({...JSON.parse(JSON.stringify(h)),id:2,name:'Hero 2'},
  {...JSON.parse(JSON.stringify(h)),id:3,name:'Hero 3'});
 s.army.human_1=16;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
 E.hg20SetHeroPlan(s,3,[{unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
 E.hg20ChooseTowerTeam(s,[1,2,3]);
 // setup() had previously selected hero 1 with one slot. Explicitly choose
 // both valid slots for each hero: no phantom army may be added implicitly.
 E.hg21SetTowerPicks(s,[{heroId:1,slots:[0,1]},{heroId:2,slots:[0,1]},{heroId:3,slots:[0,1]}]);
 E.hg21TowerEnableEndurance(s);
 const entered=E.hg21TowerEnter(s);
 assert.equal(entered.stacks,6);
 const coords=s.battle.allies.map(u=>[u.heroId,u.x,u.y]);
 assert.deepEqual(Array.from(new Set(s.battle.allies.map(u=>u.x+','+u.y))).length?[...new Set(s.battle.allies.map(u=>u.x+','+u.y))].length:0,6);
 assert.deepEqual(Array.from(new Set(s.battle.allies.map(u=>u.y))),[1,4,7]);
 assert(E.strictSave(s));roundtrip(s);
 return {coords,six:entered.stacks};
});
console.log('HG69 TOTAL '+passes+'/4');
if(passes!==4)process.exitCode=1;
