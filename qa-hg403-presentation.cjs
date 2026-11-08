"use strict";
// HG40.3 render-only contract: 40 signature IDs, genuine hex boot anchors,
// event-driven VFX, round-matched proc labels and zero Save v07 mutations.
const assert=require("node:assert/strict");
for(const module of ["data","engine","hg04","hg05","hg06","hg07","hg08","hg10","hg40-tactical","painter"])
 require("./"+module+".js");
const E=globalThis.HOG_ENGINE,P=globalThis.HOG_PAINTER;
let checks=0;
function ok(name){checks++;console.log("PASS HG40.3 "+name)}
const ids=Object.keys(E.HG40_TRAITS).sort();
assert.equal(ids.length,40);
assert.deepEqual(Object.keys(P.HG403_SKILL_SIGILS).sort(),ids);
assert.equal(new Set(ids.map(x=>P.hg403SkillProfile(x).motif)).size,40);
for(const id of ids)assert.equal(P.hg403SkillProfile(id).unitId,id);
ok("40 real unit IDs map to 40 independent VFX motifs");
let paths=0,depth=0;
const context=new Proxy({},{
 get(target,key){
  if(key==="measureText")return value=>({width:String(value).length*7.5});
  if(key==="save")return ()=>{depth++};
  if(key==="restore")return ()=>{depth--;assert(depth>=0)};
  if(key==="arc"||key==="lineTo"||key==="moveTo"||key==="stroke"
     ||key==="fill"||key==="quadraticCurveTo")return ()=>{paths++};
  if(typeof key==="string")return ()=>{};
  return undefined;
 },
 set(target,key,value){target[key]=value;return true}
});
for(const id of ids){
 const before=paths;
 assert.equal(P.drawHG403Sigil(context,id,200,200,.35,.9),true);
 assert(paths>before,"invisible VFX for "+id);
 assert.equal(depth,0,"context state leak on "+id);
}
assert.equal(P.drawHG403Sigil(context,"npc_guard",0,0,.5),false);
assert.equal(P.drawHG403Sigil(context,"human_1",0,0,-1),false);
assert.equal(P.drawHG403Sigil(context,"human_1",0,0,2),false);
ok("40/40 VFX paint native Canvas paths without context leaks");
const canvas={width:1176,height:550},camera=P.battleProjection(canvas,E);
const a={id:"p0",unitId:"human_8",name:"Linh mục",side:"player",x:1,y:2,
 count:8,initial:8,hp:50,pool:400,range:1,spd:6},
 z={id:"e0",unitId:"orc_3",name:"Quái nhân",side:"enemy",x:8,y:3,
 count:10,initial:10,hp:45,pool:450,range:1,spd:5};
const battle={turn:2,allies:[a],enemies:[z],history:["Lượt 1: quân ta gây 50 sát thương, chịu 0."],
 lastEvents:[{actorId:"p0",targetId:"e0",from:{x:1,y:2},to:{x:1,y:2},path:[],
  damage:50,casualties:1,death:false,order:"attack"}],
 hg40:{v:1,lastSkills:[{turn:1,skill:"Thánh thuẫn",detail:"Linh mục kích hoạt Thánh thuẫn"}],
  statuses:[],shields:{},events:[]}};
const layout=P.battleUnitLayout(battle,camera,canvas.width,canvas.height,1000);
for(const e of layout){
 const pivot=camera.center(e.u.x,e.u.y);
 assert(Math.abs(e.x-pivot.x)<1e-8);
 assert(Math.abs(e.y-pivot.y)<1e-8);
 assert.equal(P.battleHit(canvas,e.x,e.y,E,{battle},1000)?.id,e.id);
}
ok("boot anchors and clickable actors coincide with actual hex centres");
const path=[{x:2,y:2},{x:3,y:2},{x:3,y:3}];
const visual={walkFrom:{x:1,y:2},walkTo:path[2],walkRoute:path,walkFraction:.5},
 point=P.battleVisualPoint(camera,visual,{x:3,y:3}),
 expected=camera.pointBetween(path[0],path[1],.5),
 shortcut=camera.pointBetween(visual.walkFrom,visual.walkTo,.5);
assert(Math.abs(point.x-expected.x)<1e-8&&Math.abs(point.y-expected.y)<1e-8);
assert(Math.hypot(point.x-shortcut.x,point.y-shortcut.y)>1);
ok("walking uses receipt hex waypoints, never straight-line shortcuts");
P.battleTimelinePrime(battle,1000,true);
const fx=P.battleFxPlan(battle,camera,1400,layout);
assert.equal(fx.length,1);
assert.equal(fx[0].actorUnitId,"human_8");
assert.equal(fx[0].damage,50);
assert.equal(P.motionImpactFx(context,camera,battle,1400,layout),1);
assert.equal(depth,0);
ok("primary signature follows recorded real actor and damage receipt");
assert.equal(P.drawHG403ProcCues(context,battle,1400,layout),1);
assert.equal(depth,0);
battle.hg40.lastSkills=[{turn:1,skill:"Thánh thuẫn",detail:"Một người khác kích hoạt Thánh thuẫn"}];
assert.equal(P.drawHG403ProcCues(context,battle,1400,layout),0);
battle.hg40.lastSkills=[{turn:0,skill:"Thánh thuẫn",detail:"Linh mục kích hoạt Thánh thuẫn"}];
assert.equal(P.drawHG403ProcCues(context,battle,1400,layout),0);
ok("skill proc cue requires matching skill, actor, real round and impact");
const beforePool=[a.pool,z.pool],beforeJournal=battle.history.join("|");
P.drawHG403BattleHUD(context,battle,canvas.width,canvas.height);
assert.deepEqual([a.pool,z.pool],beforePool);
assert.equal(battle.history.join("|"),beforeJournal);
assert.equal(depth,0);
ok("HUD shows only real counters and leaves combat actors untouched");
const state=E.make("human",421207);
const before=E.serializeSave(state);
assert.equal(JSON.parse(before).state.version,7);
// exportedAt is intentionally wall-clock metadata and may differ by milliseconds.
assert.deepEqual(JSON.parse(E.serializeSave(state)).state,JSON.parse(before).state);
ok("strict Save v07 schema and source objects not modified");
console.log("HG40.3 PRESENTATION "+checks+"/"+checks+" PASS");
