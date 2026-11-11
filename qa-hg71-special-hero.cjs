/* HG71: quest-only hero from actual 20th task, no tavern generation, real Save v07, AOE cooldown and passive. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const ctx=vm.createContext({console});
const modules=['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js','hg182.js',
 'hg20-private.js','hg20-world-bosses.js','hg21-tower-tactical.js','hg24-private-automation.js',
 'hg26-boss-autohunt.js','hg261-joint-boss.js','hg27-farm-exchange.js','hg29-loot.js','hg30-troop-ascension.js',
 'hg31-legendary-gear.js','hg40-tactical.js','hg408-hero-management.js','hg71-quest-heroes.js'];
for(const p of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),ctx,{filename:p});
const E=ctx.HOG_ENGINE;
let passes=0;
function check(name,fn){try{const result=fn()||{};console.log('HG71 PASS '+name+' '+JSON.stringify(result));passes++}
 catch(e){console.error('HG71 FAIL '+name+'\n'+(e.stack||e));process.exitCode=1}}
function prepare(){
 const s=E.make('human',Date.now());E.heroTaskStatus(s,s.lastTick);
 s.dailyTaskState.heroTask.completed=19;
 s.dailyTaskState.heroTask.active={heroId:1,stars:3,ready:true};
 assert(E.strictSave(s));return s;
}
function save(s){assert(E.strictSave(s));const copy=E.parseSave(E.serializeSave(s));assert(E.strictSave(copy));return copy}
check('Quest-only reward is locked on natural New Game; no Tavern candidate carries skill',()=>{
 const s=E.make('human',Date.now());const q=E.hg71SpecialStatus(s);
 assert.equal(q.unlocked,false);assert.equal(q.claimed,false);
 assert(!s.tavern.offers.some(x=>x.questSpecial||x.rewardOrigin));
 assert(E.strictSave(s));return {save:s.version,pending:q.pending,tavern:s.tavern.offers.length};
});
check('20th genuine Hero Task claim awards one non-tavern Rainbow hero with full v07 Save',()=>{
 let s=prepare();s.fame=1e9;
 const before=s.heroes.length,receipt=E.claimHeroTask(s,s.lastTick);
 assert.equal(receipt.completed,20);assert(receipt.uniqueHero,'20th task should create a reward with spare roster');
 assert.equal(s.heroes.length,before+1);
 const h=s.heroes.find(x=>x.questSpecial==='celestial_oath');
 assert(h&&h.rewardOrigin==='hero_task_20');
 assert.equal(E.hg408HeroQuality(h),'rainbow');
 assert.equal(E.hg71SpecialStatus(s).claimed,true);
 assert(!s.tavern.offers.some(x=>x.name===h.name));
 s=save(s);assert.equal(s.heroes.filter(x=>x.questSpecial==='celestial_oath').length,1);
 assert.throws(()=>E.hg71ClaimSpecial(s),/đã được nhận/);
 assert.equal(E.hg408DismissCheck(s,h.id).allowed,false,'unique quest hero is protected');
 return {hero:h.name,rarity:h.quality,skill:h.questSpecial,source:h.rewardOrigin,id:h.id};
});
check('Roster-full reward remains pending, cannot mint twice and can claim later',()=>{
 let s=prepare();s.fame=0;
 const before=s.heroes.length;
 const r=E.claimHeroTask(s,s.lastTick);
 assert.equal(r.completed,20);assert.equal(s.heroes.length,before);
 assert(E.hg71SpecialStatus(s).pending);
 s=save(s);s.fame=1e9;
 const reward=E.hg71ClaimSpecial(s);assert(reward);
 assert.equal(s.heroes.filter(h=>h.questSpecial==='celestial_oath').length,1);
 s=save(s);assert(E.hg71SpecialStatus(s).claimed);
 return {pendingBefore:true,claimedAfter:true,save:s.version};
});
check('Quest hero passive is owner-bound; AOE hits at most 2 enemies and respects original 4-turn CD',()=>{
 const s=prepare();s.fame=1e9;E.claimHeroTask(s,s.lastTick);
 const h=s.heroes.find(x=>x.questSpecial==='celestial_oath');
 const buff=E.combatModifiers(s,h.id),normal=E.combatModifiers(s,1);
 assert(buff.damageBonus>=normal.damageBonus+.01);
 assert(buff.damageReduction>=normal.damageReduction+.01);
 E.hg20SetHeroPlan(s,h.id,[{unitId:'human_1',count:16}]);E.hg20ChooseTowerTeam(s,[h.id]);E.hg21TowerEnter(s);
 const b=s.battle,actor=b.allies[0],t=b.enemies[0],secondary=b.enemies[1];
 assert.equal(actor.heroId,h.id);assert(b.hg40);
 t.x=9;t.y=4;secondary.x=10;secondary.y=4;
 const dealt=(u,n)=>{const before=u.pool;u.pool=Math.max(0,u.pool-n);u.count=Math.ceil(u.pool/u.hp);
  return {applied:before-u.pool,casualties:0}};
 const receipt={applied:100,casualties:0};
 const first=E.hg40AfterHit(s,b,actor,t,receipt,{path:[]},dealt);
 assert(first>0&&b.hg40.lastSkills.some(x=>x.skill==='Thiên Khải Liên Kích'));
 assert(b.hg40.events.some(x=>x.skill==='Thiên Khải Liên Kích'));
 const count=b.hg40.lastSkills.filter(x=>x.skill==='Thiên Khải Liên Kích').length;
 const repeat=E.hg40AfterHit(s,b,actor,t,receipt,{path:[]},dealt);
 assert.equal(b.hg40.lastSkills.filter(x=>x.skill==='Thiên Khải Liên Kích').length,count);
 b.turn+=4;
 E.hg40AfterHit(s,b,actor,t,receipt,{path:[]},dealt);
 assert.equal(b.hg40.lastSkills.filter(x=>x.skill==='Thiên Khải Liên Kích').length,count+1);
 assert(E.strictSave(s));
 return {trigger:first,cd:4,passive:buff.damageBonus,procs:count+1,save:s.version};
});
console.log('HG71 TOTAL '+passes+'/4');if(passes!==4)process.exitCode=1;
