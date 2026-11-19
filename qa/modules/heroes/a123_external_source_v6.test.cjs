'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../../../data/ngoalong/modules/heroes');
const read = file => JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'));
const v6 = read('a123_external_lequ_crosscheck_v6.json');
const gaps = read('a123_external_gap_followups_v6.json');
const delta = read('a123_lequ_2021_recruitment_delta_v6.json');
const idMap = new Map(Object.entries(v6.rows).flatMap(([group, rows]) => rows.map(r => [r.heroId, {group, name:r.name, primary:r}])));
let checks = 0;
function check(condition, reason) { assert.ok(condition, reason); checks++; }
check(idMap.size === 207, '207 unique backed IDs');
check(gaps.schemaVersion === 6 && delta.schemaVersion === 6, 'schema version');
check(gaps.noAutoImport && delta.noAutoPromote, 'no import');
check(gaps.rows.length === 21 && gaps.summary.gapTotal === 21, '21 original gaps');
const seen = new Set();
for (const row of gaps.rows) {
 check(idMap.has(row.heroId), 'gap bound ID ' + row.heroId);
 const known = idMap.get(row.heroId);
 check(known.group === row.group && known.name === row.name, 'name group ' + row.heroId);
 check(known.primary.historicEvidence === null, 'must truly be a V6 gap ' + row.heroId);
 check(!seen.has(row.heroId), 'no duplicate gap ' + row.heroId);
 seen.add(row.heroId);
 check(row.mobile2026Role === 'UNKNOWN' && row.runtimeEligible === false, 'do not promote ' + row.heroId);
 if (row.addition) {
  check(row.addition.gameplayImport === false && row.addition.currentMobileRecruitment === null && row.addition.originalCurrentMobileStats === null, 'edition isolation ' + row.heroId);
  check(row.addition.verificationTier.startsWith('FULL_') || row.addition.verificationTier.startsWith('SEARCH_'), 'source tier ' + row.heroId);
  check(row.addition.sourceUrl.startsWith('https://'), 'source URL ' + row.heroId);
 }
}
check(seen.size === 21, 'unique gaps');
check(gaps.summary.excerptsOrFull === 9 && gaps.summary.fullPage === 8 && gaps.summary.snippetOnly === 1 && gaps.summary.remainingNoAdditionalSource === 12, 'gap source counts');
const wang = gaps.rows.find(r => r.name === 'Vương Cơ');
check(wang.addition.sourceDate === '2012-05-31' && wang.addition.historicRecruitmentEvidence.includes('tavern'), '2012 Wang Ji dated evidence');
check(gaps.rows.find(r => r.name === 'Tỏa Nô').addition.verificationTier === 'SEARCH_SNIPPET_ONLY_FULL_PAGE_403', 'snippet only not full verification');
check(gaps.rows.find(r => r.name === 'Nghiêm Dư').addition === null, 'neutral Nghiêm Dư unresolved');
check(delta.rows.length === 69 && delta.summary.total === 69, '69 dated changes');
check(delta.summary.byGroup.A1 === 0 && delta.summary.byGroup.A2 === 26 && delta.summary.byGroup.A3 === 43, '26/43 by group');
check(delta.summary.transitions.MAP_DIRECT_TO_UNAVAILABLE === 17 && delta.summary.transitions.MAP_DIRECT_TO_TAVERN === 9 && delta.summary.transitions.MAP_TAVERN_TO_UNAVAILABLE === 43, '2021 transition types');
const changes = new Set();
for (const r of delta.rows) {
 check(idMap.has(r.heroId), 'historical transition hero ID ' + r.heroId);
 check(r.name === idMap.get(r.heroId).name && r.group === idMap.get(r.heroId).group, 'historical transition identity ' + r.heroId);
 check(!changes.has(r.heroId), 'no duplicate 2021 role transition ' + r.heroId);
 changes.add(r.heroId);
 check(r.sourceUrl === delta.sourceUrl && r.sourceDate === '2021-06-03' && r.effectiveDate === '2021-06-04', '2021 source provenance ' + r.heroId);
 check(r.mobileVietnamEdition2026Role === 'UNKNOWN' && r.mobile2026Recruitment === null && r.runtimeImport === false && r.cannotConcludeGloballyNPCOnly === true, 'no false 2026 role ' + r.heroId);
}
check(changes.size === 69, '69 unique 2021 changes');
check(idMap.size - (207 - 186 - gaps.summary.excerptsOrFull) === 195, '195 combined historical source references');
console.log('A123 external source V6 supplemental: ' + checks + '/' + checks + ' PASS; 195/207 historic evidence including one snippet-only; 69 dated 2021 role changes; zero runtime imports');
