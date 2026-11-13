/* HG30: real, repeatable 4-race troop conversion questline.
 * Original offline mechanics, not verified 2009 server rates. Save v07 unchanged.
 * Existing HG18 quest guards + HG20 tower sovereigns remain canonical.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE,C=E?.C;
if(!E?.hg29Ensure||!E?.hg27Ensure||!E?.hg20HeroPlan||!C?.rewardUnits)
  throw Error('HG30 requires HG18/HG20/HG27/HG29');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,battleAct:E.battleAct};
const RACES=Object.freeze(['human','elf','orc','undead']);
const NAMES=Object.freeze({
 human:{name:'Nhân tộc',first:'Thần Vệ Gaia',final:'Thiên Giới Thánh Vệ',icon:'⚜'},
 elf:{name:'Tinh Linh',first:'Nguyệt Vệ Tinh Linh',final:'Ngân Nguyệt Long Linh',icon:'🌿'},
 orc:{name:'Thú tộc',first:'Chiến Vệ Cuồng Phong',final:'Viễn Cổ Chiến Thần',icon:'🔥'},
 undead:{name:'Vong Linh',first:'U Minh Hộ Vệ',final:'U Minh Bất Diệt Vương',icon:'☠'}
});
const MAX=1000000000;
const RECIPES=Object.freeze({
 guard:Object.freeze({id:'guard',title:'Nghi lễ phong Chiến Vệ',gold:3000,fromCount:12,toCount:4000,
  fragments:Object.freeze({wild:6}),tokens:Object.freeze({marks:12,tower:3}),minFloor:4}),
 sovereign:Object.freeze({id:'sovereign',title:'Thức tỉnh quân Tối Thượng',gold:20000,fromCount:2,toCount:4000,
  fragments:Object.freeze({abyss:4,hunter:8,hero:4,tower:12}),
  tokens:Object.freeze({boss:2,tower:4}),minFloor:11})
});
const isInt=(x,max=MAX)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
for(const race of RACES){
 const g=C.rewardUnits[race]?.find(u=>u.id===race+'_quest_guard');
 const t=C.rewardUnits[race]?.find(u=>u.id===race+'_tower_sovereign');
 if(!g||!t||!t.towerExclusive||!E.HG29_ITEMS.wild||!E.HG29_ITEMS.abyss)throw Error('HG30 race catalog mismatch '+race);
}
function ensure(s){
 if(!s.hg30)s.hg30={version:1,stage:0,npcWins:0,bossWins:0,paidTowerWins:0,
  worldSeen:s.hg18?.victories||0,towerSeen:s.hg20?.tower?.victories||0,
  bossAfterGuard:0,towerAfterGuard:0,guardMade:0,sovereignMade:0,receipts:[]};
 return s.hg30;
}
function valid(s){
 const q=s?.hg30;
 if(!q||q.version!==1||!isInt(q.stage,3)||!Array.isArray(q.receipts)||q.receipts.length>30)return false;
 if(!['npcWins','bossWins','paidTowerWins','worldSeen','towerSeen','bossAfterGuard',
  'towerAfterGuard','guardMade','sovereignMade'].every(k=>isInt(q[k])))return false;
 if(q.worldSeen>(s.hg18?.victories||0)||q.towerSeen>(s.hg20?.tower?.victories||0)||
   q.bossWins>q.npcWins||q.bossAfterGuard>q.bossWins||q.towerAfterGuard>q.paidTowerWins)return false;
 if(q.receipts.some(r=>!r||!['guard','sovereign'].includes(r.id)||!RACES.includes(r.race)||
    !isInt(r.ordinal)||!isInt(r.gold)||!isInt(r.stage,3)||
    (!isInt(r.fromCount,120)||r.fromCount<1)||(r.toCount!==undefined&&!isInt(r.toCount,40000))||(r.batches!==undefined&&(!isInt(r.batches,10)||r.batches<1))||typeof r.fromUnit!=='string'||typeof r.toUnit!=='string'))return false;
 return true;
}
function reserved(s,id){
 let total=0;
 for(const h of s.heroes)for(const g of E.hg20HeroPlan(s,h.id)){
  if(g.unitId===id)total+=g.count;
 }
 // Active formation must never be ignored if an older save has no HG20 plan yet.
 const active=s.hg20.plans[(s.activeCityId||'main')+':'+s.activeHero];
 if(!active)total+=Math.max(0,(s.formation||[]).filter(x=>x.unitId===id)
  .reduce((n,x)=>n+x.count,0)-(s.hg20.plans[(s.activeCityId||'main')+':'+s.activeHero]||[])
   .filter(x=>x.unitId===id).reduce((n,x)=>n+x.count,0));
 return total;
}
function free(s,id){return Math.max(0,(s.army[id]||0)-reserved(s,id));}
function idle(s){return !s.battle&&!s.march&&!s.expedition&&
 (!s.parallelMarches||!s.parallelMarches.length);
 // Configured but idle Boss hunt does not block endlessly repeatable conversions.
}
function recipe(s,id){
 const q=ensure(s),r=RECIPES[id],race=s.race;
 const fromUnit=race+(id==='guard'?'_1':'_quest_guard');
 const toUnit=race+(id==='guard'?'_quest_guard':'_tower_sovereign');
 const floor=s.hg20?.tower?.floor||1,stage=q.stage;
 const enoughFragments=Object.entries(r.fragments).every(([k,n])=>(s.hg29.shards[k]||0)>=n);
 const enoughTokens=Object.entries(r.tokens).every(([k,n])=>(s.hg27[k]||0)>=n);
 const story=id==='guard'?stage>=1:
   stage>=2&&(stage>=3||(q.bossWins-q.bossAfterGuard>=1&&q.paidTowerWins-q.towerAfterGuard>=2));
 const floorOK=floor>=r.minFloor;
 const maxBatches=Math.min(10,
  Math.floor(free(s,fromUnit)/r.fromCount),Math.floor(s.res.gold/r.gold),
  ...Object.entries(r.fragments).map(([k,n])=>Math.floor((s.hg29.shards[k]||0)/n)),
  ...Object.entries(r.tokens).map(([k,n])=>Math.floor((s.hg27[k]||0)/n)),
  Math.floor((100000000-(s.army[toUnit]||0))/r.toCount));
 const canConvert=story&&floorOK&&idle(s)&&maxBatches>=1;
 return {...r,race,fromUnit,toUnit,fromName:E.getUnit(s,fromUnit)?.name||fromUnit,
  toName:E.getUnit(s,toUnit)?.name||toUnit,
  free:free(s,fromUnit),owned:s.army[toUnit]||0,maxBatches:Math.max(0,maxBatches),story,floorOK,enoughFragments,enoughTokens,
  canConvert,needsBoss:stage<3?Math.max(0,1-(q.bossWins-q.bossAfterGuard)):0,
  needsTower:stage<3?Math.max(0,2-(q.paidTowerWins-q.towerAfterGuard)):0};
}
function status(s){
 const q=ensure(s),stage=q.stage;
 return {race:s.race,raceName:NAMES[s.race].name,stage,steps:[
  {id:'trial',name:'1. Thử thách tân binh',done:stage>=1,active:stage===0,
   progress:[{name:'Thắng NPC thật',current:Math.min(2,q.npcWins),required:2},
    {name:'Thắng Tháp có thưởng',current:Math.min(1,q.paidTowerWins),required:1}],
   available:stage===0&&q.npcWins>=2&&q.paidTowerWins>=1&&idle(s)},
  {id:'guard',name:'2. Phong ấn Chiến Vệ',done:stage>=2,active:stage===1,
   progress:[{name:'Vượt Tháp tầng 3',current:Math.min(3,(s.hg20?.tower?.floor||1)-1),required:3}],
   available:recipe(s,'guard').canConvert},
  {id:'sovereign',name:'3. Thức tỉnh Tối Thượng',done:stage>=3,active:stage===2,
   progress:[{name:'Boss thắng sau Chiến Vệ',current:stage>=2?Math.min(1,q.bossWins-q.bossAfterGuard):0,required:1},
    {name:'Tháp thắng sau Chiến Vệ',current:stage>=2?Math.min(2,q.paidTowerWins-q.towerAfterGuard):0,required:2},
    {name:'Vượt Tháp tầng 10',current:Math.min(10,(s.hg20?.tower?.floor||1)-1),required:10}],
   available:recipe(s,'sovereign').canConvert}
 ],recipes:[recipe(s,'guard'),recipe(s,'sovereign')],
 counters:{npc:q.npcWins,boss:q.bossWins,tower:q.paidTowerWins,guards:q.guardMade,sovereigns:q.sovereignMade},
 latest:q.receipts[0]||null};
}
function claimTrial(s){
 const q=ensure(s);
 if(q.stage!==0||q.npcWins<2||q.paidTowerWins<1||!idle(s))
  throw Error('Chưa hoàn thành hai trận NPC và một tầng Tháp có thưởng, hoặc quân đang đi');
 q.stage=1;E.note(s,'HG30: Đã mở nghi lễ chuyển quân thường thành Chiến Vệ.');return status(s);
}
function convert(s,id,batches=1){
 const q=ensure(s),r=recipe(s,id);
 if(!r)throw Error('Công thức HG30 không tồn tại');
 if(!Number.isSafeInteger(batches)||batches<1||batches>10||!r.canConvert||batches>r.maxBatches)
  throw Error('Số mẻ không hợp lệ hoặc chưa đủ nhiệm vụ, quân rảnh, mảnh, ấn, tầng Tháp hay vàng');
 const cost=RECIPES[id],sourceId=r.fromUnit,targetId=r.toUnit;
 // All preconditions are checked before the first mutation.
 if(!E.getUnit(s,targetId)||!E.getUnit(s,sourceId))throw Error('Thiếu binh chủng canonical');
 E.spend(s,{gold:cost.gold*batches});
 s.army[sourceId]-=cost.fromCount*batches;
 s.army[targetId]=(s.army[targetId]||0)+cost.toCount*batches;
 for(const [k,n]of Object.entries(cost.fragments))s.hg29.shards[k]-=n*batches;
 for(const [k,n]of Object.entries(cost.tokens))s.hg27[k]-=n*batches;
 if(id==='guard'){
  q.guardMade++;
  if(q.stage===1){q.stage=2;q.bossAfterGuard=q.bossWins;q.towerAfterGuard=q.paidTowerWins;}
 }else{q.sovereignMade++;if(q.stage===2)q.stage=3;}
 const receipt={id,race:r.race,ordinal:id==='guard'?q.guardMade:q.sovereignMade,
  fromUnit:sourceId,toUnit:targetId,fromCount:cost.fromCount*batches,toCount:cost.toCount*batches,
  batches,gold:cost.gold*batches,stage:q.stage};
 q.receipts.unshift(receipt);if(q.receipts.length>30)q.receipts.length=30;
 E.note(s,'HG85: -'+receipt.fromCount+' '+r.fromName+', +'+receipt.toCount+' '+r.toName+' ('+batches+' mẻ); đã trừ đủ mảnh, ấn và vàng.');
 return {...receipt,toName:r.toName};
}
function battleAct(s,action,options){
 const q=ensure(s),b=s.battle?{kind:s.battle.kind,target:s.battle.target}:null;
 const out=old.battleAct(s,action,options);
 if(!b||out?.type!=='win')return out;
 if(b.kind==='tower'){
  const n=s.hg20.tower.victories;
  if(n>q.towerSeen){q.towerSeen=n;if(out.claimed)q.paidTowerWins++;}
 }else{
  const n=s.hg18.victories;
  if(n>q.worldSeen){
   q.worldSeen=n;
   if(b.kind==='npc'){q.npcWins++;if((E.getTile(b.target)?.eliteTier||0)>=11)q.bossWins++;}
  }
 }
 return out;
}
function make(...args){const s=old.make(...args);ensure(s);return s;}
function parse(text){const s=old.parse(text);ensure(s);if(!strict(s))throw Error('Save HG30 không hợp lệ');return s;}
function strict(s){return old.strict(s)&&valid(s);}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG30 không hợp lệ');return old.serialize(s);}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 battleAct,hg30Ensure:ensure,hg30Status:status,hg30ClaimTrial:claimTrial,hg30Convert:convert,
 hg30Recipe:recipe,hg30Valid:valid,HG30_RECIPES:RECIPES,HG30_NAMES:NAMES});
root.HOG_HG30=Object.freeze({version:1,saveVersion:7,stages:3,races:4,mode:'earned-troop-questline'});
})(typeof globalThis!=='undefined'?globalThis:this);
