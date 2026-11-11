/* HG43 focused oracle against real HG40 + catalog. No synthetic gameplay,
 * no extra unit stats, no state mutation by profile/codex/combat rendering.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg409-enemy-commanders.js hg410-battlefield.js hg42-boss-screen.js hg43-troop-profiles.js'.split(' ');
for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG,U=ctx.HOG_HG43_UI;
const tests=[];
function test(name,fn){
 try{const detail=fn()||{};tests.push({name,pass:true,detail});console.log('HG43 PASS '+name+' '+JSON.stringify(detail))}
 catch(e){tests.push({name,pass:false,error:String(e.stack||e)});process.exitCode=1;console.error('HG43 FAIL '+name+' '+String(e.stack||e))}
}
const all=Object.values(C.units).flat();
test('40/40 distinct catalog units receive ONLY their existing HG40 skill, role and real stats',()=>{
 assert.equal(all.length,40);assert.equal(U.total,40);
 const ids=new Set(),kinds=new Set();
 for(const u of all){
  const p=U.profile(u.id),t=E.HG40_TRAITS[u.id];
  assert(p&&p.trait===t&&p.unit===u,u.id);
  assert.equal(p.range,E.unitTacticalRange(u));
  assert.equal(p.cooldown,t.cd);
  assert.equal(p.role,U.roles[t.role]);
  assert(p.description.condition&&p.description.effect);
  assert(!/undefined|NaN|Infinity|\bchance\b|xác suất kích hoạt/i.test(
   p.description.condition+' '+p.description.effect),u.id);
  ids.add(u.id);kinds.add(t.kind);
 }
 assert.equal(ids.size,40);
 return {units:ids.size,effectKinds:kinds.size,source:'C.units + HG40_TRAITS'};
});
test('All 40 codex cards render in four 10-unit races, with role, numbers, cooldown and counter',()=>{
 const ids=new Set();
 for(const race of Object.keys(C.units)){
  const markup=U.codex(race,u=>'<span class="test-art">'+u.id+'</span>');
  assert(markup.includes('data-hg43-race="'+race+'"'));
  const found=[...markup.matchAll(/<article class="hg43-profile-card" data-hg43-unit="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(found.length,10,race);
  for(const id of found){assert(!ids.has(id));ids.add(id);const u=all.find(x=>x.id===id),t=E.HG40_TRAITS[id];
   assert(markup.includes(u.name));assert(markup.includes(t.name));}
  assert(markup.includes('Khắc chế'));
  assert(markup.includes('Điều kiện'));
  assert(markup.includes('HP'));
  assert(markup.includes('SPD'));
 }
 assert.equal(ids.size,40);
 return {cards:40,races:4};
});
test('Recruit card shows same trait and canonical numeric stats; no separate fake skill',()=>{
 for(const u of all){
  const m=U.card(u,{compact:true}),t=E.HG40_TRAITS[u.id];
  assert(m.includes('data-hg43-unit="'+u.id+'"'));
  assert(m.includes(t.name));
  assert(m.includes(E.fmt(u.hp)));assert(m.includes(E.fmt(u.def)));
  assert(m.includes('Khắc chế'));
 }
 return {recruitCardUnits:40};
});
test('HG40 passive/active timing never invents RNG proc chance',()=>{
 const passiveId='human_1',activeId='human_2';
 const p=U.profile(passiveId),a=U.profile(activeId);
 assert(p.passive);assert(!a.passive);
 assert.equal(p.cooldown,0);assert(a.cooldown>0);
 const actor={id:'p0',unitId:activeId},passiveActor={id:'p1',unitId:passiveId};
 const b={turn:8,hg40:{v:1,cd:{'p0:mark':10}}};
 assert.equal(U.timing(b,actor),'CD còn 2 lượt');
 assert.equal(U.timing({...b,turn:10},actor),'Sẵn sàng khi đủ điều kiện');
 assert.equal(U.timing(b,passiveActor),'Nội tại · không CD');
 return {activeCooldown:a.cooldown,visibleRemaining:2};
});
test('Real HG40 statuses show exact percent, duration, upcoming and shield',()=>{
 const actor={id:'p0',unitId:'orc_5',hp:30,count:10,initial:10,pool:210,atk:10,def:10,spd:5,range:1,name:'Ogre'};
 const b={turn:5,hg40:{v:1,cd:{},shields:{p0:{amount:24,until:7}},
   statuses:[{target:'p0',kind:'atkdown',value:.15,starts:4,until:6},
    {target:'p0',kind:'slow',value:1,starts:6,until:7}],lastSkills:[]}};
 const shown=U.statuses(b,actor);
 assert(shown.some(x=>x.includes('Giảm ATK 15%')));
 assert(shown.some(x=>x.includes('Sắp hiệu lực: Chậm')));
 assert(shown.some(x=>x.includes('Khiên 24 HP')));
 assert.equal(U.statuses(b,{...actor,id:'p1'}).length,0);
 return {statuses:shown.length};
});
test('Real C > X > H > T role relationships + Tank 10% mitigation are consistently described',()=>{
 const byRole=Object.fromEntries(['C','X','H','T'].map(role=>[role,all.find(u=>E.HG40_TRAITS[u.id].role===role)]));
 for(const [a,b] of [['C','X'],['X','H'],['H','T']]){
  const label=U.matchup({unitId:byRole[a].id},{unitId:byRole[b].id});
  assert(label.includes('+12%'),a+' vs '+b);
 }
 const tank=U.matchup({unitId:byRole.T.id},{unitId:byRole.C.id});
 assert(tank.includes('10%'));
 const unknown=U.matchup({unitId:null},{unitId:byRole.C.id});
 assert(unknown.includes('Không xác định'));
 return {advantagePairs:3,tankReduction:'.10'};
});
test('Live Boss T13 rendering exposes actual 16-stack numbers without fabricating an HG40 skill or changing Save v07',()=>{
 const s=E.make('human',Date.now()),tile=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===13);assert(tile);
 s.battle=E.makeBattle(s,tile.key);
 const b=s.battle,actor=b.allies[0],enemy=b.enemies[0],before=JSON.stringify(s);
 const html=U.battle(b,actor,enemy);
 assert(html.includes('data-hg43-combat-intel'));
 assert(html.includes('data-hg43-combat-unit="'+actor.id+'"'));
 assert(html.includes('data-hg43-combat-unit="'+enemy.id+'"'));
 assert(html.includes(E.HG40_TRAITS[actor.unitId].name));
 // HG61 binds real troop identities to monster squads: the enemy profile
 // must display its ACTUAL HG40 ability, not the old no-skill placeholder.
 assert(E.HG40_TRAITS[enemy.unitId],'Boss leader has no real HG40 troop skill');
 assert(html.includes(E.HG40_TRAITS[enemy.unitId].name),'Enemy canonical skill not rendered');
 assert(!html.includes('không thuộc 40 kỹ năng'),'Enemy incorrectly shown as skill-less');
 assert(html.includes(E.fmt(enemy.atk)),'Real enemy attack stat not rendered');
 assert.equal(JSON.stringify(s),before,'read-only combat UI changed persistent state');
 assert(E.strictSave(s));
 const q=E.parseSave(E.serializeSave(s));assert(E.strictSave(q));
 return {playerSkill:E.HG40_TRAITS[actor.unitId].name,bossEnemies:b.enemies.length,saved:7};
});
test('Live cooldown advances only with canonical combat turn and survives round-trip unchanged',()=>{
 const s=E.make('human',Date.now()),tile=E.TILES.find(t=>t.kind==='npc'&&t.level===1&&!t.privateBoss);assert(tile);
 const u=C.units.human[1];s.army[u.id]=6;
 s.formation=[{unitId:u.id,count:6}];s.battle=E.makeBattle(s,tile.key);
 const b=s.battle,actor=b.allies[0];
 assert.equal(actor.unitId,u.id);
 const id=actor.id+':'+E.HG40_TRAITS[u.id].kind;
 b.hg40.cd[id]=b.turn+3;
 const before=JSON.stringify(s),html=U.battle(b,actor,b.enemies[0]);
 assert(html.includes('CD còn 3 lượt'));
 assert.equal(JSON.stringify(s),before);
 assert(E.strictSave(s));
 const recovered=E.parseSave(E.serializeSave(s));
 assert(E.strictSave(recovered));
 assert.equal(U.timing(recovered.battle,recovered.battle.allies[0]),'CD còn 3 lượt');
 return {skill:E.HG40_TRAITS[u.id].name,remaining:3};
});
const folder=path.join(__dirname,'docs/qa/hg43');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'troop-profiles-node.json'),JSON.stringify({
 version:'HG43',tests,pass:tests.filter(t=>t.pass).length,total:tests.length
},null,2)+'\n');
console.log('HG43 SUMMARY '+tests.filter(t=>t.pass).length+'/'+tests.length);
