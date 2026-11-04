/* HG20 private world Boss expansions, independent of 2009 NPC sources.
 * Two repeatable high-strength encounters using the existing HG09 battle
 * scheduler, backed by the original v07 enemy/casualty/reward authority.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;if(!E?.hg20TowerClimb)throw Error('HG20 world bosses need private core');
const NAMES=['Vực Thẳm Quỷ Hoàng','Thời Không Tà Thần'];
const bosses=[],candidates=E.TILES.filter(t=>t.kind==='empty'&&t.terrain!=='water'&&t.x+t.y>135)
 .sort((a,b)=>b.x+b.y-a.x-a.y||b.x-a.x);
for(const tile of candidates){
 if(bosses.length===NAMES.length)break;
 if(bosses.some(q=>Math.abs(q.x-tile.x)+Math.abs(q.y-tile.y)<18))continue;
 if(!E.pathfind('3,4',tile.key))continue;
 tile.kind='npc';tile.level=10;tile.eliteTier=13;tile.value=NAMES[bosses.length];
 tile.source='PRIVATE_ELITE_WORLD';tile.privateBoss=true;bosses.push(tile);
}
if(bosses.length!==2)throw Error('Cannot place two reachable private Bosses');
const before={makeBattle:E.makeBattle,tick:E.tick,battleAct:E.battleAct};
function boost(b){
 if(!b||b.hg20BossBoosted||!E.getTile(b.target)?.privateBoss)return b;
 for(const foe of b.enemies){
  foe.hp=Math.ceil(foe.hp*6);foe.pool=foe.hp*foe.count;
  foe.atk=Math.ceil(foe.atk*3.5);foe.def=Math.ceil(foe.def*2.5);
  foe.spd=Math.max(foe.spd,11);
 }
 b.hg20BossBoosted=true;
 b.history.unshift('👹 Tà Thần private: HP ×6, ATK ×3,5, DEF ×2,5.');
 return b;
}
function makeBattle(s,target,...rest){return boost(before.makeBattle(s,target,...rest))}
function tick(s,...rest){const r=before.tick(s,...rest);if(s.battle)boost(s.battle);return r}
function battleAct(s,cmd,opts){
 const entry=s.battle?{target:s.battle.target,kind:s.battle.kind}:null;
 if(s.battle)boost(s.battle);
 const result=before.battleAct(s,cmd,opts);
 if(result?.type==='win'&&entry?.kind==='npc'&&E.getTile(entry.target)?.privateBoss){
  const c=s.hg20.collection,counter=c.privateBossWins=(c.privateBossWins||0)+1;
  s.hg20.tower.essence=Math.min(1e12,s.hg20.tower.essence+10+Math.floor(counter/5));
  if(counter%3===0){
   const special=E.C.rewardUnits[s.race].find(x=>x.towerExclusive);
   if(special&&(s.army[special.id]||0)<1e8){
    s.army[special.id]=(s.army[special.id]||0)+1;
    E.note(s,'Chiến tích Boss private: nhận 1 '+special.name+'.');
   }
  }
  if(counter%5===0&&s.inventory.length<2000){
   const choices=['private_riftblade','private_riftplate','private_riftseal'];
   const id=choices[Math.floor(counter/5-1)%choices.length];
   const gear=E.addItem(s,id,'Boss đặc biệt '+entry.target);
   gear.towerFloor=Math.min(1e9,20+counter*5);
   E.note(s,'Săn 5 Boss private: nhận '+E.ITEMS[id].name+'.');
  }
 }
 return result;
}
Object.assign(E,{makeBattle,tick,battleAct,hg20PrivateWorldBosses:bosses});
root.HOG_HG20_BOSSES=Object.freeze({status:'private-combat-real',count:2});
})(typeof globalThis!=='undefined'?globalThis:this);
