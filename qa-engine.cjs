/* Independent HG-08 regression suite. Run: node qa-engine.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ctx=vm.createContext({console});
const dir=__dirname;
for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js']) vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE, C=ctx.HOG_CATALOG;
let pass=0,failed=0;
function test(name,fn){try{fn();pass++;console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+': '+e.message)}}
function state(race='human'){return E.make(race,1_000_000)}
function expensive(s){for(const k of C.keys) s.res[k]=Math.min(E.limits(s)[k],1e6);return s}
function throws(fn,re){assert.throws(fn,re)}
const v2=['gold','wood','ore','sulfur','crystal'];
test('version and isolated key',()=>{assert.equal(E.V,7);assert.equal(E.SAVE_KEY,'heoofgaia_hg_only_v07')});
test('4 races and 40 unique troops',()=>{assert.deepEqual(Object.keys(C.units).sort(),['elf','human','orc','undead']);assert.equal(Object.values(C.units).flat().length,40);assert.equal(new Set(Object.values(C.units).flat().map(x=>x.id)).size,40)});
test('HG08 evidence matrix has one row for every catalog troop',()=>{const matrix=fs.readFileSync(path.join(dir,'docs/research/HG08-TROOP-UNLOCK-MATRIX.md'),'utf8').match(/^\| (?:Human|Elf|Orc|Undead) \| \d+ \|/gm)||[];assert.equal(matrix.length,40)});
test('5 original resources',()=>assert.deepEqual([...C.keys],v2));
test('troop point formula',()=>{const u=C.units.human[0];assert.equal(E.unitValue(u),u.cost.gold+5*(u.cost.wood+u.cost.ore)+10*(u.cost.sulfur+u.cost.crystal))});
test('new game all races valid',()=>{for(const race of Object.keys(C.races)){const s=state(race);assert.equal(s.version,7);assert.equal(s.race,race);assert.equal(E.strictSave(s),true)}});
test('candidate slots at recorded level gates',()=>{assert.equal(E.tavernSlots(1),2);assert.equal(E.tavernSlots(2),3);assert.equal(E.tavernSlots(4),4);assert.equal(E.tavernSlots(9),7);assert.equal(E.tavernSlots(10),8)});
test('candidate hire exactly once',()=>{const s=state(),before=s.tavern.offers.length,id=s.tavern.offers[0].id;E.hireCandidate(s,id);assert.equal(s.tavern.offers.length,before-1);assert.equal(s.heroes.length,2);throws(()=>E.hireCandidate(s,id),/Ứng viên/)});
test('hire rejects insufficient gold without removing offer',()=>{const s=state(),offer=s.tavern.offers[0];s.res.gold=0;throws(()=>E.hireCandidate(s,offer.id),/Không đủ/);assert.equal(s.tavern.offers[0].id,offer.id)});
test('tavern hourly refresh',()=>{const s=state();E.tick(s,s.lastTick+61000);assert.equal(s.tavern.round,1);assert.equal(s.tavern.remaining,3540)});
test('tavern multi-hour refresh catchup',()=>{const s=state();s.speed=1;E.tick(s,s.lastTick+3*3600*1000+120*1000);assert.equal(s.tavern.round,3);assert.equal(s.tavern.remaining,3480)});
test('tavern empty offers preserved across save',()=>{const s=state();s.tavern.offers=[];const z=E.parseSave(E.serializeSave(s));assert.equal(z.tavern.offers.length,0)});
test('resource basic positive and capped',()=>{const s=state();E.tick(s,s.lastTick+1e7);for(const k of C.keys)assert(s.res[k]<=E.limits(s)[k]+.00001)});
test('AP exactly once at same wall time',()=>{const s=state();s.ap=0;s.speed=1;const t=s.lastTick+3600*1000;E.tick(s,t);let a=s.ap;E.tick(s,t);assert.equal(s.ap,a);assert(a>=9.99&&a<=10.01)});
test('Market and Bazaar can be built as queue',()=>{for(const key of ['market','bazaar']){const s=expensive(state());E.upgrade(s,key);assert.equal(s.buildingQueue.key,key);assert.equal(s.buildings[key],0);E.tick(s,s.lastTick+s.buildingQueue.remaining/60*1000+1000);assert.equal(s.buildings[key],1)}});
test('no second construction until finished',()=>{const s=state();E.upgrade(s,'hall');throws(()=>E.upgrade(s,'market'),/hàng đợi/)});
test('construction once, no duplication',()=>{const s=state();E.upgrade(s,'hall');const b=s.buildingQueue.remaining;const now=s.lastTick+b/60*1000+1200;E.tick(s,now);assert.equal(s.buildings.hall,2);const res=JSON.stringify(s.res);E.tick(s,now);assert.equal(JSON.stringify(s.res),res)});
test('Castellan INT adds gold output',()=>{const s=state();const base=E.rate(s).gold;s.heroes[0].int=40;E.appoint(s,1);assert(E.rate(s).gold>base)});
test('hero equipment influences combat stats',()=>{const s=state();const item=E.addItem(s,'copper_blade','qa');E.equipItem(s,item.uid);assert(E.heroStats(s).atk>s.heroes[0].atk)});
test('market cannot sell without building',()=>{const s=state();throws(()=>E.sell(s,'wood',1),/Market/)});
test('market sell after build and gold capacity',()=>{const s=state();s.buildings.market=1;const before=s.res.gold;const wood=s.res.wood;E.sell(s,'wood',10);assert.equal(s.res.wood,wood-10);assert.equal(s.res.gold,before+20)});
test('bazaar buys real inventory',()=>{const s=state();s.buildings.bazaar=1;const old=s.inventory.length;E.buyItem(s,'copper_blade');assert.equal(s.inventory.length,old+1)});
test('seven-slot formation supports duplicate unit types',()=>{const s=state();E.setFormation(s,[{unitId:'human_1',count:5},{unitId:'human_1',count:7}]);assert.equal(s.formation.length,2);assert.equal(E.troopValue(s),12*E.unitValue(E.getUnit(s,'human_1')))});
test('cannot assign beyond available army',()=>{const s=state();throws(()=>E.setFormation(s,[{unitId:'human_1',count:17}]),/vượt/)});
test('march AP deduction and battle opening',()=>{const s=state();const t=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));assert(t);E.startMarch(s,t.key);assert.equal(s.ap,94);const end=s.lastTick+s.march.remaining/60*1000+1200;E.tick(s,end);assert(s.battle);assert.equal(s.march,null);assert.equal(s.battle.allies.length,1)});
test('battle manual retreat keeps losses',()=>{const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);assert.equal(E.battleAct(s,'retreat').type,'retreat');assert.equal(s.battle,null)});
test('valid native v07 export/import',()=>{const s=state();const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(loaded.res.gold,s.res.gold)});
test('v05 migration without mutating input',()=>{const s=state();const legacy=JSON.parse(JSON.stringify(s));delete legacy.tavern;legacy.version=5;const raw=JSON.stringify(legacy);const migrated=E.parseSave(raw);assert.equal(migrated.version,7);assert(migrated.tavern.offers.length>0);assert.equal(JSON.stringify(legacy),raw)});
test('tampered save rejected',()=>{const s=state();s.res.gold=-1;throws(()=>E.parseSave(JSON.stringify(s)),/không hợp lệ/)});
test('invalid candidate ids rejected',()=>{const s=state();s.tavern.offers[1].id=s.tavern.offers[0].id;assert.equal(E.strictSave(s),false)});
test('no direct import of unknown save version',()=>throws(()=>E.parseSave('{"version":999}'),/hỗ trợ|không hợp lệ/));
test('pathfinding returns adjacent valid tiles',()=>{for(const tile of E.TILES.filter(t=>['mine','npc'].includes(t.kind))){const p=E.pathfind('3,4',tile.key);if(!p)continue;for(let i=1;i<p.length;i++){const [x,y]=p[i-1].split(',').map(Number),[a,b]=p[i].split(',').map(Number);assert.equal(Math.abs(x-a)+Math.abs(y-b),1)}}});

test('HG07 source table has exact base levels',()=>{assert.equal(E.HG07_BASE_LIMITS.length,100);for(const [lv,limit] of [[1,11500],[10,40000],[20,194482],[30,554166],[50,1620833],[100,4062500]])assert.equal(E.heroLimit(lv),limit)});
test('HG07 formation at limit allowed, excess atomic reject',()=>{const s=state();s.army.human_1=150;E.setFormation(s,[{unitId:'human_1',count:92}]);assert.equal(E.troopValue(s),11500);const old=JSON.stringify(s.formation);throws(()=>E.setFormation(s,[{unitId:'human_1',count:93}]),/giới hạn chỉ huy/);assert.equal(JSON.stringify(s.formation),old)});
test('HG07 respects hero level after switching commander',()=>{const s=state();s.army.human_1=250;s.heroes.push({id:2,name:'Veteran',level:5,xp:0,atk:10,def:10,spd:10,int:10});E.selectHero(s,2);E.setFormation(s,[{unitId:'human_1',count:120}]);assert.equal(E.checkCapacity(s,s.formation).limit,23333);E.selectHero(s,1);throws(()=>E.checkCapacity(s,s.formation),/giới hạn chỉ huy/)});
test('HG08 migrates over-cap v07 formation and still blocks march',()=>{const s=state(),t=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));s.army.human_1=120;s.formation=[{unitId:'human_1',count:120}];const restored=E.parseSave(E.serializeSave(s)),before=restored.ap;assert.equal(restored.version,7);throws(()=>E.startMarch(restored,t.key),/giới hạn chỉ huy/);assert.equal(restored.ap,before);assert.equal(restored.march,null)});
test('HG07 no-formation auto selection checks cap before AP',()=>{const s=state(),t=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));s.army.human_1=200;const before=s.ap;throws(()=>E.startMarch(s,t.key),/giới hạn chỉ huy/);assert.equal(s.ap,before)});
test('HG07 rejects invalid levels, no automatic bonus',()=>{for(const level of [0,101,1.5,NaN])throws(()=>E.heroLimit(level),/1–100/);assert.equal(E.heroLimit(1),11500)});


test('HG08 gates every troop row and labels unresolved faction rows',()=>{
 const all=Object.values(C.units).flat();assert.equal(all.length,40);
 for(const race of Object.keys(C.races)){const s=state(race);for(const k of Object.keys(s.buildings))s.buildings[k]=10;s.spells.bootcamp=10;s.spells.manufacturing=10;s.spells.scouting=10;
  for(const u of C.units[race])assert.equal(E.troopPrerequisites(s,u).available,true,u.id);
  const fresh=state(race);fresh.buildings.hall=1;fresh.buildings.barracks=1;
  for(const u of C.units[race].filter(u=>u.tier>1))assert.equal(E.troopPrerequisites(fresh,u).available,false,u.id);
 }
 assert.equal(E.troopPrerequisites(state('elf'),C.units.elf[9]).status,'PARTIAL');
 assert.equal(E.troopPrerequisites(state('human'),C.units.human[9]).status,'OBSERVED');
});
test('Human tier 3 requirements use Hall, Barracks and the canonical Bootcamp spell level',()=>{
 const s=state();s.buildings.hall=3;s.buildings.barracks=3;
 assert.equal(E.troopPrerequisites(s,C.units.human[2]).available,false);s.spells.bootcamp=1;
 assert.equal(E.troopPrerequisites(s,C.units.human[2]).available,true);
});
test('Human T4/T5 support buildings and Manufacturing gates are enforced atomically',()=>{
 const s=state();s.buildings.hall=4;s.buildings.barracks=4;s.res.gold=5000;const before=JSON.stringify({res:s.res,queue:s.training});
 throws(()=>E.recruit(s,'human_4',1),/Blacksmith/);assert.equal(JSON.stringify({res:s.res,queue:s.training}),before);
 s.buildings.blacksmith=1;throws(()=>E.recruit(s,'human_4',1),/Manufacturing/);s.spells.manufacturing=1;
 assert.equal(E.recruit(s,'human_4',1).gold,Math.ceil(C.units.human[3].cost.gold*.98));
 const t=state();t.buildings.hall=5;t.buildings.barracks=5;t.spells.manufacturing=3;
 assert.equal(E.troopPrerequisites(t,C.units.human[4]).available,false);t.buildings.stables=1;assert.equal(E.troopPrerequisites(t,C.units.human[4]).available,true);
});
test('Bootcamp research uses one canonical spell queue and completes exactly once',()=>{
 const s=state();for(const k of C.keys)s.res[k]=Math.min(E.limits(s)[k],100000);const before=s.res.gold;
 E.researchTechnology(s,'training');const queued=s.researchQueue;assert(queued);assert.equal(queued.key,'bootcamp');assert.equal(s.spells.bootcamp||0,0);assert(!('technologies' in s));assert(s.res.gold<before);
 const end=s.lastTick+queued.remaining/s.speed*1000+1000;E.tick(s,end);assert.equal(s.spells.bootcamp,1);assert.equal(s.researchQueue,null);
 const res=JSON.stringify(s.res);E.tick(s,end);assert.equal(JSON.stringify(s.res),res);
});
test('Technology rejection does not spend resources or mutate research queue',()=>{
 const s=state();s.spells.bootcamp=1;const before=JSON.stringify(s.res);throws(()=>E.researchTechnology(s,'training'),/Magic Tower/);assert.equal(JSON.stringify(s.res),before);assert.equal(s.researchQueue,null);
});
test('Castellan gains unit-value/3 experience only when training completes',()=>{
 const s=state();E.appoint(s,1);E.recruit(s,'human_1',3);assert.equal(s.heroes[0].xp,0);const end=s.lastTick+s.training[0].remaining/s.speed*1000+1000;E.tick(s,end);assert.equal(s.army.human_1,19);assert.equal(s.heroes[0].xp,125);E.tick(s,end);assert.equal(s.heroes[0].xp,125);
});
test('Hero XP exact early thresholds, point award and allocation',()=>{
 const s=state(),h=s.heroes[0];E.grantHeroExperience(s,h.id,149,'test');assert.equal(h.level,1);assert.equal(h.xp,149);E.grantHeroExperience(s,h.id,1,'test');assert.equal(h.level,2);assert.equal(h.xp,0);assert.equal(h.statPoints,1);assert.equal(E.heroLimit(h.level),13333);
 const atk=h.atk;E.allocateHeroPoint(s,h.id,'atk');assert.equal(h.atk,atk+1);assert.equal(h.statPoints,0);throws(()=>E.allocateHeroPoint(s,h.id,'atk'),/chưa có điểm/);
});
test('Hero XP level 20 formula and level 100 cap',()=>{
 const s=state(),h=s.heroes[0];h.level=19;h.xp=9967;E.grantHeroExperience(s,h.id,1,'test');assert.equal(h.level,20);assert.equal(E.experienceToNext(20),12000);assert.equal(E.experienceToNext(99),120*(99*99-300));assert.equal(E.experienceToNext(100),null);h.level=100;h.xp=7;E.grantHeroExperience(s,h.id,999,'test');assert.equal(h.xp,7);
});
test('v06 migration preserves hero progress and does not award old levels',()=>{
 const s=state(),legacy=JSON.parse(JSON.stringify(s));legacy.version=6;legacy.heroes[0].level=3;legacy.heroes[0].xp=200;legacy.heroes[0].atk=19;legacy.spells.manufacturing=4;delete legacy.technologies;delete legacy.researchQueue;delete legacy.buildings.blacksmith;for(const h of legacy.heroes){delete h.statPoints;delete h.spentAttributePoints;}
 const raw=JSON.stringify(legacy),m=E.parseSave(raw);assert.equal(JSON.stringify(legacy),raw);assert.equal(m.version,7);assert.equal(m.heroes[0].level,3);assert.equal(m.heroes[0].xp,200);assert.equal(m.heroes[0].atk,19);assert.equal(m.heroes[0].statPoints,0);assert.equal(m.technologies,undefined);assert.equal(m.spells.manufacturing,4);
});
test('Manufacturing legacy spell level remains recognized by requirements and discounts',()=>{
 const s=state();s.buildings.hall=4;s.buildings.barracks=4;s.buildings.blacksmith=1;s.spells.manufacturing=1;
 assert.equal(E.troopPrerequisites(s,C.units.human[3]).available,true);assert.equal(E.recruitCost(s,C.units.human[3],1).gold,Math.ceil(C.units.human[3].cost.gold*.98));
});
test('Bootcamp and Manufacturing apply the documented two-percent per level to recruitment',()=>{
 const s=state();const u=C.units.human[0];s.spells.bootcamp=1;assert.equal(E.recruit(s,u.id,1).gold,u.cost.gold);assert.equal(s.training[0].total,Math.ceil(u.timeSec*.98));
 s.spells.manufacturing=10;assert.equal(E.recruitCost(s,u,1).gold,Math.ceil(u.cost.gold*.8));
});
test('Hero allocation blocked during march or battle',()=>{
 const s=state();s.heroes[0].statPoints=1;s.march={target:'5,6',remaining:2};throws(()=>E.allocateHeroPoint(s,1,'def'),/đang hành quân/);assert.equal(s.heroes[0].statPoints,1);
});
test('Invalid HG08 research queue rejected by save validator',()=>{const s=state();s.researchQueue={id:1,key:'training',level:2,total:100,remaining:50};assert.equal(E.strictSave(s),false)});


test('Faction-specific source buildings are buildable only in their race build list',()=>{
 const maps={human:['stables','blacksmith'],elf:['magicPool','natureTower'],orc:['beastPen','blacksmith'],undead:['darkHall','soulTower']};
 for(const [race,buildings] of Object.entries(maps)){const s=state(race),order=E.cityBuildOrder(s);for(const b of buildings)assert(order.includes(b),race+':'+b);for(const other of Object.values(maps).flat())if(!buildings.includes(other)&&!(race==='orc'&&other==='blacksmith'))assert(!order.includes(other),race+' leaked '+other);for(const k of C.keys)s.res[k]=Math.min(E.limits(s)[k],100000);E.upgrade(s,buildings[0]);assert.equal(s.buildingQueue.key,buildings[0]);}
});
test('Tavern name/stat colors follow documented hero-value thresholds',()=>{
 assert.equal(E.heroNameColor({atk:40,def:40,spd:30,int:15,level:1}),'white');
 assert.equal(E.heroNameColor({atk:40,def:40,spd:30,int:16,level:1}),'blue');
 assert.equal(E.heroNameColor({atk:40,def:40,spd:40,int:41,level:1}),'yellow');
 assert.equal(E.heroNameColor({atk:50,def:50,spd:40,int:41,level:1}),'green');
 assert.equal(E.heroNameColor({atk:71,def:50,spd:40,int:40,level:1}),'purple');
 assert.deepEqual(['white','blue','yellow','green','purple'].map((_,i)=>E.heroStatColor([40,41,51,61,71][i])),['white','blue','yellow','green','purple']);
});
test('Tavern level 10 refresh creates eight source-band heroes and persisted derived colors',()=>{
 const s=state();s.buildings.tavern=10;E.refreshTavern(s);assert.equal(s.tavern.offers.length,8);
 for(const h of s.tavern.offers){assert(h.atk>=20&&h.atk<=50&&h.def>=20&&h.def<=50&&h.spd>=20&&h.spd<=50&&h.int>=20&&h.int<=50);assert.equal(h.quality,E.heroNameColor(h));assert.equal(h.heroValue,h.atk+h.def+h.spd+h.int-h.level+1);assert.equal(E.strictSave(s),true);}
 const restored=E.parseSave(E.serializeSave(s));assert.equal(restored.tavern.offers[0].quality,E.heroNameColor(restored.tavern.offers[0]));
});
test('Automatic hourly Tavern refresh applies the current Tavern level model',()=>{
 const s=state();s.buildings.tavern=10;s.speed=1;const end=s.lastTick+3600*1000;E.tick(s,end);assert.equal(s.tavern.round,1);assert.equal(s.tavern.offers.length,8);assert(s.tavern.offers.every(h=>h.atk>=20&&h.atk<=50));
});

console.log(`TOTAL ${pass}/${pass+failed} PASS`);process.exitCode=failed?1:0;
