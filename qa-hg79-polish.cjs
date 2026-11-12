/* HG79 visual QA: explicit NPC atlas aliases, world square cells and
 * hero art identity. Presentation only; Save v07 engine is untouched. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=__dirname;
for(const file of ['app.js','painter.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const context=vm.createContext({console,Math,Date});
// Load canonical wrappers in the same order as the one-file game. The bare
// engine's initial make() is still a legacy version until migrations wrap it.
const sources='data.js engine.js hg04.js hg05.js hg06.js hg07.js hg08.js hg10.js hg18.js hg182.js hg20-private.js hg20-world-bosses.js hg21-tower-tactical.js hg24-private-automation.js hg26-boss-autohunt.js hg261-joint-boss.js hg27-farm-exchange.js hg29-loot.js hg30-troop-ascension.js hg31-legendary-gear.js hg40-tactical.js hg408-hero-management.js hg46-equipment.js hg47-ten-slot.js hg409-enemy-commanders.js hg410-battlefield.js hg50-expedition.js hg42-boss-screen.js hg43-troop-profiles.js hg71-quest-heroes.js hg73-gear-prestige.js painter.js'.split(' ');
for(const file of sources)
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const E=context.HOG_ENGINE,P=context.HOG_PAINTER;
assert(E&&P&&P.hg79WorldGridBounds&&P.hg79EnemyVisualId);
const checks=[];
function test(name,fn){
 try{const data=fn();console.log('HG79 PASS',name,JSON.stringify(data||{}));checks.push({name,pass:true})}
 catch(e){console.error('HG79 FAIL',name,e.stack||e);checks.push({name,pass:false});process.exitCode=1}
}
test('Real 40 animated troop models used for varied NPC archetypes',()=>{
 const samples={
  'Dã thú':'orc_4','Cung thủ cướp':'human_3','Vệ binh':'human_4',
  'Fiery Giant':'orc_10','Earth Bear':'orc_9','Fallen Treant':'elf_6',
  'U Minh Quỷ Vương · Ảo ảnh 1':'undead_8',
  'Viễn Cổ Long Hoàng · Ảo ảnh 2':'undead_10',
  'Huyết Nguyệt Ma Thần · Ảo ảnh 3':'orc_9'
 };
 for(const [name,expected] of Object.entries(samples)){
  const id=P.hg79EnemyVisualId({side:'enemy',name,unitId:null});
  assert.equal(id,expected,name);
  assert(Object.values(E.C.units).flat().some(u=>u.id===id),'no real animated core troop '+id);
 }
 const unknown={side:'enemy',name:'Tinh Không Đại Ma · Ảo ảnh 4',unitId:null};
 const first=P.hg79EnemyVisualId(unknown);
 assert.equal(P.hg79EnemyVisualId(unknown),first,'NPC appearance is not deterministic');
 assert.equal(P.hg79EnemyVisualId({side:'player',unitId:'human_1',name:'Spear Militia'}),null);
 return {count:Object.keys(samples).length,unknown:first};
});
test('Square world map visible-cell bounds are clipped without topology changes',()=>{
 const testCases=[{q:48,ox:-300,oy:-200,w:412,h:280},
  {q:70,ox:-1400,oy:-1300,w:1176,h:620},
  {q:31,ox:300,oy:300,w:844,h:390}];
 for(const c of testCases){
  const b=P.hg79WorldGridBounds(E,c.q,c.ox,c.oy,c.w,c.h);
  assert(b.x0>=0&&b.x1<E.WIDTH&&b.y0>=0&&b.y1<E.HEIGHT);
  assert(b.x1>=b.x0&&b.y1>=b.y0);
  const count=(b.x1-b.x0+1)*(b.y1-b.y0+1);
  const maximum=(Math.ceil(c.w/c.q)+4)*(Math.ceil(c.h/c.q)+4);
  assert(count<=maximum,'would repaint too many world cells');
 }
 return {cases:testCases.length,topology:'4-neighbour square map unchanged'};
});
test('Map tap maps to canonical square tile, not combat hex',()=>{
 const fake={width:412,height:280,getBoundingClientRect:()=>({width:412,height:280})};
 const camera=P.mapCamera(),old={...camera};
 Object.assign(camera,{centerX:3.5,centerY:4.5,zoom:1});
 const tile=P.mapHit(fake,206,140,E);
 Object.assign(camera,old);
 assert(tile&&tile.key==='3,4',tile?.key);
 return {tile:tile.key,hexIsOnlyBattle:true};
});
test('Six visual hero identities and existing rarity tiers share the same portrait renderer',()=>{
 const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const role of ['knight','ranger','arcanist','warden','rogue','oracle'])
  assert(source.includes("'"+role+"'"),role);
 assert(source.includes("hero?.questSpecial?'oracle'"),'special identity absent');
 assert(source.includes("hg45-portrait-'+rare+' hg79-portrait-'+role"),'no shared hero portrait');
 const css=fs.readFileSync(path.join(root,'style-hg57.css'),'utf8');
 for(const role of ['knight','ranger','arcanist','warden','rogue','oracle'])
  assert(css.includes('.hg79-portrait-'+role),'missing '+role+' style');
 return {roles:6,format:'SVG illustrations, no external network'};
});
test('World model, original 12x9 tactical hex, and Save v07 remain canonical',()=>{
 const s=E.make('human',1000000);
 assert.equal(s.version,7);assert(E.valid(s));
 assert.equal(E.WIDTH,100);assert.equal(E.HEIGHT,100);
 assert.equal(E.BATTLE_GRID.cols,12);assert.equal(E.BATTLE_GRID.rows,9);
 assert.equal(E.battleHex.neighbors(3,4).length,6);
 return {save:s.version,world:E.WIDTH+'x'+E.HEIGHT,battle:'12x9 odd-r'};
});
console.log('HG79 SUMMARY',checks.filter(q=>q.pass).length+'/'+checks.length);
if(process.exitCode)process.exit(process.exitCode);
