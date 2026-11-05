/* HG21: real six-stack tactical tower; each of <=3 heroes owns <=2 slots.
 * Uses HG09 canonical battle turns and per-stack Hero stats/gear, with isolated
 * tower casualties. World expeditions, old HG18 rewards, and Save version v07
 * remain unchanged. No remote/network or random resource grants.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg20TowerClimb||!E.battleActCore)throw Error('HG21 needs HG20 and core tactical battle');
const old={choose:E.hg20ChooseTowerTeam,strict:E.strictSave,make:E.make,
 parse:E.parseSave,serialize:E.serializeSave,battleAct:E.battleAct};
const OWNED_SLOTS=2,MAX_HEROES=3;
const day=ms=>new Date(ms).toISOString().slice(0,10);
const validIndex=x=>Number.isSafeInteger(x)&&x>=0&&x<7;
function ensure(s){
 E.hg20Ensure(s);
 const t=s.hg20.tower;
 if(!Array.isArray(t.picks))t.picks=[];
 if(t.picks.length===0&&t.team.length){
  t.picks=t.team.map(id=>({heroId:id,slots:E.hg20HeroPlan(s,id).slice(0,OWNED_SLOTS).map((_,i)=>i)}));
 }
 return s;
}
function picks(s){
 ensure(s);
 return s.hg20.tower.picks.map(p=>({heroId:p.heroId,slots:p.slots.slice()}));
}
function validatePicks(s,rows,strictReady=true){
 if(!Array.isArray(rows)||rows.length<1||rows.length>MAX_HEROES)throw Error('Bí Cảnh cần 1–3 tướng');
 const visited=new Set();
 for(const entry of rows){
  if(!entry||!Number.isSafeInteger(entry.heroId)||visited.has(entry.heroId))throw Error('Một tướng chỉ được vào đội một lần');
  visited.add(entry.heroId);
  if(strictReady&&E.hg20HeroRole(s,entry.heroId).status!=='home')throw Error('Tướng đang bận, không thể vào Bí Cảnh');
  const plan=E.hg20HeroPlan(s,entry.heroId);
  if(!Array.isArray(entry.slots)||strictReady&&entry.slots.length<1||entry.slots.length>OWNED_SLOTS||
    new Set(entry.slots).size!==entry.slots.length||entry.slots.some(i=>!validIndex(i)||!plan[i]))
   throw Error('Mỗi tướng chỉ được chọn tối đa hai slot đã có quân');
 }
 return rows;
}
function choose(s,ids){
 ensure(s);const chosen=old.choose(s,ids);
 const previous=new Map(s.hg20.tower.picks.map(q=>[q.heroId,q.slots]));
 const rows=chosen.map(id=>{
  const formation=E.hg20HeroPlan(s,id),slots=previous.get(id)?.filter(i=>formation[i])||[];
  return {heroId:id,slots:slots.length?slots.slice(0,2):formation.slice(0,2).map((_,i)=>i)};
 });
 s.hg20.tower.picks=rows;
 return chosen;
}
function setPicks(s,rows){
 ensure(s);validatePicks(s,rows);
 const ids=rows.map(x=>x.heroId);
 old.choose(s,ids);
 s.hg20.tower.picks=rows.map(x=>({heroId:x.heroId,slots:x.slots.slice()}));
 return picks(s);
}
function tile(){return E.TILES.find(t=>t.kind==='npc'&&t.level===1&&!t.privateBoss)}
function gameBattle(s){
 ensure(s);
 const t=s.hg20.tower,roster=picks(s),enlisted=[];
 validatePicks(s,roster);
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length)throw Error('Hãy kết thúc hành quân hoặc giao tranh trước khi vào Tháp');
 if(s.stationedHeroes?.some(x=>roster.some(r=>r.heroId===x.heroId)))throw Error('Tướng đang đồn trú không thể tham chiến');
 const reserved={};let n=0;
 const positions=[{x:1,y:0},{x:3,y:1},{x:1,y:3},{x:3,y:4},{x:1,y:6},{x:3,y:7}];
 for(const r of roster){
  const hero=s.heroes.find(h=>h.id===r.heroId);
  const formation=E.hg20HeroPlan(s,r.heroId);
  for(const slot of r.slots){
   const g=formation[slot],unit=E.getUnit(s,g.unitId);
   if(!unit||g.count<=0)throw Error('Đội hình Bí Cảnh không hợp lệ');
   reserved[g.unitId]=(reserved[g.unitId]||0)+g.count;
   if(reserved[g.unitId]>(s.army[g.unitId]||0))throw Error('Không đủ quân thật để ghép đội Bí Cảnh');
   const pos=positions[n],stats=E.heroStats(s,hero.id);
   // Essence upgrade improves the tower projection only, never the real
   // garrison. Hero buffs remain strictly keyed by this stack's heroId.
   const blessing=1+t.rank*.18;
   const hp=Math.min(1e9,Math.max(1,Math.round(unit.hp*blessing)));
   const atk=Math.min(1e9,Math.max(1,Math.round(unit.atk*blessing)));
   const def=Math.min(1e9,Math.max(0,Math.round(unit.def*blessing)));
   enlisted.push({id:'p'+n,side:'player',unitId:unit.id,name:unit.name,
    heroId:hero.id,heroName:hero.name,slot:n,sourceSlot:slot,range:E.unitTacticalRange(unit),
    hp,atk,def,spd:Math.max(.1,unit.spd+E.heroSpeedAdjustment(stats.spd)),
    count:g.count,initial:g.count,pool:g.count*hp,x:pos.x,y:pos.y});
   n++;
  }
 }
 if(enlisted.length<1||enlisted.length>6)throw Error('Bí Cảnh giới hạn sáu stack từ tối đa ba tướng');
 const floor=t.floor,models=['U Minh Quỷ Vương','Viễn Cổ Long Hoàng','Tinh Không Đại Ma','Huyết Nguyệt Ma Thần'];
 const index=Math.floor((floor-1)/10)%4;
 const opponents=Math.min(5,2+Math.floor((floor-1)/15));
 const enemies=Array.from({length:opponents},(_,i)=>{
  const hp=Math.min(1000000,Math.round(30+floor*3.8)),atk=Math.min(1000000,Math.round(8+floor*1.15));
  const def=Math.min(1000000,Math.round(5+floor*.9));
  const count=Math.min(10000000,Math.ceil(2+floor*.65+(i===0?floor*.25:0)));
  const range=(index===2||i===opponents-1)?E.TACTICAL_RANGE.ranged:1;
  return {id:'e'+i,side:'enemy',unitId:null,name:models[index]+' · Ảo ảnh '+(i+1),
   count,initial:count,hp,atk,def,spd:Math.min(15,4+floor*.035+i*.1),pool:count*hp,
   range,x:10,y:Math.floor(8*(i+1)/(opponents+1))};
 });
 const tTile=tile();if(!tTile)throw Error('Không có tọa độ nền an toàn cho trận Bí Cảnh');
 s.battle={target:tTile.key,kind:'tower',name:'Bí Cảnh Tầng '+floor,level:Math.min(1000000,floor),
  turn:1,order:'attack',orders:{},focused:null,selected:enlisted[0].id,
  autoUntil:Date.now()+10000,allies:enlisted,enemies,
  woundedByUnit:{},history:['Bí Cảnh: mỗi tướng sở hữu tối đa hai stack; không tiêu hao quân thật.'],
  hg21Tower:{floor,team:roster.map(r=>r.heroId),picks:roster},
  heroCastTurn:{},heroSpellCooldown:{},heroEffects:[],heroMovementInstinct:{}};
 s.battleAuto=false;s.battleOrder='attack';
 E.note(s,'Bí Cảnh tầng '+floor+': '+roster.length+' tướng / '+enlisted.length+' stack bước vào trận.');
 return {type:'battle',floor,heroes:roster.length,stacks:enlisted.length,enemies:enemies.length};
}
function clearEffects(s,b){
 for(const effect of b.heroEffects||[]){
  if(effect.expiry>b.turn)continue;
  for(const x of effect.targets){
   const u=[...b.allies,...b.enemies].find(z=>z.id===x.id);
   if(u&&x.stat==='hp'){
    const percentage=x.currentHp?u.hp/x.currentHp:1;
    u.hp=x.old;u.pool=Math.max(0,Math.min(u.pool/Math.max(.0001,percentage),u.initial*u.hp));
    u.count=Math.ceil(u.pool/u.hp);
   }else if(u)u[x.stat]=x.old;
  }
 }
 b.heroEffects=(b.heroEffects||[]).filter(x=>x.expiry>b.turn);
 for(const [id,data]of Object.entries(b.heroMovementInstinct||{}))
  if(data.expiry<=b.turn)delete b.heroMovementInstinct[id];
}
function towerCast(s,heroId,spellId){
 const b=s.battle;if(!b?.hg21Tower&&!b?.hg261Joint)throw Error('Chỉ được dùng phép của đội tướng trong Bí Cảnh hoặc săn Boss chung');
 if(!(b.hg21Tower||b.hg261Joint).team.includes(heroId))throw Error('Tướng không thuộc đội chiến đấu');
 const hero=s.heroes.find(h=>h.id===heroId),spec=E.spell(s,spellId),level=s.heroMagic?.[spellId]||0;
 if(!hero?.equippedSpells?.includes(spellId)||!spec||level<1||spec.kind==='castellan')
  throw Error('Phép chưa trang bị hoặc chưa nghiên cứu cho tướng này');
 if(b.heroCastTurn?.[heroId]===b.turn)throw Error('Tướng đã dùng một phép trong lượt này');
 const cooldownKey=heroId+':'+spellId;
 if((b.heroSpellCooldown[cooldownKey]||0)>b.turn)throw Error('Phép của tướng đang hồi');
 if(spec.affects==='enemy'&&b.heroEffects.some(x=>x.targets.some(q=>q.enemy)))
  throw Error('Địch đang chịu phép bất lợi, đợi phép hết hiệu lực');
 const effect={heroId,spellId,expiry:b.turn+3,targets:[]};
 if(spec.kind==='movement'){
  b.heroMovementInstinct[heroId]={id:spellId,level,expiry:b.turn+5};
 }else{
  const targets=spec.affects==='ally'?b.allies.filter(u=>u.heroId===heroId):b.enemies;
  for(const u of targets){
   if(u.pool<=0||spec.kind==='melee'&&u.range>1||spec.kind==='ranged'&&u.range<=1)continue;
   if(!['atk','def','hp'].includes(spec.stat))continue;
   const old=u[spec.stat],newValue=Math.max(1,old*(1+spec.delta*level));
   effect.targets.push({id:u.id,stat:spec.stat,old,currentHp:spec.stat==='hp'?newValue:null,enemy:u.side==='enemy'});
   u[spec.stat]=newValue;
   if(spec.stat==='hp')u.pool*=newValue/old;
  }
 }
 if(effect.targets.length)b.heroEffects.push(effect);
 b.heroCastTurn[heroId]=b.turn;b.heroSpellCooldown[cooldownKey]=b.turn+5;
 b.history.unshift('✨ '+hero.name+' dùng '+spec.name+' · chỉ '+(spec.affects==='ally'?'quân do tướng chỉ huy':'địch')+' chịu hiệu ứng.');
 return {heroId,spellId,targets:effect.targets.map(x=>x.id)};
}
function reward(s,b,outcome){
 const t=s.hg20.tower,floor=b.hg21Tower.floor;
 const won=outcome==='win',claimed=won&&t.claims<5;
 const gold=claimed?Math.min(1e12,2500+floor*900):0;
 const essence=claimed?Math.min(1e12,2+Math.floor(floor/4)):0;
 const report={floor,outcome:won?'win':'lose',enemy:b.enemies[0]?.name||'Quái Bí Cảnh',
  teamPower:Math.min(Number.MAX_SAFE_INTEGER,Math.floor(E.hg20TowerPower(s).power)),
  enemyPower:E.hg20TowerStatus(s).enemyPower,rewardGold:gold,rewardEssence:essence,
  claimed,turns:b.turn-1,team:b.hg21Tower.team.slice(),stackLosses:b.allies.map(u=>({
   heroId:u.heroId,unitId:u.unitId,initial:u.initial,remaining:u.count}))};
 t.attempts++;
 if(won){
  t.victories++;
  if(claimed){
   t.floor++;t.claims++;
   E.add(s,{gold,wood:Math.min(50000,250+floor*70),ore:Math.min(50000,250+floor*70),
    sulfur:Math.min(25000,100+floor*25),crystal:Math.min(25000,100+floor*25)});
   t.essence=Math.min(1e12,t.essence+essence);
   if(floor%10===0){
    // HG32: Tower progression unlocks a *quest goal*, not free endgame troops.
    // HG30 owns all new quest_guard -> tower_sovereign conversions, each with
    // real fragments/seals/army/gold sinks. Do not erase already-owned soldiers
    // from legacy Save v07 files; only stop future automatic minting.
    const unit=E.C.rewardUnits[s.race].find(u=>u.towerExclusive);
    if(unit){
     report.sovereignQuestUnit=unit.id;
     E.note(s,'Tháp tầng '+floor+': mở mục tiêu nâng '+unit.name+' qua nhiệm vụ HG30 (không cấp quân miễn phí).');
    }
   }
   if(floor%25===0){
    const items=['private_riftblade','private_riftplate','private_riftseal'],id=items[Math.floor(floor/25-1)%items.length];
    const label=E.ITEMS[id].name+' · Tầng '+floor;
    if(s.inventory.length<2000){const gear=E.addItem(s,id,'Bí Cảnh chiến thuật tầng '+floor);
     gear.towerFloor=floor;report.itemUid=gear.uid;}
    s.hg20.collection.artifacts.push(label);
    if(s.hg20.collection.artifacts.length>100)s.hg20.collection.artifacts.shift();
    report.artifact=label;
   }
  }
  if(floor>=25)s.hg20.collection.citadel=true;
 }
 t.last=report;
 E.note(s,'Bí Cảnh tầng '+floor+': '+(won?'thắng sau '+(b.turn-1)+' lượt':'thua hoặc quá 70 lượt')+
  (claimed?', nhận '+essence+' tinh hoa':' · không trừ lượt thưởng')+'.');
 return {...report,nextFloor:t.floor,dailyRewardsLeft:Math.max(0,5-t.claims),type:outcome};
}
function battleAct(s,action,opts){
 const b=s.battle;
 if(b?.hg261Joint){const out=old.battleAct(s,action,opts);
  if(out.type==='continue')clearEffects(s,b);return out;}
 if(!b?.hg21Tower)return old.battleAct(s,action,opts);
 // Direct canonical HG09 tactical turn; world wrappers must not grant
 // EXP/city/quest/loot or deduct real army during a tower projection.
 const output=E.battleActCore(s,action,opts);
 if(output.type==='continue'){clearEffects(s,b);return output}
 return reward(s,b,output.type==='win'?'win':'lose');
}
function valid(s){
 const t=s?.hg20?.tower;if(!t||!Array.isArray(t.picks)||t.picks.length>3)return false;
 if(t.team.length){
  // Saved Tower picks are a UI selection, not an active army allocation.
  // HG20.startMarch removes a dispatching hero's home plan (the troops leave
  // the city). Retaining a previously chosen Tower team must not corrupt the
  // Save while the hero fights NPC/Boss encounters or returns home.
  // The real entry gate gameBattle() still calls validatePicks(strictReady=true)
  // and refuses missing units, busy heroes or nonexistent slots.
  if(t.picks.length!==t.team.length)return false;
  if(t.picks.some((p,i)=>!p||p.heroId!==t.team[i]||
    !Number.isSafeInteger(p.heroId)||!Array.isArray(p.slots)||
    p.slots.length>OWNED_SLOTS||new Set(p.slots).size!==p.slots.length||
    p.slots.some(slot=>!validIndex(slot))))return false;
 }
 const b=s.battle;
 if(b?.hg21Tower){
  const v=b.hg21Tower,counts={};
  if(b.kind!=='tower'||!Number.isSafeInteger(v.floor)||v.floor!==t.floor||
    !Array.isArray(v.team)||v.team.length<1||v.team.length>3||
    v.team.some(id=>!t.team.includes(id))||b.allies.length>6||!b.allies.length||
    !Array.isArray(b.enemies)||!b.enemies.length||b.enemies.length>5||
    !b.allies.every(u=>v.team.includes(u.heroId)&&u.side==='player'))return false;
  for(const u of b.allies){counts[u.heroId]=(counts[u.heroId]||0)+1;
   if(counts[u.heroId]>2)return false;}
 }
 return true;
}
function strict(s){return old.strict(s)&&valid(s)}
function make(...args){return ensure(old.make(...args))}
function parse(text){const s=ensure(old.parse(text));if(!strict(s))throw Error('Save HG21 không hợp lệ');return s}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG21 không hợp lệ');return old.serialize(s)}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,
 battleAct,hg20TowerClimb:gameBattle,hg21TowerEnter:gameBattle,hg21TowerCast:towerCast,
 // Keep team selection atomic with the HG21 owner-slot ledger. Exposing the
 // HG20 chooser directly left team populated but picks empty until a later
 // status render, so the first v07 write was correctly rejected as invalid.
 hg20ChooseTowerTeam:choose,hg21TowerPicks:picks,hg21SetTowerPicks:setPicks,hg21TowerValid:valid});
root.HOG_HG21=Object.freeze({version:1,gameMode:'tactical-tower',maxHeroes:MAX_HEROES,slotsPerHero:OWNED_SLOTS});
})(typeof globalThis!=='undefined'?globalThis:this);
