/* HG19.1 — archive provenance only; external combat sprites are not shipped. */
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
const release=fs.readFileSync('Play-Heoofgaia-HG11.html','utf8');
const builder=fs.readFileSync('build_offline.py','utf8');
const painter=fs.readFileSync('painter.js','utf8');
const bundledScripts=builder.match(/for js in \[(.*?)\]:/s)?.[1]||'';
for(const key of ['art-free-icons-core.js','art-free-icons-extra.js']){
 assert(html.includes('<script src="'+key+'"></script>'),key+' HTML integration');
 assert(builder.includes("'"+key+"'"),key+' embedded in builder');
}
for(const states of Object.values(source))for(const [w,h,f,file] of Object.values(states)){
 const bytes=fs.readFileSync(file);
 assert(!html.includes('src="'+file+'"'),file+' must not load in the runtime page');
 assert(!builder.includes("'"+file+"'"),file+' must not be embedded by the release builder');
 assert(!release.includes(bytes.toString('base64')),file+' source bytes must not ship');
}
for(const module of ['art-free-sprites.js','art-hg192-sprites.js','art-hg193-sprites.js','art-hg22-skeleton.js']){
 assert(!html.includes('<script src="'+module+'"></script>'),module+' excluded from the page');
 assert(!bundledScripts.includes("'"+module+"'"),module+' excluded from the offline bundle');
 assert(!release.includes(module),module+' absent from the offline HTML');
}
assert(!painter.includes('HOG_FREE_SPRITES'),'combat never dispatches to internet sprite imports');
assert(fs.readFileSync('art-pack.js','utf8').includes("hg33-thumb-"),'unit UI uses original atlas crop thumbnails');
assert(fs.existsSync('docs/art/HG191_FREE_ASSET_PROVENANCE.md'),'credit source');
const result={status:'PASS_ARCHIVE_ONLY',sources:'SpriteCook CC0 / Game-Icons CC BY 3.0',newImportedTroops:2,sourcePngSheets:6,fullFrameAssets:5,totalSourceFrames:52,upstreamIconKeys:Object.keys(G).length,combatRuntime:'excluded; replaced by original HG33 action atlases',offlineReleaseBytesEmbedded:false,engineChanged:false,saveChanged:false};
const out=path.join('docs/qa/hg33/H5-release-assets/source-provenance');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'hg191-archive.json'),JSON.stringify(result,null,2)+'\n');
console.log('HG33 H5 SOURCE AUDIT PASS: external HG19.1 combat art is not shipped');
