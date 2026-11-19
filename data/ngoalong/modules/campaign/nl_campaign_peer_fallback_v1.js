'use strict';
/*
 * CHAT06 — Same-dungeon NPC simulation for missing Wiki data.
 * This is an optional DESIGN/PREVIEW layer. It never edits Wiki source,
 * resolves official numeric troop IDs, or enables runtime gameplay.
 */
(function (root) {
  const array = value => Array.isArray(value) ? value : [];
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const pos = value => finite(value) && value > 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = value => Math.round(value * 1000) / 1000;
  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function guard(value, message) { if (!value) throw Error('NL06 SIM: ' + message); }
  function slotValid(unit) {
    return Number.isInteger(unit?.wikiSlot) && unit.wikiSlot >= 1 && unit.wikiSlot <= 9 &&
      unit.formationSlot === unit.wikiSlot - 1;
  }
  function validFormation(npc) {
    const units = array(npc?.formation), seen = new Set();
    return units.length > 0 && units.length <= 5 && units.every(unit => {
      if (!slotValid(unit) || seen.has(unit.wikiSlot)) return false;
      seen.add(unit.wikiSlot);
      return true;
    });
  }
  function eligibleDonor(npc) {
    return validFormation(npc) &&
      !array(npc.blockers).includes('FORMATION_NOT_EXHAUSTIVE') &&
      !array(npc.blockers).includes('DUPLICATE_FORMATION_SLOTS');
  }
  function score(target, donor) {
    const bossGap = (target.boss === donor.boss) ? 0 : 1000;
    const levelGap = pos(target.level) && pos(donor.level) ?
      Math.abs(target.level - donor.level) : 100;
    const orderGap = Number.isInteger(target.order) && Number.isInteger(donor.order) ?
      Math.abs(target.order - donor.order) : 100;
    return bossGap + levelGap * 10 + orderGap;
  }
  function donorFor(map, target) {
    const candidates = array(map.npcs).filter(n => n.id !== target.id && eligibleDonor(n));
    candidates.sort((a, b) => score(target, a) - score(target, b) ||
      (a.order ?? 99999) - (b.order ?? 99999) ||
      String(a.id).localeCompare(String(b.id)));
    return candidates[0] || null;
  }
  function roleOf(name) {
    const s = String(name || '').toLocaleLowerCase('vi');
    if (/cung|nỏ|xạ|pháo|tiễn/.test(s)) return 'RANGED';
    if (/kỵ|mã|ngựa/.test(s)) return 'CAVALRY';
    if (/mưu|sĩ|pháp|cầm|thuật|linh|ma/.test(s)) return 'TACTIC';
    if (/thuẫn|giáp|vệ|hộ|khải/.test(s)) return 'DEFENDER';
    if (/thương|chùy|kiếm|đao|liêm|kích/.test(s)) return 'MELEE';
    return 'GENERAL';
  }
  function scaleFor(target, donor) {
    const level = pos(target.level) && pos(donor.level) ?
      clamp(1 + (target.level - donor.level) * 0.015, 0.85, 1.15) : 1;
    const soldiers = pos(target.totalSoldiersRaw) && pos(donor.totalSoldiersRaw) ?
      clamp(target.totalSoldiersRaw / donor.totalSoldiersRaw, 0.75, 1.25) : 1;
    return round(clamp(level * Math.sqrt(soldiers), 0.8, 1.2));
  }
  function selectPeerUnit(donor, requestedSlot, blocked) {
    const units = array(donor.formation).filter(slotValid);
    // Prefer an identical formation slot with non-exceptional source label.
    units.sort((a, b) =>
      Number(blocked.has(a.troopWikiId)) - Number(blocked.has(b.troopWikiId)) ||
      Number(a.wikiSlot !== requestedSlot) - Number(b.wikiSlot !== requestedSlot) ||
      Math.abs(a.wikiSlot - requestedSlot) - Math.abs(b.wikiSlot - requestedSlot) ||
      a.wikiSlot - b.wikiSlot);
    return units[0] || null;
  }
  function templateRef(map, npc, unit) {
    return {
      sameWikiMapId: map.wikiMapId, donorNpcId: npc.id,
      donorWikiSlot: unit.wikiSlot, donorTroopLabel: unit.troopName || null,
      donorWikiTroopIdForTraceOnly: unit.troopWikiId ?? null,
      officialNumericJoin: false
    };
  }
  function simulateUnit(map, target, unit, donor, blocked) {
    const peer = selectPeerUnit(donor, unit.wikiSlot, blocked);
    if (!peer) return null;
    const coefficient = scaleFor(target, donor);
    return {
      kind: 'SIMULATED_TROOP_COMBAT_PROFILE', provenance: 'SIMULATED',
      id: 'sim-profile-' + target.id + '-slot-' + unit.wikiSlot,
      targetNpcId: target.id, wikiSlot: unit.wikiSlot,
      sourceTroopWikiIdKeptAsReference: unit.troopWikiId,
      sourceTroopNameKeptAsReference: unit.troopName,
      donor: templateRef(map, donor, peer),
      combatDesign: {
        role: roleOf(unit.troopName || peer.troopName),
        baseAttack: 'BASIC_ATTACK',
        attackCoefficient: coefficient,
        defenseCoefficient: round(clamp(2 - coefficient, 0.8, 1.2)),
        moraleGainOnAttack: 20
      },
      officialWikiStats: null, approvedChat02Id: null, runtimeTroopId: null,
      wikiNumericIdentityVerified: false, runtimeEnabled: false
    };
  }
  function clonePartialFormation(map, target, donor) {
    const current = array(target.formation), peerUnits = array(donor.formation);
    if (current.length > 5 || !validFormation(donor)) return [];
    if (current.length && current.some(u => !slotValid(u))) return [];
    const used = new Set(current.map(u => u.wikiSlot));
    if (used.size !== current.length) return [];
    const desired = Math.min(5, Math.max(current.length + 1, peerUnits.length));
    const copies = [];
    for (const peer of peerUnits.slice().sort((a, b) => a.wikiSlot - b.wikiSlot)) {
      if (current.length + copies.length >= desired) break;
      let slot = peer.wikiSlot;
      if (used.has(slot)) slot = [1,2,3,4,5,6,7,8,9].find(n => !used.has(n));
      if (!slot) break;
      used.add(slot);
      const coefficient = scaleFor(target, donor);
      const base = pos(peer.soldiers) ? peer.soldiers : 100;
      copies.push({
        kind: 'SIMULATED_FORMATION_UNIT', provenance: 'SIMULATED',
        id: 'sim-unit-' + target.id + '-slot-' + slot,
        wikiSlot: slot, formationSlot: slot - 1,
        name: 'Quân bổ sung mô phỏng',
        level: pos(target.level) ? target.level : peer.level ?? null,
        soldiers: Math.max(1, Math.round(base * coefficient)),
        troopDesignRole: roleOf(peer.troopName), donor: templateRef(map, donor, peer),
        heroId: null, troopId: null, troopWikiId: null, skillId: null,
        officialWikiIdentity: null, runtimeEnabled: false
      });
    }
    return copies;
  }
  function incomplete(npc) {
    return !validFormation(npc) ||
      array(npc.blockers).includes('FORMATION_NOT_EXHAUSTIVE');
  }
  function validate(manifest, shards, crosswalk) {
    guard(manifest?.kind === 'NGOALONG_CAMPAIGN_SHARD_INDEX' &&
      manifest.sourceEdition === 'CURRENT_VNG_MOBILE' &&
      manifest.classicWebgameParity === 'UNKNOWN' &&
      manifest.runtimeEnabled === false, 'manifest not source-only');
    guard(crosswalk?.kind === 'NL06_NPC_NUMERIC_TROOP_CROSSWALK_V2' &&
      crosswalk.authority === 'REFERENCE_ONLY' &&
      crosswalk.runtimeEnabled === false &&
      crosswalk.sourceEdition === manifest.sourceEdition, 'crosswalk not source-only');
    guard(Array.isArray(shards) && shards.length, 'source shards absent');
    return new Map(array(crosswalk.records).filter(r =>
      r.catalogueStatus === 'CHAT02_NAME_AMBIGUOUS' ||
      r.catalogueStatus === 'NOT_IN_CHAT02_CATALOGUE')
      .map(r => [r.wikiTroopId, r]));
  }
  function generate(manifest, shards, crosswalk) {
    const unresolved = validate(manifest, shards, crosswalk);
    const blocked = new Set(unresolved.keys());
    const seenMaps = new Set(), npcRows = [], mapBackfills = [];
    let npcCount = 0, exceptionUses = 0, simulatedTroopUses = 0,
      missingPeerTroopUses = 0, incompleteNpcs = 0, simulatedFormationUnits = 0,
      rosterPlaceholderCount = 0, unresolvedRosterPlaces = 0;
    for (const shard of shards) {
      guard(shard?.kind === 'NGOALONG_CAMPAIGN_SHARD' &&
        shard.sourceEdition === manifest.sourceEdition &&
        shard.classicWebgameParity === 'UNKNOWN' &&
        shard.runtimeAuthority === false && shard.runtimeEnabled === false,
        'untrusted source shard');
      for (const map of array(shard.maps)) {
        const pointer = manifest.mapLocator?.[map.id];
        guard(pointer && pointer.wikiMapId === map.wikiMapId &&
          pointer.npcCount === array(map.npcs).length && !seenMaps.has(map.id),
          'map/shard mismatch ' + map.id);
        seenMaps.add(map.id);
        const peers = array(map.npcs);
        for (const npc of peers) {
          npcCount++;
          const donor = donorFor(map, npc);
          const exceptionUnits = array(npc.formation).filter(u =>
            unresolved.has(u.troopWikiId));
          if (exceptionUnits.length) exceptionUses += exceptionUnits.length;
          const proposals = [];
          for (const unit of exceptionUnits) {
            const proposal = donor ? simulateUnit(map, npc, unit, donor, blocked) : null;
            if (proposal) { proposals.push(proposal); simulatedTroopUses++; }
            else missingPeerTroopUses++;
          }
          const needsFormation = incomplete(npc);
          if (needsFormation) incompleteNpcs++;
          const simulatedUnits = needsFormation && donor ?
            clonePartialFormation(map, npc, donor) : [];
          simulatedFormationUnits += simulatedUnits.length;
          if (exceptionUnits.length || needsFormation) {
            npcRows.push({
              wikiMapId: map.wikiMapId, mapId: map.id, npcId: npc.id,
              npcName: npc.name, originalWikiNpcUrl: npc.sourceUrl || map.sourceUrl || null,
              sourceFormationPreserved: true, sourceUnitCount: array(npc.formation).length,
              templateNpcId: donor?.id || null,
              missingOrAmbiguousTroopWikiIds: exceptionUnits.map(u => u.troopWikiId),
              simulatedTroopProfiles: proposals,
              formationIncomplete: needsFormation,
              simulatedAddedFormationUnits: simulatedUnits,
              sourceNotModified: true, runtimeEnabled: false,
              blockedReason: donor ? null : 'NO_ELIGIBLE_PEER_IN_SAME_MAP'
            });
          }
        }
        if (map.npcListComplete !== true &&
            Number.isInteger(map.advertisedNpcCount) &&
            map.advertisedNpcCount > peers.length) {
          const wanted = map.advertisedNpcCount - peers.length;
          const limit = Math.min(wanted, 20);
          const donor = peers.filter(eligibleDonor).sort((a, b) =>
            (a.boss === true) - (b.boss === true) ||
            (a.order ?? 99999) - (b.order ?? 99999))[0] || null;
          const placeholders = [];
          if (donor) {
            for (let i = 1; i <= limit; i++) {
              const idx = peers.length + i;
              const syntheticNpcId = 'sim-' + map.id + '-npc-' + idx;
              const simulated = clonePartialFormation(map,
                {id: syntheticNpcId, formation: [], level: donor.level,
                 totalSoldiersRaw: donor.totalSoldiersRaw}, donor);
              placeholders.push({
                kind: 'SIMULATED_MISSING_NPC', provenance: 'SIMULATED',
                id: syntheticNpcId, wikiAiId: null, wikiMapId: map.wikiMapId,
                sourceNpcId: null, orderCandidate: idx,
                name: 'Địch quân giả lập ' + idx, boss: false,
                level: donor.level ?? null, donorNpcId: donor.id,
                formation: simulated, reward: null, wikiVerified: false,
                runtimeEnabled: false
              });
            }
            rosterPlaceholderCount += placeholders.length;
          }
          unresolvedRosterPlaces += wanted - placeholders.length;
          mapBackfills.push({mapId: map.id, wikiMapId: map.wikiMapId,
            advertisedNpcCount: map.advertisedNpcCount,
            originalNpcRows: peers.length, missingRosterPositions: wanted,
            simulatedNpcTemplates: placeholders, remainingUnfilled: wanted - placeholders.length,
            runtimeEnabled: false});
        }
      }
    }
    guard(seenMaps.size === Object.keys(manifest.mapLocator || {}).length,
      'incomplete source shard coverage');
    const counts = {
      maps: seenMaps.size, sourceNpcs: npcCount,
      exceptionNumericIds: unresolved.size, exceptionUnitUses: exceptionUses,
      simulatedTroopUses, missingPeerTroopUses, incompleteNpcs,
      simulatedFormationUnits, rosterPlaceholderCount, unresolvedRosterPlaces
    };
    return {
      schemaVersion: 1, kind: 'NL06_SAME_DUNGEON_SIMULATED_PEER_PREVIEW_V1',
      sourceEdition: manifest.sourceEdition, classicParity: 'UNKNOWN',
      provenance: 'SIMULATED', runtimeEnabled: false, generatedFromWikiUnchanged: true,
      policy: {
        donorMustBeSameWikiMap: true, sameMapRequired: true, randomSelection: false,
        copySourceIdsAsRuntimeIds: false, cloneRewardsOrDrops: false,
        officialTroopNumericJoinsAllowed: false,
        requiresChat02Chat06ReviewBeforeChat08: true, combatRuntimeIntegration: false,
        maxSynthesizedNpcRowsPerMap: 20
      },
      counts, npcs: npcRows, mapRosterCandidates: mapBackfills
    };
  }
  function main() {
    const fs = require('node:fs'), path = require('node:path');
    const base = path.join(process.cwd(), 'data/ngoalong/modules/campaign');
    const read = file => JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'));
    const manifest = read('source_shards/manifest.json');
    const shardNames = [...new Set(Object.values(manifest.mapLocator)
      .map(x => x.shard))].sort();
    const result = generate(manifest,
      shardNames.map(name => read('source_shards/' + name)),
      read('npc_numeric_troop_crosswalk_v2.json'));
    const filename = path.join(base, 'npc_same_dungeon_simulated_preview_v1.json');
    const serialized = JSON.stringify(result, null, 2) + '\n';
    if (process.argv.includes('--check')) {
      guard(fs.existsSync(filename) && fs.readFileSync(filename, 'utf8') === serialized,
        'preview differs from pinned source input');
    } else fs.writeFileSync(filename, serialized, 'utf8');
    process.stdout.write(JSON.stringify(result.counts) + '\n');
  }
  const api = Object.freeze({ generate, donorFor, simulateUnit, clonePartialFormation,
    roleOf, incomplete, eligibleDonor });
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    if (typeof require !== 'undefined' && require.main === module) main();
  } else root.NL06_SAME_DUNGEON_SIMULATION_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
