/* HG42: exact real engine and Canvas tests. QA-only battle fixtures never
 * reward the game or alter hero/troop economy. One game / Save v07.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({console});
const scripts='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg409-enemy-commanders.js hg410-battlefield.js hg42-boss-screen.js painter.js'.split(' ');
for(const name of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx,{filename:name});
const E=ctx.HOG_ENGINE,P=ctx.HOG_PAINTER,U=ctx.HOG_HG42_SCREEN;
const tests=[];
function test(name,fn){try{const result=fn()||{};tests.push({name,pass:true,result});console.log('HG42 PASS '+name+' '+JSON.stringify(result))}
 catch(e){tests.push({name,pass:false,error:String(e.stack||e)});process.exitCode=1;console.error('HG42 FAIL '+name+' '+String(e.stack||e));}}
function game(){const s=E.make('human',Date.now());assert(E.strictSave(s));return s}
function boss(tier){const t=E.TILES.find(t=>t.kind==='npc'&&t.eliteTier===tier);assert(t);return t}
function roundTrip(s){assert(E.strictSave(s));const q=E.parseSave(E.serializeSave(s));assert(E.strictSave(q));return q}
const ui={esc:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
 format:E.fmt,
 button:(action,data,label)=>'<button data-action="'+action+'" '+Object.entries(data||{}).map(([key,value])=>'data-'+key+'="'+value+'"').join(' ')+'>'+label+'</button>',
 lootText:p=>Object.entries(p.resources).map(([key,val])=>key+' '+val).join(' / '),
 hunt:()=>'<section class="hg26-autohunt">LIVE canonical hunt setup</section>'};
test('Boss T11–13 keep 16 actual combat actors and Save v07',()=>{
 const report=[];
 for(const tier of [11,12,13]){
  const s=game();s.battle=E.makeBattle(s,boss(tier).key);
  assert.equal(s.battle.enemies.length,16);
  assert.equal(s.battle.hg410.enemyStacks,16);
  const ids=new Set(s.battle.enemies.map(e=>e.id));assert.equal(ids.size,16);
  assert.equal(s.battle.hg409EnemyCommander.cs,tier-3);
  assert(s.battle.enemies.every(e=>e.pool>0&&e.count>0));
  roundTrip(s);report.push({tier,cs:tier-3,troops:s.battle.hg410.enemyTroops});
 }
 return report;
});
test('Heavy Boss 16-stack Canvas never creates 16 full labels; foot/HP retained',()=>{
 const s=game();s.battle=E.makeBattle(s,boss(13).key);
 const b=s.battle,camera=P.battleProjection({width:1176,height:550},E);
 const before=E.serializeSave(s),layout=P.battleUnitLayout(b,camera,1176,550,0);
 assert.equal(layout.filter(x=>x.u.side==='enemy'&&x.label).length,0);
 assert.equal(layout.filter(x=>x.u.side==='enemy').length,16);
 assert(layout.filter(x=>x.u.side==='enemy').every(x=>x.countBox&&x.sprite));
 for(const e of layout.filter(x=>x.u.side==='enemy')){
  assert(E.battleHex.inBounds(e.u.x,e.u.y));
  const pt=camera.center(e.u.x,e.u.y);
  assert.equal(P.battleHit({width:1176,height:550},pt.x,pt.y,E,s,0)?.id,e.u.id);
 }
 assert.equal(E.serializeSave(s),before,'presentation must not mutate Save');
 return {fullEnemyLabels:0,targetable:16,save:7};
});
test('Selected Boss stack alone expands its name/HP plate and changes no gameplay fields',()=>{
 const s=game();s.battle=E.makeBattle(s,boss(13).key);
 const b=s.battle,camera=P.battleProjection({width:930,height:320},E);
 E.battleSelect(s,b.enemies[10].id);
 const before=E.serializeSave(s),layout=P.battleUnitLayout(b,camera,930,320,0);
 const full=layout.filter(x=>x.u.side==='enemy'&&x.label);
 assert.equal(full.length,1);assert.equal(full[0].u.id,'e10');
 assert(layout.filter(x=>x.u.side==='enemy'&&!x.label).length===15);
 assert.equal(E.serializeSave(s),before);
 roundTrip(s);return {focused:b.focused,labeled:1,compact:15};
});
test('Nonboss encounters retain their ordinary full nameplate labels',()=>{
 const s=game(),t=E.TILES.find(x=>x.kind==='npc'&&x.level===1&&!x.privateBoss);assert(t);
 s.battle=E.makeBattle(s,t.key);
 const b=s.battle,camera=P.battleProjection({width:1176,height:550},E);
 assert(b.enemies.length<12);
 const layout=P.battleUnitLayout(b,camera,1176,550,0);
 assert.equal(layout.filter(x=>x.u.side==='enemy'&&x.label).length,b.enemies.length);
 return {enemies:b.enemies.length,labels:b.enemies.length};
});
test('Three physically separated Boss pages render without writing to Save',()=>{
 const s=game(),before=E.serializeSave(s),screens=U.sections;
 assert.deepEqual([...screens],['targets','hunt','loot']);
 for(const screen of screens){
  const html=U.render(s,E,ui,{screen,tier:13});
  assert(html.includes('data-hg42-boss-screen="'+screen+'"'));
  assert(html.includes('data-action="hg42-boss-screen"'));
 }
 assert.equal(E.serializeSave(s),before);
 return {screens};
});
test('T13 target route is actionable; guaranteed loot screen has actual item quantities',()=>{
 const s=game(),before=JSON.stringify(s);
 const html=U.render(s,E,ui,{screen:'targets',tier:13});
 const t=boss(13),p=E.hg409Preview('npc',t.key);
 assert(html.includes('data-boss-id="'+t.key+'"'));
 assert(html.includes('T13'));assert(html.includes('CS10'));
 assert(html.includes('data-action="hg42-boss-dispatch"'));
 const loot=U.render(s,E,ui,{screen:'loot',tier:13});
 assert(loot.includes(String(p.resources.gold)));
 assert(loot.includes('hg42-reward-tier'));
 assert.equal(JSON.stringify(s),before);
 return {cs:p.cs,boss:p.boss,bonusGold:p.resources.gold};
});
test('Boss route screen itself grants no army, XP, loot, AP or progress',()=>{
 const s=game(),before=JSON.stringify(s);
 for(let tier=11;tier<=13;tier++)for(const screen of U.sections)
  U.render(s,E,ui,{screen,tier});
 assert.equal(JSON.stringify(s),before);
 return {tiers:[11,12,13],screens:U.sections.length,unchanged:true};
});
const out=path.join(__dirname,'docs/qa/hg42');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'boss-engine-and-painter.json'),JSON.stringify({
 suite:'HG42 boss stage/view/painter nonmutating real engine',passed:tests.filter(t=>t.pass).length,total:tests.length,tests
},null,2)+'\n');
console.log('HG42 SUMMARY '+tests.filter(t=>t.pass).length+'/'+tests.length);
