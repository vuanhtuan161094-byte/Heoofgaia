/* HG70: real reward-only troops get exclusive auto skills (not extra recruitables).
 * Uses original combat core and authentic status/DoT/shield/casualty receipts.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js'.split(' ');
const ctx=vm.createContext({console});for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
const E=ctx.HOG_ENGINE,source=E.NPC_CAMPS_2009.find(x=>x.level===1)||E.NPC_CAMPS_2009[0];
const SKILLS=E.HG40_REWARD_TRAITS;
let total=0;
function check(name,fn){try{const result=fn();total++;console.log('HG70 PASS '+name+' '+JSON.stringify(result||{}))}
 catch(e){console.error('HG70 FAIL '+name+' '+String(e.stack||e));process.exitCode=1}}
check('original forty traits unchanged; exactly eight exclusive skills exist',()=>{
 assert.equal(Object.keys(E.HG40_TRAITS).length,40);assert.equal(Object.keys(SKILLS).length,8);
 for(const [id,t] of Object.entries(SKILLS)){
  const race=id.split('_')[0],u=E.C.rewardUnits[race].find(x=>x.id===id);
  assert(u&&u.rewardOnly&&!E.C.units[race].some(x=>x.id===id),id);
  assert(t.name&&t.cd>=2&&t.cd<=4&&t.rewardOnly);assert.equal(E.hg40TraitForUnit(id),t);
 }
 return {original:40,reward:8};
});
function battle(race,id){
 const s=E.make(race,1000000),u=E.getUnit(s,id);
 assert(u&&u.rewardOnly);
 s.army[id]=3;
 const ally={id:'p0',unitId:id,name:u.name,side:'player',heroId:s.activeHero,
  hp:u.hp,atk:u.atk,def:u.def,spd:u.spd,range:E.unitTacticalRange(u),
  count:3,initial:3,pool:u.hp*3,slot:0,x:1,y:4};
 const target=(id,x,y)=>({id,unitId:null,name:'QA live opponent',side:'enemy',hp:100000,
  atk:0,def:30,spd:1,range:1,count:100,initial:100,pool:10000000,x,y});
 const b={target:source.key,kind:'npc',level:1,name:'HG70 combat QA',turn:1,order:'attack',
  orders:{},focused:null,selected:'p0',autoUntil:10000000,allies:[ally],
  enemies:[target('e0',2,4),target('e1',3,4)],woundedByUnit:{},history:[],moveTargets:{}};
 E.hg40PrepareBattle(s,b);s.battle=b;
 return {s,b,ally};
}
for(const race of ['human','elf','orc','undead'])for(const kind of ['quest_guard','tower_sovereign']){
 const id=race+'_'+kind;
 check(id+' hits real HP and activates unique named auto skill with turn cooldown',()=>{
  const {s,b,ally}=battle(race,id),t=SKILLS[id];
  const before=b.enemies.reduce((n,u)=>n+u.pool,0),original=s.army[id];
  const receipt=E.battleActCore(s,'attack');
  const after=b.enemies.reduce((n,u)=>n+u.pool,0);
  assert.equal(receipt.type,'continue');assert(after<before);assert.equal(s.army[id],original);
  const names=b.hg40.lastSkills.filter(x=>x.skill===t.name);
  assert(names.length>0,'exclusive skill failed to activate');
  const ready=E.hg40SkillReadiness(b,ally);
  assert.equal(ready.name,t.name);assert(ready.cooldown>0,'cooldown should be turn based');
  const ui=E.hg40SkillText(b,ally);assert(ui.includes(t.name)&&ui.includes('CD'));
  for(let n=0;n<3;n++){E.battleActCore(s,'attack');assert.equal(s.army[id],original);}
  assert(b.hg40.lastSkills.some(x=>x.skill===t.name),'missing VFX label');
  if(t.sovereign)assert(b.hg40.events.some(x=>x.skill===t.name)||b.hg40.lastSkills.length>0);
  return {skill:t.name,cd:t.cd,firstDamage:before-after,turn:b.turn,v07:s.version};
 });
}
check('special effects work without MP and don't mint reward-only troops',()=>{
 const {s,b,ally}=battle('elf','elf_tower_sovereign');
 ally.mp=0;const stock=s.army.elf_tower_sovereign;
 const hit=E.battleActCore(s,'attack');
 assert.equal(hit.type,'continue');assert.equal(s.army.elf_tower_sovereign,stock);
 assert(b.hg40.lastSkills.some(x=>x.skill==='Ngân Nguyệt Vạn Tiễn'));
 return {mp:0,skill:'Ngân Nguyệt Vạn Tiễn',stock};
});
console.log('HG70 reward-only combat tests:',total,'tests; exitCode',process.exitCode||0);
