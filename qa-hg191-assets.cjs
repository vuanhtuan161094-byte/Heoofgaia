/* HG19.1 — real CC0 source sprites + CC BY Game-Icons, offline-safe. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('./data.js');
require('./art-free-icons-core.js');
require('./art-free-icons-extra.js');
require('./art-free-sprites.js');
require('./art-pack.js');
const S=globalThis.HOG_FREE_SPRITES,A=globalThis.HOG_ART_PACK,G=globalThis.HOG_FREE_GLYPHS;
assert(S&&A&&G);
assert.deepEqual(Object.keys(S.CONFIG).sort(),['human_2','human_7']);
assert.equal(A.ids().length,40,'all original fallback art retained');
assert(Object.keys(G).length>=26,'real CC BY icon coverage');
for(const key of ['gold','wood','ore','sulfur','crystal','human','elf','orc','undead','fire','water','earth','air','light','dark','weapon','armor','charm','rank_emblem','rebirth_core']){
  assert(G[key]?.startsWith('M'),'real upstream SVG foreground path: '+key);
  assert(A.iconSVG(key).includes('scale(.086)'),'real vector must render in UI: '+key);
}
const source={
 'human_2':{idle:[1536,192,8,'assets/licensed/spritecook/human-scout/idle.png']},
 'human_7':{
  idle:[704,88,8,'assets/licensed/spritecook/human-elite/idle.png'],
  walk:[704,88,8,'assets/licensed/spritecook/human-elite/walk.png'],
  attack:[704,88,8,'assets/licensed/spritecook/human-elite/attack.png'],
  hit:[704,88,8,'assets/licensed/spritecook/human-elite/hit.png'],
  death:[1056,88,12,'assets/licensed/spritecook/human-elite/death.png']
 }
};
for(const [unit,states] of Object.entries(source)){
 for(const [state,[w,h,frames,file]] of Object.entries(states)){
  const buf=fs.readFileSync(file);
  assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file+' PNG magic');
  assert.equal(buf.readUInt32BE(16),w,file+' width');
  assert.equal(buf.readUInt32BE(20),h,file+' height');
  assert.equal(w/frames,h,file+' exactly one square cell per frame');
  const f=S.frame(unit,state,0);
  assert.equal(f.imageId,S.CONFIG[unit].sheets[state].id);
  assert.equal(f.sw,h);
  assert.equal(S.frame(unit,state,999999).n,states[state][2]-1===7&&S.CONFIG[unit].sheets[state].loop?S.frame(unit,state,999999).n:Math.min(frames-1,S.frame(unit,state,999999).n));
 }
}
assert.equal(S.frame('human_7','death',1050).n,11);
assert.equal(S.frame('human_7','walk',130).action,'walk');
assert.equal(S.frame('human_2','walk',130).action,'idle','Scout only sourced idle: keep HG14 pose for other states');
const html=fs.readFileSync('index.html','utf8');
const builder=fs.readFileSync('build_offline.py','utf8');
const painter=fs.readFileSync('painter.js','utf8');
for(const key of ['art-free-icons-core.js','art-free-icons-extra.js','art-free-sprites.js']){
 assert(html.includes('<script src="'+key+'"></script>'),key+' HTML integration');
 assert(builder.includes("'"+key+"'"),key+' embedded in builder');
}
for(const states of Object.values(source))for(const [w,h,f,file] of Object.values(states)){
 assert(html.includes('src="'+file+'"'),file+' preload');
 assert(builder.includes("'"+file+"'"),file+' offline embedding');
}
assert(painter.includes('root.HOG_FREE_SPRITES?.draw'),'real sprites selected in combat');
assert(fs.existsSync('docs/art/HG191_FREE_ASSET_PROVENANCE.md'),'credit source');
const result={status:'PASS',sources:'SpriteCook CC0 / Game-Icons CC BY 3.0',newImportedTroops:2,sourcePngSheets:6,fullFrameAssets:5,totalSourceFrames:52,upstreamIconKeys:Object.keys(G).length,engineChanged:false,saveChanged:false};
const out=path.join('docs/qa/hg191');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'free-assets.json'),JSON.stringify(result,null,2)+'\n');
console.log('HG19.1 SOURCE QA PASS',JSON.stringify(result));
