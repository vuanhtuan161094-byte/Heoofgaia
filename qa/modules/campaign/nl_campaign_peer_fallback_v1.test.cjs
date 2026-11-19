'use strict';
/* CHAT06 — no official Wiki-ID join and no gameplay injection from simulations. */
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../../../data/ngoalong/modules/campaign/nl_campaign_peer_fallback_v1.js');

const unit = (wikiSlot, id, name, soldiers = 100) =>
  ({wikiSlot, formationSlot: wikiSlot - 1, troopWikiId: id,
    troopName: name, soldiers, skill: {label: 'Source skill'}});
const npc = (id, order, level, boss, formation, extra = {}) =>
  ({id, mapId: 'wiki-map-1', order, level, boss,
    totalSoldiersRaw: formation.reduce((n, u) => n + (u.soldiers || 0), 0),
    formation, blockers: [], ...extra});
function sample() {
  const donor = npc('wiki-m1-ai11', 1, 100, false,
    [unit(1, 2, 'Đao Binh'), unit(5, 4, 'Giáp Bộ'), unit(9, 1, 'Bộ')]);
  const target = npc('wiki-m1-ai12', 2, 105, false,
    [unit(5, 29, 'Ngân Thương', 110), unit(9, 350, 'Viêm Chùy Kỵ', 110)],
    {blockers: ['FORMATION_NOT_EXHAUSTIVE']});
  const bossDonor = npc('wiki-m1-ai13', 3, 106, true,
    [unit(1, 2, 'Đao Binh'), unit(3, 4, 'Giáp Bộ'), unit(9, 1, 'Bộ')]);
  const bossTarget = npc('wiki-m1-ai14', 4, 106, true,
    [unit(3, 360, 'Rương Xích Dực Cung')]);
  const solo = npc('wiki-m2-ai1', 1, 120, false,
    [unit(9, 350, 'Viêm Chùy Kỵ')]);
  const manifest = {kind: 'NGOALONG_CAMPAIGN_SHARD_INDEX',
    sourceEdition: 'CURRENT_VNG_MOBILE', classicWebgameParity: 'UNKNOWN',
    runtimeEnabled: false,
    mapLocator: {'wiki-map-1': {wikiMapId: 1, npcCount: 4},
      'wiki-map-2': {wikiMapId: 2, npcCount: 1}}};
  const shard = {kind: 'NGOALONG_CAMPAIGN_SHARD',
    sourceEdition: 'CURRENT_VNG_MOBILE', classicWebgameParity: 'UNKNOWN',
    runtimeAuthority: false, runtimeEnabled: false,
    maps: [{id: 'wiki-map-1', wikiMapId: 1,
      npcs: [donor, target, bossDonor, bossTarget],
      npcListComplete: false, advertisedNpcCount: 6},
    {id: 'wiki-map-2', wikiMapId: 2, npcs: [solo],
      npcListComplete: true, advertisedNpcCount: 1}]};
  const records = [
    {wikiTroopId: 29, catalogueStatus: 'CHAT02_NAME_AMBIGUOUS'},
    {wikiTroopId: 350, catalogueStatus: 'NOT_IN_CHAT02_CATALOGUE'},
    {wikiTroopId: 360, catalogueStatus: 'NOT_IN_CHAT02_CATALOGUE'}];
  const crosswalk = {kind: 'NL06_NPC_NUMERIC_TROOP_CROSSWALK_V2',
    authority: 'REFERENCE_ONLY', runtimeEnabled: false,
    sourceEdition: 'CURRENT_VNG_MOBILE', records};
  return {manifest, shard, crosswalk};
}
test('same-dungeon donor prioritizes regular/boss and closest level', () => {
  const s = sample(), first = s.shard.maps[0];
  assert.equal(F.donorFor(first, first.npcs[1]).id, 'wiki-m1-ai11');
  assert.equal(F.donorFor(first, first.npcs[3]).id, 'wiki-m1-ai13');
  assert.equal(F.donorFor(s.shard.maps[1], s.shard.maps[1].npcs[0]), null);
});
test('simulated NPC fill is deterministic, preserves source and unique 3×3 slots', () => {
  const s = sample(), before = JSON.stringify(s.shard);
  const a = F.generate(s.manifest, [s.shard], s.crosswalk);
  const b = F.generate(s.manifest, [s.shard], s.crosswalk);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(s.shard), before);
  assert.equal(a.counts.sourceNpcs, 5);
  assert.equal(a.counts.exceptionUnitUses, 4);
  assert.equal(a.counts.simulatedTroopUses, 3);
  assert.equal(a.counts.missingPeerTroopUses, 1);
  assert.equal(a.counts.incompleteNpcs, 1);
  assert.equal(a.counts.simulatedFormationUnits, 1);
  assert.equal(a.counts.rosterPlaceholderCount, 2);
  const patched = a.npcs.find(n => n.npcId === 'wiki-m1-ai12');
  assert.equal(patched.sourceUnitCount, 2);
  assert.equal(patched.templateNpcId, 'wiki-m1-ai11');
  assert.equal(patched.simulatedAddedFormationUnits.length, 1);
  assert.equal(patched.simulatedAddedFormationUnits[0].wikiSlot, 1);
  assert.ok(patched.simulatedAddedFormationUnits.every(u =>
    u.troopWikiId === null && u.troopId === null && u.heroId === null));
});
test('numeric IDs, recruitability and battle runtime never get inferred from peer', () => {
  const s = sample(), result = F.generate(s.manifest, [s.shard], s.crosswalk);
  assert.equal(result.provenance, 'SIMULATED');
  assert.equal(result.runtimeEnabled, false);
  assert.equal(result.policy.officialTroopNumericJoinsAllowed, false);
  assert.equal(result.policy.combatRuntimeIntegration, false);
  for (const n of result.npcs) {
    assert.equal(n.runtimeEnabled, false);
    for (const t of n.simulatedTroopProfiles) {
      assert.equal(t.provenance, 'SIMULATED');
      assert.equal(t.runtimeTroopId, null);
      assert.equal(t.approvedChat02Id, null);
      assert.equal(t.wikiNumericIdentityVerified, false);
      assert.equal(t.donor.sameWikiMapId, n.wikiMapId);
      assert.equal(t.runtimeEnabled, false);
      assert.ok(t.combatDesign.attackCoefficient >= 0.8 &&
        t.combatDesign.attackCoefficient <= 1.2);
    }
  }
  const missing = result.npcs.find(n => n.npcId === 'wiki-m2-ai1');
  assert.equal(missing.blockedReason, 'NO_ELIGIBLE_PEER_IN_SAME_MAP');
  assert.equal(missing.simulatedTroopProfiles.length, 0);
  const roster = result.mapRosterCandidates[0];
  assert.equal(roster.simulatedNpcTemplates.length, 2);
  assert.ok(roster.simulatedNpcTemplates.every(n =>
    n.wikiAiId === null && n.reward === null && !n.runtimeEnabled));
});
test('runtime-enabled or mismatched editions fail closed', () => {
  const s = sample();
  assert.throws(() => F.generate({...s.manifest, runtimeEnabled: true},
    [s.shard], s.crosswalk), /manifest not source-only/);
  assert.throws(() => F.generate(s.manifest,
    [{...s.shard, runtimeEnabled: true}], s.crosswalk), /untrusted source shard/);
  assert.throws(() => F.generate(s.manifest,
    [s.shard], {...s.crosswalk, runtimeEnabled: true}),
    /crosswalk not source-only/);
  assert.throws(() => F.generate({...s.manifest,
    mapLocator: {'wiki-map-1': {wikiMapId: 1, npcCount: 4}}}, [s.shard], s.crosswalk),
    /map\/shard mismatch/);
});
test('source with five members is not expanded to six units', () => {
  const source = npc('wiki-m8-ai88', 1, 150, false,
    [unit(1, 1, 'Bộ'), unit(2, 1, 'Bộ'), unit(3, 1, 'Bộ'),
      unit(4, 1, 'Bộ'), unit(5, 1, 'Bộ')],
    {blockers: ['FORMATION_NOT_EXHAUSTIVE']});
  const peer = npc('wiki-m8-ai89', 2, 151, false,
    [unit(1, 1, 'Bộ'), unit(5, 2, 'Đao Binh')]);
  assert.deepEqual(F.clonePartialFormation(
    {id: 'wiki-map-8', wikiMapId: 8}, source, peer), []);
});
