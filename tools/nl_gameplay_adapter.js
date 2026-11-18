/* NL Gameplay Adapter V1 — non-mutating combat source/provenance bridge.
 * Integrator (Chat 07) must wire this module after NL_GAME_DATA and before
 * gameplay bootstrap. It NEVER activates reference-only Wiki units or changes
 * numerical combat, Save v5, receipts, replay, or legacy CL rules.
 *
 * The client supplies independently validated project and Wiki handoff packs.
 * No VNG combat formulas, art, source code, or unsupported stats are imported.
 */
(function (root) {
  'use strict';

  const CLASSES = new Set(['VERIFIED', 'DERIVED', 'SIMULATED', 'UNKNOWN']);

  function requireValid(condition, message) {
    if (!condition) throw new Error('NL gameplay adapter: ' + message);
  }

  function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function provenance(record) {
    const data = asRecord(record).provenance;
    if (!data || !CLASSES.has(data.classification)) {
      return Object.freeze({ classification: 'UNKNOWN', sourceId: null });
    }
    return Object.freeze({
      classification: data.classification,
      sourceId: typeof data.sourceId === 'string' ? data.sourceId : null
    });
  }

  function create(project, wikiHandoff) {
    requireValid(project && project.schemaVersion === 1, 'validated project schema v1 required');
    const compatibility = asRecord(project.compatibility);
    requireValid(compatibility.saveKey === 'muu_dinh_tam_quoc_v1' &&
      compatibility.saveSchema === 5, 'Save v5/key contract mismatch');
    requireValid(asRecord(project.troops).profiles instanceof Array,
      'missing project troop profiles');
    requireValid(project.skills && project.statusEffects, 'missing project combat catalogs');

    if (wikiHandoff != null) {
      requireValid(wikiHandoff.schemaVersion === 1 &&
        wikiHandoff.edition === 'CURRENT_MOBILE_NOT_CLASSIC' &&
        wikiHandoff.classicParity === 'UNKNOWN' &&
        Array.isArray(wikiHandoff.units), 'Wiki handoff edition/schema mismatch');
    }
    const wikiUnits = wikiHandoff ? wikiHandoff.units : [];
    const wikiById = new Map();
    for (const record of wikiUnits) {
      requireValid(typeof record.id === 'string' && !wikiById.has(record.id),
        'duplicate/invalid Wiki troop identifier');
      wikiById.set(record.id, record);
    }

    const troopById = new Map(project.troops.profiles.map(item => [item.id, item]));
    const statuses = asRecord(project.statusEffects.effects);
    const projectSkills = asRecord(project.skills.heroById);
    const enemySkills = asRecord(project.skills.enemyByCombatType);
    const overrides = asRecord(project.skills.overrides);

    // Strictly observational: never copies unknown Wiki stats into live units.
    function inspectWikiTroop(id) {
      const record = wikiById.get(id);
      if (!record) return null;
      const missing = [];
      if (record.integration !== 'PLAYABLE') missing.push('REFERENCE_ONLY');
      const unknown = asRecord(record.unknown);
      if (!unknown.baseStats) missing.push('BASE_STATS_UNKNOWN');
      if (!unknown.evolutionParent) missing.push('EVOLUTION_UNKNOWN');
      if (!unknown.unlockCondition) missing.push('UNLOCK_UNKNOWN');
      if (!record.runtimeTroopId || !troopById.has(record.runtimeTroopId)) {
        missing.push('NO_RUNTIME_TROOP_MAPPING');
      }
      for (const fact of record.facts || []) {
        if (fact.statusId && !statuses[fact.statusId]) {
          missing.push('STATUS_NOT_IN_PROJECT_RUNTIME:' + fact.statusId);
        }
        if (fact.interpretation === 'DERIVED_TRIGGER') {
          missing.push('TRIGGER_NEEDS_OWNER_RULE:' + fact.kind);
        }
      }
      return Object.freeze({
        id: record.id,
        name: record.name,
        family: record.family,
        tier: record.tier,
        edition: 'CURRENT_MOBILE_NOT_CLASSIC',
        sourceUrl: asRecord(record.source).url || wikiHandoff.sourceUrl || null,
        provenance: Object.freeze({
          identity: asRecord(record.fieldProvenance).name || 'UNKNOWN',
          mechanics: asRecord(record.fieldProvenance).facts || 'UNKNOWN',
          stats: 'UNKNOWN'
        }),
        blockers: Object.freeze([...new Set(missing)]),
        // No implicit promotion, even when fields later become populated:
        // Chat 07 must explicitly integrate reviewed mechanics and QA first.
        playable: false
      });
    }

    function resolveUnit(unit, mode) {
      if (!unit || typeof unit !== 'object') return null;
      if (mode === 'cltq') {
        return Object.freeze({ mode: 'LEGACY_UNCHANGED', active: false });
      }
      const troop = troopById.get(unit.troop);
      const skill = (unit.skillId && overrides[unit.skillId]) ||
        (unit.team === 'p' ? projectSkills[unit.id] : enemySkills[unit.type]);
      const effectBindings = (unit.effects || []).map(effect => {
        const descriptor = statuses[effect.kind];
        return Object.freeze({
          id: effect.kind,
          source: provenance(descriptor),
          runtimeKnown: Boolean(descriptor)
        });
      });
      return Object.freeze({
        mode: 'PROJECT_SIMULATED_COMBAT',
        active: Boolean(troop && skill),
        troop: troop ? Object.freeze({
          id: troop.id,
          name: troop.wikiGroup || null,
          nameClassification: asRecord(troop.fieldProvenance).wikiGroup || 'UNKNOWN',
          baseStatsClassification: asRecord(troop.fieldProvenance).stats || 'UNKNOWN',
          source: provenance(troop)
        }) : null,
        skill: skill ? Object.freeze({
          key: unit.skillId || unit.id || unit.type,
          kind: skill.kind || null,
          pattern: skill.pattern || null,
          source: provenance(skill)
        }) : null,
        effects: Object.freeze(effectBindings)
      });
    }

    // An optional live-unit accessor. Non-enumerable: no extra Save/replay
    // fields, no new damage rules, no change to JSON.stringify(unit).
    function bindUnit(unit, mode) {
      if (!unit || typeof unit !== 'object' || mode === 'cltq') return unit;
      if (!Object.prototype.hasOwnProperty.call(unit, '__nlSourceBinding')) {
        Object.defineProperty(unit, '__nlSourceBinding', {
          configurable: true,
          enumerable: false,
          get: function () { return resolveUnit(unit, mode); }
        });
      }
      return unit;
    }

    return Object.freeze({
      inspectWikiTroop: inspectWikiTroop,
      resolveUnit: resolveUnit,
      bindUnit: bindUnit,
      summary: Object.freeze({
        projectTroopProfiles: troopById.size,
        projectHeroSkills: Object.keys(projectSkills).length,
        wikiReferenceProfiles: wikiUnits.length,
        wikiPlayableProfiles: 0,
        saveSchema: 5,
        classicParity: 'UNKNOWN'
      })
    });
  }

  const api = Object.freeze({ create: create });
  root.NLGameplayAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
