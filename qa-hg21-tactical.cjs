/* HG21 focused acceptance: owner-specific 3x2 tactical tower, rewards,
 * no world troop casualties, Save v07 reload and four playable race starters.
 * Hero clones / high floor are explicitly synthetic fixture cases.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
const modules=['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js'];
for(const file of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG;
let passed=0;const receipts=[];
function test(name,run){
 try{const data=run()||{};passed++;receipts.push({name,ok:true,data});console.log('HG21 PASS '+name+' '+JSON.stringify(data));}
 catch(error){receipts.push({name,ok:false,error:String(error.stack||error)});console.error('HG21 FAIL '+name+' '+(error.stack||error));process.exitCode=1;}
}
function save(s){assert(E.strictSave(s),'Invalid private Save v07');return E.parseSave(E.serializeSave(s))}
function fight(s,max=70){
 const entering=s.battle?.hg21Tower;if(!entering)throw Error('No tactical tower scene');
 let out={type:'continue'},turns=0;
 while(s.battle&&turns<max){out=E.battleAct(s,'attack');turns++;if(!E.strictSave(s))throw Error('Save became invalid on tactical turn '+turns);}
 if(s.battle)throw Error('Tower battle did not end in 70 turns');
 return {out,turns};
}
for(const race of ['human','elf','orc','undead']){
 test(race+': real recruit payment -> 1 hero 1 stack -> actual tactical victory -> v07 Save',()=>{
  const s=E.make(race,1000000),u=C.units[race][0],before=s.res.gold;
  E.recruit(s,u.id,45);assert(s.res.gold<before);
  const q=s.training[0];E.tick(s,s.lastTick+(q.remaining+2)*1000/s.speed);
  assert.equal(s.army[u.id],61);
  E.hg20SetHeroPlan(s,1,[{unitId:u.id,count:61}]);
  E.hg20ChooseTowerTeam(s,[1]);
  const entry=E.hg21TowerEnter(s);
  assert.equal(entry.type,'battle');assert.equal(entry.heroes,1);assert.equal(entry.stacks,1);
  assert.equal(s.battle.allies[0].heroId,1);assert.equal(s.army[u.id],61);
  const during=save(s);assert(during.battle?.hg21Tower&&during.battle.allies[0].heroId===1);
  const result=fight(during);
  assert.equal(result.out.type,'win','Real turns must win the entry floor');
  assert.equal(during.hg20.tower.floor,2);assert.equal(during.hg20.tower.claims,1);
  assert.equal(during.army[u.id],61,'Tower projection must not consume real troops');
  assert.equal(save(during).hg20.tower.last.outcome,'win');
  return {race,turns:result.turns,stacks:entry.stacks,claims:1};
 });
}
test('Three heroes contribute 2 slots each; buffs and attack power never cross hero owners',()=>{
 const s=E.make('human',1000000),h=s.heroes[0];
 const second={...JSON.parse(JSON.stringify(h)),id:2,name:'Tướng B',atk:30};
 const third={...JSON.parse(JSON.stringify(h)),id:3,name:'Tướng C',atk:60};
 s.heroes.push(second,third);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
 E.hg20SetHeroPlan(s,3,[{unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
 E.hg20ChooseTowerTeam(s,[1,2,3]);
 assert.throws(()=>E.hg21SetTowerPicks(s,[{heroId:1,slots:[0,1,2]}]),/hai|two|slot/i);
 assert.throws(()=>E.hg21SetTowerPicks(s,[{heroId:1,slots:[0,0]}]),/hai|two|slot/i);
 E.hg21SetTowerPicks(s,[{heroId:1,slots:[0,1]},{heroId:2,slots:[0,1]},{heroId:3,slots:[0,1]}]);
 const entry=E.hg21TowerEnter(s);
 assert.equal(entry.stacks,6);assert.equal(entry.heroes,3);
 assert.deepEqual(Array.from(s.battle.allies,u=>u.heroId),[1,1,2,2,3,3]);
 assert.equal(s.army.human_1,16,'Tactical tower must not debit garrison');
 s.heroMagic.leadership=10;s.heroes[0].equippedSpells=['leadership'];
 const before=s.battle.allies.map(u=>u.atk);
 const spell=E.hg21TowerCast(s,1,'leadership');
 assert.deepEqual(Array.from(spell.targets),['p0','p1']);
 assert(s.battle.allies[0].atk>before[0]&&s.battle.allies[1].atk>before[1]);
 assert.deepEqual(Array.from(s.battle.allies.slice(2),u=>u.atk),Array.from(before.slice(2)));
 assert(E.strictSave(s));
 const copy=save(s);assert.equal(copy.battle.allies.length,6);
 // Compare two copies of the same turn: only hero2 attack is modified.
 const battle=(state)=>{
  for(const u of state.battle.allies){u.spd=20;u.x=9;u.y=2;}
  for(const u of state.battle.enemies){u.spd=.1;u.x=10;u.y=2;u.hp=1000;u.count=1000;u.initial=1000;u.pool=1000000;u.atk=0;}
  state.battle.lastEvents=[];
 };
 const a=E.clone(copy),b=E.clone(copy);
 battle(a);battle(b);b.heroes.find(x=>x.id===2).atk+=200;
 E.battleAct(a,'attack');E.battleAct(b,'attack');
 const get=(x,id)=>x.battle?.lastEvents?.find(e=>e.actorId===id)?.damage??-1;
 assert(get(a,'p0')>0&&get(a,'p2')>0,'Both owners must produce real damage');
 assert.equal(get(a,'p0'),get(b,'p0'),'Hero2 buff must not change hero1 damage');
 assert(get(b,'p2')>get(a,'p2'),'Hero2 attribute must increase hero2 stack damage');
 return {heroes:entry.heroes,stacks:entry.stacks,hero1Damage:get(a,'p0'),hero2Before:get(a,'p2'),hero2After:get(b,'p2')};
});
test('Five rewards/day, sixth victory practice only, daily reset',()=>{
 const s=E.make('human',1000000);s.hg20.tower.rank=20;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);E.hg20ChooseTowerTeam(s,[1]);
 for(let i=0;i<6;i++){
  E.hg21TowerEnter(s);const {out}=fight(s);assert.equal(out.type,'win','Private progression should win training floor '+i);
  if(i===4){assert.equal(s.hg20.tower.claims,5);assert.equal(s.hg20.tower.floor,6);}
  if(i===5){assert.equal(out.rewardEssence,0);assert.equal(s.hg20.tower.floor,6);}
 }
 const gold=s.res.gold;const loaded=save(s);assert.equal(loaded.hg20.tower.claims,5);
 E.tick(loaded,loaded.lastTick+86400000);
 assert.equal(E.hg20TowerStatus(loaded).claims,0);
 return {rewardWins:5,currentFloor:loaded.hg20.tower.floor,gold,preservedSave:loaded.version};
});
test('High floor 25: earned win drops actual wearable floor-scaled gear (fixture floor/rank)',()=>{
 const s=E.make('human',1000000);s.hg20.tower.floor=25;s.hg20.tower.rank=90;
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);E.hg20ChooseTowerTeam(s,[1]);
 E.hg21TowerEnter(s);const {out}=fight(s);
 assert.equal(out.type,'win');assert(out.itemUid>0,'Missing real loot UID');
 const item=s.inventory.find(x=>x.uid===out.itemUid);
 assert(item&&E.ITEMS[item.itemId].towerExclusive&&item.towerFloor===25);
 E.equipItem(s,item.uid,1);const loaded=save(s);
 assert.equal(loaded.hg20.tower.floor,26);
 assert(E.heroStats(loaded,1).atk>E.heroStats(E.make('human',1000000),1).atk);
 return {item:item.itemId,floor:item.towerFloor,next:s.hg20.tower.floor};
});
test('Pre-HG21 selected team migrates without minting wealth and can select slots later',()=>{
 const previous=vm.createContext({console});
 for(const p of modules.slice(0,-1))vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),previous,{filename:p});
 const base=previous.HOG_ENGINE.make('human',1000000);
 previous.HOG_ENGINE.hg20ChooseTowerTeam(base,[1]);
 const oldGold=base.res.gold,loaded=E.parseSave(previous.HOG_ENGINE.serializeSave(base));
 assert.equal(loaded.res.gold,oldGold);assert.equal(loaded.version,7);
 assert.equal(loaded.hg21Tower,undefined);assert.equal(loaded.hg20.tower.team[0],1);
 assert(E.strictSave(loaded));
 return {version:loaded.version,gold:oldGold,legacySelectedHero:loaded.hg20.tower.team[0]};
});
fs.mkdirSync(path.join(__dirname,'docs/qa/hg21'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg21/tactical.json'),JSON.stringify({passed,total:receipts.length,receipts},null,2));
console.log('HG21 TACTICAL '+passed+'/'+receipts.length+(passed===receipts.length?' PASS':' FAIL'));
