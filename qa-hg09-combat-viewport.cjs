"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
for(const name of ["data","engine","hg04","hg05","hg06","hg07","hg08","hg10","painter"])require("./"+name+".js");
const E=globalThis.HOG_ENGINE,P=globalThis.HOG_PAINTER;
assert.ok(E&&P);
const dims={width:1176,height:550},grid=E.BATTLE_GRID;
assert.equal(grid.cols,12);assert.equal(grid.rows,9);
let checks=0;
for(let x=0;x<grid.cols;x++)for(let y=0;y<grid.rows;y++){
 const {x:px,y:py}=P.battleProjection(dims,E).point(x+.5,y+.5);
 assert.deepEqual(P.battleCellAt(dims,px,py,E),{x,y},"project inverse "+x+","+y);checks++;
}
assert.equal(P.battleCellAt(dims,-10,-10,E),null);checks++;
const iso=P.battleProjection(dims,E),top=iso.point(0,0),right=iso.point(grid.cols,0),bottom=iso.point(grid.cols,grid.rows),left=iso.point(0,grid.rows);
assert.equal(iso.col.x,-iso.row.x,'symmetric isometric horizontal vectors');checks++;
assert.equal(iso.col.y,iso.row.y,'symmetric isometric depth vectors');checks++;
assert.equal(iso.col.x,2*iso.col.y,'2:1 isometric tile ratio');checks++;
assert(Math.abs((right.x+left.x)/2-dims.width/2)<1e-6,'horizontal center');checks++;
assert(top.y>70&&bottom.y<dims.height-30,'whole diamond fits scene');checks++;
assert(left.x>90&&right.x<dims.width-90,'side sprite clearance');checks++;
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
 const {x:px,y:py}=P.battleProjection(dims,E).point(unit.x+.5,unit.y+.5);
 assert.equal(P.battleHit(canvas,px,py,E,state)?.id,unit.id,"unit hit "+unit.id);checks++;
}
const app=fs.readFileSync("app.js","utf8"),css=fs.readFileSync("style-hg03.css","utf8");
assert.match(app,/classList\.toggle\('combat-mode'/);checks++;
assert.match(app,/P\.battleCellAt\(canvas,x,y,E\)/);checks++;
assert.match(css,/body\.combat-mode \.top,body\.combat-mode \.tabs,body\.combat-mode \.sidebar\{display:none!important\}/);checks++;
const htmlPath="Play-Heoofgaia-HG11.html";
if(fs.existsSync(htmlPath)){
 const html=fs.readFileSync(htmlPath,"utf8");
 assert.ok(html.includes("function battleProjection(canvas,E)"),"offline build embeds isometric camera");checks++;
 assert.ok(html.includes("body.combat-mode .battle-frame"),"offline build embeds viewport CSS");checks++;
}
console.log("HG09 viewport QA PASS:",checks,"checks; rendered calls:",drawCalls);
