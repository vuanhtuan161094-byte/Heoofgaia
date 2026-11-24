/*
 * Independently authored game content. The public mobile reference was
 * unreachable from this build environment, so every gameplay value in this
 * catalog is explicitly SIMULATED; names that are mythological references do
 * not imply that the original client uses these exact records or numbers.
 */
export const CONTENT_EVIDENCE = Object.freeze({
  status: 'SIMULATED',
  source: 'Independent offline-first design; public reference access blocked (HTTP proxy 403)',
  version: 'dacky-mobile-sim-v1',
  updated: '2026-11-24'
});

export const RESOURCE_INFO = Object.freeze({
  food: { name: 'Lương thực', short: 'Lương', glyph: '糧' },
  timber: { name: 'Gỗ', short: 'Gỗ', glyph: '木' },
  stone: { name: 'Đá', short: 'Đá', glyph: '石' },
  iron: { name: 'Sắt', short: 'Sắt', glyph: '鐵' },
  gold: { name: 'Đồng', short: 'Đồng', glyph: '金' },
  jade: { name: 'Linh ngọc', short: 'Ngọc', glyph: '玉' }
});

const buildingRows = [
  ['citadel','Tử Vi Thành','nội thành','城', 'gold', 8, 80, 60, 25],
  ['barracks','Thần Binh Doanh','quân sự','兵', 'troops', 0, 90, 55, 30],
  ['granary','Linh Thương','kinh tế','倉', 'food', 0, 55, 15, 15],
  ['lumber','Phong Mộc Trường','kinh tế','林', 'timber', 0, 65, 10, 15],
  ['quarry','Thạch Tủy Phường','kinh tế','山', 'stone', 0, 75, 25, 15],
  ['foundry','Huyền Thiết Lò','kinh tế','爐', 'iron', 0, 90, 35, 20],
  ['market','Triều Ca Thị','kinh tế','市', 'gold', 0, 70, 25, 25],
  ['academy','Thái Học Viện','nghiên cứu','學', 'research', 0, 100, 80, 35],
  ['altar','Phong Thần Đàn','thần tiên','壇', 'jade', 0, 80, 80, 45],
  ['manor','Tiên Gia Phủ','thần tiên','府', 'heroes', 0, 95, 85, 40],
  ['training','Bách Chiến Đài','quân sự','戰', 'training', 0, 70, 65, 20],
  ['clinic','Hồi Xuân Đường','quân sự','醫', 'healing', 0, 55, 55, 20],
  ['wall','Huyền Vũ Thành','phòng thủ','垣', 'defense', 0, 120, 100, 55],
  ['watch','Thiên Lý Đài','phòng thủ','望', 'scout', 0, 85, 55, 40],
  ['storehouse','Càn Khôn Khố','nội thành','庫', 'storage', 0, 80, 45, 25],
  ['farm','Ngũ Cốc Viên','ngoại thành','田', 'food', 0, 50, 20, 10],
  ['grove','Thanh Long Lâm','ngoại thành','林', 'timber', 0, 55, 20, 10],
  ['mine','Địa Mạch Khoáng','ngoại thành','礦', 'stone', 0, 75, 35, 15],
  ['foundryfield','Xích Kim Quặng','ngoại thành','金', 'iron', 0, 80, 40, 15],
  ['embassy','Bát Phương Quán','ngoại thành','盟', 'diplomacy', 0, 75, 65, 30],
  ['caravan','Vạn Lý Trạm','ngoại thành','驛', 'trade', 0, 65, 50, 20]
];

export const BUILDINGS = Object.freeze(buildingRows.map(([id,name,zone,glyph,effect,food,timber,stone,iron], index) => ({
  id, name, zone, glyph, effect, index,
  baseCost: { food: food * 3, timber: timber * 3, stone: stone * 2, iron: iron * 2, gold: 40 + index * 7 },
  seconds: 12 + index % 4 * 3,
  maxLevel: 30,
  evidence: 'SIMULATED'
})));

