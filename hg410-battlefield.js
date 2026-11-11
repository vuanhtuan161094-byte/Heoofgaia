/* HG41 — real enemy army scale and two-column tactical deployment.
 * Applies exclusively at NEW battle creation. Existing v07 battle coordinates,
 * HP, receipts and casualties are never rewritten on Save/Load.
 * Enemy troop counts are not restricted by player hero command capacity.
 * Physical 12x9 field has only 18 enemy starting cells (two columns).
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg409Preview||!E?.hg40PrepareBattle||!E?.battleHex||E.V!==7)
 throw Error('HG41 requires HG40.9 and Save v07');
const oldPrepare=E.hg40PrepareBattle;
const rowOrder=Object.freeze([4,2,6,0,8,1,7,3,5]);
const finiteCount=(count,hp)=>Math.max(1,Math.min(Math.floor(Number.MAX_SAFE_INTEGER/Math.max(1,hp)),Math.ceil(count)));
const isBossBattle=b=>{
 const tile=E.getTile(b.target);
 return !!(tile?.privateBoss||(tile?.eliteTier||0)>=11||
  b.kind==='tower'&&(b.hg21Tower?.floor||1)%10===0||
  b.kind==='treasure'&&b.level>=9);
};
function stackCount(kind,cs,boss){
 if(boss)return 16;
 if(kind==='tower')return cs>=6?14:10;
 if(cs<=2)return 6;
 if(cs<=4)return 8;
 return 12;
}
// HG61: one enemy uses exactly one canonical troop identity for art, 
// animation and HG40 active/passive skill. Original troop stats are NOT
// copied: HG40.9 remains the sole authority for NPC/CS encounter strength.
// The roster is deterministic from the target, tier and actor slot. No RNG,
// new Save version, extra troop objects, currencies or ability cooldowns.
const PVE_TIERS=Object.freeze([1,3,4,6,5,8,7,9,10,2,4,6,8,5,9,10]);
const PVE_RACES=Object.freeze(['undead','orc','human','elf']);
function enemyTemplate(b,i,cs,boss){
 // Bound a sixteen-actor Boss encounter to eight distinct reusable troop
 // atlases. Every actor retains full HG40 skill/HP/AI authority while
 // reducing mobile sprite decoding and texture memory demand.
 if(boss)i=i%8;
 const seed=String(b.target||'tower').split('').reduce((h,ch)=>(h*31+ch.charCodeAt(0))%65521,0)+
  (b.hg21Tower?.floor||0);
 const race=PVE_RACES[(seed+Math.floor(i/3))%PVE_RACES.length];
 const maxTier=boss?10:cs<=2?4:cs<=4?6:cs<=7?8:10,minTier=boss?6:1;
 const preferred=Math.min(maxTier,Math.max(minTier,PVE_TIERS[i%16]+Math.floor((cs-1)/4)));
 // HG61 Boss budget: two ranged groups and two hard-control groups at
 // most, rather than four of each. Every one still casts its own HG40
 // skill, while the 16-stack Boss remains hard without early ranged/CC
 // focus-fire erasing a heavily funded army before the scripted phase.
 const mode=boss?(i===1||i===9?1:i===2||i===10?2:i%4===1||i%4===2?0:i%4):i%4;
 const roleOf=u=>E.HG40_TRAITS[u.id];
 const roleMatch=u=>mode===1?u.type==='Ranged':
  mode===2?roleOf(u)?.cd>0&&['defdown','atkdown','dot','mark','slow','root','stun'].includes(roleOf(u).kind):
  mode===3?['H','T'].includes(roleOf(u)?.role):true;
 const roster=E.C.units[race],eligible=roster.filter(u=>u.tier>=minTier&&u.tier<=maxTier&&roleMatch(u));
 // Early Undead have no ranged unit below T6. In that case the encounter
 // genuinely draws a ranged unit from another existing faction.
 const alternate=Object.values(E.C.units).flat().filter(u=>u.tier>=minTier&&u.tier<=maxTier&&roleMatch(u));
 const pool=eligible.length?eligible:alternate.length?alternate:roster.filter(u=>u.tier>=minTier&&u.tier<=maxTier);
 const sorted=pool.slice().sort((x,y)=>Math.abs(x.tier-preferred)-Math.abs(y.tier-preferred)||
  (x.race===race?-1:1)-(y.race===race?-1:1)||x.id.localeCompare(y.id));
 return sorted[(seed+Math.floor(i/8))%Math.min(sorted.length,2)];
}
function tagEnemy(u,source,b,i,cs,boss){
 // A first-row named Boss keeps its uniquely authored Boss atlas and name.
 // Further groups use already-approved HG33 troop atlases and HG40 traits.
 const troop=enemyTemplate(b,i,cs,boss);
 const bossArt=!!root.HOG_HG33_TROOP_ATLASES?.resolve?.(null,source.name);
 const namedLeader=boss&&i<Math.min(3,b.enemies.length)&&bossArt;
 u.unitId=troop.id;
 u.range=E.unitTacticalRange(troop);
 // HG61 real Boss role balance: three named Boss bodies remain full-strength.
 // Hired/supporting troop groups have real damage and HG40 skills, but
 // cannot all deal Boss-class raw ATK simultaneously. T13's prior 16x
 // full-ATK roster defeated 800 well-equipped Archangels by turn 17,
 // before the authored 35% phase could even trigger.
 if(boss&&i>=3){
  const scale=cs>=10?.30:cs>=8?.60:.75;
  u.atk=Math.max(1,Math.round(u.atk*scale));
 }
 if(!namedLeader)u.name=troop.name+(boss?' · Hộ vệ':' · Quái');
 return u;
}
function minimumTroops(cs,boss){
 // No army-command ceiling for PvE. Increasing CS raises actual living count,
 // never only a visual label or the displayed power estimate.
 return Math.ceil((boss?5:1.5)*Math.pow(cs,3));
}
function preview(kind,target='',floor=1,level=null){
 const p=E.hg409Preview(kind,target,floor,level);
 if(!p)return null;
 const boss=!!p.boss;
 return {cs:p.cs,boss,stacks:stackCount(p.kind,p.cs,boss),
  minimumPerStack:minimumTroops(p.cs,boss),deployment:'two-column-12x9',
  meleeRange:E.TACTICAL_RANGE.melee,rangedRange:E.TACTICAL_RANGE.ranged,
  eliteRangedRange:E.TACTICAL_RANGE.eliteRanged};
}
function deploy(units,side,useSavedSlots){
 const first=side==='player'?1:10,second=side==='player'?0:11;
 const front=[],back=[];
 for(const u of units){
  const frontBySlot=useSavedSlots&&Number.isInteger(u.slot)?u.slot>=4:null;
  const preferred=frontBySlot===null?u.range<=1:frontBySlot;
  (preferred?front:back).push(u);
 }
 // Any overfull column spills into the other one; no collision, no third row.
 while(front.length>9)back.push(front.pop());
 while(back.length>9)front.push(back.pop());
 if(front.length>9||back.length>9)throw Error('HG41 deployment exceeds 18 physical cells');
 front.forEach((u,i)=>{u.x=first;u.y=rowOrder[i]});
 back.forEach((u,i)=>{u.x=second;u.y=rowOrder[i]});
}
function prepare(s,b){
 const result=oldPrepare(s,b);
 if(!result||result.hg410?.v===1)return result;
 if(!Array.isArray(result.enemies)||!result.enemies.length||!Array.isArray(result.allies))return result;
 const c=result.hg409EnemyCommander;
 if(!c||!['npc','treasure','tower'].includes(result.kind)){
  // Mine and AI castle garrisons are canonical real troops. Re-anchor every
  // new battle without minting a single defender or modifying their stats.
  deploy(result.allies,'player',!result.hg21Tower);
  deploy(result.enemies,'enemy',false);
  result.hg410={v:1,cs:0,boss:false,enemyStacks:result.enemies.length,
   enemyTroops:result.enemies.reduce((sum,u)=>sum+u.count,0),
   formation:'two-columns',ranged:[1,E.TACTICAL_RANGE.ranged,E.TACTICAL_RANGE.eliteRanged]};
  return result;
 }
 const boss=isBossBattle(result),cs=c.rebirth,desired=stackCount(result.kind,cs,boss);
 const original=result.enemies.slice();
 const rebuilt=[];
 for(let i=0;i<desired;i++){
  const source=original[i%original.length],u={...source,id:'e'+i};
  // Each additional stack is a real combat actor (AI, damage and casualties).
  // Preserve the exact already-buffed enemy HP/ATK/DEF from HG40.9.
  const minimum=minimumTroops(cs,boss)*(1+(i%3)*.35);
  u.count=finiteCount(Math.max(source.count,minimum),u.hp);
  u.initial=u.count;
  u.pool=u.count*u.hp;
  tagEnemy(u,source,result,i,cs,boss);
  rebuilt.push(u);
 }
 result.enemies=rebuilt;
 // The player's saved slots 0–3 are rear, 4–6 front. Tower 3x2 uses
 // weapon range instead, because sourceSlot belongs to separate heroes.
 deploy(result.allies,'player',!result.hg21Tower);
 deploy(result.enemies,'enemy',false);
 result.hg410={v:1,cs,boss,enemyStacks:result.enemies.length,
  enemyTroops:result.enemies.reduce((sum,u)=>sum+u.count,0),
  formation:'two-columns',ranged:[1,E.TACTICAL_RANGE.ranged,E.TACTICAL_RANGE.eliteRanged]};
 result.history.unshift('HG61: '+result.enemies.length+' đội địch dùng binh chủng HG33/HG40 có hình, kỹ năng và hồi chiêu thực.');
 result.history.unshift('HG41: Địch '+result.enemies.length+' đội / '+
  result.hg410.enemyTroops+' quân; hai cột sát mép mỗi phe, cận chiến 1 ô, cung 4–5 ô.');
 result.history.length=Math.min(result.history.length,12);
 return result;
}
E.hg40PrepareBattle=prepare;
E.hg410EncounterPreview=preview;
root.HOG_HG410=Object.freeze({version:1,save:7,mode:'two-columns-many-enemy-stacks'});
})(typeof globalThis!=='undefined'?globalThis:this);
