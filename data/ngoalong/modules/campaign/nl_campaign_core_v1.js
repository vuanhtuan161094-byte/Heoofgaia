'use strict';
/*
 * CHAT 06 — independent Wiki dungeon catalogue + pure PvE progression adapter.
 * No generator, Save, receipt ledger, or combat-engine mutation here.
 * Wiki CURRENT MOBILE is a research source, never automatic classic parity.
 */
const EDITION = 'CURRENT_VNG_MOBILE';
function ensure(ok, message) { if (!ok) throw new Error('NL-CAMPAIGN: ' + message); }
function isId(v) { return typeof v === 'string' && v.length > 0; }
function integer(v) { return Number.isInteger(v) && v >= 0; }
function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function exactList(v) { return Array.isArray(v) ? v : []; }
function distinct(v) { return new Set(v).size === v.length; }
function registryHas(approvals, category, id) {
  return isId(id) && exactList((approvals.registries || {})[category]).includes(id);
}
function blockingUnique(codes) { return [...new Set(codes)]; }
function compileWikiDungeons(source, approvals = {}) {
  ensure(source && Array.isArray(source.maps), 'blueprint maps must be an array');
  ensure(source.sourceEdition === EDITION, 'only CURRENT_VNG_MOBILE blueprint accepted');
  ensure(source.classicWebgameParity === 'UNKNOWN', 'do not assert unverified classic parity');
  ensure(source.runtimeAuthority === false, 'source cannot be marked runtime authoritative');
  const mapIds = new Set(), npcIds = new Set(), mapped = [];
  let sourceNpcCount = 0, sourceConflicts = 0, indexedFormations = 0;
  for (const original of source.maps) {
    const mapId = original.wikiMapId;
    ensure(Number.isInteger(mapId) && mapId > 0 && !mapIds.has(mapId), 'invalid/duplicate Wiki mapId');
    mapIds.add(mapId);
    const id = 'wiki-map-' + mapId;
    const mapApproval = ((approvals.maps || {})[id] || {});
    const srcNpcs = exactList(original.npcs);
    const mapIssues = [];
    const mapRules = exactList(original.mapWideBattleRulesObserved).map(rule => ({
      label: copy(rule), origin: 'MAP_WIDE', runtimeEffectId: null,
      status: 'REFERENCE_ONLY'
    }));
    for (const rule of mapRules) {
      ensure(rule.label.skillSourceType === 'DUNGEON_WIDE_RULE',
        'map-wide rule without separate DUNGEON_WIDE_RULE classification');
    }
    const approvedRules = exactList(mapApproval.mapRuleBindings);
    if (approvedRules.length !== mapRules.length || mapApproval.mapRulesReviewed !== true ||
        approvedRules.some((r, i) => r.origin !== 'MAP_WIDE' ||
          !registryHas(approvals, 'effects', r.effectId) ||
          r.sourceEffectType !== mapRules[i].label.effectType)) {
      mapIssues.push('MAP_RULES_NOT_REVIEWED_OR_BOUND');
    } else {
      mapRules.forEach((r, i) => { r.runtimeEffectId = approvedRules[i].effectId; r.status = 'APPROVED_ADAPTER'; });
    }
    const npcs = srcNpcs.map(raw => {
      sourceNpcCount++;
      const ai = raw.wikiAiId;
      ensure(Number.isInteger(ai) && ai > 0, 'invalid Wiki NPC aiId');
      const npcId = 'wiki-m' + mapId + '-ai' + ai;
      ensure(!npcIds.has(npcId), 'duplicate Wiki NPC ' + npcId);
      npcIds.add(npcId);
      const npcApproval = ((approvals.npcs || {})[npcId] || {});
      const issues = [];
      const rawUnits = exactList(raw.formationUnits);
      const sourceSlots = [], formation = [];
      for (const u of rawUnits) {
        const slot = u.wikiSlot;
        if (!Number.isInteger(slot) || slot < 1 || slot > 9) { issues.push('INVALID_WIKI_SLOT'); continue; }
        sourceSlots.push(slot);
        const bound = ((approvals.units || {})[mapId + '/' + ai + '/' + slot] || {});
        const skillLabel = u.skillName == null ? null : String(u.skillName);
        const sourceNamesMatch = bound.wikiGeneralName === u.name &&
          bound.wikiTroopId === u.troopWikiId && bound.wikiActiveSkillName === skillLabel;
        const validOrigin = ['HERO_ACTIVE', 'TROOP_ACTIVE', 'NPC_STAGE_ADDITION'].includes(bound.skillOrigin);
        const reviewed = bound.reviewed === true && sourceNamesMatch && validOrigin &&
          registryHas(approvals, 'heroes', bound.heroId) &&
          registryHas(approvals, 'troops', bound.troopId) &&
          registryHas(approvals, 'skills', bound.skillId);
        if (!reviewed) issues.push('UNRESOLVED_HERO_TROOP_SKILL_BINDINGS');
        if (!integer(u.soldiers)) issues.push('MISSING_OR_INVALID_UNIT_SOLDIERS');
        if (skillLabel == null) issues.push('MISSING_SKILL_LABEL');
        const namespaceHint = u.skillNamespace || null;
        if (namespaceHint === 'NPC_EXCLUSIVE_LABEL' &&
            (!reviewed || bound.skillOrigin !== 'NPC_STAGE_ADDITION')) {
          issues.push('NPC_SPECIFIC_SKILL_NOT_REVIEWED');
        }
        formation.push({
          wikiSlot: slot, formationSlot: slot - 1, name: u.name ?? null,
          level: u.level ?? null, soldiers: u.soldiers ?? null,
          troopWikiId: u.troopWikiId ?? null, troopName: u.troopName ?? null,
          heroId: reviewed ? bound.heroId : null, troopId: reviewed ? bound.troopId : null,
          skill: {
            label: skillLabel, sourceType: u.skillSourceType ?? null,
            sourceNamespace: namespaceHint, level: u.skillLevelShown ?? null,
            sourceVersion: u.skillVersion ?? null,
            origin: reviewed ? bound.skillOrigin : null,
            skillId: reviewed ? bound.skillId : null
          },
          fieldProvenance: copy(u.fieldProvenance || null),
          bindingStatus: reviewed ? 'APPROVED_ADAPTER' : 'UNRESOLVED',
          sourceUrl: raw.sourceUrl ?? null
        });
      }
      if (!distinct(sourceSlots)) issues.push('DUPLICATE_FORMATION_SLOTS');
      if (rawUnits.length < 1 || rawUnits.length > 5) issues.push('TEAM_SIZE_OUTSIDE_ONE_TO_FIVE');
      if (raw.formationComplete !== true) issues.push('FORMATION_NOT_EXHAUSTIVE');
      if (!integer(raw.order) || raw.order < 1) issues.push('UNKNOWN_ENCOUNTER_ORDER');
      if (raw.name == null || raw.level == null || raw.totalSoldiers == null)
        issues.push('UNKNOWN_NPC_CORE_FIELDS');
      if (raw.unitSoldierConsistencyStatus !== 'MATCH' ||
          raw.unitSoldierDiscrepancy !== 0) {
        issues.push(raw.unitSoldierConsistencyStatus === 'SOURCE_MISMATCH' ?
          'SOURCE_SOLDIER_CONTRADICTION' : 'UNIT_SOLDIER_SUM_UNVERIFIED');
        if (raw.unitSoldierConsistencyStatus === 'SOURCE_MISMATCH') sourceConflicts++;
      }
      if (raw.formationComplete === true) indexedFormations++;
      // Explicitly separate hero active, NPC-only addition, and dungeon-wide rules.
      const extraSkills = exactList(npcApproval.stageExtraSkills);
      if (npcApproval.stageSkillsReviewed !== true ||
          extraSkills.some(s => s.origin !== 'NPC_STAGE_ADDITION' ||
            !registryHas(approvals, 'skills', s.skillId))) {
        issues.push('NPC_STAGE_SKILLS_NOT_REVIEWED');
      }
      const reward = npcApproval.rewardReviewed === true ? copy(npcApproval.firstClearReward ?? null) : null;
      if (npcApproval.rewardReviewed !== true) issues.push('NPC_REWARDS_NOT_REVIEWED');
      const errors = blockingUnique(issues);
      return {
        id: npcId, wikiAiId: ai, mapId: id, order: raw.order ?? null,
        name: raw.name ?? null, kind: raw.kind ?? null, boss: raw.kind === 'BOSS',
        level: raw.level ?? null, totalSoldiersRaw: raw.totalSoldiers ?? null,
        observedUnitSoldierSum: raw.observedUnitSoldierSum ?? null,
        unitSoldierDiscrepancy: raw.unitSoldierDiscrepancy ?? null,
        soldierConsistency: raw.unitSoldierConsistencyStatus ?? 'UNKNOWN',
        firstMoverObserved: raw.firstMoverObserved ?? null,
        formation, stageExtraSkills: npcApproval.stageSkillsReviewed === true ? copy(extraSkills) : null,
        wikiNpcLordSkills: copy(raw.npcLordSkills ?? null),
        wikiNpcPassiveSkills: copy(raw.npcPassiveSkills ?? null),
        wikiNpcStageSkills: copy(raw.npcStageSkills ?? null),
        reward, sourceVersion: raw.npcSkillVersion ?? null,
        sourceUrl: raw.sourceUrl ?? null, fieldProvenance: copy(raw.fieldProvenance || null),
        blockers: errors, readyForIntegration: errors.length === 0
      };
    });
    const orders = npcs.map(n => n.order);
    if (!distinct(orders) || orders.some((v, i) => v !== i + 1)) {
      // The extracted roster is already in original order; do not invent/reorder it.
      mapIssues.push('NPC_ORDER_NOT_CONTIGUOUS_IN_SOURCE');
    }
    if (original.npcListComplete !== true ||
        original.advertisedNpcCount == null ||
        original.advertisedNpcCount !== npcs.length) mapIssues.push('NPC_ROSTER_INCOMPLETE');
    if (original.npcCountIndexVsDetailMismatch === true) mapIssues.push('INDEX_VS_DETAIL_NPC_COUNT_CONFLICT');
    if (!integer(original.cityLevelRequired)) mapIssues.push('UNVERIFIED_CITY_LEVEL_UNLOCK');
    if (!Number.isInteger(mapApproval.order) || mapApproval.order < 1 ||
        mapApproval.progressionReviewed !== true) mapIssues.push('MAP_PROGRESSION_NOT_APPROVED');
    if (mapApproval.versionReviewed !== true ||
        mapApproval.edition !== EDITION) mapIssues.push('MOBILE_VERSION_NOT_REVIEWED');
    if (mapApproval.rewardReviewed !== true) mapIssues.push('MAP_FIRST_CLEAR_REWARD_NOT_REVIEWED');
    if (npcs.some(n => !n.readyForIntegration)) mapIssues.push('NPC_CONTENT_NOT_READY');
    const allErrors = blockingUnique(mapIssues);
    mapped.push({
      id, wikiMapId: mapId, name: original.name ?? null,
      faction: original.faction ?? null, mapLevel: original.mapLevel ?? null,
      dungeonType: original.dungeonType ?? null,
      cityLevelRequired: original.cityLevelRequired ?? null,
      order: Number.isInteger(mapApproval.order) ? mapApproval.order : null,
      previousMapId: mapApproval.progressionReviewed === true ?
        (mapApproval.previousMapId ?? null) : null,
      rewards: mapApproval.rewardReviewed === true ?
        copy(mapApproval.firstClearReward ?? null) : null,
      mapRules, npcs, bossIds: npcs.filter(n => n.boss).map(n => n.id),
      advertisedNpcCount: original.advertisedNpcCount ?? null,
      npcListComplete: original.npcListComplete === true,
      wikiVersion: original.historicalVersionStatus ?? null,
      sourceUrl: original.sourceUrl ?? null,
      sourceEdition: EDITION, classicWebgameParity: 'UNKNOWN',
      fieldProvenance: copy(original.fieldProvenance || null),
      blockers: allErrors, readyForIntegration: allErrors.length === 0
    });
  }
  // Validate approved inter-map links WITHOUT assuming the index number is chronology.
  const byId = new Map(mapped.map(m => [m.id, m]));
  const approvedOrders = new Map();
  for (const m of mapped) {
    if (!Number.isInteger(m.order) || m.order < 1) continue;
    if (approvedOrders.has(m.order)) {
      m.blockers.push('DUPLICATE_APPROVED_MAP_ORDER');
      byId.get(approvedOrders.get(m.order)).blockers.push('DUPLICATE_APPROVED_MAP_ORDER');
    } else approvedOrders.set(m.order, m.id);
    if (m.order === 1 && m.previousMapId != null) m.blockers.push('FIRST_MAP_HAS_PREDECESSOR');
    if (m.order > 1) {
      const previous = byId.get(m.previousMapId);
      if (!previous || previous.order !== m.order - 1) {
        m.blockers.push('MAP_PREDECESSOR_NOT_RESOLVED_OR_OUT_OF_ORDER');
      }
    }
  }
  for (const m of mapped) {
    m.blockers = blockingUnique(m.blockers);
    m.readyForIntegration = m.blockers.length === 0;
  }
  return {
    schemaVersion: 1, kind: 'NGOALONG_CAMPAIGN_CATALOGUE',
    sourceEdition: EDITION, classicWebgameParity: 'UNKNOWN',
    runtimeEnabled: false,
    sourceUrl: source.source || 'https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban',
    counts: {
      maps: mapped.length, npcRows: sourceNpcCount,
      exhaustiveNpcFormations: indexedFormations,
      sourceSoldierContradictions: sourceConflicts,
      mapsReadyForIntegration: mapped.filter(m => m.readyForIntegration).length,
      mapsBlocked: mapped.filter(m => !m.readyForIntegration).length,
      npcsReadyForIntegration: mapped.flatMap(m => m.npcs).filter(n => n.readyForIntegration).length
    },
    maps: mapped
  };
}
function validateCatalogue(catalogue) {
  ensure(catalogue && catalogue.kind === 'NGOALONG_CAMPAIGN_CATALOGUE', 'invalid compiled catalogue kind');
  ensure(catalogue.sourceEdition === EDITION && catalogue.classicWebgameParity === 'UNKNOWN',
    'catalogue edition/parity mismatch');
  ensure(catalogue.runtimeEnabled === false, 'unreviewed catalogue must not enable runtime itself');
  const maps = exactList(catalogue.maps), ids = maps.map(m => m.id);
  ensure(distinct(ids), 'duplicate compiled maps');
  const seenNpcs = new Set();
  for (const m of maps) {
    const ord = [];
    for (const npc of exactList(m.npcs)) {
      ensure(!seenNpcs.has(npc.id) && npc.mapId === m.id, 'duplicate/cross-map NPC');
      seenNpcs.add(npc.id);
      ord.push(npc.order);
      const slots = exactList(npc.formation).map(u => u.formationSlot);
      ensure(distinct(slots) && slots.every(i => integer(i) && i < 9), 'invalid NPC 3x3 slots');
      if (npc.readyForIntegration) {
        ensure(npc.blockers.length === 0 && slots.length >= 1 && slots.length <= 5 &&
          npc.formation.every(u => isId(u.heroId) && isId(u.troopId) &&
            isId(u.skill.skillId) && isId(u.skill.origin)), 'invalid ready NPC');
      }
    }
    if (m.readyForIntegration) {
      ensure(m.blockers.length === 0 && ord.length > 0 &&
        ord.every((n,i) => n === i+1) &&
        m.npcs.every(n => n.readyForIntegration), 'invalid ready map');
    }
  }
  return catalogue;
}
function makeState(seed) {
  if (seed == null) return {schemaVersion: 1, clearedNpcIds: [], settledBattleIds: [],
    grantedFirstClearKeys: [], battleReports: [], pending: null};
  ensure(seed.schemaVersion === 1, 'invalid PvE progress version');
  for (const k of ['clearedNpcIds', 'settledBattleIds', 'grantedFirstClearKeys', 'battleReports']) {
    ensure(Array.isArray(seed[k]), 'missing state.' + k);
  }
  ensure(distinct(seed.settledBattleIds) && distinct(seed.grantedFirstClearKeys),
    'duplicate receipt state');
  return copy(seed);
}
function findMap(catalogue, id) {
  return exactList(catalogue.maps).find(m => m.id === id) || null;
}
function isMapCleared(map, state) {
  return map.npcs.length > 0 && map.npcs.every(n => state.clearedNpcIds.includes(n.id));
}
function canEnterMap(catalogue, state, map, cityLevel) {
  if (!map || !map.readyForIntegration || !integer(cityLevel) ||
      cityLevel < map.cityLevelRequired) return false;
  if (!map.previousMapId) return map.order === 1;
  const prior = findMap(catalogue, map.previousMapId);
  return Boolean(prior && prior.readyForIntegration && isMapCleared(prior, state));
}
function beginEncounter(catalogue, priorState, command) {
  validateCatalogue(catalogue);
  const state = makeState(priorState);
  ensure(state.pending == null, 'another encounter is pending');
  ensure(command && isId(command.battleId), 'battleId required');
  ensure(!state.settledBattleIds.includes(command.battleId), 'battle already settled');
  const map = findMap(catalogue, command.mapId);
  ensure(canEnterMap(catalogue, state, map, command.cityLevel), 'map locked or not verified');
  const npc = map.npcs.find(n => n.id === command.npcId);
  ensure(npc && npc.readyForIntegration, 'NPC not gameplay-ready');
  const preceding = map.npcs.filter(n => n.order < npc.order);
  ensure(preceding.every(n => state.clearedNpcIds.includes(n.id)), 'previous NPC not cleared');
  state.pending = {battleId: command.battleId, mapId: map.id, npcId: npc.id};
  return {state, enemy: copy(npc), worldRules: copy(map.mapRules)};
}
function settleEncounter(catalogue, priorState, outcome) {
  validateCatalogue(catalogue);
  const state = makeState(priorState);
  ensure(state.pending != null && outcome && outcome.combatVerified === true,
    'authoritative combat result required');
  ensure(state.pending.battleId === outcome.battleId, 'battle report ID does not match pending');
  ensure(outcome.result === 'WIN' || outcome.result === 'LOSE', 'unknown combat result');
  ensure(!state.settledBattleIds.includes(outcome.battleId), 'battle already settled');
  const map = findMap(catalogue, state.pending.mapId);
  ensure(map && map.readyForIntegration, 'map disappeared from approved catalogue');
  const npc = map.npcs.find(n => n.id === state.pending.npcId);
  ensure(npc && npc.readyForIntegration, 'NPC disappeared from approved catalogue');
  const instructions = [];
  const mapWasCleared = isMapCleared(map, state);
  if (outcome.result === 'WIN') {
    const npcFirst = !state.clearedNpcIds.includes(npc.id);
    if (npcFirst) {
      state.clearedNpcIds.push(npc.id);
      const receiptKey = 'nl:campaign:npc:' + npc.id + ':first-clear';
      if (npc.reward != null && !state.grantedFirstClearKeys.includes(receiptKey)) {
        state.grantedFirstClearKeys.push(receiptKey);
        instructions.push({receiptKey, target: 'NPC_FIRST_CLEAR', rewards: copy(npc.reward)});
      }
    }
    if (!mapWasCleared && isMapCleared(map, state)) {
      const receiptKey = 'nl:campaign:map:' + map.id + ':first-clear';
      if (map.rewards != null && !state.grantedFirstClearKeys.includes(receiptKey)) {
        state.grantedFirstClearKeys.push(receiptKey);
        instructions.push({receiptKey, target: 'MAP_FIRST_CLEAR', rewards: copy(map.rewards)});
      }
    }
  }
  // Pure settlement: caller must commit state + reward receipts atomically in the
  // existing Save v5 receipt authority; no funds/EXP are directly granted here.
  state.battleReports.push({
    battleId: outcome.battleId, mapId: map.id, npcId: npc.id,
    result: outcome.result, firstClearReceiptKeys: instructions.map(x => x.receiptKey)
  });
  state.settledBattleIds.push(outcome.battleId);
  state.pending = null;
  return {state, rewardInstructions: instructions, mapCleared: isMapCleared(map, state),
    nextNpcId: map.npcs.find(n => !state.clearedNpcIds.includes(n.id))?.id ?? null};
}
const NL_CAMPAIGN_CORE_V1 = Object.freeze({
  compileWikiDungeons, validateCatalogue, makeState, canEnterMap,
  beginEncounter, settleEncounter
});

if (typeof module !== 'undefined' && module.exports) module.exports = NL_CAMPAIGN_CORE_V1;
if (typeof globalThis !== 'undefined') globalThis.NL_CAMPAIGN_CORE_V1 = NL_CAMPAIGN_CORE_V1;
