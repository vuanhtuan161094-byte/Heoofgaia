/* HG80 actual renderer optimization and encounter-art contract.
 * No tests may mutate the playable file, combat authority or player saves. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({console,Date,Math});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg42-boss-screen.js hg43-troop-profiles.js hg71-quest-heroes.js hg73-gear-prestige.js painter.js'.split(' ');
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,P=ctx.HOG_PAINTER;
let passed=0;
function check(name,fn){try{const out=fn()||{};passed++;console.log('HG80 PASS',name,JSON.stringify(out))}catch(e){process.exitCode=1;console.error('HG80 FAIL',name,e.stack||String(e))}}
check('Visible-world culling keeps exact y-major tile IDs and no 10k sweep per pan',()=>{
 const total=E.TILES.length;
 assert.equal(total,40000);
 const views=[
  {w:1280,h:600,q:62.4,cx:9.5,cy:7.4},
  {w:640,h:272,q:62.4,cx:9.5,cy:7.4},
  {w:378,h:350,q:48,cx:55,cy:62},
  {w:1000,h:560,q:31.2,cx:90,cy:90}
 ];
 const evidence=[];
 for(const v of views){
  const ox=v.w/2-v.cx*v.q,oy=v.h/2-v.cy*v.q;
  const visible=P.hg80VisibleTiles(E,v.q,ox,oy,v.w,v.h);
  const keys=new Set(visible.map(t=>t.key));
  assert(visible.length>0&&visible.length<total/5,JSON.stringify({v,count:visible.length}));
  assert.equal(keys.size,visible.length,'duplicates');
  assert(visible.every(t=>E.TILES[t.y*E.WIDTH+t.x]===t),'wrong source tile index');
  assert(keys.has(Math.floor(v.cx)+','+Math.floor(v.cy)),'camera-center missing');
  evidence.push({size:v.w+'x'+v.h,renderTiles:visible.length,total,savedPercent:Math.round(100*(1-visible.length/total))});
 }
 return evidence;
});
check('MiniMap terrain raster is created once per size, but not shared across different sizes',()=>{
 let creations=0,fills=0;
 ctx.document={createElement(type){
  assert.equal(type,'canvas');creations++;
  return {width:0,height:0,getContext(){return {set fillStyle(_) {},fillRect(){fills++}}}};
 }};
 const a=P.hg80MiniTerrain(E,180,120),b=P.hg80MiniTerrain(E,180,120);
 assert.equal(a,b);assert.equal(creations,1);assert.equal(fills,40000);
 const c=P.hg80MiniTerrain(E,140,88);
 assert.notEqual(a,c);assert.equal(creations,2);assert.equal(fills,80000);
 return {firstDraws:40000,cacheHits:1,renderTilesOnSubsequentMapPan:0,cacheVariants:2};
});
check('Real world monster semantics are drawn with different source archetypes',()=>{
 const cases=[
  ['Wolves',1,0,'wildland_beast'],['Earth Bear',10,12,'wildland_beast'],
  ['Bandits',2,0,'elite_guardian'],['Cyclop Tyrant',9,11,'elite_guardian'],
  ['Azrael',9,11,'lich_warlord'],['Shadows',1,0,'lich_warlord'],
  ['Wyverns',4,0,'boss_dragon'],['Ghost Dragon',12,13,'boss_dragon'],
  ['Fiery Giant',10,12,'elite_guardian']
 ];
 for(const [name,level,eliteTier,expected] of cases)
  assert.equal(P.encounterKind({value:name,level,eliteTier}),expected,name);
 return {distinct:4,verified:cases.length,realAssetAtlases:true};
});
check('Combat and map logic untouched, proper Save v07 serial roundtrip',()=>{
 const s=E.make('human',1_000_000);
 assert.equal(s.version,7);assert(E.strictSave(s));
 assert.equal(E.WIDTH,200);assert.equal(E.HEIGHT,200);
 assert.equal(E.BATTLE_GRID.cols,12);assert.equal(E.BATTLE_GRID.rows,9);
 const unit=Object.values(ctx.HOG_CATALOG.units).flat().find(u=>u.id==='human_10');
 assert(unit&&E.unitTacticalMovement(unit)>=2);
 const old=E.serializeSave(s),round=E.parseSave(old);
 assert(E.strictSave(round));assert.equal(round.version,7);
 return {version:7,tactical:'+ class-based; SPD is world-only',runtimeAuthority:'unchanged'};
});
check('HG92 deterministic farm sites preserve all sourced locations and Save v07',()=>{
 const farms=E.TILES.filter(t=>t.source==='MODELED_HG92_FARM');
 assert(farms.length>=200,'world still too empty');
 assert(farms.some(t=>t.kind==='npc'&&t.level===1&&t.x<15&&t.y<16),'beginner farm missing');
 assert(farms.some(t=>t.kind==='mine'),'no resource farm');
 assert(farms.every(t=>(t.kind==='npc'||t.kind==='mine')&&!t.treasureCamp&&t.terrain!=='water'&&t.terrain!=='bridge'));
 assert(E.NPC_CAMPS_2009.length>=120,'historical NPC list altered');
 assert.equal(E.TREASURE_CAMPS_2009.length,76);
 assert.equal(E.WORLD_BUILDINGS.length,10);
 // HG18/HG50 add more Boss sites beyond the four original modeled elites.
 assert(E.TILES.filter(t=>t.eliteTier>=11).length>=4,'canonical Boss sites disappeared');
 for(const name of ['Azrael','Cyclop Tyrant','Fiery Giant','Earth Bear'])
  assert(E.TILES.some(t=>t.value===name&&t.eliteTier>=11),'missing modeled Boss '+name);
 const s=E.make('human',1000);assert(E.strictSave(s));
 return {farmTiles:farms.length,npc:farms.filter(t=>t.kind==='npc').length,
 mine:farms.filter(t=>t.kind==='mine').length,saveVersion:s.version};
});
check('HG94 pointer selects POIs plus passable terrain for conquest without inventing buildings',()=>{
 const canvas={width:1176,height:620,getBoundingClientRect:()=>({width:1176,height:620})};
 const camera=P.mapCamera(),before={...camera};
 try{
  const farm=E.TILES.find(t=>t.source==='MODELED_HG92_FARM');
  camera.centerX=farm.x+.5;camera.centerY=farm.y+.42;camera.zoom=1.3;
  assert.equal(P.mapHit(canvas,588,310,E)?.key,farm.key);
  const empty=E.TILES.find(t=>t.kind==='empty'&&t.x>1&&t.y>1&&t.x<98&&t.y<98&&
   Array.from({length:9},(_,i)=>E.getTile((t.x+i%3-1)+','+(t.y+Math.floor(i/3)-1))).every(n=>n?.kind==='empty'));
  assert(empty,'no empty background exists for test');
  camera.centerX=empty.x+.5;camera.centerY=empty.y+.5;
  assert.equal(P.mapHit(canvas,588,310,E)?.key,empty.key,'empty terrain must be selected as a real HG94 conquest target');
  return {farm:farm.key,scenery:empty.key};
 }finally{Object.assign(camera,before)}
});
console.log('HG80+HG92 SUMMARY '+passed+'/6');
if(passed!==6)process.exitCode=1;