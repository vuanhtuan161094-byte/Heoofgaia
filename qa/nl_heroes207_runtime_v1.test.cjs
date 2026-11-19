'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pack=JSON.parse(fs.readFileSync(path.join(root,'data/ngoalong/alpha_content.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'tools/nl_heroes207_runtime_v1.js'),'utf8');
let checks=0;
function check(value,label){assert.ok(value,label);checks++;}
const original=pack.heroes.projectRoster;
check(original.length===14,'14 preexisting generals retained');
check(Object.keys(pack.skills.heroById).length===14,'14 old skill descriptors retained');
check(pack.heroes.hero207Roster.length===207,'207 new hero profiles');
check(Object.keys(pack.skills.hero207ById).length===207,'207 new combat skill descriptors');
check(Object.keys(pack.heroes.hero207Unlocks).length===207,'207 campaign unlock gates');
const idx=new Set(),skills=new Set();
for(const row of pack.heroes.hero207Roster){
 const gate=pack.heroes.hero207Unlocks[row.id],skill=pack.skills.hero207ById[row.id];
 check(!idx.has(row.id),'unique hero '+row.id);idx.add(row.id);
 check(!skills.has(skill.tag),'unique active text '+row.id);skills.add(skill.tag);
 check(row.provenance.classification==='SIMULATED'&&gate.provenance.classification==='SIMULATED'&&skill.provenance.classification==='SIMULATED','SIMULATED source '+row.id);
 check(Number.isInteger(gate.stage)&&gate.stage>=1&&gate.stage<=28&&gate.recruitOnlyAfterClear,'stage gate '+row.id);
 check(gate.silverCost>=950&&gate.oneTime,'positive price + once '+row.id);
 check(['physical','tactic','magic'].includes(skill.kind),'damage lane '+row.id);
 check(['single','double','column','row','all','back','heal'].includes(skill.pattern),'combat execution pattern '+row.id);
 check(skill.mult>0&&skill.mult<=2.2,'bounded skill damage '+row.id);
}
function sandbox(initial){
 const game=initial||{roster:['liu'],hero:{liu:{level:1,xp:0,troops:150}},silver:1e8,cleared:[1],troopModes:{},slots:[null,null,null,null,null,null,null,null,null]};
 let saved=0,rendered=0,charged=0;
 const heroes=Object.fromEntries(original.map(x=>[x.id,{...x}]));
 const combat=Object.fromEntries(Object.entries(pack.skills.heroById).map(([id,v])=>[id,{...v}]));
 const fake={
 NL_GAME_DATA:pack,game,HEROES:heroes,P2_SKILLS:combat,battle:null,
 document:{addEventListener(type,fn){ if(type==='click')this.click=fn }},
 window:{__P2_ENABLE_QA__:true},
 hydrateExtension(){},
 renderHeroes(){return '<section>LEGACY_HEROES</section>';},
 nlRebuildHub(){return '<section>LEGACY_HUB</section>';},
 esc(value){return String(value).replace(/[&<>"']/g,'')},
 payment(cost){if(game.silver<(cost.silver||0))return false;game.silver-=cost.silver||0;charged++;return true},
 countTask(){},log(){},toast(){},
 save(){saved++},render(){rendered++}
 };
 vm.runInNewContext(source,fake,{filename:'nl_heroes207_runtime_v1.js',timeout:2500});
 return {game,heroes,combat,api:fake.window.__NL_HERO207_QA__,fake, get saved(){return saved},get charged(){return charged},get rendered(){return rendered}};
}
const testCtx=sandbox();
check(testCtx.api.count===207&&testCtx.api.saveSchema===5,'safe Save-v5 adapter');
check(testCtx.api.originalHeroesRemainUntouched,'legacy 14 remain fixed');
check(Object.keys(testCtx.heroes).length===14&&Object.keys(testCtx.combat).length===14,'unowned 207 cannot leak into legacy free recruit pool');
check(testCtx.fake.renderHeroes().includes('207 nhân vật'),'legacy heroes UI enhanced');
check(testCtx.fake.nlRebuildHub().includes('207 tướng'),'command hub integration');
const first=pack.heroes.hero207Roster.find(h=>pack.heroes.hero207Unlocks[h.id].stage===1);
check(Boolean(first),'stage 1 exists');
const gate=pack.heroes.hero207Unlocks[first.id];
testCtx.game.cleared=[];check(!testCtx.api.canRecruit(first.id),'cannot recruit before stage');
testCtx.game.cleared=[1];
testCtx.game.silver=gate.silverCost-1;check(!testCtx.api.canRecruit(first.id),'insufficient silver blocked');
testCtx.game.silver=gate.silverCost+3000;
const before=testCtx.game.silver;
check(testCtx.api.recruit(first.id)===true,'first recruitment works after clear');
check(testCtx.game.silver===before-gate.silverCost,'single silver charge');
check(testCtx.game.roster.includes(first.id)&&testCtx.game.hero[first.id].level===1&&testCtx.game.hero[first.id].troops>0,'one real saved hero state');
check(Boolean(testCtx.heroes[first.id])&&Boolean(testCtx.combat[first.id]),'registered in active battle registries');
check(testCtx.api.recruit(first.id)===false&&testCtx.game.silver===before-gate.silverCost&&testCtx.charged===1,'duplicate/replay cannot reward twice');
check(testCtx.saved===1&&testCtx.rendered===1,'one Save and render');
const snapshot=JSON.parse(JSON.stringify(testCtx.game));
const reloaded=sandbox(snapshot);
check(reloaded.api.owned()===1&&reloaded.heroes[first.id]&&reloaded.combat[first.id],'Save-v5 reload restores recruited hero/skill');
reloaded.fake.battle={mode:'campaign'};check(!reloaded.api.canRecruit(first.id),'owned hero blocked even during battle');
const all=sandbox({roster:['liu'],hero:{liu:{level:1,xp:0,troops:150}},silver:1000000000,cleared:Array.from({length:28},(_,i)=>i+1),troopModes:{},slots:Array(9).fill(null)});
for(const entry of pack.heroes.hero207Roster){check(all.api.recruit(entry.id)===true,'campaign 1-28 makes selectable '+entry.id);}
check(all.api.owned()===207&&all.game.roster.length===208,'207 can become owned independently, still 9 slots');
check(Object.keys(all.heroes).length===221&&Object.keys(all.combat).length===221,'all 221 battle registries loaded');
check(all.game.slots.every(x=>x===null),'deployed formation does not auto-change');
const restored=sandbox(JSON.parse(JSON.stringify(all.game)));
check(restored.api.owned()===207&&Object.keys(restored.heroes).length===221,'full Save v5 reload');
console.log('Hero207 VM focused QA: '+checks+'/'+checks+' PASS, 28 stage gates, 207 recruits, legacy 14, single-charge, Save v5 reload.');