const troopNames = [
  ['Dân binh','bộ binh','平'], ['Đao thuẫn thủ','bộ binh','盾'], ['Trường thương quân','bộ binh','槍'],
  ['Thiết giáp vệ','bộ binh','鎧'], ['Huyền giáp quân','bộ binh','玄'], ['Thần Cơ nỏ thủ','xạ thủ','弩'],
  ['Liên nỗ binh','xạ thủ','連'], ['Thanh Vũ cung thủ','xạ thủ','羽'], ['Hỏa tiễn thủ','xạ thủ','火'],
  ['Du kỵ binh','kỵ binh','騎'], ['Thiết kỵ doanh','kỵ binh','鐵'], ['Phi Vân kỵ','kỵ binh','雲'],
  ['Hổ Báo kỵ','kỵ binh','虎'], ['Trọng kỵ Thiên Sách','kỵ binh','策'], ['Công thành xa','công thành','車'],
  ['Phá thành chùy','công thành','破'], ['Liệt Hỏa nỏ xa','công thành','弩'], ['Vân Thê quân','công thành','梯'],
  ['Thần Hỏa pháo','công thành','炮'], ['Trinh sát ưng vệ','trinh sát','鷹'], ['Dạ hành thám kỵ','trinh sát','夜'],
  ['Bạch Hạc đạo binh','đạo binh','鶴'], ['Lôi Phù tiên binh','đạo binh','雷'], ['Huyền Thủy vệ','đạo binh','水'],
  ['Xích Diệm chiến sĩ','đạo binh','焰'], ['Thanh Mộc linh quân','đạo binh','木'], ['Thạch Tượng vệ','đạo binh','石'],
  ['Kim Giáp lực sĩ','đạo binh','金'], ['Phi Thiên vệ','đạo binh','天'], ['Trấn Sơn thần tốt','đạo binh','山'],
  ['Long Kỵ vệ','kỵ binh','龍'], ['Phượng Vũ cung cơ','xạ thủ','鳳'], ['Côn Ngô đao sĩ','bộ binh','吳'],
  ['Bắc Đẩu trận binh','đạo binh','斗'], ['Thất Tinh kiếm vệ','đạo binh','星'], ['Cửu U âm tốt','đạo binh','幽'],
  ['Thiên Cương hộ quân','đạo binh','剛'], ['Địa Sát phục binh','trinh sát','伏'], ['Phong Thần cấm vệ','đạo binh','神']
];
export const TROOPS = Object.freeze(troopNames.map(([name,role,glyph], i) => {
  const tier = Math.floor(i / 6) + 1;
  const scale = 1 + tier * 0.42;
  const counter = role === 'kỵ binh' ? 'xạ thủ' : role === 'xạ thủ' ? 'bộ binh' : role === 'bộ binh' ? 'kỵ binh' : 'trinh sát';
  return {
    id: `troop-${String(i + 1).padStart(2,'0')}`, name, role, glyph, tier,
    attack: Math.round((7 + i % 5 * 2) * scale), defense: Math.round((6 + (i + 2) % 5 * 2) * scale),
    speed: Math.round((5 + (i * 3) % 7) * scale), morale: 70 + i % 4 * 5, counter,
    cost: { food: 18 * tier, timber: role === 'công thành' ? 20 * tier : 4 * tier, iron: 9 * tier, gold: 8 * tier },
    trainSeconds: 5 + tier * 2, unlockCity: Math.min(30, tier * 2), evidence: 'SIMULATED'
  };
}));

