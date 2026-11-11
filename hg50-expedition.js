/* HG50-A — Real Boss expedition progression, additive within Save v07.
 * No second battle engine, no pseudo-victories, no free loot or extra HTML.
 * Boss T11->T12->T13 become one-time quest milestones; the old Boss screen
 * remains independently available for unrestricted normal PvE.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg409Preview||!E?.hg410EncounterPreview||!E?.hg47Status||E.V!==7)
 throw Error('HG50-A requires HG41/HG47, HG40.9 and Save v07');
const TIERS=Object.freeze([11,12,13]);
// Memoize world target lookup; do not scan/sort the entire tile catalog on
// every Boss-screen rerender or every phone economy tick.
const ROUTE_TILES=Object.freeze(TIERS.map(tier=>
 E.TILES.filter(t=>t.kind==='npc'&&t.eliteTier===tier)
   .sort((a,b)=>a.key.localeCompare(b.key))[0]||null
));
const old={make:E.make,parse:E.parseSave,strict:E.strictSave,battleAct:E.battleAct,prepare:E.hg40PrepareBattle,tick:E.tick};
const fresh=()=>({v:1,unlocked:1,completed:[]});

// HG50-C: non-monetary repeat milestones. Daily/weekly marks are sourced only
// from canonical battle wins, using UTC day and Monday-start UTC week.
// No additional gold, materials, army, loot or win is created here.
const dayKey=s=>{
 const n=Number(s?.lastTick),d=new Date(Number.isFinite(n)&&Math.abs(n)<8.64e15?n:0);
 return d.toISOString().slice(0,10);
};
const weekKey=s=>{
 const d=new Date(dayKey(s)+'T00:00:00.000Z');
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return d.toISOString().slice(0,10);
};
const freshC=s=>({v:1,day:dayKey(s),week:weekKey(s),today:[],thisWeek:[],
 total:{11:0,12:0,13:0}});
const validC=s=>{
 const q=s.hg50c;if(q===undefined)return true; // pre-C v07 historical Save
 if(!q||q.v!==1||Object.keys(q).sort().join(',')!=='day,thisWeek,today,total,v,week'||
  typeof q.day!=='string'||typeof q.week!=='string'||
  !/^\d{4}-\d{2}-\d{2}$/.test(q.day)||!/^\d{4}-\d{2}-\d{2}$/.test(q.week)||
  !Array.isArray(q.today)||!Array.isArray(q.thisWeek)||!q.total||
  Array.isArray(q.total)||Object.keys(q.total).sort().join(',')!=='11,12,13')return false;
 for(const row of [q.today,q.thisWeek]){
  if(row.length>3||new Set(row).size!==row.length||row.some(t=>!TIERS.includes(t)))return false;
 }
 return TIERS.every(t=>Number.isSafeInteger(q.total[t])&&q.total[t]>=0&&q.total[t]<=100000000);
};
function ensureC(s){if(!s.hg50c)s.hg50c=freshC(s);return s.hg50c;}
function replayStatus(s){
 const c=s.hg50c||freshC(s),day=dayKey(s),week=weekKey(s);
 return {v:1,day,week,today:c.day===day?c.today.slice():[],
  thisWeek:c.week===week?c.thisWeek.slice():[],
  dailyComplete:c.day===day&&c.today.length===3,
  weeklyComplete:c.week===week&&c.thisWeek.length===3,
  total:{...c.total},economicBonus:0,
  rewardPolicy:'only-existing-real-boss-settlement'};
}
function recordReplay(s,tier){
 const q=ensureC(s),day=dayKey(s),week=weekKey(s);
 if(q.day!==day){q.day=day;q.today=[];}
 if(q.week!==week){q.week=week;q.thisWeek=[];}
 if(!q.today.includes(tier))q.today.push(tier);
 if(!q.thisWeek.includes(tier))q.thisWeek.push(tier);
 q.today.sort((a,b)=>a-b);q.thisWeek.sort((a,b)=>a-b);
 q.total[tier]=Math.min(100000000,q.total[tier]+1);
 // Existing hg409 and HG29/HG47/HG31 remain the only loot authority.
 E.note(s,'🧭 Viễn Chinh T'+tier+': chiến tích thật ngày '+q.today.length+
  '/3, tuần '+q.thisWeek.length+'/3. Không có thưởng Viễn Chinh cộng thêm.');
}

function ensure(s){if(!s.hg50)s.hg50=fresh();return s.hg50;}
function valid(s){
 const q=s.hg50;
 if(q===undefined)return true; // legacy Save v07 before parse/migration
 if(!q||q.v!==1||!Array.isArray(q.completed)||!Number.isInteger(q.unlocked)
    ||q.completed.length>3||q.unlocked!==q.completed.length+1)return false;
 if(Object.keys(q).sort().join(',')!=='completed,unlocked,v')return false;
 return q.completed.every((tier,i)=>tier===TIERS[i]);
}
function status(s){
 const q=s.hg50||fresh();
 return {v:1,unlocked:q.unlocked,completed:q.completed.slice(),done:q.completed.length===3,replay:replayStatus(s),
   stages:TIERS.map((tier,i)=>{
    const tile=ROUTE_TILES[i];
    const p=tile?E.hg409Preview('npc',tile.key):null;
    const layout=tile?E.hg410EncounterPreview('npc',tile.key):null;
    return {stage:i+1,tier,target:tile?.key||null,name:tile?.value||tile?.name||'Boss T'+tier,
      cs:p?.cs||0,stacks:layout?.stacks||0,completed:i<q.completed.length,
      unlocked:i+1<=q.unlocked};
   })};
}

// HG50-B: battle-bound Boss phases. This is an additive, versioned v07 field;
// legacy battles WITHOUT hg50b remain exactly as they were. No reward hooks.
const PHASES=Object.freeze({
  11:Object.freeze({kind:'shield',threshold:65}),
  12:Object.freeze({kind:'summon',threshold:50}),
  13:Object.freeze({kind:'berserk',threshold:35})
});
const ROWS=[4,2,6,0,8,1,7,3,5];
const live=u=>u.pool>0;
const totalHp=b=>b.enemies.reduce((n,u)=>n+(live(u)?u.pool:0),0);
const isTurn=n=>Number.isSafeInteger(n)&&n>=1&&n<=100;
function phaseValid(b){
 const q=b?.hg50b;if(q===undefined)return true; // pre-HG50-B battle
 const spec=PHASES[q?.tier],target=ROUTE_TILES[TIERS.indexOf(q?.tier)]?.key;
 if(!spec||q.v!==1||q.kind!==spec.kind||q.threshold!==spec.threshold||
   q.target!==target||b.target!==target||b.kind!=='npc'||
   !Number.isSafeInteger(q.initialHp)||q.initialHp<1||
   !['armed','warning','active'].includes(q.phase)||
   !Array.isArray(q.events)||q.events.length>2||
   !Number.isSafeInteger(q.extraStacks)||q.extraStacks<0||q.extraStacks>2||
   (q.phase==='armed'&&(q.triggeredTurn!==null||q.activeTurn!==null||q.events.length))||
   (q.phase==='warning'&&(q.tier!==13||!isTurn(q.triggeredTurn)||
       q.activeTurn!==null||q.events.length!==1))||
   (q.phase==='active'&&(!isTurn(q.triggeredTurn)||!isTurn(q.activeTurn)||
       q.activeTurn<q.triggeredTurn||q.events.length!==2))||
   (q.tier!==12&&q.extraStacks!==0)||
   b.enemies.length>18)return false;
 return q.events.every((e,i)=>e&&e.kind===(i===0?'threshold':'active')&&isTurn(e.turn))&&
    q.events.every(e=>e.turn>=q.triggeredTurn)&&
    Object.keys(q).sort().join(',')==='activeTurn,events,extraStacks,initialHp,kind,phase,target,threshold,tier,triggeredTurn,v';
}
function phasePrepare(s,b){
 const result=old.prepare(s,b);
 if(!result||result.hg50b||result.kind!=='npc'||result.hg40?.v!==1)return result;
 const tile=E.getTile(result.target),tier=tile?.eliteTier,spec=PHASES[tier];
 if(!spec||result.target!==ROUTE_TILES[TIERS.indexOf(tier)]?.key)return result;
 const initialHp=totalHp(result);
 if(!Number.isSafeInteger(initialHp)||initialHp<1)throw Error('HG50-B invalid initial Boss HP');
 result.hg50b={v:1,tier,target:result.target,kind:spec.kind,
   threshold:spec.threshold,initialHp,phase:'armed',triggeredTurn:null,
   activeTurn:null,extraStacks:0,events:[]};
 result.history.unshift('HG50-B: Boss T'+tier+' đổi pha khi tổng HP đội hình còn '+spec.threshold+'%.');
 result.history.length=Math.min(12,result.history.length);
 return result;
}
// Some inherited world-march decorators finalize their enemies after the
// HG40 prepare hook. The authoritative denominator is the complete LIVE roster
// at battle open, after all wrapped tick/march decorators have finished.
function finalizeInitialHp(s){
 const b=s?.battle,q=b?.hg50b;
 if(!q||q.phase!=='armed'||b.turn!==1||q.triggeredTurn!==null)return;
 const hp=totalHp(b);
 if(!Number.isSafeInteger(hp)||hp<=0)throw Error('HG50-B invalid finalized Boss total HP');
 q.initialHp=hp;
}
function tick(s,...args){const result=old.tick(s,...args);finalizeInitialHp(s);return result;}
function phaseEvent(b,q,kind,turn,message){
 q.events.push({kind,turn});
 b.history.unshift(message);b.history.length=Math.min(12,b.history.length);
}
function triggerShield(b,q){
 // The existing HG40 shield authority caps shields at 25% stack max HP,
 // absorbs real incoming damage, and expires after two subsequent turns.
 const shields=b.hg40?.shields;if(!shields)return;
 for(const u of b.enemies.filter(live).sort((a,c)=>c.pool-a.pool||a.id.localeCompare(c.id)).slice(0,4)){
  const cap=Math.ceil(u.count*u.hp*.25),oldAmount=Math.max(0,shields[u.id]?.amount||0);
  const plus=Math.min(cap-oldAmount,Math.ceil(u.count*u.hp*.12));
  if(plus>0)shields[u.id]={amount:oldAmount+plus,
    until:Math.max(shields[u.id]?.until||0,b.turn+2)};
 }
}
function triggerSummon(b,q){
 const occupied=new Set([...b.allies,...b.enemies].filter(live).map(u=>u.x+','+u.y));
 const candidates=[];
 for(const x of [10,11,9,8])for(const y of ROWS)
  if(E.battleHex.inBounds(x,y)&&!occupied.has(x+','+y))candidates.push({x,y});
 const sources=b.enemies.filter(live).sort((a,c)=>a.id.localeCompare(c.id));
 const max=Math.min(2,18-b.enemies.length,candidates.length);
 for(let i=0;i<max;i++){
  const source=sources[i%sources.length],cell=candidates[i];
  if(!source)break;
  let index=0;while(b.enemies.some(u=>u.id==='e'+index))index++;
  const count=Math.max(1,Math.floor(Math.max(1,source.initial)*.12));
  b.enemies.push({...source,id:'e'+index,x:cell.x,y:cell.y,
   count,initial:count,pool:count*source.hp});
  occupied.add(cell.x+','+cell.y);q.extraStacks++;
 }
 if(b.hg410?.v===1){
  b.hg410.enemyStacks=b.enemies.length;
  b.hg410.enemyTroops=b.enemies.reduce((n,u)=>n+(live(u)?u.count:0),0);
 }
}
function triggerBerserk(b){
 // Deferred until AFTER the full warning action. Buff surviving melee,
 // or the living rear line if every melee defender has already fallen.
 // Without this fallback the 35% phase can silently do nothing.
 const living=b.enemies.filter(live),front=living.filter(u=>u.range===1);
 for(const u of (front.length?front:living))
  u.atk=Math.max(0,Math.round(u.atk*1.20));
}
function phaseAfterAction(s,b,result){
 const q=b?.hg50b;
 if(!q||result?.type!=='continue'||s.battle!==b)return result;
 if(q.phase==='warning'&&b.turn>=q.triggeredTurn+2){
  triggerBerserk(b);q.phase='active';q.activeTurn=b.turn-1;
  phaseEvent(b,q,'active',q.activeTurn,'🔥 Boss T13 CUỒNG NỘ: tuyến cận chiến (hoặc đội còn sống nếu tuyến trước đã ngã) ATK +20% sau một lượt cảnh báo.');
  return {...result,hg50BossPhase:'berserk'};
 }
 if(q.phase!=='armed'||totalHp(b)*100>q.initialHp*q.threshold)return result;
 q.triggeredTurn=b.turn-1;
 phaseEvent(b,q,'threshold',q.triggeredTurn,'⚠ Boss T'+q.tier+' vượt ngưỡng '+q.threshold+'% HP đội hình!');
 if(q.tier===13){
  q.phase='warning';
  return {...result,hg50BossPhase:'warning'};
 }
 if(q.tier===11)triggerShield(b,q);
 else if(q.tier===12)triggerSummon(b,q);
 q.phase='active';q.activeTurn=q.triggeredTurn;
 phaseEvent(b,q,'active',q.activeTurn,q.tier===11?
   '🛡 Boss T11 PHÒNG THỦ: 4 đội còn sống nhận khiên tối đa 12% HP, hiệu lực 2 lượt.':
   '🜁 Boss T12 TRIỆU HỒI: tối đa 2 đội địch mới trên ô trống, tổng quân địch tối đa 18 đội.');
 return {...result,hg50BossPhase:q.kind};
}
function phaseLabel(b){
 const q=b?.hg50b;if(!q)return '';
 const ratio=Math.max(0,Math.min(100,Math.round(totalHp(b)*100/q.initialHp)));
 const text=q.kind==='shield'?'🛡 Phòng thủ':q.kind==='summon'?'🜁 Triệu hồi':'🔥 Cuồng nộ';
 const state=q.phase==='armed'?'Chờ ngưỡng '+q.threshold+'%':
  q.phase==='warning'?'CẢNH BÁO 1 LƯỢT — chuẩn bị cuồng nộ':
  q.kind==='shield'?'Đã kích hoạt khiên':
  q.kind==='summon'?'Đã triệu hồi '+q.extraStacks+' đội':'ATK tuyến trước +20%, dự phòng quân còn sống';
 return 'Boss T'+q.tier+' · HP đội hình '+ratio+'% · '+text+' · '+state;
}

function battleAct(s,action,options){
 // Capture the ACTUAL battle before the original engine settles and removes it.
 const b=s.battle;
 const tile=b?.kind==='npc'?E.getTile(b.target):null;
 const tier=tile?.eliteTier;
 const target=b?.target;
 finalizeInitialHp(s);
 const raw=old.battleAct(s,action,options);
 const result=phaseAfterAction(s,b,raw);
 if(result?.type!=='win'||!TIERS.includes(tier)||!target)return result;
 // Real canonical victory only, including repeat fights after route completion.
 // Never pay a second quest reward and never count an off-route same-tier Boss.
 if(target===ROUTE_TILES[TIERS.indexOf(tier)]?.key)recordReplay(s,tier);
 const q=ensure(s);
 const expected=TIERS[q.completed.length];
 if(tier!==expected||target!==ROUTE_TILES[q.completed.length]?.key)return result; // only the route's exact canonical Boss can advance
 q.completed.push(tier);
 q.unlocked=q.completed.length+1;
 E.note(s,'🧭 Viễn Chinh: hoàn tất chặng '+q.completed.length+'/3 bằng chiến thắng Boss T'+tier+
  ' tại '+target+'. Phần thưởng vẫn do hệ thống Boss gốc quyết toán.');
 return {...result,hg50Stage:tier};
}
function make(...args){const s=old.make(...args);ensure(s);ensureC(s);return s;}
function parse(...args){const s=old.parse(...args);ensure(s);ensureC(s);if(!valid(s)||!validC(s))throw Error('HG50 Save v07 hỏng');return s;}
function strict(s){return old.strict(s)&&valid(s)&&validC(s)&&(!s.battle||phaseValid(s.battle));}
Object.assign(E,{make,parseSave:parse,strictSave:strict,valid:strict,battleAct,
 hg40PrepareBattle:phasePrepare,tick,hg50Status:status,hg50Valid:valid,hg50Tiers:TIERS,
 hg50PhaseLabel:phaseLabel,hg50PhaseValid:phaseValid,hg50PhaseSpecs:PHASES,
 hg50ReplayStatus:replayStatus,hg50ReplayValid:validC});
root.HOG_HG50=Object.freeze({version:3,save:7,stages:3,rewards:'existing-authoritative-only',bossPhases:[65,50,35],replay:'utc-daily-weekly-no-extra-payout'});
})(typeof globalThis!=='undefined'?globalThis:this);
