/* HG46 real equipment ownership, optimizer, enhancement and v07 regression.
 * Explicit fixture equipment is only for testing; no gameplay grants.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js'.split(' ');
const ctx=vm.createContext({console});
for(const p of files)vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),ctx,{filename:p});
const E=ctx.HOG_ENGINE,checks=[];
function test(name,fn){
 try{const data=fn()||{};checks.push({name,result:'PASS',data});console.log('HG46 PASS '+name+' '+JSON.stringify(data))}
 catch(err){checks.push({name,result:'FAIL',error:String(err.stack||err)});process.exitCode=1;console.error('HG46 FAIL '+name+' '+String(err.stack||err))}
}
function start(){const s=E.make('human',Date.now());assert(E.strictSave(s));return s}
function save(s){assert(E.strictSave(s),'Invalid v07 before export');const out=E.parseSave(E.serializeSave(s));assert(E.strictSave(out));return out}
function second(s){const h=JSON.parse(JSON.stringify(s.heroes[0]));h.id=2;h.name='QA Tướng Thứ Hai';s.heroes.push(h);s.equipment[2]={};assert(E.strictSave(s));return h}
const snapshot=s=>JSON.stringify(s);
function earnedShop(s,id){
 // Bazaar building level is the explicit unlock fixture. Purchase uses the
 // actual production transaction, exact wallet deductions and a real item UID.
 s.buildings.bazaar=Math.max(s.buildings.bazaar||0,E.ITEMS[id].level);
 const gold=s.res.gold,uid=E.buyItem(s,id).uid;
 assert.equal(gold-s.res.gold,E.ITEMS[id].cost);return uid;
}
test('One HTML source uses HG46 and no added persistent Save fields',()=>{
 for(const race of ['human','elf','orc','undead']){
  const s=E.make(race,Date.now());
  assert.equal(s.version,7);assert.equal(Object.keys(E.HG31_SETS).length+Object.keys(E.HG18_SETS).length,4);
  assert.equal(E.hg46Sets(s,1).length,4);
  assert.deepEqual(Object.keys(s.equipment[1]),[]);
  save(s);
 }
 return {races:4,sets:4,slots:3,v:7};
});
test('Real Bazaar purchase, protected equipment owner and atomic failed theft',()=>{
 const s=start();second(s);
 const uid=earnedShop(s,'copper_blade');E.equipItem(s,uid,1);
 assert.equal(E.hg46Owner(s,uid).heroId,1);
 const copy=snapshot(s);
 assert.throws(()=>E.equipItem(s,uid,2),/tướng khác/);
 assert.equal(snapshot(s),copy,'failed transfer must be byte-for-byte unchanged');
 assert.equal(E.hg46CanUse(s,uid,2).allowed,false);
 assert.equal(E.hg46Owner(save(s),uid).heroId,1);
 return {uid,owner:1,hero2Slots:s.equipment[2]};
});
test('Three unique slots from real items and safe same-owner replacement',()=>{
 const s=start();const ids=['copper_blade','iron_armor','quartz_ring'];
 const uids=ids.map(id=>earnedShop(s,id));
 for(const uid of uids)E.equipItem(s,uid,1);
 assert.deepEqual(Object.keys(s.equipment[1]).sort(),['armor','charm','weapon']);
 const before=E.heroStats(s,1);
 assert(before.atk>s.heroes[0].atk&&before.def>s.heroes[0].def);
 const oldSword=uids[0],newSword=earnedShop(s,'ash_bow');
 E.equipItem(s,newSword,1);
 assert.equal(E.hg46Owner(s,oldSword),null);
 assert.equal(E.hg46Owner(s,newSword).heroId,1);
 assert.equal(s.inventory.length,4,'replaced gear stays in canonical inventory');
 const restored=save(s);
 assert.equal(restored.inventory.length,4);
 return {slots:restored.equipment[1],count:restored.inventory.length};
});
test('Auto-build derives actual combat stats and activates 3/3 earned-set mechanics',()=>{
 const s=start();second(s);
 const inv=['sentinel_sword','sentinel_plate','sentinel_seal'].map(id=>
  E.addItem(s,id,'HG46 gear optimization explicit test fixture'));
 const before={res:snapshot(s.res),army:snapshot(s.army),inventory:snapshot(s.inventory),other:snapshot(s.equipment[2])};
 const initial=E.hg46Metrics(s,1,'balanced'),suggestion=E.hg46Suggest(s,1,'balanced');
 assert(suggestion.allowed&&suggestion.gain>0,JSON.stringify(suggestion));
 assert.equal(Object.keys(s.equipment[1]).length,0,'preview must not equip');
 const result=E.hg46AutoEquip(s,1,'balanced');
 assert.equal(result.applied,true);assert.equal(result.changed,3);
 assert.equal(E.hg18SetCounts(s,1).sentinel,3);
 const after=E.hg46Metrics(s,1,'balanced');
 assert(after.score>initial.score);assert(after.mod.damageBonus>initial.mod.damageBonus);
 assert.equal(snapshot(s.res),before.res);assert.equal(snapshot(s.army),before.army);
 assert.equal(snapshot(s.inventory),before.inventory);assert.equal(snapshot(s.equipment[2]),before.other);
 assert.deepEqual(Object.values(s.equipment[1]).sort(),inv.map(x=>x.uid).sort());
 const reloaded=save(s);
 assert.equal(E.hg18SetCounts(reloaded,1).sentinel,3);
 assert.equal(E.hg46AutoEquip(reloaded,1,'balanced').applied,false);
 return {from:initial.score,to:after.score,effect:after.mod.damageBonus,save:reloaded.version};
});
test('Defense and attack planners never transfer another hero gear or change resources',()=>{
 const s=start();second(s);
 const dragon=E.addItem(s,'dragon_blade','HG46 QA source fixture');
 E.equipItem(s,dragon.uid,2);
 const items=['iron_armor','ash_bow','old_talisman','quartz_ring','sentinel_plate','sentinel_sword','sentinel_seal'].map(id=>E.addItem(s,id,'HG46 QA fixture'));
 const last=snapshot(s.inventory),res=snapshot(s.res),other=snapshot(s.equipment[2]);
 for(const mode of ['attack','defense']){
  const r=E.hg46AutoEquip(s,1,mode);
  assert(r.allowed,JSON.stringify(r));
  assert.equal(snapshot(s.equipment[2]),other);
  assert(!Object.values(s.equipment[1]).includes(dragon.uid));
  assert(E.strictSave(s));
 }
 assert.equal(snapshot(s.inventory),last);
 assert.equal(snapshot(s.res),res);
 const loaded=save(s);assert.equal(loaded.equipment[2].weapon,dragon.uid);
 return {hero1:loaded.equipment[1],hero2:loaded.equipment[2],available:items.length};
});
test('Enhancement consumes exact stones/gold, upgrades real hero stats and persists',()=>{
 const s=start();const uid=earnedShop(s,'copper_blade');E.equipItem(s,uid,1);
 s.hg18.materials.enhance_stone=10;
 const cost=E.hg46NextEnhance(s,uid),previous=E.heroStats(s,1),gold=s.res.gold,stones=s.hg18.materials.enhance_stone;
 assert.equal(cost.stones,2);assert.equal(cost.gold,250);assert(cost.possible);
 assert.equal(E.enhanceHG18(s,uid),1);
 assert.equal(s.res.gold,gold-250);assert.equal(s.hg18.materials.enhance_stone,stones-2);
 assert(E.heroStats(s,1).atk>previous.atk);
 const again=E.hg46NextEnhance(s,uid);assert.equal(again.stones,4);assert.equal(again.gold,500);
 const restored=save(s);assert.equal(restored.inventory.find(x=>x.uid===uid).enhance,1);
 return {uid,level:1,paidGold:250,paidStones:2,beforeAtk:previous.atk,afterAtk:E.heroStats(s,1).atk};
});
test('Equipped item salvage is rejected; after unequip material return is once only',()=>{
 const s=start(),uid=earnedShop(s,'copper_blade');E.equipItem(s,uid,1);
 const before=snapshot(s);assert.throws(()=>E.salvageHG18(s,uid),/tháo/);
 assert.equal(before,snapshot(s));
 E.unequipItem(s,'weapon',1);
 const stone=s.hg18.materials.enhance_stone,result=E.salvageHG18(s,uid);
 assert.equal(result.stones,1);assert.equal(s.hg18.materials.enhance_stone,stone+1);
 assert(!s.inventory.some(x=>x.uid===uid));
 assert.throws(()=>E.salvageHG18(s,uid),/không tồn tại/);
 return {removedUid:uid,earnedStones:result.stones,remaining:save(s).inventory.length};
});
test('Away commander cannot swap or enhance equipped gear, no mutation',()=>{
 const s=start(),uid=earnedShop(s,'copper_blade');
 E.equipItem(s,uid,1);s.hg18.materials.enhance_stone=20;
 // Force the real away-status predicate for this guard test without granting
 // a battle victory or injecting a persistent receipt.
 s.march={phase:'outbound',heroId:1};
 const before=snapshot(s);
 assert.throws(()=>E.unequipItem(s,'weapon',1),/hành quân|trở về/);
 assert.throws(()=>E.enhanceHG18(s,uid),/hành quân|trở về/);
 assert.throws(()=>E.hg46AutoEquip(s,1,'balanced'),/hành quân|trở về/);
 assert.equal(snapshot(s),before);
 delete s.march;s.march=null;assert(E.strictSave(s));
 return {blocked:true,save:save(s).version};
});
const out=path.join(__dirname,'docs','qa','hg46');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'equipment-engine.json'),JSON.stringify({
 suite:'HG46 equipment real inventory and v07',passed:checks.filter(x=>x.result==='PASS').length,
 total:checks.length,checks
},null,2)+'\n');
console.log('HG46 SUMMARY '+checks.filter(x=>x.result==='PASS').length+'/'+checks.length);
