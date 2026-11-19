'use strict';
/* CHAT02 fail-closed source-only triage contract. No gameplay import. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const p = path.join(__dirname, '../../../data/ngoalong/modules/troops/npc_numeric_exception_triage_v1.json');
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const records = d.records;
test('CHAT02 crosschat exception triage remains reference-only and correctly counted', () => {
  assert.equal(d.scope, 'REFERENCE_ONLY_NO_RUNTIME_BINDING');
  assert.equal(d.sourceEdition, 'CURRENT_VNG_MOBILE');
  assert.equal(d.classicParity, 'UNKNOWN');
  assert.equal(records.length, 44);
  assert.equal(new Set(records.map(x => x.wikiTroopId)).size, 44);
  assert.deepEqual(d.totals, {ambiguous:9, missing:35, chestLabeled:11, nonChestMissing:24, positions:851});
  assert.deepEqual(records.filter(x=>x.classification==='DUPLICATE_CATALOGUE_NAME').map(x=>x.wikiTroopId).sort((a,b)=>a-b), [29,31,89,99,103,142,206,232,270]);
  assert.equal(records.filter(x=>x.classification==='CHEST_LABEL_IN_NPC_FORMATION').length, 11);
  assert.equal(records.filter(x=>x.classification==='MISSING_CHAT02_PROFILE_NPC_FORMATION').length, 24);
  assert.equal(records.reduce((n,x)=>n+x.observedInNpcFormation,0), 851);
});
test('No unproven numeric joins, recruitability, or runtime mappings permitted', () => {
  for (const x of records) {
    assert.ok(Number.isSafeInteger(x.wikiTroopId) && x.wikiTroopId > 0);
    assert.ok(x.wikiName && x.observedInNpcFormation > 0);
    assert.ok(x.sourceExamples?.length && x.sourceExamples.every(s=>s.url?.startsWith('https://ngoalong.vnggames.com/')));
    assert.equal(x.canonicalNumericIdentity, 'UNKNOWN');
    assert.equal(x.approvedChat02Id, null);
    assert.equal(x.approvedRuntimeTroopId, null);
    assert.equal(x.recruitableConfirmed, false);
    assert.equal(x.npcOnlyConfirmed, false);
    assert.equal(x.runtimeEnabled, false);
    assert.equal(x.reviewStatus, 'OPEN');
    assert.ok(x.outstandingEvidence.length);
    if (x.classification==='DUPLICATE_CATALOGUE_NAME') {
      assert.equal(x.chat02Profiles.length, 2);
      assert.equal(x.currentWikiCatalogEvidence.independentNumericIdJoin, 'UNVERIFIED');
    } else {
      assert.equal(x.chat02Profiles.length, 0);
      assert.equal(x.currentWikiCatalogEvidence, null);
    }
  }
});
