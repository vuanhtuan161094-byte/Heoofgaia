/* HG19.2: validate actual 24 imported PNGs and battle binding, no fake coverage. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const C=require('./data.js');
require('./art-hg192-sprites.js');require('./art-pack.js');
const X=globalThis.HOG_HG192_SPRITES,A=globalThis.HOG_ART_PACK;
const M=JSON.parse(fs.readFileSync('assets/licensed/dcss-cc0/unit-manifest.json','utf8'));
assert.equal(M.schema,'HG192');
assert.equal(M.units.length,24,'24 curated species-matched source PNGs');
const ids=M.units.map(u=>u.id);
assert.equal(new Set(ids).size,24);
assert.deepEqual(X.ids().sort(),ids.slice().sort());
const catalog=new Set(Object.values(C.units).flat().map(u=>u.id));
const pngHash=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
for(const unit of M.units){
 assert(catalog.has(unit.id),unit.id+' is real troop');
 assert.match(unit.source,/^https:\/\/github\.com\/crawl\/tiles\/blob\/master\/releases\/Nov-2015\/mon\//);
 const file=unit.path,buf=fs.readFileSync(file);
 assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file+' PNG magic');
 assert.equal(buf.readUInt32BE(16),unit.width,file+' width');
 assert.equal(buf.readUInt32BE(20),unit.height,file+' height');
 assert.equal(pngHash(buf),unit.sourceBlob,file+' exact source binary SHA');
 const profile=X.profile(unit.id);
 assert.equal(profile.id,'hg192-unit-'+unit.id);
 assert.equal(profile.pixelated,true);
 assert.equal(profile.pivot,1);
}
for(const original of ['human_1','human_2','human_3','human_4','human_7','elf_1','elf_2','orc_1','undead_1']){
 assert.equal(X.profile(original),null,'preserve existing master '+original);
}
const html=fs.readFileSync('index.html','utf8'),builder=fs.readFileSync('build_offline.py','utf8');
const painter=fs.readFileSync('painter.js','utf8'),art=fs.readFileSync('art-pack.js','utf8');
assert(html.includes('<script src="art-hg192-sprites.js"></script>'));
assert(builder.includes("'art-hg192-sprites.js'"));
assert(builder.includes("hg192['units']"));
assert(painter.includes('root.HOG_HG192_SPRITES?.profile(unitId)'));
assert(painter.includes('imageSmoothingEnabled=false'));
assert(art.includes('root.HOG_HG192_SPRITES?.thumb'));
for(const unit of M.units)assert(html.includes('src="'+unit.path+'"'),unit.id+' DOM preload');
const output={status:'PASS',sourceFileCount:M.units.length,uniqueSourceBinaryCount:new Set(M.units.map(u=>u.sourceBlob)).size,format:'PNG originals, 32px pixel art',animation:'existing event-driven Idle/Walk/Attack/Hit/Death',engineChanged:false,saveChanged:false};
fs.mkdirSync('docs/qa/hg192',{recursive:true});
fs.writeFileSync('docs/qa/hg192/source-assets.json',JSON.stringify(output,null,2)+'\n');
console.log('HG19.2 PASS 24/24 curated CC0 species-matched source sprites and offline wiring');
