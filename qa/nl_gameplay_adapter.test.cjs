/* Focused non-visual adapter contract gate.
 * Run: node --test qa/nl_gameplay_adapter.test.cjs
 * Integration into the canonical HTML remains Chat 07's responsibility.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {create} = require('../tools/nl_gameplay_adapter.js');
const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const project = read('data/ngoalong/alpha_content.json');
const wiki = read('data/ngoalong/wiki_troop_facts_v1.json');

test('project combat bridge preserves Save v5 and runtime catalog identity', () => {
  const adapter = create(project, wiki);
  assert.equal(adapter.summary.saveSchema, 5);
  assert.equal(adapter.summary.projectTroopProfiles, project.troops.profiles.length);
  assert.equal(adapter.summary.projectHeroSkills, Object.keys(project.skills.heroById).length);
  assert.equal(adapter.summary.classicParity, 'UNKNOWN');
  assert.equal(adapter.summary.wikiReferenceProfiles, wiki.units.length);
});

test('all handed-over Wiki records remain reference only, never promoted', () => {
  const adapter = create(project, wiki);
  assert.equal(wiki.units.length, 9);
  for (const record of wiki.units) {
    const view = adapter.inspectWikiTroop(record.id);
    assert.equal(view.id, record.id);
    assert.equal(view.edition, 'CURRENT_MOBILE_NOT_CLASSIC');
    assert.equal(view.playable, false);
    assert.equal(view.provenance.stats, 'UNKNOWN');
    assert.ok(view.blockers.includes('REFERENCE_ONLY'));
    assert.ok(view.blockers.includes('BASE_STATS_UNKNOWN'));
    assert.ok(view.blockers.includes('NO_RUNTIME_TROOP_MAPPING'));
  }
  assert.equal(adapter.inspectWikiTroop('not-a-wiki-profile'), null);
  assert.equal(adapter.summary.wikiPlayableProfiles, 0);
});

test('unmapped derived triggers/statuses are blocked, not invented', () => {
  const adapter = create(project, wiki);
  const cang = adapter.inspectWikiTroop('wiki-mobile-cang-chuy');
  assert.ok(cang.blockers.includes('TRIGGER_NEEDS_OWNER_RULE:status_chance'));
  assert.ok(cang.blockers.includes('STATUS_NOT_IN_PROJECT_RUNTIME:confusion'));
  const ve = adapter.inspectWikiTroop('wiki-mobile-anh-ve');
  assert.ok(ve.blockers.includes('STATUS_NOT_IN_PROJECT_RUNTIME:dazzle'));
  const drum = adapter.inspectWikiTroop('wiki-mobile-loi-co');
  assert.ok(drum.blockers.includes('BASE_STATS_UNKNOWN'));
  assert.equal(drum.playable, false);
});

test('real project troop/skill/status bindings carry provenance but not secret formulas', () => {
  const adapter = create(project, wiki);
  const actor = {id: 'guan', team: 'p', troop: 'infantry', type: 'infantry',
    atk: 100, hp: 200, effects: [{kind:'burn',turns:2}]};
  const before = JSON.stringify(actor);
  const resolved = adapter.resolveUnit(actor, 'campaign');
  assert.equal(resolved.mode, 'PROJECT_SIMULATED_COMBAT');
  assert.equal(resolved.troop.id, 'infantry');
  assert.equal(resolved.troop.baseStatsClassification, 'UNKNOWN');
  assert.equal(resolved.skill.source.classification, 'SIMULATED');
  assert.equal(resolved.effects[0].source.classification, 'SIMULATED');
  assert.equal(adapter.bindUnit(actor, 'campaign'), actor);
  assert.equal(JSON.stringify(actor), before, 'Save/replay serialization must not change');
  assert.equal(actor.__nlSourceBinding.troop.id, 'infantry');
  assert.equal(actor.__nlSourceBinding.skill.kind, resolved.skill.kind);
  assert.equal(adapter.bindUnit(actor, 'campaign'), actor);
  assert.equal(Object.keys(actor).includes('__nlSourceBinding'), false);
  assert.equal(actor.atk, 100);
  assert.equal(actor.hp, 200);
});

test('skill overrides, unknown statuses and legacy CL are handled without state mutations', () => {
  const adapter = create(project, wiki);
  const npc = {id: 'npc-test', team:'e', type:'strategist', troop:'strategist',
    skillId:'campaign-sima-seal', effects:[{kind:'unknown-effect',turns:1}]};
  const resolved = adapter.resolveUnit(npc, 'campaign');
  assert.equal(resolved.skill.key, 'campaign-sima-seal');
  assert.equal(resolved.skill.source.classification, 'SIMULATED');
  assert.equal(resolved.effects[0].runtimeKnown, false);
  assert.equal(resolved.effects[0].source.classification, 'UNKNOWN');
  const cl = {...npc};
  const oldSerialized = JSON.stringify(cl);
  assert.equal(adapter.bindUnit(cl, 'cltq'), cl);
  assert.equal(JSON.stringify(cl), oldSerialized);
  assert.deepEqual(adapter.resolveUnit(cl,'cltq'),
    {mode: 'LEGACY_UNCHANGED', active:false});
});

test('invalid Save contract, Wiki scope and duplicate records fail closed', () => {
  assert.throws(() => create({...project, compatibility:{...project.compatibility,saveSchema:6}},wiki), /Save v5/);
  assert.throws(() => create(project,{...wiki, classicParity:'VERIFIED'}), /Wiki handoff/);
  assert.throws(() => create(project,{...wiki, units:[wiki.units[0],wiki.units[0]]}), /duplicate/);
});
