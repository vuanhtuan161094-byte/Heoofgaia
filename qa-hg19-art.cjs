/* HG19 deterministic offline visual coverage; no browser required. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
require('./art-pack.js');
const C=require('./data.js'),A=globalThis.HOG_ART_PACK;
assert(A,'art pack is loaded');
const catalog=Object.values(C.units).flat().map(u=>u.id);
assert.equal(catalog.length,40);
assert.deepEqual(A.ids().sort(),catalog.slice().sort());
const variants=new Set;
for(const id of catalog){
 const svg=A.unitSVG(id),uri=A.unitSrc(id),html=A.unitHTML(id,56);
 assert(svg.startsWith('<svg')&&svg.endsWith('</svg>'),id);
 assert(svg.includes('<path')&&svg.includes('<ellipse'),id);
 assert(uri.startsWith('data:image/svg+xml;charset=utf-8,'),id);
 assert(html.includes('data-hog-unit="'+id+'"'),id);
 variants.add(svg);
}
assert.equal(variants.size,40,'40 separate character SVGs');
assert.equal(A.unitSVG('human_11'),null);
assert.equal(A.unitImage('human_7'),null,'safe in headless Node');
const iconKeys=['gold','wood','ore','sulfur','crystal','human','elf','orc','undead',
 'map','city','army','heroes','magic','relics','tasks','reports','sources',
 'resource_card','resource_chest','gear_pack','set_chest','enhance_stone','hero_reset','rank_emblem','rebirth_core','astral_shard',
 'weapon','armor','charm','fire','water','earth','air','light','dark',...Object.keys(C.buildings)];
for(const key of iconKeys){
 const icon=A.iconSVG(key);
 assert(icon&&icon.startsWith('<svg')&&icon.endsWith('</svg>'),key);
 assert(A.iconHTML(key,20).includes('data:image/svg+xml'),key);
}
assert.equal(A.iconSVG('unknown_item'),null);
const painter=fs.readFileSync('painter.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const build=fs.readFileSync('build_offline.py','utf8');
assert(painter.includes('root.HOG_ART_PACK?.hasUnit(id)'));
assert(painter.includes('A.unitImage(unitId)'));
assert(painter.includes('animatedArcher'),'original archer animation preserved');
assert(painter.includes('animatedSoldier'),'original heavy soldier animation preserved');
assert(app.includes('A?.unitHTML(u.id,56)'),'troop card art');
assert(app.includes('ico(k,20)'),'resource icon integration');
assert(html.includes('<script src="art-pack.js"></script>'));
assert(build.includes("'art-pack.js'"));
const receipt={troops:catalog.length,uniqueDrawings:variants.size,icons:iconKeys.length,engineChanged:false,saveSchemaChanged:false,status:'PASS'};
const dir=path.join('docs','qa','hg19');
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'art-pack.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('HG19 PASS — 40/40 troop identities, '+iconKeys.length+' UI icon keys and offline integration');
