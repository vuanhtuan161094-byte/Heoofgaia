/* NL CITY V1: pure additive city engine. No native timers, DOM or Save writes.
 * PROJECT_ORIGINAL/SIMULATED, never a reproduction of VNG formulas. */
(function(root,create) {
  const exported=create();
  if (typeof module==='object' && module.exports) module.exports=exported;
  else root.NLCityEngine=exported;
})(typeof globalThis!=='undefined'?globalThis:this,function() {
  'use strict';
  const RESOURCE_KEYS=['silver','grain','iron','prestige'];
  const finiteInt=n=>Number.isSafeInteger(n)&&n>=0;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const error=(code,more)=>Object.assign({ok:false,code},more||{});
  function createEngine(catalog,researchPack) {
    if(!catalog||catalog.schemaVersion!==1||!Array.isArray(catalog.buildings)) throw Error('INVALID_CITY_CATALOG');
    const refs=new Map(catalog.buildings.map(b=>[b.id,b]));
    if(refs.size!==catalog.buildings.length||catalog.buildings.some(b=>!b.id.startsWith('nl_city_'))) throw Error('DUPLICATE_OR_UNSCOPED_CITY_ID');
    const researchById=new Map(((researchPack&&researchPack.catalog)||[]).map(t=>[t.id,t]));
    const rule=researchPack&&researchPack.progression;
    const offlineCap=catalog.policy.maxOfflineMs;
    const balance=catalog.policy.balance||{};
    function ensure(game,now) {
      if(!game||typeof game!=='object'||!finiteInt(now)) throw Error('INVALID_GAME_OR_CLOCK');
      if(!game.nlCity) game.nlCity={schemaVersion:1,lastAt:now,levels:{},stock:{},
        remainder:{},construction:null,receipts:[],receiptIndex:{},seq:0,
        warehouse:{},operations:{},cooldowns:{},dailyUsage:{},productionBonusRemainder:{}};
      const s=game.nlCity;
      if(!s.warehouse)s.warehouse={};
      if(!s.operations)s.operations={};
      if(!s.cooldowns)s.cooldowns={};
      if(!s.dailyUsage)s.dailyUsage={};
      if(!s.productionBonusRemainder)s.productionBonusRemainder={};
      if(!Object.prototype.hasOwnProperty.call(s.levels,'nl_city_hall') && refs.has('nl_city_hall'))
        s.levels.nl_city_hall=1; // existing players begin with an ordinary level-1 city; no resource grant
      if(s.schemaVersion!==1||!finiteInt(s.lastAt)||!s.levels||!s.stock||!s.remainder||!s.receipts||!s.receiptIndex) throw Error('INVALID_CITY_SAVE');
      for(const b of catalog.buildings) {
        for(const key of ['levels','stock','remainder']) if(s[key][b.id]===undefined) s[key][b.id]=0;
        if(!finiteInt(s.levels[b.id])||s.levels[b.id]>b.levelCap||!finiteInt(s.stock[b.id])||
           !finiteInt(s.remainder[b.id])||s.remainder[b.id]>=60000) throw Error('INVALID_CITY_LEVEL_OR_STOCK');
      }
      return s;
    }
    // The escrow always has an explicit two-hour base, extended by storage investments.
    // Bonus remainder is an integer basis-point accumulator: unchanged across tick frequency.
    function productionCapacity(s,b,level) {
      if(!b.production||!level)return 0;
      const stockBoost=balance.stockBonusPerLevel&&balance.stockBonusPerLevel[b.id];
      const bonus=stockBoost?(s.levels[stockBoost.building]||0)*stockBoost.amount:0;
      return level*b.production.capacityPerLevel+bonus;
    }
    function accrue(s,a,b) {
      const ms=Math.max(0,b-a);if(!ms)return;
      for(const building of catalog.buildings) {
        const level=s.levels[building.id],p=building.production;
        if(!level||!p)continue;
        const cap=productionCapacity(s,building,level);
        if(s.stock[building.id]>=cap){s.remainder[building.id]=0;continue;}
        const numerator=s.remainder[building.id]+ms*p.perMinutePerLevel*level;
        const grown=Math.floor(numerator/60000);
        let additional=0;
        if(building.id==='nl_city_residence'&&grown>0) {
          const rateBps=Math.round(Math.min(.06,(s.levels.nl_city_mint||0)*.01)*10000);
          const withRemainder=(s.productionBonusRemainder[building.id]||0)+grown*rateBps;
          additional=Math.floor(withRemainder/10000);
          s.productionBonusRemainder[building.id]=withRemainder%10000;
        }
        s.stock[building.id]=Math.min(cap,s.stock[building.id]+grown+additional);
        s.remainder[building.id]=s.stock[building.id]===cap?0:numerator%60000;
      }
    }
    function advance(game,now) {
      const s=ensure(game,now);
      if(now<=s.lastAt)return {ok:true,advanced:false};
      const start=Math.max(s.lastAt,now-offlineCap),job=s.construction;
      if(job&&job.finishAt<=now) {
        const split=Math.max(start,Math.min(now,job.finishAt));
        accrue(s,start,split);
        if(s.levels[job.id]!==job.targetLevel-1)throw Error('CITY_BUILD_STATE_MISMATCH');
        s.levels[job.id]=job.targetLevel;
        s.construction=null;
        accrue(s,split,now);
      }else accrue(s,start,now);
      for(const operation of Object.values(s.operations)) {
        if(operation && operation.finishAt<=now)operation.ready=true;
      }
      s.lastAt=now;
      return {ok:true,advanced:true};
    }
    function nextCost(b,target) {
      if(!Number.isInteger(target)||target<1||target>b.levelCap)return null;
      const out={};
      for(const [name,base] of Object.entries(b.baseCost))out[name]=Math.round(base*Math.pow(target,balance.buildCostExponent||1.35));
      return out;
    }
    function constructionSeconds(b,target) {
      const t=balance.buildTime;
      if(!t)return b.buildSeconds[target];
      const tier=b.unlock&&b.unlock.hallLevel||1;
      const factor=tier>=t.lateGate?t.lateTierFactor:tier>=t.midGate?t.midTierFactor:1;
      return Math.max(1,Math.ceil(b.buildSeconds[target]*factor*
        (1+t.higherLevelExtraPerLevel*Math.max(0,target-t.startExtraAtLevel))));
    }
    function canPay(game,cost) {
      return Object.entries(cost).every(([k,n])=>RESOURCE_KEYS.includes(k)&&finiteInt(n)&&finiteInt(game[k])&&game[k]>=n);
    }
    function debit(game,cost) {
      if(!canPay(game,cost))return false;
      for(const [k,n] of Object.entries(cost))game[k]-=n;
      return true;
    }
    function record(s,input,kind,details) {
      const r=Object.assign({ok:true,kind,id:input.id,actionId:input.actionId,
        at:input.now,seq:++s.seq},details||{});
      s.receiptIndex[input.actionId]=clone(r); // Keep all IDs across Save roundtrips.
      s.receipts.push(r);
      if(s.receipts.length>128)s.receipts.splice(0,s.receipts.length-128);
      return clone(r);
    }
    function unlocked(game,b) {
      if(!b.unlock)return true;
      if(b.unlock.hallLevel!==undefined && (!game.nlCity||game.nlCity.levels.nl_city_hall < b.unlock.hallLevel))
        return false;
      if(!b.unlock.legacyBuilding)return true;
      const lv=game.buildings&&game.buildings[b.unlock.legacyBuilding];
      return finiteInt(lv)&&lv>=b.unlock.minLevel;
    }
    function build(game,s,input) {
      const b=refs.get(input.id);
      if(!b)return error('UNKNOWN_BUILDING');
      if(s.construction)return error('CONSTRUCTION_BUSY',{job:clone(s.construction)});
      const target=s.levels[input.id]+1;
      if(target>b.levelCap)return error('MAX_LEVEL');
      if(!unlocked(game,b))return error('LOCKED');
      const cost=nextCost(b,target);
      if(!debit(game,cost))return error('INSUFFICIENT_RESOURCES',{cost});
      const startedAt=Math.max(s.lastAt,input.now);
      s.construction={id:b.id,targetLevel:target,startedAt,finishAt:startedAt+constructionSeconds(b,target)*1000};
      return record(s,input,'build',{targetLevel:target,debit:cost,job:clone(s.construction)});
    }
    function harvest(game,s,input) {
      const b=refs.get(input.id),p=b&&b.production;
      if(!p)return error('NOT_A_PRODUCER');
      const amount=s.stock[input.id],key=p.resource;
      if(!amount)return error('EMPTY_STOCK');
      if(!finiteInt(game[key])||game[key]>Number.MAX_SAFE_INTEGER-amount)return error('RESOURCE_OVERFLOW');
      game[key]+=amount;
      s.stock[input.id]=0;
      return record(s,input,'harvest',{credit:{[key]:amount}});
    }
    function research(game,s,input) {
      if(!rule)return error('MISSING_RESEARCH_PACK');
      const t=researchById.get(input.id);
      if(!t||!catalog.research.ids.includes(input.id))return error('UNKNOWN_RESEARCH');
      const lv=game.technology&&game.technology[input.id];
      if(!finiteInt(lv))return error('INVALID_RESEARCH_SAVE');
      const next=lv+1;
      if(next>t.maxLevel)return error('MAX_LEVEL');
      const academy=game.buildings&&game.buildings.academy;
      if(!finiteInt(academy)||academy<Math.ceil(next/rule.academyLevelsPerTechLevel))return error('ACADEMY_GATE');
      const cost={};
      for(const [k,v] of Object.entries(rule.cost))cost[k]=(k==='prestige'&&next===1&&v.freeFirstLevel)?
        0:Math.round(v.base*Math.pow(next,v.nextLevelExponent));
      if(!debit(game,cost))return error('INSUFFICIENT_RESOURCES',{cost});
      game.technology[input.id]=next;game.techSpent=(finiteInt(game.techSpent)?game.techSpent:0)+(cost.prestige||0);
      return record(s,input,'research',{targetLevel:next,debit:cost});
    }

    // Operation keys are local to city, so existing silver/grain/iron/prestige remain authoritative.
    function quantity(game,s,key) {
      const value=RESOURCE_KEYS.includes(key)?game[key]:(s.warehouse[key]||0);
      if(!finiteInt(value))throw Error('INVALID_CITY_RESOURCE_'+key);
      return value;
    }
    function assignQuantity(game,s,key,value) {
      if(!finiteInt(value))throw Error('CITY_RESOURCE_OUT_OF_RANGE');
      if(RESOURCE_KEYS.includes(key))game[key]=value;
      else s.warehouse[key]=value;
    }
    function scaledAmounts(config,level) {
      const amounts={};
      for(const [k,amount] of Object.entries(config||{})) {
        const value=Math.round(amount*(1+0.15*(level-1)));
        if(!finiteInt(value)||value===0)throw Error('INVALID_OPERATION_QUANTITY');
        amounts[k]=value;
      }
      return amounts;
    }
    function canTransfer(game,s,cost,reward) {
      return Object.keys({...cost,...reward}).every(key=>{
        if(!RESOURCE_KEYS.includes(key)&&!catalog.localResources.includes(key))return false;
        const current=quantity(game,s,key),taken=cost[key]||0,added=reward[key]||0;
        const next=current-taken+added;
        const localCap=balance.localWarehouseSoftCeiling||Number.MAX_SAFE_INTEGER;
        return current>=taken && Number.isSafeInteger(next) && next>=0 &&
          (RESOURCE_KEYS.includes(key)||next<=localCap||next<=current);
      });
    }
    function transfer(game,s,cost,reward) {
      if(!canTransfer(game,s,cost,reward))return false;
      for(const k of Object.keys({...cost,...reward}))
        assignQuantity(game,s,k,quantity(game,s,k)-(cost[k]||0)+(reward[k]||0));
      return true;
    }
    function revenueBonus(game,s,spec,action,reward) {
      // A named building bonus must have a real authoritative effect, not only a cosmetic tooltip.
      if(!['tax','sell_goods','sea_trade','hunt'].includes(action.id))return reward;
      const b=bonuses(game,s.lastAt);
      const rate=action.id==='tax'?(b.taxCollectionBonus||0):
        action.id==='hunt'?(b.huntRewardBonus||0):(b.tradeRevenueMultiplierBonus||0);
      if(!rate)return reward;
      const out={...reward};
      for(const k of action.id==='hunt'?['silver','prestige']:['silver']) {
        if(out[k])out[k]=Math.round(out[k]*(1+rate));
      }
      return out;
    }
    function operationSeconds(game,s,a) {
      if(a.id!=='sea_trade')return a.durationSeconds;
      const rate=bonuses(game,s.lastAt).navalTradeTimeReduction||0;
      return Math.max(1,Math.ceil(a.durationSeconds*(1-rate)));
    }
    function dailyCap(game,s,a) {
      const base=(balance.dailyLimits&&balance.dailyLimits[a.id])||balance.defaultDailyLimit||Number.MAX_SAFE_INTEGER;
      const effect=balance.dailyLimitExtras&&balance.dailyLimitExtras[a.id];
      if(!effect)return base;
      const extra=bonuses(game,s.lastAt)[effect]||0;
      return base+extra;
    }
    function dailyWindow(s,key,now) {
      const day=Math.floor(now/86400000),previous=s.dailyUsage[key];
      return {day,used:previous&&previous.day===day?previous.used:0};
    }
    function operate(game,s,input) {
      const b=refs.get(input.id)||catalog.legacy.find(x=>x.id===input.id&&Array.isArray(x.actions));
      const level=b?(refs.has(input.id)?s.levels[input.id]:(game.buildings&&game.buildings[input.id])):0;
      if(!b||!level)return error('BUILDING_NOT_CONSTRUCTED');
      const a=(b.actions||[]).find(x=>x.id===input.operationId);
      if(!a)return error('UNKNOWN_OPERATION');
      if(s.operations[input.id])return error('OPERATION_PENDING',{operation:clone(s.operations[input.id])});
      const key=b.id+'|'+a.id;
      const used=dailyWindow(s,key,input.now),limit=dailyCap(game,s,a);
      if(used.used>=limit)return error('DAILY_LIMIT',{used:used.used,limit,resetAt:(used.day+1)*86400000});
      if((s.cooldowns[key]||0)>input.now)return error('OPERATION_COOLDOWN',{availableAt:s.cooldowns[key]});
      const lv=level,cost=scaledAmounts(a.cost,lv);
      const reward=revenueBonus(game,s,b,a,scaledAmounts(a.reward,lv));
      // For delayed settlement, reward is reserved but not credited until explicit claim.
      const instant=a.durationSeconds===0;
      if(!canTransfer(game,s,cost,instant?reward:{}))return error('INSUFFICIENT_RESOURCES_OR_OVERFLOW',{cost});
      if(!instant)for(const [k,n] of Object.entries(reward)) {
        const current=quantity(game,s,k);
        const limit=RESOURCE_KEYS.includes(k)?Number.MAX_SAFE_INTEGER:
          (balance.localWarehouseSoftCeiling||Number.MAX_SAFE_INTEGER);
        if(current>limit-n)return error('RESOURCE_OVERFLOW');
      }
      if(!transfer(game,s,cost,instant?reward:{}))return error('TRANSFER_FAILED');
      s.cooldowns[key]=input.now+a.cooldownSeconds*1000;
      s.dailyUsage[key]={day:used.day,used:used.used+1};
      if(!instant)s.operations[input.id]={
        operationId:a.id,startedAt:input.now,
        finishAt:input.now+operationSeconds(game,s,a)*1000,
        reward,ready:false
      };
      return record(s,input,'operate',{operationId:a.id,debit:cost,
        dailyUsed:used.used+1,dailyLimit:limit,
        ...(instant?{credit:reward}:{job:clone(s.operations[input.id])})});
    }
    function collect(game,s,input) {
      const op=s.operations[input.id];
      if(!op)return error('NO_OPERATION_TO_COLLECT');
      if(input.operationId && input.operationId!==op.operationId)return error('OPERATION_MISMATCH');
      if(!op.ready)return error('OPERATION_NOT_READY',{finishAt:op.finishAt});
      if(!canTransfer(game,s,{},op.reward))return error('RESOURCE_OVERFLOW');
      if(!transfer(game,s,{},op.reward))return error('TRANSFER_FAILED');
      delete s.operations[input.id];
      return record(s,input,'collect',{operationId:op.operationId,credit:op.reward});
    }
    function act(game,input) {
      if(!input||typeof input.actionId!=='string'||!/^[\w.:-]{1,128}$/.test(input.actionId)||
        ['__proto__','prototype','constructor'].includes(input.actionId)||!finiteInt(input.now))
        return error('INVALID_INTENT');
      const s=ensure(game,input.now);
      if(Object.prototype.hasOwnProperty.call(s.receiptIndex,input.actionId))
        return Object.assign({duplicate:true},clone(s.receiptIndex[input.actionId]));
      if(input.now<s.lastAt)return error('CLOCK_ROLLBACK',{lastAt:s.lastAt});
      advance(game,input.now);
      if(input.kind==='build')return build(game,s,input);
      if(input.kind==='harvest')return harvest(game,s,input);
      if(input.kind==='research')return research(game,s,input);
      if(input.kind==='operate')return operate(game,s,input);
      if(input.kind==='collect')return collect(game,s,input);
      return error('UNKNOWN_ACTION');
    }
    function bonuses(game,now) {
      const s=ensure(game,now),out={};
      for(const b of catalog.buildings)for(const e of b.effects||[]) {
        const amount=s.levels[b.id]*e.perLevel;
        out[e.target]=(out[e.target]||0)+(e.cap===undefined?amount:Math.min(amount,e.cap));
      }
      if(balance.globalBonusCaps)for(const [name,limit] of Object.entries(balance.globalBonusCaps))
        if(out[name]!==undefined)out[name]=Math.min(limit,out[name]);
      return out;
    }
    function view(game,now) {
      advance(game,now);const s=ensure(game,now);
      return {schemaVersion:1,resources:Object.fromEntries(RESOURCE_KEYS.map(k=>[k,game[k]])),
        warehouse:clone(s.warehouse),clock:s.lastAt,construction:s.construction&&clone(s.construction),
        buildings:catalog.buildings.map(b=>{
          const level=s.levels[b.id],p=b.production;
          return {id:b.id,name:b.name,category:b.category,grid:b.grid,level,
            maxLevel:b.levelCap,unlocked:unlocked(game,b),nextCost:nextCost(b,level+1),
            nextSeconds:level<b.levelCap?constructionSeconds(b,level+1):null,
            stock:p?s.stock[b.id]:null,capacity:p?productionCapacity(s,b,level):null,
            productionPerMinute:p?level*p.perMinutePerLevel:null,
            productionResource:p?p.resource:null,effects:b.effects,
            operations:(b.actions||[]).map(a=>({id:a.id,label:a.label,
              cost:scaledAmounts(a.cost,Math.max(1,level)),
              reward:revenueBonus(game,s,b,a,scaledAmounts(a.reward,Math.max(1,level))),
              durationSeconds:operationSeconds(game,s,a),
              availableAt:s.cooldowns[b.id+'|'+a.id]||0,
              dailyLimit:dailyCap(game,s,a),
              dailyUsed:dailyWindow(s,b.id+'|'+a.id,now).used})),
            pendingOperation:s.operations[b.id]&&clone(s.operations[b.id]),
            provenance:b.provenance.classification};
        }),legacy:catalog.legacy.map(b=>({id:b.id,name:b.label,policy:b.owner,
          level:(game.buildings&&game.buildings[b.id])||0,
          operations:(b.actions||[]).map(a=>({id:a.id,label:a.label,
            cost:scaledAmounts(a.cost,Math.max(1,(game.buildings&&game.buildings[b.id])||0)),
            reward:scaledAmounts(a.reward,Math.max(1,(game.buildings&&game.buildings[b.id])||0)),
            availableAt:s.cooldowns[b.id+'|'+a.id]||0,
            dailyLimit:dailyCap(game,s,a),
            dailyUsed:dailyWindow(s,b.id+'|'+a.id,now).used})),
          pendingOperation:s.operations[b.id]&&clone(s.operations[b.id])})),
        bonuses:bonuses(game,now)};
    }
    return {ensure,advance,act,view,bonuses,nextCost};
  }
  return {createEngine};
});
