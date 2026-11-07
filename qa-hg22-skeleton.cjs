/* HG22.1: check five real MIT skeleton sprite sheets and offline wiring. */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
require('./art-hg22-skeleton.js');
const S=globalThis.HOG_HG22_SKELETON;
const M=JSON.parse(fs.readFileSync('assets/licensed/hg22-skeleton/asset-manifest.json','utf8'));
assert.equal(M.schema,'HG22-skeleton-animated-v1');
assert.equal(M.gameUnitId,'undead_1');
assert.equal(M.sourceLicense,'MIT');
assert.equal(M.actions.length,5);
assert.deepEqual(M.actions.map(x=>x.action),['idle','walk','attack','hit','death']);
const sha=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
for(const spec of M.actions){
 const b=fs.readFileSync(spec.path);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',spec.action);
 assert.equal(b.readUInt32BE(16),1280);
 assert.equal(b.readUInt32BE(20),512);
 assert.equal(sha(b),spec.sourceBlob,spec.action+' original SHA');
 assert.equal(spec.frames,10);assert.equal(spec.cell,256);
 assert(S.CLIPS[spec.action],spec.action);
 assert.equal(S.CLIPS[spec.action].id,'hg22-skeleton-'+spec.action);
 assert.equal(S.frame(spec.action,0).n,0);
 assert.equal(S.frame(spec.action,spec.ms/2).n,5);
 assert.equal(S.frame(spec.action,spec.ms*2).n,spec.loop?0:9);
}
assert.equal(S.has('undead_1'),true);
assert.equal(S.has('undead_2'),false);
assert.equal(S.frame('death',1150,1150).n,9);
const index=fs.readFileSync('index.html','utf8');
const release=fs.readFileSync('Play-Heoofgaia-HG11.html','utf8');
const painter=fs.readFileSync('painter.js','utf8');
const art=fs.readFileSync('art-pack.js','utf8');
const build=fs.readFileSync('build_offline.py','utf8');
const bundledScripts=build.match(/for js in \[(.*?)\]:/s)?.[1]||'';
const workflow=fs.readFileSync('.github/workflows/hog-combat-offline.yml','utf8');
const old=fs.readFileSync('assets/generated/hg11/units/undead-skeleton.png');
assert(old.length>200,'original fallback must remain');
const atlasManifest=JSON.parse(fs.readFileSync('assets/generated/hg33/animation/additional-atlas-manifest.json','utf8'));
const originalSkeleton=atlasManifest.assets.find(x=>x.kind==='core'&&x.unitId==='undead_1');
assert(originalSkeleton,'HG22.1 Skeleton identity has a replacement atlas');
assert.equal(originalSkeleton.creationMethod,'New project-authored image-generation atlas; no external game art or model used.');
assert.deepEqual(Object.keys(originalSkeleton.actions).sort(),['attack','death','hit','idle','walk']);
assert(originalSkeleton.sourcePath.startsWith('assets/original/hg33/'));
for(const spec of M.actions){
 const bytes=fs.readFileSync(spec.path);
 assert(!index.includes('src="'+spec.path+'"'),'external sheet excluded from index '+spec.path);
 assert(!release.includes(bytes.toString('base64')),'external sheet excluded from offline release '+spec.path);
}
assert(!index.includes('<script src="art-hg22-skeleton.js"></script>'));
assert(!bundledScripts.includes("'art-hg22-skeleton.js'")&&!build.includes("hg22['actions']"));
assert(!release.includes('art-hg22-skeleton.js'));
assert(!art.includes('HOG_HG22_SKELETON'));
assert(!painter.includes('HOG_HG22_SKELETON'));
assert(workflow.includes('qa-hg33-release-art-chrome.py'));
fs.mkdirSync('docs/qa/hg33/H5-release-assets/source-provenance',{recursive:true});
const report={status:'PASS_ARCHIVE_ONLY',unit:'undead_1',historicalActions:5,historicalFrames:50,historicalSource:'MIT Chong-U Lim',offlineReleaseBytesEmbedded:false,replacement:{source:originalSkeleton.sourcePath,actions:Object.keys(originalSkeleton.actions).length,framesPerAction:8,thirdPartySource:null},saveChanged:false,engineChanged:false};
fs.writeFileSync('docs/qa/hg33/H5-release-assets/source-provenance/hg22-skeleton-archive.json',JSON.stringify(report,null,2)+'\n');
console.log('HG33 H5 SOURCE AUDIT PASS: Skeleton identity and 5 actions use the new original atlas');
