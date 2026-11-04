/* HG18.2: offline campaign balance, not recovered Heroes of Gaia 2009 values.
 * Preserves SRC45 4-8★ base XP, SRC20 Fame AP caps/recovery, original unit
 * catalog, and Save v07. No new persistent fields, RNG or completion flags.
 * Positive XP bonuses require actual wins and are paid exactly once per battle.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E||E.V!==7||!E.HG18_TASKS)throw Error('HG18.2 requires HG18 runtime');
const raw={battleAct:E.battleAct,startMarch:E.startMarch};
function expeditionFactor(s){
 const tower=Math.max(1,Math.min(10,s.buildings?.heroTower||1));
 const scout=Math.max(0,Math.min(10,s.spells?.scouting||0));
 return 1+(tower-1)*.55+scout*.22;
}
function combatXpPreview(s,star,first=false,kind='npc'){
 if(kind!=='npc'||!Number.isSafeInteger(star)||star<4)
  return {base:0,extra:0,campaignFactor:1,firstClear:false,boss:false};
 const sourced=E.battleExperienceReward({kind:'npc',level:star});
 const base=sourced.baseXp,investment=expeditionFactor(s);
 // A boss is not a SRC45 4-8★ NPC; explicit original-model reward.
 const elite=star>=9,eliteBase=star>=10?60000:star===9?35000:0;
 const firstReward=first?base*1.5:0;
 const extra=Math.floor(base*(investment-1)+eliteBase*investment+firstReward);
 return {base,extra,campaignFactor:investment,firstClear:!!first,boss:elite};
}
function marchCost(s,key,targetKind){
 const t=key?E.getTile(key):null;
 if(targetKind==='treasure'||t?.kind!=='npc'||(t.level||0)<4)return t?.kind==='mine'?6:8;
 const scout=Math.max(0,Math.min(10,s.spells?.scouting||0));
 return 8-Math.min(3,scout);
}
function startMarch(s,key,kind){
 const effective=marchCost(s,key,kind);
 if(effective===8||E.getTile(key)?.kind!=='npc'||(E.getTile(key)?.level||0)<4||kind==='treasure')return raw.startMarch(s,key,kind);
 if(!Number.isFinite(s.ap)||s.ap+1e-8<effective)throw Error('Thiếu AP');
 const before=s.ap;
 // The canonical startMarch validates the complete trip and charges 8 AP.
 // A temporary 8-AP headroom is used only during validation, then the exact
 // modeled discount is reconciled. Failed validation restores original AP.
 if(before<8)s.ap=8;
 try{
  const trip=raw.startMarch(s,key,kind);
  s.ap=before-effective;
  E.note(s,'Trinh sát cấp '+(s.spells?.scouting||0)+' giảm '+(8-effective)+' AP cho chuyến săn quái 4★+ (HG18.2 mô hình).');
  return trip;
 }catch(err){s.ap=before;throw err}
}
function battleAct(s,action,opts){
 const b=s.battle?{target:s.battle.target,kind:s.battle.kind,level:s.battle.level}:null;
 const heroId=s.expedition?.heroId||s.activeHero;
 const first=!!b&&!(s.cleared||[]).includes(b.target);
 const result=raw.battleAct(s,action,opts);
 if(!b||b.kind!=='npc'||b.level<4||result?.type!=='win')return result;
 const preview=combatXpPreview(s,b.level,first,b.kind);
 if(!preview.extra)return result;
 const granted=E.grantHeroExperience(s,heroId,preview.extra,'điểm kinh nghiệm chiến dịch HG18.2');
 if(granted.gained>0){
  const report=s.battleReports?.find(r=>r.id===result.reportId);
  if(report)report.heroXp+=granted.gained;
  E.note(s,'Kinh nghiệm thám hiểm +'+Math.floor(granted.gained).toLocaleString('vi-VN')+
   (first?' (lần đầu chinh phục)':'')+(preview.boss?' · Boss Ma Giới':'')+'.');
 }
 return result;
}
Object.assign(E,{hg182CombatXpPreview:combatXpPreview,hg182MarchCost:marchCost,
 hg182ExpeditionFactor:expeditionFactor,startMarch,battleAct});
root.HOG_HG182=Object.freeze({version:1,status:'offline-v07-derived-balance',sources:['SRC45 base XP','SRC20 Fame AP']});
})(typeof globalThis!=='undefined'?globalThis:this);
