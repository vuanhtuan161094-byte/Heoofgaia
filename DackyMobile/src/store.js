import { migrateSave } from './engine.js';

const DB_NAME = 'dacky-mobile-local';
const DB_VERSION = 1;
const SAVE_KEY = 'campaign';
const FALLBACK_KEY = 'dacky-mobile-save-v1';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB không khả dụng.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được IndexedDB.'));
    request.onblocked = () => reject(new Error('Một tab khác đang nâng cấp kho lưu game.'));
  });
}

async function databaseRequest(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('saves', mode);
      const store = tx.objectStore('saves');
      let request;
      try { request = operation(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error || request?.error || new Error('Giao dịch lưu thất bại.'));
      tx.onabort = () => reject(tx.error || new Error('Giao dịch lưu bị hủy.'));
    });
  } finally { db.close(); }
}

export async function loadGame() {
  try {
    const value = await databaseRequest('readonly', store => store.get(SAVE_KEY));
    if (value?.payload) return migrateSave(value.payload);
  } catch (error) {
    console.info('Dùng bản lưu dự phòng cục bộ:', error.message);
  }
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? migrateSave(JSON.parse(raw)) : null;
  } catch (error) {
    console.warn('Không đọc được bản lưu dự phòng:', error.message);
    return null;
  }
}

export async function saveGame(state) {
  const payload = migrateSave(state);
  const serialized = JSON.stringify(payload);
  try { localStorage.setItem(FALLBACK_KEY, serialized); } catch (error) {
    console.warn('Bản dự phòng localStorage không ghi được:', error.message);
  }
  await databaseRequest('readwrite', store => store.put({ id: SAVE_KEY, payload, savedAt: Date.now() }));
  return payload;
}

export function exportSave(state) {
  const payload = migrateSave(state);
  const body = JSON.stringify({ format: 'dacky-mobile-save', version: 1, exportedAt: new Date().toISOString(), save: payload }, null, 2);
  return new Blob([body], { type: 'application/json' });
}

export async function importSaveFile(file) {
  if (!file || file.size > 5 * 1024 * 1024) throw new Error('Tệp lưu trống hoặc lớn hơn giới hạn 5 MB.');
  const data = JSON.parse(await file.text());
  if (data.format !== 'dacky-mobile-save' || !data.save) throw new Error('Đây không phải tệp lưu Dacky Mobile hợp lệ.');
  return migrateSave(data.save);
}

export async function eraseLocalSave() {
  localStorage.removeItem(FALLBACK_KEY);
  try { await databaseRequest('readwrite', store => store.delete(SAVE_KEY)); } catch (error) { console.warn(error); }
}
