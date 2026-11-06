/* HG28 coverage gate — guarantees honest 40×5 animation accounting.
 * A static PNG plus procedural transforms never counts as a true action clip.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname,file=path.join(root,'assets/animations/hg28/coverage.json');
const m=JSON.parse(fs.readFileSync(file,'utf8')),actions=['idle','walk','attack','hit','death'];
assert.equal(m.schema,'HG28-40-TroopAnimationCoverage-v1');
assert.deepEqual(m.actionOrder,actions);
assert.equal(m.units.length,40);
const expected=['human','elf','orc','undead'].flatMap(r=>Array.from({length:10},(_,i)=>r+'_'+(i+1)));
assert.deepEqual(m.units.map(u=>u.id),expected);
let count=0,full=0,frames=0,partials=0;
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
  actual++;allFrames+=clip.frames;
 }
 const want=actual===5?'FULL_VERIFIED':actual>0?'PARTIAL_VERIFIED':'MASTER_ONLY';
 assert.equal(u.status,want,u.id);
 if(actual===5)full++;else if(actual>0)partials++;
 if(u.tier>=9){
  const p=path.join(root,u.masterPath||'');
  assert.equal(u.masterPath,'assets/generated/hg28/troops/'+u.id+'.png');
  assert(fs.existsSync(p),'T9/T10 master missing: '+u.id);
  assert.equal(u.status,'MASTER_ONLY','Still master is not an action sheet: '+u.id);
 }
 count+=actual;frames+=allFrames;
 summary.push({unitId:u.id,status:want,realActionClips:actual,requiredActionClips:5,realFrames:allFrames});
}
assert(full>=4,'the four already-complete genuine source sets must not regress');
assert(count>=22,'the 22 already-proven source clips must not regress');
assert(frames>=215,'all 215 existing source frames must remain covered');
for(const id of ['human_3','human_4','human_7','undead_1']){
 const u=m.units.find(x=>x.id===id);
 assert(actions.every(a=>u.actions[a]),id+' existing five-action source frames lost');
}
assert(m.policy.includes('does NOT count'),'Still-based transforms must never be counted as source clips');
const receipt={schema:m.schema,unitCount:40,verifiedFullUnits:full,partialUnits:partials,sourceFrameClips:count,
 requiredActionClips:200,missingActionClips:200-count,verifiedFrames:frames,
 highTierStillMasters:8,complete:false,units:summary,
 note:'Current verified source frames, NOT completed 40-unit motion and NOT 200 actions.'};
const out=path.join(root,'docs/qa/hg28-animation-coverage.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
console.log('HG28 ANIM BASELINE: '+full+'/40 full action coverage; '+count+'/200 real action clips; '+frames+' frame cells; 8 T9/T10 still masters');
if(process.argv.includes('--require-full')){
 assert.equal(full,40,'RELEASE GATE FAIL: all 40 units must have five genuine clips');
 assert.equal(count,200,'RELEASE GATE FAIL: 200 clips required');
}
