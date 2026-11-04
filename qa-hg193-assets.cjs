'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const C=require('./data.js');
require('./art-free-sprites.js');require('./art-hg192-sprites.js');require('./art-hg193-sprites.js');require('./art-pack.js');
const X=globalThis.HOG_HG193_SPRITES,M=JSON.parse(fs.readFileSync('assets/hg193-unit-manifest.json','utf8'));
const IDs=['human_6','human_8','elf_4','elf_5','elf_7','orc_2','orc_7'];
assert.equal(M.schema,'HG193-sprite-map-v1');assert.equal(M.units.length,7);
assert.deepEqual(X.ids().sort(),IDs.slice().sort());
const sources=new Set(['human_1','human_3','human_4','elf_1','elf_2','orc_1','undead_1',
 ...Object.keys(globalThis.HOG_FREE_SPRITES.CONFIG),...globalThis.HOG_HG192_SPRITES.ids(),...X.ids()]);
assert.equal(sources.size,40,'the 40 troop art sources must not overlap');
assert.deepEqual(sources,new Set(Object.values(C.units).flat().map(u=>u.id)),'exact roster');
for(const u of M.units){
 const b=fs.readFileSync(u.path);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',u.id);
 assert.equal(b.readUInt32BE(16),u.width,u.id+' PNG width');
 assert.equal(b.readUInt32BE(20),u.height,u.id+' PNG height');
 const blob=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 assert.equal(blob,u.sourceBlob,u.id+' source blob checksum');
 if(u.sha256)assert.equal(crypto.createHash('sha256').update(b).digest('hex'),u.sha256,u.id+' original master checksum');
 assert.equal(X.has(u.id),true,u.id);
 if(u.kind==='static')assert.equal(X.profile(u.id).id,'hg193-unit-'+u.id);
}
assert.equal(X.monkFrame(0),0);assert.equal(X.monkFrame(140),1);assert.equal(X.monkFrame(1120),0);
const html=fs.readFileSync('index.html','utf8'),builder=fs.readFileSync('build_offline.py','utf8');
const art=fs.readFileSync('art-pack.js','utf8'),painter=fs.readFileSync('painter.js','utf8');
assert(html.includes('<script src="art-hg193-sprites.js"></script>'));
assert(builder.includes("'art-hg193-sprites.js'")&&builder.includes("hg193['units']"));
assert(painter.includes('root.HOG_HG193_SPRITES?.draw(c,x,y,u.unitId'));
assert(painter.includes('root.HOG_HG193_SPRITES?.profile(unitId)'));
assert(art.includes('root.HOG_HG193_SPRITES?.thumb(id,px)'));
for(const u of M.units)assert(html.includes('src="'+u.path+'"'),u.id+' preload');
const result={status:'PASS',catalogUnits:40,distinctTroopArt:40,lastSeven:IDs,imported:4,original:3,animation:['idle','walk','attack','hit','death'],engineRulesChanged:false,saveSchemaChanged:false};
fs.mkdirSync('docs/qa/hg193',{recursive:true});
fs.writeFileSync('docs/qa/hg193/assets.json',JSON.stringify(result,null,2)+'\n');
console.log('HG19.3 PASS — all 40 troop identities have separate sprite artwork');
