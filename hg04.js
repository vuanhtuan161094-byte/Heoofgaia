/* Hẻoofgaia HG-04 gameplay extension. New implementation, based on historical rules where noted. */
(function(root){
'use strict';
const E=root.HOG_ENGINE, C=root.HOG_CATALOG;
if(!E||!C)throw new Error('HG-04 requires HG engine and catalog');
const HERO_SPELLS={
 human:[{id:'leadership',name:'Leadership',desc:'Tăng ATK cận chiến +1,5%/cấp',affects:'ally',stat:'atk',kind:'melee',delta:.015},
        {id:'struggle',name:'Struggle',desc:'Tăng HP tối đa quân +1%/cấp',affects:'ally',stat:'hp',kind:'all',delta:.01},
        {id:'rain_arrows',name:'Rain of Arrows',desc:'Tăng ATK quân bắn xa +1,5%/cấp',affects:'ally',stat:'atk',kind:'ranged',delta:.015}],
 elf:[{id:'natures_wrath',name:"Nature's Wrath",desc:'Tăng ATK cận chiến +1,5%/cấp',affects:'ally',stat:'atk',kind:'melee',delta:.015},
      {id:'fountain_life',name:'Fountain of Life',desc:'Tăng HP tối đa quân +1%/cấp',affects:'ally',stat:'hp',kind:'all',delta:.01},
      {id:'hawkeye',name:'Hawkeye',desc:'Tăng ATK quân bắn xa +1,5%/cấp',affects:'ally',stat:'atk',kind:'ranged',delta:.015}],
 orc:[{id:'harden_bones',name:'Harden Bones',desc:'Tăng DEF toàn quân +3%/cấp',affects:'ally',stat:'def',kind:'all',delta:.03},
      {id:'roar',name:'Roar',desc:'Giảm DEF quân địch -2%/cấp',affects:'enemy',stat:'def',kind:'all',delta:-.02},
      {id:'berserk',name:'Berserk',desc:'Tăng ATK cận chiến +1,5%/cấp',affects:'ally',stat:'atk',kind:'melee',delta:.015}],
 undead:[{id:'curse',name:'Curse',desc:'Giảm ATK quân địch -1%/cấp',affects:'enemy',stat:'atk',kind:'all',delta:-.01},
         {id:'necromancy',name:'Necromancy',desc:'Giảm DEF quân địch -2%/cấp',affects:'enemy',stat:'def',kind:'all',delta:-.02},
         {id:'soul_boost',name:'Soul Boost',desc:'Tăng HP toàn quân +1%/cấp',affects:'ally',stat:'hp',kind:'all',delta:.01}]
};
const ITEMS={
 copper_blade:{id:'copper_blade',name:'Kiếm đồng hành trình',slot:'weapon',icon:'⚔',atk:3,def:0,spd:0,cost:450,level:1},
 ash_bow:{id:'ash_bow',name:'Cung tần bì',slot:'weapon',icon:'🏹',atk:4,def:0,spd:1,cost:650,level:2},
 iron_armor:{id:'iron_armor',name:'Giáp sắt trinh sát',slot:'armor',icon:'🛡',atk:0,def:4,spd:0,cost:540,level:1},
 traveler_cloak:{id:'traveler_cloak',name:'Áo choàng lữ khách',slot:'armor',icon:'🧥',atk:0,def:2,spd:2,cost:680,level:2},
 quartz_ring:{id:'quartz_ring',name:'Nhẫn thạch anh',slot:'charm',icon:'💍',atk:2,def:1,spd:1,cost:850,level:2},
 old_talisman:{id:'old_talisman',name:'Hộ phù cổ',slot:'charm',icon:'🔮',atk:1,def:3,spd:0,cost:980,level:3}
};
const QUESTS=[
 {id:'hall_two',name:'Lãnh chúa trẻ',desc:'Nâng Town Hall lên cấp 2',reward:{gold:500,wood:120,ore:120},fame:10,ready:s=>s.buildings.hall>=2},
 {id:'scouting',name:'Mắt nhìn bốn phương',desc:'Nghiên cứu Scouting cấp 1',reward:{gold:300,sulfur:50,crystal:50},fame:10,ready:s=>(s.spells.scouting||0)>=1},
 {id:'first_mine',name:'Đất đai màu mỡ',desc:'Chiếm mỏ tài nguyên đầu tiên',reward:{gold:650,wood:100,ore:100},fame:20,ready:s=>s.mines.length>=1},
 {id:'first_npc',name:'Dọn sạch đường thương',desc:'Đánh bại một trại quái',reward:{gold:850,sulfur:75,crystal:75},fame:25,ready:s=>s.cleared.length>=1}
];
function ensure(s){
 if(!s.heroMagic||typeof s.heroMagic!=='object')s.heroMagic={};
 if(!Array.isArray(s.inventory))s.inventory=[];
 if(!s.equipment||typeof s.equipment!=='object')s.equipment={};
 if(!Array.isArray(s.claimedQuests))s.claimedQuests=[];
 if(!Number.isSafeInteger(s.nextItem))s.nextItem=1;
 if(!Number.isSafeInteger(s.lootWins))s.lootWins=0;
 for(const h of s.heroes){if(!Array.isArray(h.equippedSpells))h.equippedSpells=[];if(!s.equipment[h.id])s.equipment[h.id]={};}
 return s;
}
function spells(s){return HERO_SPELLS[s.race]}
function spell(s,id){return spells(s).find(x=>x.id===id)}
function spellCost(s,id){const t=spell(s,id);if(!t)throw Error('Phép không thuộc chủng tộc');const level=s.heroMagic[id]||0;
 return {gold:300*(level+1),wood:30*(level+1),ore:30*(level+1),sulfur:25*(level+1),crystal:25*(level+1)};
}
function researchHeroSpell(s,id){ensure(s);if(s.march||s.battle)throw Error('Tướng đang xuất chinh');const t=spell(s,id);if(!t)throw Error('Phép không thuộc chủng tộc');const current=s.heroMagic[id]||0;
 if(current>=s.buildings.magicTower||current>=10)throw Error('Nâng Magic Tower trước');E.spend(s,spellCost(s,id));s.heroMagic[id]=current+1;
 E.note(s,`Nghiên cứu ${t.name} cấp ${current+1} (chi phí mô phỏng).`);return s.heroMagic[id];}
function equipSpell(s,id,heroId=s.activeHero){ensure(s);if(s.march||s.battle)throw Error('Không thể đổi pháp thuật khi hành quân hoặc giao tranh');if(!(s.heroMagic[id]>0)||!spell(s,id))throw Error('Phải nghiên cứu pháp thuật trước');
 const h=s.heroes.find(x=>x.id===heroId);if(!h)throw Error('Không tìm thấy tướng');
 if(h.equippedSpells.includes(id)){h.equippedSpells=h.equippedSpells.filter(x=>x!==id);return false;}
 if(h.equippedSpells.length>=5)throw Error('Tối đa 5 phép trang bị');h.equippedSpells.push(id);return true;
}
function addItem(s,itemId,origin){ensure(s);if(!ITEMS[itemId])throw Error('Trang bị không tồn tại');const item={uid:s.nextItem++,itemId,origin};s.inventory.push(item);return item;}
function buyItem(s,itemId){ensure(s);const item=ITEMS[itemId];if(!item)throw Error('Không có vật phẩm này');if((s.buildings.bazaar||0)<item.level)throw Error('Cần nâng Bazaar tới cấp '+item.level);
 E.spend(s,{gold:item.cost});const created=addItem(s,itemId,'Bazaar');E.note(s,`Mua ${item.name} từ Bazaar (giá demo).`);return created;}
function equipItem(s,uid,heroId=s.activeHero){ensure(s);if(s.march||s.battle)throw Error('Chờ kết thúc hành quân hoặc chiến đấu để thay trang bị');const item=s.inventory.find(x=>x.uid===uid);if(!item)throw Error('Không có trang bị này');const proto=ITEMS[item.itemId];
 const hero=s.heroes.find(x=>x.id===heroId);if(!hero)throw Error('Tướng không tồn tại');
 for(const eq of Object.values(s.equipment)){for(const key of Object.keys(eq)){if(eq[key]===uid)delete eq[key]}}
 s.equipment[hero.id][proto.slot]=uid;E.note(s,`${hero.name} trang bị ${proto.name}.`);return uid;}
function unequipItem(s,slot,heroId=s.activeHero){ensure(s);if(s.march||s.battle)throw Error('Tướng đang bận');if(!['weapon','armor','charm'].includes(slot))throw Error('Ô không hợp lệ');delete s.equipment[heroId]?.[slot];return true;}
function heroStats(s,heroId=s.activeHero){ensure(s);const h=s.heroes.find(x=>x.id===heroId);if(!h)return null;
 const res={atk:h.atk,def:h.def,spd:h.spd,int:h.int};for(const uid of Object.values(s.equipment[h.id]||{})){
  const found=s.inventory.find(x=>x.uid===uid),def=found&&ITEMS[found.itemId];if(!def)continue;
  for(const key of ['atk','def','spd'])res[key]+=(def[key]||0);
 }return res;
}
function sell(s,key,qty){ensure(s);if((s.buildings.market||0)<1)throw Error('Xây Market trước');if(!['wood','ore','sulfur','crystal'].includes(key))throw Error('Chỉ bán được tài nguyên');
 if(!Number.isSafeInteger(qty)||qty<1||qty>50000)throw Error('Số lượng phải là số nguyên hợp lệ');
 const multiplier={wood:2,ore:2,sulfur:4,crystal:4}[key];const gain=qty*multiplier;
 if(!E.canAfford(s,{[key]:qty}))throw Error('Không đủ tài nguyên');
 if(s.res.gold+gain>E.limits(s).gold)throw Error('Kho vàng không đủ chỗ');
 E.spend(s,{[key]:qty});E.add(s,{gold:gain});E.note(s,`Bán ${qty} ${C.resource[key].label}: +${gain} vàng (tỷ giá demo).`);return gain;
}
function claim(s,id){ensure(s);const quest=QUESTS.find(q=>q.id===id);if(!quest)throw Error('Nhiệm vụ không hợp lệ');if(s.claimedQuests.includes(id))throw Error('Đã nhận thưởng nhiệm vụ');if(!quest.ready(s))throw Error('Chưa đạt yêu cầu');
 const lim=E.limits(s);for(const [key,value] of Object.entries(quest.reward))if(s.res[key]+value>lim[key]+1e-6)throw Error('Kho '+C.resource[key].label+' không đủ chỗ');
 E.add(s,quest.reward);s.fame+=quest.fame;s.claimedQuests.push(id);E.note(s,`Nhận thưởng nhiệm vụ: ${quest.name}.`);return true;
}
// Hero spells are buffs/debuffs that override the previous active effect, per 2009 wiki.
// Duration / recast cooldown are demo-only: three rounds of effect, two rounds of cooldown after expiration.
function resetEffects(b){if(!b)return;for(const u of [...b.allies,...b.enemies]){if(u._spellAtk!==undefined){u.atk=u._spellAtk;delete u._spellAtk}
 if(u._spellDef!==undefined){u.def=u._spellDef;delete u._spellDef}
 if(u._spellHp!==undefined){const adjustedPool=u.hp?Math.round(u.pool*u._spellHp/u.hp):0;u.hp=u._spellHp;u.pool=Math.min(adjustedPool,Math.ceil(u.initial*u.hp));if(u.pool<0)u.pool=0;u.count=Math.min(u.count,Math.ceil(u.pool/u.hp));delete u._spellHp}}b.activeSpell=null;}
function cast(s,id){ensure(s);const b=s.battle;if(!b)throw Error('Không có trận chiến');const spec=spell(s,id),hero=s.heroes.find(h=>h.id===s.activeHero);
 if(!spec||!hero?.equippedSpells.includes(id)||!(s.heroMagic[id]>0))throw Error('Chưa nghiên cứu hoặc trang bị phép');
 if(b.castTurn===b.turn)throw Error('Mỗi lượt chỉ sử dụng một phép');if((b.spellCooldown?.[id]||0)>b.turn)throw Error('Phép đang hồi');
 resetEffects(b);const group=spec.affects==='ally'?b.allies:b.enemies;
 const lv=s.heroMagic[id];for(const u of group){if(!u.pool)continue;if(spec.kind==='melee'&&u.range>1)continue;if(spec.kind==='ranged'&&u.range<=1)continue;
  if(spec.stat==='atk'){u._spellAtk=u.atk;u.atk=Math.max(1,u.atk*(1+spec.delta*lv))}
  if(spec.stat==='def'){u._spellDef=u.def;u.def=Math.max(1,u.def*(1+spec.delta*lv))}
  if(spec.stat==='hp'){u._spellHp=u.hp;u.hp=u.hp*(1+spec.delta*lv);u.pool=u.pool*(1+spec.delta*lv)}
 }
 b.activeSpell={id,expiry:b.turn+3};b.castTurn=b.turn;b.spellCooldown=b.spellCooldown||{};b.spellCooldown[id]=b.turn+5;
 b.history.unshift(`✨ ${hero.name} dùng ${spec.name} cấp ${lv}.`);return b.activeSpell;
}
const rawMake=E.make,rawTick=E.tick,rawBattleAct=E.battleAct,rawUpgradeSaveV02=E.upgradeSaveV02,rawUpgrade=E.upgrade;
E.make=(...args)=>ensure(rawMake(...args));
E.tick=(s,...args)=>{ensure(s);const had=!!s.battle;rawTick(s,...args);if(!had&&s.battle){s.battle.spellCooldown={};s.battle.castTurn=0;s.battle.activeSpell=null;}return s;};
E.battleAct=(s,cmd)=>{ensure(s);const h=s.heroes.find(x=>x.id===s.activeHero);const stats=h?heroStats(s,h.id):null;
 const initialAtk=h?.atk,initialDef=h?.def;if(h&&stats){h.atk=stats.atk;h.def=stats.def;}
 const b=s.battle;
 let out;try{out=rawBattleAct(s,cmd);}finally{if(h&&stats){h.atk-=stats.atk-initialAtk;h.def-=stats.def-initialDef;}}
 if(b&&s.battle&&s.battle.activeSpell&&s.battle.turn>=s.battle.activeSpell.expiry)resetEffects(s.battle);
 if(out.type==='win'){
  s.lootWins++;
  // Deterministic demo reward; success is counted only after the engine records conquered/cleared target.
  const tile=E.getTile(b.target);if(tile?.kind==='npc'||(tile?.kind==='mine'&&s.lootWins%3===0)){
   const pools=['copper_blade','iron_armor','ash_bow','traveler_cloak','quartz_ring','old_talisman'];
   const item=pools[(b.target.split(',').reduce((n,v)=>n+Number(v),0)+s.lootWins)%pools.length];
   addItem(s,item,`PvE (${b.target})`);E.note(s,`Nhặt được ${ITEMS[item].name} sau giao tranh (drop mô phỏng).`);
  }
 }
 return out;
};
E.upgrade=(s,key)=>{ensure(s);return rawUpgrade(s,key)};
E.upgradeSaveV03=(old)=>{if(!old||old.version!==3||!E.C.races[old.race])throw Error('Save HG03 không hợp lệ');const s=E.clone(old);s.version=4;E.note(s,'Đã chuyển save HG-03 lên HG-04, giữ nguyên dữ liệu cũ.');return ensure(s)};
E.upgradeSaveV02=(old)=>{const s=rawUpgradeSaveV02(old);s.version=4;E.note(s,'Chuyển save HG-02 sang HG-04.');return ensure(s)};
C.buildings.market.state='observed';C.buildings.market.desc='Bán tài nguyên lấy vàng; tỷ giá mô phỏng. Không dùng vàng mua tài nguyên.';
C.buildings.bazaar.state='observed';C.buildings.bazaar.desc='Mua trang bị tướng, cấp Bazaar mở vật phẩm (giá demo).';
Object.assign(E,{SAVE_KEY:'heoofgaia_hg_only_v04',PREV_SAVE_KEY:'heoofgaia_hg_only_v03',HERO_SPELLS,ITEMS,QUESTS,ensure,spells,spell,heroSpellCost:spellCost,researchHeroSpell,equipSpell,addItem,buyItem,equipItem,unequipItem,heroStats,sell,claim,cast,resetEffects});
root.HOG_HG04={HERO_SPELLS,ITEMS,QUESTS};
})(typeof globalThis!=='undefined'?globalThis:this);


