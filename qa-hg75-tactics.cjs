/* HG75 tactical audit: exact hex budgets, target priority, retreat and real terminal settlement. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sources='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg71-quest-heroes.js hg73-gear-prestige.js'.split(' ');
const ctx=vm.createContext({console,Date,Math});
for(const file of sources)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,checks=[];
function check(label,fn){try{const value=fn()||{};console.log('HG75 PASS '+label+' '+JSON.stringify(value));checks.push({label,passed:true,value})}catch(err){console.error('HG75 FAIL '+label+' '+(err.stack||err));checks.push({label,passed:false,error:String(err.stack||err)});process.exitCode=1}}
function fresh(){
 const s=E.make('human',1000000);
 s.army.human_1=16;s.army.human_3=4;s.ap=900;
 E.hg20SetHeroPlan(s,s.activeHero,[{unitId:'human_1',count:8},{unitId:'human_3',count:2}]);
 const tile=E.TILES.find(t=>t.kind==='npc'&&t.level===1&&(t.eliteTier||0)<11);
 assert(tile);
 E.startMarch(s,tile.key);
 for(let i=0;i<20&&s.march;i++)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 assert(s.battle);
 assert(E.strictSave(s));
 return s;
}
function roundtrip(s){assert(E.strictSave(s),'Save v07 invalid');const copy=E.parseSave(E.serializeSave(s));assert(E.strictSave(copy));return copy}
check('40 units: independent weapon range and legal 1-3 hex movement',()=>{
 const rows=Object.values(E.C.units).flat();
 assert.equal(rows.length,40);
 const expected={human_3:4,human_6:3,human_8:3,elf_4:4,elf_8:5,orc_3:3,orc_8:4,undead_6:4,undead_8:5};
 for(const u of rows){const r=E.unitTacticalRange(u);assert(r>=1&&r<=5);assert.equal(r===1,u.type!=='Ranged');if(expected[u.id])assert.equal(r,expected[u.id],u.id)}
 const s=fresh(),b=s.battle,u=b.allies.find(a=>a.range===1),archer=b.allies.find(a=>a.range>1);
 assert(u&&archer);
 const results={};
 for(const speed of [4,7,9,50]){u.spd=speed;results['melee'+speed]=E.battleMovePreview(b,u.id).steps}
 for(const speed of [7,10,11]){archer.spd=speed;results['ranged'+speed]=E.battleMovePreview(b,archer.id).steps}
 assert.equal(results.melee4,1);assert.equal(results.melee7,2);assert.equal(results.melee9,3);assert.equal(results.melee50,3);
 assert.equal(results.ranged7,1);assert.equal(results.ranged10,1);assert.equal(results.ranged11,2);
 return {tested:rows.length,roles:expected,results};
});
check('AI attacks reachable targets before distant high-power targets',()=>{
 const s=fresh(),b=s.battle,u=b.allies.find(a=>a.range>1);
 assert(b.enemies.length>=2);
 u.x=1;u.y=3;b.enemies[0].x=4;b.enemies[0].y=3;
 b.enemies[1].x=10;b.enemies[1].y=3;
 b.enemies[1].count=Math.max(b.enemies[1].count,400);
 b.enemies[1].initial=Math.max(b.enemies[1].initial,400);
 b.enemies[1].pool=b.enemies[1].count*b.enemies[1].hp;
 assert(E.battleHex.distance(u,b.enemies[0])<=u.range);
 assert(E.battleHex.distance(u,b.enemies[1])>u.range);
 b.focused=null;b.lastTargets={};
 const out=E.battleAct(s,'attack',{stableTargets:true});
 const event=b.lastEvents.find(q=>q.actorId===u.id);
 assert(event&&event.targetId===b.enemies[0].id,'AI chased a distant target');
 assert(event.damage>0,'AI could not hit a reachable target');
 return {target:event.targetId,damage:event.damage,outcome:out.type};
});
check('Retreat follows valid free hex neighbors without teleport or collision',()=>{
 const s=fresh(),b=s.battle,u=b.allies.find(a=>a.range===1);
 u.x=6;u.y=4;b.selected=u.id;
 const from={x:u.x,y:u.y},steps=E.battleMovePreview(b,u.id).steps;
 const result=E.battleAct(s,'retreat'),event=b.lastEvents.find(e=>e.actorId===u.id);
 assert(event&&event.order==='retreat');assert(event.path.length<=steps);
 let prev=from;for(const p of event.path){assert.equal(E.battleHex.distance(prev,p),1);prev=p}
 assert(![...b.allies,...b.enemies].some(a=>a.id!==u.id&&a.pool>0&&a.x===u.x&&a.y===u.y));
 assert.equal(E.battleHex.distance(u,event.to),0);
 assert(E.strictSave(s));return {path:event.path,from,to:event.to,result:result.type};
});
check('Surrender real NPC battle: one loss report, no victory loot or extra casualties',()=>{
 const s=fresh(),gold=s.res.gold,fame=s.fame,own=s.army.human_1,reports=s.battleReports.length;
 const out=E.battleAct(s,'surrender');
 assert.equal(out.type,'lose');assert.equal(out.surrendered,true);assert.equal(s.battle,null);
 assert.equal(s.battleReports.length,reports+1);assert.equal(s.battleReports[0].outcome,'lose');
 assert.equal(s.res.gold,gold);assert.equal(s.fame,fame);assert.equal(s.army.human_1,own);
 roundtrip(s);return {outcome:out.type,reportId:out.reportId};
});
check('Surrender Tower consumes one endurance life without real casualties',()=>{
 const s=E.make('human',1000000);E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:16}]);
 E.hg20ChooseTowerTeam(s,[1]);E.hg21TowerEnableEndurance(s);E.hg21TowerEnter(s);
 const before=s.hg20.tower.claims,money=s.res.gold,army=s.army.human_1;
 const out=E.battleAct(s,'surrender');
 assert.equal(out.type,'lose');assert.equal(s.hg20.tower.claims,before+1);
 assert.equal(s.hg20.tower.floor,1);assert.equal(s.res.gold,money);
 assert.equal(s.army.human_1,army);roundtrip(s);
 return {livesSpent:s.hg20.tower.claims,awarded:out.claimed,remainingArmy:army};
});
check('Fast resolve uses real battleAct to exactly one terminal outcome',()=>{
 const s=fresh(),reports=s.battleReports.length;let out={type:'continue'},turns=0;
 for(;s.battle&&turns<72;turns++){out=E.battleAct(s,'attack',{stableTargets:true,preserveMoveOrders:true});if(out.type!=='continue')break}
 assert(!s.battle,'battle did not finish after 70-turn engine limit');
 assert(['win','lose','timeout','retreat'].includes(out.type));
 assert.equal(s.battleReports.length,reports+1);
 roundtrip(s);
 return {turns:turns+1,outcome:out.type,reportId:out.reportId};
});
fs.mkdirSync(path.join(__dirname,'docs/qa/hg75'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'docs/qa/hg75/tactics.json'),JSON.stringify({suite:'HG75 tactical consistency and real terminal settlement',checks,passed:checks.filter(x=>x.passed).length,total:checks.length},null,2)+'\n');
console.log('HG75 SUMMARY '+checks.filter(x=>x.passed).length+'/'+checks.length);
if(checks.some(x=>!x.passed))process.exitCode=1;
