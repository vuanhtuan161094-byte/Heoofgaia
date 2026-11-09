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
 if(!['npc','treasure','tower'].includes(result.kind))return result;
 const c=result.hg409EnemyCommander;
 if(!c||!Array.isArray(result.enemies)||!result.enemies.length)return result;
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
 result.history.unshift('HG41: Địch '+result.enemies.length+' đội / '+
  result.hg410.enemyTroops+' quân; hai cột sát mép mỗi phe, cận chiến 1 ô, cung 4–5 ô.');
 result.history.length=Math.min(result.history.length,12);
 return result;
}
E.hg40PrepareBattle=prepare;
E.hg410EncounterPreview=preview;
root.HOG_HG410=Object.freeze({version:1,save:7,mode:'two-columns-many-enemy-stacks'});
})(typeof globalThis!=='undefined'?globalThis:this);
