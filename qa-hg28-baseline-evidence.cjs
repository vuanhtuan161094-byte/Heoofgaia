/* Verify the genuine 20-screen BEFORE capture is preserved byte-for-byte. */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const receiptPath=path.join(root,'docs/qa/hg28/visual-chrome-before.json');
const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
assert.equal(receipt.phase,'BEFORE');
assert.equal(receipt.sourceCommit,'05a62c1d42ae88492a7bdd1e235bb1f23608d837');
assert.equal(receipt.html,'Play-Heoofgaia-HG11.html');
assert.equal(receipt.pass,true);
assert.deepEqual(receipt.sizes,['1280x720','960x540']);
assert.equal(receipt.screenshots.length,20);
assert.deepEqual(receipt.pageErrors,[]);
const seen=new Set();
for(const shot of receipt.screenshots){
 assert(!seen.has(shot.path),`duplicate capture path ${shot.path}`);seen.add(shot.path);
 assert.match(shot.path,/^docs\/evidence\/hg28\/before\/(1280x720|960x540)\/\d\d-[a-z-]+\.png$/);
 const bytes=fs.readFileSync(path.join(root,shot.path));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),shot.sha256,shot.path);
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',shot.path);
 const [width,height]=shot.viewport.split('x').map(Number);
 assert.equal(bytes.readUInt32BE(16),width,shot.path);
 assert.equal(bytes.readUInt32BE(20),height,shot.path);
 assert.equal(shot.geometry.width,width,shot.path);
 assert.equal(shot.geometry.height,height,shot.path);
}
assert.equal(new Set(receipt.screenshots.map(x=>x.tab)).size,10);
console.log('HG28 before-art evidence integrity: PASS 20/20 original file:// Chromium screenshots across 1280x720 and 960x540');
