// === NL-CLASSIC-WORLD-A4-V1: original offline classic-world gameplay ===
// Historical inspiration: Lequ 2011/09/17537, 07073 491232, SNSFun 20121123/41601.
// All city gates, costs, rewards, market rates, rebirth balance and peaceful resource leases
// are PROJECT_SIMULATED, not original VNG mechanics. One Save v5, no additional timer/solver.
let nlClassicA4Rebirth;
(()=>{
'use strict';
const CITY=[
 ['luoyang','Lạc Dương',0,'neutral','Thành khởi đầu'],
 ['changan','Trường An',2,'neutral','Thương mại'],
 ['xuchang','Hứa Xương',4,'wei','Mỏ bạc'],
 ['chengdu','Thành Đô',4,'shu','Ruộng tốt'],
 ['jianye','Kiến Nghiệp',4,'wu','Thương mại'],
 ['hefei','Hợp Phì',12,'wei','Mỏ bạc'],
 ['hanzhong','Hán Trung',12,'shu','Ruộng tốt'],
 ['wuchang','Vũ Xương',12,'wu','Thương mại']
];
const NATIONS={neutral:'Trung lập',wei:'Ngụy',shu:'Thục',wu:'Ngô'};
const DURATION=3*60*60*1000, LIMIT=16;
const DAILY=[
 ['patrol','Tuần tra 3 lần',3,300,35],
 ['trade','Giao dịch thương nhân 2 lần',2,400,40],
 ['train','Huấn luyện chiến công 2 lần',2,300,45],
 ['harvest','Thu hoạch ruộng/mỏ 1 lần',1,500,55]
];
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const nat=x=>Number.isSafeInteger(x)&&x>=0?x:0;
const owned=id=>typeof id==='string'&&game.roster.includes(id)&&Object.hasOwn(game.hero,id);
const completed=n=>n===0||game.cleared.includes(n);
function state(){
 if(!obj(game.nlClassicWorldA4))game.nlClassicWorldA4={};
 const s=game.nlClassicWorldA4;
 s.version=1;
 if(!Object.hasOwn(NATIONS,s.nation))s.nation='neutral';
 if(!CITY.some(c=>c[0]===s.city))s.city='luoyang';
 if(!obj(s.plots))s.plots={};
 if(!obj(s.rebirth))s.rebirth={};
 if(!Array.isArray(s.receipts))s.receipts=[];
 if(s.day!==dayId()){s.day=dayId();s.progress={};s.claimed=[];}
 if(!obj(s.progress))s.progress={};
 if(!Array.isArray(s.claimed))s.claimed=[];
 for(const k of ['patrol','trade','train','harvest'])s.progress[k]=nat(s.progress[k]);
 return s;
}
const city=()=>CITY.find(c=>c[0]===state().city)||CITY[0];
const fee=()=>Math.max(100,100*nat(game.buildings.palace));
function done(s,id,delta={}){
 s.receipts.push({id,at:Date.now(),delta});s.receipts=s.receipts.slice(-160);
 save();renderResources();render();return true;
}
function move(id){
 const s=state(),c=CITY.find(x=>x[0]===id);
 if(battle||!c||id===s.city||!completed(c[2]))return false;
 if(c[3]!=='neutral'&&s.nation!=='neutral'&&s.nation!==c[3])return false;
 if(!payment({silver:fee()}))return false;
 if(c[3]!=='neutral')s.nation=c[3];s.city=id;
 return done(s,'move:'+id,{silver:-fee()});
}
function lease(kind){
 const s=state(),a=nlAState();
 if(battle||!['silver','grain'].includes(kind)||!completed(2)||s.plots[kind]||a.orders<1)return false;
 const bonus=(kind==='silver'&&city()[4]==='Mỏ bạc')||(kind==='grain'&&city()[4]==='Ruộng tốt');
 const amount=(kind==='silver'?900:700)+100*nat(game.buildings.palace);
 a.orders--;s.plots[kind]={city:s.city,until:Date.now()+DURATION,amount:Math.floor(amount*(bonus?1.5:1))};
 return done(s,'lease:'+kind,{orders:-1});
}
function harvest(kind){
 const s=state(),p=s.plots[kind];
 if(battle||!['silver','grain'].includes(kind)||!obj(p)||!Number.isSafeInteger(p.until)||Date.now()<p.until||nat(p.amount)===0)return false;
 const amount=p.amount;if(!Number.isSafeInteger(game[kind]+amount))return false;
 delete s.plots[kind];game[kind]+=amount;s.progress.harvest++;
 return done(s,'harvest:'+kind,{[kind]:amount});
}
function patrol(){
 const s=state(),n=s.progress.patrol;
 if(battle||!completed(2)||n>=LIMIT)return false;
 const level=Math.max(1,nat(game.buildings.palace)),type=n%3,delta=type===0?{silver:level*110}:type===1?{prestige:level*8}:{merit:level*20};
 for(const [k,v] of Object.entries(delta)){const o=k==='merit'?nlAState():game;if(!Number.isSafeInteger(o[k]+v))return false;}
 for(const [k,v] of Object.entries(delta)){const o=k==='merit'?nlAState():game;o[k]+=v;}
 s.progress.patrol++;return done(s,'patrol:'+s.day+':'+n,delta);
}
function trade(direction){
 const s=state();if(battle||!completed(2)||s.progress.trade>=10||!['buy','sell'].includes(direction))return false;
 const buy=direction==='buy',cost=buy?{silver:180}:{grain:100},delta=buy?{grain:100}:{silver:140+(city()[4]==='Thương mại'?14:0)};
 const [k,v]=Object.entries(delta)[0];
 if(!Number.isSafeInteger(game[k]+v)||!payment(cost))return false;
 game[k]+=v;s.progress.trade++;return done(s,'trade:'+s.day+':'+s.progress.trade,{...delta,...Object.fromEntries(Object.entries(cost).map(([k,v])=>[k,-v]))});
}
const growthPolicy=()=>typeof nlClassicGrowthPolicy==='undefined'?null:nlClassicGrowthPolicy;
const levelCap=id=>growthPolicy()?.cap(id)??NL_GAME_DATA.heroes.training.maxLevel;
const rebirthGate=id=>growthPolicy()?.rebirthGate(id)??NL_GAME_DATA.heroes.training.maxLevel;
const rebirthLimit=()=>growthPolicy()?.limit??3;
function meritTrain(id){
 const s=state(),h=owned(id)?game.hero[id]:null,d=NL_GAME_DATA.heroes.training;
 if(battle||!h||h.level>=levelCap(id)||s.progress.train>=10||!payment({merit:50}))return false;
 h.xp=nat(h.xp)+Math.floor((d.baseXp+nat(game.buildings.academy)*d.academyXpPerLevel)*(1+(growthPolicy()?.trainingBonus()??0)));
 while(h.level<levelCap(id)&&h.xp>=h.level*d.xpRequiredPerHeroLevel){h.xp-=h.level*d.xpRequiredPerHeroLevel;h.level++;}
 s.progress.train++;countTask('train');return done(s,'merit-train:'+id,{merit:-50});
}
function rebirth(id){
 const s=state(),h=owned(id)?game.hero[id]:null,n=nat(s.rebirth[id]);
 if(battle||!h||h.level<rebirthGate(id)||n>=rebirthLimit()||!payment({merit:500,silver:2000}))return false;
 // A7 supplies WEB-inspired level gate; standalone A4 retains its old test contract.
 h.level=1;h.xp=0;s.rebirth[id]=n+1;
 return done(s,'rebirth:'+id+':'+(n+1),{merit:-500,silver:-2000});
}
nlClassicA4Rebirth=rebirth;
function claim(id){
 const s=state(),q=DAILY.find(x=>x[0]===id);
 if(battle||!q||s.claimed.includes(id)||s.progress[id]<q[2])return false;
 if(!Number.isSafeInteger(game.silver+q[3])||!Number.isSafeInteger(nlAState().merit+q[4]))return false;
 s.claimed.push(id);game.silver+=q[3];nlAState().merit+=q[4];
 return done(s,'daily:'+s.day+':'+id,{silver:q[3],merit:q[4]});
}
const priorUnit=p2Unit;
p2Unit=function(id,team,slot,stage){
 const u=priorUnit(id,team,slot,stage);
 if(team!=='p'||!u||!owned(id)||battle?.mode==='cltq')return u;
 const n=Math.min(rebirthLimit(),nat(state().rebirth[id]));
 if(n)for(const k of ['atk','def','catk','tdef','matk','mdef'])if(Number.isFinite(u[k]))u[k]=Math.round(u[k]*(1+n*.03));
 return u;
};
let section='world',heroId='',worldPage=0;
const button=(action,id,label,disabled=false)=>'<button class="gold-button" data-nla4-action="'+action+'" data-nla4-id="'+esc(id)+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>';
const line=(title,desc,controls)=>'<div class="nla4-line"><div><b>'+esc(title)+'</b><small>'+esc(desc)+'</small></div><div>'+controls+'</div></div>';
function panel(){
 const s=state();if(!owned(heroId))heroId=game.roster[0]||'';
 const disabled=Boolean(battle);let body='';
 if(section==='world'){
  body='<p>Quốc gia: '+esc(NATIONS[s.nation])+' · Thành: '+esc(city()[1])+' · Phí dời thành '+fmt(fee())+' Bạc</p>'+
  CITY.slice(worldPage*4,worldPage*4+4).map(c=>line(c[1],c[4]+' · '+(c[2]?'Qua ải '+c[2]:'Khởi đầu'),button('move',c[0],c[0]===s.city?'Đang ở':'Dời thành',disabled||c[0]===s.city||!completed(c[2])||(c[3]!=='neutral'&&s.nation!=='neutral'&&s.nation!==c[3])))).join('')+ '<div class="nla4-tabs">'+button('city-page','0','Trang 1',worldPage===0)+button('city-page','1','Trang 2',worldPage===1)+'</div>';
 }else if(section==='plots'){
  body=['silver','grain'].map(k=>{
   const p=s.plots[k],ready=p&&Date.now()>=p.until;
   return line(k==='silver'?'Mỏ Bạc ngoại thành':'Ruộng ngoại thành',p?(ready?'Đã đến kỳ thu hoạch':'Còn '+Math.ceil((p.until-Date.now())/60000)+' phút')+' · '+fmt(p.amount):'Thuê điểm tài nguyên 3 giờ · 1 Quân lệnh',p?button('harvest',k,'Thu hoạch',disabled||!ready):button('lease',k,'Khai thác',disabled||!completed(2)||nlAState().orders<1));
  }).join('')+'<p class="tiny">Điểm tài nguyên ngoại thành là mô phỏng PvE hòa bình, không phải tranh chấp nhiều người chơi.</p>';
 }else if(section==='trade'){
  body=line('Tuần tra','Đã dùng '+s.progress.patrol+'/'+LIMIT+' lượt hôm nay',button('patrol','','Tuần tra',disabled||!completed(2)||s.progress.patrol>=LIMIT))+
  line('Thương nhân','Mua 100 Lương: 180 Bạc',button('trade','buy','Mua',disabled||!completed(2)||s.progress.trade>=10))+
  line('Thương nhân','Bán 100 Lương: '+(city()[4]==='Thương mại'?154:140)+' Bạc',button('trade','sell','Bán',disabled||!completed(2)||s.progress.trade>=10))+'<p>Giao dịch '+s.progress.trade+'/10 hôm nay.</p>';
 }else if(section==='train'){
  const h=owned(heroId)?game.hero[heroId]:null,n=nat(s.rebirth[heroId]);
  body='<label>Chọn võ tướng <select data-nla4-hero>'+game.roster.filter(owned).map(id=>'<option value="'+esc(id)+'" '+(id===heroId?'selected':'')+'>'+esc(HEROES[id]?.name||id)+'</option>').join('')+'</select></label>'+
  (h?line('Huấn luyện chiến công','Cấp '+h.level+' · XP '+fmt(h.xp)+' · 50 Chiến công/lượt',button('train',heroId,'Huấn luyện',disabled||h.level>=levelCap(heroId)||s.progress.train>=10||nlAState().merit<50))+
  line('Chuyển sinh','Lần '+n+'/'+rebirthLimit()+' · yêu cầu '+(Number.isFinite(rebirthGate(heroId))?'cấp '+rebirthGate(heroId):'đột phá A7 trước')+' · +3% công/thủ; về cấp 1',button('rebirth',heroId,'Chuyển sinh',disabled||h.level<rebirthGate(heroId)||n>=rebirthLimit()||nlAState().merit<500||game.silver<2000)):'<p>Chưa có tướng.</p>');
 }else{
  body=DAILY.map(q=>line(q[1],Math.min(s.progress[q[0]],q[2])+'/'+q[2]+' · '+q[3]+' Bạc + '+q[4]+' Chiến công',button('claim',q[0],s.claimed.includes(q[0])?'Đã nhận':'Nhận thưởng',disabled||s.claimed.includes(q[0])||s.progress[q[0]]<q[2]))).join('');
 }
 return '<section class="panel mini-box nla4-panel" data-nla4-panel><h3>Thiên Hạ · Chính vụ và dưỡng binh</h3><div class="nla4-tabs">'+[['world','Thành trì'],['plots','Ruộng mỏ'],['trade','Tuần tra / thương nhân'],['train','Huấn luyện'],['daily','Nhiệm vụ']].map(x=>'<button class="dark-button '+(section===x[0]?'picked':'')+'" data-nla4-tab="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>'+body+'<p class="tiny">Cơ chế dự án mô phỏng WEB cổ điển. Save v5; không dùng máy chủ.</p></section>';
}
const cityBefore=renderCity;
renderCity=function(){return cityBefore()+panel();};
document.addEventListener('click',e=>{
 const t=e.target.closest?.('[data-nla4-tab]');if(t){section=t.dataset.nla4Tab;render();return;}
 const b=e.target.closest?.('[data-nla4-action]');if(!b||b.disabled)return;
 if(b.dataset.nla4Action==='city-page'){worldPage=b.dataset.nla4Id==='1'?1:0;render();return;}
 if(b.dataset.nla4Action==='rebirth'&&!window.confirm('Chuyển sinh sẽ đưa tướng về cấp 1, tốn 2.000 Bạc và 500 Chiến công. Xác nhận?'))return;
 const actions={move,lease,harvest,patrol,trade,train:meritTrain,rebirth,claim};
 const fn=actions[b.dataset.nla4Action];if(typeof fn==='function'&&!fn(b.dataset.nla4Id))toast('Chưa đủ điều kiện hoặc tài nguyên.');
});
document.addEventListener('change',e=>{if(e.target.matches?.('[data-nla4-hero]')&&owned(e.target.value)){heroId=e.target.value;render();}});
const style=document.createElement('style');style.textContent='.nla4-panel{color:#f0e0bd}.nla4-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.nla4-tabs button{font-size:11px;padding:5px 8px}.nla4-line{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #665e43}.nla4-line b,.nla4-line small{display:block}.nla4-line small{font-size:10px;color:#c4bda8}.nla4-line button{font-size:11px;padding:5px 8px;white-space:nowrap}.nla4-panel p{margin:5px 0;font-size:11px}@media(max-width:480px){.nla4-line{padding:3px 0}.nla4-line b{font-size:12px}.nla4-panel{padding:6px}.nla4-tabs button{padding:4px 6px}}';document.head.appendChild(style);
if(window.__P2_ENABLE_QA__)window.__NL_WORLD_A4_QA__=Object.freeze({state:()=>structuredClone(state()),cities:CITY.map(c=>[...c]),move,lease,harvest,patrol,trade,train:meritTrain,rebirth,claim,source:'PROJECT_SIMULATED'});
})();
// === end NL-CLASSIC-WORLD-A4-V1 ===
