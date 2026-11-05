/* Independent HG-07–HG-10 regression suite. Run: node qa-engine.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const ctx=vm.createContext({console});
const dir=__dirname;
const hg28WorldAssets=['meadow-tile.png','world-creatures-atlas.png','tree-broadleaf.png','tree-pine.png'].map(name=>path.join(dir,'assets/generated/hg28/world',name));
const hg28TroopAssets=['human_9.png','human_10.png','elf_9.png','elf_10.png','orc_9.png','orc_10.png','undead_9.png','undead_10.png'].map(name=>path.join(dir,'assets/generated/hg28/troops',name));
const hg28OfflineAssets=[...hg28WorldAssets,...hg28TroopAssets];

for(const file of ['data.js','engine.js','hg04.js','hg05.js','hg06.js','hg07.js','hg08.js','hg10.js','hg18.js']) vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),ctx,{filename:file});
vm.runInContext(fs.readFileSync(path.join(dir,'painter.js'),'utf8'),ctx,{filename:'painter.js'});
const E=ctx.HOG_ENGINE, C=ctx.HOG_CATALOG;
const P=ctx.HOG_PAINTER;
let pass=0,failed=0;const results=[];
function test(name,fn){try{fn();pass++;results.push({name,passed:true});console.log('PASS '+name)}catch(e){failed++;results.push({name,passed:false});console.error('FAIL '+name+': '+(e.stack||e.message))}}
function state(race='human'){return E.make(race,1_000_000)}
function expensive(s){for(const k of C.keys) s.res[k]=Math.min(E.limits(s)[k],1e6);return s}
function lifetimeHeroXp(h){let xp=h.xp;for(let level=1;level<h.level;level++)xp+=E.experienceToNext(level);return xp}
function throws(fn,re){assert.throws(fn,re)}
const v2=['gold','wood','ore','sulfur','crystal'];
test('version and isolated key',()=>{assert.equal(E.V,7);assert.equal(E.SAVE_KEY,'heoofgaia_hg_only_v07')});
test('HG11 city-image hotspots resolve to all 12 real building actions',()=>{
 assert.equal(P.CITY_SITES.length,12);for(const race of ['human','elf','orc','undead']){const seen=new Set(),sites=P.citySitesFor(race);assert.equal(sites.length,12);
  for(const [key,x,y] of sites){assert(!seen.has(key),`${race} duplicate hotspot ${key}`);seen.add(key);assert.equal(P.cityHit({width:1176,height:560,dataset:{race}},Math.round(1176*x),Math.round(560*y)),key,`${race} hotspot ${key}`)}assert.equal(seen.size,12);
 }
});
test('HG11 four-faction scene assets match 1176x560 provenance hashes',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/asset-manifest.json'),'utf8'));
 assert.equal(manifest.assets.length,4);const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 for(const asset of manifest.assets){assert.equal(asset.status,'RECREATED');assert.equal(asset.states.assetQcPass,true);const b=fs.readFileSync(path.join(dir,asset.runtime.projectPath));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert([2,6].includes(b[25]));assert.equal(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`,'1176x560');assert.equal(sha(b),asset.runtime.sha256,asset.faction);}
});
test('HG11 Human Barracks is a separate transparent building asset with real Chrome and v07 construction evidence',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/buildings/human-barracks-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.status,'RECREATED');assert.equal(manifest.faction,'human');assert.equal(manifest.buildingKey,'barracks');
 assert.equal(manifest.states.animationFrames,0);assert.equal(manifest.states.integratedInBuildingDetail,true);assert.equal(manifest.states.v07SaveLoadQueueVerified,true);
 for(const record of [manifest.master,manifest.cleanedMaster,manifest.runtime]){const bytes=fs.readFileSync(path.join(dir,record.projectPath));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,record.resolution);assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(sha(bytes),record.sha256);assert.deepEqual(record.alphaRange,[0,255]);}
 assert.equal(manifest.master.resolution,'1254x1254');assert.equal(manifest.runtime.resolution,'512x512');assert.deepEqual(manifest.runtime.pivotPixels,[256,488]);
 const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8'),runtime=fs.readFileSync(path.join(dir,manifest.runtime.projectPath));
 assert(html.includes(`id="asset-human-barracks"`));assert(html.includes(`src="data:image/png;base64,${runtime.toString('base64')}"`));assert(!html.includes('assets/generated/hg11/buildings/'));
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,manifest.integration.receipt),'utf8'));assert.equal(receipt.total,16);assert.equal(receipt.passed,16);assert.equal(receipt.failed,0);assert.deepEqual(receipt.errors,[]);
 assert(receipt.checks.some(c=>c.name==='v07 Save/Reload preserves the prerequisite Town Hall queue'&&c.passed));assert(receipt.checks.some(c=>c.name==='v07 Save/Reload keeps the paid Barracks queue and remaining time'&&c.passed));
 for(const row of manifest.integration.screenshots){const shot=fs.readFileSync(path.join(dir,row.projectPath));assert.equal(sha(shot),row.sha256);assert.equal(`${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`,row.resolution);}
 const parent=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/asset-manifest.json'),'utf8'));assert.equal(parent.buildingAssets[0].assetId,manifest.assetId);assert.match(parent.integration.independentBuildingAssets,/^PASS:/);
});
test('HG11 Human Town Hall is an independent transparent building with a real hotspot and v07 queue receipt',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/buildings/human-town-hall-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.status,'RECREATED');assert.equal(manifest.faction,'human');assert.equal(manifest.buildingKey,'hall');assert.equal(manifest.states.animationFrames,0);assert.equal(manifest.states.integratedInBuildingDetail,true);assert.equal(manifest.states.v07SaveLoadQueueVerified,true);
 for(const record of [manifest.master,manifest.cleanedMaster,manifest.runtime]){const bytes=fs.readFileSync(path.join(dir,record.projectPath));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,record.resolution);assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(sha(bytes),record.sha256);assert.deepEqual(record.alphaRange,[0,255]);}
 assert.equal(manifest.master.resolution,'1254x1254');assert.equal(manifest.runtime.resolution,'512x512');assert.deepEqual(manifest.runtime.pivotPixels,[256,488]);
 const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8'),runtime=fs.readFileSync(path.join(dir,manifest.runtime.projectPath));assert(html.includes('id="asset-human-town-hall"'));assert(html.includes(`src="data:image/png;base64,${runtime.toString('base64')}"`));assert(!html.includes('assets/generated/hg11/buildings/'));
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,manifest.integration.receipt),'utf8'));assert.equal(receipt.total,16);assert.equal(receipt.passed,16);assert.equal(receipt.failed,0);assert.deepEqual(receipt.errors,[]);assert(receipt.checks.some(c=>c.name==='The actual Human Town Hall canvas hotspot opens the Town Hall detail'&&c.passed));assert(receipt.checks.some(c=>c.name==='v07 Save/Reload preserves the prerequisite Town Hall queue'&&c.passed));
 for(const row of manifest.integration.screenshots){const shot=fs.readFileSync(path.join(dir,row.projectPath));assert.equal(sha(shot),row.sha256);assert.equal(`${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`,row.resolution);}
 const parent=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/asset-manifest.json'),'utf8'));assert(parent.buildingAssets.some(x=>x.assetId===manifest.assetId));assert.match(parent.integration.independentBuildingAssets,/^PASS:/);
});
test('HG11 Orc Imp sprite preserves provenance, alpha and captured battle integration',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/units/asset-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.status,'RECREATED');assert.equal(manifest.animationFrames,undefined);
 assert.equal(manifest.states.animationFrames,0);assert.equal(manifest.states.integratedInBattle,true);assert.deepEqual(manifest.master.resolution,'1254x1254');assert.deepEqual(manifest.runtime.resolution,'512x512');
 for(const record of [manifest.master,manifest.cleanedMaster,manifest.runtime]){const file=path.join(dir,record.projectPath),bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,record.resolution);assert.equal(bytes[25],6);assert.equal(sha(bytes),record.sha256);}
 assert.equal(manifest.runtime.pivotPixels[0],256);assert(manifest.runtime.pivotPixels[1]>0&&manifest.runtime.pivotPixels[1]<512);
 assert.match(manifest.qualityGate.battleRender,/^PASS:/);assert.match(manifest.qualityGate.readabilityAtBattleScale,/^PASS:/);
 const evidence=manifest.battleEvidence,shot=fs.readFileSync(path.join(dir,evidence.screenshot));assert.equal(sha(shot),evidence.sha256);assert.equal(`${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`,evidence.resolution);
 const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8');assert(html.includes('id="unit-orc-imp"'));assert(!html.includes('assets/generated/hg11/units/'));assert(html.includes('data:image/png;base64,'));
});
test('HG11 Elf Centaur sprite has verified alpha, hashes, offline embed and actual battle receipt',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/units/elf-centaur-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.unitId,'elf_1');assert.equal(manifest.status,'RECREATED');assert.equal(manifest.states.animationFrames,0);assert.equal(manifest.states.integratedInBattle,true);
 for(const record of [manifest.master,manifest.cleanedMaster,manifest.runtime]){const bytes=fs.readFileSync(path.join(dir,record.projectPath));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,record.resolution);assert.equal(bytes[25],6);assert.equal(sha(bytes),record.sha256);}
 assert.deepEqual(manifest.runtime.pivotPixels,[256,446]);assert.match(manifest.qualityGate.readabilityAtBattleScale,/^PASS:/);assert.match(manifest.qualityGate.battleRender,/^PASS:/);
 const evidence=manifest.battleEvidence,shot=fs.readFileSync(path.join(dir,evidence.screenshot));assert.equal(sha(shot),evidence.sha256);assert.equal(`${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`,evidence.resolution);
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,evidence.receipt),'utf8'));assert.equal(receipt.failed,0);assert.equal(receipt.elfSpriteRuntime.imageReady,true);assert(receipt.elfSpriteRuntime.chromeSpriteDraws>0);assert(receipt.elfSpriteRuntime.actualUiMarch,true);
 const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8');assert(html.includes('id="unit-elf-centaur"'));assert(!html.includes('assets/generated/hg11/units/'));assert(html.includes('data:image/png;base64,'));
});
test('HG11 Human Archer sprite preserves provenance, alpha, offline embed and actual NPC battle receipt',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/units/human-archer-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.unitId,'human_3');assert.equal(manifest.status,'RECREATED');assert.equal(manifest.states.animationFrames,0);
 assert.equal(manifest.states.integratedInBattle,true);assert.equal(manifest.states.enemyFlipVerified,true);assert.equal(manifest.states.saveLoadVerified,true);
 for(const record of [manifest.master,manifest.cleanedMaster,manifest.runtime]){const file=path.join(dir,record.projectPath),bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,record.resolution);assert.equal(bytes[25],6);assert.equal(sha(bytes),record.sha256);assert.deepEqual(record.alphaRange,[0,255]);}
 assert.deepEqual(manifest.runtime.pivotPixels,[256,446]);assert.deepEqual(manifest.runtime.visibleBoundsAlpha8,[153,66,357,445]);
 assert.match(manifest.qualityGate.battleRender,/^PASS:/);assert.match(manifest.qualityGate.enemyFlip,/^PASS:/);assert.match(manifest.qualityGate.saveLoadImpact,/^PASS:/);
 const evidence=manifest.battleEvidence,shot=fs.readFileSync(path.join(dir,evidence.screenshot));assert.equal(sha(shot),evidence.sha256);assert.equal(`${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`,evidence.resolution);
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,evidence.receipt),'utf8'));assert.equal(receipt.failed,0);assert.equal(receipt.humanArcherRuntime.imageReady,true);assert(receipt.humanArcherRuntime.draws>0);assert(receipt.humanArcherRuntime.actualUiMarch,true);assert.equal(receipt.enemyRendererCheck.enemyHorizontalFlip,true);
 const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8');assert(html.includes('id="unit-human-archer"'));assert(!html.includes('assets/generated/hg11/units/'));
 const runtime=fs.readFileSync(path.join(dir,manifest.runtime.projectPath));assert(html.includes(`src="data:image/png;base64,${runtime.toString('base64')}"`));
});
test('HG11 Undead Skeleton Warrior sprite preserves provenance, alpha, offline embed and actual NPC battle receipt',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/units/undead-skeleton-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.unitId,'undead_1');assert.equal(manifest.status,'RECREATED');assert.equal(manifest.states.animationFrames,0);
 assert.equal(manifest.states.integratedInBattle,true);assert.equal(manifest.states.enemyFlipVerified,true);assert.equal(manifest.states.saveLoadVerified,true);
 for(const record of [manifest.master,manifest.cleanedMaster,manifest.runtime]){const file=path.join(dir,record.projectPath),bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,record.resolution);assert.equal(bytes[25],6);assert.equal(sha(bytes),record.sha256);assert.deepEqual(record.alphaRange,[0,255]);}
 assert.deepEqual(manifest.runtime.pivotPixels,[256,446]);assert.deepEqual(manifest.runtime.visibleBoundsAlpha8,[132,66,378,445]);
 assert.match(manifest.qualityGate.battleRender,/^PASS:/);assert.match(manifest.qualityGate.enemyFlip,/^PASS:/);assert.match(manifest.qualityGate.saveLoadImpact,/^PASS:/);
 const evidence=manifest.battleEvidence,shot=fs.readFileSync(path.join(dir,evidence.screenshot));assert.equal(sha(shot),evidence.sha256);assert.equal(`${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`,evidence.resolution);
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,evidence.receipt),'utf8'));assert.equal(receipt.failed,0);assert.equal(receipt.undeadSkeletonRuntime.imageReady,true);assert(receipt.undeadSkeletonRuntime.draws>0);assert(receipt.undeadSkeletonRuntime.actualUiMarch,true);assert.equal(receipt.enemyRendererCheck.enemyHorizontalFlip,true);
 const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8');assert(html.includes('id="unit-undead-skeleton"'));assert(!html.includes('assets/generated/hg11/units/'));
 const runtime=fs.readFileSync(path.join(dir,manifest.runtime.projectPath));assert(html.includes(`src="data:image/png;base64,${runtime.toString('base64')}"`));
});
test('HG11 Elf Scout sprite preserves provenance, alpha, Scouting research, offline embed and NPC battle receipt',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/units/elf-scout-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.unitId,'elf_2');assert.equal(manifest.status,'RECREATED');assert.equal(manifest.states.animationFrames,0);
 assert.equal(manifest.states.integratedInBattle,true);assert.equal(manifest.states.enemyFlipVerified,true);assert.equal(manifest.states.saveLoadVerified,true);
 for(const record of [manifest.master,manifest.cleanedMaster,manifest.runtime]){const file=path.join(dir,record.projectPath),bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,record.resolution);assert.equal(bytes[25],6);assert.equal(sha(bytes),record.sha256);assert.deepEqual(record.alphaRange,[0,255]);}
 assert.deepEqual(manifest.runtime.pivotPixels,[256,446]);assert.deepEqual(manifest.runtime.visibleBoundsAlpha8,[168,66,343,445]);
 assert.match(manifest.qualityGate.battleRender,/^PASS:/);assert.match(manifest.qualityGate.enemyFlip,/^PASS:/);assert.match(manifest.qualityGate.saveLoadImpact,/^PASS:/);
 const evidence=manifest.battleEvidence,shot=fs.readFileSync(path.join(dir,evidence.screenshot));assert.equal(sha(shot),evidence.sha256);assert.equal(`${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`,evidence.resolution);
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,evidence.receipt),'utf8'));assert.equal(receipt.failed,0);assert.equal(receipt.elfScoutRuntime.imageReady,true);assert(receipt.elfScoutRuntime.draws>0);assert(receipt.elfScoutRuntime.actualUiMarch,true);assert.equal(receipt.enemyRendererCheck.enemyHorizontalFlip,true);
 assert(receipt.checks.some(row=>row.name==='Real engine tick completes Scouting research exactly once'&&row.passed));
 const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8');assert(html.includes('id="unit-elf-scout"'));assert(!html.includes('assets/generated/hg11/units/'));
 const runtime=fs.readFileSync(path.join(dir,manifest.runtime.projectPath));assert(html.includes(`src="data:image/png;base64,${runtime.toString('base64')}"`));
});
test('4 races and 40 unique troops',()=>{assert.deepEqual(Object.keys(C.units).sort(),['elf','human','orc','undead']);assert.equal(Object.values(C.units).flat().length,40);assert.equal(new Set(Object.values(C.units).flat().map(x=>x.id)).size,40)});
test('China 2009 Sina combat catalog is edition-separated across all four factions',()=>{
 const sources={human:['身先士卒','坚守阵地','背水一战','齐射'],elf:['自然之力','生命之源','百步穿杨'],orc:['经骨强化','狂暴','战斗本能','怒号'],undead:['诅咒术','亡灵巫术','灵力增幅']};
 for(const [race,names] of Object.entries(sources)){const cn=E.make(race,1_000_000,'china2009'),intl=E.make(race,1_000_000);assert.deepEqual(Array.from(E.spells(cn),x=>x.sourceName),names);assert(E.spells(intl).every(x=>!x.sourceName));assert.notStrictEqual(E.spells(cn),E.spells(intl))}
 const legacy=E.make('human',1_000_000);delete legacy.spellEdition;assert.equal(E.parseSave(JSON.stringify(legacy)).spellEdition,'international');
 const saved=E.make('undead',1_000_000,'china2009'),loaded=E.parseSave(E.serializeSave(saved));assert.equal(loaded.spellEdition,'china2009');assert(E.strictSave(loaded));
 const corrupt=E.make('human',1_000_000);corrupt.spellEdition='unverified';assert.throws(()=>E.parseSave(JSON.stringify(corrupt)),/không hợp lệ/);
});
test('Sina 2009 regional Orc and Undead spell values change actual battle stats without changing international rules',()=>{
 const cast=(race,edition,id)=>{const s=E.make(race,1_000_000,edition),b=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);s.heroMagic[id]=1;s.heroes[0].equippedSpells=[id];b.allies=[{id:'p0',side:'player',unitId:`${race}_1`,name:'Ally',range:1,count:1,initial:1,hp:100,atk:100,def:100,spd:10,pool:100,x:4,y:2}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Enemy',range:1,count:1,initial:1,hp:100,atk:100,def:100,spd:1,pool:100,x:5,y:2}];s.battle=b;E.cast(s,id);return {ally:b.allies[0],enemy:b.enemies[0]}};
 assert.equal(cast('orc','china2009','harden_bones').ally.def,102);assert.equal(cast('orc','international','harden_bones').ally.def,103);
 assert.equal(cast('undead','china2009','curse').enemy.atk,98);assert.equal(cast('undead','international','curse').enemy.atk,99);
 assert.equal(cast('human','china2009','hold_the_line_cn').ally.def,105);
});
test('SRC57 Battle Instinct applies the Orc melee movement bonus, saves fractional steps and expires in battle',()=>{
 const s=E.make('orc',1_000_000,'china2009'),target=E.NPC_CAMPS_2009.find(c=>c.stars===1);s.buildings.magicTower=10;for(const k of C.keys)s.res[k]=100_000;
 E.researchHeroSpell(s,'battle_instinct');E.equipSpell(s,'battle_instinct');s.heroMagic.battle_instinct=10;
 const b=E.makeBattle(s,target.key);b.allies=[{id:'p0',slot:0,side:'player',unitId:'orc_1',name:'Imp',range:1,count:1,initial:1,hp:1e6,atk:1,def:1,spd:8,pool:1e6,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Distant observer',range:20,count:1,initial:1,hp:1e6,atk:0,def:1,spd:1,pool:1e6,x:10,y:8}];b.selected='p0';b.turn=1;s.battle=b;
 const active=E.cast(s,'battle_instinct');assert.deepEqual(JSON.parse(JSON.stringify({id:active.id,expiry:active.expiry,level:b.movementInstinct.level})),{id:'battle_instinct',expiry:6,level:10});
 E.battleAct(s,'move',{x:11,y:1});assert.equal(b.allies[0].x,3);assert.equal(b.allies[0].moveCredit,.3);
 let loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(loaded.battle.movementInstinct.level,10);assert.equal(loaded.battle.allies[0].moveCredit,.3);assert(E.strictSave(loaded));
 const moves=[];for(let i=0;i<3;i++){E.battleAct(loaded,'attack',{preserveMoveOrders:true});moves.push(loaded.battle.lastMoves.find(m=>m.unitId==='p0')?.steps)}
 assert.deepEqual(moves,[2,2,3]);assert.equal(loaded.battle.allies[0].x,10);assert(loaded.battle.movementInstinct);assert(E.strictSave(loaded));
 E.battleAct(loaded,'attack',{preserveMoveOrders:true});assert.equal(loaded.battle.allies[0].x,11);assert.equal(loaded.battle.movementInstinct,undefined);assert.equal(loaded.battle.allies[0].moveCredit,undefined);assert(E.strictSave(loaded));
});
test('HG09 movement preview is side-effect-free, avoids occupied cells and matches the real speed-based turn move',()=>{
 const s=E.make('human',1_000_001),target=E.NPC_CAMPS_2009.find(c=>c.stars===1),b=E.makeBattle(s,target.key);
 b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_4',name:'Preview Soldier',range:1,count:1,initial:1,hp:1000,atk:0,def:10,spd:7,pool:1000,x:1,y:1},{id:'p1',slot:1,side:'player',unitId:'human_1',name:'Blocker',range:1,count:1,initial:1,hp:1000,atk:0,def:10,spd:2,pool:1000,x:2,y:1}];
 b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Distant target',range:1,count:1,initial:1,hp:1000,atk:0,def:10,spd:1,pool:1000,x:8,y:7}];b.selected='p0';s.battle=b;
 const preview=E.battleMovePreview(b,'p0');assert.equal(preview.steps,2);assert(preview.cells.some(c=>c.x===1&&c.y===3&&c.steps===2));assert(!preview.cells.some(c=>c.x===2&&c.y===1));assert.equal(b.allies[0].moveCredit,undefined);assert(E.strictSave(s));
 const out=E.battleAct(s,'move',{x:1,y:3});assert.equal(out.type,'continue');const move=b.lastMoves.find(m=>m.unitId==='p0');assert.equal(move.steps,2);assert.equal(move.to.x,1);assert.equal(move.to.y,3);
 const restored=E.parseSave(E.serializeSave(s));assert.equal(restored.version,7);assert(E.strictSave(restored));assert.deepEqual(JSON.parse(JSON.stringify(E.battleMovePreview(restored.battle,'p0'))),JSON.parse(JSON.stringify(E.battleMovePreview(s.battle,'p0'))));
});
test('HG09 attack-range preview uses the real Manhattan hit check and remains unchanged through v07 reload',()=>{
 const s=E.make('human',1_000_002),target=E.NPC_CAMPS_2009.find(c=>c.stars===1),b=E.makeBattle(s,target.key);
 b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_3',name:'Range Archer',range:3,count:1,initial:1,hp:1000,atk:200,def:10,spd:9,pool:1000,x:1,y:1}];
 b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'In range',range:1,count:1,initial:1,hp:1e6,atk:0,def:100,pool:1e6,x:4,y:1},{id:'e1',side:'enemy',unitId:null,name:'Out of range',range:1,count:1,initial:1,hp:1e6,atk:0,def:100,pool:1e6,x:5,y:1},{id:'e2',side:'enemy',unitId:null,name:'Dead nearby',range:1,count:1,initial:1,hp:100,atk:0,def:1,pool:0,x:2,y:1}];b.selected='p0';s.battle=b;
 const before=JSON.stringify(s);assert.deepEqual(JSON.parse(JSON.stringify(E.battleTargetsInRange(b,'p0'))),['e0']);assert.deepEqual(JSON.parse(JSON.stringify(E.battleTargetsInRange(b,'missing'))),[]);assert.equal(JSON.stringify(s),before);const beforeBattle=E.parseSave(E.serializeSave(s));assert.equal(beforeBattle.version,7);assert.deepEqual(JSON.parse(JSON.stringify(E.battleTargetsInRange(beforeBattle.battle,'p0'))),['e0']);
 const out=E.battleAct(s,'attack'),event=b.lastEvents.find(e=>e.actorId==='p0');assert.equal(out.type,'continue');assert.equal(event.targetId,'e0');assert(event.damage>0);assert.equal(event.path.length,0);
 const expectedAfterBattle=JSON.parse(JSON.stringify(E.battleTargetsInRange(b,'p0'))),restored=E.parseSave(E.serializeSave(s));assert.equal(restored.version,7);assert(E.strictSave(restored));assert.deepEqual(JSON.parse(JSON.stringify(E.battleTargetsInRange(restored.battle,'p0'))),expectedAfterBattle);
});
test('HG08 evidence matrix has one row for every catalog troop',()=>{const matrix=fs.readFileSync(path.join(dir,'docs/research/HG08-TROOP-UNLOCK-MATRIX.md'),'utf8').match(/^\| (?:Human|Elf|Orc|Undead) \| \d+ \|/gm)||[];assert.equal(matrix.length,40)});
test('HG08 unlock matrix names match the canonical 40-unit catalog',()=>{const lines=fs.readFileSync(path.join(dir,'docs/research/HG08-TROOP-UNLOCK-MATRIX.md'),'utf8').split(/\r?\n/);const race={human:'Human',elf:'Elf',orc:'Orc',undead:'Undead'};for(const [key,units] of Object.entries(C.units))for(const u of units)assert(lines.some(line=>line.startsWith(`| ${race[key]} | ${u.tier} | ${u.name} |`)),`${key} T${u.tier} ${u.name}`)});
test('HG08 edition crosswalk maps every catalog ID and preserves localized labels',()=>{
 const text=fs.readFileSync(path.join(dir,'docs/research/HG08-UNIT-VERSION-CROSSWALK.md'),'utf8');
 const rows=text.split(/\r?\n/).filter(line=>/^\| (?:human|elf|orc|undead)_\d+ \|/.test(line));
 const byId=new Map(rows.map(line=>{const cells=line.split('|').map(x=>x.trim());return [cells[1],cells]}));
 const all=Object.values(C.units).flat(),raceName={human:'Human',elf:'Elf',orc:'Orc',undead:'Undead'};
 assert.equal(rows.length,40);assert.equal(byId.size,40);
 assert.deepEqual([...byId.keys()].sort(),all.map(u=>u.id).sort());
 for(const [race,units] of Object.entries(C.units))for(const u of units){const cells=byId.get(u.id);assert(cells,'missing '+u.id);assert.equal(cells[2],raceName[race]+' '+u.tier);assert.equal(cells[3],u.name);assert(cells[4],'missing Chinese label '+u.id);assert(cells[5],'missing Fandom label '+u.id)}
});test('5 original resources',()=>assert.deepEqual([...C.keys],v2));
test('troop point formula',()=>{const u=C.units.human[0];assert.equal(E.unitValue(u),u.cost.gold+5*(u.cost.wood+u.cost.ore)+10*(u.cost.sulfur+u.cost.crystal))});
test('new game all races valid with the v07 starting AP amount and Fame rank cap',()=>{for(const race of Object.keys(C.races)){const s=state(race);assert.equal(s.version,7);assert.equal(s.race,race);assert.equal(s.fame,5);assert.equal(s.ap,100);assert.equal(s.apMax,150);assert.equal(E.strictSave(s),true)}});
test('candidate slots at recorded level gates',()=>{assert.equal(E.tavernSlots(1),2);assert.equal(E.tavernSlots(2),3);assert.equal(E.tavernSlots(4),4);assert.equal(E.tavernSlots(9),7);assert.equal(E.tavernSlots(10),8)});
test('Tavern level 10 samples the cited community attribute bands and v07 persists candidate stats',()=>{
 const s=state();s.buildings.tavern=10;
 const sequence=[0,0,6575.5/6708,0.999999,6576.5/6708,0,6706.5/6708,0.999999];
 const originalRandom=vm.runInContext("Math.random",ctx);ctx.__tavernRandomDraws=sequence;ctx.__tavernRandomIndex=0;ctx.__tavernOriginalRandom=originalRandom;vm.runInContext("Math.random=()=>__tavernRandomDraws[__tavernRandomIndex++]??0.5",ctx);
 try{E.refreshTavern(s)}finally{vm.runInContext("Math.random=__tavernOriginalRandom",ctx);delete ctx.__tavernRandomDraws;delete ctx.__tavernRandomIndex;delete ctx.__tavernOriginalRandom}
 const h=s.tavern.offers[0];
 assert.deepEqual([h.atk,h.def,h.spd,h.int],[20,50,51,70]);
 assert.deepEqual([h.statColors.atk,h.statColors.def,h.statColors.spd,h.statColors.int],['white','blue','yellow','green']);
 assert.equal(s.tavern.offers.length,8);assert.equal(s.tavern.round,1);assert.equal(s.version,7);assert.equal(E.strictSave(s),true);
 const loaded=E.parseSave(E.serializeSave(s));assert.deepEqual(loaded.tavern.offers,s.tavern.offers);assert.equal(E.strictSave(loaded),true);
});
test('candidate hire exactly once',()=>{const s=state();s.fame=2200;const before=s.tavern.offers.length,id=s.tavern.offers[0].id;E.hireCandidate(s,id);assert.equal(s.tavern.offers.length,before-1);assert.equal(s.heroes.length,2);throws(()=>E.hireCandidate(s,id),/Ứng viên/)});
test('hire rejects insufficient gold without removing offer',()=>{const s=state(),offer=s.tavern.offers[0];s.res.gold=0;throws(()=>E.hireCandidate(s,offer.id),/Không đủ/);assert.equal(s.tavern.offers[0].id,offer.id)});
test('hero roster cap follows every dated SRC20 fame threshold',()=>{
 const cases=[[0,2],[199,2],[200,2],[799,2],[800,2],[2199,2],[2200,3],[5799,3],[5800,4],[11499,4],[11500,6],[20999,6],[21000,7],[32999,7],[33000,8],[53999,8],[54000,9],[79999,9],[80000,10],[149999,10],[150000,11],[299999,11],[300000,13],[499999,13],[500000,14],[699999,14],[700000,16],[999999,16],[1000000,18]];
 for(const [fame,limit] of cases)assert.equal(E.heroCountLimit(fame),limit,`Fame ${fame}`);
});
test('AP maximum and hourly recovery follow every dated SRC20 Fame rank',()=>{
 const rows=[[5,150,15],[200,165,16],[800,180,18],[2200,200,20],[5800,230,23],[11500,260,26],[21000,290,29],[33000,320,32],[54000,360,36],[80000,400,40],[150000,450,45],[300000,500,50],[500000,560,56],[700000,620,62],[1000000,700,70]];
 assert.deepEqual(JSON.parse(JSON.stringify(E.FAME_AP)),rows);
 for(const [fame,max,perHour] of rows){const stats=E.fameApStats(fame);assert.equal(stats.max,max,`Fame ${fame} max`);assert.equal(stats.perHour,perHour,`Fame ${fame} recovery`)}
});
test('Fame promotion raises AP cap without granting AP and preserves old v07 saves',()=>{
 const s=state();s.ap=140;s.fame=199;s.apMax=100;E.ensure08(s);assert.equal(s.apMax,150);assert.equal(s.ap,140);
 s.fame=200;E.ensure08(s);assert.equal(s.apMax,165);assert.equal(s.ap,140);
 const legacy=state();legacy.fame=5;legacy.ap=85;legacy.apMax=100;legacy.version=7;
 const migrated=E.parseSave(JSON.stringify(legacy));assert.equal(migrated.version,7);assert.equal(migrated.ap,85);assert.equal(migrated.apMax,150);
 const roundTrip=E.parseSave(E.serializeSave(migrated));assert.equal(roundTrip.ap,85);assert.equal(roundTrip.apMax,150);
});
test('hero cap rejects Tavern hire atomically and fame unlocks the next slot',()=>{
 const s=state(),first=s.tavern.offers[0];E.hireCandidate(s,first.id);assert.equal(s.heroes.length,2);
 const before={res:JSON.stringify(s.res),offers:JSON.stringify(s.tavern.offers)};
 throws(()=>E.hireCandidate(s,s.tavern.offers[0].id),/giới hạn 2 tướng/);
 assert.equal(s.heroes.length,2);assert.equal(JSON.stringify(s.res),before.res);assert.equal(JSON.stringify(s.tavern.offers),before.offers);
 s.fame=2200;E.hireCandidate(s,s.tavern.offers[0].id);assert.equal(s.heroes.length,3);
});
test('v07 saves above the new fame cap migrate intact and reject only additional hires',()=>{
 const legacy=state();const extra={...legacy.heroes[0],id:2,name:'Legacy Second Hero'},third={...legacy.heroes[0],id:3,name:'Legacy Third Hero'};legacy.heroes.push(extra,third);
 assert.equal(E.strictSave(legacy),true);const loaded=E.parseSave(E.serializeSave(legacy));
 assert.equal(loaded.heroes.length,3);assert.equal(loaded.heroes[1].name,'Legacy Second Hero');assert.equal(loaded.heroes[2].name,'Legacy Third Hero');
 const before={res:JSON.stringify(loaded.res),offers:JSON.stringify(loaded.tavern.offers)};
 throws(()=>E.hireCandidate(loaded,loaded.tavern.offers[0].id),/giới hạn 2 tướng/);
 assert.equal(JSON.stringify(loaded.res),before.res);assert.equal(JSON.stringify(loaded.tavern.offers),before.offers);assert.equal(loaded.heroes.length,3);
});
test('hero cap is account-wide while a secondary city keeps its own Tavern offers',()=>{
 const s=state();s.fame=5800;
 const other=E.make('elf',s.lastTick);E.ensure08(other);const city=JSON.parse(JSON.stringify(other.cities[0]));
 const tile=E.getTile('9,10');assert(tile);
 city.id='city-elf-qa';city.key=tile.key;city.name='Elf QA';city.main=false;s.cities.push(city);
 E.switchCity(s,city.id);const elfOffer=s.tavern.offers[0].id;E.hireCandidate(s,elfOffer);assert.equal(s.heroes.length,2);
 E.switchCity(s,'main');const humanOffer=s.tavern.offers[0].id;E.hireCandidate(s,humanOffer);assert.equal(s.heroes.length,3);
 E.switchCity(s,city.id);const secondElfOffer=s.tavern.offers[0].id;E.hireCandidate(s,secondElfOffer);assert.equal(s.heroes.length,4);
 E.switchCity(s,'main');const before={res:JSON.stringify(s.res),offers:JSON.stringify(s.tavern.offers)};
 throws(()=>E.hireCandidate(s,s.tavern.offers[0].id),/giới hạn 4 tướng/);
 assert.equal(JSON.stringify(s.res),before.res);assert.equal(JSON.stringify(s.tavern.offers),before.offers);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.heroes.length,4);E.switchCity(loaded,city.id);assert(!loaded.tavern.offers.some(h=>h.id===elfOffer||h.id===secondElfOffer));
});
test('tavern hourly refresh',()=>{const s=state();E.tick(s,s.lastTick+61000);assert.equal(s.tavern.round,1);assert.equal(s.tavern.remaining,3540)});
test('tavern multi-hour refresh catchup',()=>{const s=state();s.speed=1;E.tick(s,s.lastTick+3*3600*1000+120*1000);assert.equal(s.tavern.round,3);assert.equal(s.tavern.remaining,3480)});
test('tavern empty offers preserved across save',()=>{const s=state();s.tavern.offers=[];const z=E.parseSave(E.serializeSave(s));assert.equal(z.tavern.offers.length,0)});
test('resource basic positive and capped',()=>{const s=state();E.tick(s,s.lastTick+1e7);for(const k of C.keys)assert(s.res[k]<=E.limits(s)[k]+.00001)});
test('AP follows Fame hourly rate exactly once at the same wall time',()=>{const s=state();s.ap=0;s.speed=1;const t=s.lastTick+3600*1000;E.tick(s,t);let a=s.ap;E.tick(s,t);assert.equal(s.ap,a);assert.equal(a,15);assert.equal(s.apMax,150)});
test('Fame 200 earns 16 AP in one hour under the dated rank table',()=>{const s=state();s.fame=200;s.ap=0;s.speed=1;E.ensure08(s);const t=s.lastTick+3600*1000;E.tick(s,t);assert.equal(s.ap,16);assert.equal(s.apMax,165)});
test('offline catch-up caps 24 wall-hours and then applies each supported game speed',()=>{
 assert.equal(E.MAX_OFFLINE_WALL_SECONDS,86400);
 assert.equal(E.gameElapsedSeconds({speed:1},0,36*3600*1000),86400);
 assert.equal(E.gameElapsedSeconds({speed:60},0,12*3600*1000),12*3600*60);
 assert.equal(E.gameElapsedSeconds({speed:60},0,36*3600*1000),86400*60);
});
test('HG10 24-hour offline catch-up completes concurrent paid queues and settles once',()=>{
 const s=expensive(state());s.speed=1;
 E.upgrade(s,'market');E.recruit(s,'human_1',2);E.researchSpell(s,'bootcamp');
 s.wounded.human_1=2;E.heal(s);
 for(const k of C.keys)s.res[k]=Math.floor(E.limits(s)[k]*.4);
 const control=E.clone(s),mine=E.TILES.find(t=>t.kind==='mine'&&t.value==='gold');assert(mine);
 s.mines.push({key:mine.key,res:mine.value,level:mine.level,cityId:'main'});
 const start=s.lastTick,end=start+24*3600*1000,goldBefore=s.res.gold;
 E.tick(s,end);E.tick(control,end);
 assert.equal(s.lastTick,end);assert.equal(s.ap,s.apMax);assert.equal(s.tavern.round,24);assert.equal(s.tavern.remaining,3600);
 assert.equal(s.buildings.market,1);assert.equal(s.buildingQueue,null);assert.equal(s.training.length,0);
 assert.equal(s.researchQueue,null);assert.equal(s.spells.bootcamp,1);
 assert.equal(s.arenaQueue,null);assert.equal(s.wounded.human_1,0);assert.equal(s.army.human_1,20);
 assert.equal((s.res.gold-goldBefore)-(control.res.gold-goldBefore),4800, 'gold must include the source-listed 24h mine yield');
 const settled=JSON.stringify(s),loaded=E.parseSave(E.serializeSave(s));E.tick(s,end);E.tick(loaded,end);
 assert.equal(JSON.stringify(s),settled);assert.equal(JSON.stringify(loaded),settled);assert(E.strictSave(loaded));
});
test('24 real offline hours at 60x advance 60 game-days without per-hour duplication',()=>{
 const s=expensive(state());s.speed=60;E.upgrade(s,'market');const end=s.lastTick+24*3600*1000;E.tick(s,end);
 assert.equal(s.lastTick,end);assert.equal(s.buildings.market,1);assert.equal(s.buildingQueue,null);
 assert.equal(s.tavern.round,1440);assert.equal(s.tavern.remaining,3600);assert.equal(s.ap,s.apMax);
 const settled={...s.res},army={...s.army};E.tick(s,end);assert.deepEqual({...s.res},settled);assert.deepEqual({...s.army},army);
});
test('Market and Bazaar can be built as queue',()=>{for(const key of ['market','bazaar']){const s=expensive(state());E.upgrade(s,key);assert.equal(s.buildingQueue.key,key);assert.equal(s.buildings[key],0);E.tick(s,s.lastTick+s.buildingQueue.remaining/60*1000+1000);assert.equal(s.buildings[key],1)}});
test('no second construction until finished',()=>{const s=state();E.upgrade(s,'hall');throws(()=>E.upgrade(s,'market'),/hàng đợi/)});
test('Town Hall caps each race recruitment building without charging on rejection',()=>{
 for(const race of Object.keys(C.races)){
  const s=expensive(state(race)),key=E.troopBuildingKey(s);s.buildings.hall=1;s.buildings[key]=1;
  const res=JSON.stringify(s.res);throws(()=>E.upgrade(s,key),/Town Hall/);
  assert.equal(s.buildings[key],1);assert.equal(JSON.stringify(s.res),res);assert.equal(s.buildingQueue,null);
  s.buildings.hall=2;E.upgrade(s,key);assert.equal(s.buildingQueue.key,key);assert.equal(s.buildingQueue.level,2);assert.equal(s.buildings[key],1);
 }
});
test('construction once, no duplication',()=>{const s=state();E.upgrade(s,'hall');const b=s.buildingQueue.remaining;const now=s.lastTick+b/60*1000+1200;E.tick(s,now);assert.equal(s.buildings.hall,2);const res=JSON.stringify(s.res);E.tick(s,now);assert.equal(JSON.stringify(s.res),res)});
test('Castellan INT adds gold output',()=>{const s=state();const base=E.rate(s).gold;s.heroes[0].int=40;E.appoint(s,1);assert(E.rate(s).gold>base)});
test('hero equipment influences combat stats',()=>{const s=state();const item=E.addItem(s,'copper_blade','qa');E.equipItem(s,item.uid);assert(E.heroStats(s).atk>s.heroes[0].atk)});
test('SRC20/Sina Hero SPD adds the dated 0.02 battle-speed increment per point',()=>{
 const tile=E.TILES.find(t=>t.kind==='npc'&&E.pathfind('3,4',t.key)),unit=E.getUnit(state(),'human_1');assert(tile);
 for(const [heroSpeed,bonus] of [[10,0],[60,1],[120,2.2]]){const s=state();s.heroes[0].spd=heroSpeed;const battle=E.makeBattle(s,tile.key);assert.equal(battle.allies[0].spd,unit.spd+bonus,`Hero SPD ${heroSpeed}`)}
});
test('Derived world-march factor uses the dated increment and v07 keeps an underway ETA',()=>{
 assert.equal(E.marchSpeedFactor(10),1);assert.equal(E.marchSpeedFactor(60),2);assert.equal(E.marchSpeedFactor(120),3.2);
 const path=['a','b','c','d','e'];assert.equal(E.marchDuration(10,path),96);assert.equal(E.marchDuration(60,path),58);assert.equal(E.marchDuration(120,path),44);
 const s=state();s.heroes[0].spd=10;const target=E.NPC_CAMPS_2009.find(q=>q.stars>=5&&E.pathfind('3,4',q.key)?.length>=8);assert(target,'Need a long source-listed target path');
 const route=E.pathfind('3,4',target.key),expected=E.marchDuration(10,route,E.armyMarchFactor(s));E.startMarch(s,target.key);assert.equal(s.march.remaining,expected);assert.equal(s.heroes[0].spd,10);
 const loaded=E.parseSave(E.serializeSave(s)),remaining=loaded.march.remaining,total=loaded.march.total;loaded.heroes[0].spd=120;
 assert.equal(loaded.march.remaining,remaining);assert.equal(loaded.march.total,total);assert.equal(loaded.march.target,target.key);assert.equal(E.strictSave(loaded),true);
});
test('Outbound and return march timers both include equipped and active world SPD bonuses',()=>{
 const target=E.NPC_CAMPS_2009.find(q=>q.stars>=5&&E.pathfind('3,4',q.key)?.length>=8);assert(target);const itemFor=s=>{const item=E.addItem(s,'traveler_cloak','qa');E.equipItem(s,item.uid);s.heroBuffs.push({heroId:1,stat:'spd',remaining:7200,sourceKey:'62,57'})};
 const outbound=state();itemFor(outbound);const outSpeed=E.heroStats(outbound,1).spd,outPath=E.pathfind('3,4',target.key);E.startMarch(outbound,target.key);
 assert.equal(outbound.march.remaining,E.marchDuration(outSpeed,outPath,E.armyMarchFactor(outbound,outbound.expedition.formation)));assert.equal(outbound.heroes[0].spd,7,'temporary dispatch stats are restored after path calculation');
 const returning=state();itemFor(returning);const from=target.key,backPath=E.pathfind(from,'3,4');returning.stationedHeroes=[{heroId:1,key:from,homeKey:'3,4',homeCityId:'main',army:{human_1:4},formation:[{unitId:'human_1',count:4}]}];
 const returnSpeed=E.heroStats(returning,1).spd,seconds=E.recallHero(returning,1);
 assert.equal(seconds,E.marchDuration(returnSpeed,backPath,E.armyMarchFactor(returning,[{unitId:'human_1',count:4}])));assert.equal(returning.march.phase,'return');assert.equal(returning.march.remaining,returning.march.total);assert.equal(E.strictSave(E.parseSave(E.serializeSave(returning))),true);
});
test('market cannot sell without building',()=>{const s=state();throws(()=>E.sell(s,'wood',1),/Market/)});
test('market sell after build and gold capacity',()=>{const s=state();s.buildings.market=1;const before=s.res.gold;const wood=s.res.wood;E.sell(s,'wood',10);assert.equal(s.res.wood,wood-10);assert.equal(s.res.gold,before+20)});
test('bazaar buys real inventory',()=>{const s=state();s.buildings.bazaar=1;const old=s.inventory.length;E.buyItem(s,'copper_blade');assert.equal(s.inventory.length,old+1)});
test('seven-slot formation supports duplicate unit types',()=>{const s=state();E.setFormation(s,[{unitId:'human_1',count:5},{unitId:'human_1',count:7}]);assert.equal(s.formation.length,2);assert.equal(E.troopValue(s),12*E.unitValue(E.getUnit(s,'human_1')))});
test('cannot assign beyond available army',()=>{const s=state();throws(()=>E.setFormation(s,[{unitId:'human_1',count:17}]),/vượt/)});
test('Captured mines add the dated 2009 resource output and do not scale by unverified mine level',()=>{
 const s=state(),base=E.rate(s),expected={gold:200,wood:40,ore:40,sulfur:20,crystal:20};
 assert.deepEqual({...E.MINE_HOURLY},expected);
 for(const res of Object.keys(expected)){const testState={...s,mines:[{key:'test-'+res,res,level:7}]};assert.equal(E.rate(testState)[res]-base[res],expected[res],res)}
 const two={...s,mines:[{key:'wood-a',res:'wood',level:1},{key:'wood-b',res:'wood',level:2}]};
 assert.equal(E.rate(two).wood-base.wood,80);
});
test('Mine income is credited by an in-game hour tick and survives v07 save/reload',()=>{
 const owned=state(),empty=state();owned.speed=empty.speed=1;owned.mines=Object.entries(E.MINE_HOURLY).map(([res])=>({key:'mine-'+res,res,level:1}));
 const beforeOwned={...owned.res},beforeEmpty={...empty.res},end=owned.lastTick+3600000;E.tick(owned,end);E.tick(empty,end);
 for(const res of Object.keys(E.MINE_HOURLY))assert.equal((owned.res[res]-beforeOwned[res])-(empty.res[res]-beforeEmpty[res]),E.MINE_HOURLY[res],res);
 const loaded=E.parseSave(E.serializeSave(owned)),before={...loaded.res};E.tick(loaded,loaded.lastTick+3600000);
 for(const res of Object.keys(E.MINE_HOURLY))assert.equal(loaded.res[res]-before[res],E.rate(owned)[res],res);
});
test('Fame mine capacity matches the dated 2009 rank table at every boundary',()=>{
 const cases=[[0,5],[2199,5],[2200,6],[5799,6],[5800,7],[11499,7],[11500,8],[20999,8],[21000,9],[32999,9],[33000,11],[53999,11],[54000,13],[79999,13],[80000,15],[149999,15],[150000,17],[299999,17],[300000,20],[500000,20],[700000,20],[1000000,20]];
 for(const [fame,limit] of cases)assert.equal(E.mineLimit(fame),limit,'Fame '+fame);
 assert.deepEqual(JSON.parse(JSON.stringify(E.FAME_MINE_CAPS)),cases.filter(([f])=>[0,2200,5800,11500,21000,33000,54000,80000,150000,300000,500000,700000,1000000].includes(f)));
});
test('Fame mine cap rejects a new mine march atomically before AP spend',()=>{
 const s=state();s.fame=0;s.mines=E.TILES.filter(t=>t.kind==='mine').slice(0,5).map(t=>({key:t.key,res:t.value,level:t.level}));
 const target=E.TILES.find(t=>t.kind==='mine'&&!s.mines.some(m=>m.key===t.key)&&E.pathfind('3,4',t.key));assert(target);
 const before=JSON.stringify(s);throws(()=>E.startMarch(s,target.key),/hạn mức 5 mỏ/);assert.equal(JSON.stringify(s),before);
});
test('Fame unlock, mine victory and v07 reload preserve the sixth mine slot',()=>{
 const s=state();s.fame=2200;s.mines=E.TILES.filter(t=>t.kind==='mine').slice(0,5).map(t=>({key:t.key,res:t.value,level:t.level}));
 const target=E.TILES.find(t=>t.kind==='mine'&&!s.mines.some(m=>m.key===t.key)&&E.pathfind('3,4',t.key));assert(target);
 E.startMarch(s,target.key);assert.equal(s.ap,94);const end=s.lastTick+s.march.remaining/60*1000+1200;E.tick(s,end);assert(s.battle&&s.battle.target===target.key);
 for(const enemy of s.battle.enemies){enemy.pool=0;enemy.count=0}
 assert.equal(E.battleAct(s,'attack').type,'win');assert.equal(s.mines.length,6);assert.equal(s.fame,2210);assert.equal(E.mineLimit(s),6);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(loaded.mines.length,6);assert.equal(E.mineLimit(loaded),6);
 const other=E.TILES.find(t=>t.kind==='mine'&&!loaded.mines.some(m=>m.key===t.key)&&E.pathfind('3,4',t.key));assert(other);const before=JSON.stringify(loaded);throws(()=>E.startMarch(loaded,other.key),/hạn mức 6 mỏ/);assert.equal(JSON.stringify(loaded),before);
});
test('march AP deduction and battle opening',()=>{const s=state();const t=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));assert(t);E.startMarch(s,t.key);assert.equal(s.ap,94);const end=s.lastTick+s.march.remaining/60*1000+1200;E.tick(s,end);assert(s.battle);assert.equal(s.march,null);assert.equal(s.battle.allies.length,1)});
test('Stand By skips the selected stack once so an approaching melee can close distance',()=>{const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Waiting group',range:1,count:2,initial:2,hp:100,atk:10,def:0,spd:10,pool:200,x:4,y:2}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Approaching group',range:1,count:1,initial:1,hp:100,atk:10,def:0,spd:1,pool:100,x:5,y:2}];b.selected='p0';b.orders={};const dealt=E.battleAct(s,'defend');assert.equal(dealt.type,'continue');assert.equal(dealt.dealt,0);assert.equal(b.enemies[0].pool,100);assert(b.allies[0].pool<200);assert.equal(b.orders.p0,'attack');assert.equal(b.lastTargets.e0,'p0');const attacked=E.battleAct(s,'attack');assert(attacked.dealt>0);assert(b.enemies[0].pool<100)});
test('Retreat command moves only the selected stack back one modeled cell and preserves its troops',()=>{const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Falling back group',range:1,count:2,initial:2,hp:100,atk:10,def:0,spd:10,pool:200,x:4,y:2}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Enemy group',range:1,count:1,initial:1,hp:100,atk:10,def:0,spd:1,pool:100,x:5,y:2}];b.selected='p0';b.orders={};const out=E.battleAct(s,'retreat');assert.equal(out.type,'continue');assert.equal(b.allies[0].x,3);assert(b.allies[0].pool<200);assert.equal(b.enemies[0].pool,100);assert.equal(b.orders.p0,'attack');assert.equal(s.battle,b)});
test('Focus selects the requested enemy without an unsupported damage bonus',()=>{const encounter=()=>{const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_3',name:'Ranged group',range:20,count:1,initial:1,hp:1000,atk:100,def:10,spd:10,pool:1000,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'First target',range:1,count:1,initial:1,hp:100000,atk:0,def:0,spd:1,pool:100000,x:2,y:1},{id:'e1',side:'enemy',unitId:null,name:'Focused target',range:1,count:1,initial:1,hp:100000,atk:0,def:0,spd:1,pool:100000,x:2,y:2}];b.selected='p0';b.orders={};return s};const normal=encounter(),focused=encounter();const attack=E.battleAct(normal,'attack'),selected=E.battleSelect(focused,'e1'),focus=E.battleAct(focused,'focus');assert.equal(selected.id,'e1');assert.equal(normal.battle.lastTargets.p0,'e0');assert.equal(focused.battle.lastTargets.p0,'e1');assert.equal(focus.dealt,attack.dealt)});
test('Sina 2009 manual battle grace deadline is 10 seconds and survives v07 Save/Load',()=>{const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const created=s.battle.autoUntil;assert(Number.isFinite(created));assert(created>=Date.now()+9000&&created<=Date.now()+10_100);const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.version,7);assert.equal(saved.battle.autoUntil,created);const before=Date.now();E.battleAct(saved,'advance');assert(saved.battle.autoUntil>=before+9000);assert(E.strictSave(saved));});
test('Outbound dispatch removes its formation from the city and survives a v07 save migration',()=>{
 const s=state(),rawArmy=16;s.formation=[{unitId:'human_1',count:7}];const tile=E.TILES.find(t=>t.kind==='npc'&&E.pathfind('3,4',t.key));
 E.startMarch(s,tile.key);assert.equal(s.army.human_1,rawArmy-7);assert.equal(s.expedition.army.human_1,7);assert.equal(s.march.phase,'outbound');assert.equal(E.strictSave(s),true);
 const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.army.human_1,9);assert.equal(saved.expedition.army.human_1,7);
 const legacy=JSON.parse(JSON.stringify(s));delete legacy.expedition;delete legacy.stationedHeroes;delete legacy.parallelMarches;legacy.army.human_1=rawArmy;legacy.formation=[{unitId:'human_1',count:7}];
 const migrated=E.parseSave(JSON.stringify(legacy));assert.equal(migrated.army.human_1,9);assert.equal(migrated.expedition.army.human_1,7);assert.equal(migrated.march.phase,'outbound');assert.deepEqual([...migrated.parallelMarches],[]);assert.equal(legacy.army.human_1,rawArmy);
});
test('HG10 allows three concurrent hero marches, saves them, serializes battles, and blocks a fourth without cost',()=>{
 const s=state();s.fame=5800;E.ensure08(s);s.heroes.push({id:2,name:'Rin',level:1,xp:0,atk:20,def:10,spd:20,int:10},{id:3,name:'Dao',level:1,xp:0,atk:20,def:10,spd:20,int:10},{id:4,name:'Minh',level:1,xp:0,atk:20,def:10,spd:20,int:10});
 const targets=E.TILES.filter(t=>t.kind==='npc'&&E.pathfind('3,4',t.key));assert(targets.length>=4);s.formation=[{unitId:'human_1',count:4}];
 E.startMarch(s,targets[0].key);for(const [heroId,target] of [[2,targets[1]],[3,targets[2]]]){E.selectHero(s,heroId);E.setFormation(s,[{unitId:'human_1',count:4}]);E.startMarch(s,target.key)}
 assert.equal(s.expedition.heroId,1);assert.equal(s.parallelMarches.length,2);assert.equal(Object.values(s.parallelMarches[0].army).reduce((a,b)=>a+b,0),4);assert.equal(s.army.human_1,4);assert.equal(E.strictSave(s),true);throws(()=>E.switchCity(s,'main'),/chờ hành quân/);
 const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.parallelMarches.length,2);assert.equal(saved.parallelMarches[1].heroId,3);
 E.selectHero(s,4);E.setFormation(s,[{unitId:'human_1',count:1}]);const before={ap:s.ap,army:s.army.human_1,queued:JSON.stringify(s.parallelMarches),march:JSON.stringify(s.march)};throws(()=>E.startMarch(s,targets[3].key),/3 tướng/i);assert.equal(s.ap,before.ap);assert.equal(s.army.human_1,before.army);assert.equal(JSON.stringify(s.parallelMarches),before.queued);assert.equal(JSON.stringify(s.march),before.march);
 s.speed=1;s.march.remaining=.01;for(const q of s.parallelMarches)q.remaining=.01;E.tick(s,s.lastTick+1000);assert(s.battle);assert.equal(s.expedition.heroId,1);assert(s.parallelMarches.every(q=>q.phase==='arrived'));assert.equal(E.strictSave(E.parseSave(E.serializeSave(s))),true);
 for(let battleNo=0;battleNo<3;battleNo++){
  assert(s.battle,`battle ${battleNo+1} must start`);for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0;e.def=0}for(const a of s.battle.allies)a.range=20;
  let result,guard=0;while(s.battle&&guard++<10)result=E.battleAct(s,'attack');assert.equal(result.type,'win');
  if(s.march?.phase==='return'){s.march.remaining=.01;E.tick(s,s.lastTick+1000)}
  if(battleNo<2){assert(s.battle,`next arrived march ${battleNo+2} should enter battle after return`);assert.equal(s.expedition.heroId,battleNo+2)}
 }
 assert.equal(s.expedition,null);assert.equal(s.parallelMarches.length,0);assert.equal(s.army.human_1,16);assert.equal(E.strictSave(s),true);
});
test('Legacy v07 mid-battle save migrates deployed survivors without losing reserve troops',()=>{
 const s=state(),tile=E.TILES.find(t=>t.kind==='npc'&&E.pathfind('3,4',t.key));s.formation=[{unitId:'human_1',count:7}];
 s.march={target:tile.key,remaining:0,total:90,heroId:1,path:E.pathfind('3,4',tile.key)};s.battle=E.makeBattle(s,tile.key);s.march=null;
 delete s.expedition;delete s.stationedHeroes;
 const migrated=E.parseSave(JSON.stringify(s));assert.equal(migrated.army.human_1,9);assert.equal(migrated.expedition.army.human_1,7);assert.equal(migrated.expedition.phase,'battle');assert.equal(migrated.battle.allies[0].count,7);assert.equal(E.strictSave(migrated),true);
});
test('Mine victory stations hero and troops; recall returns them once without AP',()=>{
 const s=state();s.heroes[0].atk=10000;s.formation=[{unitId:'human_1',count:16}];const tile=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key)),ap=s.ap;
 E.startMarch(s,tile.key);assert.equal(s.army.human_1,0);assert.equal(s.expedition.army.human_1,16);assert.equal(s.ap,ap-6);
 E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);assert(s.battle);assert.equal(s.battle.allies[0].count,16);
 s.battle.enemies=s.battle.enemies.slice(0,1);for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0}
 let result,guard=0;while(s.battle&&guard++<10)result=E.battleAct(s,'attack');assert.equal(result.type,'win');assert(s.mines.some(m=>m.key===tile.key));assert.equal(s.stationedHeroes[0].heroId,1);assert.equal(s.stationedHeroes[0].key,tile.key);assert.equal(s.army.human_1,0);assert.equal(s.expedition,null);assert.equal(E.strictSave(s),true);
 assert.throws(()=>E.selectHero(s,1),/đồn trú/);assert.throws(()=>E.startMarch(s,E.TILES.find(t=>t.kind==='npc').key),/đồn trú/i);
 const beforeAP=s.ap,seconds=E.recallHero(s,1);assert(seconds>0);assert.equal(s.ap,beforeAP);assert.equal(s.stationedHeroes.length,0);assert.equal(s.march.phase,'return');assert.equal(s.expedition.army.human_1,16);
 const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.march.phase,'return');assert.equal(saved.expedition.army.human_1,16);E.tick(saved,saved.lastTick+saved.march.remaining/saved.speed*1000+1000);
 assert.equal(saved.march,null);assert.equal(saved.expedition,null);assert.equal(saved.army.human_1,16);assert.equal(saved.mines.length,1);assert.equal(E.strictSave(saved),true);
 assert.equal(E.rate(saved)[tile.value],E.rate(state())[tile.value]+E.MINE_HOURLY[tile.value]);throws(()=>E.recallHero(saved,1),/không đồn trú/);
});
test('Defeated hero returns along a saved route after the expedition army is lost',()=>{
 const s=state(),tile=E.TILES.find(t=>t.kind==='npc'&&E.pathfind('3,4',t.key));s.formation=[{unitId:'human_1',count:1}];E.startMarch(s,tile.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
 const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Last scout',range:1,count:1,initial:1,hp:1,atk:1,def:0,spd:1,pool:1,x:1,y:4}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Overwhelming enemy',range:20,count:1,initial:1,hp:1000,atk:100000,def:100000,spd:100,pool:1000,x:10,y:4}];b.selected='p0';b.orders={};b.focused=null;
 assert.equal(E.battleAct(s,'attack').type,'lose');assert.equal(s.expedition.phase,'returning');assert.equal(s.expedition.army.human_1,0);assert.equal(s.march.phase,'return');assert.equal(E.strictSave(s),true);
 const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.expedition.army.human_1,0);E.tick(saved,saved.lastTick+saved.march.remaining/saved.speed*1000+1000);assert.equal(saved.expedition,null);assert.equal(saved.march,null);assert.equal(E.heroAway(saved,1),false);assert.equal(E.strictSave(saved),true);
});
test('Ranged auto-target selects the strongest modeled stack across distance',()=>{const s=state();const b=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_3',name:'Ranged group',range:20,count:5,initial:5,hp:100,atk:10,def:1,spd:100,pool:500,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Near weak target',range:1,count:1,initial:1,hp:100,atk:1,def:1,spd:1,pool:100,x:2,y:1},{id:'e1',side:'enemy',unitId:null,name:'Far strong target',range:1,count:2,initial:2,hp:100,atk:50,def:1,spd:1,pool:200,x:10,y:8}];b.selected='p0';b.orders={};b.focused=null;s.battle=b;E.battleAct(s,'attack');assert.equal(b.lastTargets.p0,'e1')});test('automatic melee selects highest modeled power in the nearest group and records the choice',()=>{const s=state();s.army.human_1=1;s.army.human_2=2;s.army.human_3=10;const b=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Near weak unit',range:1,count:1,initial:1,hp:100,atk:5,def:1,spd:1,pool:100,x:4,y:4},{id:'p1',slot:1,side:'player',unitId:'human_2',name:'Strong nearby unit',range:1,count:2,initial:2,hp:100,atk:20,def:1,spd:1,pool:200,x:5,y:5},{id:'p2',slot:2,side:'player',unitId:'human_3',name:'Powerful far unit',range:1,count:10,initial:10,hp:100,atk:100,def:1,spd:1,pool:1000,x:10,y:8}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Fast enemy',range:1,count:1,initial:1,hp:100,atk:20,def:1,spd:100,pool:100000,x:5,y:4}];b.selected='p0';b.orders={};b.focused=null;s.battle=b;E.battleAct(s,'attack');assert.equal(b.lastTargets.e0,'p1');assert.equal(b.lastTargets.p0,'e0');assert.equal(b.lastTargets.p1,'e0');assert.equal(b.lastTargets.p2,'e0')});
test('valid native v07 export/import',()=>{const s=state();const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(loaded.res.gold,s.res.gold)});
test('v05 migration without mutating input',()=>{const s=state();const legacy=JSON.parse(JSON.stringify(s));delete legacy.tavern;legacy.version=5;const raw=JSON.stringify(legacy);const migrated=E.parseSave(raw);assert.equal(migrated.version,7);assert(migrated.tavern.offers.length>0);assert.equal(JSON.stringify(legacy),raw)});
test('tampered save rejected',()=>{const s=state();s.res.gold=-1;throws(()=>E.parseSave(JSON.stringify(s)),/không hợp lệ/)});
test('invalid candidate ids rejected',()=>{const s=state();s.tavern.offers[1].id=s.tavern.offers[0].id;assert.equal(E.strictSave(s),false)});
test('no direct import of unknown save version',()=>throws(()=>E.parseSave('{"version":999}'),/hỗ trợ|không hợp lệ/));
test('pathfinding returns adjacent valid tiles',()=>{for(const tile of E.TILES.filter(t=>['mine','npc'].includes(t.kind))){const p=E.pathfind('3,4',tile.key);if(!p)continue;for(let i=1;i<p.length;i++){const [x,y]=p[i-1].split(',').map(Number),[a,b]=p[i].split(',').map(Number);assert.equal(Math.abs(x-a)+Math.abs(y-b),1)}}});

test('HG07 source table has exact base levels',()=>{assert.equal(E.HG07_BASE_LIMITS.length,100);for(const [lv,limit] of [[1,11500],[10,40000],[20,194482],[30,554166],[50,1620833],[100,4062500]])assert.equal(E.heroLimit(lv),limit)});
test('HG07 formation at limit allowed, excess atomic reject',()=>{const s=state();s.army.human_1=150;E.setFormation(s,[{unitId:'human_1',count:92}]);assert.equal(E.troopValue(s),11500);const old=JSON.stringify(s.formation);throws(()=>E.setFormation(s,[{unitId:'human_1',count:93}]),/giới hạn chỉ huy/);assert.equal(JSON.stringify(s.formation),old)});
test('HG07 respects hero level after switching commander',()=>{const s=state();s.army.human_1=250;s.heroes.push({id:2,name:'Veteran',level:5,xp:0,atk:10,def:10,spd:10,int:10});E.selectHero(s,2);E.setFormation(s,[{unitId:'human_1',count:120}]);assert.equal(E.checkCapacity(s,s.formation).limit,23333);E.selectHero(s,1);throws(()=>E.checkCapacity(s,s.formation),/giới hạn chỉ huy/)});
test('HG08 migrates over-cap v07 formation and still blocks march',()=>{const s=state(),t=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));s.army.human_1=120;s.formation=[{unitId:'human_1',count:120}];const restored=E.parseSave(E.serializeSave(s)),before=restored.ap;assert.equal(restored.version,7);throws(()=>E.startMarch(restored,t.key),/giới hạn chỉ huy/);assert.equal(restored.ap,before);assert.equal(restored.march,null)});
test('HG07 no-formation auto selection checks cap before AP',()=>{const s=state(),t=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));s.army.human_1=200;const before=s.ap;throws(()=>E.startMarch(s,t.key),/giới hạn chỉ huy/);assert.equal(s.ap,before)});
test('HG07 rejects invalid levels, no automatic bonus',()=>{for(const level of [0,101,1.5,NaN])throws(()=>E.heroLimit(level),/1–100/);assert.equal(E.heroLimit(1),11500)});


test('HG08 gates every troop row and keeps unsupported faction support gates provisional',()=>{
 const all=Object.values(C.units).flat();assert.equal(all.length,40);
 for(const race of Object.keys(C.races)){const s=state(race);for(const k of Object.keys(s.buildings))s.buildings[k]=10;s.spells.bootcamp=10;s.spells.manufacturing=10;s.spells.scouting=10;
  for(const u of C.units[race])assert.equal(E.troopPrerequisites(s,u).available,true,u.id);
  const fresh=state(race);fresh.buildings.hall=1;fresh.buildings[E.troopBuildingKey(fresh)]=1;
  for(const u of C.units[race].filter(u=>u.tier>1))assert.equal(E.troopPrerequisites(fresh,u).available,false,u.id);
 }
 assert.equal(E.troopPrerequisites(state('elf'),C.units.elf[9]).status,'DERIVED_TROOP_BUILDING_TIER');assert.equal(E.troopPrerequisites(state('elf'),C.units.elf[9]).confidence,'B');
 assert.equal(E.troopPrerequisites(state('undead'),C.units.undead[9]).status,'DERIVED_TROOP_BUILDING_TIER');assert.equal(E.troopPrerequisites(state('undead'),C.units.undead[9]).confidence,'B');
 assert.equal(E.troopPrerequisites(state('human'),C.units.human[9]).status,'OBSERVED');
});
test('SRC02/SRC03 plus SRC11 derive non-Human troop-building tiers without inventing support-building gates',()=>{
 for(const race of ['elf','orc','undead'])for(const u of C.units[race]){
  const s=state(race),req=E.troopPrerequisites(s,u);if(req.status==='SECONDARY')continue;
  assert.equal(req.status,'DERIVED_TROOP_BUILDING_TIER',u.id);assert.equal(req.confidence,'B',u.id);
  assert(req.checks.some(c=>c.kind==='building'&&c.key===E.troopBuildingKey(s)&&c.level===u.tier),u.id);
  if(u.tier===2)assert(req.checks.some(c=>c.kind==='spell'&&c.key==='scouting'&&c.level===1),u.id);
  assert(!req.checks.some(c=>c.kind==='building'&&['magicPool','natureTower','beastPen','blacksmith','darkHall','soulTower'].includes(c.key)),u.id+' invented support gate');
 }
});
test('Human Scout uses dated SRC27 Barracks 2 and Scouting 1 while Town Hall remains partial',()=>{
 const s=state('human'),u=C.units.human[1],req=E.troopPrerequisites(s,u);assert.equal(req.status,'PARTIAL_SCOUT_HALL_GATE');assert.equal(req.confidence,'B');assert.equal(req.source,'SRC27; SRC04');assert.equal(JSON.stringify(req.checks.map(c=>[c.kind,c.key,c.level])),JSON.stringify([['building','barracks',2],['spell','scouting',1]]));assert.equal(req.available,false);s.buildings.barracks=2;assert.equal(E.troopPrerequisites(s,u).available,false);s.spells.scouting=1;assert.equal(E.troopPrerequisites(s,u).available,true);
});
test('Elf Centaur uses its dated source-listed Barracks 1 gate with secondary confidence C',()=>{
 const s=state('elf'),u=C.units.elf[0],req=E.troopPrerequisites(s,u);assert.equal(u.id,'elf_1');assert.equal(req.status,'SECONDARY');assert.equal(req.confidence,'C');assert.equal(JSON.stringify(req.checks.map(c=>[c.kind,c.key,c.level])),JSON.stringify([['building','barracks',1]]));assert.equal(req.available,true);
});
test('Orc Thunderbird uses the four source-listed gates with secondary confidence C',()=>{
 const s=state('orc'),u=C.units.orc[6],req=E.troopPrerequisites(s,u);assert.equal(u.id,'orc_7');assert.equal(req.status,'SECONDARY');assert.equal(req.confidence,'C');assert.equal(JSON.stringify(req.checks.map(c=>[c.kind,c.key,c.level])),JSON.stringify([['building','barracks',7],['building','beastPen',4],['building','blacksmith',4],['spell','bootcamp',6]]));
});
test('HG08 all 40 rows accept their explicitly listed gates and start real queues',()=>{
 for(const race of Object.keys(C.races))for(const u of C.units[race]){
  const s=state(race),req=E.troopPrerequisites(s,u);
  for(const c of req.checks){if(c.kind==='building')s.buildings[c.key]=c.level;else s.spells[c.key]=c.level}
  for(const k of C.keys)s.res[k]=1e9;
  const before=s.training.length;E.recruit(s,u.id,1);assert.equal(s.training.length,before+1,u.id);assert.equal(s.training.at(-1).unitId,u.id);
 }
});
test('HG08 every listed gate blocks recruitment without spending or queue mutation',()=>{
 for(const race of Object.keys(C.races))for(const u of C.units[race]){
  const base=E.troopPrerequisites(state(race),u);
  for(const missing of base.checks){
   const s=state(race);
   for(const c of base.checks){if(c.kind==='building')s.buildings[c.key]=c.level;else s.spells[c.key]=c.level}
   if(missing.kind==='building')s.buildings[missing.key]=Math.max(0,missing.level-1);else s.spells[missing.key]=Math.max(0,missing.level-1);
   for(const k of C.keys)s.res[k]=1e9;
   const resources=JSON.stringify(s.res),training=JSON.stringify(s.training);
   assert.equal(E.troopPrerequisites(s,u).available,false,`${u.id} missing ${missing.key}`);
   throws(()=>E.recruit(s,u.id,1),/Chưa đủ điều kiện/);
   assert.equal(JSON.stringify(s.res),resources,`${u.id} spent resources for ${missing.key}`);
   assert.equal(JSON.stringify(s.training),training,`${u.id} queued despite ${missing.key}`);
  }
 }
});
test('Undead recruits from Graveyard and old Barracks progress migrates safely',()=>{
 const fresh=state('undead');assert.equal(E.troopBuildingKey(fresh),'graveyard');assert.equal(fresh.buildings.graveyard,1);assert(!E.cityBuildOrder(fresh).includes('barracks'));assert(E.cityBuildOrder(fresh).includes('graveyard'));
 const old=JSON.parse(JSON.stringify(fresh));old.buildings.barracks=4;delete old.buildings.graveyard;const migrated=E.parseSave(JSON.stringify(old));assert.equal(migrated.buildings.graveyard,4);assert.equal(migrated.race,'undead');assert.equal(E.strictSave(migrated),true);
 const req=E.troopPrerequisites(migrated,C.units.undead[3]);assert(req.checks.some(c=>c.kind==='building'&&c.key==='graveyard'&&c.level===4));assert.equal(req.status,'DERIVED_TROOP_BUILDING_TIER');assert.equal(req.confidence,'B');
});
test('Human tier 3 requirements use Hall, Barracks and the canonical Bootcamp spell level',()=>{
 const s=state();s.buildings.hall=3;s.buildings.barracks=3;
 assert.equal(E.troopPrerequisites(s,C.units.human[2]).available,false);s.spells.bootcamp=1;
 assert.equal(E.troopPrerequisites(s,C.units.human[2]).available,true);
});
test('HG08 applies derived Scouting gate to all faction tier-2 scout units atomically',()=>{
 for(const race of ['elf','orc','undead']){const s=state(race),u=C.units[race][1];s.buildings[E.troopBuildingKey(s)]=2;const before=JSON.stringify({res:s.res,training:s.training});const req=E.troopPrerequisites(s,u);assert.equal(req.status,'DERIVED_TROOP_BUILDING_TIER');assert.equal(req.confidence,'B');assert.equal(req.available,false);throws(()=>E.recruit(s,u.id,1),/Trinh sát/);assert.equal(JSON.stringify({res:s.res,training:s.training}),before);s.spells.scouting=1;assert.equal(E.troopPrerequisites(s,u).available,true)}
});
test('Human T4/T5 support buildings and Manufacturing gates are enforced atomically',()=>{
 const s=state();s.buildings.hall=4;s.buildings.barracks=4;s.res.gold=5000;const before=JSON.stringify({res:s.res,queue:s.training});
 throws(()=>E.recruit(s,'human_4',1),/Blacksmith/);assert.equal(JSON.stringify({res:s.res,queue:s.training}),before);
 s.buildings.blacksmith=1;throws(()=>E.recruit(s,'human_4',1),/Manufacturing/);s.spells.manufacturing=1;
 assert.equal(E.recruit(s,'human_4',1).gold,Math.ceil(C.units.human[3].cost.gold*.98));
 const t=state();t.buildings.hall=5;t.buildings.barracks=5;t.spells.manufacturing=3;
 assert.equal(E.troopPrerequisites(t,C.units.human[4]).available,false);t.buildings.stables=1;assert.equal(E.troopPrerequisites(t,C.units.human[4]).available,true);
});
test('Bootcamp research uses one canonical spell queue and completes exactly once',()=>{
 const s=state();for(const k of C.keys)s.res[k]=Math.min(E.limits(s)[k],100000);const before=s.res.gold;
 E.researchTechnology(s,'training');const queued=s.researchQueue;assert(queued);assert.equal(queued.key,'bootcamp');assert.equal(s.spells.bootcamp||0,0);assert(!('technologies' in s));assert(s.res.gold<before);
 const end=s.lastTick+queued.remaining/s.speed*1000+1000;E.tick(s,end);assert.equal(s.spells.bootcamp,1);assert.equal(s.researchQueue,null);
 const res=JSON.stringify(s.res);E.tick(s,end);assert.equal(JSON.stringify(s.res),res);
});
test('Technology rejection does not spend resources or mutate research queue',()=>{
 const s=state();s.spells.bootcamp=1;const before=JSON.stringify(s.res);throws(()=>E.researchTechnology(s,'training'),/Magic Tower/);assert.equal(JSON.stringify(s.res),before);assert.equal(s.researchQueue,null);
});
test('Castellan gains unit-value/3 experience only when training completes',()=>{
 const s=state();E.appoint(s,1);E.recruit(s,'human_1',3);assert.equal(s.heroes[0].xp,0);const end=s.lastTick+s.training[0].remaining/s.speed*1000+1000;E.tick(s,end);assert.equal(s.army.human_1,19);assert.equal(s.heroes[0].xp,126.25);E.tick(s,end);assert.equal(s.heroes[0].xp,126.25);
});
test('Castellan resource-value model matches the community unit-value formula across the catalog',()=>{
 for(const unit of Object.values(C.units).flat())assert.equal(E.castellanExperienceFromResources(unit.cost),E.unitValue(unit)/3,unit.id);
 assert.equal(E.castellanExperienceFromResources({gold:3,wood:2,ore:1,sulfur:4,crystal:5}),36);
 assert.equal(E.castellanExperienceFromResources({gold:0,lumber:1}),5/3);
});
test('Castellan receives construction EXP once at completion and v07 queue reload preserves the event',()=>{
 const s=state();s.buildings.hall=10;s.buildings.warehouse=10;s.buildings.heroTower=4;for(const k of C.keys)s.res[k]=E.limits(s)[k];E.appoint(s,1);
 const hero=s.heroes[0],before=lifetimeHeroXp(hero),cost=E.buildCost(s,'market'),base=E.castellanExperienceFromResources(cost),expected=base*1.04;
 E.upgrade(s,'market');assert.equal(lifetimeHeroXp(hero),before);assert(s.buildingQueue);
 const pending=E.parseSave(E.serializeSave(s));assert.equal(pending.version,7);assert(E.strictSave(pending));
 const end=pending.lastTick+pending.buildingQueue.remaining/pending.speed*1000+1000;E.tick(pending,end);
 const completed=pending.heroes[0],gained=lifetimeHeroXp(completed)-before;
 assert.equal(pending.buildings.market,1);assert.equal(pending.buildingQueue,null);assert(Math.abs(gained-expected)<1e-7,`${gained} != ${expected}`);
 assert(pending.log.some(line=>line.includes('EXP khi làm Castellan')&&line.includes('mô hình C')));assert.equal(E.strictSave(pending),true);
 E.tick(pending,end+1000);assert(Math.abs(lifetimeHeroXp(pending.heroes[0])-before-expected)<1e-7);assert.equal(E.strictSave(pending),true);
});
test('Castellan receives research EXP once at completion and v07 queue reload preserves the event',()=>{
 const s=state();s.buildings.hall=10;s.buildings.warehouse=10;s.buildings.heroTower=4;s.buildings.magicTower=10;for(const k of C.keys)s.res[k]=E.limits(s)[k];E.appoint(s,1);
 const hero=s.heroes[0],before=lifetimeHeroXp(hero),cost=E.spellCost(s,'bootcamp'),base=E.castellanExperienceFromResources(cost),expected=base*1.04;
 E.learn(s,'bootcamp');assert.equal(lifetimeHeroXp(hero),before);assert(s.researchQueue);
 const pending=E.parseSave(E.serializeSave(s));assert.equal(pending.version,7);assert(E.strictSave(pending));
 const end=pending.lastTick+pending.researchQueue.remaining/pending.speed*1000+1000;E.tick(pending,end);
 assert.equal(pending.spells.bootcamp,1);assert.equal(pending.researchQueue,null);
 const gained=lifetimeHeroXp(pending.heroes[0])-before;assert(Math.abs(gained-expected)<1e-7,`${gained} != ${expected}`);
 assert(pending.log.some(line=>line.includes('nghiên cứu Huấn luyện cấp 1')&&line.includes('mô hình C')));assert.equal(E.strictSave(pending),true);
 E.tick(pending,end+1000);assert(Math.abs(lifetimeHeroXp(pending.heroes[0])-before-expected)<1e-7);assert.equal(E.strictSave(pending),true);
});
test('Inactive-city construction and research award EXP to that city’s Castellan only',()=>{
 const s=state();s.fame=5800;E.appoint(s,1);const primary=s.heroes[0],secondary={...JSON.parse(JSON.stringify(primary)),id:2,name:'Castellan Thành Phụ',xp:0,level:1,statPoints:0};s.heroes.push(secondary);
 const other=E.make('elf',s.lastTick);E.ensure08(other);const city=JSON.parse(JSON.stringify(other.cities[0]));const tile=E.getTile('9,10');assert(tile);
 city.id='city-castellan-qa';city.key=tile.key;city.name='Thành Phụ QA';city.main=false;s.cities.push(city);E.switchCity(s,city.id);
 s.buildings.hall=10;s.buildings.warehouse=10;s.buildings.heroTower=4;s.buildings.magicTower=10;s.castellan=2;for(const k of C.keys)s.res[k]=E.limits(s)[k];
 const before=lifetimeHeroXp(secondary),buildCost=E.buildCost(s,'market'),researchCost=E.spellCost(s,'bootcamp');
 E.upgrade(s,'market');E.learn(s,'bootcamp');E.switchCity(s,'main');const end=s.lastTick+Math.max(city.local.buildingQueue.remaining,city.local.researchQueue.remaining)/s.speed*1000+1000;E.tick(s,end);
 assert.equal(lifetimeHeroXp(primary),0);assert(Math.abs(lifetimeHeroXp(s.heroes.find(h=>h.id===2))-before-(E.castellanExperienceFromResources(buildCost)+E.castellanExperienceFromResources(researchCost))*1.04)<1e-7);
 assert.equal(s.buildingQueue,null);assert.equal(s.researchQueue,null);assert.equal(E.strictSave(s),true);
});
test('SRC03 Hero Tower grants every earned hero XP +1% per tower level and survives v07 reload',()=>{
 for(const level of [0,1,5,10]){const s=state(),h=s.heroes[0];s.buildings.heroTower=level;assert.equal(E.heroTowerExperienceBonus(s),level);const result=E.grantHeroExperience(s,h.id,100,'SRC03 bonus check');assert.equal(result.base,100);assert.equal(result.bonusPercent,level);assert.equal(result.gained,100+100*level/100);assert.equal(h.xp,result.gained);}
 const s=state();s.buildings.heroTower=10;const hero=s.heroes[0];E.grantHeroExperience(s,hero.id,100,'save check');const restored=E.parseSave(E.serializeSave(s));assert.equal(restored.version,7);assert.equal(restored.buildings.heroTower,10);assert.equal(restored.heroes[0].xp,110);
});
test('SRC45 supplies exact Chinese-guide NPC XP for stars 4–8; missing tiers remain labeled models',()=>{
 const expected={4:1000,5:4000,6:9000,7:18000,8:30000};
 for(const [star,xp] of Object.entries(expected)){const reward=E.battleExperienceReward({kind:'npc',level:Number(star)});assert.deepEqual(JSON.parse(JSON.stringify(reward)),{star:Number(star),baseXp:xp,source:'SRC45'});}
 for(const battle of [{kind:'npc',level:1},{kind:'npc',level:3},{kind:'mine',level:4},{kind:'castle',level:8}])assert.equal(E.battleExperienceReward(battle).source,'SIM');
});
test('SRC45 four-star XP changes a real battle win and survives v07 save/reload',()=>{
 const s=state(),hero=s.heroes[0],tile=E.TILES.find(t=>t.kind==='npc'&&t.level===4);assert(tile);
 s.buildings.heroTower=10;hero.level=50;hero.xp=0;hero.atk=100;hero.spd=100;
 s.army.human_3=50000;s.formation=[{unitId:'human_3',count:50000}];s.battle=E.makeBattle(s,tile.key);
 let out,guard=0;while(s.battle&&guard++<10)out=E.battleAct(s,'attack');
 assert.equal(out?.type,'win');assert.equal(hero.xp,1100);assert(s.log.some(line=>line.includes('1.100 EXP')&&line.includes('SRC45')));
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(loaded.heroes[0].xp,1100);assert.equal(E.strictSave(loaded),true);
});
test('Hero XP exact early thresholds, point award and allocation',()=>{
 const s=state(),h=s.heroes[0];s.buildings.heroTower=0;E.grantHeroExperience(s,h.id,149,'test');assert.equal(h.level,1);assert.equal(h.xp,149);E.grantHeroExperience(s,h.id,1,'test');assert.equal(h.level,2);assert.equal(h.xp,0);assert.equal(h.statPoints,1);assert.equal(E.heroLimit(h.level),13333);
 const atk=h.atk;E.allocateHeroPoint(s,h.id,'atk');assert.equal(h.atk,atk+1);assert.equal(h.statPoints,0);throws(()=>E.allocateHeroPoint(s,h.id,'atk'),/chưa có điểm/);
});
test('Hero XP level 20 formula and level 100 cap',()=>{
 const s=state(),h=s.heroes[0];s.buildings.heroTower=0;h.level=19;h.xp=9967;E.grantHeroExperience(s,h.id,1,'test');assert.equal(h.level,20);assert.equal(E.experienceToNext(20),12000);assert.equal(E.experienceToNext(99),120*(99*99-300));assert.equal(E.experienceToNext(100),null);h.level=100;h.xp=7;E.grantHeroExperience(s,h.id,999,'test');assert.equal(h.xp,7);
});
test('v06 migration preserves hero progress and does not award old levels',()=>{
 const s=state(),legacy=JSON.parse(JSON.stringify(s));legacy.version=6;legacy.heroes[0].level=3;legacy.heroes[0].xp=200;legacy.heroes[0].atk=19;legacy.spells.manufacturing=4;delete legacy.technologies;delete legacy.researchQueue;delete legacy.buildings.blacksmith;for(const h of legacy.heroes){delete h.statPoints;delete h.spentAttributePoints;}
 const raw=JSON.stringify(legacy),m=E.parseSave(raw);assert.equal(JSON.stringify(legacy),raw);assert.equal(m.version,7);assert.equal(m.heroes[0].level,3);assert.equal(m.heroes[0].xp,200);assert.equal(m.heroes[0].atk,19);assert.equal(m.heroes[0].statPoints,0);assert.equal(m.technologies,undefined);assert.equal(m.spells.manufacturing,4);
});
test('Manufacturing legacy spell level remains recognized by requirements and discounts',()=>{
 const s=state();s.buildings.hall=4;s.buildings.barracks=4;s.buildings.blacksmith=1;s.spells.manufacturing=1;
 assert.equal(E.troopPrerequisites(s,C.units.human[3]).available,true);assert.equal(E.recruitCost(s,C.units.human[3],1).gold,Math.ceil(C.units.human[3].cost.gold*.98));
});
test('Bootcamp and Manufacturing apply the documented two-percent per level to recruitment',()=>{
 const s=state();const u=C.units.human[0];s.spells.bootcamp=1;assert.equal(E.recruit(s,u.id,1).gold,u.cost.gold);assert.equal(s.training[0].total,Math.ceil(u.timeSec*.98));
 s.spells.manufacturing=10;assert.equal(E.recruitCost(s,u,1).gold,Math.ceil(u.cost.gold*.8));
});
test('Hero allocation blocked during march or battle',()=>{
 const s=state();s.heroes[0].statPoints=1;s.march={target:'5,6',remaining:2};throws(()=>E.allocateHeroPoint(s,1,'def'),/đang hành quân/);assert.equal(s.heroes[0].statPoints,1);
});
test('Invalid HG08 research queue rejected by save validator',()=>{const s=state();s.researchQueue={id:1,key:'training',level:2,total:100,remaining:50};assert.equal(E.strictSave(s),false)});


test('Faction-specific source buildings are buildable only in their race build list',()=>{
 const maps={human:['stables','blacksmith'],elf:['magicPool','natureTower'],orc:['beastPen','blacksmith'],undead:['graveyard','darkHall','soulTower']};
 for(const [race,buildings] of Object.entries(maps)){const s=state(race),order=E.cityBuildOrder(s);for(const b of buildings)assert(order.includes(b),race+':'+b);for(const other of Object.values(maps).flat())if(!buildings.includes(other)&&!(race==='orc'&&other==='blacksmith'))assert(!order.includes(other),race+' leaked '+other);if(race==='undead'){assert(!order.includes('barracks'),'Undead UI should use Graveyard');s.buildings.hall=2;}for(const k of C.keys)s.res[k]=Math.min(E.limits(s)[k],100000);E.upgrade(s,buildings[0]);assert.equal(s.buildingQueue.key,buildings[0]);}
});
test('SRC03 gates Tavern level 10 behind Hero Tower 8 and Town Hall 7 through real saveable queues',()=>{
 const s=state();s.speed=1;s.buildings.warehouse=10;s.buildings.hall=6;s.buildings.heroTower=7;s.buildings.tavern=9;expensive(s);
 const before=JSON.stringify(s.res);assert.equal(E.buildingUpgradeGate(s,'heroTower').allowed,false);throws(()=>E.upgrade(s,'heroTower'),/Town Hall cấp 7/);assert.equal(JSON.stringify(s.res),before);assert.equal(s.buildingQueue,null);
 s.buildings.hall=7;assert.equal(E.buildingUpgradeGate(s,'heroTower').allowed,true);assert.equal(E.buildingUpgradeGate(s,'tavern').allowed,false);
 throws(()=>E.upgrade(s,'tavern'),/Tháp tướng cấp 8/);assert.equal(JSON.stringify(s.res),before);assert.equal(s.buildingQueue,null);
 E.upgrade(s,'heroTower');assert.equal(s.buildingQueue.key,'heroTower');assert.equal(s.buildingQueue.level,8);assert.equal(E.strictSave(s),true);
 E.tick(s,s.lastTick+(s.buildingQueue.remaining+1)*1000);assert.equal(s.buildings.heroTower,8);assert.equal(s.buildingQueue,null);assert.equal(E.buildingUpgradeGate(s,'tavern').allowed,true);
 E.upgrade(s,'tavern');assert.equal(s.buildingQueue.key,'tavern');assert.equal(s.buildingQueue.level,10);assert.equal(E.strictSave(s),true);
 const restored=E.parseSave(E.serializeSave(s));assert.equal(restored.version,7);assert.equal(restored.buildings.heroTower,8);assert.equal(restored.buildingQueue.key,'tavern');assert.equal(restored.buildingQueue.level,10);
});
test('Tavern name/stat colors follow dated and community threshold evidence',()=>{
 const heroFor=value=>{const base=Math.floor(value/4),r=value%4;return {atk:base+(r>0?1:0),def:base+(r>1?1:0),spd:base+(r>2?1:0),int:base,level:1};};
 for(const [value,color] of [[125,'white'],[126,'blue'],[160,'blue'],[161,'yellow'],[180,'yellow'],[181,'green'],[200,'green'],[201,'purple'],[280,'purple']])assert.equal(E.heroNameColor(heroFor(value)),color,'hero total '+value);
 // 2010 Chinese guide overlaps White and Blue at 125; Fandom's explicit <=125 rule resolves it as White.
 for(const [value,color] of [[40,'white'],[41,'blue'],[50,'blue'],[51,'yellow'],[60,'yellow'],[61,'green'],[70,'green'],[71,'purple']])assert.equal(E.heroStatColor(value),color,'single stat '+value);
});
test('SRC48 Tavern level 6-9 refresh creates one simulated blue hero with valid source-band color',()=>{
 const low=state();low.buildings.tavern=5;E.refreshTavern(low);assert(low.tavern.offers.every(h=>h.quality==='white'));
 for(let level=6;level<=9;level++)for(let round=1;round<=8;round++){const s=state();s.buildings.tavern=level;s.tavern.round=round-1;E.refreshTavern(s);assert.equal(s.tavern.offers.length,E.tavernSlots(level));const blue=s.tavern.offers.filter(h=>h.quality==='blue');assert.equal(blue.length,1,`L${level}/round ${round}`);const hero=blue[0];assert(hero.heroValue>=126&&hero.heroValue<=160);for(const k of ['atk','def','spd','int'])assert(hero[k]>=20&&hero[k]<=50);for(const h of s.tavern.offers)assert.equal(h.quality,E.heroNameColor(h));assert.equal(E.strictSave(s),true);const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.tavern.offers.find(h=>h.id===hero.id).quality,'blue');}
});
test('Tavern level 10 refresh creates eight source-band heroes and persisted derived colors',()=>{
 const s=state();s.buildings.tavern=10;E.refreshTavern(s);assert.equal(s.tavern.offers.length,8);
 for(const h of s.tavern.offers){for(const key of ['atk','def','spd','int']){assert(Number.isSafeInteger(h[key])&&h[key]>=20&&h[key]<=70);assert.equal(h.statColors[key],E.heroStatColor(h[key]));}assert.equal(h.quality,E.heroNameColor(h));assert.equal(h.heroValue,h.atk+h.def+h.spd+h.int-h.level+1);assert.equal(E.strictSave(s),true);}
 const restored=E.parseSave(E.serializeSave(s));assert.equal(restored.tavern.offers[0].quality,E.heroNameColor(restored.tavern.offers[0]));
});
test('Automatic hourly Tavern refresh applies the current Tavern level model',()=>{
 const s=state();s.buildings.tavern=10;s.speed=1;const end=s.lastTick+3600*1000;E.tick(s,end);assert.equal(s.tavern.round,1);assert.equal(s.tavern.offers.length,8);assert(s.tavern.offers.every(h=>['atk','def','spd','int'].every(key=>Number.isSafeInteger(h[key])&&h[key]>=20&&h[key]<=70&&h.statColors[key]===E.heroStatColor(h[key]))));
});

test('Arena rehabilitation charges one-seventh unit value and runs at three-fifths training speed',()=>{
 const s=state();s.speed=1;s.wounded.human_1=2;const original=s.army.human_1;
 const q=E.heal(s);assert.equal(q.paidGold,36);assert.equal(q.total,400);assert.equal(s.res.gold,8000-36);
 assert.equal(s.wounded.human_1,0);assert.equal(s.army.human_1,original);assert.equal(E.strictSave(s),true);
 const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.arenaQueue.unitId,'human_1');assert.equal(saved.arenaQueue.count,2);
 E.tick(saved,saved.lastTick+399*1000);assert.equal(saved.army.human_1,original);assert.equal(saved.arenaQueue.remaining,1);
 const restored=E.parseSave(E.serializeSave(saved));E.tick(restored,restored.lastTick+1000);
 assert.equal(restored.army.human_1,original+2);assert.equal(restored.arenaQueue,null);assert.equal(E.strictSave(restored),true);
 const oldQueue=E.clone(restored);oldQueue.arenaQueue={id:oldQueue.serial++,unitId:'human_1',count:1,total:200,remaining:120,paidGold:18};
 assert.equal(E.parseSave(JSON.stringify(oldQueue)).arenaQueue.reincarnationLevel,0);
});
test('Undead Reincarnation shortens Arena treatment only when equipped to the defending Castellan',()=>{
 assert.equal(E.spells(state('human')).some(x=>x.id==='reincarnation'),false);
 const activeOnly=state('undead');activeOnly.speed=1;E.researchHeroSpell(activeOnly,'reincarnation');E.equipSpell(activeOnly,'reincarnation',1);activeOnly.wounded.undead_1=2;
 const uncastled=E.heal(activeOnly);assert.equal(uncastled.reincarnationLevel,0);assert.equal(uncastled.total,344);
 const defended=state('undead');defended.speed=1;E.researchHeroSpell(defended,'reincarnation');E.appoint(defended,1);E.equipSpell(defended,'reincarnation',1);defended.wounded.undead_1=2;
 const q=E.heal(defended);assert.equal(q.reincarnationLevel,1);assert.equal(q.total,340);assert(q.total<uncastled.total);
 defended.battle=E.makeBattle(defended,E.TILES.find(t=>t.kind==='npc').key);throws(()=>E.cast(defended,'reincarnation'),/thụ động/);
});
test('Arena healing rejects insufficient funds without consuming wounded or queueing work',()=>{
 const s=state();s.wounded.human_1=2;s.res.gold=0;const before=JSON.stringify({army:s.army,wounded:s.wounded,res:s.res,queue:s.arenaQueue});
 throws(()=>E.heal(s),/Không đủ tài nguyên/);assert.equal(JSON.stringify({army:s.army,wounded:s.wounded,res:s.res,queue:s.arenaQueue}),before);
});
test('HG07 v07 saves without the newer Arena queue migrate without losing data',()=>{
 const s=state();s.wounded.human_1=3;delete s.arenaQueue;const loaded=E.parseSave(JSON.stringify(s));
 assert.equal(loaded.wounded.human_1,3);assert.equal(loaded.arenaQueue,null);assert.equal(E.strictSave(loaded),true);
});

test('Equal-speed combat initiative follows left-to-right battlefield position',()=>{
 const s=state();s.army.human_1=40;s.formation=Array.from({length:4},()=>({unitId:'human_1',count:10}));
 // Keep this fixture at a known one-star NPC after historical coordinates were added.
 const starter=E.NPC_CAMPS_2009.find(c=>c.stars===1);
 s.battle=E.makeBattle(s,starter.key);
 for(const u of [...s.battle.allies,...s.battle.enemies]){u.spd=5;u.hp=1e9;u.pool=1e9;u.count=1;u.atk=1;u.def=1;u.range=20;}
 const out=E.battleAct(s,'attack');assert.deepEqual(Array.from(out.order),['p0','p1','p2','p3','e0','e1']);assert.deepEqual(Array.from(s.battle.lastActOrder),Array.from(out.order));
});

test('Advance order moves without attacking and persists through save/load',()=>{const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Infantry',range:1,count:1,initial:1,hp:10000,atk:100,def:0,spd:4,pool:10000,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Stationary target',range:20,count:1,initial:1,hp:10000,atk:0,def:0,spd:1,pool:10000,x:6,y:5}];b.selected='p0';b.orders={};b.focused=null;const a=b.allies[0],e=b.enemies[0],hp=e.pool;let steps=0;while(Math.abs(a.x-e.x)+Math.abs(a.y-e.y)>a.range&&steps++<20){const before=Math.abs(a.x-e.x)+Math.abs(a.y-e.y),out=E.battleAct(s,'advance');assert.equal(out.dealt,0);assert(Math.abs(a.x-e.x)+Math.abs(a.y-e.y)<before);assert.equal(e.pool,hp)}assert(steps<=20);assert.equal(E.battleAct(s,'advance').dealt,0);assert.equal(e.pool,hp);const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.battle.orders.p0,'advance');assert.deepEqual({x:saved.battle.allies[0].x,y:saved.battle.allies[0].y},{x:a.x,y:a.y});const out=E.battleAct(saved,'attack');assert(out.dealt>0);assert(saved.battle.enemies[0].pool<hp)});
test('HG09 clicked battlefield destination uses a legal path, blocks occupied cells and survives v07 reload',()=>{
 const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const b=s.battle;
 b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Selected infantry',range:1,count:2,initial:2,hp:10000,atk:100,def:0,spd:4,pool:20000,x:1,y:1},{id:'p1',slot:1,side:'player',unitId:'human_1',name:'Blocking infantry',range:1,count:1,initial:1,hp:10000,atk:1,def:0,spd:1,pool:10000,x:2,y:1}];
 b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Hold point',range:1,count:1,initial:1,hp:1e9,atk:0,def:0,spd:.1,pool:1e9,x:5,y:1}];b.selected='p0';b.orders={};b.focused=null;
 const turn=b.turn,hp=b.enemies[0].pool,from={x:b.allies[0].x,y:b.allies[0].y};throws(()=>E.battleAct(s,'move',{x:5,y:1}),/Ô đích/);assert.equal(b.turn,turn);assert.deepEqual({x:b.allies[0].x,y:b.allies[0].y},from);assert.deepEqual(b.orders,{});
 const out=E.battleAct(s,'move',{x:4,y:1}),m=b.lastMoves.find(x=>x.unitId==='p0');assert.equal(out.type,'continue');assert.deepEqual(JSON.parse(JSON.stringify({from:m.from,to:m.to,steps:m.steps,destination:m.destination})),{from:{x:1,y:1},to:{x:1,y:2},steps:1,destination:{x:4,y:1}});assert.equal(b.lastTargets.p0,undefined);assert.equal(b.orders.p0,'move');assert.deepEqual(JSON.parse(JSON.stringify(b.moveTargets.p0)),{x:4,y:1});assert.equal(b.enemies[0].pool,hp);assert.match(b.history[0],/p0 đi 1 ô tới \(1,2\)/);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.deepEqual(loaded.battle.lastMoves,b.lastMoves);assert.deepEqual({x:loaded.battle.allies[0].x,y:loaded.battle.allies[0].y},{x:1,y:2});assert.deepEqual(JSON.parse(JSON.stringify(loaded.battle.moveTargets.p0)),{x:4,y:1});assert(E.strictSave(loaded));
});
test('HG09 fast-stack clicked movement uses two modeled steps per order and rejects off-grid targets atomically',()=>{
 const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'orc_2',name:'Fast stack',range:1,count:1,initial:1,hp:1e9,atk:1,def:0,spd:7,pool:1e9,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Distant target',range:1,count:1,initial:1,hp:1e9,atk:0,def:0,spd:.1,pool:1e9,x:10,y:8}];b.selected='p0';b.orders={};b.focused=null;
 const turn=b.turn;throws(()=>E.battleAct(s,'move',{x:12,y:1}),/Ô đích/);assert.equal(b.turn,turn);const out=E.battleAct(s,'move',{x:5,y:1});assert.equal(out.type,'continue');assert.deepEqual(JSON.parse(JSON.stringify(b.lastMoves.map(m=>({steps:m.steps,to:m.to})))),[{steps:2,to:{x:3,y:1}}]);assert.equal(b.lastTargets.p0,undefined);assert.equal(b.enemies[0].pool,1e9);assert.deepEqual(JSON.parse(JSON.stringify(b.moveTargets.p0)),{x:5,y:1});assert(E.strictSave(s));
});
test('HG09 move order advances across turns, survives v07 reload and can be manually cancelled',()=>{
 const s=state();s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'orc_2',name:'Fast stack',range:1,count:1,initial:1,hp:1e9,atk:1,def:0,spd:7,pool:1e9,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Distant ranged target',range:20,count:1,initial:1,hp:1e9,atk:0,def:0,spd:.1,pool:1e9,x:10,y:8}];b.selected='p0';b.orders={};b.focused=null;
 E.battleAct(s,'move',{x:6,y:1});assert.deepEqual({x:b.allies[0].x,y:b.allies[0].y},{x:3,y:1});assert.deepEqual(JSON.parse(JSON.stringify(b.moveTargets.p0)),{x:6,y:1});
 const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.version,7);assert(E.strictSave(saved));assert.deepEqual(JSON.parse(JSON.stringify(saved.battle.moveTargets.p0)),{x:6,y:1});
 const auto=E.battleAct(saved,'attack',{preserveMoveOrders:true});assert.equal(auto.type,'continue');assert.deepEqual({x:saved.battle.allies[0].x,y:saved.battle.allies[0].y},{x:5,y:1});assert.deepEqual(JSON.parse(JSON.stringify(saved.battle.moveTargets.p0)),{x:6,y:1});assert.equal(saved.battle.lastTargets.p0,undefined);assert.equal(auto.dealt,0);
 const resumed=E.parseSave(E.serializeSave(saved));E.battleAct(resumed,'attack',{preserveMoveOrders:true});assert.deepEqual({x:resumed.battle.allies[0].x,y:resumed.battle.allies[0].y},{x:6,y:1});assert.equal(resumed.battle.moveTargets.p0,undefined);assert.equal(resumed.battle.orders.p0,'attack');assert.equal(resumed.battle.lastTargets.p0,undefined);assert(E.strictSave(resumed));
 const interrupted=E.parseSave(E.serializeSave(s));interrupted.battle.allies[0].range=20;const before=interrupted.battle.enemies[0].pool;E.battleAct(interrupted,'attack');assert.equal(interrupted.battle.moveTargets.p0,undefined);assert.equal(interrupted.battle.lastMoves.length,0);assert.equal(interrupted.battle.lastTargets.p0,'e0');assert(interrupted.battle.enemies[0].pool<before);assert.deepEqual({x:interrupted.battle.allies[0].x,y:interrupted.battle.allies[0].y},{x:3,y:1});assert(E.strictSave(interrupted));
});
test('Ranged stacks fire across deployment distance without invented movement turns',()=>{
 const s=state();s.army.human_3=40;s.formation=[{unitId:'human_3',count:40}];s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);
 const archer=s.battle.allies[0],before=s.battle.enemies.reduce((n,u)=>n+u.pool,0),position={x:archer.x,y:archer.y};assert.equal(archer.range,11);const out=E.battleAct(s,'attack');
 assert(out.dealt>0);assert(s.battle.enemies.reduce((n,u)=>n+u.pool,0)<before);assert.deepEqual({x:archer.x,y:archer.y},position);
});

function hg16FormulaFixture({allyAtk=40,enemyAtk=0,enemyDef=10,allyDef=20,heroAtk=0,heroDef=0,allyCount=10,enemyCount=1,enemySpeed=1}={}){
 const s=state();s.heroes[0].atk=heroAtk;s.heroes[0].def=heroDef;
 s.army.human_1=allyCount;
 const tile=E.TILES.find(t=>t.kind==='npc'&&E.pathfind('3,4',t.key));
 const b=E.makeBattle(s,tile.key);
 b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Formula ally',
   range:20,count:allyCount,initial:allyCount,hp:1e7,atk:allyAtk,def:allyDef,
   spd:99,pool:allyCount*1e7,x:1,y:1}];
 b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Formula enemy',
   range:20,count:enemyCount,initial:enemyCount,hp:1e9,atk:enemyAtk,def:enemyDef,
   spd:enemySpeed,pool:enemyCount*1e9,x:10,y:1}];
 s.battle=b;return s;
}
test('HG16 all 40 racial units follow the same deterministic base-damage and hero-factor oracle',()=>{
 const targetKey=E.TILES.find(t=>t.kind==='npc').key;
 let checked=0;
 for(const [race,units] of Object.entries(C.units))for(const unit of units){
  const s=state(race);s.heroes[0].atk=20;s.heroes[0].def=0;
  s.battle=E.makeBattle(s,targetKey);
  s.battle.allies=[{id:'p0',slot:0,side:'player',unitId:unit.id,name:unit.name,
   count:1,initial:1,hp:unit.hp,atk:unit.atk,def:unit.def,spd:99,pool:unit.hp,
   range:20,x:1,y:1}];
  s.battle.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Formula reference',
   count:1,initial:1,hp:1e9,atk:0,def:109,spd:1,pool:1e9,
   range:20,x:10,y:1}];
  const actual=E.battleAct(s,'attack');
  const predicted=Math.max(1,Math.floor(Math.max(unit.atk*.30,unit.atk*unit.atk/(unit.atk+109))*1.2));
  assert.equal(actual.dealt,predicted,`${unit.id} base damage`);
  assert.equal(actual.lost,0,unit.id+' zero-ATK defender');
  assert(E.strictSave(s),unit.id+' Save validation');checked++;
 }
 assert.equal(checked,40);
});
test('HG16-G2 bounded ranged reach keeps tactical positioning meaningful',()=>{
 const s=state();s.army.human_3=20;s.formation=[{unitId:'human_3',count:20}];
 const b=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);
 assert.equal(b.allies[0].range,11);
 assert.equal(E.unitTacticalRange(E.getUnit(s,'human_8')),12);
 assert.equal(E.unitTacticalRange(E.getUnit(s,'human_1')),1);
 b.allies[0].x=0;b.allies[0].y=0;
 b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Far target',range:1,count:1,initial:1,hp:1e7,
  atk:0,def:0,spd:1,pool:1e7,x:11,y:8}];
 b.selected='p0';s.battle=b;assert.equal(E.battleTargetsInRange(b,'p0').length,0);
 const first=E.battleAct(s,'attack');assert.equal(first.dealt,0,'Ranged stack must move before distant damage');
 assert(b.allies[0].x!==0||b.allies[0].y!==0,'Ranged unit walks to legal fire position');
 assert(E.strictSave(E.parseSave(E.serializeSave(s))));
});
test('HG16-G2 cast applies real attack buff once, then expires and preserves cooldown through Save',()=>{
 const make=()=>{const s=state('human'),b=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);
  s.army.human_1=40;
  b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Melee',range:1,count:40,initial:40,hp:1000,
   atk:40,def:12,spd:99,pool:40000,x:9,y:1}];
  b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Practice wall',range:1,count:1,initial:1,hp:1e9,
   atk:0,def:80,spd:1,pool:1e9,x:10,y:1}];s.battle=b;return s;};
 const normal=make(),enhanced=make();
 enhanced.heroMagic.leadership=1;enhanced.heroes[0].equippedSpells=['leadership'];
 E.cast(enhanced,'leadership');assert.equal(enhanced.battle.allies[0].atk,40*1.015);
 const firstNormal=E.battleAct(normal,'attack').dealt,firstEnhanced=E.battleAct(enhanced,'attack').dealt;
 assert(firstEnhanced>firstNormal,'Level 1 Leadership must increase actual battle damage');
 let loaded=E.parseSave(E.serializeSave(enhanced));
 assert.equal(loaded.battle.allies[0]._spellAtk,40);assert(loaded.battle.activeSpell);
 E.battleAct(loaded,'attack');E.battleAct(loaded,'attack');
 assert.equal(loaded.battle.activeSpell,null);
 assert.equal(loaded.battle.allies[0].atk,40);
 assert.throws(()=>E.cast(loaded,'leadership'),/hồi/);
 E.battleAct(loaded,'attack');E.battleAct(loaded,'attack');
 assert.equal(loaded.battle.spellCooldown.leadership<=loaded.battle.turn,true);
 const again=E.cast(loaded,'leadership');assert.equal(again.id,'leadership');
 assert(E.strictSave(E.parseSave(E.serializeSave(loaded))));
});
test('HG16-G2 casualty/wounded fractional remainder is deterministic across interrupted Save',()=>{
 const s=state();s.army.human_1=4;s.buildings.arena=1;
 const b=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);
 b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Wounded',
  range:20,count:4,initial:4,hp:100,atk:0,def:10,spd:1,pool:400,x:1,y:1}];
 b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Attacker',range:20,count:1,initial:1,
  hp:1e9,atk:120,def:0,spd:100,pool:1e9,x:10,y:1}];
 s.battle=b;
 E.battleAct(s,'attack');E.battleAct(s,'attack');
 assert.equal(s.army.human_1,2);
 assert.equal(s.wounded.human_1,1);assert.equal(s.woundFraction.human_1,.5);
 const loaded=E.parseSave(E.serializeSave(s));
 let last;for(let i=0;i<2&&loaded.battle;i++)last=E.battleAct(loaded,'attack');
 assert.equal(last.type,'lose');assert.equal(loaded.army.human_1,0);
 assert.equal(loaded.wounded.human_1,3);
 assert.equal(loaded.woundFraction.human_1,0);
 assert(E.strictSave(E.parseSave(E.serializeSave(loaded))));
});
test('HG16-G2 physical armor is floored at 30 percent raw ATK before hero mitigation',()=>{
 const s=hg16FormulaFixture({allyAtk:40,enemyDef:10_000,heroAtk:0,allyCount:10});
 const out=E.battleAct(s,'attack');
 assert.equal(out.dealt,120,'10 soldiers * ATK 40 * 30%');
 assert(E.strictSave(s));
});
test('HG16-G2 Defend stance prevents 25 percent incoming damage even when enemy acts first',()=>{
 const mk=()=>hg16FormulaFixture({allyAtk:0,enemyAtk:40,enemyCount:10,allyDef:10,heroDef:0,enemySpeed:100});
 const baseline=mk(),guarded=mk();
 const before=E.battleAct(baseline,'attack'),after=E.battleAct(guarded,'defend');
 assert.equal(before.lost,320);assert.equal(after.lost,240);
 assert.equal(guarded.battle.allies[0].guardTurn,1);
 assert.equal(guarded.battle.orders.p0,'attack','Defend is a one-turn action');
 const again=E.battleAct(guarded,'attack');
 assert.equal(again.lost,320,'Defense must expire next turn');
 assert(E.strictSave(E.parseSave(E.serializeSave(guarded))));
});
test('HG16-G2 ranged weapon and hero stats stack once and survive old v07 Save/Load',()=>{
 const s=hg16FormulaFixture({heroAtk:12,allyAtk:40,enemyDef:10,allyCount:10});
 const b=s.battle;s.battle=null;const item=E.addItem(s,'ash_bow','HG16-G2');E.equipItem(s,item.uid);s.battle=b;
 assert.equal(E.combatModifiers(s,1).rangedDamage,.06);
 assert.equal(E.combatModifiers(s,1).damageReduction,0);
 const parsed=E.parseSave(E.serializeSave(s)),actual=E.battleAct(s,'attack'),replayed=E.battleAct(parsed,'attack');
 const expect=Math.floor(10*32*1.16*1.06);
 assert.equal(actual.dealt,expect);assert.equal(replayed.dealt,expect);
 assert(E.strictSave(s));
});
test('HG16 exact zero-DEF reference base and zero-ATK inert units (no phantom chip)',()=>{
 const noDefense=hg16FormulaFixture({enemyDef:0,heroAtk:0,allyCount:10});
 const damage=E.battleAct(noDefense,'attack');
 assert.equal(damage.dealt,400,'ATK 40, target DEF 0: base damage exactly 40 per soldier');
 assert.equal(damage.lost,0,'Enemy ATK 0 must deal zero');
 const noAttack=hg16FormulaFixture({allyAtk:0,enemyAtk:0});
 const intact=noAttack.battle.enemies[0].pool,playerHP=noAttack.battle.allies[0].pool;
 const result=E.battleAct(noAttack,'attack');
 assert.equal(result.dealt,0);assert.equal(result.lost,0);
 assert.equal(noAttack.battle.enemies[0].pool,intact);assert.equal(noAttack.battle.allies[0].pool,playerHP);
 assert(E.strictSave(noAttack));
});
test('HG16 canonical equipped Hero ATK then world buff affects real damage exactly once',()=>{
 const s=hg16FormulaFixture({heroAtk:12,enemyDef:10,allyCount:10});
 // This is a melee-weapon oracle, so make the troop genuinely adjacent.
 s.battle.allies[0].range=1;s.battle.allies[0].x=9;s.battle.allies[0].y=1;
 const battle=s.battle;s.battle=null;
 const item=E.addItem(s,'copper_blade','HG16 deterministic formula fixture');E.equipItem(s,item.uid);s.battle=battle;
 s.heroBuffs.push({heroId:1,stat:'atk',remaining:7200,sourceKey:'26,4'});
 assert(Math.abs(E.heroStats(s,1).atk-16.5)<1e-9);
 const restored=E.parseSave(E.serializeSave(s));
 const actual=E.battleAct(s,'attack'),replayed=E.battleAct(restored,'attack');
 const expected=Math.floor(10*(40*40/(40+10))*(1+16.5/100)*1.04);
 assert.equal(actual.dealt,expected);
 assert.equal(replayed.dealt,expected);
 assert.equal(s.heroes[0].atk,12,'Hero base ATK restored after battle');
 assert(E.strictSave(s));assert(E.strictSave(restored));
});
test('HG16 defensive Hero equipment and world buff reduce real incoming damage once',()=>{
 const s=hg16FormulaFixture({allyAtk:0,enemyAtk:40,enemyCount:10,allyDef:10,heroDef:8,enemySpeed:100});
 const battle=s.battle;s.battle=null;
 const item=E.addItem(s,'iron_armor','HG16 defensive formula fixture');E.equipItem(s,item.uid);s.battle=battle;
 s.heroBuffs.push({heroId:1,stat:'def',remaining:7200,sourceKey:'94,1'});
 assert(Math.abs(E.heroStats(s,1).def-13.2)<1e-9);
 const out=E.battleAct(s,'attack');
 const expected=Math.floor(10*(40*40/(40+10))/(1+13.2/100)*.94);
 assert.equal(out.lost,expected);assert.equal(s.heroes[0].def,8);
 assert(E.strictSave(E.parseSave(E.serializeSave(s))));
});
test('HG16 march ETA uses shortest world path and equipped/buffed hero SPD at 1x and 60x',()=>{
 const tile=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key)?.length>3);
 assert(tile);
 const initial=state(),start=initial.lastTick;
 const cloak=E.addItem(initial,'traveler_cloak','HG16 ETA');E.equipItem(initial,cloak.uid);
 initial.heroBuffs.push({heroId:1,stat:'spd',remaining:7200,sourceKey:'62,57'});
 const effective=E.heroStats(initial,1).spd;
 assert(Math.abs(effective-(7+2)*1.1)<1e-9);
 for(const speed of [1,60]){
  const s=E.parseSave(E.serializeSave(initial));s.speed=speed;
  const path=E.pathfind(s.activeCastleKey,tile.key);
  assert(path&&path.length>3);
  for(let i=1;i<path.length;i++){
   const a=E.getTile(path[i-1]),b=E.getTile(path[i]);
   assert.equal(Math.abs(a.x-b.x)+Math.abs(a.y-b.y),1);
   assert.notEqual(b.terrain,'water');
  }
  const eta=E.marchDuration(effective,path,E.armyMarchFactor(s)),before=s.ap;
  E.startMarch(s,tile.key);
  assert.equal(s.ap,before-6,'Mine dispatch costs exactly 6 AP');
  assert.equal(s.march.total,eta);assert.equal(s.march.remaining,eta);
  const mid=start+(eta-0.5)/speed*1000;
  E.tick(s,mid);assert(s.march&&s.march.remaining>0,'March must not arrive ahead of ETA');
  const loaded=E.parseSave(E.serializeSave(s));
  E.tick(loaded,start+(eta+0.5)/speed*1000);
  assert.equal(loaded.battle?.target,tile.key);
  assert(E.strictSave(loaded));
 }
});
test('HG16-G3 roads cost less than plains, forests and hills; bridges remain legal',()=>{
 assert.deepEqual({...E.WORLD_TERRAIN_COST},{road:8,plain:10,bridge:11,forest:13,hill:15});
 for(const [terrain,cost] of Object.entries(E.WORLD_TERRAIN_COST))assert.equal(E.terrainStepCost({terrain}),cost);
 const a=E.getTile('3,4'),north=E.getTile('3,5');
 if(north?.terrain!=='water')assert.equal(E.pathTravelCost([a.key,north.key]),E.terrainStepCost(north)/10);
 const start=E.getTile('3,4'),goal=E.getTile('94,1');const before=JSON.stringify(E.TILES);
 const path=E.pathfind(start.key,goal.key);
 assert(path&&path.length>10);assert.equal(path[0],start.key);assert.equal(path.at(-1),goal.key);
 assert(E.pathTravelCost(path)>0);
 assert.deepEqual(E.pathfind(start.key,goal.key),path,'Terrain route must be deterministic');
 assert.equal(JSON.stringify(E.TILES),before,'Path search must not mutate map');
});
test('HG16-G3 transport speed is derived from loaded carrier and weighted terrain once',()=>{
 const {s,city}=cityTransportFixture(),unit=E.getUnit(s,'human_1'),path=E.pathfind('3,4',city.key);
 const factor=Math.max(.8,Math.min(1.10,.8+unit.spd/40)),expected=E.marchDuration(10,path,factor);
 const shipment=E.startCityTransport(s,city.id,'human_1',1,{gold:100});
 assert.equal(shipment.total,expected);assert.equal(shipment.returnTotal,expected);
 assert.deepEqual(shipment.path,path);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.cityTransports[0].total,expected);
 assert(E.strictSave(loaded));
});
test('HG16-G3 slowest troop determines march factor, dispatch and return ETA',()=>{
 const start=state(),target=E.NPC_CAMPS_2009.find(t=>t.stars===1&&E.pathfind('3,4',t.key)?.length>3);
 assert(target);
 const militiaFactor=E.armyMarchFactor(start),slow=E.getUnit(start,'human_1').spd;
 assert(Math.abs(militiaFactor-Math.max(.8,Math.min(1.10,.8+slow/40)))<1e-12);
 start.army.human_2=1;start.formation=[{unitId:'human_2',count:1}];
 const fast=E.armyMarchFactor(start);assert(fast>militiaFactor);
 const path=E.pathfind('3,4',target.key),expected=E.marchDuration(E.heroStats(start,1).spd,path,fast);
 E.startMarch(start,target.key);assert.equal(start.march.total,expected);
 assert.equal(start.expedition.formation[0].unitId,'human_2');
 const reload=E.parseSave(E.serializeSave(start));assert.equal(reload.march.remaining,expected);
});
test('HG16 rejects insufficient march AP atomically and preserves the route ledger',()=>{
 const s=state(),tile=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));
 s.ap=5;E.syncCityState(s);const before=JSON.stringify(s);
 assert.throws(()=>E.startMarch(s,tile.key),/Thiếu AP/);
 assert.equal(JSON.stringify(s),before);assert(E.strictSave(s));
});
test('Published NPC battle example truncates the 47,897.94 result to 47,897',()=>{
 const s=state('human');s.heroes[0].atk=168;s.heroes[0].def=0;s.army.human_8=500;s.formation=[{unitId:'human_8',count:500}];
 s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const ally=s.battle.allies[0];
 // Published Fandom example: 500 Priests, buffed unit ATK 82.8, NPC DEF 109,
 // hero ATK 168, no defending hero. The source reports in-game damage 47,897.
 ally.atk=82.8;ally.count=500;ally.hp=1e9;ally.pool=500e9;ally.range=20;ally.spd=99;
 const enemy=s.battle.enemies[0];enemy.count=1;enemy.hp=1e9;enemy.pool=1e9;enemy.def=109;enemy.atk=0;enemy.range=20;enemy.spd=1;s.battle.enemies=[enemy];
 const out=E.battleAct(s,'attack');assert.equal(out.dealt,47897);
});

test('Casualty and Arena wound ledger are exact and never negative',()=>{
 const s=state();s.army.human_1=10;s.buildings.arena=1;s.heroes[0].atk=0;s.heroes[0].def=0;
 s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);const ally=s.battle.allies[0];ally.count=10;ally.hp=100;ally.pool=1000;ally.def=12;ally.range=20;ally.spd=1;ally.atk=15;
 const enemy=s.battle.enemies[0];enemy.count=1;enemy.hp=10000;enemy.pool=10000;enemy.atk=219;enemy.def=0;enemy.range=20;enemy.spd=99;s.battle.enemies=[enemy];
 const out=E.battleAct(s,'attack');assert.equal(out.type,'continue');assert.equal(s.army.human_1,8);assert.equal(s.wounded.human_1,1);assert.equal(s.woundFraction.human_1,.5);assert(Object.values(s.army).every(n=>Number.isInteger(n)&&n>=0));
});

test('HG10 repeatable NPC hunting spends AP per new march, pays once per win and preserves one-time clearing',()=>{
 const s=state(),tile=E.TILES.find(t=>t.kind==='npc');s.army.human_1=50;s.heroes[0].level=100;s.heroes[0].atk=10000;s.heroes[0].def=10000;
 s.battle=E.makeBattle(s,tile.key);for(const a of s.battle.allies)a.range=20;for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;}
 let out;for(let i=0;i<10&&s.battle;i++)out=E.battleAct(s,'attack');assert.equal(out.type,'win');
 const settled={res:{...s.res},fame:s.fame,lootWins:s.lootWins,inventory:s.inventory.length};
 throws(()=>E.battleAct(s,'attack'),/Không có trận chiến/);
 assert.deepEqual({res:{...s.res},fame:s.fame,lootWins:s.lootWins,inventory:s.inventory.length},settled);
 assert.equal(s.cleared.filter(key=>key===tile.key).length,1);
 const ap=s.ap;E.startMarch(s,tile.key);assert.equal(s.ap,ap-8,'a new expedition must pay normal AP');
 const reload=E.parseSave(E.serializeSave(s));assert.equal(reload.march.target,tile.key);
 E.tick(reload,reload.lastTick+reload.march.remaining/reload.speed*1000+1000);assert(reload.battle);
 for(const e of reload.battle.enemies){e.hp=1;e.pool=1;e.count=1;}
 for(const a of reload.battle.allies)a.range=20;
 let second;for(let i=0;i<10&&reload.battle;i++)second=E.battleAct(reload,'attack');
 assert.equal(second?.type,'win');assert.equal(reload.cleared.filter(key=>key===tile.key).length,1);
 assert(reload.fame>settled.fame,'separate paid battle should give a new reward');
 assert(E.strictSave(E.parseSave(E.serializeSave(reload))));
 const mineState=state(),mine=E.TILES.find(t=>t.kind==='mine'&&E.pathfind('3,4',t.key));assert(mine);
 const oldAp=mineState.ap;mineState.cleared.push(mine.key);
 throws(()=>E.startMarch(mineState,mine.key),/Mục tiêu đã hoàn thành/);assert.equal(mineState.ap,oldAp);
});

test('Mid-battle HG08 save resumes with the same positions, initiative and outcome',()=>{
 const s=state();s.army.human_1=30;s.formation=[{unitId:'human_1',count:30}];s.battle=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);E.battleAct(s,'attack');
 const restored=E.parseSave(E.serializeSave(s));assert.equal(restored.version,7);assert.equal(restored.battle.turn,s.battle.turn);assert.equal(restored.battle.lastActOrder.join(','),s.battle.lastActOrder.join(','));
 function finish(x){let out,guard=0;while(x.battle&&guard++<72)out=E.battleAct(x,'attack');return out?.type;}
 const a=finish(s),b=finish(restored);assert.equal(a,b);assert.equal(JSON.stringify({army:s.army,wounded:s.wounded,res:s.res,cleared:s.cleared,mines:s.mines,fame:s.fame,xp:s.heroes[0].xp}),JSON.stringify({army:restored.army,wounded:restored.wounded,res:restored.res,cleared:restored.cleared,mines:restored.mines,fame:restored.fame,xp:restored.heroes[0].xp}));
});

test('1000 seeded tactical encounters replay identically with valid ledgers',()=>{
 const targets=E.TILES.filter(t=>t.kind==='npc');assert(targets.length>0);
 function rngFor(seed){let x=(seed>>>0)||1;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x;}}
 function play(s){let result,steps=0;while(s.battle&&steps++<72)result=E.battleAct(s,'attack');assert.equal(s.battle,null,'battle exceeded termination bound');return {type:result?.type,army:{...s.army},wounded:{...s.wounded},fractions:{...s.woundFraction},res:{...s.res},fame:s.fame,xp:s.heroes.find(h=>h.id===s.activeHero).xp,lootWins:s.lootWins,cleared:[...s.cleared],mines:[...s.mines]};}
 for(let seed=1;seed<=1000;seed++){
  const rng=rngFor(seed),race=['human','elf','orc','undead'][rng()%4],s=state(race),unitList=C.units[race].slice(0,5),slots=1+rng()%7,remaining=E.heroLimit(1),formation=[];let used=0;
  for(let slot=0;slot<slots;slot++){const u=unitList[rng()%unitList.length],room=Math.floor((remaining-used)/E.unitValue(u));if(room<1)continue;const count=1+rng()%Math.max(1,Math.min(8,room));formation.push({unitId:u.id,count});used+=E.unitValue(u)*count;s.army[u.id]=(s.army[u.id]||0)+count;}
  if(!formation.length){const u=unitList[0];formation.push({unitId:u.id,count:1});s.army[u.id]=1;}
  s.formation=formation;s.battle=E.makeBattle(s,targets[rng()%targets.length].key);if(rng()%2)s.buildings.arena=1;
  const initial=E.clone(s),actual=play(s),replayed=play(initial);assert.deepEqual(actual,replayed,`seed ${seed}`);assert(Object.values(actual.army).every(n=>Number.isSafeInteger(n)&&n>=0),`negative army at seed ${seed}`);assert(Object.values(actual.res).every(n=>Number.isFinite(n)&&n>=0),`invalid resource at seed ${seed}`);assert(Object.values(actual.fractions).every(n=>n>=0&&n<1),`invalid wound remainder at seed ${seed}`);assert.equal(E.strictSave(s),true,`invalid save at seed ${seed}`);
 }
});

test('HG10 Chinese rank table gates secondary castles atomically',()=>{
 const rows=[[0,1],[5799,1],[5800,2],[7999,2],[80000,3],[299999,3],[300000,4],[700000,5],[1000000,6]];
 for(const [fame,count] of rows)assert.equal(E.cityLimit(fame),count,'Fame '+fame);
 const s=state();s.fame=5799;E.ensure10(s);const before=JSON.stringify(s),ap=s.ap;
 throws(()=>E.startMarch(s,'9,10'),/danh vọng/i);assert.equal(s.ap,ap);assert.equal(JSON.stringify(s),before);
});

test('HG10 wins a real neutral-castle battle and stations the field army',()=>{
 const s=state();s.fame=5800;const home={...s.army};
 E.startMarch(s,'9,10');assert.equal(s.ap,92);assert.equal(s.army.human_1,0);assert.equal(s.expedition.homeCityId,'main');
 s.march.remaining=.01;E.tick(s,s.lastTick+1000);assert.equal(s.battle.target,'9,10');
 for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0;e.def=0}
 for(const a of s.battle.allies)a.range=20;
 let out;for(let i=0;i<8&&s.battle;i++)out=E.battleAct(s,'attack');
 assert.equal(out.type,'win');assert.equal(s.cities.length,2);const city=E.cityForKey(s,'9,10');assert.equal(city.race,'elf');assert.equal(city.sourceStatus,'MODELED_STARTING_CITY');
 assert.equal(s.stationedHeroes[0].key,'9,10');assert.equal(s.stationedHeroes[0].homeCityId,'main');assert.equal(s.army.human_1,home.human_1-16);
 assert.equal(s.cleared.includes('9,10'),true);assert(E.strictSave(s));
});

test('HG10 city switching isolates race, resources, troops and offline recruitment',()=>{
 const s=state();s.fame=5800;E.startMarch(s,'9,10');s.march.remaining=.01;E.tick(s,s.lastTick+1000);
 for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0;e.def=0}for(const a of s.battle.allies)a.range=20;
 let out;for(let i=0;i<8&&s.battle;i++)out=E.battleAct(s,'attack');assert.equal(out.type,'win');
 const elf=E.cityForKey(s,'9,10');E.switchCity(s,elf.id);assert.equal(s.race,'elf');assert(Object.keys(s.army).every(id=>id.startsWith('elf_')));throws(()=>E.claim(s,'any-task'),/thành chính/i);const elfBase=E.rate(s).gold;s.mines.push({key:'10,2',res:'gold',level:1,cityId:'main'});assert.equal(E.rate(s).gold,elfBase);E.switchCity(s,'main');assert.equal(E.rate(s).gold-160,200);E.switchCity(s,elf.id);
 for(const k of C.keys)s.res[k]=E.limits(s)[k];const unit=C.units.elf[0];E.recruit(s,unit.id,1);const queued=s.training[0].total;E.syncCityState(s);
 const elfBefore={...s.res};E.switchCity(s,'main');s.res.gold-=0;const now=s.lastTick+Math.ceil(queued/60*1000)+2000;E.tick(s,now);
 const savedElf=E.cityForKey(s,'9,10');assert.equal(savedElf.local.training.length,0);assert.equal(savedElf.local.army[unit.id],1);
 assert.equal(Object.keys(s.army).every(id=>id.startsWith('human_')),true);const humanResources={...s.res};
 E.switchCity(s,elf.id);assert.equal(s.race,'elf');assert.equal(s.army[unit.id],1);assert.notDeepEqual(s.res,humanResources);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.activeCityId,elf.id);assert.equal(E.cityForKey(loaded,'9,10').local.army[unit.id],1);assert(E.strictSave(loaded));
});
test('HG10 24-hour offline catch-up advances queues in active and inactive cities',()=>{
 const s=state();s.speed=1;s.fame=5800;E.startMarch(s,'9,10');s.march.remaining=.01;E.tick(s,s.lastTick+1000);
 for(const enemy of s.battle.enemies){enemy.hp=1;enemy.pool=1;enemy.count=1;enemy.atk=0;enemy.def=0}
 for(const ally of s.battle.allies)ally.range=20;
 let result;for(let i=0;i<8&&s.battle;i++)result=E.battleAct(s,'attack');assert.equal(result.type,'win');
 const elf=E.cityForKey(s,'9,10');assert(elf);expensive(s);E.upgrade(s,'market');E.recruit(s,'human_1',1);
 E.switchCity(s,elf.id);expensive(s);E.upgrade(s,'market');E.recruit(s,'elf_1',1);E.switchCity(s,'main');
 const end=s.lastTick+24*3600*1000;E.tick(s,end);
 assert.equal(s.lastTick,end);assert.equal(s.buildingQueue,null);assert.equal(s.buildings.market,1);assert.equal(s.training.length,0);assert.equal(s.army.human_1,1);
 const local=E.cityForKey(s,'9,10').local;assert.equal(local.buildingQueue,null);assert.equal(local.buildings.market,1);assert.equal(local.training.length,0);assert.equal(local.army.elf_1,1);
 const saved=E.serializeSave(s),loaded=E.parseSave(saved);assert.equal(loaded.cities.length,2);assert.equal(E.cityForKey(loaded,'9,10').local.army.elf_1,1);assert(E.strictSave(loaded));
 const before=JSON.stringify(loaded);E.tick(loaded,end);assert.equal(JSON.stringify(loaded),before);
});

test('HG10 offline 24h wall-clock boundary is capped and cannot be replayed',()=>{
 const base=state();base.speed=1;
 for(const k of C.keys)base.res[k]=Math.min(base.res[k],E.limits(base)[k]*.3);
 const start=base.lastTick,almost=E.clone(base),exact=E.clone(base),beyond=E.clone(base);
 E.tick(almost,start+(24*3600-60)*1000);
 E.tick(exact,start+24*3600*1000);
 E.tick(beyond,start+(24*3600+60)*1000);
 for(const k of C.keys){
  assert(almost.res[k]<=exact.res[k]+1e-7,k+' must not decrease in last minute');
  assert(Math.abs(exact.res[k]-beyond.res[k])<1e-7,k+' offline above 24h must cap');
 }
 assert.equal(beyond.lastTick,start+(24*3600+60)*1000);
 const stable=E.parseSave(E.serializeSave(beyond)),snapshot=JSON.stringify(stable);
 E.tick(stable,beyond.lastTick);assert.equal(JSON.stringify(stable),snapshot);
 E.tick(stable,start+3600*1000);assert.equal(JSON.stringify(stable),snapshot);
 assert(E.strictSave(stable));
});
test('HG10 owned mine cannot be attacked twice or duplicate hourly income',()=>{
 const s=state(),mine=E.TILES.find(t=>t.kind==='mine'&&t.value==='gold');
 assert(mine);
 const owned={key:mine.key,res:mine.value,level:mine.level,cityId:'main'};
 s.mines.push(owned);
 const before={ap:s.ap,army:JSON.stringify(s.army),mines:JSON.stringify(s.mines),rate:E.rate(s).gold};
 assert.equal(E.rate(s).gold,360);
 throws(()=>E.startMarch(s,mine.key),/đã thuộc quyền sở hữu/);
 assert.equal(s.ap,before.ap);assert.equal(JSON.stringify(s.army),before.army);
 assert.equal(JSON.stringify(s.mines),before.mines);assert.equal(E.rate(s).gold,before.rate);
 assert.equal(s.march,null);assert.equal(s.expedition,null);
 const saved=E.parseSave(E.serializeSave(s));
 assert.equal(saved.mines.length,1);assert.equal(E.rate(saved).gold,before.rate);
 assert(E.strictSave(saved));
});
test('HG10 six cities retain isolated five-resource economy, training, construction and research over 24h offline',()=>{
 const s=state();s.speed=1;s.fame=1_000_000;
 const castles=E.TILES.filter(t=>t.kind==='castle'&&t.key!=='3,4'&&!t.aiOwner&&!t.source?.startsWith('MODELED_')).slice(0,5);
 assert.equal(castles.length,5);
 for(const tile of castles){
  const seed=E.make(tile.race,s.lastTick),city=E.clone(seed.cities[0]);
  city.id='city-'+tile.key.replace(',','-');city.key=tile.key;city.name=tile.value;city.main=false;city.sourceStatus='QA_FIXTURE';
  s.cities.push(city);
 }
 E.syncCityState(s);
 const before=new Map(),start=s.lastTick;
 for(const city of [...s.cities]){
  E.switchCity(s,city.id);
  const type=s.race+'_1',startingArmy=s.army[type];
  E.upgrade(s,'market');
  E.recruit(s,type,1);
  if(city.id==='main')E.researchSpell(s,'bootcamp');
  const res={...s.res},rates={...E.rate(s)},limit={...E.limits(s)};
  before.set(city.id,{race:s.race,armyType:type,startingArmy,res,rates,limit});
 }
 E.switchCity(s,'main');
 const end=start+24*3600*1000;
 let loaded=E.parseSave(E.serializeSave(s));
 E.tick(loaded,end);assert.equal(loaded.cities.length,6);
 for(const city of loaded.cities){
  E.switchCity(loaded,city.id);
  const b=before.get(city.id);assert.equal(loaded.race,b.race);
  for(const k of C.keys){
   const expected=Math.min(b.limit[k],b.res[k]+b.rates[k]*24);
   assert(Math.abs(loaded.res[k]-expected)<1e-6,city.id+' '+k+': '+loaded.res[k]+' vs '+expected);
  }
  assert.equal(loaded.buildings.market,1);assert.equal(loaded.buildingQueue,null);
  assert.equal(loaded.training.length,0);assert.equal(loaded.army[b.armyType],b.startingArmy+1);
  if(city.id==='main'){assert.equal(loaded.researchQueue,null);assert.equal(loaded.spells.bootcamp,1)}
 }
 E.switchCity(loaded,'main');
 const snapshot=JSON.stringify(loaded);
 E.tick(loaded,end);assert.equal(JSON.stringify(loaded),snapshot);
 const reloaded=E.parseSave(E.serializeSave(loaded));assert(E.strictSave(reloaded));
 assert.equal(reloaded.cities.length,6);
});
test('HG10 world expands to 60 castle targets without replacing sourced locations',()=>{
 const castles=E.TILES.filter(t=>t.kind==='castle'),modelled=castles.filter(t=>t.source==='MODELED_OFFLINE_CITY');
 assert.equal(castles.length,60);assert.equal(modelled.length,54);
 assert.equal(modelled.filter(t=>t.aiOwner).length,36);
 assert(modelled.some(t=>t.aiOwner&&t.level===1),'At least one introductory AI siege target');
 assert.equal(modelled.filter(t=>!t.aiOwner).length,18);
 assert.deepEqual(['3,4','9,10','16,5','23,8','5,13','12,12'].map(key=>E.getTile(key).kind),Array(6).fill('castle'));
 assert.equal(E.NPC_CAMPS_2009.length,128);assert.equal(E.TREASURE_CAMPS_2009.length,76);
 for(const tile of modelled)assert(E.pathfind('3,4',tile.key), 'Generated castle unreachable: '+tile.key);
 const s=state();assert.equal(Object.keys(s.aiCities).length,36);assert(E.strictSave(s));
 const legacy=E.clone(s);delete legacy.aiCities;
 const upgraded=E.parseSave(JSON.stringify(legacy));
 assert.equal(Object.keys(upgraded.aiCities).length,36);assert(E.strictSave(upgraded));
});
test('HG10 AI city economy grows garrisons from funded resources and survives offline reload',()=>{
 const s=state();s.speed=1;const key=Object.keys(s.aiCities)[0],before=E.clone(s.aiCities[key]);
 assert(E.aiCityAt(s,key));const t=s.lastTick+24*3600*1000;E.tick(s,t);
 const after=E.aiCityAt(s,key);
 assert(after.hours===24);assert(after.level>=before.level&&after.level<=5);
 assert(Object.values(after.garrison).reduce((a,b)=>a+b,0)>Object.values(before.garrison).reduce((a,b)=>a+b,0));
 for(const k of C.keys)assert(after.treasury[k]>=0&&Number.isFinite(after.treasury[k]));
 const reloaded=E.parseSave(E.serializeSave(s)),snapshot=JSON.stringify(reloaded);
 E.tick(reloaded,t);assert.equal(JSON.stringify(reloaded),snapshot);assert(E.strictSave(reloaded));
});
test('HG10 AI castle uses persistent faction garrison in combat, then transfers exactly once',()=>{
 const s=state();s.fame=5800;
 const tile=E.TILES.find(t=>t.kind==='castle'&&t.aiOwner&&E.pathfind('3,4',t.key));
 assert(tile,'Needs at least one reachable AI city');
 const initial=E.clone(s.aiCities[tile.key]),u=C.units[initial.race][0];
 E.startMarch(s,tile.key);s.march.remaining=.01;E.tick(s,s.lastTick+1000);
 assert(s.battle&&s.battle.kind==='castle');
 const guard=s.battle.enemies.find(e=>e.unitId===u.id);
 assert(guard);assert.equal(guard.initial,initial.garrison[u.id]);assert.equal(guard.hp,u.hp);assert.equal(guard.atk,u.atk);assert.equal(guard.def,u.def);
 let saved=E.parseSave(E.serializeSave(s));assert.equal(saved.battle.enemies[0].initial,guard.initial);
 for(const enemy of saved.battle.enemies){enemy.pool=1;enemy.hp=1;enemy.count=1;enemy.atk=0;enemy.def=0}
 for(const ally of saved.battle.allies)ally.range=20;
 let result;for(let i=0;i<9&&saved.battle;i++)result=E.battleAct(saved,'attack');
 assert.equal(result.type,'win');assert.equal(saved.aiCities[tile.key],undefined);
 assert(E.cityForKey(saved,tile.key));assert.equal(saved.cities.length,2);
 assert(E.strictSave(saved));saved=E.parseSave(E.serializeSave(saved));
 assert.equal(saved.aiCities[tile.key],undefined);assert(E.cityForKey(saved,tile.key));
 throws(()=>E.startMarch(saved,tile.key),/đã thuộc quyền/);
});
test('HG10 recalled troops return to the originating city after switching castles',()=>{
 const s=state();s.fame=5800;E.startMarch(s,'9,10');s.march.remaining=.01;E.tick(s,s.lastTick+1000);
 for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0;e.def=0}for(const a of s.battle.allies)a.range=20;
 let out;for(let i=0;i<8&&s.battle;i++)out=E.battleAct(s,'attack');assert.equal(out.type,'win');
 const deployed={...s.stationedHeroes[0].army};E.switchCity(s,'city-9-10');E.recallHero(s,1);assert.equal(s.expedition.homeCityId,'main');
 E.tick(s,s.lastTick+120000);assert.equal(s.expedition,null);assert.equal(s.activeCityId,'city-9-10');
 const home=E.cityForKey(s,'3,4');for(const [id,n] of Object.entries(deployed))assert.equal(home.local.army[id],n);
 assert(Object.keys(s.army).every(id=>id.startsWith('elf_')));assert(E.strictSave(s));
});

test('HG10 blocks routine tasks in captured cities and rejects corrupt active-city references',()=>{
 const s=state();s.fame=5800;E.startMarch(s,'9,10');s.march.remaining=.01;E.tick(s,s.lastTick+1000);for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0;e.def=0}for(const a of s.battle.allies)a.range=20;while(s.battle)E.battleAct(s,'attack');
 E.switchCity(s,'city-9-10');throws(()=>E.claim(s,'any-task'),/thành chính/i);const bad=E.clone(s);bad.activeCityId='missing';throws(()=>E.parseSave(JSON.stringify(bad)),/thành không tồn tại/i);
});

test('HG10 migrates legacy v07 saves without duplicating city stock',()=>{
 const old=state();old.res.gold=1234;delete old.cities;delete old.activeCityId;delete old.activeCastleKey;
 const loaded=E.parseSave(JSON.stringify(old));assert.equal(loaded.version,7);assert.equal(loaded.cities.length,1);assert.equal(loaded.activeCityId,'main');assert.equal(loaded.res.gold,1234);assert.equal(loaded.cities[0].local.res.gold,1234);assert(E.strictSave(loaded));
});

test('HG10 world grid preserves the historical 100x100 coordinate space and all ten visitable locations',()=>{
 assert.equal(E.WIDTH,100);assert.equal(E.HEIGHT,100);assert.equal(E.WORLD_BUILDINGS.length,10);
 for(const b of E.WORLD_BUILDINGS){const key=`${b.x},${b.y}`;assert.equal(E.getTile(key).kind,'visit',key);assert(E.pathfind('3,4',key),`no path to ${key}`)}
 assert.equal(E.WORLD_BUILDING_BY_KEY.get('94,1').name,'Tháp Phòng thủ');assert.equal(E.WORLD_BUILDING_BY_KEY.get('11,89').effect,'random-resource');
});
test('SRC45/SRC46/SRC47 restore historical NPC coords and preserve dated force conflicts',()=>{
 const expected={1:[31,1500,3000,1800,null],2:[32,4000,8000,4200,null],3:[16,15000,30000,15000,null],4:[16,45000,90000,45000,null],5:[9,150000,300000,150000,null],6:[8,360000,700000,360000,400000],7:[9,720000,1500000,720000,900000],8:[7,1200000,2400000,1200000,1500000]};
 assert.equal(E.NPC_CAMPS_2009.length,128);assert.equal(new Set(E.NPC_CAMPS_2009.map(q=>q.key)).size,128);
 for(const [star,[count,minimum,complete,guard,later]] of Object.entries(expected)){const camps=E.NPC_CAMPS_2009.filter(q=>q.stars===Number(star));assert.equal(camps.length,count,`${star}★ count`);for(const camp of camps){const t=E.getTile(camp.key);assert.equal(t.kind,'npc',camp.key);assert.equal(t.level,Number(star),camp.key);assert.equal(t.source,'SRC46',camp.key);assert.equal(t.forceSource,'SRC47',camp.key);assert.equal(t.minimumForce,minimum,camp.key);assert.equal(t.completeForce,complete,camp.key);assert.equal(t.reportedGuardForce,guard,camp.key);assert.equal(t.laterReportedGuardForce,later,camp.key);assert.equal(t.laterForceSource,later?'SRC45':null,camp.key);assert(E.pathfind('3,4',camp.key),`no path ${camp.key}`)}}
});
test('SRC46 5–8 star map targets become selectable live NPC encounters with their sourced XP tiers',()=>{
 for(const camp of E.NPC_CAMPS_2009.filter(q=>q.stars>=5)){const s=state();s.army.human_1=92;s.formation=[{unitId:'human_1',count:92}];E.startMarch(s,camp.key);const saved=E.parseSave(E.serializeSave(s));assert.equal(saved.version,7);assert.equal(saved.march.target,camp.key);saved.march.remaining=.01;E.tick(saved,saved.lastTick+1000);assert.equal(saved.battle?.kind,'npc');assert.equal(saved.battle?.level,camp.stars);assert.equal(E.battleExperienceReward(saved.battle).source,'SRC45');assert(E.strictSave(saved))}
});
test('SRC46 keeps previously saved HG-07 starter NPC destinations valid under v07',()=>{
 const s=state();s.formation=[{unitId:'human_1',count:7}];E.startMarch(s,'15,8');const migrated=E.parseSave(E.serializeSave(s));assert.equal(migrated.version,7);assert.equal(migrated.march.target,'15,8');assert.equal(E.getTile(migrated.march.target).kind,'npc');assert(E.strictSave(migrated));
});
test('SRC20/SRC47 preserve 76 gear camps, dated force conflicts and the occupied 10,8 overlay',()=>{
 const expected={1:[7,3000,6000,3000],2:[8,8000,15000,8400],3:[8,24000,48000,24000],4:[7,72000,150000,72000],5:[8,216000,400000,216000],6:[8,480000,100000,480000],7:[6,960000,1600000,960000],8:[8,1440000,2300000,1440000],9:[8,2160000,3000000,2160000],10:[8,3000000,4000000,3000000]};
 assert.equal(E.TREASURE_CAMPS_2009.length,76);assert.equal(new Set(E.TREASURE_CAMPS_2009.map(q=>q.key)).size,76);
 for(const [level,[count,minimum,complete,guard]] of Object.entries(expected)){const camps=E.TREASURE_CAMPS_2009.filter(q=>q.level===Number(level));assert.equal(camps.length,count,`level ${level}`);assert.equal(E.TREASURE_GEAR_GUIDE[level].minimumForce,minimum);assert.equal(E.TREASURE_GEAR_GUIDE[level].completeForce,complete);assert.equal(E.TREASURE_GEAR_GUIDE[level].reportedGuardForce,guard);for(const camp of camps){assert.equal(E.getTile(camp.key).treasureCamp.key,camp.key);assert(E.pathfind('3,4',camp.key),`no path to ${camp.key}`)}}
 const overlays=E.TREASURE_CAMPS_2009.filter(q=>E.getTile(q.key).kind!=='treasure');assert.equal(overlays.length,1);assert.equal(overlays[0].key,'10,8');assert.equal(E.getTile('10,8').kind,'npc');assert.equal(E.getTreasureCamp('10,8').level,7);
 assert.equal(E.TREASURE_GEAR_GUIDE[6].completeForceStatus,'CONFLICT_SOURCE_TYPO_SUSPECTED');const legacy=state();delete legacy.treasureCleared;assert.equal(E.parseSave(JSON.stringify(legacy)).treasureCleared.length,0);
});
test('HG10 treasure camp dispatch, battle, loot, return and NPC overlay remain separate through v07 Save/Load',()=>{
 const s=state();s.army.human_1=60;s.formation=[{unitId:'human_1',count:60}];const camp=E.getTreasureCamp('10,8');assert(camp);
 E.startMarch(s,camp.key,'treasure');assert.equal(s.ap,92);assert.equal(s.march.targetKind,'treasure');let loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.march.targetKind,'treasure');loaded.march.remaining=.01;E.tick(loaded,loaded.lastTick+1000);
 assert.equal(loaded.battle.kind,'treasure');assert.equal(loaded.battle.level,7);assert.equal(loaded.battle.name,'Kho báu cấp 7');assert.equal(E.battleExperienceReward(loaded.battle).source,'SIM');
 for(const ally of loaded.battle.allies)ally.range=20;for(const enemy of loaded.battle.enemies){enemy.hp=1;enemy.pool=1;enemy.count=1;enemy.atk=0;enemy.def=0}loaded.heroes[0].atk=1000;loaded.heroes[0].def=1000;
 let out,guard=0;while(loaded.battle&&guard++<12)out=E.battleAct(loaded,'attack');assert.equal(out.type,'win');assert(loaded.treasureCleared.includes(camp.key));assert(!loaded.cleared.includes(camp.key));assert.equal(loaded.inventory.length,1);assert.match(loaded.inventory[0].origin,/Kho báu cấp 7.*loot mô phỏng/);assert(loaded.log.some(x=>/kho báu cấp 7 \(SIM\)/.test(x)));assert.equal(loaded.march?.phase,'return');assert(E.strictSave(loaded));
 const saved=E.parseSave(E.serializeSave(loaded));assert(saved.treasureCleared.includes(camp.key));assert.equal(saved.inventory.length,1);saved.march.remaining=.01;E.tick(saved,saved.lastTick+1000);assert.equal(saved.march,null);assert.equal(saved.expedition,null);assert.equal(saved.army.human_1,60);
 const base=E.heroStats(saved);E.equipItem(saved,saved.inventory[0].uid);const equipped=E.heroStats(saved);assert(['atk','def','spd'].some(k=>equipped[k]>base[k]));
 E.startMarch(saved,camp.key);assert.equal(saved.march.targetKind,undefined);saved.march.remaining=.01;E.tick(saved,saved.lastTick+1000);assert.equal(saved.battle.kind,'npc');assert.equal(saved.battle.level,3);assert(E.strictSave(saved));
});
test('HG10 windmill grants one listed resource once per site per UTC day without AP or army loss',()=>{
 const s=state(),now=s.lastTick,ap=s.ap,army={...s.army},res={...s.res};const out=E.visitWorldBuilding(s,'11,89',now);
 assert.equal(out.building,'windmill');assert.equal(Object.keys(out.reward).length,1);const [resource]=Object.keys(out.reward);assert(['wood','ore','sulfur','crystal'].includes(resource));assert([200,400].includes(out.reward[resource]));
 assert.equal(s.ap,ap);assert.equal(JSON.stringify(s.army),JSON.stringify(army));assert.equal(s.res[resource],Math.min(E.limits(s)[resource],res[resource]+out.reward[resource]));
 const before={...s.res};throws(()=>E.visitWorldBuilding(s,'11,89',now+60_000),/hôm nay/);assert.equal(JSON.stringify(s.res),JSON.stringify(before));
 const next=E.visitWorldBuilding(s,'11,89',now+86_400_000);assert(next.reward);assert.equal(E.hasVisitedWorldBuilding(s,'11,89',now+86_400_000),true);
});
test('HG10 five watermills each grant their dated 2,000 gold reward and daily visits survive v07 Save/Load',()=>{
 const s=state(),now=s.lastTick,keys=E.WORLD_BUILDINGS.filter(b=>b.effect==='gold-2000').map(b=>`${b.x},${b.y}`);assert.equal(keys.length,5);
 for(const key of keys){const before=s.res.gold,out=E.visitWorldBuilding(s,key,now);assert.equal(out.reward.gold,Math.min(2000,E.limits(s).gold-before));assert.equal(s.res.gold-before,out.reward.gold)}
 const saved=E.parseSave(E.serializeSave(s));for(const key of keys)assert(E.hasVisitedWorldBuilding(saved,key,now));
 const legacy=state();delete legacy.worldVisits;delete legacy.heroBuffs;const migrated=E.parseSave(JSON.stringify(legacy));assert.equal(JSON.stringify(migrated.worldVisits),'{}');assert.equal(JSON.stringify(migrated.heroBuffs),'[]');assert.equal(migrated.version,7);
});
test('HG10 four visitor structures apply 10 percent hero stats and buffs expire on game time across Save/Load',()=>{
 for(const [key,stat] of [['26,4','atk'],['94,1','def'],['21,65','int'],['62,57','spd']]){
  const s=state(),now=s.lastTick,base=E.heroStats(s)[stat],out=E.visitWorldBuilding(s,key,now);assert.equal(out.buff.stat,stat);assert(Math.abs(E.heroStats(s)[stat]-base*1.1)<1e-9,`${key} ${stat}`);
  E.tick(s,now+60_000);assert.equal(s.heroBuffs[0].remaining,3600);const reload=E.parseSave(E.serializeSave(s));assert(Math.abs(E.heroStats(reload)[stat]-base*1.1)<1e-9);
  E.tick(reload,reload.lastTick+60_000);assert.equal(reload.heroBuffs.length,0);assert.equal(E.heroStats(reload)[stat],base);
 }
});
test('HG10 world attack buff changes actual battle damage and expires before later offline production',()=>{
 const target=E.TILES.find(t=>t.kind==='npc'),base=state(),boosted=state();E.visitWorldBuilding(boosted,'26,4',boosted.lastTick);
 const setup=s=>{const b=E.makeBattle(s,target.key);b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Test ranged',range:20,count:10,initial:10,hp:100,atk:100,def:50,spd:20,pool:1000,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Durable target',range:1,count:1000,initial:1000,hp:100,atk:1,def:100,spd:1,pool:100000,x:2,y:1}];b.selected='p0';b.orders={};b.focused=null;s.battle=b;return E.battleAct(s,'attack').dealt};
 assert(setup(boosted)>setup(base));
 const buffed=state(),plain=state();for(const s of [buffed,plain]){s.speed=1;s.heroes[0].int=40}
 E.visitWorldBuilding(buffed,'21,65',buffed.lastTick);E.appoint(buffed,1);E.appoint(plain,1);const beforeB=buffed.res.gold,beforeP=plain.res.gold;E.tick(buffed,buffed.lastTick+3*60*60*1000);E.tick(plain,plain.lastTick+3*60*60*1000);
 assert.equal(buffed.heroBuffs.length,0);assert(Math.abs((buffed.res.gold-beforeB)-(plain.res.gold-beforeP)-(4*160/150*2))<1e-6);
});
test('SRC54 China 2009 recruitment task is separated, counts completed real training, pays once and migrates v07 saves',()=>{
 const s=state('human'),now=s.lastTick,taskId='recruit_archers';
 // Fame from paid training now unlocks rank refreshes. Hold this isolated
 // existing "claim once" fixture within one Fame band; the rank-reset
 // behavior is verified separately below.
 s.fame=5800;E.ensure08(s);
 assert.equal(E.china2009DailyTasks(s,now).length,1);assert.equal(E.dailyTasks(s,now).some(t=>t.id===taskId),false);
 const before={wood:s.res.wood,army:s.army.human_3||0};E.acceptChina2009DailyTask(s,taskId,now);assert.equal(s.china2009DailyTaskState.accepted.includes(taskId),true);
 s.buildings.hall=3;s.buildings.barracks=3;s.spells.bootcamp=1;for(const k of C.keys)s.res[k]=E.limits(s)[k];
 E.recruit(s,'human_3',20);assert.equal(E.china2009DailyTasks(s,now)[0].progress,0);assert.throws(()=>E.claimChina2009DailyTask(s,taskId,now),/hoàn tất huấn luyện/);
 const finish=s.lastTick+s.training[0].remaining/s.speed*1000+1000;E.tick(s,finish);const row=E.china2009DailyTasks(s,s.lastTick)[0];assert.equal(row.progress,20);assert.equal(row.ready,true);s.res.wood=E.limits(s).wood-150;
 const woodAtClaim=s.res.wood,armyAtClaim=s.army.human_3,out=E.claimChina2009DailyTask(s,taskId,s.lastTick);assert.equal(JSON.stringify(out),JSON.stringify({wood:100,unitId:'human_3',units:10}));assert.equal(s.res.wood,woodAtClaim+100);assert.equal(s.army.human_3,armyAtClaim+10);assert.throws(()=>E.claimChina2009DailyTask(s,taskId,s.lastTick),/đã nhận/);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(E.china2009DailyTasks(loaded,loaded.lastTick)[0].claimed,true);assert(E.strictSave(loaded));
 const envelope=JSON.parse(E.serializeSave(state('human')));delete envelope.state.china2009DailyTaskState;const migrated=E.parseSave(JSON.stringify(envelope));assert.equal(migrated.version,7);assert.equal(E.china2009DailyTasks(migrated,migrated.lastTick)[0].progress,0);
 const elf=state('elf');assert.equal(E.china2009DailyTasks(elf,elf.lastTick).length,0);assert.throws(()=>E.acceptChina2009DailyTask(elf,taskId,elf.lastTick),/không áp dụng/);
 assert(before.wood>=0&&before.army>=0);
});

test('HG17 Fame earned from paid troop training triggers source-backed Chinese rank refresh',()=>{
 const s=state('human'),at=s.lastTick;
 E.acceptChina2009DailyTask(s,'recruit_archers',at);
 s.buildings.hall=3;s.buildings.barracks=3;s.spells.bootcamp=1;for(const k of C.keys)s.res[k]=E.limits(s)[k];
 const base=s.fame;E.recruit(s,'human_3',20);
 assert.equal(s.fame,base,'No Fame for an incomplete training queue');
 E.tick(s,s.lastTick+s.training[0].remaining/s.speed*1000+1000);
 assert(s.fame>base,'Completed recruitment must produce Fame');
 assert.equal(s.china2009DailyTaskState.fameStage,E.fameApStats(s.fame).threshold);
 assert.equal(s.china2009DailyTaskState.progress.recruit_archers,0,'Fame-promotion restarts Chinese tasks as sourced');
 assert(E.strictSave(E.parseSave(E.serializeSave(s))));
});
test('HG13 recommendFormation fits command limits, respects owned armies, persists for four races',()=>{
 for(const race of ['human','elf','orc','undead']){
  const s=state(race),units=E.arrUnits(s),before=JSON.stringify(s.formation);
  s.army[units[0].id]=500000;s.army[units[2].id]=400000;s.army[units[8].id]=1000;
  const plan=E.recommendFormation(s);
  assert.equal(JSON.stringify(s.formation),before,'preview must be read-only');
  assert(plan.points>0&&plan.points<=plan.limit);assert(plan.formation.length>0&&plan.formation.length<=7);
  assert.equal(new Set(plan.formation.map(g=>g.unitId)).size,plan.formation.length);
  for(const g of plan.formation)assert(g.count>0&&g.count<=s.army[g.unitId]);
  assert.equal(E.formationPoints(s,plan.formation),plan.points);
  const applied=E.autoFormation(s);assert.equal(E.troopValue(s),applied.points);
  assert.equal(E.checkCapacity(s,s.formation).limit,applied.limit);
  const loaded=E.parseSave(E.serializeSave(s));assert.equal(E.troopValue(loaded),applied.points);
  assert(E.strictSave(loaded));E.setFormation(loaded,[{unitId:units[0].id,count:2}]);
  assert.equal(loaded.formation[0].count,2,'manual formation remains available');
 }
});
test('HG13 quick formation refuses invalid heroes and empty armies without loss',()=>{
 const s=state(),before=JSON.stringify(s.army);E.appoint(s,s.activeHero);
 throws(()=>E.autoFormation(s),/Castellan/);assert.equal(JSON.stringify(s.army),before);
 assert.equal(s.formation.length,0);
 const elf=state('elf');for(const u of E.arrUnits(elf))elf.army[u.id]=0;
 throws(()=>E.autoFormation(elf),/Không có quân phù hợp/);assert.equal(elf.formation.length,0);
});
test('HG10 daily NPC tasks never credit previous victories and keep strict legacy v07 migration',()=>{
 const s=state('human'),taskId='getting_started',day=s.lastTick,npc=E.NPC_CAMPS_2009.find(t=>t.stars===1);
 assert(npc);s.cleared.push(npc.key);E.acceptDailyTask(s,taskId,day);
 assert.equal(E.dailyTasks(s,day)[0].ready,false,'historical cleared NPC does not complete newly accepted task');
 assert.throws(()=>E.claimDailyTask(s,taskId,day),/Chưa thắng/);
 const legacy=JSON.parse(E.serializeSave(s));delete legacy.state.dailyTaskState.progress;
 const restored=E.parseSave(JSON.stringify(legacy));assert.equal(E.dailyTasks(restored,day)[0].ready,false);assert(E.strictSave(restored));
 const tampered=JSON.parse(E.serializeSave(s));tampered.state.dailyTaskState.progress={getting_started:2};
 assert.throws(()=>E.parseSave(JSON.stringify(tampered)),/Save HG-10/);
});
test('HG12 Fandom Hero Tasks grant exact-once EXP for actual matching NPC victory with v07 migration',()=>{
 const s=state('human'),now=s.lastTick,hero=s.heroes.find(h=>h.id===s.activeHero);
 assert.equal(E.heroTaskStatus(s,now).exp,1200);assert.equal(E.heroTaskStatus(s,now).stars,1);
 E.acceptHeroTask(s,now);assert.throws(()=>E.acceptHeroTask(s,now),/đang nhận/);
 assert.throws(()=>E.claimHeroTask(s,now),/chưa hoàn thành/);
 const npc=E.NPC_CAMPS_2009.find(n=>n.stars===1);assert(npc);s.cleared.push(npc.key);
 assert.equal(E.heroTaskStatus(s,now).active.ready,false,'previously cleared NPC cannot grant new task');
 E.setFormation(s,[{unitId:'human_1',count:16}]);E.startMarch(s,npc.key);
 E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);assert(s.battle);
 let out=null,turns=0;while(s.battle&&turns++<50)out=E.battleAct(s,'attack');
 assert.equal(out?.type,'win');assert(E.heroTaskStatus(s,s.lastTick).active.ready);
 const beforeXp=lifetimeHeroXp(hero),bonus=E.heroTowerExperienceBonus(s),reward=E.claimHeroTask(s,s.lastTick);
 assert.equal(reward.baseXp,1200);assert.equal(reward.task,1);
 assert(Math.abs(reward.gained-(1200*(1+bonus/100)))<1e-7);
 assert(Math.abs(lifetimeHeroXp(hero)-beforeXp-reward.gained)<1e-7);
 assert.throws(()=>E.claimHeroTask(s,s.lastTick),/chưa hoàn thành/);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(E.heroTaskStatus(loaded,loaded.lastTick).completed,1);
 assert.equal(E.heroTaskStatus(loaded,loaded.lastTick).exp,1300);assert(E.strictSave(loaded));
 const corrupt=JSON.parse(E.serializeSave(loaded));corrupt.state.dailyTaskState.heroTask.completed=21;
 assert.throws(()=>E.parseSave(JSON.stringify(corrupt)),/Save HG-10/);
 const legacy=JSON.parse(E.serializeSave(loaded));delete legacy.state.dailyTaskState.heroTask;
 assert.equal(E.heroTaskStatus(E.parseSave(JSON.stringify(legacy)),loaded.lastTick).completed,0);
 E.tick(loaded,loaded.lastTick+86_400_000);assert.equal(E.heroTaskStatus(loaded,loaded.lastTick).completed,0);
 const capped=state();capped.dailyTaskState.heroTask.completed=20;
 assert.equal(E.heroTaskStatus(capped,capped.lastTick).available,false);
 assert.throws(()=>E.acceptHeroTask(capped,capped.lastTick),/20 nhiệm vụ/);
});
test('HG12 Hero Tasks can only be accepted or claimed from the main city',()=>{
 const s=state('human'),secondary=E.make('elf',s.lastTick);E.ensure08(secondary);
 const city=JSON.parse(JSON.stringify(secondary.cities[0]));city.id='city-hero-task-gate';city.key='9,10';city.main=false;s.cities.push(city);
 assert(E.heroTaskStatus(s).canAccept);E.switchCity(s,city.id);assert.equal(E.heroTaskStatus(s).canAccept,false);
 assert.throws(()=>E.acceptHeroTask(s,s.lastTick),/thành chính/);
 E.switchCity(s,'main');E.acceptHeroTask(s,s.lastTick);E.switchCity(s,city.id);
 assert.throws(()=>E.claimHeroTask(s,s.lastTick),/thành chính/);assert(E.strictSave(s));
});
test('HG10 source-cited daily task accepts, follows a real 1-star battle, pays once and survives v07 reload',()=>{
 const s=state('human'),taskId='getting_started',day=s.lastTick,target=E.NPC_CAMPS_2009.find(x=>x.stars===1);assert(target);assert.equal(E.dailyTasks(s,day)[0].progress,0);
 const before={gold:s.res.gold,ap:s.ap};E.acceptDailyTask(s,taskId,day);assert.equal(E.dailyTasks(s,day)[0].accepted,true);assert.equal(s.res.gold,before.gold);assert.equal(s.ap,before.ap);
 E.setFormation(s,[{unitId:'human_1',count:16}]);E.startMarch(s,target.key);assert.equal(s.expedition.army.human_1,16);
 E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);assert.equal(s.battle.target,target.key);let result=null,guard=0;while(s.battle&&guard++<50)result=E.battleAct(s,'attack');assert.equal(result?.type,'win');assert(s.cleared.includes(target.key));
 const progress=E.dailyTasks(s,s.lastTick)[0];assert.equal(progress.ready,true);const goldAtClaim=s.res.gold,apAtClaim=s.ap,after=E.claimDailyTask(s,taskId,s.lastTick);assert.equal(after.gold,500);assert.equal(after.ap,7);assert.equal(s.res.gold,goldAtClaim+500);assert.equal(s.ap,Math.min(s.apMax,apAtClaim+7));assert.equal(E.dailyTasks(s,s.lastTick)[0].claimed,true);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.dailyTaskState.day,E.worldDayKey(s.lastTick));assert.equal(E.dailyTasks(loaded,s.lastTick)[0].claimed,true);throws(()=>E.claimDailyTask(loaded,taskId,s.lastTick),/đã nhận/);
 const nextDay=s.lastTick+86_400_000;assert.equal(E.dailyTasks(loaded,nextDay)[0].claimed,false);assert.equal(E.dailyTasks(loaded,nextDay)[0].ready,false);assert.equal(loaded.dailyTaskState.day,E.worldDayKey(nextDay));E.acceptDailyTask(loaded,taskId,nextDay);assert.equal(E.dailyTasks(loaded,nextDay)[0].ready,false);
 const legacy=E.serializeSave(state('elf'));const envelope=JSON.parse(legacy);delete envelope.state.dailyTaskState;const migrated=E.parseSave(JSON.stringify(envelope));assert.equal(migrated.version,7);assert(E.strictSave(migrated));assert.equal(E.dailyTasks(migrated,migrated.lastTick)[0].claimed,false);
});
test('SRC30/SRC61 Undead daily Lich King task is race/Fame-gated, follows a real 3-star battle and pays once through v07',()=>{
 const id='clean_up_remnants',elf=state('elf'),s=state('undead'),target=E.NPC_CAMPS_2009.find(x=>x.stars===3);assert(target);
 assert.equal(E.dailyTasks(elf,elf.lastTick).some(t=>t.id===id),false);assert.throws(()=>E.acceptDailyTask(elf,id,elf.lastTick),/không áp dụng/);
 s.fame=2199;const locked=E.dailyTasks(s,s.lastTick).find(t=>t.id===id);assert(locked&&!locked.available);assert.throws(()=>E.acceptDailyTask(s,id,s.lastTick),/Cần 2\.200 danh vọng/);
 s.fame=2200;const task=E.dailyTasks(s,s.lastTick).find(t=>t.id===id);assert(task.available);assert.equal(task.rewardUnitId,'undead_8');assert.equal(task.rewardUnits,1);
 E.acceptDailyTask(s,id,s.lastTick);s.army.undead_8=7;E.setFormation(s,[{unitId:'undead_8',count:7}]);E.startMarch(s,target.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
 let result=null,turns=0;while(s.battle&&turns++<20)result=E.battleAct(s,'attack');assert.equal(result?.type,'win');assert(s.cleared.includes(target.key));assert.equal(E.dailyTasks(s,s.lastTick).find(t=>t.id===id).ready,true);
 const cap=E.limits(s).gold,armyBefore=s.army.undead_8,apBefore=s.ap;s.res.gold=cap-400;assert.throws(()=>E.claimDailyTask(s,id,s.lastTick),/Kho vàng không đủ chỗ/);assert.equal(s.army.undead_8,armyBefore);assert.equal(s.ap,apBefore);assert.equal(s.dailyTaskState.claimed.includes(id),false);
 s.res.gold=cap-1000;const goldBefore=s.res.gold,claim=E.claimDailyTask(s,id,s.lastTick);assert.equal(JSON.stringify(claim),JSON.stringify({gold:800,ap:Math.min(9,s.apMax-apBefore),unitId:'undead_8',units:1}));assert.equal(s.res.gold,goldBefore+800);assert.equal(s.army.undead_8,armyBefore+1);assert.throws(()=>E.claimDailyTask(s,id,s.lastTick),/đã nhận/);
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(loaded.army.undead_8,armyBefore+1);assert.equal(E.dailyTasks(loaded,loaded.lastTick).find(t=>t.id===id).claimed,true);assert(E.strictSave(loaded));
});
test('International community daily board preserves accepted work on Fame promotion, resets by day and rejects corrupt v07 task state',()=>{
 const s=state(),now=s.lastTick;E.acceptDailyTask(s,'getting_started',now);s.fame=800;assert.equal(E.dailyTasks(s,now)[0].accepted,true);assert.equal('fameRank' in s.dailyTaskState,false);
 const saved=E.serializeSave(s),raw=JSON.parse(saved);raw.state.dailyTaskState.accepted=['unknown'];assert.throws(()=>E.parseSave(JSON.stringify(raw)),/Save HG-10/);
 assert.equal(E.dailyTasks(s,now+86_400_000)[0].accepted,false);assert.equal(s.dailyTaskState.day,E.worldDayKey(now+86_400_000));
});
test('SRC61 Chinese daily tasks restart on each Fame stage, persist, and adopt legacy v07 boards safely',()=>{
 const id='recruit_archers',s=state('human'),now=s.lastTick;assert.equal(E.china2009DailyTasks(s,now)[0].fameStage,5);
 E.acceptChina2009DailyTask(s,id,now);s.fame=199;let row=E.china2009DailyTasks(s,now)[0];assert.equal(row.accepted,true);assert.equal(row.fameStage,5);
 s.fame=200;row=E.china2009DailyTasks(s,now)[0];assert.deepEqual({accepted:row.accepted,claimed:row.claimed,progress:row.progress,fameStage:row.fameStage},{accepted:false,claimed:false,progress:0,fameStage:200});assert.match(s.log[0],/được làm mới \(SRC61\)/);
 E.acceptChina2009DailyTask(s,id,now);s.fame=799;assert.equal(E.china2009DailyTasks(s,now)[0].accepted,true);s.fame=800;
 row=E.china2009DailyTasks(s,now)[0];assert.deepEqual({accepted:row.accepted,progress:row.progress,fameStage:row.fameStage},{accepted:false,progress:0,fameStage:800});
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.equal(E.china2009DailyTasks(loaded,loaded.lastTick)[0].fameStage,800);assert(E.strictSave(loaded));
 const old=state('human'),raw=JSON.parse(E.serializeSave(old));raw.state.china2009DailyTaskState.accepted=[id];raw.state.china2009DailyTaskState.progress[id]=12;delete raw.state.china2009DailyTaskState.fameStage;
 const migrated=E.parseSave(JSON.stringify(raw)),legacyRow=E.china2009DailyTasks(migrated,migrated.lastTick)[0];assert.deepEqual({accepted:legacyRow.accepted,progress:legacyRow.progress,fameStage:legacyRow.fameStage},{accepted:true,progress:12,fameStage:5});assert(E.strictSave(migrated));
 const invalid=JSON.parse(E.serializeSave(s));invalid.state.china2009DailyTaskState.fameStage=123;assert.throws(()=>E.parseSave(JSON.stringify(invalid)),/Bậc danh vọng/);
 const nextDay=loaded.lastTick+86_400_000;row=E.china2009DailyTasks(loaded,nextDay)[0];assert.deepEqual({accepted:row.accepted,progress:row.progress,fameStage:row.fameStage},{accepted:false,progress:0,fameStage:800});
});
test('SRC61 Fame reset is triggered immediately by a real NPC victory crossing the rank boundary',()=>{
 const s=state('human'),target=E.NPC_CAMPS_2009.find(x=>x.stars===1),id='recruit_archers';assert(target);s.fame=199;E.acceptChina2009DailyTask(s,id,s.lastTick);assert(E.china2009DailyTasks(s,s.lastTick)[0].accepted);
 E.setFormation(s,[{unitId:'human_1',count:16}]);E.startMarch(s,target.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
 let result=null,turns=0;while(s.battle&&turns++<30)result=E.battleAct(s,'attack');assert.equal(result?.type,'win');assert(s.fame>=200);assert.equal(E.fameApStats(s.fame).threshold,200);
 const row=E.china2009DailyTasks(s,s.lastTick)[0];assert.deepEqual({accepted:row.accepted,claimed:row.claimed,progress:row.progress,fameStage:row.fameStage},{accepted:false,claimed:false,progress:0,fameStage:200});assert(s.log.some(x=>x.includes('được làm mới (SRC61)')));
 const loaded=E.parseSave(E.serializeSave(s));assert.equal(loaded.version,7);assert.deepEqual({accepted:E.china2009DailyTasks(loaded,loaded.lastTick)[0].accepted,stage:E.china2009DailyTasks(loaded,loaded.lastTick)[0].fameStage},{accepted:false,stage:200});assert(E.strictSave(loaded));
});
test('SRC61 resets the China daily board at every dated 2009 Fame threshold and preserves v07 saves',()=>{
 const thresholds=[5,200,800,2200,5800,11500,21000,33000,54000,80000,150000,300000,500000,700000,1000000];
 assert.deepEqual(JSON.parse(JSON.stringify(E.FAME_AP.map(([threshold])=>threshold))),thresholds,'17173 SRC20 rank thresholds, rows 250–264');
 let s=state('human'),id='recruit_archers',sameStageAccepted=false;
 assert.equal(E.china2009DailyTasks(s,s.lastTick)[0].fameStage,thresholds[0]);
 for(let i=1;i<thresholds.length;i++){
  const priorStage=thresholds[i-1],stage=thresholds[i],board=s.china2009DailyTaskState;
  if(!sameStageAccepted)E.acceptChina2009DailyTask(s,id,s.lastTick);
  board.progress[id]=i%2?12:20;if(i%2===0)board.claimed=[id];
  s.fame=stage-1;let row=E.china2009DailyTasks(s,s.lastTick)[0];
  assert.deepEqual({accepted:row.accepted,claimed:row.claimed,progress:row.progress,fameStage:row.fameStage},{accepted:true,claimed:i%2===0,progress:i%2?12:20,fameStage:priorStage},`retain below Fame ${stage}`);
  s.fame=stage;row=E.china2009DailyTasks(s,s.lastTick)[0];
  assert.deepEqual({accepted:row.accepted,claimed:row.claimed,progress:row.progress,fameStage:row.fameStage},{accepted:false,claimed:false,progress:0,fameStage:stage},`reset at Fame ${stage}`);
  s=E.parseSave(E.serializeSave(s));assert.equal(s.version,7);assert(E.strictSave(s));
  assert.equal(E.china2009DailyTasks(s,s.lastTick)[0].fameStage,stage,`v07 round-trip at Fame ${stage}`);
  if(i<thresholds.length-1){
   E.acceptChina2009DailyTask(s,id,s.lastTick);s.fame=stage+1;row=E.china2009DailyTasks(s,s.lastTick)[0];
   assert.deepEqual({accepted:row.accepted,progress:row.progress,fameStage:row.fameStage},{accepted:true,progress:0,fameStage:stage},`retain within Fame ${stage} stage`);
   sameStageAccepted=true;
  }
 }
});

function cityTransportFixture(){
 const s=state();s.fame=5800;s.ap=100;s.res.gold=2000;s.res.wood=500;s.army.human_1=3;
 const template=E.make('elf',s.lastTick),city=E.clone(template.cities[0]);city.id='city-9-10';city.key='9,10';city.name='Thành nhận Elf';city.main=false;city.sourceStatus='MODELED_STARTING_CITY';city.local.race='elf';city.local.res={gold:0,wood:0,ore:0,sulfur:0,crystal:0};
 s.cities.push(city);E.ensure10(s);E.syncCityState(s);return {s,city};
}
test('HG10 transport uses the cited 20 AP cost and load ratios with atomic rejection',()=>{
 const {s,city}=cityTransportFixture(),before={ap:s.ap,gold:s.res.gold,wood:s.res.wood,army:s.army.human_1};
 throws(()=>E.startCityTransport(s,city.id,'human_1',1,{gold:301}),/quá tải/i);assert.equal(s.ap,before.ap);assert.equal(s.res.gold,before.gold);assert.equal(s.army.human_1,before.army);
 const convoy=E.startCityTransport(s,city.id,'human_1',2,{gold:400,wood:40,ore:0,sulfur:0,crystal:0});assert.equal(convoy.weight,600);assert.equal(convoy.capacity,600);assert.equal(s.ap,80);assert.equal(s.army.human_1,1);assert.equal(s.res.gold,before.gold-400);assert.equal(s.res.wood,before.wood-40);assert.equal(convoy.phase,'outbound');assert(E.strictSave(s));
});
test('HG10 transport arrives, delivers once, returns troops across city switch and survives v07 reload',()=>{
 const {s,city}=cityTransportFixture();E.startCityTransport(s,city.id,'human_1',2,{gold:400,wood:40,ore:0,sulfur:0,crystal:0});s.cityTransports[0].remaining=.25;
 let saved=E.parseSave(E.serializeSave(s));assert.equal(saved.cityTransports[0].phase,'outbound');const t=saved.lastTick+1000;E.tick(saved,t);assert.equal(saved.cityTransports[0].phase,'return');const target=E.cityForKey(saved,city.key);assert(target.local.res.gold>=400);assert(target.local.res.wood>=40);
 const deliveredGold=target.local.res.gold,deliveredWood=target.local.res.wood;E.tick(saved,t);assert.equal(E.cityForKey(saved,city.key).local.res.gold,deliveredGold);assert.equal(E.cityForKey(saved,city.key).local.res.wood,deliveredWood);
 saved.cityTransports[0].remaining=.25;saved=E.parseSave(E.serializeSave(saved));E.switchCity(saved,city.id);E.tick(saved,saved.lastTick+1000);assert.equal(saved.cityTransports.length,0);assert.equal(E.cityForKey(saved,'3,4').local.army.human_1,3);assert.equal(saved.race,'elf');const reloaded=E.parseSave(E.serializeSave(saved));assert.equal(E.cityForKey(reloaded,'3,4').local.army.human_1,3);assert(E.strictSave(reloaded));
});
test('HG10 transport waits without cargo loss for destination warehouse capacity then resumes',()=>{
 const {s,city}=cityTransportFixture();city.local.res.gold=14950;E.startCityTransport(s,city.id,'human_1',1,{gold:100});s.cityTransports[0].remaining=.25;E.tick(s,s.lastTick+1000);assert.equal(s.cityTransports[0].phase,'holding');assert(E.cityForKey(s,city.key).local.res.gold>14950&&E.cityForKey(s,city.key).local.res.gold<15000);assert(E.strictSave(s));
 let saved=E.parseSave(E.serializeSave(s));E.switchCity(saved,city.id);saved.res.gold=E.limits(saved).gold-104;E.syncCityState(saved);E.tick(saved,saved.lastTick+1000);assert.equal(saved.cityTransports[0].phase,'return');assert(saved.res.gold>14989&&saved.res.gold<=15000);assert(E.strictSave(saved));
});
test('HG10 offline elapsed time completes convoy outbound and return in one tick without double delivery',()=>{
 const {s,city}=cityTransportFixture(),initialGold=s.res.gold,initialTroops=s.army.human_1;
 const trip=E.startCityTransport(s,city.id,'human_1',1,{gold:100,wood:20});
 const now=s.lastTick+Math.ceil((trip.total*2+60)/s.speed)*1000;
 E.tick(s,now);
 assert.equal(s.cityTransports.length,0,'both transport legs should finish during offline catch-up');
 assert.equal(s.army.human_1,initialTroops,'carriers should return within the same tick');
 const destination=E.cityForKey(s,city.key);
 assert(destination.local.res.gold>=100&&destination.local.res.wood>=20,'cargo delivered to destination');
 const receivedGold=destination.local.res.gold,receivedWood=destination.local.res.wood;
 E.tick(s,now);
 assert.equal(E.cityForKey(s,city.key).local.res.gold,receivedGold);
 assert.equal(E.cityForKey(s,city.key).local.res.wood,receivedWood);
 assert(s.res.gold>=initialGold-100,'origin only spends cargo, aside from normal production');
 const loaded=E.parseSave(E.serializeSave(s));
 assert.equal(loaded.cityTransports.length,0);
 assert.equal(loaded.army.human_1,initialTroops);
 assert(E.strictSave(loaded));
});
test('HG10 legacy v07 transport field migrates empty and malformed convoy saves are rejected',()=>{
 const legacy=state();delete legacy.cityTransports;const migrated=E.parseSave(JSON.stringify(legacy));assert.deepEqual(Array.from(migrated.cityTransports),[]);assert(E.strictSave(migrated));
 const {s,city}=cityTransportFixture();E.startCityTransport(s,city.id,'human_1',1,{gold:100});const raw=JSON.parse(E.serializeSave(s));raw.state.cityTransports[0].resources.gold=-1;assert.throws(()=>E.parseSave(JSON.stringify(raw)),/Save HG-10/);
});

function collisionFixture(){
 const s=state(),b=E.makeBattle(s,E.TILES.find(t=>t.kind==='npc').key);s.battle=b;
 const unit=(id,side,x,y,range=1)=>({id,side,unitId:side==='player'?'human_1':null,name:id,range,count:1,initial:1,hp:10000,atk:0,def:1,spd:4,pool:10000,x,y});
 b.allies=[unit('p0','player',1,1),unit('p1','player',2,1,20)];b.enemies=[unit('e0','enemy',5,1,20)];b.selected='p0';return {s,b,unit};
}
test('HG09 automatic advance routes around a living stack and continues after v07 reload',()=>{
 let {s,b}=collisionFixture();const before=b.enemies[0].pool;b.orders.p1='defend';E.battleAct(s,'advance');assert.deepEqual({x:b.allies[0].x,y:b.allies[0].y},{x:1,y:2});assert.equal(b.enemies[0].pool,before);
 s=E.parseSave(E.serializeSave(s));for(let i=0;i<5;i++){E.battleAct(s,'advance');const live=[...s.battle.allies,...s.battle.enemies].filter(u=>u.pool>0);assert.equal(new Set(live.map(u=>`${u.x},${u.y}`)).size,live.length)}
 const a=s.battle.allies[0],e=s.battle.enemies[0];assert.equal(Math.abs(a.x-e.x)+Math.abs(a.y-e.y),1);assert(E.strictSave(s));
});
test('HG09 enclosed advance and occupied retreat hold position without overlapping live troops',()=>{
 const {s,b,unit}=collisionFixture();b.allies=[unit('p0','player',0,0),unit('p1','player',1,0,20),unit('p2','player',0,1,20)];E.battleAct(s,'advance');assert.equal(b.allies[0].x,0);assert.equal(b.allies[0].y,0);
 b.allies=[unit('p0','player',2,1),unit('p1','player',1,1,20)];b.selected='p0';E.battleAct(s,'retreat');assert.equal(b.allies[0].x,2);assert.equal(b.orders.p0,'attack');assert(E.strictSave(s));
});

test('HG09 enemy melee detours around allies while dead stack cells remain traversable',()=>{
 const {s,b,unit}=collisionFixture();b.allies=[unit('p0','player',1,1,20)];b.enemies=[unit('e0','enemy',5,1),unit('e1','enemy',4,1,20)];b.selected='p0';E.battleAct(s,'defend');assert.deepEqual({x:b.enemies[0].x,y:b.enemies[0].y},{x:5,y:2});
 const f=collisionFixture();f.b.allies[1].pool=0;f.b.allies[1].count=0;E.battleAct(f.s,'advance');assert.equal(f.b.allies[0].x,2);assert.equal(f.b.allies[0].y,1);assert(E.strictSave(f.s));
});

function reportFixture(){
 const s=state();s.army.human_1=10;E.setFormation(s,[{unitId:'human_1',count:5},{unitId:'human_1',count:5}]);
 const b=E.makeBattle(s,E.NPC_CAMPS_2009.find(t=>t.stars===1).key);s.battle=b;
 for(const a of b.allies)Object.assign(a,{range:20,atk:0,hp:1,pool:5,spd:10});
 b.enemies=b.enemies.slice(0,1);Object.assign(b.enemies[0],{range:20,count:1,initial:1,hp:1000000,pool:1000000,atk:10000,spd:1});return {s,b};
}
test('HG09 persistent report aggregates duplicate stacks, actual wounded and capped rewards once',()=>{
 const {s,b}=reportFixture();s.res.gold=E.limits(s).gold;E.battleAct(s,'defend');assert.equal(s.battleReports.length,0);assert.equal(s.wounded.human_1,3);
 b.selected='p1';b.allies[1].atk=10000000;const out=E.battleAct(s,'attack'),r=s.battleReports[0];
 assert.equal(out.reportId,r.id);assert.equal(r.outcome,'win');assert.equal(r.allies.length,1);assert.equal(r.allies[0].initial,10);assert.equal(r.allies[0].survived,5);assert.equal(r.allies[0].lost,5);assert.equal(r.allies[0].wounded,3);assert.equal(r.resources.gold,0);assert(r.heroXp>0);assert.equal(r.fame,10);assert(E.strictSave(s));
 const saved=E.serializeSave(s),loaded=E.parseSave(saved);assert.equal(JSON.stringify(loaded.battleReports),JSON.stringify(s.battleReports));throws(()=>E.battleAct(s,'attack'),/Không có trận/);assert.equal(s.battleReports.length,1);
});
test('HG09 defeat and timeout reports retain truthful surviving armies and no victory rewards',()=>{
 for(const outcome of ['lose','timeout']){const {s,b}=reportFixture();if(outcome==='lose'){for(const a of b.allies)Object.assign(a,{pool:0,count:0});s.army.human_1=0}else b.turn=70;
 E.battleAct(s,'defend');const r=s.battleReports[0];assert.equal(r.outcome,outcome);assert.equal(r.fame,0);assert.equal(r.heroXp,0);assert(Object.values(r.resources).every(n=>n===0));assert(E.strictSave(s));}
});
test('HG09 legacy v07 reports migrate empty and unknown mid-battle wounded remain unknown',()=>{
 const {s,b}=reportFixture();delete s.battleReports;delete b.woundedByUnit;let loaded=E.parseSave(JSON.stringify(s));assert.equal(loaded.battleReports.length,0);loaded.battle.enemies[0].pool=1;loaded.battle.allies[0].atk=10000000;E.battleAct(loaded,'attack');assert.equal(loaded.battleReports[0].allies[0].wounded,null);assert(E.strictSave(loaded));
});
test('HG09 report history caps at thirty and rejects corrupt or duplicate saved receipts',()=>{
 const {s,b}=reportFixture();b.enemies[0].pool=1;b.allies[0].atk=10000000;E.battleAct(s,'attack');const r=s.battleReports[0];
 s.battleReports=Array.from({length:30},(_,i)=>({...JSON.parse(JSON.stringify(r)),id:`battle-${i+100}`}));s.serial=200;s.battle=E.makeBattle(s,E.NPC_CAMPS_2009.find(t=>t.stars===1).key);s.battle.enemies.forEach(e=>{e.pool=1});s.battle.allies.forEach(a=>{a.atk=10000000;a.range=20});for(let i=0;i<5&&s.battle;i++)E.battleAct(s,'attack');assert.equal(s.battleReports.length,30);assert.equal(s.battleReports[0].id,'battle-200');
 for(const corrupt of [x=>x.battleReports[0].allies[0].wounded=-1,x=>x.battleReports[0].resources.gold=-1,x=>x.battleReports[0].items=[{uid:1,itemId:'nonexistent',name:'Invalid'}],x=>x.battleReports[1].id=x.battleReports[0].id]){const bad=JSON.parse(JSON.stringify(s));corrupt(bad);assert.throws(()=>E.parseSave(JSON.stringify(bad)),/không hợp lệ/)}
});

test('HG09 expedition victory report keeps the originating hero and return snapshot after arrival',()=>{
 const s=state(),target=E.NPC_CAMPS_2009.find(t=>t.stars===1);E.startMarch(s,target.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
 s.battle.allies.forEach(a=>{a.atk=10000000;a.range=20});s.battle.enemies.forEach(e=>{e.pool=1});for(let i=0;i<10&&s.battle;i++)E.battleAct(s,'attack');
 const r=JSON.stringify(s.battleReports[0]);assert.equal(s.battleReports[0].heroId,1);assert.equal(s.battleReports[0].homeCityId,'main');assert.equal(s.battleReports[0].disposition,'returning');assert.equal(s.march.phase,'return');assert.equal(s.battleReports[0].items.length,1);assert(s.inventory.some(i=>i.uid===s.battleReports[0].items[0].uid));
 E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);assert.equal(s.march,null);assert.equal(JSON.stringify(s.battleReports[0]),r);assert.equal(E.parseSave(E.serializeSave(s)).battleReports.length,1);
 const corrupt=state();corrupt.battle=E.makeBattle(corrupt,target.key);corrupt.battle.woundedByUnit={human_1:999};assert.throws(()=>E.parseSave(JSON.stringify(corrupt)),/không hợp lệ/);
});

test('HG14.3 Human Archer addresses 48 unique animation cells, including draw/release split',()=>{
 const clips=P.ARCHER_CLIPS,names=['idle','walk','draw','release','hit','death'];
 assert.deepEqual(Object.keys(clips),names);
 assert.equal(names.reduce((n,k)=>n+clips[k].count,0),48);
 for(let row=0;row<names.length;row++){
  const action=names[row],frame=P.archerAtlasFrame(action,0,clips[action].ms);
  assert.equal(frame.action,action);assert.equal(frame.sx,0);
  assert.equal(frame.sy,row*256);assert.equal(frame.sw,256);assert.equal(frame.sh,256);
  assert.equal(P.archerAtlasFrame(action,clips[action].ms*.70,clips[action].ms).index,5);
  assert.equal(P.archerAtlasFrame(action,clips[action].ms*1.80,clips[action].ms).index,clips[action].loop?6:7);
 }
 assert.equal(P.archerAtlasFrame('attack',170,650).action,'draw');
 assert.equal(P.archerAtlasFrame('attack',580,650).action,'release');
 assert.equal(P.archerAtlasFrame('attack',580,650).imageId,'unit-human-archer-atlas');
 assert(P.hasAnimatedTroops({allies:[{unitId:'human_3'}],enemies:[]}));
});
test('HG14.5 canonical battle grid is 108 cells, exact at mobile and desktop sizes',()=>{
 const g=E.BATTLE_GRID;
 for(const dims of [{width:1176,height:550},{width:931,height:348},{width:1250,height:516}]){
  const cam=P.battleProjection(dims,E),cells=P.battleGridCells(cam);
  assert.equal(cells.length,108);
  for(const cell of cells){
   const point=P.battleCellAt(dims,cell.center.x,cell.center.y,E);
   assert.equal(point?.x,cell.x);assert.equal(point?.y,cell.y);
   assert.equal(cell.corners.length,4);
  }
  const s=state(),tile=E.NPC_CAMPS_2009.find(x=>x.stars===1);
  s.battle=E.makeBattle(s,tile.key);
  const lay=P.battleUnitLayout(s.battle,cam,dims.width,dims.height);
  for(const e of lay.filter(e=>e.u.pool>0)){
   const center=cam.point(e.u.x+.5,e.u.y+.5);
   assert(cells.some(c=>c.x===e.u.x&&c.y===e.u.y&&
     Math.hypot(c.center.x-center.x,c.center.y-center.y)<1e-9));
  }
 }
});
test('HG14.5 real combat receipts drive damage numbers, arrows and death marks only',()=>{
 const s=state('human'),npc=E.NPC_CAMPS_2009.find(n=>n.stars===1);
 s.army.human_3=16;E.setFormation(s,[{unitId:'human_3',count:16}]);
 s.battle=E.makeBattle(s,npc.key);const b=s.battle;
 assert.deepEqual(b.lastEvents||[],[]);
 const camera=P.battleProjection({width:1176,height:550},E);
 const initial=P.battleUnitLayout(b,camera,1176,550);
 assert.equal(P.battleFxPlan(b,camera,540,initial).length,0);
 const outcome=E.battleAct(s,'attack');
 assert.equal(outcome.type,'continue');assert(s.battle);
 const canonicalBefore=JSON.stringify(E.clone(s));
 const layout=P.battleUnitLayout(b,camera,1176,550);
 const effects=P.battleFxPlan(b,camera,600,layout);
 const hits=b.lastEvents.filter(e=>e.damage>0&&e.targetId);
 assert.equal(effects.length,hits.length);
 for(const effect of effects){
  const receipt=hits.find(r=>r.actorId===effect.actorId&&r.targetId===effect.targetId);
  assert(receipt);assert.equal(effect.damage,receipt.damage);
  assert.equal(effect.casualties,receipt.casualties);
  assert.equal(effect.death,receipt.death);
  assert(Number.isFinite(effect.start.x)&&Number.isFinite(effect.end.y));
 }
 assert(effects.some(e=>e.ranged),'actual archer fires a projectile');
 assert(effects.some(e=>e.death),'actual first encounter kills an enemy stack');
 assert.equal(P.battleFxPlan(b,camera,1200,layout).length,0,'effect TTL expires');
 assert.equal(JSON.stringify(E.clone(s)),canonicalBefore,'presentation never mutates game');
});
test('HG14.4 responsive troop scale improves 960x540 readability',()=>{
 const desktop=P.battleSpriteScale(516,2,9),mobile=P.battleSpriteScale(347,2,9);
 assert(desktop>=.95&&desktop<=1.18);
 assert(mobile>=.82&&mobile<=.98);
 assert(P.battleSpriteScale(320,0,9)>.82,'compact 960x540 battlefield sprites stay above the browser acceptance floor');
 assert(mobile<desktop);
 assert(P.battleSpriteScale(347,8,9)>P.battleSpriteScale(347,0,9));
 for(const h of [347,516,600]){
  const k=P.battleSpriteScale(h,2,9);
  assert(k>.78&&k<1.5);
 }
});
test('HG14.4 desktop/mobile nameplates avoid sprites, overlays and each other',()=>{
 for(const [w,h] of [[931,348],[1250,516],[1176,550]]){
  const s=state('human'),npc=E.NPC_CAMPS_2009.find(n=>n.stars===1);
  s.battle=E.makeBattle(s,npc.key);
  const camera=P.battleProjection({width:w,height:h},E),
   layout=P.battleUnitLayout(s.battle,camera,w,h);
  assert.equal(layout.length,3);
  for(const e of layout){
   const r=e.label;
   assert(r.x>=11&&r.y>=60&&r.x+r.w<=w-11&&r.y+r.h<=h-5);
   assert(!P.battleRectOverlap(r,e.sprite,2),'own sprite '+e.id);
   for(const other of layout)if(other!==e)
    assert(!P.battleRectOverlap(r,other.sprite,1),'other troop covered '+e.id);
   assert.equal(P.battleHit({width:w,height:h},e.x,e.y,E,s)?.id,e.id);
  }
  for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++)
   assert(!P.battleRectOverlap(layout[i].label,layout[j].label,2),'nameplates overlap');
  const enemies=layout.filter(e=>e.u.side==='enemy').sort((a,b)=>a.y-b.y);
  assert(enemies[1].x-enemies[0].x>75,'neighboring enemies have spaced silhouettes');
  assert(E.strictSave(s),'layout must preserve canonical v07 state');
 }
});
test('HG14.2 continuous meadow battle projection keeps both armies in readable left-right lanes',()=>{
 const g=E.BATTLE_GRID;
 const painterSource=fs.readFileSync(path.join(dir,'painter.js'),'utf8');
 assert(!painterSource.includes('poly(c,outline'),'raised isometric board must not return');
 assert(painterSource.includes('battleGridOverlay(c,camera,units,reachable)'),'tactical grid can be displayed on actual battle cells');
 for(const dims of [{width:1176,height:550},{width:960,height:350},{width:1280,height:520}]){
  const p=P.battleProjection(dims,E);
  assert(p.col.x>p.row.x*10,'horizontal battlefield axis should dominate');
  assert(p.row.y>p.col.y*12,'vertical lane spacing should dominate');
  assert(Math.abs(p.col.y/p.col.x)<.09,'natural ground is nearly horizontal');
  assert(p.point(0,0).x>0&&p.point(g.cols,g.rows).x<dims.width,'all logical cells fit width');
  assert(p.point(0,0).y>dims.height*.3&&p.point(g.cols,g.rows).y<dims.height*.98,'field starts below treeline');
  for(let x=0;x<g.cols;x++)for(let y=0;y<g.rows;y++){
   const m=p.point(x+.5,y+.5),actual=P.battleCellAt(dims,m.x,m.y,E);
   assert.equal(actual.x,x);assert.equal(actual.y,y);
  }
  const ally=p.point(1.5,.5),foe=p.point(10.5,2.5);
  assert(foe.x-ally.x>dims.width*.6,'opposing armies are separated across the ground');
  assert(ally.x>dims.width*.13&&foe.x<dims.width*.9,'troops have edge clearance');
  assert(ally.y>dims.height*.36&&foe.y<dims.height*.7);
 }
});
test('HG14 four-race PNG sprite masters have deterministic Idle/Walk/Attack/Hit/Death transforms',()=>{
 const expected={
  human_3:'unit-human-archer',elf_1:'unit-elf-centaur',
  elf_2:'unit-elf-scout',orc_1:'unit-orc-imp',undead_1:'unit-undead-skeleton'
 };
 assert.equal(Object.keys(P.MOTION_SPRITES).length,5);
 for(const [unit,id] of Object.entries(expected)){assert.equal(P.MOTION_SPRITES[unit].id,id);
  assert(P.MOTION_SPRITES[unit].pivot>0&&P.MOTION_SPRITES[unit].pivot<1);
  assert(P.hasAnimatedTroops({allies:[{unitId:unit}],enemies:[]}));
 }
 const idle=P.motionPose('idle',0),idleMoving=P.motionPose('idle',230);
 const walking=P.motionPose('walk',180,450),attacking=P.motionPose('attack',310,650);
 const damaged=P.motionPose('hit',120,650),fallen=P.motionPose('death',850,1200);
 assert.notEqual(idle.dy,idleMoving.dy);
 assert(walking.dy<0,'walk moves the sprite vertically');
 assert(attacking.dx>2&&attacking.angle>0,'attack lunges toward opponent');
 assert(damaged.flash>0,'hit displays impact response');
 assert(fallen.angle<-.8&&fallen.alpha<1,'death rotates and fades');
 assert(P.motionPose('idle',230).dy===idleMoving.dy,'deterministic');
 assert(P.hasAnimatedTroops({allies:[{unitId:'human_4'}],enemies:[]}));
 assert(!P.hasAnimatedTroops({allies:[{unitId:'human_1'}],enemies:[]}));
});
test('HG14 battle renderer uses the real illustrated four-faction PNGs and never mutates combat Save',()=>{
 const srcs=Object.values(P.MOTION_SPRITES),read=[],originalDocument=ctx.document;
 ctx.document={getElementById(id){read.push(id);return {id,complete:true,naturalWidth:512,naturalHeight:512}}};
 try{
  const context={globalAlpha:1,save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},ellipse(){},stroke(){} ,
   drawImage(image){read.push('DRAW:'+image.id)}};
  for(const [unit,profile] of Object.entries(P.MOTION_SPRITES)){
   const visual={action:'idle',time:280,x:2,y:2,alpha:1};
   assert(P.motionSprite(context,100,200,unit,false,visual,1.05),unit+' missing image draw');
   assert(read.includes('DRAW:'+profile.id),unit+' did not draw the intended existing sprite');
  }
 }finally{if(originalDocument===undefined)delete ctx.document;else ctx.document=originalDocument}
 const s=state('orc'),camp=E.NPC_CAMPS_2009.find(c=>c.stars===1);
 s.battle=E.makeBattle(s,camp.key);const unit=s.battle.allies.find(u=>u.unitId==='orc_1');
 assert(unit);const before=JSON.stringify(E.clone(s));
 const c={width:1176,height:550,getContext(){return new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:()=>({width:40})},
 {get(o,k){if(k in o)return o[k];if(typeof k==='symbol')return undefined;return()=>{}},set(o,k,v){o[k]=v;return true}})}};
 P.drawBattle(c,E,s,500);P.drawBattle(c,E,s,800);
 assert.equal(JSON.stringify(E.clone(s)),before,'rendering is visual only and saves must not change');
});
test('HG11 KayKit Heavy Soldier keeps 57 distinct licensed rig-rendered frames and embedded action atlases',()=>{
 const base=path.join(dir,'assets/licensed/kaykit-heavy-soldier'),source=JSON.parse(fs.readFileSync(path.join(base,'source-manifest.json'),'utf8')),meta=JSON.parse(fs.readFileSync(path.join(base,'rendered/animation-metadata.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(source.author,'Kay Lousberg');assert.equal(source.license,'CC0-1.0');assert.equal(source.sourceCommit,'672074b73ba276876a19e8816ecdc5241817ab47');assert(source.animations.some(a=>a.name==='1H_Melee_Attack_Chop'));assert(source.animations.some(a=>a.name==='Death_A'));
 const runtimePaths=[];let frames=0;for(const [action,count] of [['idle',13],['walk',13],['attack',13],['hit',8],['death',10]]){const clip=meta.actions.find(a=>a.name===action);assert(clip,action);assert.equal(clip.frameCount,count);assert(clip.fps>=11.2&&clip.fps<12.7);assert.equal(clip.cell,256);assert.deepEqual(clip.pivot,[148,216]);const hashes=new Set();for(const frame of clip.frames){const b=fs.readFileSync(path.join(dir,frame.file.path));assert.equal(sha(b),frame.file.sha256,frame.file.path);assert.equal(b.readUInt32BE(16),256);assert.equal(b.readUInt32BE(20),256);assert(frame.alphaPixels>0);assert(frame.bounds[0]>=0&&frame.bounds[1]>=0&&frame.bounds[2]<256&&frame.bounds[3]<256);hashes.add(frame.file.sha256);frames++}assert.equal(hashes.size,count,`${action} has duplicate stills`);const atlasPath=path.join(base,`rendered/${action}.png`),atlas=fs.readFileSync(atlasPath);assert.equal(atlas.readUInt32BE(16),2048);assert.equal(atlas.readUInt32BE(20),count<=8?256:512);runtimePaths.push({path:`assets/licensed/kaykit-heavy-soldier/rendered/${action}.png`,bytes:atlas.length,sha256:sha(atlas)})}
 assert.equal(frames,57);const html=fs.readFileSync(path.join(dir,'Play-Heoofgaia-HG11.html'),'utf8');for(const file of hg28OfflineAssets){const b=fs.readFileSync(file);assert(html.includes('data:image/png;base64,'+b.toString('base64')),file)}for(const asset of runtimePaths){const b=fs.readFileSync(path.join(dir,asset.path));assert(html.includes(`src=\"data:image/png;base64,${b.toString('base64')}\"`),asset.path)}assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,18+JSON.parse(fs.readFileSync(path.join(dir,'assets/licensed/spritecook/asset-manifest.json'),'utf8')).files.length+JSON.parse(fs.readFileSync(path.join(dir,'assets/licensed/dcss-cc0/unit-manifest.json'),'utf8')).units.length+JSON.parse(fs.readFileSync(path.join(dir,'assets/hg193-unit-manifest.json'),'utf8')).units.length+JSON.parse(fs.readFileSync(path.join(dir,'assets/licensed/hg22-skeleton/asset-manifest.json'),'utf8')).actions.length+hg28OfflineAssets.length,'HG14.3 plus HG19.1 verified CC0 animation sheets and HG28 offline world and troop art');
});

test('HG11 Heavy Soldier manifest ties CC0 sources, battle Save/Reload and actual Chrome screenshots to the standalone build',()=>{
 const base=path.join(dir,'assets/licensed/kaykit-heavy-soldier'),manifest=JSON.parse(fs.readFileSync(path.join(base,'asset-manifest.json'),'utf8'));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
 assert.equal(manifest.status,'RECREATED');assert.equal(manifest.target.unitId,'human_4');assert.equal(manifest.source.license,'CC0-1.0');assert.equal(manifest.source.commit,'672074b73ba276876a19e8816ecdc5241817ab47');
 assert.equal(manifest.source.sourceFiles.length,7);for(const row of manifest.source.sourceFiles){const b=fs.readFileSync(path.join(dir,row.path));assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256);assert.equal(row.verified,true)}
 assert.equal(manifest.animation.distinctFrameCount,57);assert.deepEqual(manifest.animation.actions.map(a=>[a.name,a.sourceClip,a.frameCount]),[['idle','Idle',13],['walk','Walking_A',13],['attack','1H_Melee_Attack_Chop',13],['hit','Hit_A',8],['death','Death_A',10]]);
 for(const action of manifest.animation.actions){const atlas=fs.readFileSync(path.join(dir,action.atlas.projectPath));assert.equal(sha(atlas),action.atlas.sha256);assert.equal(`${atlas.readUInt32BE(16)}x${atlas.readUInt32BE(20)}`,action.atlas.resolution);assert.equal(new Set(action.frames.map(x=>x.sha256)).size,action.frameCount)}
 const browser=manifest.integration.focusedBrowserQa;assert.equal(browser.total,20);assert.equal(browser.passed,20);assert.equal(browser.failed,0);assert.deepEqual(browser.errors,[]);assert.equal(browser.result,'PASS');assert(browser.fixtureDisclosure.toLowerCase().includes('enemy-only'));
 const receipt=JSON.parse(fs.readFileSync(path.join(dir,browser.projectPath),'utf8'));assert(receipt.checks.some(c=>c.name.startsWith('v07 Save/Reload preserves the actual death result')&&c.passed));assert.equal(receipt.deathReceipt.strict,true);
 for(const screen of manifest.integration.screenshots){const b=fs.readFileSync(path.join(dir,screen.projectPath));assert.equal(sha(b),screen.sha256);assert.equal(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`,screen.resolution)}
 // The Heavy Soldier manifest records the immutable ORIGINAL acceptance-build receipt.
 // New gameplay/UI builds legitimately change the HTML hash; CI verifies their
 // SHA and reproducibility separately rather than mutating historical provenance.
 const standalone=manifest.integration.standaloneHtml,bundle=fs.readFileSync(path.join(dir,standalone.projectPath));
 assert.match(standalone.sha256,/^[0-9A-F]{64}$/);assert(standalone.bytes>10_000_000);
 assert(bundle.length>10_000_000);assert.match(sha(bundle),/^[0-9A-F]{64}$/);
 assert.equal(standalone.embeddedRuntimePngCount,17);assert.equal(standalone.allFiveAtlasesEmbedded,true);
 assert.equal((bundle.toString('utf8').match(/data:image\/png;base64,/g)||[]).length,18+JSON.parse(fs.readFileSync(path.join(dir,'assets/licensed/spritecook/asset-manifest.json'),'utf8')).files.length+JSON.parse(fs.readFileSync(path.join(dir,'assets/licensed/dcss-cc0/unit-manifest.json'),'utf8')).units.length+JSON.parse(fs.readFileSync(path.join(dir,'assets/hg193-unit-manifest.json'),'utf8')).units.length+JSON.parse(fs.readFileSync(path.join(dir,'assets/licensed/hg22-skeleton/asset-manifest.json'),'utf8')).actions.length+hg28OfflineAssets.length,'HG11 originals plus verified animation sheets and HG28 offline world and troop art');
 const standaloneHtml=bundle.toString('utf8');for(const file of hg28OfflineAssets){const b=fs.readFileSync(file);assert(standaloneHtml.includes('data:image/png;base64,'+b.toString('base64')),file)}const field=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/battlefield/asset-manifest.json'),'utf8')),fieldBytes=fs.readFileSync(path.join(dir,field.runtime.projectPath));assert.equal(field.status,'RECREATED');assert.equal(field.runtime.resolution,'1176x550');assert.equal(sha(fieldBytes),field.runtime.sha256);assert.equal(field.runtime.pngColorType,2);assert.equal(field.integration.focusedBrowserPass,true);assert.equal(field.integration.offlineEmbedded,true);assert.equal(field.integration.screenshot.sha256,manifest.integration.screenshots[0].sha256);
 assert(bundle.toString('utf8').includes(`src="data:image/png;base64,${fieldBytes.toString('base64')}"`));
 const parent=JSON.parse(fs.readFileSync(path.join(dir,'assets/generated/hg11/asset-manifest.json'),'utf8'));assert.equal(parent.animatedTroopAssets[0].unitId,'human_4');assert.match(parent.integration.animatedTroopAssets,/^PASS:/);assert.equal(parent.battlefieldAssets[0].assetId,field.assetId);assert.match(parent.integration.battlefieldBackground,/^PASS:/);
});

test('HG11 animated atlas timeline selects looping idle/walk and clamps one-shot actions',()=>{
 const first=P.animationFrame('idle',0),next=P.animationFrame('idle',90),wrap=P.animationFrame('walk',1_200),attackEnd=P.animationFrame('attack',10_000),deathEnd=P.animationFrame('death',10_000);
 assert.equal(first.frame,0);assert.equal(next.frame,1);assert.equal(wrap.frame,1);assert.deepEqual([next.sx,next.sy,next.sw,next.sh],[256,0,256,256]);assert.deepEqual([P.animationFrame('idle',700).frame,P.animationFrame('idle',1_500).frame],[8,5]);assert.equal(attackEnd.frame,12);assert.deepEqual([attackEnd.sx,attackEnd.sy],[1024,256]);const hitEnd=P.animationFrame('hit',10_000);assert.equal(hitEnd.frame,7);assert.deepEqual([hitEnd.sx,hitEnd.sy],[1792,0]);assert.equal(deathEnd.frame,9);assert.deepEqual([deathEnd.sx,deathEnd.sy],[256,256]);assert.equal(P.animationFrame('unsupported',0).action,'idle');
});

test('HG11 battle animation reads actual move, attack, hit and death receipts without mutating battle state',()=>{
 const b={turn:4,allies:[],enemies:[],lastEvents:[{actorId:'p0',from:{x:1,y:1},to:{x:3,y:1},path:[{x:2,y:1},{x:3,y:1}],targetId:'h0',damage:30,death:false},{actorId:'e0',from:{x:4,y:1},to:{x:4,y:1},path:[],targetId:'p0',damage:25,death:false},{actorId:'p1',from:{x:2,y:2},to:{x:2,y:2},path:[],targetId:'e1',damage:50,death:true}]};
 const moved={id:'p0',pool:100,unitId:'human_4',x:3,y:1},hit={id:'h0',pool:75,unitId:'human_4',x:4,y:1},dead={id:'e1',pool:0,unitId:'human_4',x:5,y:2},before=JSON.stringify(b);
 assert.equal(P.battleVisualState(b,moved,225).action,'walk');assert.equal(P.battleVisualState(b,moved,225).x,2);assert.equal(P.battleVisualState(b,moved,460).action,'attack');assert.equal(P.battleVisualState(b,hit,200).action,'hit');assert.equal(P.battleVisualState(b,dead,300).action,'death');assert.equal(P.battleVisualState(b,dead,1_200),null);assert.equal(JSON.stringify(b),before);
});

test('HG11 real battle action receipts and legacy eventless v07 saves validate strictly',()=>{
 const s=state(),tile=E.TILES.find(t=>t.kind==='npc'),b=E.makeBattle(s,tile.key);s.battle=b;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_4',name:'Heavy Soldier',range:1,count:1,initial:1,hp:1000,atk:20,def:10,spd:10,pool:1000,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Wall',range:20,count:1,initial:1,hp:100000,atk:0,def:0,spd:1,pool:100000,x:6,y:1}];b.selected='p0';b.orders={};b.moveTargets={};const out=E.battleAct(s,'move',{x:4,y:1}),event=s.battle.lastEvents.find(e=>e.actorId==='p0');assert.equal(out.type,'continue');assert(event.path.length>0);assert.deepEqual({x:event.path[0].x,y:event.path[0].y},{x:2,y:1});assert.deepEqual({x:event.to.x,y:event.to.y},{x:3,y:1});assert.equal(event.path.length,2);assert.equal(event.order,'move');assert.equal(event.casualties,0);assert(E.strictSave(s));const saved=E.parseSave(E.serializeSave(s));assert.deepEqual(JSON.parse(JSON.stringify(saved.battle.lastEvents)),JSON.parse(JSON.stringify(s.battle.lastEvents)));
 const oldEventShape=JSON.parse(JSON.stringify(saved));for(const e of oldEventShape.battle.lastEvents){delete e.order;delete e.casualties}assert(E.strictSave(oldEventShape));assert(E.strictSave(E.parseSave(JSON.stringify(oldEventShape))));const legacy=JSON.parse(JSON.stringify(saved));delete legacy.battle.lastEvents;assert.equal(E.strictSave(legacy),true);assert(E.strictSave(E.parseSave(JSON.stringify(legacy))));const corrupt=JSON.parse(JSON.stringify(saved));corrupt.battle.lastEvents.find(e=>e.actorId==='p0').path=[{x:10,y:8}];assert.throws(()=>E.parseSave(JSON.stringify(corrupt)),/không hợp lệ/);const corruptOrder=JSON.parse(JSON.stringify(saved));corruptOrder.battle.lastEvents[0].order='invented';assert.throws(()=>E.parseSave(JSON.stringify(corruptOrder)),/không hợp lệ/);const corruptLoss=JSON.parse(JSON.stringify(saved));corruptLoss.battle.lastEvents[0].casualties=-1;assert.throws(()=>E.parseSave(JSON.stringify(corruptLoss)),/không hợp lệ/);
});

test('HG11 lethal battle event records actual dealt damage and death before the v07 receipt',()=>{
 const s=state(),tile=E.TILES.find(t=>t.kind==='npc');s.battle=E.makeBattle(s,tile.key);const b=s.battle;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_4',name:'Heavy Soldier',range:20,count:1,initial:1,hp:1000,atk:10000,def:10,spd:100,pool:1000,x:1,y:1}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'First guard',range:1,count:1,initial:1,hp:1,atk:0,def:0,spd:1,pool:1,x:2,y:1},{id:'e1',side:'enemy',unitId:null,name:'Second guard',range:1,count:1,initial:1,hp:1000,atk:0,def:0,spd:1,pool:1000,x:3,y:1}];b.selected='p0';b.orders={};const out=E.battleAct(s,'attack'),event=s.battle.lastEvents.find(e=>e.actorId==='p0');assert.equal(out.type,'continue');assert.equal(event.targetId,'e0');assert.equal(event.damage,1);assert.equal(event.order,'attack');assert.equal(event.casualties,1);assert.equal(event.death,true);assert.equal(s.battle.enemies[0].pool,0);assert(E.strictSave(E.parseSave(E.serializeSave(s))));
});

test('HG09 all six player battle commands write explicit v07 action receipts',()=>{
 const run=(action)=>{const s=state(),tile=E.TILES.find(t=>t.kind==='npc'),b=E.makeBattle(s,tile.key);s.battle=b;b.allies=[{id:'p0',slot:0,side:'player',unitId:'human_1',name:'Spear Militia',range:1,count:2,initial:2,hp:100,atk:10,def:5,spd:100,pool:200,x:4,y:3}];b.enemies=[{id:'e0',side:'enemy',unitId:null,name:'Guard',range:1,count:2,initial:2,hp:100,atk:0,def:5,spd:1,pool:200,x:10,y:3}];b.selected='p0';b.orders={};b.focused=action==='focus'?'e0':null;E.battleAct(s,action,action==='move'?{x:1,y:4}:undefined);const event=b.lastEvents.find(e=>e.actorId==='p0');assert.equal(event.order,action,`${action} receipt`);assert(Number.isSafeInteger(event.casualties)&&event.casualties>=0);try{assert(E.strictSave(E.parseSave(E.serializeSave(s))))}catch(e){throw new Error(`${action} receipt reload: ${e.message}`)}return event};
 for(const action of ['attack','advance','defend','focus','retreat','move'])run(action);
});

test('HG12 browser Save rejects invalid v07 without overwriting prior data and restores a valid backup',()=>{
 const src=fs.readFileSync(path.join(dir,'app.js'),'utf8'),start=src.indexOf('function save(){'),end=src.indexOf('function money(cost)',start);
 assert(start>=0&&end>start,'actual browser Save/Load source is present');
 const handlers=vm.runInNewContext('(function(E,localStorage,state,toast,ensureBattleAutoTimer){'+src.slice(start,end)+';return {save,load,setState:s=>state=s};})',{console:{warn(){}}});
 const data=new Map(),alerts=[];let failPrimary=false;
 const storage={getItem:key=>data.get(key)||null,setItem:(key,val)=>{if(failPrimary&&key===E.SAVE_KEY)throw Error('quota');data.set(key,val)},removeItem:key=>data.delete(key)};
 const s=state(),api=handlers(E,storage,s,message=>alerts.push(message),x=>x);
 assert.equal(api.save(),true);const first=data.get(E.SAVE_KEY);assert(first);
 s.army.human_1=-9;assert.equal(api.save(),false);assert.equal(data.get(E.SAVE_KEY),first,'invalid save never replaces good data');
 s.army.human_1=16;s.fame+=5;assert.equal(api.save(),true);assert.equal(data.get(E.SAVE_KEY+'_backup'),first);
 data.set(E.SAVE_KEY,'{broken');const recovered=api.load();assert(recovered);assert.equal(recovered.fame,s.fame-5);assert.notEqual(data.get(E.SAVE_KEY),'{broken');assert(E.strictSave(recovered));
 const second=data.get(E.SAVE_KEY);failPrimary=true;s.fame+=10;assert.equal(api.save(),false);assert.equal(data.get(E.SAVE_KEY),second,'storage failure never discards last valid save');
 assert(src.includes("localStorage.removeItem(E.SAVE_KEY+'_backup')"),'reset clears the emergency backup');
 assert(alerts.some(m=>/khôi phục bản lưu dự phòng/.test(m)),'UI notifies recovery');
});
const hg10=results.filter(x=>/^HG10 /.test(x.name));
const hg09=results.filter(x=>/^(Advance order|Arena rehabilitation|Undead Reincarnation|Arena healing|HG07 v07 saves without the newer Arena|Equal-speed combat|Ranged stacks fire|Ranged auto-target|automatic melee selects|Published NPC battle example|Casualty and Arena|A completed NPC|Mid-battle HG08|1000 seeded tactical|SRC45\/SRC46\/SRC47|SRC46|HG09 all six player battle commands)/.test(x.name));
const evidence=path.join(dir,'docs','evidence','hg09');fs.mkdirSync(evidence,{recursive:true});
fs.writeFileSync(path.join(evidence,'QA-HG09-NODE-RESULTS.json'),JSON.stringify({command:'node qa-engine.cjs',suiteTotal:pass+failed,suitePassed:pass,suiteFailed:failed,hg10Total:hg10.length,hg10Passed:hg10.filter(x=>x.passed).length,hg10Failed:hg10.filter(x=>!x.passed).length,hg10Checks:hg10,hg09Total:hg09.length,hg09Passed:hg09.filter(x=>x.passed).length,hg09Failed:hg09.filter(x=>!x.passed).length,seededEncounters:1000,checks:hg09},null,2),'utf8');
console.log(`TOTAL ${pass}/${pass+failed} PASS`);process.exitCode=failed?1:0;
