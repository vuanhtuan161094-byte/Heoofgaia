"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
for(const name of ["data","engine","hg04","hg05","hg06","hg07","hg08","hg10","painter"])require("./"+name+".js");
const E=globalThis.HOG_ENGINE,P=globalThis.HOG_PAINTER,H=E.battleHex,G=E.BATTLE_GRID;
assert(H&&P&&G);
let checks=0;
function pass(name){checks++;console.log("PASS "+name)}

assert.equal(H.orientation,"pointy-top");assert.equal(H.layout,"odd-r");assert.equal(H.directions.length,6);
for(let y=0;y<G.rows;y++)for(let x=0;x<G.cols;x++){
 const axial=H.offsetToAxial(x,y),offset=H.axialToOffset(axial.q,axial.r);
 assert.deepEqual(offset,{x,y});
 const neighbors=H.neighbors(x,y);assert.equal(neighbors.length,6);
 assert.equal(new Set(neighbors.map(n=>`${n.x},${n.y}`)).size,6);
 for(const n of neighbors){
  assert.equal(H.distance({x,y},n),1);
  if(H.inBounds(n.x,n.y))assert(H.neighbors(n.x,n.y).some(r=>r.x===x&&r.y===y),"neighbor reciprocity");
 }
}
pass("108 saved integer offset cells map reversibly to axial and six reciprocal neighbors");

const oldReach={ranged:0,eliteRanged:0},newReach={ranged:0,eliteRanged:0},all=G.cols*G.rows;
for(let y=0;y<G.rows;y++)for(let x=0;x<G.cols;x++)for(let yy=0;yy<G.rows;yy++)for(let xx=0;xx<G.cols;xx++){
 const a={x,y},b={x:xx,y:yy},man=Math.abs(x-xx)+Math.abs(y-yy),hex=H.distance(a,b);
 if(man<=11)oldReach.ranged++;if(man<=12)oldReach.eliteRanged++;
 if(hex<=9)newReach.ranged++;if(hex<=10)newReach.eliteRanged++;
}
assert.deepEqual(oldReach,{ranged:10344,eliteRanged:10824});
assert.deepEqual(newReach,{ranged:10298,eliteRanged:10862});
assert.deepEqual({...E.TACTICAL_RANGE},{melee:1,ranged:9,eliteRanged:10});
assert(Math.abs(newReach.ranged-oldReach.ranged)/oldReach.ranged<.005);
assert(Math.abs(newReach.eliteRanged-oldReach.eliteRanged)/oldReach.eliteRanged<.005);
pass("modeled ranged reach stays within 0.5% of prior all-cell reach counts; values remain SIMULATED");

for(const dims of [{width:1176,height:550},{width:930,height:320},{width:1250,height:500}]){
 const cam=P.battleProjection(dims,E),cells=P.battleGridCells(cam),bounds={l:Infinity,t:Infinity,r:-Infinity,b:-Infinity};
 assert.equal(cells.length,all);
 for(const cell of cells){
  assert.equal(cell.corners.length,6);
  for(const p of cell.corners){assert(Math.abs(Math.hypot(p.x-cell.center.x,p.y-cell.center.y)-cam.radius)<1e-7);bounds.l=Math.min(bounds.l,p.x);bounds.t=Math.min(bounds.t,p.y);bounds.r=Math.max(bounds.r,p.x);bounds.b=Math.max(bounds.b,p.y)}
  assert.deepEqual(P.battleCellAt(dims,cell.center.x,cell.center.y,E),{x:cell.x,y:cell.y});
  for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/2,x=cell.center.x+cam.radius*.68*Math.cos(a),y=cell.center.y+cam.radius*.68*Math.sin(a);assert.deepEqual(P.battleCellAt(dims,x,y,E),{x:cell.x,y:cell.y})}
 }
 assert(bounds.l>=-1&&bounds.t>=-1&&bounds.r<=dims.width+1&&bounds.b<=dims.height+1);
}
pass("actual six-vertex pointy hexes and 108 reversible hit regions fit desktop, compact, and mobile canvases");

