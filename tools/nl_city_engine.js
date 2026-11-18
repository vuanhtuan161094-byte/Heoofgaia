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
    function ensure(game,now) {
      if(!game||typeof game!=='object'||!finiteInt(now)) throw Error('INVALID_GAME_OR_CLOCK');
      if(!game.nlCity) game.nlCity={schemaVersion:1,lastAt:now,levels:{},stock:{},
        remainder:{},construction:null,receipts:[],receiptIndex:{},seq:0,
        warehouse:{},operations:{},cooldowns:{}};
      const s=game.nlCity;
      if(!s.warehouse)s.warehouse={};
      if(!s.operations)s.operations={};
      if(!s.cooldowns)s.cooldowns={};
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
    // Production is held in a distinct bounded escrow. Existing game tick is untouched.
    function accrue(s,a,b) {
      const ms=Math.max(0,b-a);if(!ms)return;
      for(const building of catalog.buildings) {
        const level=s.levels[building.id],p=building.production;
        if(!level||!p)continue;
        const cap=level*p.capacityPerLevel;
        if(s.stock[building.id]>=cap){s.remainder[building.id]=0;continue;}
        const numerator=s.remainder[building.id]+ms*p.perMinutePerLevel*level;
        const grown=Math.floor(numerator/60000);
        s.stock[building.id]=Math.min(cap,s.stock[building.id]+grown);
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
      for(const [name,base] of Object.entries(b.baseCost))out[name]=Math.round(base*Math.pow(target,1.35));
      return out;
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
      s.construction={id:b.id,targetLevel:target,startedAt,finishAt:startedAt+b.buildSeconds[target]*1000};
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
        return current>=taken && Number.isSafeInteger(current-taken+added) &&
          current-taken+added>=0;
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
      if(!['tax','sell_goods','sea_trade'].includes(action.id))return reward;
      const b=bonuses(game,s.lastAt);
      const rate=action.id==='tax'?(b.taxCollectionBonus||0):(b.tradeRevenueMultiplierBonus||0);
      if(!rate||!reward.silver)return reward;
      return {...reward,silver:Math.round(reward.silver*(1+rate))};
    }
    function operate(game,s,input) {
      const b=refs.get(input.id);
      if(!b||!s.levels[input.id])return error('BUILDING_NOT_CONSTRUCTED');
      const a=(b.actions||[]).find(x=>x.id===input.operationId);
      if(!a)return error('UNKNOWN_OPERATION');
      if(s.operations[input.id])return error('OPERATION_PENDING',{operation:clone(s.operations[input.id])});
      const key=b.id+'|'+a.id;
      if((s.cooldowns[key]||0)>input.now)return error('OPERATION_COOLDOWN',{availableAt:s.cooldowns[key]});
      const lv=s.levels[input.id],cost=scaledAmounts(a.cost,lv);
      const reward=revenueBonus(game,s,b,a,scaledAmounts(a.reward,lv));
      // For delayed settlement, reward is reserved but not credited until explicit claim.
      const instant=a.durationSeconds===0;
      if(!canTransfer(game,s,cost,instant?reward:{}))return error('INSUFFICIENT_RESOURCES_OR_OVERFLOW',{cost});
      if(!instant)for(const [k,n] of Object.entries(reward))
        if(quantity(game,s,k)>Number.MAX_SAFE_INTEGER-n)return error('RESOURCE_OVERFLOW');
      if(!transfer(game,s,cost,instant?reward:{}))return error('TRANSFER_FAILED');
      s.cooldowns[key]=input.now+a.cooldownSeconds*1000;
      if(!instant)s.operations[input.id]={
        operationId:a.id,startedAt:input.now,finishAt:input.now+a.durationSeconds*1000,
        reward,ready:false
      };
      return record(s,input,'operate',{operationId:a.id,debit:cost,
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
      if(!input||typeof input.actionId!=='string'||!/^[\w.:-]{1,128}$/.test(input.actionId)||!finiteInt(input.now))
        return error('INVALID_INTENT');
      const s=ensure(game,input.now);
      if(s.receiptIndex[input.actionId])return Object.assign({duplicate:true},clone(s.receiptIndex[input.actionId]));
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
            nextSeconds:level<b.levelCap?b.buildSeconds[level+1]:null,
            stock:p?s.stock[b.id]:null,capacity:p?level*p.capacityPerLevel:null,
            productionPerMinute:p?level*p.perMinutePerLevel:null,
            productionResource:p?p.resource:null,effects:b.effects,
            operations:(b.actions||[]).map(a=>({id:a.id,label:a.label,
              cost:scaledAmounts(a.cost,Math.max(1,level)),reward:scaledAmounts(a.reward,Math.max(1,level)),
              durationSeconds:a.durationSeconds,
              availableAt:s.cooldowns[b.id+'|'+a.id]||0})),
            pendingOperation:s.operations[b.id]&&clone(s.operations[b.id]),
            provenance:b.provenance.classification};
        }),legacy:catalog.legacy.map(b=>({id:b.id,name:b.label,policy:b.owner,
          level:(game.buildings&&game.buildings[b.id])||0})),bonuses:bonuses(game,now)};
    }
    return {ensure,advance,act,view,bonuses,nextCost};
  }
  return {createEngine};
});
