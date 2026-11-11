/* HG61 integration: real 40-unit enemy traits and HG33 original atlases. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
const names='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js art-hg33-troop-atlases.js art-hg33-additional-atlases.js painter.js'.split(' ');
for(const name of names)vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx,{filename:name});
const E=ctx.HOG_ENGINE,A=ctx.HOG_HG33_TROOP_ATLASES;const checks=[];
function test(label,fn){try{const value=fn()||{};checks.push({label,pass:true,value});console.log('HG61 PASS '+label+' '+JSON.stringify(value))}catch(e){checks.push({label,pass:false,error:String(e.stack||e)});console.error('HG61 FAIL '+label+' '+e.stack);process.exitCode=1}}
const catalog=Object.values(E.C.units).flat().map(u=>u.id);
const assertEnemy=u=>{assert(catalog.includes(u.unitId),u.id+' unbound');assert(E.HG40_TRAITS[u.unitId],u.id+' missing skill');assert(A.resolve(u.unitId,u.name),u.id+' missing atlas')};
const cold=s=>{assert(E.strictSave(s),'source Save v07 invalid');assert(E.strictSave(E.parseSave(E.serializeSave(s))),'cold Save v07 invalid')};
test('NPC 1-10 stars: troops have real sprites, ranged capability, cooldown and passive roster',()=>{
 const variants=new Set(),active=new Set(),examples=[];
 for(const lv of [1,3,5,8,10]){
  const t=E.TILES.find(t=>t.kind==='npc'&&!t.privateBoss&&t.level===lv);assert(t);
  const s=E.make('human',1e6),b=E.makeBattle(s,t.key);s.battle=b;
  assert(b.enemies.length>=6);
  assert(b.enemies.some(u=>u.range>1),'missing ranged monsters at '+lv);
  for(const u of b.enemies){assertEnemy(u);variants.add(u.unitId);if(E.HG40_TRAITS[u.unitId].cd>0)active.add(u.unitId)}
  cold(s);examples.push({lv,units:b.enemies.length,skills:b.enemies.slice(0,3).map(u=>E.HG40_TRAITS[u.unitId].name)});
 }
 assert(variants.size>=8&&active.size>=3);
 return {distinctTroopArt:variants.size,activeSkills:active.size,examples};
});
test('T11 live 16 actors retain original Boss art for leaders and canonical troop art for minions',()=>{
 const t=E.TILES.find(x=>x.kind==='npc'&&x.eliteTier===11),s=E.make('human',1e6),before=JSON.stringify(s.army);
 const b=E.makeBattle(s,t.key);s.battle=b;assert.equal(b.enemies.length,16);
 assert.deepEqual(b.enemies.slice(0,3).map(u=>u.name),['Azrael','Demonlord Samurai','Cyclop Tyrant']);
 assert(b.enemies.slice(0,3).every(u=>A.resolve(u.unitId,u.name).kind==='boss'));
 assert(b.enemies.slice(3).every(u=>A.resolve(u.unitId,u.name)?.kind!=='boss'));
 const ids=new Set();
 for(const u of b.enemies){assertEnemy(u);ids.add(u.unitId)}
 assert(ids.size>=5);
 assert.equal(JSON.stringify(s.army),before);cold(s);
 return {bossLeaders:3,actualMinions:13,uniqueTroopSkills:ids.size};
});
test('Enemy skill invokes HG40 on actual engine action and reduces player HP',()=>{
 let selected=null;
 for(const lv of [3,4,5,6,7,8,9,10]){
  const t=E.TILES.find(x=>x.kind==='npc'&&x.level===lv&&!x.privateBoss);if(!t)continue;
  const s=E.make('human',1e6),b=E.makeBattle(s,t.key);
  const caster=b.enemies.find(u=>['defdown','atkdown','dot','mark','slow','root'].includes(E.HG40_TRAITS[u.unitId]?.kind));
  if(caster){selected={s,b,caster};break}
 }
 assert(selected,'no offensive skill exists in generated encounters');
 const {s,b,caster}=selected;s.battle=b;
 const ally=b.allies[0];ally.x=1;ally.y=4;ally.atk=0;ally.hp=100000;ally.pool=ally.count*ally.hp;
 caster.x=2;caster.y=4;caster.atk=Math.max(1,caster.atk);
 assert(E.strictSave(s));
 const hp=ally.pool;const result=E.battleAct(s,'attack');
 assert(['continue','lose'].includes(result.type),result.type);
 assert(b.lastEvents.some(e=>e.actorId===caster.id&&e.targetId===ally.id&&e.damage>0));
 const proc=b.hg40.lastSkills.find(x=>x.actorId===caster.id&&x.side==='enemy');
 assert(proc,'no enemy skill proc in canonical action');
 assert(ally.pool<hp);cold(s);
 return {monster:caster.unitId,skill:proc.skill,damage:hp-ally.pool,save:7};
});
const report={passed:checks.filter(x=>x.pass).length,total:checks.length,checks};
fs.mkdirSync(path.join(__dirname,'docs/qa/hg61'),{recursive:true});fs.writeFileSync(path.join(__dirname,'docs/qa/hg61/engine.json'),JSON.stringify(report,null,2)+'\n');
console.log('HG61 '+report.passed+'/'+report.total);if(report.passed!==report.total)process.exitCode=1;
