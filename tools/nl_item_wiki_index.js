#!/usr/bin/env node
'use strict';
// Optional snapshot extractor of public INDEX fields only. Does not scrape images,
// reveal proprietary formulas, or mark any Wiki record PLAYABLE.
// Execution requires Chromium/Playwright + internet. Never auto-runs in release build.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const PAGES = {
  equipment: 'https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi',
  items: 'https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham'
};
const TARGET = { equipment: 392, items: 674 };
function parseIndex(bodyText, domain) {
  if (!Object.prototype.hasOwnProperty.call(PAGES, domain)) throw new Error('BAD_DOMAIN');
  if (typeof bodyText !== 'string') throw new Error('BAD_TEXT');
  const marker = domain === 'equipment' ? /Tổng\s+(\d+)\s+trang bị/i : /Tổng\s+(\d+)\s+vật phẩm/i;
  const m = marker.exec(bodyText);
  if (!m) throw new Error('MISSING_TOTAL_MARKER');
  const declaredTotal = Number(m[1]);
  const subsection = bodyText.slice(m.index + m[0].length).split(/CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG/i)[0];
  const lines = subsection.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const rows = [], dup = new Map();
  let sourceGroup = null;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/^Image:\s*/i, '').trim();
    const heading = /^\+(.+?)\s+(\d+)$/.exec(line);
    if (heading) { sourceGroup = heading[1].trim(); continue; }
    // In some rendered versions the label and level are on consecutive lines.
    if (i + 1 < lines.length && /^Cấp\s+\d+$/.test(lines[i+1])) {
      line += ' ' + lines[++i];
    }
    const match = /^(.*?)\s+Cấp\s+(\d+)$/.exec(line);
    if (!match) continue;
    const name = match[1].trim(), level = Number(match[2]);
    if (!name || !Number.isSafeInteger(level) || level < 0) continue;
    const collision = name.normalize('NFC') + '/' + level;
    dup.set(collision, (dup.get(collision) || 0) + 1);
    const key = crypto.createHash('sha256').update(collision).digest('hex').slice(0, 14);
    rows.push({
      id: 'wiki-index-' + (domain === 'equipment' ? 'eq' : 'it') + '-' + key +
        (dup.get(collision) > 1 ? '-' + dup.get(collision) : ''),
      name, domain, category: domain === 'equipment' ? 'equipment' : null,
      sourceGroup, displayedLevel: level, requiredLevel: null,
      slot: null, rarity: null, stats: null, effectRule: null,
      acquisitionRule: null, enhancementRule: null,
      integration: 'REFERENCE_ONLY',
      sourceEdition: 'VNG_WIKI_MOBILE_CURRENT',
      sourceUrl: PAGES[domain],
      fieldProvenance: { name:'VERIFIED',displayedLevel:'VERIFIED',
        requiredLevel:'UNKNOWN',slot:'UNKNOWN',rarity:'UNKNOWN',
        stats:'UNKNOWN',effectRule:'UNKNOWN',acquisitionRule:'UNKNOWN' },
      provenance: { classification:'VERIFIED',sourceId:'VNG_WIKI_MOBILE_INDEX',
        checkedAt:new Date().toISOString().slice(0,10) }
    });
  }
  if (declaredTotal !== TARGET[domain]) {
    throw new Error('SOURCE_COUNT_CHANGED_' + declaredTotal + '_EXPECTED_' + TARGET[domain]);
  }
  if (rows.length !== declaredTotal) {
    throw new Error('INCOMPLETE_PARSE_' + rows.length + '_OF_' + declaredTotal);
  }
  return { domain, declaredTotal, extracted:rows.length,
    sourceUrl:PAGES[domain], sourceEdition:'VNG_WIKI_MOBILE_CURRENT',
    classicParity:'UNKNOWN', runtimeAuthority:false, integration:'REFERENCE_ONLY',
    rows };
}
// Category controls on the public index provide actual slot identity.
// Never infer every 7th item from appearance or name; fail closed on mismatches.
const SLOT_FILTERS = [
  ['weapon','Vũ Khí'],['armor','Giáp'],['horse','Ngựa'],
  ['book','Binh Thư'],['cloak','Áo Choàng'],
  ['shield','Thuẫn'],['artifact','Bảo Vật']
];
function filteredPairs(text) {
  if (typeof text !== 'string') throw new Error('BAD_FILTER_TEXT');
  const begin = text.search(/Tổng\s+\d+\s+trang bị/i);
  if (begin < 0) throw new Error('FILTER_TOTAL_MISSING');
  const content = text.slice(begin).split(/CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG/i)[0];
  const pairs=[];
  for (const line of content.split(/\r?\n/)) {
    const match=/^\s*(.*?)\s+Cấp\s+(\d+)\s*$/.exec(line);
    if (match) pairs.push([match[1].trim().normalize('NFC'), Number(match[2])]);
  }
  return pairs;
}
function assignFilteredSlots(index, views) {
  if (!index || !Array.isArray(index.rows) || index.rows.length !== TARGET.equipment)
    throw new Error('INDEX_NOT_COMPLETE');
  const signature=x=>x[0].normalize('NFC')+'|'+x[1];
  const available=new Set(index.rows.map(row=>signature([row.name,row.displayedLevel])));
  const assigned=new Map();
  for (const [slot] of SLOT_FILTERS) {
    const rows=filteredPairs(views[slot]);
    if (!rows.length || rows.length >= TARGET.equipment)
      throw new Error('FILTER_DID_NOT_APPLY_'+slot);
    for(const item of rows) {
      const sig=signature(item);
      if (!available.has(sig))throw new Error('FILTER_UNKNOWN_RECORD_'+slot);
      if (assigned.has(sig) && assigned.get(sig)!==slot)
        throw new Error('FILTER_AMBIGUOUS_RECORD_'+sig);
      assigned.set(sig,slot);
    }
  }
  for(const row of index.rows) {
    const slot=assigned.get(signature([row.name,row.displayedLevel]));
    if(!slot)throw new Error('UNMATCHED_EQUIPMENT_FILTER_'+row.name);
    row.slot=slot;
    row.fieldProvenance.slot='VERIFIED';
  }
  index.slotAudit={method:'PUBLIC_WIKI_FILTERED_BUTTONS',verifiedRows:index.rows.length,
    slotCounts:Object.fromEntries(SLOT_FILTERS.map(([key])=>[key,index.rows.filter(x=>x.slot===key).length]))};
  return index;
}
async function collectSlotViews(page) {
  const views={};
  for(const [slot,label] of SLOT_FILTERS) {
    let clicked=false;
    for(const frame of page.frames()){
      const control=frame.getByRole('button',{name:label,exact:true});
      if (await control.count()) {
        await control.first().click({timeout:12000});
        clicked=true;
        break;
      }
    }
    if(!clicked)throw new Error('FILTER_BUTTON_MISSING_'+label);
    await page.waitForTimeout(450);
    const texts=await Promise.all(page.frames().map(async frame=>{
      try{return await frame.locator('body').innerText({timeout:8000})}catch{return ''}
    }));
    views[slot]=texts.filter(t=>/Tổng\s+\d+\s+trang bị/i.test(t))
      .sort((a,b)=>b.length-a.length)[0]||'';
  }
  return views;
}
async function liveText(page, domain) {
  await page.goto(PAGES[domain], { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const texts = await Promise.all(page.frames().map(async f => {
    try { return await f.locator('body').innerText({ timeout:6000 }); } catch { return ''; }
  }));
  const marker = domain === 'equipment' ? /Tổng\s+\d+\s+trang bị/i : /Tổng\s+\d+\s+vật phẩm/i;
  return texts.filter(t=>marker.test(t)).sort((a,b)=>b.length-a.length)[0] || '';
}
async function main(argv) {
  const fixtureIndex=argv.indexOf('--fixture');
  const isFixture=fixtureIndex>=0;
  let source = isFixture ? fs.readFileSync(argv[fixtureIndex+1], 'utf8') : null;
  let browser;
  try {
    if (!isFixture) {
      const playwright = require('playwright');
      browser = await playwright.chromium.launch({ headless:true });
    }
    const snapshot={schemaVersion:1,checkedAt:new Date().toISOString(),source:'VNG_WIKI_MOBILE_CURRENT',
      caveat:'Index fields only; all records REFERENCE_ONLY; no Wiki stats or game formulas inferred',domains:{}};
    const domains = isFixture ? [argv.includes('--items')?'items':'equipment'] : ['equipment','items'];
    for (const domain of domains) {
      const page=isFixture?null:await browser.newPage();
      const text=isFixture?source:await liveText(page,domain);
      snapshot.domains[domain]=parseIndex(text,domain);
      if(domain==='equipment'&&!isFixture)
        assignFilteredSlots(snapshot.domains[domain],await collectSlotViews(page));
    }
    const serialized=JSON.stringify(snapshot,null,2)+'\n';
    if (argv.includes('--write')) {
      if (isFixture) throw new Error('FIXTURE_WRITE_FORBIDDEN');
      const output=path.join(__dirname,'../data/ngoalong/modules/items/wiki_index_snapshot.json');
      fs.writeFileSync(output,serialized,'utf8');
      process.stdout.write('WROTE '+output+'\n');
    } else process.stdout.write(JSON.stringify(Object.fromEntries(
      Object.entries(snapshot.domains).map(([k,v])=>[k,v.extracted])))+'\n');
  } finally { if (browser) await browser.close(); }
}
if (require.main === module) main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1});
module.exports={parseIndex,filteredPairs,assignFilteredSlots,SLOT_FILTERS,PAGES,TARGET};
