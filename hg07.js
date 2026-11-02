/* HG-07: community-sourced hero unit-value capacity (Fandom Heroes table).
 * Not licensed client or server code. Base capacity only: Arena rank/items/guild additions deferred.
 * Read-only check preserves all HG02-HG06 saves without schema migration.
 * Source: https://heroesofgaia.fandom.com/wiki/Heroes (Unit Limit, levels 1-100).
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E||E.V!==6)throw Error('HG07 requires HG06 engine');
const BASE_LIMITS=Object.freeze([11500,13333,16666,20000,23333,26666,29999,33333,36666,40000,49823,62567,76258,90833,106242,122442,139397,157073,175444,194482,248166,276833,306833,338166,370833,404833,440166,476833,514833,554166,594833,636833,680166,724833,770833,818166,866833,916833,968166,1020833,1074833,1130166,1186833,1244833,1304166,1364833,1426833,1490166,1554833,1620833,1688166,1756833,1826833,1898166,1970833,2044833,2120166,2196833,2274833,2354166,2478125,2518750,2559375,2600000,2640625,2681250,2721875,2762500,2803125,2843750,2884375,2925000,2965625,3006250,3046875,3087500,3128125,3168750,3209375,3250000,3290625,3331250,3371875,3412500,3453125,3493750,3534375,3575000,3615625,3656250,3696875,3737500,3778125,3818750,3859375,3900000,3940625,3981250,4021875,4062500]);
const prior={setFormation:E.setFormation,startMarch:E.startMarch};
function heroLimit(level){
 if(!Number.isSafeInteger(level)||level<1||level>100)throw Error('Cấp tướng ngoài bảng 1–100');
 return BASE_LIMITS[level-1];
}
function selectedHero(s){const h=s.heroes?.find(h=>h.id===s.activeHero);
 if(!h||h.id===s.castellan)throw Error('Chưa có tướng chỉ huy sẵn sàng');return h;}
function formationPoints(s,formation){
 let sum=0;for(const g of formation){if(!g?.unitId||!g?.count)continue;
  const unit=E.getUnit(s,g.unitId);if(!unit)throw Error('Binh chủng không hợp lệ');
  sum+=E.unitValue(unit)*Number(g.count);
 }return sum;
}
function defaultFormation(s){return E.activeArmy(s).sort((a,b)=>b.tier-a.tier).slice(0,7).map(u=>({unitId:u.id,count:s.army[u.id]}));}
function checkCapacity(s,formation){
 const h=selectedHero(s),points=formationPoints(s,formation),limit=heroLimit(h.level);
 if(!Number.isSafeInteger(points)||points>limit)throw Error(`Vượt giới hạn chỉ huy của ${h.name}: ${points.toLocaleString('vi-VN')} / ${limit.toLocaleString('vi-VN')} điểm. Hãy giảm số quân trong đội hình.`);
 return {heroId:h.id,level:h.level,points,limit};
}
function setFormation(s,formation){
 // Validate the original source contract first. No state change if capacity validation fails.
 if(!Array.isArray(formation))return prior.setFormation(s,formation);
 checkCapacity(s,formation);
 return prior.setFormation(s,formation);
}
function startMarch(s,target){
 // Also covers pre-HG07 saved formations and the auto-selection fallback.
 checkCapacity(s,s.formation?.length?s.formation:defaultFormation(s));
 return prior.startMarch(s,target);
}
Object.assign(E,{heroLimit,formationPoints,checkCapacity,setFormation,startMarch,HG07_BASE_LIMITS:BASE_LIMITS});
root.HOG_HG07={status:'capacity-base-check',source:'Fandom Heroes',saveSchema:6};
})(typeof globalThis!=='undefined'?globalThis:this);
