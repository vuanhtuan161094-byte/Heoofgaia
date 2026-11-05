/* HG28 troop art integrity and offline integration QA. Run: node qa-hg28-art.cjs */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=__dirname;
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg28/troops/asset-manifest.json'),'utf8'));
const sourceBytes=fs.readFileSync(path.join(dir,manifest.source.sheet));
assert.equal(manifest.schema,'HG28-Troop-Masters-v1');
assert.equal(manifest.status,'RECREATED');
assert.equal(crypto.createHash('sha256').update(sourceBytes).digest('hex').toUpperCase(),manifest.source.sheetSha256);
assert.equal(manifest.units.length,8);
assert.match(manifest.animationDisclosure,/still masters/i);
assert.match(manifest.animationDisclosure,/real action clips/i);
const ids=new Set(),stubImages=new Map();
for(const unit of manifest.units){
 assert(!ids.has(unit.id),`duplicate id ${unit.id}`);ids.add(unit.id);
 const bytes=fs.readFileSync(path.join(dir,unit.path));
 assert.equal(bytes.length,unit.bytes,unit.path);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),unit.sha256,unit.path);
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',unit.path);
 assert.equal(bytes.readUInt32BE(16),512,`${unit.path} width`);
 assert.equal(bytes.readUInt32BE(20),512,`${unit.path} height`);
 assert.equal(bytes[24],8,`${unit.path} bit depth`);
 assert.equal(bytes[25],6,`${unit.path} RGBA color type`);
 assert.equal(unit.mode,'RGBA');assert.equal(unit.kind,'master-still');
 assert(unit.alphaVisiblePixels>10000,`${unit.id} appears empty`);
 assert.deepEqual(unit.pivot,[0.5,0.95]);
 stubImages.set(`hg28-troop-${unit.id}`,{src:`data:image/png;base64,${bytes.toString('base64')}`,complete:true,naturalWidth:512,naturalHeight:512});
}
const context=vm.createContext({document:{getElementById:id=>stubImages.get(id)||null}});
vm.runInContext(fs.readFileSync(path.join(dir,'art-hg28-troops.js'),'utf8'),context,{filename:'art-hg28-troops.js'});
const api=context.HOG_HG28_TROOPS;
assert.equal(api.ids().length,8);
for(const unit of manifest.units){
 const profile=api.profile(unit.id);
 assert(profile,`${unit.id} missing runtime profile`);
 assert.equal(profile.id,`hg28-troop-${unit.id}`);
 assert.equal(profile.pixelated,false);
 assert.match(api.thumb(unit.id,56),/hg28-troop-thumb/);
 assert.match(api.thumb(unit.id,56),/data:image\/png;base64,/);
}
assert.equal(api.profile('human_1'),null);
const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8');
for(const unit of manifest.units){
 const b64=fs.readFileSync(path.join(dir,unit.path)).toString('base64');
 assert(html.includes(`src="data:image/png;base64,${b64}"`),`${unit.id} missing from offline HTML`);
 assert(html.includes(`data-hg28-troop="${unit.id}"`)===false,'runtime thumb template must not be baked as a fake game card');
}
assert(!html.includes('assets/generated/hg28/troops/'));
console.log(`HG28 original high-tier masters and offline bundle: PASS ${manifest.units.length}/8; static-master disclosure verified`);
