/* Muu Dinh Tam Quoc: original, deterministic troop combat V1.
   Side-effect-free sandbox and upgrade transactions. Not live campaign/Save integration.
   Wiki source entries are never promoted to playable troops by this module.
*/
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.NLTroopCombatV1=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";
  const clone=x=>JSON.parse(JSON.stringify(x));
  const check=(x,why)=>{if(!x)throw Error("NL_TROOP_V1: "+why);};
  const int=x=>Number.isSafeInteger(x);
  const limit=(x,a,b)=>Math.max(a,Math.min(x,b));
  const alive=x=>x.hp>0;
  const dist=(x,y)=>Math.abs((x.slot/3|0)-(y.slot/3|0))+Math.abs(x.slot%3-y.slot%3);
  const trait=x=>x.troopId.slice(4);
  const counter={infantry:"spear",spear:"cavalry",cavalry:"infantry"};
  const threatened={infantry:"cavalry",spear:"infantry",cavalry:"spear"};
  function create(catalog,evolution){
    check(catalog&&Array.isArray(catalog.units)&&catalog.units.length===25,"25 original troops required");
    const models=new Map(catalog.units.map(x=>[x.id,x]));
    const aliases=new Map(catalog.units.map(x=>[x.legacyId,x]));
    check(models.size===25&&aliases.size===25,"duplicate troop id");
    for(const x of models.values())check(x.sourceEdition==="PROJECT_ORIGINAL"&&x.combatBehavior.classification==="SIMULATED","Wiki troop executable is forbidden");
    function model(id){const x=models.get(id)||aliases.get(id);check(x,"unknown project troop: "+id);return x;}
    function stats(id,tier=1){
      check(int(tier)&&tier>=1&&tier<=7,"tier outside 1..7");
      const x=model(id),s=1+(tier-1)*0.12;
      return Object.fromEntries(Object.entries(x.stats).map(([k,v])=>[k,k==="morale"?v:Math.round(v*s)]));
    }
    function familyMultiplier(a,b){
      const x=model(a).family,y=model(b).family;
      return counter[x]===y?1.22:threatened[x]===y?0.82:1;
    }
    function createBattle(input,seed=1){
      check(int(seed)&&seed>=0&&seed<=4294967295,"invalid seed");
      const units=[];
      for(const side of ["A","B"]){
        check(input&&Array.isArray(input[side])&&input[side].length>=1&&input[side].length<=5,"require one to five per side");
        const slots=new Set();
        for(const row of input[side]){
          check(row&&typeof row.id==="string"&&row.id&&int(row.slot)&&row.slot>=0&&row.slot<=8&&!slots.has(row.slot),"invalid or repeated 3x3 slot");
          slots.add(row.slot);
          const x=model(row.troopId),tier=row.tier===undefined?1:row.tier,s=stats(x.id,tier),maxHp=s.hp*10;
          const hp=row.hp===undefined?maxHp:row.hp,morale=row.morale===undefined?50:row.morale,guard=row.guard===undefined?0:row.guard;
          check(int(hp)&&hp>=0&&hp<=maxHp&&int(morale)&&morale>=0&&morale<=100&&int(guard)&&guard>=0&&guard<=maxHp,"hp/morale/guard out of range");
          units.push({id:row.id,side,slot:row.slot,troopId:x.id,family:x.family,tier,stats:s,maxHp,hp,morale,guard,statuses:[],turns:0,reactiveRound:0});
        }
      }
      check(new Set(units.map(x=>x.id)).size===units.length,"unit ids repeated across sides");
      const ids=side=>units.filter(x=>x.side===side).sort((x,y)=>x.slot-y.slot).map(x=>x.id);
      const A=ids("A"),B=ids("B"),queue=[];
      for(let i=0;i<5;i++){if(A[i])queue.push(A[i]);if(B[i])queue.push(B[i]);}
      return {schemaVersion:1,ruleId:"NL_TROOP_SIM_V1",seed:seed>>>0,round:1,cursor:0,queue,units,events:[],finished:false,winner:null,settlement:null};
    }
    const unit=(s,id)=>s.units.find(x=>x.id===id);
    const team=(s,side)=>s.units.filter(x=>x.side===side&&alive(x));
    const opponents=(s,side)=>team(s,side==="A"?"B":"A");
    const first=arr=>arr.slice().sort((x,y)=>x.slot-y.slot||x.id.localeCompare(y.id))[0]||null;
    const min=(arr,fn)=>arr.slice().sort((x,y)=>fn(x)-fn(y)||x.slot-y.slot)[0]||null;
    const max=(arr,fn)=>min(arr,x=>-fn(x));
    function target(s,actor){
      const enemies=opponents(s,actor.side),k=trait(actor);
      if(["archer","raider","swift-wing"].includes(k))return max(enemies,x=>x.slot);
      if(k==="marksman")return min(enemies,x=>x.hp);
      if(k==="crusher")return max(enemies,x=>x.stats.defense);
      if(k==="strategist")return min(enemies,x=>x.stats.defense);
      if(k==="disrupt")return max(enemies,x=>x.morale);
      if(k==="seal-master")return max(enemies,x=>x.stats.magic);
      if(k==="shieldbreaker")return max(enemies,x=>x.guard);
      if(k==="impaler")return first(enemies.filter(x=>x.family==="cavalry"))||first(enemies);
      return first(enemies);
    }
    const log=(ev,type,fields={})=>ev.push({type,classification:"SIMULATED",...fields});
    const proc=(ev,from,at,value)=>log(ev,"trait-proc",{mechanic:trait(from)==="none"?"none":model(from.troopId).combatBehavior.mechanic,actorId:from.id,targetId:at?.id||null,value});
    function morale(ev,from,to,delta){const old=to.morale;to.morale=limit(old+delta,0,100);log(ev,"morale",{actorId:from.id,targetId:to.id,requested:delta,applied:to.morale-old});}
    function heal(ev,from,to,rate){
      if(!to||!alive(to))return;
      const n=Math.min(to.maxHp-to.hp,Math.max(1,Math.round(to.maxHp*rate)));to.hp+=n;
      log(ev,"heal",{actorId:from.id,targetId:to.id,amount:n,remainingHp:to.hp});
    }
    function roll(s,prob){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296<prob;}
    function direct(s,ev,from,to,amount,lane="physical",react=true){
      if(!to||!alive(to)||amount<=0)return 0;
      let dmg=Math.max(1,Math.round(amount)),cavalry=from?.family==="cavalry";
      if(lane==="physical"&&trait(to)==="infantry"){dmg=Math.max(1,Math.round(dmg*0.85));proc(ev,to,from,0.15);}
      if(cavalry&&to.slot<3){const p=team(s,to.side).find(x=>trait(x)==="phalanx"&&x.slot<3);
        if(p){dmg=Math.max(1,Math.round(dmg*0.8));proc(ev,p,to,0.2);}}
      if(cavalry){const p=team(s,to.side).find(x=>trait(x)==="spearwall");
        if(p){dmg=Math.max(1,Math.round(dmg*0.82));proc(ev,p,to,0.18);}}
      if(react&&from&&from.side!==to.side){
        const wall=team(s,to.side).find(x=>x.id!==to.id&&trait(x)==="bulwark"&&dist(x,to)<=1);
        if(wall&&dmg>1){const moved=Math.min(dmg-1,Math.floor(dmg*0.22));
          if(moved>0){dmg-=moved;wall.hp=Math.max(0,wall.hp-moved);proc(ev,wall,to,moved);log(ev,"intercept",{actorId:wall.id,targetId:to.id,amount:moved});}}
      }
      const bypass=from&&trait(from)==="shieldbreaker"?Math.round(dmg*0.1):0;
      const absorbed=Math.min(to.guard,Math.max(0,dmg-bypass));to.guard-=absorbed;
      const dealt=Math.min(to.hp,dmg-absorbed);to.hp-=dealt;
      log(ev,"damage",{actorId:from?.id||null,targetId:to.id,lane,amount:dealt,absorbed,remainingHp:to.hp});
      if(react&&from&&from.side!==to.side&&alive(to)&&alive(from)){
        let rate=0;
        if(trait(to)==="infantry"&&lane==="physical")rate=0.15;
        if(trait(to)==="spear"&&cavalry)rate=0.19;
        if(rate){proc(ev,to,from,rate);direct(s,ev,to,from,Math.max(1,Math.round(dealt*rate)),"physical",false);}
      }
      if(react&&alive(to)&&to.hp<to.maxHp/2){
        const ward=team(s,to.side).find(x=>trait(x)==="ward-bearer"&&x.reactiveRound!==s.round);
        if(ward){ward.reactiveRound=s.round;proc(ev,ward,to,0.1);heal(ev,ward,to,0.1);}
      }
      return dealt;
    }
    function hit(s,ev,from,to,options={}){
      if(!to||!alive(to))return 0;
      const lane=options.lane||"physical";
      const power=lane==="magic"?from.stats.magic:lane==="tactic"?from.stats.tactic:from.stats.attack;
      const defense=to.stats.defense*(1-(options.pierce||0));
      const amount=Math.max(1,Math.round((17+power*0.54-defense*0.19)*(options.multiplier||1)*familyMultiplier(from.troopId,to.troopId)));
      return direct(s,ev,from,to,amount,lane,true);
    }
    function action(s,from,ev){
      const k=trait(from),d=model(from.troopId).combatBehavior,to=target(s,from);
      const wounded=team(s,from.side).filter(x=>x.hp<x.maxHp);
      const weak=min(wounded,x=>x.hp/x.maxHp);
      if((k==="support"||k==="medic")&&weak){proc(ev,from,weak,d.value);heal(ev,from,weak,d.value);return;}
      if(k==="drum"||k==="rally"){proc(ev,from,null,d.value);for(const x of team(s,from.side))morale(ev,from,x,d.value);return;}
      if(k==="ward-bearer"){const x=weak||min(team(s,from.side),t=>t.guard)||from;
        proc(ev,from,x,0.1);x.guard=Math.min(x.maxHp,x.guard+Math.round(x.maxHp*0.1));
        log(ev,"guard",{actorId:from.id,targetId:x.id,amount:x.guard});if(weak)heal(ev,from,weak,0.1);return;}
      if(!to)return;
      const p=v=>proc(ev,from,to,v===undefined?d.value:v);
      if(k==="cavalry"){if(from.turns===0){p();hit(s,ev,from,to,{multiplier:1.16});}else hit(s,ev,from,to);return;}
      if(k==="archer"){p();hit(s,ev,from,to,{multiplier:1.12});return;}
      if(k==="strategist"){p();hit(s,ev,from,to,{lane:"magic",multiplier:1.12});return;}
      if(k==="crusher"){p();hit(s,ev,from,to,{pierce:0.08});return;}
      if(k==="shock"){if(from.turns===0){p();morale(ev,from,to,-10);}hit(s,ev,from,to,{lane:"tactic"});return;}
      if(k==="raider"){p();hit(s,ev,from,to,{multiplier:to.slot>=6?1.12:1});return;}
      if(k==="marksman"){const crit=roll(s,0.1);p(crit?1.5:1);hit(s,ev,from,to,{multiplier:crit?1.5:1});return;}
      if(k==="volley"){p();hit(s,ev,from,to);if(alive(to))hit(s,ev,from,to,{multiplier:0.52});return;}
      if(k==="ember"){p();hit(s,ev,from,to,{lane:"magic"});if(alive(to)&&roll(s,0.58)){
        const old=to.statuses.find(x=>x.id==="troop-original-burn");
        if(old){old.stacks=Math.min(3,(old.stacks||1)+1);old.remaining=2;}
        else to.statuses.push({id:"troop-original-burn",remaining:2,stacks:1});
        log(ev,"status",{actorId:from.id,targetId:to.id,statusId:"troop-original-burn",stacks:old?old.stacks:1});}return;}
      if(k==="disrupt"){p();morale(ev,from,to,-18);hit(s,ev,from,to,{lane:"magic"});return;}
      if(k==="shieldbreaker"){p();hit(s,ev,from,to);return;}
      if(k==="swift-wing"){if(from.turns===0){p();hit(s,ev,from,to,{multiplier:1.12});}else hit(s,ev,from,to);return;}
      if(k==="rain-volley"){p();hit(s,ev,from,to);
        const row=(to.slot/3)|0;
        for(const x of team(s,to.side).filter(x=>x.id!==to.id&&((x.slot/3)|0)===row))hit(s,ev,from,x,{multiplier:0.35});
        return;}
      if(k==="seal-master"){p();morale(ev,from,to,-10);hit(s,ev,from,to,{lane:"magic"});return;}
      if(k==="impaler"){p();hit(s,ev,from,to,{pierce:to.family==="cavalry"?0.12:0});return;}
      hit(s,ev,from,to);
    }
    function roundEnd(s,ev){
      for(const x of s.units){if(!alive(x))continue;
        for(const status of x.statuses){
          if(status.id==="troop-original-burn"){const amount=Math.min(x.hp,Math.max(1,Math.round(x.maxHp*0.04*(status.stacks||1))));
            x.hp-=amount;log(ev,"burn-tick",{targetId:x.id,amount,remainingHp:x.hp});}
          status.remaining--;
        }
        x.statuses=x.statuses.filter(y=>y.remaining>0);
      }
      log(ev,"round-end",{round:s.round});
      s.round++;
    }
    function checkEnd(s){
      const a=team(s,"A").length,b=team(s,"B").length;
      if(a&&b&&s.round<=25)return;
      s.finished=true;s.winner=a&&!b?"A":b&&!a?"B":"DRAW";
    }
    function stepBattle(input){
      check(input&&input.ruleId==="NL_TROOP_SIM_V1"&&!input.finished,"invalid or finished battle");
      const s=clone(input),ev=[];let actor=null;
      for(let i=0;i<s.queue.length;i++){
        const candidate=unit(s,s.queue[s.cursor]);s.cursor=(s.cursor+1)%s.queue.length;
        if(candidate&&alive(candidate)){actor=candidate;break;}
      }
      if(actor){log(ev,"action",{actorId:actor.id,round:s.round});action(s,actor,ev);actor.turns++;if(s.cursor===0)roundEnd(s,ev);}
      checkEnd(s);
      for(const e of ev){s.events.push({...e,sequence:s.events.length+1});}
      return {state:s,events:clone(ev),actorId:actor?.id||null};
    }
    function runBattle(input,maxActions=300){
      check(int(maxActions)&&maxActions>=1&&maxActions<=1000,"invalid action limit");
      let s=clone(input);for(let i=0;i<maxActions&&!s.finished;i++)s=stepBattle(s).state;return s;
    }
    function createRosterState(input){
      check(input&&int(input.barracksLevel)&&input.barracksLevel>=0&&Array.isArray(input.units),"bad barracks/roster");
      const resources=input.resources||{};
      for(const k of ["silver","grain","iron"])check(int(resources[k])&&resources[k]>=0,"invalid resource "+k);
      const ids=new Set();
      for(const x of input.units){check(x&&typeof x.id==="string"&&x.id&&!ids.has(x.id),"duplicate roster id");ids.add(x.id);
        model(x.troopId);check(int(x.tier)&&x.tier>=1&&x.tier<=4,"Save/runtime max tier 4");}
      return {schemaVersion:1,resources:clone(resources),barracksLevel:input.barracksLevel,units:clone(input.units),receipts:[]};
    }
    function transaction(input,receiptId,rosterUnitId,op,to){
      check(input&&Array.isArray(input.receipts)&&typeof receiptId==="string"&&receiptId.length>0,"invalid transaction id");
      const duplicate=input.receipts.find(x=>x.id===receiptId);
      if(duplicate){
        check(duplicate.operation===op&&duplicate.unitId===rosterUnitId&&(op!=="evolve"||duplicate.toTroopId===model(to).id),"receipt ID used for a different request");
        return {state:clone(input),applied:false,idempotent:true,receipt:clone(duplicate)};
      }
      const state=clone(input),u=state.units.find(x=>x.id===rosterUnitId);
      check(u,"unknown roster unit");
      let nextId=model(u.troopId).id,nextTier=u.tier,cost;
      if(op==="evolve"){
        check(evolution&&Array.isArray(evolution.projectEdges),"evolution contract missing");
        nextId=model(to).id;
        check(evolution.projectEdges.some(x=>x.from===model(u.troopId).id&&x.to===nextId&&x.classification==="SIMULATED"),"not an approved project evolution");
        cost=model(nextId).unlock.resourceCost;
      }else{
        check(op==="tier"&&u.tier<4,"tier already at live cap");
        nextTier++;
        const base=evolution.projectTierPolicy.costPerUpgradeBase,rate=evolution.projectTierPolicy.costGrowthFactor;
        cost=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.round(v*Math.pow(rate,u.tier-1))]));
      }
      check(state.barracksLevel>=2,"barracks level too low");
      check(Object.entries(cost).every(([k,v])=>int(v)&&v>=0&&state.resources[k]>=v),"insufficient resources");
      for(const [k,v] of Object.entries(cost))state.resources[k]-=v;
      u.troopId=nextId;u.tier=nextTier;
      const receipt={id:receiptId,operation:op,unitId:rosterUnitId,toTroopId:nextId,toTier:nextTier,cost:clone(cost),classification:"SIMULATED"};
      state.receipts.push(receipt);
      return {state,applied:true,idempotent:false,receipt:clone(receipt)};
    }
    return Object.freeze({
      provenance:"SIMULATED",projectTroopCount:25,liveGameIntegrated:false,
      createBattle,stepBattle,runBattle,stats,chooseTarget:target,familyMultiplier,createRosterState,
      evolveRoster:(r,id,unitId,to)=>transaction(r,id,unitId,"evolve",to),
      trainTier:(r,id,unitId)=>transaction(r,id,unitId,"tier")
    });
  }
  return Object.freeze({create});
});
