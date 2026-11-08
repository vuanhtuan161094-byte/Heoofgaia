/* HG40.3 AF40 source-reconciliation gate: cross-check existing HG28 clips
 * plus original HG33 eight-frame-per-action atlas rows, preserving source hashes.
 * A static PNG plus procedural transforms never counts as a true action clip.
 * Pixel-different frames alone do NOT certify perfect animation quality.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=__dirname,file=path.join(root,'assets/animations/hg28/coverage.json');
const m=JSON.parse(fs.readFileSync(file,'utf8')),actions=['idle','walk','attack','hit','death'];
assert.equal(m.schema,'HG28-40-TroopAnimationCoverage-v1');
assert.deepEqual(m.actionOrder,actions);
assert.equal(m.units.length,40);
const expected=['human','elf','orc','undead'].flatMap(r=>Array.from({length:10},(_,i)=>r+'_'+(i+1)));
assert.deepEqual(m.units.map(u=>u.id),expected);
let count=0,full=0,frames=0,partials=0,registeredHg33=0;const shaCache=new Map();
const summary=[];
for(const u of m.units){
 assert.match(u.id,/^(human|elf|orc|undead)_(?:[1-9]|10)$/);
 assert.equal(u.id,u.race+'_'+u.tier);
 assert.equal(Object.keys(u.actions).length,5);
 assert.deepEqual(Object.keys(u.actions),actions);
 let actual=0,allFrames=0;
 for(const a of actions){
  const clip=u.actions[a];
  if(clip===null)continue;
  assert.equal(clip.kind,'source-frames',u.id+'/'+a+' cannot be a rotated still');
  assert(Number.isInteger(clip.frames)&&clip.frames>=8&&clip.frames<=64);
  assert.equal(typeof clip.evidence,'string');
  assert(clip.evidence.length>10);
  assert(typeof clip.source==='string'&&!path.isAbsolute(clip.source)&&!clip.source.includes('..'));
  const p=path.join(root,clip.source),bytes=fs.readFileSync(p);
  assert(bytes.length>100,'missing or empty clip '+p);
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  assert(png||webp,'expected transparent PNG/WebP frame atlas: '+p);
  if(png)assert.equal(bytes[25],6,'expected RGBA PNG source: '+p);
  if(webp)assert(clip.evidence.endsWith('atlas-manifest.json'),
    'WebP atlas needs verifiable original-frame pack manifest: '+p);
  if(clip.authoring==='HG33-original-image-gen-atlas'){
   assert.equal(clip.kind,'source-frames',u.id+'/'+a);
   assert(clip.source.startsWith('assets/original/hg33/troops/')&&png,
    u.id+'/'+a+' must point to the authored RGBA source, never a runtime WebP');
   assert.equal(clip.frames,8);assert.equal(clip.columns,8);
   assert.equal(clip.frameWidth,192);assert.equal(clip.frameHeight,204);
   assert.equal(clip.row,actions.indexOf(a));
   assert.equal(clip.evidence,'assets/generated/hg33/animation/troop-atlas-manifest.json');
   let digest=shaCache.get(clip.source);
   if(!digest){digest=crypto.createHash('sha256').update(bytes).digest('hex');shaCache.set(clip.source,digest);}
   assert.equal(digest,clip.sourceSha256,'HG33 source digest changed without verification: '+u.id+'/'+a);
   assert(clip.minimumAdjacentMae>=0.004,'source animation too static: '+u.id+'/'+a);
   registeredHg33++;
  }
  actual++;allFrames+=clip.frames;
 }
 const want=actual===5?'FULL_VERIFIED':actual>0?'PARTIAL_VERIFIED':'MASTER_ONLY';
 assert.equal(u.status,want,u.id);
 if(actual===5)full++;else if(actual>0)partials++;
 if(u.tier>=9){
  const p=path.join(root,u.masterPath||'');
  assert.equal(u.masterPath,'assets/generated/hg28/troops/'+u.id+'.png');
  assert(fs.existsSync(p),'T9/T10 master missing: '+u.id);
  assert.equal(u.status,'FULL_VERIFIED','T9/T10 must have authored action-atlas frames, not merely a still: '+u.id);
  assert(actions.every(a=>u.actions[a]&&u.actions[a].authoring==='HG33-original-image-gen-atlas'),
    'T9/T10 original master cannot substitute for source clips: '+u.id);
 }
 count+=actual;frames+=allFrames;
 summary.push({unitId:u.id,status:want,realActionClips:actual,requiredActionClips:5,realFrames:allFrames});
}
assert.equal(full,40,'all 40 units require source clips in five actions');
assert.equal(count,200,'all 200 source action clips required');
assert.equal(registeredHg33,178,'the 178 newly recovered authored source atlas rows must remain verified');
assert(frames>=215+178*8,'215 previously registered source frames plus eight per recovered clip must remain');
for(const id of ['human_3','human_4','human_7','undead_1']){
 const u=m.units.find(x=>x.id===id);
 assert(actions.every(a=>u.actions[a]),id+' existing five-action source frames lost');
}
assert(m.policy.includes('does NOT count'),'Still-based transforms must never be counted as source clips');
const receipt={schema:m.schema,unitCount:40,verifiedFullUnits:full,partialUnits:partials,sourceFrameClips:count,
 requiredActionClips:200,missingActionClips:200-count,verifiedFrames:frames,
 highTierStillMasters:8,highTierVerifiedSourceAtlases:8,
 recoveredHg33SourceClips:registeredHg33,sourceAtlasFiles:shaCache.size,complete:full===40&&count===200,units:summary,
 note:'40 units have 200 frame-distinct source action clips. HG33 source rows are independently-authored project image-gen atlases, not static HG28 masters. This validates frame provenance/structure, not visual polish or anatomical continuity.'};
const out=path.join(root,'docs/qa/hg28-animation-coverage.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
console.log('HG40.3 AF40 VERIFIED: '+full+'/40 source-complete troops; '+count+'/200 authored action clips; '+frames+' source-frame cells; '+registeredHg33+' HG33 source rows reconciled; 8/8 T9/T10 high-tier atlases.');
if(process.argv.includes('--require-full')){
 assert.equal(full,40,'RELEASE GATE FAIL: all 40 units must have five genuine clips');
 assert.equal(count,200,'RELEASE GATE FAIL: 200 clips required');
}
