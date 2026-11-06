"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
for(const name of ["data","engine","hg04","hg05","hg06","hg07","hg08","hg10","painter"])require("./"+name+".js");
const E=globalThis.HOG_ENGINE,P=globalThis.HOG_PAINTER;
assert.ok(E&&P);
const dims={width:1176,height:550},grid=E.BATTLE_GRID;
assert.equal(grid.cols,12);assert.equal(grid.rows,9);
assert.equal(E.battleHex.orientation,'pointy-top');assert.equal(E.battleHex.layout,'odd-r');
let checks=0;
const field=P.battleProjection(dims,E),cells=P.battleGridCells(field),bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
assert.equal(cells.length,108);checks++;
for(const cell of cells){
 assert.equal(cell.corners.length,6,'real hex polygon '+cell.x+','+cell.y);checks++;
 for(const corner of cell.corners){
  assert(Math.abs(Math.hypot(corner.x-cell.center.x,corner.y-cell.center.y)-field.radius)<1e-7);
  bounds.left=Math.min(bounds.left,corner.x);bounds.top=Math.min(bounds.top,corner.y);
  bounds.right=Math.max(bounds.right,corner.x);bounds.bottom=Math.max(bounds.bottom,corner.y);checks++;
 }
 const picked=P.battleCellAt(dims,cell.center.x,cell.center.y,E);
 assert.deepEqual(picked,{x:cell.x,y:cell.y},'center inverse '+cell.x+','+cell.y);checks++;
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3-Math.PI/2,px=cell.center.x+field.radius*.68*Math.cos(a),py=cell.center.y+field.radius*.68*Math.sin(a);
  assert.deepEqual(P.battleCellAt(dims,px,py,E),{x:cell.x,y:cell.y},'interior hit '+cell.x+','+cell.y+':'+i);checks++;
 }
}
assert(bounds.left>=-1&&bounds.top>=-1&&bounds.right<=dims.width+1&&bounds.bottom<=dims.height+1,'all 108 hexes fit battlefield');checks++;
assert.equal(P.battleCellAt(dims,-10,-10,E),null);checks++;
const even=field.center(3,2),odd=field.center(3,3),next=field.center(4,2),horizontal=field.center(4,2),vertical=field.center(3,3);
assert(Math.abs((odd.x-even.x)-Math.sqrt(3)*field.radius*.5)<1e-7,'odd rows shift half a cell');checks++;
assert(Math.abs(Math.hypot(next.x-even.x,next.y-even.y)-Math.sqrt(3)*field.radius)<1e-7,'neighbor centers have regular hex spacing');checks++;
assert.equal(E.battleHex.distance({x:3,y:2},{x:4,y:2}),1);assert.equal(E.battleHex.distance({x:3,y:2},{x:3,y:3}),1);checks++;
assert(horizontal.x>field.center(3,2).x&&vertical.y>field.center(3,2).y,'pointy-top odd-r axes are oriented correctly');checks++;
assert(!fs.readFileSync('painter.js','utf8').includes('poly(c,outline'),'no rhombus/oblique board remains');checks++;
const state=E.make("orc",1_000_000,"china2009"),camp=E.NPC_CAMPS_2009.find(c=>c.stars===1);
assert.ok(camp);state.battle=E.makeBattle(state,camp.key);assert.ok(state.battle);
let drawCalls=0;
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{
 get(obj,key){if(key in obj)return obj[key];if(key==="measureText")return ()=>({width:60});if(typeof key==="symbol")return undefined;return ()=>{drawCalls++}},
 set(obj,key,val){obj[key]=val;return true}
});
const canvas={...dims,getContext(){return ctx}};
P.drawBattle(canvas,E,state);
assert.ok(drawCalls>300,"draw count "+drawCalls);checks++;
for(const unit of [...state.battle.allies,...state.battle.enemies].filter(u=>u.pool>0)){
 const {x:px,y:py}=P.battleProjection(dims,E).center(unit.x,unit.y);
 assert.equal(P.battleHit(canvas,px,py,E,state)?.id,unit.id,"unit hit "+unit.id);checks++;
}
const app=fs.readFileSync("app.js","utf8"),css=fs.readFileSync("style-hg03.css","utf8");
assert.match(app,/classList\.toggle\('combat-mode'/);checks++;
assert.match(app,/P\.battleCellAt\(canvas,x,y,E\)/);checks++;
assert.match(css,/body\.combat-mode \.top,body\.combat-mode \.tabs,body\.combat-mode \.sidebar\{display:none!important\}/);checks++;
const htmlPath="Play-Heoofgaia-HG11.html";
if(fs.existsSync(htmlPath)){
 const html=fs.readFileSync(htmlPath,"utf8");
 assert.ok(html.includes("function battleProjection(canvas,E)"),"offline build embeds the live battlefield renderer");checks++;
 assert.ok(html.includes("HG33-H1: one real pointy-top odd-r hex projection"),"offline build uses the tested hex geometry");checks++;
 assert.ok(html.includes("body.combat-mode .battle-frame"),"offline build embeds viewport CSS");checks++;
}
console.log("HG09 viewport QA PASS:",checks,"checks; rendered calls:",drawCalls);
