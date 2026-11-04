/* HG19 — original lightweight vector troop identities and UI icon pack.
 * Presentation-only: no engine state, no timers, no external assets.
 * SVGs are generated locally, cached by identity and embedded in offline HTML.
 */
(function(root){
'use strict';
const TYPES={
 human:['spear','scout','archer','heavy','gryphon','monk','knight','priest','angel','archangel'],
 elf:['centaur','scout','dwarf','archer','pegasus','dryad','unicorn','elitearcher','greendragon','fairydragon'],
 orc:['imp','wolfrider','axethrower','direwolf','ogre','harpy','thunderbird','cyclops','monster','behemoth'],
 undead:['skeleton','commonghost','zombie','ghost','vampire','lich','ghostknight','lichking','bonedragon','ghostdragon']
};
const PALETTES={
 human:{main:'#4f83b8',dark:'#243b5f',light:'#c7e4f2',metal:'#e2cb91',skin:'#f5c7a4'},
 elf:{main:'#5eaa76',dark:'#224d48',light:'#c1e5ab',metal:'#d2dca4',skin:'#eecbb0'},
 orc:{main:'#a86b42',dark:'#4e3630',light:'#d5ad65',metal:'#d8c4a0',skin:'#97bb77'},
 undead:{main:'#795b9a',dark:'#292944',light:'#c7b1df',metal:'#a7c3cc',skin:'#c0d2cc'}
};
const ART_IDS=Object.keys(TYPES).flatMap(function(r){return TYPES[r].map(function(_,i){return r+'_'+(i+1);});});
const svgCache=new Map(),imgCache=new Map(),iconCache=new Map();
const p=(d,f,s)=>'<path d="'+d+'" fill="'+(f||'none')+'" stroke="'+(s||'#243344')+'" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
const ell=(cx,cy,rx,ry,fill,stroke)=>'<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" stroke="'+(stroke||'none')+'" stroke-width="2"/>';
const line=(d,stroke,w)=>'<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="'+(w||3)+'" stroke-linecap="round" stroke-linejoin="round"/>';
function humanCore(P,variant){
 const robe=['monk','priest','lich','lichking','vampire'].includes(variant);
 const full=variant==='ogre'||variant==='monster'||variant==='behemoth'||variant==='cyclops';
 const scale=full?1.13:1;
 let s='<g transform="translate(64 116) scale('+scale+') translate(-64 -116)">';
 s+=p('M42 65 Q30 80 34 110 L64 103 L92 112 Q93 79 84 63 Z',P.dark);
 s+=p('M48 89 L43 115 L58 115 L62 91 Z',P.dark)+p('M67 91 L70 115 L85 115 L80 86 Z',P.dark);
 s+=p(robe?'M48 56 L82 56 L90 114 L40 114 Z':'M50 59 L79 57 L86 94 L45 94 Z','url(#armor)');
 s+=p('M44 63 L33 87 L39 94 L53 74 Z',P.main)+p('M83 61 L96 84 L89 91 L75 72 Z',P.main);
 s+=ell(65,38,20,21,P.skin,P.dark);
 s+=p('M47 29 Q48 11 65 13 Q86 12 86 31 L79 27 L76 21 L55 27 L53 35 Z','url(#steel)');
 s+=line('M53 38 l7 0 M71 38 l7 0',P.dark,3);
 s+=ell(65,48,4,2,P.dark);
 s+=p('M48 61 L64 73 L83 61 L74 79 L56 79 Z',P.metal);
 s+=p('M51 83 L78 83','none',P.metal);
 s+='</g>';
 return s;
}
function wing(P,side,angel){
 const x=side==='left'?-1:1;
 const tr=x===-1?'translate(128 0) scale(-1 1)':'';
 return '<g transform="'+tr+'">'+p(angel?'M72 64 Q104 4 126 18 Q106 48 110 58 Q104 68 84 79 Z':'M73 69 Q103 23 124 36 L114 57 L127 69 L87 84 Z','url(#wing)')+line('M80 75 Q101 39 119 30',P.light,2)+'</g>';
}
function staff(P,x,kind){
 let s=line('M'+x+' 25 L'+(x-5)+' 116',P.dark,5)+line('M'+(x-1)+' 25 L'+(x-6)+' 116',P.metal,2);
 if(kind==='spear')s+=p('M'+(x-7)+' 27 L'+x+' 4 L'+(x+6)+' 27 Z','url(#steel)');
 else s+=ell(x,21,11,13,'url(#gem)',P.metal)+ell(x,17,4,4,'#ffffff88');
 return s;
}
function bow(P){
 return line('M97 31 Q122 63 100 98',P.metal,5)+line('M97 31 L100 98',P.light,1.5)+line('M82 64 L118 63',P.dark,2)+p('M115 61 L122 63 L115 67 Z',P.light);
}
function weapon(P,type){
 if(type==='archer'||type==='elitearcher')return bow(P);
 if(type==='spear'||type==='knight')return staff(P,96,'spear');
 if(['monk','priest','lich','lichking','dryad'].includes(type))return staff(P,96,'gem');
 if(type==='scout'||type==='vampire')return p('M88 82 L111 53 L107 47 L78 76 Z','url(#steel)');
 if(type==='axethrower')return line('M83 78 L107 43',P.dark,5)+p('M102 44 Q91 31 107 22 L122 43 Z','url(#steel)');
 if(type==='ogre'||type==='monster'||type==='behemoth')return line('M89 80 L116 26',P.dark,9)+ell(116,25,11,12,'url(#steel)',P.dark);
 return line('M88 86 L112 47',P.dark,4)+p('M111 48 L121 24 L102 39 Z','url(#steel)');
}
function horse(P,variant){
 let s='';
 s+=p('M31 67 Q46 48 81 64 L101 77 L90 91 L36 91 Z','url(#armor)');
 s+=p('M38 82 L33 116 L44 117 L53 89 Z',P.dark)+p('M75 83 L83 117 L92 117 L86 85 Z',P.dark);
 s+=p('M82 68 Q93 49 98 34 L113 37 L121 53 L111 68 L100 69 Z',P.main);
 s+=p('M98 37 L92 20 L104 29 L110 19 L114 35 Z',P.dark);
 s+=ell(111,49,3,3,P.light);s+=line('M29 74 Q9 63 12 85',P.dark,5);
 if(variant==='centaur'){s+='<g transform="translate(5 -24) scale(.63)">'+humanCore(P,'archer')+'</g>';s+=bow(P);}
 if(variant==='wolfrider'){s+='<g transform="translate(5 -20) scale(.60)">'+humanCore(P,'scout')+'</g>';s+=weapon(P,'spear');}
 if(variant==='pegasus'){s+=wing(P,'right',false)+wing(P,'left',false);}
 if(variant==='unicorn')s+=p('M105 30 L108 3 L114 32 Z',P.metal);
 return s;
}
function wolf(P,variant){
 let s=p('M23 69 L45 55 L85 59 L105 73 L91 94 L33 93 Z','url(#armor)');
 s+=p('M32 84 L28 117 L39 116 L49 89 Z',P.dark)+p('M81 85 L85 117 L97 117 L91 82 Z',P.dark);
 s+=p('M91 63 L103 48 L119 52 L124 71 L112 81 L92 77 Z',P.main);
 s+=p('M99 52 L92 30 L108 44 L118 26 L118 53 Z',P.dark);
 s+=ell(113,64,3,3,'#fff4a4')+p('M113 73 L119 81 L125 71 Z',P.light);
 s+=line('M24 76 Q7 57 10 46',P.dark,6);
 if(variant==='direwolf')s+=p('M26 64 L37 46 L44 57 L58 42 L65 58 L77 49 L91 63 Z',P.light);
 if(variant==='wolfrider'){s+='<g transform="translate(1 -33) scale(.67)">'+humanCore(P,'scout')+'</g>';s+=staff(P,79,'spear');}
 return s;
}
function dragon(P,variant){
 let s=p('M33 90 Q9 88 10 105 Q29 111 51 102 L92 96 L109 79 L86 59 L50 54 Z','url(#armor)');
 s+=p('M53 69 L29 18 L67 35 L77 62 Z','url(#wing)');
 s+=p('M65 68 L97 15 L93 67 Z','url(#wing)');
 s+=p('M83 63 Q91 39 98 30 L115 31 L126 46 L118 59 L106 61 L98 82 Z',P.main);
 s+=p('M93 35 L90 19 L102 31 L111 13 L115 35 Z',P.dark);
 s+=ell(117,46,3,4,'#f4e9a3');
 s+=p('M38 87 L37 113 L48 113 L56 89 Z',P.dark)+p('M79 85 L85 113 L98 113 L92 83 Z',P.dark);
 s+=line('M30 92 Q10 94 9 76',P.dark,7);
 if(variant==='bonedragon')s+=line('M44 80 L88 78 M51 72 L48 92 M63 69 L61 94 M77 72 L78 90',P.light,4);
 if(variant==='ghostdragon')s+='<path d="M9 74 Q3 91 15 110 Q45 119 93 104 Q122 104 127 84" fill="none" stroke="#b8eeff" opacity=".62" stroke-width="5"/>';
 if(variant==='fairydragon')s+=ell(53,42,9,7,'#eaf0a5bb')+ell(65,25,5,5,'#eaf0a5aa');
 return s;
}
function bird(P,type){
 let s=wing(P,'left',false)+wing(P,'right',false);
 s+=ell(63,76,26,32,'url(#armor)',P.dark);
 s+=ell(71,40,17,18,P.main,P.dark);
 s+=p('M80 39 L107 48 L81 54 Z',P.metal);
 s+=ell(75,36,3,4,'#f7f2ad');
 s+=line('M53 95 L48 116 M75 94 L80 116',P.dark,6);
 if(type==='gryphon')s+=p('M38 86 Q24 76 18 95 L42 94 Z',P.dark);
 if(type==='thunderbird')s+=p('M15 68 L28 78 L20 88 L43 64 L29 68 L34 52 Z','#f4dd80');
 return s;
}
function spirit(P,type){
 let s='<g opacity="'+(type==='ghost'?'.80':'.94')+'">';
 s+=p('M47 25 Q63 2 82 28 L93 90 Q95 101 107 114 L88 107 L78 117 L66 108 L49 117 L40 102 L23 112 Q42 82 40 51 Z','url(#armor)');
 s+=ell(64,45,14,16,P.dark);
 s+=ell(57,45,3,5,P.light)+ell(71,45,3,5,P.light);
 s+=p('M59 59 L68 59 L65 66 Z',P.light);
 s+=line('M31 81 Q19 72 17 60',P.light,3);
 return s+'</g>';
}
function unitSVG(id){
 if(svgCache.has(id))return svgCache.get(id);
 const match=/^(human|elf|orc|undead)_(10|[1-9])$/.exec(String(id));
 if(!match)return null;
 const race=match[1],tier=Number(match[2]),type=TYPES[race][tier-1],P=PALETTES[race];
 let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" aria-label="'+id+'">';
 s+='<defs><linearGradient id="armor" x2="0.8" y2="1"><stop stop-color="'+P.light+'"/><stop offset=".48" stop-color="'+P.main+'"/><stop offset="1" stop-color="'+P.dark+'"/></linearGradient>';
 s+='<linearGradient id="steel" x2=".8" y2="1"><stop stop-color="#ffffff"/><stop offset=".55" stop-color="'+P.metal+'"/><stop offset="1" stop-color="'+P.dark+'"/></linearGradient>';
 s+='<linearGradient id="wing" x2="1" y2="1"><stop stop-color="'+P.light+'"/><stop offset="1" stop-color="'+P.dark+'"/></linearGradient>';
 s+='<radialGradient id="gem"><stop stop-color="#fff4d6"/><stop offset=".45" stop-color="'+P.light+'"/><stop offset="1" stop-color="'+P.main+'"/></radialGradient></defs>';
 // Full body silhouettes, not numbered emblems. Each identity has a weapon, creature or silhouette distinction.
 if(['centaur','pegasus','unicorn'].includes(type))s+=horse(P,type);
 else if(['wolfrider','direwolf'].includes(type))s+=wolf(P,type);
 else if(['gryphon','thunderbird'].includes(type))s+=bird(P,type);
 else if(['greendragon','fairydragon','bonedragon','ghostdragon'].includes(type))s+=dragon(P,type);
 else if(['commonghost','ghost'].includes(type))s+=spirit(P,type);
 else{
  if(['angel','archangel','harpy'].includes(type))s+=wing(P,'left',type!=='harpy')+wing(P,'right',type!=='harpy');
  if(type==='dryad')s+=p('M41 64 Q27 43 31 26 L48 42 L58 24 L69 44 L90 25 L88 57 L78 62 Z',P.light);
  s+=humanCore(P,type);
  if(type==='skeleton'||type==='zombie'||type==='lich'||type==='lichking'||type==='ghostknight'){
   s+=ell(64,38,17,19,type==='zombie'?'#97a69b':'#e9ddc6',P.dark);
   s+=ell(57,39,5,6,P.dark)+ell(72,39,5,6,P.dark)+p('M64 43 L60 52 L68 52 Z',P.dark)+line('M57 57 L74 57',P.dark,2);
  }
  if(type==='dwarf')s+=p('M50 48 Q62 81 79 47 Q83 78 65 88 Q49 78 50 48 Z',P.metal);
  if(type==='cyclops'){s+=p('M49 33 Q65 20 80 33 Z',P.dark)+ell(65,39,11,8,'#f2e6a8')+ell(65,39,4,6,P.dark);}
  if(type==='behemoth'||type==='monster')s+=p('M46 35 L33 11 L55 27 Z',P.metal)+p('M79 34 L96 11 L75 24 Z',P.metal);
  if(type==='archangel'||type==='angel')s+=ell(65,8,21,5,'none',P.metal)+line('M44 8 Q65 -1 86 8',P.light,2.5);
  if(type==='heavy'||type==='knight'||type==='ghostknight')s+=p('M22 65 L43 59 L45 89 Q34 101 22 88 Z','url(#steel)');
  if(type==='dryad')s+=line('M61 71 L56 103 M70 75 L76 103','#b4db98',4);
  s+=weapon(P,type);
 }
 s+=ell(64,119,32,4,'#071a2a30');
 s+='</svg>';
 svgCache.set(id,s);return s;
}
function unitSrc(id){const s=unitSVG(id);return s?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s):null;}
function unitImage(id){
 if(!unitSVG(id)||typeof Image==='undefined')return null;
 if(imgCache.has(id))return imgCache.get(id);
 const img=new Image();img.decoding='async';img.src=unitSrc(id);imgCache.set(id,img);return img;
}
function unitHTML(id,size){
 if(!unitSVG(id))return '';
 const px=Math.max(24,Math.min(128,Number(size)||52));
 return '<img class="hog-unit-thumb" data-hog-unit="'+id+'" width="'+px+'" height="'+px+'" alt="" loading="lazy" src="'+unitSrc(id)+'">';
}
const ICON_GROUPS={
 gold:['#ecd27f','coin'],wood:['#8fc49b','wood'],ore:['#b3c7d8','ore'],sulfur:['#f2a476','fire'],crystal:['#9fcbea','crystal'],
 human:['#edcf88','castle'],elf:['#9bd8a9','leaf'],orc:['#eca274','claw'],undead:['#d1b5e9','skull'],
 hall:['#d8c28a','castle'],barracks:['#bec9dc','shield'],graveyard:['#bcabce','skull'],heroTower:['#c9c5e2','crown'],tavern:['#edbb80','chest'],warehouse:['#ccb68b','chest'],magicTower:['#b6a8e8','crystal'],arena:['#e7ad90','shield'],market:['#d8bc89','coin'],bazaar:['#d3be94','chest'],embassy:['#aac9c9','scroll'],stables:['#cbb189','shield'],blacksmith:['#d1ad8b','hammer'],magicPool:['#a3b9ee','water'],natureTower:['#a5d6ae','leaf'],beastPen:['#d5ad89','claw'],darkHall:['#b6a6d8','moon'],soulTower:['#c3b4ea','skull'],forge:['#e0b18b','hammer'],
 map:['#92cdbd','map'],city:['#d8c28a','castle'],army:['#d8b786','shield'],heroes:['#b9c5ee','crown'],magic:['#b7a6e8','crystal'],relics:['#b4e3db','hammer'],tasks:['#ecd08c','scroll'],reports:['#efa08b','sword'],sources:['#bfd3df','book'],
 resource_card:['#e5c67c','coin'],resource_chest:['#d1aa73','chest'],gear_pack:['#dbaf90','chest'],set_chest:['#b5c5e0','shield'],enhance_stone:['#9fcaf0','crystal'],hero_reset:['#bcaee3','cycle'],rank_emblem:['#edcc80','crown'],rebirth_core:['#e4a0ed','sun'],astral_shard:['#d3b2ff','star'],
 weapon:['#e7c18b','sword'],armor:['#aac4d9','shield'],charm:['#d7b8eb','ring'],
 fire:['#e9a16e','fire'],water:['#8cc9e6','water'],earth:['#c8bc8d','ore'],air:['#abd5d0','wind'],light:['#f0d88b','sun'],dark:['#b6a3d9','moon']
};
const ITEM_GROUPS={
 copper_blade:'sword',ash_bow:'bow',iron_armor:'shield',traveler_cloak:'cloak',quartz_ring:'ring',old_talisman:'crystal',
 sentinel_sword:'sword',sentinel_plate:'shield',sentinel_seal:'sun',astral_sword:'sword',astral_plate:'shield',astral_seal:'star'
};
function iconGlyph(type,color){
 const pale='#fff5d6',shadow='#13263b';
 switch(type){
 case 'coin':return ell(32,32,17,17,'none',pale)+ell(32,32,11,11,'none',color)+line('M32 23 V41 M27 27 Q42 27 37 32 Q22 35 29 38 Q35 41 39 36',pale,3);
 case 'wood':return p('M16 21 L41 17 L49 28 L23 32 Z',color)+p('M18 31 L43 27 L49 39 L23 43 Z',pale)+ell(24,35,7,7,color,shadow)+ell(23,35,3,3,'none',shadow);
 case 'ore':return p('M13 42 L21 20 L32 27 L43 16 L52 41 L39 49 L22 48 Z',color)+line('M21 20 L32 39 L43 16 M32 39 L52 41',pale,3);
 case 'fire':return p('M34 13 Q44 25 38 32 Q52 31 47 44 Q41 55 28 51 Q12 44 20 30 Q21 38 28 38 Q27 24 34 13 Z',color)+p('M31 33 Q40 42 34 48 Q25 48 26 42 Z',pale);
 case 'crystal':return p('M31 11 L49 26 L43 46 L31 55 L17 42 L13 26 Z',color)+line('M31 11 L31 55 M13 26 L49 26 M17 42 L31 26 L43 46',pale,2.3);
 case 'castle':return p('M16 47 L16 22 L22 22 L22 17 L28 17 L28 22 L36 22 L36 17 L42 17 L42 22 L48 22 L48 47 Z',color)+p('M27 47 L27 34 Q32 26 37 34 L37 47 Z',shadow);
 case 'leaf':return p('M16 43 Q15 17 51 14 Q55 45 26 49 Z',color)+line('M18 49 Q31 31 44 22',pale,3);
 case 'claw':return p('M14 39 L20 20 L25 36 L29 13 L36 36 L44 18 L48 43 L37 52 L23 51 Z',color);
 case 'skull':return ell(31,28,17,16,color)+p('M22 37 L42 37 L39 48 L24 48 Z',color)+ell(25,30,4,5,shadow)+ell(38,30,4,5,shadow)+p('M32 33 L28 38 L36 38 Z',shadow);
 case 'shield':return p('M32 12 L49 19 L46 42 Q39 49 32 53 Q19 46 17 38 L15 19 Z',color)+line('M32 19 L32 46 M21 28 L43 28',pale,3);
 case 'sword':return line('M18 49 L47 17',pale,4)+p('M45 15 L54 10 L49 28 L43 22 Z',color)+line('M15 37 L29 51 M15 49 L20 54',color,4);
 case 'bow':return line('M18 13 Q50 29 19 51',color,5)+line('M18 13 L19 51 M12 32 L48 32',pale,2.5)+p('M44 28 L53 32 L44 36 Z',color);
 case 'crown':return p('M14 25 L24 34 L31 13 L39 34 L51 25 L47 47 L18 47 Z',color)+line('M20 43 L45 43',pale,3);
 case 'ring':return ell(31,37,13,13,'none',color)+p('M31 14 L41 25 L31 31 L21 25 Z',pale);
 case 'scroll':return p('M19 14 L44 14 L44 50 L19 50 Z',pale)+ell(19,14,5,5,color)+ell(44,50,5,5,color)+line('M25 27 L39 27 M25 35 L37 35',shadow,2.2);
 case 'chest':return p('M14 27 L50 27 L50 46 L14 46 Z',color)+p('M14 27 Q17 13 32 13 Q46 13 50 27 Z',pale)+p('M27 24 L38 24 L38 39 L27 39 Z',color);
 case 'hammer':return line('M22 51 L40 23',pale,6)+p('M31 15 L45 11 L53 23 L39 28 Z',color);
 case 'book':return p('M13 18 L29 22 L31 50 L15 46 Z',color)+p('M33 22 L50 18 L49 46 L33 50 Z',pale);
 case 'star':return p('M31 10 L37 25 L53 25 L40 35 L45 51 L31 41 L17 51 L22 35 L9 25 L25 25 Z',color);
 case 'sun':return ell(32,32,11,11,color)+line('M32 10 L32 17 M32 47 L32 54 M10 32 L17 32 M47 32 L54 32 M17 17 L22 22 M43 43 L47 47 M17 47 L22 42 M42 22 L47 17',pale,3);
 case 'moon':return p('M40 13 Q19 13 19 32 Q19 53 42 50 Q27 45 29 31 Q30 20 40 13 Z',color);
 case 'water':return p('M32 11 Q49 29 49 40 Q49 54 32 54 Q15 54 15 40 Q15 29 32 11 Z',color)+line('M22 42 Q32 47 42 39',pale,3);
 case 'wind':return line('M12 25 L42 25 Q52 25 47 16 M9 34 L51 34 M14 43 L40 43 Q50 43 45 51',color,4);
 case 'map':return p('M12 20 L25 15 L38 20 L52 14 L52 45 L38 51 L25 46 L12 51 Z',color)+line('M25 15 L25 46 M38 20 L38 51',pale,2.4);
 case 'cycle':return line('M17 28 Q22 13 40 19 L46 25 M47 36 Q42 51 24 45 L18 39',pale,4)+p('M43 13 L49 27 L34 26 Z',color)+p('M21 51 L15 37 L30 38 Z',color);
 case 'cloak':return p('M22 17 Q32 11 43 17 L52 51 L12 51 Z',color)+p('M28 22 L32 29 L38 22 Z',pale);
 }
 return p('M16 17 L48 47',color);
}
function iconSVG(key){
 if(iconCache.has(key))return iconCache.get(key);
 const def=ICON_GROUPS[key]||(ITEM_GROUPS[key]?[PALETTES.human.metal,ITEM_GROUPS[key]]:null);
 if(!def)return null;
 const col=def[0],type=def[1];
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#304453"/><stop offset="1" stop-color="#0c192b"/></linearGradient></defs>'+
 p('M32 3 L54 14 L60 33 L51 53 L32 61 L13 53 L4 33 L10 14 Z','url(#bg)','#c2aa76')+
 p('M32 8 L51 17 L55 33 L48 49 L32 56 L16 49 L9 33 L14 17 Z','none',col)+
 iconGlyph(type,col)+'</svg>';
 iconCache.set(key,svg);return svg;
}
function iconHTML(key,size){
 const svg=iconSVG(key);
 if(!svg)return '';
 const px=Math.max(12,Math.min(64,Number(size)||20));
 return '<img class="hog-ui-icon" width="'+px+'" height="'+px+'" alt="" aria-hidden="true" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'">';
}
root.HOG_ART_PACK=Object.freeze({
 ids:function(){return ART_IDS.slice();},
 hasUnit:function(id){return !!unitSVG(id);},
 unitSVG:unitSVG,unitSrc:unitSrc,unitImage:unitImage,unitHTML:unitHTML,
 iconSVG:iconSVG,iconHTML:iconHTML,
 iconKeys:function(){return Object.keys(ICON_GROUPS).concat(Object.keys(ITEM_GROUPS));}
});
})(typeof globalThis!=='undefined'?globalThis:this);