const city=E.make("human",1_000_006),camp=E.NPC_CAMPS_2009.find(c=>c.stars===1);assert(camp);
city.battle=E.makeBattle(city,camp.key);const b=city.battle;
b.allies=[
 {id:"p0",slot:0,side:"player",heroId:city.heroes[0].id,unitId:"human_1",name:"Hex mover",range:1,count:2,initial:2,hp:1000,atk:1,def:10,spd:7,pool:2000,x:1,y:1},
 {id:"p1",slot:1,side:"player",heroId:city.heroes[0].id,unitId:"human_1",name:"Blocker",range:1,count:1,initial:1,hp:1000,atk:0,def:10,spd:2,pool:1000,x:2,y:1}
];
b.enemies=[{id:"e0",side:"enemy",unitId:null,name:"Hex target",range:1,count:1,initial:1,hp:1_000_000,atk:0,def:100,spd:1,pool:1_000_000,x:7,y:5}];
b.selected="p0";city.battle=b;
const route=E.battlePath(b,b.allies[0],{x:4,y:3});assert(route&&route.length>0);
let prev={x:b.allies[0].x,y:b.allies[0].y};
for(const step of route){assert.equal(H.distance(prev,step),1);assert(![...b.allies,...b.enemies].some(u=>u.pool>0&&u.id!=="p0"&&u.x===step.x&&u.y===step.y));prev=step;}
const movePreview=E.battleMovePreview(b,"p0");assert(movePreview.cells.length>0&&movePreview.cells.every(c=>c.steps<=movePreview.steps));
const beforeSave=E.serializeSave(city);assert.equal(JSON.parse(beforeSave).state.version,7);
const moveResult=E.battleAct(city,"move",{x:4,y:3});assert.equal(moveResult.type,"continue");
const actual=b.lastMoves.find(m=>m.unitId==="p0");assert(actual&&actual.steps<=movePreview.steps);
prev=actual.from;for(const step of actual.path){assert.equal(H.distance(prev,step),1);prev=step;}
assert(E.strictSave(city));
const reloaded=E.parseSave(E.serializeSave(city));assert.equal(reloaded.version,7);assert(E.strictSave(reloaded));
pass("manual movement follows six-neighbor paths, honors blockers/speed, and round-trips in Save v07");

const combat=E.make("human",1_000_007),rangeCamp=E.NPC_CAMPS_2009.find(c=>c.stars===1);combat.battle=E.makeBattle(combat,rangeCamp.key);
combat.battle.allies=[{id:"p0",slot:0,side:"player",heroId:combat.heroes[0].id,unitId:"human_3",name:"Hex archer",range:3,count:1,initial:1,hp:1000,atk:200,def:10,spd:9,pool:1000,x:1,y:1}];
combat.battle.enemies=[
 {id:"e0",side:"enemy",unitId:null,name:"Inside hex radius",range:1,count:1,initial:1,hp:1_000_000,atk:0,def:100,spd:1,pool:1_000_000,x:4,y:2},
 {id:"e1",side:"enemy",unitId:null,name:"Outside hex radius",range:1,count:1,initial:1,hp:1_000_000,atk:0,def:100,spd:1,pool:1_000_000,x:5,y:1}
];
combat.battle.selected="p0";assert.equal(H.distance({x:1,y:1},{x:4,y:2}),3);
assert.deepEqual(E.battleTargetsInRange(combat.battle,"p0"),["e0"]);
const saveBefore=E.serializeSave(combat),result=E.battleAct(combat,"attack"),attackReceipt=combat.battle.lastEvents.find(e=>e.actorId==="p0");
assert.equal(result.type,"continue");assert.equal(attackReceipt.targetId,"e0");assert(attackReceipt.damage>0);
assert(E.strictSave(combat));const restored=E.parseSave(E.serializeSave(combat));assert.equal(restored.version,7);assert(E.strictSave(restored));
assert.equal(JSON.parse(saveBefore).state.version,7);
pass("hex attack radius drives target preview and a real strike; v07 saves still load without migration");

const htmlPath="Play-Heoofgaia-HG11.html";
const releaseHash=fs.existsSync(htmlPath)?require("node:crypto").createHash("sha256").update(fs.readFileSync(htmlPath)).digest("hex"):null;
const receipt={schema:"HG33-H1-hex-engine-v1",generatedAt:new Date().toISOString(),branch:"feature/hog1-research-to-playable-20261102",grid:{cols:G.cols,rows:G.rows,cells:all,orientation:H.orientation,layout:H.layout,saveCoordinates:"integer odd-r offset x/y; Save v07 unchanged"},range:{historicalStatus:"SIMULATED; no verified original tactical range table located",oldManhattan:oldReach,newHex:newReach,current:E.TACTICAL_RANGE,reachabilityDeltaPercent:{ranged:Number(((newReach.ranged-oldReach.ranged)/oldReach.ranged*100).toFixed(4)),eliteRanged:Number(((newReach.eliteRanged-oldReach.eliteRanged)/oldReach.eliteRanged*100).toFixed(4))}},checks:{passed:checks,failed:0,result:"PASS"},release:{path:htmlPath,sha256:releaseHash},artStatus:"H1 changes geometry only; H2-H4 genuine action-frame animation and H5 internet-source art removal remain incomplete."};
fs.mkdirSync(path.join("docs","qa","hg33"),{recursive:true});fs.writeFileSync(path.join("docs","qa","hg33","H1-hex-engine.json"),JSON.stringify(receipt,null,2)+"\n");
console.log(`HG33 H1 HEX ENGINE ${checks}/${checks} PASS · Save v07 unchanged · receipt docs/qa/hg33/H1-hex-engine.json`);
