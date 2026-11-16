/* HG94 — canonical territory battle/ownership/economy/save regression.
 * Synthetic defender HP adjustment is restricted to QA and disclosed.
 * Any failure exits nonzero; never count syntax as gameplay PASS. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({console,Date,Math});
const files='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg42-boss-screen.js hg43-troop-profiles.js hg71-quest-heroes.js hg73-gear-prestige.js hg81-hero-progression.js hg82-city-heroes.js hg88-tower-hero-cards.js hg89-mythic-heroes.js hg90-mythic-progression.js hg93-world-realms.js hg94-territory.js'.split(' ');
for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE;
let passed=0;
function check(name,fn){try{const info=fn();passed++;console.log('HG94 PASS',name,JSON.stringify(info||{}))}catch(e){process.exitCode=1;console.error('HG94 FAIL',name,e.stack||String(e))}}
const s=E.make('human',1700000000000);
const originalSave=E.serializeSave(s);
const nearby=E.TILES.find(t=>t.kind==='empty'&&t.terrain!=='water'&&t.x>=3&&t.x<=8&&t.y>=2&&t.y<=8&&t.key!=='3,4'&&E.pathfind('3,4',t.key));
const water=E.TILES.find(t=>t.kind==='empty'&&t.terrain==='water');
check('Four-realm Save v07 and native landscape targets',()=>{
 assert(nearby&&water,'missing suitable land/water target');
 assert.equal(E.TILES.length,40000);assert.equal(s.hg94.claims.length,0);
 assert(E.strictSave(s));assert.equal(E.hg94Quote(s,nearby.key).action,'territory');
 assert.equal(E.hg94Quote(s,water.key).available,false);
 const old=JSON.parse(originalSave);delete old.state.hg94;
 const migrated=E.parseSave(JSON.stringify(old));
 assert.equal(migrated.hg94.version,1);assert(E.strictSave(migrated));
 return {land:nearby.key,water:water.key,save:7};
});
check('Failed preconditions never debit AP or mint territory',()=>{
 const ap=s.ap;
 assert.throws(()=>E.startMarch(s,nearby.key,'territory-farm'),/Chưa chiếm/);
 assert.throws(()=>E.startMarch(s,water.key,'territory'),/Chọn ô đất/);
 assert.equal(s.ap,ap);assert.equal(s.hg94.claims.length,0);
 return {ap};
});
let productionBefore=0;
check('Real march and battle at terrain tile keep strict save',()=>{
 productionBefore=E.rate(s)[E.hg94Quote(s,nearby.key).resource||'gold'];
 E.startMarch(s,nearby.key,'territory');
 assert.equal(s.ap,92);assert.equal(s.march.targetKind,'territory');
 assert(E.strictSave(s));
 s.march.remaining=.01;E.tick(s,s.lastTick+1000);
 assert.equal(s.battle?.kind,'npc');assert.equal(s.battle.hg94Action,'territory');
 assert(E.strictSave(s));return {kind:s.battle.kind,stacks:s.battle.enemies.length};
});
function winBattle(){
 // QA-only deterministic weak defenders to exercise the exact real
 // combat resolution, casualty, XP, log and Save v07 authorities.
 const b=s.battle;
 for(const u of b.allies){u.range=20;u.atk=100000;u.spd=100}
 for(const e of b.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0;e.def=0}
 let out=null,turns=0;
 while(s.battle&&turns++<20)out=E.battleAct(s,'attack');
 assert.equal(out?.type,'win','expected real victory before 20 turns');
 return {out,turns};
}
check('Victory owns territory exactly once, raises matching city production',()=>{
 const {out,turns}=winBattle();
 assert(out.hg94Claim);assert(E.hg94IsClaimed(s,nearby.key));
 assert.equal(s.hg94.claims.length,1);
 assert.equal(E.hg94Quote(s,nearby.key).action,'territory-farm');
 const res=E.hg94Quote(s,nearby.key).resource;
 assert(E.rate(s)[res]>productionBefore);
 assert(E.strictSave(s));return {turns,claimed:nearby.key,resource:res};
});
check('No duplicate claim, repeatable combat farming and v07 roundtrip',()=>{
 if(s.march?.phase==='return'){s.march.remaining=.01;E.tick(s,s.lastTick+1000)}
 assert(E.strictSave(s));
 const beforeAP=s.ap;
 assert.throws(()=>E.startMarch(s,nearby.key,'territory'),/đã thuộc/);
 assert.equal(s.ap,beforeAP);
 E.startMarch(s,nearby.key,'territory-farm');
 assert.equal(s.ap,beforeAP-8);
 s.march.remaining=.01;E.tick(s,s.lastTick+1000);
 assert.equal(s.battle.hg94Action,'territory-farm');
 const {out}=winBattle();assert(out.hg94Farm&&!out.hg94Claim);
 assert.equal(s.hg94.claims.length,1);
 const round=E.parseSave(E.serializeSave(s));
 assert.equal(round.hg94.claims.length,1);assert(E.strictSave(round));
 const corrupt=E.clone(round);corrupt.hg94.claims.push(corrupt.hg94.claims[0]);
 assert(!E.strictSave(corrupt),'duplicate claims must be rejected');
 return {claimCount:round.hg94.claims.length,farm:true,save:round.version};
});
console.log('HG94 SUMMARY '+passed+'/5');
if(passed!==5)process.exitCode=1;
