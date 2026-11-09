/* HG41 true-source engine QA. Checks Save v07, real combat layout,
 * per-hero duplicated type slots, CS command, recurring conversions.
 * Artificial stock/levels exist only inside explicit tests, not game.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg409-enemy-commanders.js hg410-battlefield.js'.split(' ');
for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,cases=[];
function test(name,fn){try{const data=fn()||{};cases.push({name,pass:true,data});console.log('HG41 PASS '+name+' '+JSON.stringify(data))}
 catch(e){process.exitCode=1;cases.push({name,pass:false,error:String(e.stack||e)});console.error('HG41 FAIL '+name+' '+String(e.stack||e));}}
function game(race='human'){const s=E.make(race,Date.now());assert(E.strictSave(s));return s}
function save(s){assert(E.strictSave(s),'Save invalid before roundtrip');const q=E.parseSave(E.serializeSave(s));assert(E.strictSave(q));return q}
function tile(level){const t=E.TILES.find(t=>t.kind==='npc'&&t.level===level&&!t.privateBoss);assert(t);return t}
function placement(b){
 const occupied=new Set();
 for(const unit of [...b.allies,...b.enemies]){
  assert(Number.isInteger(unit.x)&&Number.isInteger(unit.y));
  assert(E.battleHex.inBounds(unit.x,unit.y));
  assert(unit.x===0||unit.x===1||unit.x===10||unit.x===11);
  assert(unit.side==='player'?unit.x<=1:unit.x>=10);
  assert(!occupied.has(unit.x+','+unit.y),'Two real stacks occupy one hex');
  occupied.add(unit.x+','+unit.y);
 }
 assert(b.hg410?.v===1);
}
test('Four races spawn six-or-more real enemy stacks in only two edge columns, valid Save v07',()=>{
 const output=[];
 for(const race of ['human','elf','orc','undead']){
  const s=game(race),b=E.makeBattle(s,tile(1).key);
  assert(b.enemies.length>=6&&b.enemies.length<=18);
  assert.equal(new Set(b.enemies.map(x=>x.id)).size,b.enemies.length);
  assert(b.enemies.every(x=>x.initial===x.count&&x.count>0&&x.pool===x.count*x.hp));
  placement(b);s.battle=b;save(s);
  output.push({race,enemyStacks:b.enemies.length,enemyTroops:b.hg410.enemyTroops});
 }
 return output;
});
test('Mine and AI castle fights also obey edge anchors without duplicating garrison',()=>{
 const result=[];
 for(const kind of ['mine','castle']){
  const s=game(),t=E.TILES.find(x=>x.kind===kind);assert(t);
  const stock=JSON.stringify(s.army),b=E.makeBattle(s,t.key);
  assert(b.enemies.length>0&&b.enemies.length<=3);
  assert.equal(b.hg410.cs,0);
  assert.equal(JSON.stringify(s.army),stock);
  placement(b);s.battle=b;save(s);
  result.push({kind,enemyStacks:b.enemies.length,playerColumn:b.allies.map(x=>x.x),enemyColumns:b.enemies.map(x=>x.x)});
 }
 return result;
});
test('Boss T11/T12/T13 spawn 16 actual aggressive stacks and large live troop counts',()=>{
 const output=[];
 for(const tier of [11,12,13]){
  const t=E.TILES.find(x=>x.eliteTier===tier&&x.kind==='npc');assert(t);
  const s=game(),b=E.makeBattle(s,t.key);
  assert.equal(b.enemies.length,16);assert.equal(b.hg410.cs,tier-3);
  assert(b.hg410.enemyTroops>E.heroLimit(1,s.heroes[0]),'Enemy cannot use player command cap');
  placement(b);s.battle=b;save(s);
  output.push({tier,cs:b.hg410.cs,stacks:b.enemies.length,troops:b.hg410.enemyTroops,range:b.enemies.map(x=>x.range).slice(0,3)});
 }
 return output;
});
test('Tower floor 10 and 91 both use one genuine 3x2 battlefield and boss row anchors',()=>{
 const output=[];
 for(const floor of [10,91]){
  const s=game();E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:8},{unitId:'human_1',count:8}]);
  E.hg20ChooseTowerTeam(s,[1]);s.hg20.tower.floor=floor;
  const entry=E.hg21TowerEnter(s);assert.equal(entry.type,'battle');
  const b=s.battle;assert(b.hg21Tower);assert(b.hg410);
  placement(b);assert.equal(b.enemies.length,floor===10?16:14);
  save(s);output.push({floor,stacks:b.enemies.length,allied:b.allies.length,enemyTroops:b.hg410.enemyTroops});
 }
 return output;
});
test('Melee is 1 hex and ranged 4/5 hexes; no first-frame cross-map arrows',()=>{
 assert.deepEqual([E.TACTICAL_RANGE.melee,E.TACTICAL_RANGE.ranged,E.TACTICAL_RANGE.eliteRanged],[1,4,5]);
 const s=game(),b=E.makeBattle(s,tile(5).key);
 for(const u of b.allies)for(const e of b.enemies)assert(E.battleHex.distance(u,e)>5);
 for(const u of E.C.units.human)assert.equal(E.unitTacticalRange(u),u.type==='Ranged'?(u.tier>=8?5:4):1);
 return {range:E.TACTICAL_RANGE,firstFrameDistance:E.battleHex.distance(b.allies[0],b.enemies[0])};
});
test('Actual five rebirth operations double command exactly at each Lv100 -> Lv1 reset',()=>{
 const s=game(),h=s.heroes[0],series=[];
 s.hg18.materials.rebirth_core=5;s.res.gold=100000;
 for(let i=1;i<=5;i++){
  h.level=100;const before=E.heroLimit(h.level,h);
  assert.equal(E.rebirthHG18Hero(s,h.id),i);
  const after=E.heroLimit(h.level,h);
  assert.equal(h.level,1);assert.equal(after,2*before);
  series.push({cs:i,command:after});
 }
 save(s);
 return series;
});
test('One troop type occupies two distinct real slots for one hero; another hero reserves the remainder',()=>{
 const s=game();s.army.human_1=120;s.heroes[0].level=100;
 const hero2=JSON.parse(JSON.stringify(s.heroes[0]));hero2.id=2;hero2.name='QA second commander';s.heroes.push(hero2);s.equipment[2]={};
 E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:20},{unitId:'human_1',count:25}]);
 E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:75}]);
 assert.equal(E.hg20HeroPlan(s,1).length,2);
 assert.equal(E.hg20Reservations(s,1).human_1,75);
 assert.throws(()=>E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:76}]),/Không đủ/);
 const b=E.makeBattle(s,tile(1).key);assert.equal(b.allies.length,2);
 assert.equal(b.allies[0].unitId,b.allies[1].unitId);
 assert.notEqual(b.allies[0].x+','+b.allies[0].y,b.allies[1].x+','+b.allies[1].y);
 placement(b);s.battle=b;save(s);
 return {slots:E.hg20HeroPlan(s,1).map(x=>x.count),reserved:75,unitsInCity:s.army.human_1};
});
test('HG44-H Tower floor 1 requires funded troop growth; defeat pays nothing and paid victory pays once',()=>{
 const s=game(),id='human_1',original=s.army[id],before=JSON.stringify({resources:s.res,materials:s.hg18.materials});
 E.hg20SetHeroPlan(s,1,[{unitId:id,count:original}]);E.hg20ChooseTowerTeam(s,[1]);
 E.hg21TowerEnter(s);
 assert.equal(s.battle.hg410.enemyStacks,10,'CS1 Tower must spawn ten genuine opponents');
 let turns=0,initial={type:'continue'};
 while(s.battle&&turns<70){initial=E.battleAct(s,'attack');turns++;}
 assert(!s.battle,'Tower battle must settle by 70 real turns');
 assert.notEqual(initial.type,'win','Unfunded 16 starter spears must not beat HG41 ten-stack Tower');
 assert.equal(s.hg20.tower.claims,0);
 assert.equal(s.hg20.tower.floor,1);
 assert.equal(s.hg20.tower.last.outcome,'lose');
 assert.equal(JSON.stringify({resources:s.res,materials:s.hg18.materials}),before,'Defeat must not mint loot');
 save(s);
 const gold=s.res.gold,extra=45;
 E.recruit(s,id,extra);
 assert(s.res.gold<gold,'Paid recruitment must debit real gold');
 const queue=s.training[0];assert(queue&&queue.count===extra);
 E.tick(s,s.lastTick+(queue.remaining+2)*1000/s.speed);
 assert.equal(s.army[id],original+extra,'Recruitment must deliver exact paid units');
 E.hg20SetHeroPlan(s,1,[{unitId:id,count:original+extra}]);
 E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 let funded={type:'continue'},fundedTurns=0;
 while(s.battle&&fundedTurns<70){funded=E.battleAct(s,'attack');fundedTurns++;}
 assert(!s.battle,'Paid Tower battle must settle');
 assert.equal(funded.type,'win',JSON.stringify({fundedTurns,outcome:funded.type,allies:original+extra,tower:s.hg20.tower.last}));
 assert.equal(s.hg20.tower.floor,2);assert.equal(s.hg20.tower.claims,1);
 assert.equal(s.hg20.tower.last?.outcome,'win');
 assert.equal(s.army[id],original+extra,'Tower projection must never debit garrison');
 save(s);
 return {initialOutcome:initial.type,unpaidTurns:turns,paidTurns:fundedTurns,
  initialSoldiers:original,paidSoldiers:extra,finalSoldiers:s.army[id],
  claims:s.hg20.tower.claims,save:s.version};
});
test('HG30 permanent conversion can be repeated after stage 3 with exact materials and real troop debit',()=>{
 const s=game(),q=E.hg30Ensure(s);q.stage=3;s.hg20.tower.floor=25;
 s.res.gold=200000;s.army.human_1=100;s.army.human_quest_guard=4;
 for(const id of ['wild','abyss','hunter','hero','tower'])s.hg29.shards[id]=1000;
 for(const id of ['marks','boss','tower'])s.hg27[id]=1000;
 const boss=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier>=11);
 assert(boss);s.hg26.enabled=true;s.hg26.phase='ready';s.hg26.config.target=boss.key;s.hg26.config.heroId=1;
 const before=s.army.human_1,sovereign=s.army.human_tower_sovereign||0;
 for(let i=0;i<2;i++)E.hg30Convert(s,'guard');
 for(let i=0;i<2;i++)E.hg30Convert(s,'sovereign');
 assert.equal(s.army.human_1,before-24);
 assert.equal(s.army.human_tower_sovereign,sovereign+2);
 assert.equal(s.hg30.stage,3);assert.equal(s.hg30.guardMade,2);assert.equal(s.hg30.sovereignMade,2);
 assert(E.hg30Recipe(s,'guard').story&&E.hg30Recipe(s,'sovereign').story);
 save(s);return {repeatGuards:s.hg30.guardMade,repeatSovereigns:s.hg30.sovereignMade,stage:s.hg30.stage};
});
test('New map preview shows troop counts and exact gain; preview never modifies game Save',()=>{
 const s=game(),before=JSON.stringify(s),boss=E.TILES.find(t=>t.privateBoss);
 const info=E.hg410EncounterPreview('npc',boss.key),reward=E.hg409Preview('npc',boss.key);
 assert.equal(info.stacks,16);assert.equal(info.cs,10);
 assert(reward.resources.gold>=800000);assert(reward.materials.gear_pack>=3);
 assert(reward.materials.rebirth_core>=1);
 assert.equal(JSON.stringify(s),before);
 return {army:info,reward:reward.materials,gold:reward.resources.gold};
});
const dir=path.join(__dirname,'docs','qa','hg410');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'engine-overhaul.json'),JSON.stringify({suite:'HG41 real-source PvE & troop ownership',tests:cases,passed:cases.filter(t=>t.pass).length,total:cases.length},null,2)+'\n');
console.log('HG41 SUMMARY '+cases.filter(t=>t.pass).length+'/'+cases.length);
