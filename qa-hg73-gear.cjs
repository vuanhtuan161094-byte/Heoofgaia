/* HG73 prestige gear: deterministic tier/stat ladder, UID-only sources,
 * real equip combat impact, enhancement promotion, v07 and no ghost loot.
 * Item creation in this test uses explicit E.addItem fixtures only.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js'.split(' ');
for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx,{filename:f});
const E=ctx.HOG_ENGINE;let passed=0;
function check(label,fn){try{const result=fn()||{};console.log('HG73 PASS '+label+' '+JSON.stringify(result));passed++}
 catch(err){console.error('HG73 FAIL '+label+' '+String(err.stack||err));process.exitCode=1}}
const fresh=()=>E.make('human',1e6);
const src=[
 ['common','copper_blade',0],
 ['fine','sentinel_sword',0],
 ['rare','hg47_human_rare_weapon',0],
 ['epic','astral_sword',0],
 ['legendary','dragon_blade',0],
 ['platinum','star_blade',0],
 ['rainbow','star_blade',8],
 ['divine','hg47_human_divine_weapon',0]
];
check('eight distinct ranks from real original equipment and paid enhancement path',()=>{
 const s=fresh();const items=src.map(([rank,id,level])=>{const v=E.addItem(s,id,'HG73 clearly marked test fixture');v.enhance=level;
  assert.equal(E.hg73Kind(v),rank);assert(E.hg73Grade(v)?.label);return v});
 assert.equal(Object.keys(E.HG73_TIERS).length,8);
 assert(src.every((r,i)=>E.hg73Grade(items[i]).order===i+1));
 assert(E.strictSave(s));return {ranks:items.map(x=>E.hg73Grade(x).label),uidCount:items.length,save:s.version};
});
check('higher grade increases real item stats while keeping sources and inventory UIDs',()=>{
 const s=fresh(),before=JSON.stringify(s.inventory),wallet={...s.res};
 const out={};for(const [rank,id,level] of src){
  const row=E.addItem(s,id,'QA fixture; no gameplay loot');row.enhance=level;
  const original=E.ITEMS[row.itemId],stats=E.hg46Stats(row),profile=E.hg73Inspect(row);
  assert(stats.atk>=original.atk,rank);assert(profile.order===E.hg73Grade(row).order);
  assert(profile.newStats.atk===stats.atk&&profile.delta.atk>=0,rank);
  out[rank]={atk:stats.atk,def:stats.def,spd:stats.spd,int:stats.int};
 }
 assert.equal(before,'[]');assert.equal(s.inventory.length,8);
 assert.equal(s.res.gold,wallet.gold);assert(E.strictSave(s));
 assert(out.legendary.atk>out.rare.atk&&out.platinum.atk>out.legendary.atk);
 assert(out.rainbow.atk>out.platinum.atk&&out.divine.atk>out.rare.atk);
 return {grades:out,save:s.version};
});
check('an equipped god-tier weapon really buffs owner stats and observable battle modifiers',()=>{
 const s=fresh(),h=s.heroes[0],start=E.heroStats(s,h.id),prev=E.combatModifiers(s,h.id);
 const row=E.addItem(s,'hg47_human_divine_weapon','QA minted fixture');
 E.equipItem(s,row.uid,h.id);
 const total=E.heroStats(s,h.id),mods=E.combatModifiers(s,h.id),actual=E.hg46Stats(row);
 assert(total.atk>start.atk+E.ITEMS[row.itemId].atk,'prestige gain must be part of combat actor attack');
 assert(total.atk>=start.atk+actual.atk-5);
 assert(mods.damageBonus>=prev.damageBonus);
 assert.equal(E.hg73AuraForHero(s,h.id)?.tier,'divine');
 assert(E.strictSave(s));
 const parsed=E.parseSave(E.serializeSave(s));
 assert(E.strictSave(parsed));
 assert.equal(E.hg73AuraForHero(parsed,h.id)?.tier,'divine');
 assert.equal(parsed.inventory.filter(x=>x.uid===row.uid).length,1);
 return {atkBefore:start.atk,atkAfter:total.atk,damageBefore:prev.damageBonus,damageAfter:mods.damageBonus,v07:s.version};
});
check('enhancement is strictly UID-based: platinum +7 upgrades to rainbow at +8',()=>{
 const s=fresh(),v=E.addItem(s,'star_blade','QA fixture');
 v.enhance=7;const before=E.hg46Stats(v).atk;
 assert.equal(E.hg73Kind(v),'platinum');
 v.enhance=8;const after=E.hg46Stats(v).atk;
 assert.equal(E.hg73Kind(v),'rainbow');assert(after>before);
 v.enhance=10;const high=E.hg46Stats(v).atk;
 assert(high>after&&E.strictSave(s));
 return {before,after,high,save:s.version};
});
check('ten real God-tier UIDs have bounded modifiers and no ghost equipment',()=>{
 const s=fresh(),originalCount=s.inventory.length,oldMoney=s.res.gold;
 const slots=E.HG47_SLOTS.map(([slot])=>slot);
 for(const slot of slots){
  const row=E.addItem(s,E.hg47ItemId('human','divine',slot),'explicit QA fixture');
  E.equipItem(s,row.uid,1);
 }
 const c=E.combatModifiers(s,1),h=E.heroStats(s,1);
 assert.equal(slots.length,10);
 assert.equal(Object.keys(s.equipment[1]).length,10);
 assert(s.inventory.length-originalCount===10);
 assert(c.damageBonus<=.32+1e-9&&c.damageReduction<=.24+1e-9);
 assert(s.res.gold===oldMoney);assert(E.strictSave(s));
 const saved=E.parseSave(E.serializeSave(s));assert(E.strictSave(saved));
 assert.equal(Object.keys(saved.equipment[1]).length,10);
 return {damage:c.damageBonus,guard:c.damageReduction,atk:h.atk,def:h.def,save:s.version};
});
check('old Save v07 with common gear is unchanged by the visual/derived-rank layer',()=>{
 const s=fresh();const v=E.addItem(s,'copper_blade','legacy-grade fixture');
 const old=JSON.stringify(E.serializeSave(s)),count=s.inventory.length,gold=s.res.gold;
 assert.equal(E.hg73Kind(v),'common');
 assert.equal(E.hg73StatGains(v).atk,0);assert.equal(E.hg73StatGains(v).def,0);
 const copy=E.parseSave(E.serializeSave(s));
 assert(E.strictSave(copy));assert.equal(copy.version,7);
 assert.equal(copy.inventory.length,count);assert.equal(copy.res.gold,gold);
 assert.equal(JSON.stringify(E.serializeSave(copy)),old);
 return {uid:v.uid,unchanged:true,save:copy.version};
});
console.log('HG73 equipment engine',passed,'/',6,'PASS');
if(passed!==6)process.exitCode=1;
