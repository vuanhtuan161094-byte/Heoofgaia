/* HG29 - earned deterministic PvE drop pools and targeted fragment crafting.
 * Original offline design (not historical HoG rates). Preserve Save v07.
 * Battle verdict comes from HG21/HG26/HG27; this module never grants a win.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg27Ensure||!E?.hg21TowerEnter||!E?.HG18_MATERIALS)throw Error('HG29 requires HG27 and HG18/HG21');
const old={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,battleAct:E.battleAct};
const MAX=1000000000;
const ITEMS=Object.freeze({
 wild:{name:'Mảnh Hoang Dã',icon:'🦴',source:'Quái thường'},
 hunter:{name:'Huy hiệu Thợ Săn',icon:'🏹',source:'Quái Elite'},
 gear:{name:'Mảnh Rèn Đồ',icon:'⚙️',source:'Quái và kho báu'},
 hero:{name:'Mảnh Ấn Anh Hùng',icon:'🏅',source:'Elite/Tháp'},
 abyss:{name:'Mảnh Lõi Ma Giới',icon:'🔮',source:'Boss T11–T13'},
 tower:{name:'Phù Văn Cổ Tháp',icon:'🗝️',source:'Bí Cảnh có thưởng'}
});
// Percent units use basis points. Each table, including 'none', totals 10,000.
const TABLES=Object.freeze({
 npc_low:{label:'Quái thường 1–3★',guaranteed:[],roll:[['wild',1,2,5000],['gear',1,1,3000],['hero',1,1,500],['none',0,0,1500]]},
 npc_elite:{label:'Quái tinh anh 4–10★',guaranteed:[],roll:[['hunter',1,2,4000],['gear',1,2,3400],['hero',1,1,1600],['wild',2,2,700],['none',0,0,300]]},
 npc_boss:{label:'Boss Ma Giới T11–T13',guaranteed:[['abyss',1]],roll:[['hunter',2,2,3000],['gear',2,2,2000],['hero',1,1,1000],['none',0,0,4000]]},
 treasure:{label:'Kho báu thường',guaranteed:[],roll:[['gear',1,2,4500],['wild',1,2,3000],['hunter',1,1,500],['none',0,0,2000]]},
 treasure_boss:{label:'Kho báu 9–10 (Boss)',guaranteed:[['abyss',1]],roll:[['gear',2,2,4000],['hero',1,1,2000],['none',0,0,4000]]},
 tower:{label:'Bí Cảnh có thưởng',guaranteed:[['tower',1]],roll:[['gear',1,2,3000],['hero',1,1,2000],['wild',2,2,1000],['none',0,0,4000]]}
});
const RECIPES=Object.freeze([
 {id:'stone',name:'Luyện 4 đá cường hóa',cost:{wild:6,gear:4},output:{kind:'material',id:'enhance_stone',count:4}},
 {id:'gearbox',name:'Ghép 1 rương trang bị',cost:{gear:12,hunter:4},output:{kind:'material',id:'gear_pack',count:1}},
 {id:'herorank',name:'Đúc 1 ấn nâng bậc tướng',cost:{hero:8,tower:5},output:{kind:'material',id:'rank_emblem',count:1}},
 {id:'astral',name:'Chuyển hóa 2 mảnh Tinh Vân',cost:{abyss:4,tower:8},output:{kind:'material',id:'astral_shard',count:2}},
 {id:'sentinel_sword',name:'Chọn ghép Kiếm Vệ Binh',cost:{gear:16,hunter:8,tower:3},output:{kind:'gear',id:'sentinel_sword',count:1}},
 {id:'sentinel_plate',name:'Chọn ghép Giáp Vệ Binh',cost:{gear:16,hunter:8,tower:3},output:{kind:'gear',id:'sentinel_plate',count:1}},
 {id:'sentinel_seal',name:'Chọn ghép Ấn Vệ Binh',cost:{gear:16,hunter:8,tower:3},output:{kind:'gear',id:'sentinel_seal',count:1}}
]);
const int=(n,max=MAX)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
for(const [key,table] of Object.entries(TABLES)){
 if(table.roll.reduce((n,r)=>n+r[3],0)!==10000)throw Error('HG29 table odds not 100%: '+key);
 for(const r of [...table.guaranteed,...table.roll])if(r[0]!=='none'&&!ITEMS[r[0]])throw Error('HG29 unknown fragment '+r[0]);
}
function ensure(s){
 if(!s.hg29){s.hg29={v:1,shards:Object.fromEntries(Object.keys(ITEMS).map(id=>[id,0])),
  world:s.hg18?.victories||0,towerWins:s.hg20?.tower?.victories||0,crafted:0,last:null,history:[]};}
 return s.hg29;
}
function valid(s){
 const h=s?.hg29;if(!h||h.v!==1||!h.shards||Array.isArray(h.shards))return false;
 if(Object.keys(h.shards).length!==Object.keys(ITEMS).length||!Object.keys(ITEMS).every(k=>int(h.shards[k])))return false;
 if(!int(h.world)||!int(h.towerWins)||!int(h.crafted)||!Array.isArray(h.history)||h.history.length>20)return false;
 const receipt=r=>r&&typeof r==='object'&&['world','tower'].includes(r.channel)&&
  typeof r.source==='string'&&Object.hasOwn(TABLES,r.source)&&int(r.ordinal)&&r.ordinal>0&&
  typeof r.target==='string'&&r.target.length<=40&&Array.isArray(r.drops)&&r.drops.length<=5&&
  r.drops.every(d=>d&&Object.hasOwn(ITEMS,d.id)&&int(d.count,20)&&d.count>0);
 if(h.last!==null&&!receipt(h.last))return false;
 return h.history.every(receipt);
}
function mix32(seed){let v=seed>>>0;v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return (v^(v>>>16))>>>0;}
function roll(seed){return mix32(seed)%10000;}
function coords(target){let x=0;for(let i=0;i<String(target).length;i++)x=Math.imul(x,31)+String(target).charCodeAt(i)|0;return x>>>0;}
function sourceFor(kind,target,level=0){
 if(kind==='tower')return 'tower';
 if(kind==='treasure')return level>=9?'treasure_boss':'treasure';
 if(kind!=='npc')return null;
 const t=E.getTile(target);if((t?.eliteTier||0)>=11)return 'npc_boss';
 return (t?.level||level)>=4?'npc_elite':'npc_low';
}
function preview(s,request={}){
 const target=request.target||'',kind=request.kind||E.getTile(target)?.kind||'',level=request.level??E.getTile(target)?.level??0;
 const source=sourceFor(kind,target,level);
 if(!source)return null;
 const table=TABLES[source],paid=source!=='tower'||s.hg20?.tower?.claims<5;
 const floor=request.floor||s.hg20?.tower?.floor||1;
 return {source,label:table.label,paid,guaranteed:paid?table.guaranteed.map(([id,n])=>({id,name:ITEMS[id].name,count:n+(source==='tower'&&floor%5===0?1:0)})):[],
  chances:paid?table.roll.filter(r=>r[0]!=='none').map(([id,min,max,bps])=>({id,name:ITEMS[id].name,min,max,percent:bps/100})):[],
  noDropPercent:paid?table.roll.find(r=>r[0]==='none')[3]/100:100};
}
function drawDrops(source,target,ordinal,floor=1){
 const table=TABLES[source],seed=mix32((Math.imul(ordinal,2654435761)^coords(target)^Math.imul(floor,2246822519))>>>0);
 const result=table.guaranteed.map(([id,count])=>({id,count:count+(source==='tower'&&floor%5===0?1:0)}));
 const dice=roll(seed);let cumulative=0;
 for(const [id,min,max,bps] of table.roll){cumulative+=bps;if(dice<cumulative){if(id!=='none'){
   const count=min+(max>min?mix32(seed^0x9e3779b9)%(max-min+1):0);
   result.push({id,count});
  }break;}}
 return result;
}
function grant(s,source,channel,target,ordinal,floor){
 const h=ensure(s),rolled=drawDrops(source,target,ordinal,floor),awarded=[];
 for(const d of rolled){const actual=Math.min(d.count,MAX-h.shards[d.id]);
  if(actual>0){h.shards[d.id]+=actual;awarded.push({id:d.id,count:actual});}
  if(actual<d.count)E.note(s,'Kho mảnh '+ITEMS[d.id].name+' đầy; phần vượt bị bỏ.');
 }
 const receipt={channel,source,target:String(target),ordinal,drops:awarded};
 h.last=receipt;h.history.unshift(receipt);if(h.history.length>20)h.history.length=20;
 if(awarded.length)E.note(s,'HG29 '+TABLES[source].label+': '+awarded.map(d=>'+'+d.count+' '+ITEMS[d.id].name).join(', '));
 return receipt;
}
function battleAct(s,action,options){
 const h=ensure(s),b=s.battle?{kind:s.battle.kind,target:s.battle.target,
  level:s.battle.level||0,floor:s.battle.hg21Tower?.floor||0}:null;
 const result=old.battleAct(s,action,options);
 if(!b||result?.type!=='win')return result;
 if(b.kind==='tower'){
  const ordinal=s.hg20?.tower?.victories||0;
  if(ordinal>h.towerWins){h.towerWins=ordinal;
   if(result.claimed)grant(s,'tower','tower','floor-'+b.floor,ordinal,b.floor);}
 }else{
  const ordinal=s.hg18?.victories||0;
  if(ordinal>h.world){h.world=ordinal;
   const source=sourceFor(b.kind,b.target,b.level);
   if(source)grant(s,source,'world',b.target,ordinal,0);}
 }
 return result;
}
function catalogue(s){const h=ensure(s);return RECIPES.map(r=>({...r,
 canCraft:Object.entries(r.cost).every(([id,n])=>h.shards[id]>=n)&&
 (r.output.kind==='gear'?s.inventory.length<2000:((s.hg18.materials[r.output.id]||0)+r.output.count<=1e6))}));}
function craft(s,id){
 if(s.battle||s.march||s.expedition||s.parallelMarches?.length)throw Error('Kết thúc hành quân/chiến đấu trước khi ghép mảnh.');
 const r=catalogue(s).find(x=>x.id===id);if(!r)throw Error('Công thức HG29 không tồn tại');
 if(!r.canCraft)throw Error('Không đủ mảnh hoặc kho trang bị/nguyên liệu đã đầy');
 const h=ensure(s);let outcome;
 if(r.output.kind==='gear'){
  if(!E.ITEMS[r.output.id])throw Error('Thiếu định nghĩa trang bị');
  outcome=E.addItem(s,r.output.id,'HG29 ghép mảnh PvE (lựa chọn chủ đích)');
 }else{s.hg18.materials[r.output.id]+=r.output.count;outcome={material:r.output.id,count:r.output.count};}
 for(const [key,n] of Object.entries(r.cost))h.shards[key]-=n;
 h.crafted++;E.note(s,'HG29 ghép '+r.name+' từ mảnh nhận qua PvE.');
 return {id,output:outcome,crafted:h.crafted};
}
function make(...args){const s=old.make(...args);ensure(s);return s;}
function parse(data){const s=old.parse(data);ensure(s);if(!strict(s))throw Error('Save HG29 không hợp lệ');return s;}
function strict(s){return old.strict(s)&&valid(s);}
function serialize(s){ensure(s);if(!strict(s))throw Error('Save HG29 không hợp lệ');return old.serialize(s);}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,battleAct,
 hg29Ensure:ensure,hg29Valid:valid,hg29Preview:preview,hg29Catalogue:catalogue,hg29Craft:craft,
 HG29_ITEMS:ITEMS,HG29_TABLES:TABLES,HG29_RECIPES:RECIPES});
root.HOG_HG29=Object.freeze({version:1,saveVersion:7,mode:'earned-deterministic-fragments'});
})(typeof globalThis!=='undefined'?globalThis:this);
