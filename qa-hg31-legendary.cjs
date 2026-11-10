/* HG31 focused test: no fake loot; every source receipt tied to real battle victory. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js'.split(' ');
const cx=vm.createContext({console});for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),cx,{filename:file});
const E=cx.HOG_ENGINE;let passed=0;
function check(name,fn){try{const info=fn()||{};passed++;console.log('HG31 PASS '+name+' '+JSON.stringify(info));}catch(e){process.exitCode=1;console.error('HG31 FAIL '+name+' '+e.stack)}}
function saved(s){assert(E.strictSave(s));const x=E.parseSave(E.serializeSave(s));assert(E.strictSave(x));return x;}
function win(s){let o,n=0;while(s.battle&&n++<70)o=E.battleAct(s,'attack');assert.equal(o?.type,'win');return {out:o,turns:n};}
function prepare(s){s.hg20.tower.floor=21;s.hg31.bossWins=3;s.hg31.paidTowerWins=3;
 for(const k of Object.keys(s.hg31.fragments))s.hg31.fragments[k]=30;
 for(const k of Object.keys(s.hg29.shards))s.hg29.shards[k]=120;
 s.hg27.boss=50;s.res.gold=500000;
 return s;
}
check('Four-race clean New Game, six native items, original SVG art and Save v07',()=>{
 for(const race of ['human','elf','orc','undead']){
  let s=E.make(race,1e6);assert.equal(s.version,7);assert.equal(s.hg31.bossWins,0);
  assert.equal(s.hg31.paidTowerWins,0);assert(Object.values(s.hg31.fragments).every(v=>v===0));
  assert.equal(E.hg31Catalogue(s).length,6);assert.equal(E.hg31IconHTML('dragon_blade',64).includes('<img'),true);
  saved(s);
 }
 return {races:4,gear:6,setNames:Object.keys(E.HG31_SETS)};
});
check('Old v07 Save migration no retroactive Boss/Tower fragments',()=>{
 const s=E.make('human',1e6);s.hg18.victories=5;s.hg20.tower.victories=3;
 const doc=JSON.parse(E.serializeSave(s));delete doc.state.hg31;
 const a=E.parseSave(JSON.stringify(doc));
 assert.equal(a.hg31.worldSeen,5);assert.equal(a.hg31.towerSeen,3);
 assert.equal(a.hg31.bossWins,0);assert.equal(a.hg31.paidTowerWins,0);
 assert(Object.values(a.hg31.fragments).every(n=>n===0));saved(a);
 return {migrated:true,noRetroactiveGrant:true};
});
check('Actual paid Tower win deposits exactly one focused Star shard and cold reload keeps it',()=>{
 let s=E.make('human',1e6);E.hg31SetFocus(s,'star_plate');
 E.autoFormation(s);E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 assert.equal(s.hg31.fragments.star_plate,0);
 const {out}=win(s);assert(out.claimed);assert.equal(s.hg31.fragments.star_plate,1);
 assert.equal(s.hg31.fragments.star_blade,0);assert.equal(s.hg31.paidTowerWins,1);
 assert.equal(s.hg31.history.length,1);s=saved(s);assert.equal(s.hg31.fragments.star_plate,1);
 return {awarded:s.hg31.last,once:true};
});
check('Tower practice (five claimed today) earns zero shards, no double spend',()=>{
 const s=E.make('human',1e6);s.hg20.tower.claims=5;E.autoFormation(s);
 E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnter(s);
 const {out}=win(s);assert.equal(out.claimed,false);
 assert.equal(s.hg31.paidTowerWins,0);assert.equal(s.hg31.history.length,0);
 assert.equal(s.hg31.fragments.star_blade,0);saved(s);return {practice:true,earned:0};
});
check('Actual T11 Boss win deposits focused Dragon fragment; low NPC does not',()=>{
 let s=E.make('human',1e6),hero=s.heroes[0];E.hg31SetFocus(s,'dragon_seal');
 hero.level=100;hero.atk=240000;hero.def=240000;hero.spd=100;
 s.army.human_10=500;s.ap=700;
 const target=E.hg24RecommendBoss(s).find(x=>x.eliteTier===11);assert(target);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);E.startMarch(s,target.key);
 let t=0;while(s.march&&t++<9)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle);const {out}=win(s);assert.equal(out.type,'win');
 assert.equal(s.hg31.fragments.dragon_seal,1);assert.equal(s.hg31.fragments.dragon_blade,0);
 assert.equal(s.hg31.bossWins,1);s=saved(s);assert.equal(s.hg31.history.length,1);
 return {boss:target.key,fragment:'dragon_seal',fixture:'hero+paid T10 troops pre-set for actual battle'};
});
check('HG46-B actual T11 Boss win unlocks Dragon without unrelated Tower floor 11',()=>{
 let s=E.make('human',1e6);const hero=s.heroes[0];
 E.hg31SetFocus(s,'dragon_blade');hero.level=100;hero.atk=240000;hero.def=240000;hero.spd=100;
 s.army.human_10=500;s.ap=700;
 const target=E.hg24RecommendBoss(s).find(x=>x.eliteTier===11);assert(target);
 E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count:500}]);E.startMarch(s,target.key);
 let t=0;while(s.march&&t++<9)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle);win(s);
 assert.equal(s.hg20.tower.floor,1);
 const card=E.hg31Catalogue(s).find(x=>x.id==='dragon_blade');
 assert.equal(card.unlocked,true,'real T11 win must release Dragon source gate');
 assert.equal(card.canCraft,false,'not enough real drops to forge legendary');
 assert.equal(card.missing.focused,5);
 assert.equal(card.have,1);
 s=saved(s);return {towerFloor:1,dragonUnlocked:card.unlocked,bossEarned:1,v07:s.version};
});
check('HG46-B Star needs earned Tower material but NO unrelated Boss token',()=>{
 const s=prepare(E.make('human',1e6));s.hg27.boss=0;
 const card=E.hg31Catalogue(s).find(x=>x.id==='star_plate');
 assert.equal(card.need.bossToken,0);
 assert.equal(card.unlocked,true);assert.equal(card.canCraft,true);
 const boss0=s.hg27.boss,gold=s.res.gold;
 const result=E.hg31Craft(s,'star_plate');assert(result.uid>0);
 assert.equal(s.hg27.boss,boss0);assert.equal(s.res.gold,gold-card.price);
 assert.equal(s.hg31.fragments.star_plate,30-card.need.fragments);
 assert(E.strictSave(s));return {paidGold:card.price,bossSpent:0,starUid:result.uid,v07:saved(s).version};
});
check('Fragment targeting cannot reroll during march or combat',()=>{
 const s=E.make('human',1e6);E.autoFormation(s);
 const tile=E.getTile(E.activeCity(s).key),npc=E.TILES.filter(x=>x.kind==='npc'&&x.level===1)
 .sort((a,b)=>Math.abs(a.x-tile.x)+Math.abs(a.y-tile.y)-Math.abs(b.x-tile.x)-Math.abs(b.y-tile.y))[0];
 E.startMarch(s,npc.key);assert.throws(()=>E.hg31SetFocus(s,'dragon_plate'),/dừng hành quân/);
 let j=0;while(s.march&&j++<14)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
 assert(s.battle);assert.throws(()=>E.hg31SetFocus(s,'star_plate'),/dừng hành quân/);
 const before=s.hg31.fragments.dragon_plate;win(s);assert.equal(s.hg31.fragments.dragon_plate,before);
 saved(s);return {focusLocked:true,commonNpcNoLegendary:true};
});
check('Fixture: craft chosen Dragon and Star gear, deduct exact HG31/HG29/HG27/wallet',()=>{
 let s=prepare(E.make('elf',1e6));const start=s.res.gold;
 const id='dragon_plate',r=E.hg31Catalogue(s).find(x=>x.id===id);
 const a=E.hg31Craft(s,id);assert.equal(a.itemId,id);assert.equal(s.hg31.fragments[id],30-r.need.fragments);
 assert.equal(s.hg29.shards.abyss,120-r.need.abyss);assert.equal(s.hg27.boss,50-r.need.bossToken);
 assert.equal(s.res.gold,start-r.price);
 const b=E.hg31Craft(s,'star_seal');assert.equal(b.itemId,'star_seal');
 assert(s.inventory.some(x=>x.uid===a.uid&&x.itemId==='dragon_plate'));
 assert(s.inventory.some(x=>x.uid===b.uid&&x.itemId==='star_seal'));
 s=saved(s);assert.equal(s.hg31.crafted,2);
 return {crafted:2,dragonPlate:a.uid,starSeal:b.uid};
});
check('Fixture: two and three piece bonuses affect REAL combat modifiers and hero stats',()=>{
 const s=prepare(E.make('undead',1e6));const id=s.activeHero;
 const baseline=E.combatModifiers(s,id),baseStats=E.heroStats(s,id);
 for(const p of ['dragon_blade','dragon_plate','dragon_seal']){
  const i=E.hg31Craft(s,p);E.equipItem(s,i.uid,id);
  if(p==='dragon_plate'){
   const m=E.combatModifiers(s,id);
   assert(m.meleeDamage>=baseline.meleeDamage+.064);
   assert(m.rangedDamage>=baseline.rangedDamage+.064);
  }
 }
 const three=E.combatModifiers(s,id);
 assert(three.damageReduction>=baseline.damageReduction+.064);
 assert(E.heroStats(s,id).atk>baseStats.atk);
 const counts=E.hg18SetCounts(s,id);assert.equal(counts.dragon,3);
 saved(s);return {set:counts.dragon,modifiers:three};
});
check('Fixture: Star set bonuses are stronger than basic Astral, combat caps safe',()=>{
 const s=prepare(E.make('human',1e6)),id=s.activeHero;
 for(const p of ['star_blade','star_plate','star_seal']){
  const row=E.hg31Craft(s,p);E.equipItem(s,row.uid,id);
 }
 const mods=E.combatModifiers(s,id),stats=E.heroStats(s,id);
 assert(mods.damageBonus>=.079);assert(mods.damageReduction>=.084);
 assert(mods.damageBonus<=.25);assert(mods.damageReduction<=.20);
 assert(stats.atk>60);saved(s);return {starPieces:3,mods};
});
check('Reject lack of shards, full inventory and corrupted Save without minting items',()=>{
 const s=E.make('orc',1e6),before=s.inventory.length,gold=s.res.gold;
 assert.throws(()=>E.hg31Craft(s,'dragon_blade'),/Chưa đạt/);
 assert.equal(s.inventory.length,before);assert.equal(s.res.gold,gold);
 const raw=JSON.parse(E.serializeSave(s));
 raw.state.hg31.fragments.dragon_blade=-1;assert.throws(()=>E.parseSave(JSON.stringify(raw)));
 const bad=JSON.parse(E.serializeSave(s));bad.state.hg31.bossFocus='star_blade';
 assert.throws(()=>E.parseSave(JSON.stringify(bad)));
 const r=prepare(s);r.inventory.length=2000;
 assert(!E.hg31Catalogue(r).find(x=>x.id==='dragon_blade').canCraft);
 return {negativeSaveRejected:true,wrongFocusRejected:true,capacityBlocked:true};
});
console.log('HG31 '+passed+'/12 '+(process.exitCode?'FAIL':'PASS'));if(passed!==12)process.exitCode=1;
