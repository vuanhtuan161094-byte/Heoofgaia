/* Heroes of Gaia factual unit data, attributed in SOURCES.md; gameplay code original. */
(function(root){
'use strict';
const source='https://heroesofgaia.wikidot.com/game-units';
const keys=['gold','wood','ore','sulfur','crystal'];
const races={human:{name:'Nhân tộc',english:'Human',emoji:'🏰',tone:'#d8c79c'},elf:{name:'Tinh linh',english:'Elf',emoji:'🌳',tone:'#a0d5a4'},orc:{name:'Thú tộc',english:'Orc',emoji:'🛡️',tone:'#dda476'},undead:{name:'Vong linh',english:'Undead',emoji:'💀',tone:'#c9b2d7'}};
const resource={gold:{label:'Vàng',emoji:'🪙'},wood:{label:'Gỗ',emoji:'🪵'},ore:{label:'Quặng',emoji:'⛏️'},sulfur:{label:'Lưu huỳnh',emoji:'🟡'},crystal:{label:'Pha lê',emoji:'💎'}};
const raw={
 human:`Spear Militia|M|40|15|12|4|30|55|6|0|4|0|120
Scout|M|10|5|5|50|5|68|0|9|0|4|160
Archer|R|45|18|15|4.89|38|110|0|12|8|0|240
Heavy Soldier|M|81|36|27|5.33|174|163|18|0|4|9|400
Gryphon|M|120|42|32|6.56|64|246|22|10|0|15|600
Monk|R|115|42|33|7|62|356|0|21|19|16|800
Elite Knight|M|180|70|56|7.4|84|495|56|30|20|0|1000
Priest|R|175|72|60|7.2|70|660|50|16|17|34|1280
Angel|M|400|128|114|8.88|90|1377|105|35|35|70|2400
Archangel|M|600|174|138|9.89|100|2200|168|56|56|112|3600`,
 elf:`Centaur|M|38|16|12|4.22|30|55|0|8|0|3|120
Elf Scout|M|10|5|5|50|5|68|9|0|0|4|160
Dwarven Soldier|M|64|26|24|4.67|150|121|0|11|10|0|240
Elf Archer|R|62|28|22|5.89|52|194|21|16|6|0|440
Pegasus Warrior|M|120|40|32|7|64|239|25|18|0|9|600
Dryad|M|142|51|45|6.44|70|328|55|0|5|9|740
Unicorn|M|174|67|54|7.3|84|466|0|61|13|16|940
Elite Archer|R|190|76|60|7.2|68|715|73|55|9|18|1380
Green Dragon|M|394|124|199|8.78|90|1320|134|100|17|34|2300
Fairy Dragon|M|600|170|133|10.11|100|2145|218|164|27|55|3500`,
 orc:`Imp|M|37|15|12|3.89|33|53|5|0|4|0|113
Wolf Rider|M|10|5|5|50|5|68|0|5|0|6|160
Axe Thrower|R|48|20|14|5.11|34|117|12|0|9|0|251
Direwolf|M|78|38|28|7.5|150|188|10|20|9|0|410
Ogre|M|130|40|28|6|72|243|18|30|0|7|600
Harpy|M|140|51|44|7.56|80|324|30|0|18|8|726
Thunderbird|M|179|70|54|7.6|84|489|0|52|20|16|988
Cyclops|R|195|74|54|7.2|92|692|35|69|27|9|1344
Monster|M|390|118|109|8.44|96|1265|64|130|48|16|2200
Behemoth|M|619|162|129|9.56|104|2090|106|212|80|27|3400`,
 undead:`Skeleton Warrior|M|37|14|10|3.67|30|48|6|0|0|3|103
Common Ghost|M|10|5|5|50|5|68|0|5|6|0|160
Zombie|M|61|24|21|4.44|100|108|12|16|0|0|240
Ghost|M|87|33|24|7|60|159|8|10|11|0|360
Vampire|M|128|42|32|6.67|60|256|9|0|15|13|632
Lich|R|120|42|35|7|66|370|0|28|11|22|828
Ghost Knight|M|185|72|61|7.5|90|524|66|30|0|20|1052
Lich King|R|180|76|58|7.2|68|690|18|36|35|26|1340
Bone Dragon|M|388|113|104|8.56|92|1188|30|60|60|46|2100
Ghost Dragon|M|569|165|130|9.89|96|2035|52|104|103|78|3340`};
const units={};
for(const [race,table] of Object.entries(raw)) {
 units[race]=table.split('\n').map((line,i)=>{
  const a=line.split('|');const [name,type,...v]=a;
  const num=v.map(Number);const [hp,atk,def,spd,load,gold,wood,ore,sulfur,crystal,timeSec]=num;
  return {id:`${race}_${i+1}`,race,tier:i+1,name,type:type==='R'?'Ranged':'Melee',hp,atk,def,spd,load,cost:{gold,wood,ore,sulfur,crystal},timeSec,provenance:'WIKI_2009_GAME_UNITS'};
 });
}
const buildings={
 hall:{name:'Town Hall',vi:'Đại sảnh',icon:'🏰',desc:'Giới hạn cấp công trình, tạo vàng.',base: {gold:380,wood:50,ore:55,sulfur:10,crystal:10},state:'observed'},
 barracks:{name:'Barracks',vi:'Doanh trại',icon:'🛡️',desc:'Mỗi cấp mở một bậc quân; bậc cao còn có điều kiện phụ chưa khôi phục.',base:{gold:220,wood:38,ore:38,sulfur:8,crystal:8},state:'observed'},
 heroTower:{name:'Hero Tower',vi:'Tháp tướng',icon:'🗼',desc:'Bổ nhiệm Castellan; tăng kinh nghiệm tướng.',base:{gold:250,wood:42,ore:32,sulfur:9,crystal:11},state:'observed'},
 tavern:{name:'Tavern',vi:'Quán trọ',icon:'🍺',desc:'Tuyển tướng; chất lượng ứng viên phụ thuộc cấp.',base:{gold:240,wood:30,ore:25,sulfur:12,crystal:8},state:'observed'},
 warehouse:{name:'Warehouse',vi:'Kho',icon:'📦',desc:'Tăng dung lượng tài nguyên.',base:{gold:200,wood:40,ore:40,sulfur:9,crystal:9},state:'observed'},
 magicTower:{name:'Magic Tower',vi:'Tháp phép',icon:'🔮',desc:'Nghiên cứu phép cho thành và tướng.',base:{gold:290,wood:40,ore:36,sulfur:14,crystal:14},state:'observed'},
 arena:{name:'Arena',vi:'Đấu trường',icon:'⚕️',desc:'Bệnh xá hồi phục quân bị thương.',base:{gold:180,wood:35,ore:25,sulfur:9,crystal:8},state:'observed'},
 market:{name:'Market',vi:'Thị trường',icon:'⚖️',desc:'Bán/đổi tài nguyên theo phiên bản thử nghiệm; giá trao đổi chưa xác minh.',base:{gold:170,wood:20,ore:20,sulfur:10,crystal:10},state:'observed'},
 bazaar:{name:'Bazaar',vi:'Thương hội',icon:'🏪',desc:'Bán trang bị demo theo cấp Bazaar, chưa có cuộn phép gốc.',base:{gold:210,wood:30,ore:15,sulfur:12,crystal:12},state:'observed'},
 embassy:{name:'Embassy',vi:'Đại sứ quán',icon:'🏳️',desc:'Bang hội và tiếp viện; chưa có multiplayer.',base:{gold:190,wood:32,ore:36,sulfur:8,crystal:8},state:'catalog'},
 stables:{name:'Stables',vi:'Chuồng ngựa',icon:'🐎',desc:'Công trình hỗ trợ quân nâng cao; điều kiện chưa xác minh.',base:{gold:250,wood:30,ore:35,sulfur:15,crystal:12},state:'catalog'},
 forge:{name:'Forge',vi:'Lò rèn',icon:'⚒️',desc:'Công trình hỗ trợ trang bị/quân; hiệu ứng chưa xác minh.',base:{gold:200,wood:24,ore:48,sulfur:14,crystal:10},state:'catalog'}
};
const spells={forestry:{name:'Forestry',vi:'Lâm nghiệp',res:'wood',base:20,rate:.05},mining:{name:'Mining',vi:'Khai khoáng',res:'ore',base:20,rate:.05},refining:{name:'Refining',vi:'Tinh luyện',res:'sulfur',base:10,rate:.05},polishing:{name:'Polishing',vi:'Đánh bóng',res:'crystal',base:10,rate:.05},storing:{name:'Storing',vi:'Trữ kho',capacity:.05},construction:{name:'Construction',vi:'Xây dựng',time:.03},manufacturing:{name:'Manufacturing',vi:'Chế tạo',goldDiscount:.02},scouting:{name:'Scouting',vi:'Trinh sát',effect:'Mở tuyển Scout'},bootcamp:{name:'Bootcamp',vi:'Huấn luyện',time:.02}};
const C={version:2,keys,races,resource,units,buildings,spells,source};
root.HOG_CATALOG=C;if(typeof module==='object'&&module.exports)module.exports=C;
})(typeof globalThis!=='undefined'?globalThis:this);


