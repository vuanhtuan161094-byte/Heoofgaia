/* HG40.1 controlled PvE balance experiment. 160 actual tactical battle outcomes.
 * Synthetic hero levels and legal-sized armies compare faction/tier matchups;
 * these fixtures DO NOT represent organic unlocks, paid unit production or loot.
 * No RNG, no injected victory, all outcomes come from the shared engine loop.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const context=vm.createContext({console});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js'.split(' ');
for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),context,{filename:f});
const E=context.HOG_ENGINE,C=context.HOG_CATALOG;
const groups=[],matches=[];
for(const race of ['human','elf','orc','undead']){
 for(const tier of [1,4,7,10]){
  // The historical NPC camp catalogue ends below ten stars. For the T10
  // progression checkpoint use an actual private world Boss (elite T13),
  // never invent a nonexistent 10-star NPC camp.
  const npc=tier===10?E.TILES.find(x=>x.kind==='npc'&&x.privateBoss):
   E.NPC_CAMPS_2009.find(x=>x.stars===tier);
  assert(npc,'No genuine PvE target for progression tier '+tier);
  const outputs=[];
  for(let variant=1;variant<=10;variant++){
   const s=E.make(race,1000000);
   const unit=C.units[race][tier-1];
   const lvl=Math.min(100,Math.max(1,tier*10));
   s.heroes[0].level=lvl;
   const limit=E.heroLimit(lvl),capacity=Math.floor(limit/E.unitValue(unit));
   const count=Math.max(1,Math.floor(capacity*(.10+.09*variant)));
   assert(count<=capacity&&count>=1);
   s.army[unit.id]=count;E.setFormation(s,[{unitId:unit.id,count}]);
   s.battle=E.makeBattle(s,npc.key);
   assert(s.battle?.hg40?.v===1,'HG40 absent '+race+'/'+tier);
   const beforeEnemies=s.battle.enemies.map(u=>({hp:u.hp,atk:u.atk,def:u.def}));
   let turns=0,outcome=null,dealt=0,lost=0;
   // HG40.2: real battle skill notes and damage receipts, not synthetic triggers.
   // Unnoted defensive passives are NOT counted as inactive skills.
   let skillNotes=0,directDamage=0,secondaryDamage=0,dotDamage=0;
   const skillNotesByName={};
   while(s.battle&&turns<72){
    const liveBattle=s.battle,resolvedTurn=liveBattle.turn;
    const result=E.battleActCore(s,'attack',{stableTargets:true});
    for(const note of (liveBattle.hg40?.lastSkills||[]).filter(x=>x.turn===resolvedTurn)){
     skillNotes++;skillNotesByName[note.skill]=(skillNotesByName[note.skill]||0)+1;
    }
    directDamage+=liveBattle.lastEvents.filter(e=>e.actorId.startsWith('p'))
     .reduce((sum,e)=>sum+(e.damage||0),0);
    for(const e of (liveBattle.hg40?.events||[])){
     if(e.order==='skill'&&e.actorId.startsWith('p'))secondaryDamage+=e.damage||0;
     if(e.order==='dot'&&e.targetId.startsWith('e'))dotDamage+=e.damage||0;
    }
    turns++;dealt+=result.dealt||0;lost+=result.lost||0;
    assert(Number.isFinite(dealt)&&Number.isFinite(lost)&&dealt>=0&&lost>=0);
    if(result.type!=='continue')outcome=result.type;
   }
   assert(outcome&&['win','lose','timeout'].includes(outcome),race+'/'+tier+' did not resolve');
   const remain=s.army[unit.id]||0;
   assert(Number.isSafeInteger(remain)&&remain>=0&&remain<=count,
    'Soldiers must never be minted by tactical skills');
   assert(turns>=1&&turns<=70,'Battle must honor 70-turn limit');
   assert.equal(directDamage+secondaryDamage+dotDamage,dealt,
    'Damage receipt components must reconcile with shared engine total');
   const row={race,tier,encounter:tier===10?'private-world-boss-T13':'NPC-'+tier+'star',
    variant,heroLevel:lvl,unitId:unit.id,
    troops:count,remaining:remain,turns,outcome,dealt,lost,
    skillNotes,skillNotesByName,directDamage,secondaryDamage,dotDamage,
    enemies:beforeEnemies};
   outputs.push(row);matches.push(row);
  }
  const rate=outputs.filter(o=>o.outcome==='win').length;
  const average=key=>+(outputs.reduce((sum,o)=>sum+o[key],0)/outputs.length).toFixed(2);
  const skillNoteTotals={};
  for(const row of outputs)for(const [name,count] of Object.entries(row.skillNotesByName))
   skillNoteTotals[name]=(skillNoteTotals[name]||0)+count;
  groups.push({race,tier,wins:rate,losses:outputs.filter(o=>o.outcome==='lose').length,
   timeouts:outputs.filter(o=>o.outcome==='timeout').length,
   winRatePct:rate*10,avgTurns:average('turns'),
   avgLossPct:+(outputs.reduce((sum,o)=>sum+100*(o.troops-o.remaining)/o.troops,0)/outputs.length).toFixed(2),
   avgDamage:average('dealt'),avgReceived:average('lost'),
   avgSkillNotes:average('skillNotes'),skillNoteTotals,
   avgDirectDamage:average('directDamage'),
   avgSecondaryDamage:average('secondaryDamage'),avgDotDamage:average('dotDamage')});
 }
}
assert.equal(matches.length,160);
assert(groups.length===16&&groups.every(g=>g.wins+g.losses+g.timeouts===10));
const report={status:'PASS',count:matches.length,kind:'controlled-synthetic-tactical',
 evidence:'Engine battleActCore resolves every trial; no forced wins or fabricated damage',
 saveVersion:E.V,stages:[1,4,7,10],lateStageEncounter:'T10 army versus real private-world Boss T13',
 telemetryScope:'Skill notes record real triggers only; unnoted defensive passives and 24 unselected unit tiers are not measured',
 groups,matches};
const dest=path.join(__dirname,'docs/qa/hg40');
fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'balance-controlled-160.json'),JSON.stringify(report,null,2)+'\n');
for(const g of groups)console.log('HG40 BALANCE '+g.race+' T'+g.tier+
 ' W'+g.wins+'/10 avgTurns='+g.avgTurns+' loss%='+g.avgLossPct);
console.log('HG40 controlled real combat outcomes 160/160 PASS (balance thresholds require owner review)');
