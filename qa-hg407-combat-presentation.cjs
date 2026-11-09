/* HG40.7 native Canvas combat presentation checks. All metrics are
 * read from the actual renderer and authored atlas definitions, not mock art.
 * This test never writes a gameplay Save field or changes unit stats.
 */
'use strict';
const assert=require('node:assert/strict');
for(const file of ['data','engine','hg04','hg05','hg06','hg07','hg08','hg10','hg40-tactical','art-hg33-troop-atlases','art-hg33-additional-atlases','painter'])
 require('./'+file+'.js');
const E=globalThis.HOG_ENGINE,P=globalThis.HOG_PAINTER,A=globalThis.HOG_HG33_TROOP_ATLASES;
let checks=0;
function pass(name){checks++;console.log('HG40.7 PASS '+name)}
const units=['human','elf','orc','undead'].flatMap(r=>Array.from({length:10},(_,j)=>r+'_'+(j+1)));
assert.equal(units.length,40);
assert.equal(Object.keys(P.HG407_WALK_FOOT).length,39);
for(const id of units){
 const d=A.resolve(id);
 if(id==='human_3'){assert(!P.HG407_WALK_FOOT[id]);continue;}
 assert(d,'native atlas missing for '+id);
 const offsets=P.HG407_WALK_FOOT[id];assert(offsets&&offsets.length===8,id+' needs 8 Walk frames');
 assert(offsets.every(v=>Number.isInteger(v)&&v>=-36&&v<=36));
 for(let i=0;i<8;i++){
  assert.equal(P.hg407FootOffset(id,'walk',i,204,204),offsets[i]);
  assert.equal(P.hg407FootOffset(id,'idle',i,204,204),0);
  assert.equal(P.hg407FootOffset(id,'attack',i,204,204),0);
  assert.equal(P.hg407FootOffset(id,'death',i,204,204),0);
 }
}
pass('39 native atlas troop IDs x8 Walk foot frames, legacy Human Archer preserved');
const fontOracle={font:'',save(){},restore(){},
 measureText(value){return {width:String(value).length*7.5}}};
const longName='Netherworld Ghost Dragon Emperor';
const clipped=P.hg407FitName(fontOracle,longName,89,10);
assert(clipped.endsWith('…')&&clipped.length<longName.length);
assert(fontOracle.measureText(clipped).width<=89);
assert.equal(P.hg407FitName(fontOracle,'Scout',89,10),'Scout');
assert.equal(P.hg407FitName(fontOracle,longName,89,10),clipped);
pass('long combat HUD nameplates remain within real allotted label width');
const ghostSource=[183,180,168,143,145,144,143,143],
 corrected=ghostSource.map((y,i)=>y+P.HG407_WALK_FOOT.undead_10[i]);
const rawSpread=Math.max(...ghostSource)-Math.min(...ghostSource),
 adjustedSpread=Math.max(...corrected)-Math.min(...corrected);
assert(rawSpread>=40&&adjustedSpread<=11,JSON.stringify({rawSpread,adjustedSpread,corrected}));
assert.equal(P.hg407FootOffset('undead_10','walk',3,76.5,204),13.5);
pass('Ghost Dragon Walk foot drift reduced by source-measured 8-frame alpha corrections');
const canvas={width:1176,height:550},camera=P.battleProjection(canvas,E);
const u={id:'p0',unitId:'undead_10',name:'Ghost Dragon',side:'player',x:1,y:3,initial:8,count:8,pool:800,hp:100,range:1};
const v={id:'e0',unitId:'human_8',name:'Priest',side:'enemy',x:9,y:4,initial:5,count:5,pool:450,hp:90,range:1};
const b={turn:2,allies:[u],enemies:[v],lastEvents:[],history:[]};
const layout=P.battleUnitLayout(b,camera,canvas.width,canvas.height,1000);
for(const e of layout){
 const atlas=A.resolve(e.u.unitId,e.u.name),size=Math.max(18,Math.min(160,atlas.renderWidth*e.k));
 const h=size*(atlas.frameDimensions?.[1]||atlas.frameHeight)/(atlas.frameDimensions?.[0]||atlas.frameWidth);
 assert(Math.abs(e.sprite.w-size)<1e-8);
 assert(Math.abs(e.sprite.h-h)<1e-8);
 assert(Math.abs(e.sprite.y-(e.y-h*atlas.pivot))<1e-8);
 assert.equal(P.battleHit(canvas,e.x,e.y,E,{battle:b},1000)?.id,e.id);
 assert(Math.abs(e.baseX-camera.center(e.u.x,e.u.y).x)<1e-8);
}
pass('actual native atlas dest rectangles match hitboxes; hex boot anchors unchanged');
b.lastEvents=[
 {actorId:'p0',targetId:'e0',damage:40,casualties:0,death:false,
  order:'attack',from:{x:1,y:3},to:{x:1,y:3},path:[]},
 {actorId:'e0',targetId:'p0',damage:0,casualties:0,death:false,
  order:'move',from:{x:5,y:4},to:{x:9,y:4},
  path:[{x:6,y:4},{x:7,y:4},{x:8,y:4},{x:9,y:4}]}
];
P.battleTimelinePrime(b,1000,true);
const now=1410,visual=P.battleVisualState(b,v,now,now),pt=P.battleVisualPoint(camera,visual,v);
const fx=P.battleFxPlan(b,camera,now,layout);
assert.equal(fx.length,1);
assert(Math.abs(fx[0].end.x-pt.x)<1e-8 && Math.abs(fx[0].end.y-(pt.y-layout.find(e=>e.id==='e0').size*.52))<1e-8);
assert(Math.abs(pt.x-camera.center(v.x,v.y).x)>1,'moving target differs from its settled canonical cell');
pass('actual receipt-path impact plan returns one legitimate damage event');
const state=E.make('human',950407);assert.equal(state.version,7);
const saved=JSON.parse(E.serializeSave(state));
assert.equal(saved.state.version,7);
assert(E.strictSave(state));
pass('Save v07 valid and untouched by all visual renderer checks');
console.log('HG40.7 COMBAT PRESENTATION '+checks+'/'+checks+' PASS');
