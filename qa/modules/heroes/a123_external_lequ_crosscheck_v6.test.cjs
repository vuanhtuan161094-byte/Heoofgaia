'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../../../data/ngoalong/modules/heroes');
const old = JSON.parse(fs.readFileSync(path.join(dir, 'a123_hero_research_audit_v5.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(dir, 'a123_external_lequ_crosscheck_v6.json'), 'utf8'));
let checks = 0;
function ok(cond, msg) { assert.ok(cond, msg); checks++; }
ok(data.schemaVersion === 6, 'v6 schema');
ok(data.basedOn === 'a123_hero_research_audit_v5.json', 'v5 provenance');
ok(data.policy.noRuntimeImport && data.policy.noAutoAliasMerge, 'no runtime and no auto alias');
ok(data.policy.classicStatsNeverOverrideMobile && data.policy.unknownCurrentRoleRemainsUnknown, 'edition and role gates');
const original = {
 A1: old.a1.rows.filter(r => r.wikiName !== 'Tào Phi').map(r => r.heroId),
 A2: old.a2.rows.filter(r => r.after === 'STILL_MOBILE_UNKNOWN').map(r => r.heroId),
 A3: old.a3.rows.filter(r => r.classification === 'UNKNOWN_ROLE').map(r => r.heroId)
};
const expected = { A1: [17, 17, 0], A2: [121, 101, 20], A3: [69, 68, 1] };
const seen = new Set();
for (const group of ['A1', 'A2', 'A3']) {
 const rows = data.rows[group];
 const [total, sourced, missing] = expected[group];
 ok(rows.length === total, group + ': total');
 ok(data.summary[group].total === total && data.summary[group].sourcedHistoric === sourced && data.summary[group].stillMissingAllExternal === missing, group + ': counters');
 ok(rows.filter(r => r.historicEvidence !== null).length === sourced, group + ': sourced');
 ok(rows.filter(r => r.historicEvidence === null).length === missing, group + ': unsourced');
 ok(rows.map(r => r.heroId).join(',') === original[group].join(','), group + ': roster id/order');
 for (const row of rows) {
  ok(!seen.has(row.heroId), 'unique hero ID ' + row.heroId);
  seen.add(row.heroId);
  ok(row.actualMobileBaseStats === null && row.actualMobileSkillCoefficient === null && row.actualMobileAcquisition === null, 'unknown Mobile fields ' + row.heroId);
  ok(row.currentRoleConfirmed === false && row.readyForGameplay === false, 'no auto-promotion ' + row.heroId);
  const ev = row.historicEvidence;
  if (!ev) continue;
  ok(ev.gameplayImport === false && ev.mobileVersion2026Confirmed === false && ev.mobileStatsConfirmed === false && ev.mobileRecruitmentConfirmed === false, 'source edition gates ' + row.heroId);
  ok(ev.sourceEdition.startsWith('HISTORIC_WEB_'), 'historic lane ' + row.heroId);
  ok(Object.values(data.externalSourceRegistry).some(s => s.url === ev.sourceUrl && s.date === ev.sourceDate && s.lane === ev.sourceEdition), 'source registry ' + row.heroId);
  ok(typeof ev.chineseNameInSource === 'string' && ev.chineseNameInSource.length > 0, 'name provenance ' + row.heroId);
  ok(ev.sourceSkillMechanicsComplete === false && (ev.historicStatsCommandMightIntellect === null || (ev.historicStatsCommandMightIntellect.length === 3 && ev.historicStatsCommandMightIntellect.every(Number.isFinite))), 'historical limits ' + row.heroId);
 }
}
ok(seen.size === 207, 'all 207 unique backlog IDs');
const get = name => Object.values(data.rows).flat().find(r => r.name === name);
ok(get('Nghiêm Chính').historicEvidence.sourceAcquisitionCategory === 'CLASSIC_TAVERN_TALK', 'Nghiem Chinh classic tavern');
ok(get('Lý Điển').historicEvidence.sourceAcquisitionCategory === 'CLASSIC_CAMPAIGN_RECRUIT', 'Ly Dien classic campaign');
ok(get('Vương Song').historicEvidence.sourceAcquisitionCategory === 'CLASSIC_GREEN_AWAKENING', 'Vuong Song classic awakening');
for (const name of ['Hách Chiêu','Hí Chí Tài','Lạc Tiến','Mê Đương','Lý Giác','Hậu Tuyển']) {
 ok(get(name).historicEvidence.romanizationOrNamingReviewRequired === true, 'manual alias gate ' + name);
}
console.log('A1/A2/A3 external V6: ' + checks + '/' + checks + ' PASS, 17 Wei + 101 Qun + 68 Neutral historic evidence, 0 runtime imports');