const heroRows = [
  ['Khương Tử Nha','quân sư','water','太師'], ['Na Tra','tiên phong','fire','乾坤'], ['Dương Tiễn','hộ vệ','metal','天眼'],
  ['Hoàng Phi Hổ','thống soái','earth','鎮國'], ['Lôi Chấn Tử','đột kích','wind','雷翼'], ['Đặng Thiền Ngọc','xạ thủ','earth','五光'],
  ['Long Cát Công Chúa','trị liệu','water','甘露'], ['Vi Na','quân sư','wood','靈符'], ['Hàn Độc Long','phòng thủ','water','玄甲'],
  ['Tô Hộ','thống soái','fire','忠烈'], ['Bạch Hạc Đồng Tử','hỗ trợ','wind','仙鶴'], ['Ân Giao','đột kích','metal','番天'],
  ['Tân Hoàn','xạ thủ','fire','火羽'], ['Triệu Công Minh','thống soái','metal','定海'], ['Văn Trọng','quân sư','thống soái','聞仲'],
  ['Thân Công Báo','quân sư','water','黑虎'], ['Cơ Phát','thống soái','wood','天命'], ['Thạch Cơ','phòng thủ','earth','白骨']
];
export const HEROES = Object.freeze(heroRows.map(([name,role,element,signature], i) => ({
  id: `hero-${String(i + 1).padStart(2,'0')}`, name, role, element, signature,
  quality: i < 4 ? 'Thiên' : i < 11 ? 'Địa' : 'Nhân',
  attack: 18 + (i * 7) % 16, defense: 16 + (i * 5) % 18, wisdom: 18 + (i * 11) % 20,
  skill: ['Hỏa Phù Liệt Trận','Huyền Thủy Hộ Thể','Phong Lôi Kích','Thất Tinh Trợ Chiến'][i % 4],
  skillText: ['gây sát thương diện rộng','giảm thương cho quân ta','đánh nhanh tuyến trước','tăng sĩ khí đội hình'][i % 4],
  evidence: 'SIMULATED'
})));

const gearNames = [
  ['Bạch Ngọc Kiếm','vũ khí','玉劍'], ['Trấn Sơn Đao','vũ khí','鎮刀'], ['Phục Ma Cung','vũ khí','伏弓'],
  ['Huyền Thiết Giáp','giáp','玄甲'], ['Lưu Vân Bào','giáp','雲袍'], ['Bách Thú Khôi','giáp','獸盔'],
  ['Thất Tinh Bội','pháp bảo','七星'], ['Càn Khôn Xích','pháp bảo','乾坤'], ['Hỏa Tiêm Thương','pháp bảo','火尖'],
  ['Tụ Tiên Kỳ','pháp bảo','聚仙'], ['Bình Ngọc Tịnh','pháp bảo','玉淨'], ['Định Hải Châu','pháp bảo','定海'],
  ['Linh Chi Ngàn Năm','vật phẩm','靈芝'], ['Tụ Khí Đan','vật phẩm','丹'], ['Quân Lệnh Phù','vật phẩm','令'],
  ['Bản Đồ Cổ','vật phẩm','圖'], ['Lệnh Bài Triều Ca','vật phẩm','令牌'], ['Hồn Ngọc','vật phẩm','魂']
];
export const ITEMS = Object.freeze(gearNames.map(([name,type,glyph], i) => ({
  id: `item-${String(i + 1).padStart(2,'0')}`, name, type, glyph, tier: 1 + i % 5,
  bonus: type === 'vật phẩm' ? 0 : 3 + (i * 7) % 15,
  effect: type === 'vật phẩm' ? ['Hồi 120 lương thực','Tăng 10% kinh nghiệm','Mở rương chiến lợi phẩm'][i % 3] : `+${3 + (i * 7) % 15} ${i % 2 ? 'phòng thủ' : 'công kích'}`,
  evidence: 'SIMULATED'
})));

const techNames = [
  ['Nông Chính','food'], ['Lâm Nghiệp','timber'], ['Khai Sơn','stone'], ['Luyện Kim','iron'],
  ['Thị Thương','gold'], ['Quản Dân','population'], ['Trị Thủy','food'], ['Kiến Trúc','build'],
  ['Cơ Quan','training'], ['Binh Pháp','attack'], ['Thủ Thành','defense'], ['Kỵ Thuật','cavalry'],
  ['Cung Nỏ','archer'], ['Y Đạo','healing'], ['Trận Đồ','formation'], ['Dịch Trạm','march'],
  ['Luyện Khí','hero'], ['Tinh Tượng','scout'], ['Ngoại Giao','diplomacy']
];
export const TECHNOLOGIES = Object.freeze(techNames.map(([name,effect], i) => ({
  id: `tech-${String(i + 1).padStart(2,'0')}`, name, effect, maxLevel: 30,
  baseCost: { food: 45 + i * 6, gold: 35 + i * 5, jade: effect === 'hero' ? 1 : 0 }, seconds: 18 + i % 4 * 4,
  evidence: 'SIMULATED'
})));

