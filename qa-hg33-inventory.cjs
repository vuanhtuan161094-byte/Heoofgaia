/* HG33 H0 census. Derives actor and encounter identities from the real
 * catalogs/constructors and inventories every licensed web-source combat
 * pack still present in the current offline release. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');

const root=__dirname;
const ctx=vm.createContext({console});
const modules=[
 'data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js',
 'hg10.js','hg18.js','hg182.js','hg20-private.js','hg20-world-bosses.js',
 'hg21-tower-tactical.js'
];
for(const file of modules)
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const E=ctx.HOG_ENGINE,C=ctx.HOG_CATALOG;
assert(E&&C,'canonical HOG catalogs and combat engine loaded');

const core=Object.values(C.units).flat();
const rewards=Object.values(C.rewardUnits||{}).flat();
assert.equal(core.length,40,'40 canonical core troops');
assert.equal(rewards.length,8,'8 independently cataloged reward troops');
assert.equal(new Set(core.map(u=>u.id)).size,40,'all core IDs unique');
assert.equal(new Set(rewards.map(u=>u.id)).size,8,'all reward IDs unique');

const state=E.make('human',Date.UTC(2026,10,6));
const bossTiles=E.TILES.filter(t=>Number.isSafeInteger(t.eliteTier)&&t.eliteTier>=11);
const worldEncounters=bossTiles.map(tile=>{
 const battle=E.makeBattle(state,tile.key);
 return {target:{key:tile.key,name:tile.value,eliteTier:tile.eliteTier,
   privateBoss:!!tile.privateBoss,source:tile.source||null},
  actualCombatStacks:battle.enemies.map(u=>({name:u.name,unitId:u.unitId||null,
   range:u.range,source:'engine.js makeBattle()'}))};
});
const privateBosses=(E.hg20PrivateWorldBosses||[]).map(t=>({key:t.key,name:t.value,
 eliteTier:t.eliteTier,source:t.source}));
assert.equal(privateBosses.length,2,'both fixed HG20 private Boss targets loaded');
assert(worldEncounters.every(e=>e.actualCombatStacks.length>0));

const towerSource=fs.readFileSync(path.join(root,'hg21-tower-tactical.js'),'utf8');
const towerModelMatch=/const floor=t\.floor,models=\[([^\]]+)\]/.exec(towerSource);
assert(towerModelMatch,'tower model registry found in the actual HG21 battle constructor');
const towerModels=[...towerModelMatch[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
assert.equal(towerModels.length,4,'the source has four repeated Tower archetypes');
assert(towerSource.includes("models[index]+' · Ảo ảnh '+(i+1)"),
 'Tower stacks use these models with generated encounter suffixes');

const combatMap=new Map();
for(const encounter of worldEncounters)for(const stack of encounter.actualCombatStacks){
 const row=combatMap.get(stack.name)||{name:stack.name,encounters:[],source:'engine.js makeBattle()'};
 row.encounters.push({target:encounter.target.name,eliteTier:encounter.target.eliteTier,
  privateBoss:encounter.target.privateBoss});combatMap.set(stack.name,row);
}
for(const name of towerModels){
 const row=combatMap.get(name)||{name,encounters:[],source:'hg21-tower-tactical.js gameBattle()'};
 row.encounters.push({towerFloors:'repeating four-model cycle',display:'<model> · Ảo ảnh <stack>'});
 combatMap.set(name,row);
}
const registeredBosses=JSON.parse(fs.readFileSync(path.join(root,
 'assets/generated/hg28/bosses/asset-manifest.json'),'utf8'));
const bossArt=new Map(registeredBosses.assets.map(a=>[a.name,a]));
const bossArchetypes=[...combatMap.values()].sort((a,b)=>a.name.localeCompare(b.name))
 .map(row=>({...row,artRegistration:bossArt.has(row.name)?
  {assetId:bossArt.get(row.name).asset_id,sourceRoute:bossArt.get(row.name).source_route,
   status:bossArt.get(row.name).status,animationStatus:bossArt.get(row.name).animation_status}:
  {assetId:null,status:'MISSING',animationStatus:'MISSING'}}));

const htmlPath=path.join(root,'Play-Heoofgaia-HG11.html');
const html=fs.readFileSync(htmlPath,'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const packs=[
 {name:'KayKit Heavy Soldier',manifest:'assets/licensed/kaykit-heavy-soldier/asset-manifest.json',
  sourceManifest:'assets/licensed/kaykit-heavy-soldier/source-manifest.json',category:'external web 3D source rendered to combat action atlases'},
 {name:'SpriteCook',manifest:'assets/licensed/spritecook/asset-manifest.json',
  category:'external web combat spritesheets'},
 {name:'Dungeon Crawl Stone Soup tiles',manifest:'assets/licensed/dcss-cc0/unit-manifest.json',
  category:'external web unit sprites'},
 {name:'HG22 Skeleton',manifest:'assets/licensed/hg22-skeleton/asset-manifest.json',
  category:'external web five-action combat atlases'},
 {name:'HG193 unit catalog',manifest:'assets/hg193-unit-manifest.json',
  category:'mixed project-authored and external static combat sprites'}
];
function rowsOf(manifest){
 for(const k of ['units','files','assets','actions'])if(Array.isArray(manifest[k]))return manifest[k];
 if(Array.isArray(manifest.animation?.actions))return manifest.animation.actions;
 return [];
}
function manifestSummary(pack){
 const file=path.join(root,pack.manifest),manifest=JSON.parse(fs.readFileSync(file,'utf8'));
 const rows=rowsOf(manifest),sourceFile=pack.sourceManifest?
  JSON.parse(fs.readFileSync(path.join(root,pack.sourceManifest),'utf8')):null;
 const rowUnits=[...new Set(rows.map(r=>r.unit||r.id||r.unitId).filter(Boolean))];
 if(!rowUnits.length&&manifest.target?.unitId)rowUnits.push(manifest.target.unitId);
 let embeddedFiles=0,checkedFiles=0,embeddedBytes=0;
 const fileRows=[];
 for(const row of rows){
  const assetPath=row.path||row.projectPath||row.atlas?.projectPath;
  if(!assetPath)continue;
  const absolute=path.join(root,assetPath);
  if(!fs.existsSync(absolute))continue;
  const bytes=fs.readFileSync(absolute),encoded=bytes.toString('base64');checkedFiles++;
  const embedded=html.includes(encoded);
  if(embedded){embeddedFiles++;embeddedBytes+=bytes.length;}
  fileRows.push({path:assetPath,unit:row.unit||row.id||row.unitId||manifest.target?.unitId||null,
   action:row.clip||row.action||row.name||null,frames:row.frames||row.frameCount||null,bytes:bytes.length,
   sourceUrl:row.sourceUrl||row.source||row.sourcePath||manifest.source?.repository||manifest.sourceRepo||manifest.sourceRepository||sourceFile?.sourceRepository||null,
   sourceBlob:row.sourceBlob||manifest.source?.commit||manifest.sourceCommit||sourceFile?.sourceCommit||null,
   license:row.license||manifest.source?.license||manifest.sourceLicense||manifest.license||sourceFile?.license||null,
   sha256:sha(bytes),embeddedInOfflineHtml:embedded});
 }
 return {name:pack.name,category:pack.category,manifest:pack.manifest,
  source:manifest.source||manifest.sourceRepo||manifest.curatedSource||manifest.sourceRepository||sourceFile?.sourceRepository||null,
  license:manifest.license||manifest.sourceLicense||manifest.source?.license||sourceFile?.license||sourceFile?.sourceLicense||null,
  recordedRows:rows.length,uniqueUnitIds:rowUnits,knownFrameCount:rows.reduce((n,r)=>n+(Number(r.frames)||Number(r.frameCount)||((r.width||r.cellPixels)?1:0)),0),
  checkedRuntimeFiles:checkedFiles,embeddedRuntimeFiles:embeddedFiles,embeddedRuntimeBytes:embeddedBytes,
  runtimeFiles:fileRows};
}
const artPacks=packs.map(manifestSummary);
const externalSources=artPacks.filter(p=>/external|mixed/i.test(p.category));
const inventory={schema:'HG33-H0-inventory-v1',generatedAt:new Date().toISOString(),
 repository:'vuanhtuan161094-byte/Heoofgaia',branch:'feature/hog1-research-to-playable-20261102',
 catalog:{coreCount:core.length,coreIds:core.map(u=>u.id),rewardCount:rewards.length,
  rewardIds:rewards.map(u=>u.id)},
 bosses:{worldTargetCount:bossTiles.length,worldTargets:worldEncounters,
  privateTargetCount:privateBosses.length,privateTargets:privateBosses,
  distinctCombatArchetypeCount:bossArchetypes.length,combatArchetypes:bossArchetypes,
  currentBossArtRegistered:bossArchetypes.filter(b=>b.artRegistration.status==='RECREATED').map(b=>b.name),
  missingBossArt:bossArchetypes.filter(b=>b.artRegistration.status==='MISSING').map(b=>b.name)},
 currentRuntimeArtAudit:{html: 'Play-Heoofgaia-HG11.html',htmlBytes:fs.statSync(htmlPath).size,
  htmlSha256:sha(fs.readFileSync(htmlPath)),packs:artPacks,
  packsWithExternalSource:externalSources.map(p=>p.name),
  releaseBlocker:'External-source combat sprites/atlases remain in the current runtime; HG5 replacement gate is not yet passed.'},
 result:'PASS_H0_CENSUS_AND_PROVENANCE_AUDIT; ART_REPLACEMENT_NOT_COMPLETE'};
const out=path.join(root,'docs/qa/hg33/boss-art-inventory.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(inventory,null,2)+'\n','utf8');
console.log(`HG33 H0 INVENTORY PASS: ${core.length} core, ${rewards.length} reward, ${bossTiles.length} named world Boss targets, ${privateBosses.length} private targets, ${bossArchetypes.length} combat archetypes; ${externalSources.length} external-source combat packs audited.`);
console.log(`Bosses with registered original masters ${inventory.bosses.currentBossArtRegistered.length}/${bossArchetypes.length}; missing ${inventory.bosses.missingBossArt.join(', ')}`);
console.log(`Receipt: docs/qa/hg33/boss-art-inventory.json · HTML SHA-256 ${inventory.currentRuntimeArtAudit.htmlSha256}`);
