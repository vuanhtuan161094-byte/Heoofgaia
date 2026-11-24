import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  BUZHOU_FLOORS, BUILDINGS, CONTENT_EVIDENCE, HEROES, ITEMS, LEGACY_REFERENCE_COUNTS,
  QUESTS, TECHNOLOGIES, TROOPS, TOWER_FLOORS, WORLD_NODES
} from '../src/catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tables = { buildings: BUILDINGS, technologies: TECHNOLOGIES, troops: TROOPS, heroes: HEROES, items: ITEMS, quests: QUESTS, worldNodes: WORLD_NODES };

export async function exportDatabase(outputPath = path.join(root, 'data', 'dacky-game-data.simulated.v1.json')) {
  const tableStats = {};
  let totalRecords = 0;
  for (const [name, rows] of Object.entries(tables)) {
    const ids = new Set(rows.map(row => row.id));
    if (ids.size !== rows.length || rows.some(row => !row.id || row.evidence !== 'SIMULATED')) {
      throw new Error(`Catalog ${name} has duplicate/missing IDs or unlabelled evidence.`);
    }
    tableStats[name] = { recordCount: rows.length, evidence: 'SIMULATED' };
    totalRecords += rows.length;
  }

  const database = {
    schemaVersion: 1,
    dataVersion: CONTENT_EVIDENCE.version,
    updated: CONTENT_EVIDENCE.updated,
    evidenceStatus: 'SIMULATED',
    evidenceNote: 'Toàn bộ giá trị trong gói này do dự án tự thiết kế; không phải bản trích xuất hoặc xác nhận tương đồng từ client Mobile/legacy.',
    sourceAccess: 'BLOCKED_HTTP_PROXY_403',
    referenceCounts: LEGACY_REFERENCE_COUNTS,
    tableStats: { totalRecords, tables: tableStats },
    tables,
    proceduralSystems: {
      fengshenTower: { evidence: 'SIMULATED', floorCount: TOWER_FLOORS, generatedAtRuntime: true, runtime: 'src/engine.js' },
      buzhouMountain: { evidence: 'SIMULATED', challengeCount: BUZHOU_FLOORS, generatedAtRuntime: true, runtime: 'src/engine.js', legacyReferenceNpcCount: LEGACY_REFERENCE_COUNTS.buzhouFixedNpcs },
      economy: { evidence: 'SIMULATED', runtime: 'src/engine.js', note: 'Sản xuất theo giờ, thuế/dân cư, kho, hàng đợi và giới hạn tiến trình offline.' },
      combat: { evidence: 'SIMULATED', runtime: 'src/engine.js', note: 'Tương khắc vai trò, đội hình nhiều binh chủng, lực chiến, thương vong, hồi phục và chiến lợi phẩm.' }
    },
    unavailableSourceTables: [
      { name: 'mobileVersionDelta', reason: 'Client và snapshot Mobile chưa truy cập được.' },
      { name: 'legacyHeroes', targetRecords: LEGACY_REFERENCE_COUNTS.famousGenerals, reason: 'Không có snapshot được phép sử dụng; chỉ catalog mô phỏng hiện có được xuất.' },
      { name: 'legacyItems', targetRecords: LEGACY_REFERENCE_COUNTS.legacy147Items, reason: 'Database legacy chưa tải hoặc giải mã.' },
      { name: 'legacyQuests', targetRecords: LEGACY_REFERENCE_COUNTS.quests, reason: 'Database legacy chưa tải hoặc giải mã.' },
      { name: 'immortalMountains', targetRecords: LEGACY_REFERENCE_COUNTS.elflands, reason: 'Bảng nguồn chưa truy cập được; bản đồ runtime là mô phỏng độc lập.' }
    ]
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(database, null, 2) + '\n');
  console.log(`JSON database exported: ${outputPath} (${totalRecords} simulated records).`);
  return database;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await exportDatabase();