const questTitles = [
  ['Nâng Tử Vi Thành','upgrade','citadel',3], ['Tích lương luyện binh','train','troop',8], ['Tìm hiền sĩ trợ trận','recruit','hero',1],
  ['Rèn binh khí đầu tiên','equip','item',1], ['Mở đường qua dã địa','win','field',1], ['Kết minh cùng NPC','guild','guild',1], ['Phong Thần khởi sự','tower','tower',3],
  ['Thu phục danh thành','capture','city',1], ['Khảo nghiệm Bất Chu','buzhou','floor',1], ['Nâng cao quốc lực','power','power',500]
];
export const QUESTS = Object.freeze([
  ...Array.from({ length: 48 }, (_, i) => {
    const [title,type,target,base] = questTitles[i % questTitles.length];
    const chapter = Math.floor(i / 6) + 1;
    return { id: `quest-${String(i + 1).padStart(3,'0')}`, chapter, title: i < questTitles.length ? title : `${title} · hồi ${chapter}`,
      type, target, goal: base + Math.floor(i / 9), reward: { food: 130 + i * 30, timber: 100 + i * 22, gold: 90 + i * 18, jade: i % 4 === 0 ? 1 : 0, xp: 80 + i * 25 },
      evidence: 'SIMULATED' };
  }),
  { id:'quest-049', chapter:8, title:'Phong Thần định cục', type:'boss', target:'node-120', goal:1,
    reward:{food:12000,timber:10000,stone:8000,iron:6000,gold:12000,jade:24,xp:10000}, evidence:'SIMULATED' }
]);

const regionPrefixes = ['Thanh Khâu','Vân Mộng','Cửu Lê','Lạc Thủy','Bắc Minh','Tây Kỳ','Phong Lăng','Quy Khư','Hoàng Hà','Thái Hư','Tử Tiêu','Huyền Cơ','Bạch Lộc','Thương Sơn','Côn Ngô'];
const regionSuffixes = ['Quan','Trấn','Đài','Cốc','Sơn','Bến','Lĩnh','Thành'];
export const WORLD_NODES = Object.freeze(Array.from({ length: 120 }, (_, i) => {
  const isCity = i < 75;
  const isField = i >= 75 && i < 105;
  const isBoss = i === 119;
  const chapter = Math.floor(i / 15) + 1;
  const generatedName = `${regionPrefixes[Math.floor(i / regionSuffixes.length) % regionPrefixes.length]} ${regionSuffixes[i % regionSuffixes.length]}`;
  const name = isBoss ? 'Triều Ca · Trụ Vương' : generatedName;
  return { id: `node-${String(i + 1).padStart(3,'0')}`, name, kind: isBoss ? 'Boss chiến dịch' : isCity ? 'Danh thành' : isField ? 'Dã địa' : 'Tiên sơn', isBoss, chapter,
    level: Math.max(1, Math.floor(i / 4) + 1), x: 9 + (i * 37) % 82, y: 11 + (i * 53) % 76,
    power: isBoss ? 8400 : 80 + i * 34, loot: { food: isBoss ? 3200 : 80 + i * 12, timber: isBoss ? 2400 : 65 + i * 9, stone: isBoss ? 2000 : 50 + i * 8, gold: isBoss ? 3600 : 45 + i * 8, jade: isBoss ? 8 : i % 7 === 0 ? 1 : 0 },
    evidence: 'SIMULATED' };
}));

export const TOWER_FLOORS = 8992;
export const BUZHOU_FLOORS = 5;
export const LEGACY_REFERENCE_COUNTS = Object.freeze({
  legacy147Soldiers: 39,
  legacy147Items: 2155,
  alternateItems: 2157,
  unprefixedItems: 2157,
  famousGenerals: 540,
  buildings: 21,
  technologyLevels: 570,
  trainingRequirements: 126,
  quests: 1158,
  famousCities: 75,
  elflands: 624,
  elflandFloors: 8992,
  buzhouFixedNpcs: 90
});

export const colorForElement = Object.freeze({ fire: '#d85d32', water: '#4385a1', earth: '#c29a55', metal: '#d9bf84', wood: '#5c9472', wind: '#81a98e' });
