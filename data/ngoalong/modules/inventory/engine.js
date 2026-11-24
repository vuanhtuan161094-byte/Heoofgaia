/* Muu Dinh Tam Quoc — isolated inventory domain; no game globals or save writes.
 * All invented capacities/refinement/economy coefficients are PROJECT_ORIGINAL/SIMULATED.
 * Integrator passes catalogue and rules; reference-only Wiki rows are never actionable.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NLItemInventory = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const STATS = ['atk', 'def', 'int', 'hp', 'tdef', 'mdef'];
  const LANES = ['weaponAtk', 'horseAtk'];
  const RESOURCES = new Set(['silver', 'iron', 'grain', 'prestige']);
  const SLOT_ALIASES = { banner: 'artifact' };
  const owned = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function problem(code) { const e = new Error(code); e.code = code; throw e; }
  function assert(ok, code) { if (!ok) problem(code); }
  function integer(v, min = 0) { return Number.isSafeInteger(v) && v >= min; }
  function jsonCopy(v) { return JSON.parse(JSON.stringify(v)); }
  function canon(slot) { return SLOT_ALIASES[slot] || slot; }
  function saneId(v) { return typeof v === 'string' && v.length > 0 && v.length <= 160; }
  function validateCatalogue(pack) {
    assert(pack && Array.isArray(pack.equipment) && Array.isArray(pack.items), 'BAD_CATALOGUE');
    const ids = new Set(), byId = {};
    for (const row of [...pack.equipment, ...pack.items]) {
      assert(row && saneId(row.id) && !ids.has(row.id), 'DUPLICATE_OR_INVALID_ID');
      assert(['PLAYABLE', 'REFERENCE_ONLY'].includes(row.integration), 'BAD_INTEGRATION_STATUS');
      assert(['VERIFIED', 'DERIVED', 'SIMULATED', 'UNKNOWN'].includes(row.provenance?.classification), 'BAD_PROVENANCE');
      if (row.integration === 'PLAYABLE') {
        assert(row.provenance.classification === 'SIMULATED', 'UNAPPROVED_WIKI_ACTIVATION');
        if (row.category === 'equipment') {
          assert(typeof row.slot === 'string' && row.stats && STATS.every(k => integer(row.stats[k])), 'BAD_EQUIPMENT_STATS');
        } else {
          assert(['consumable', 'material'].includes(row.category), 'BAD_ACTIVE_ITEM_CATEGORY');
        }
      } else {
        assert(row.effectRule == null && row.stats == null, 'REFERENCE_HAS_ACTIVE_EFFECT');
      }
      ids.add(row.id); byId[row.id] = row;
    }
    return byId;
  }
  function createModule(pack, rules) {
    const catalog = validateCatalogue(pack);
    assert(rules && rules.limits && rules.reinforcement && rules.refinement, 'BAD_RULES');
    const limits = rules.limits;
    assert(integer(limits.equipmentInstances, 1) && integer(limits.stackKinds, 1) &&
      integer(limits.stackQuantity, 1) && integer(limits.receipts, 1), 'BAD_LIMITS');
    function moduleState(state) {
      if (!state.nlItemsV1) state.nlItemsV1 = { stacks: {}, receipts: {}, serial: 0 };
      const m = state.nlItemsV1;
      assert(m && typeof m.stacks === 'object' && m.stacks && !Array.isArray(m.stacks) &&
        m.receipts && typeof m.receipts === 'object' && !Array.isArray(m.receipts) &&
        integer(m.serial), 'CORRUPT_ITEM_STATE');
      assert(Array.isArray(state.items) && state.gear && typeof state.gear === 'object', 'INCOMPATIBLE_SAVE');
      return m;
    }
    function checkOwned(state) {
      const uids = new Set();
      for (const instance of state.items) {
        assert(instance && instance.uid != null && saneId(String(instance.uid)) && !uids.has(String(instance.uid)), 'DUPLICATE_INSTANCE_UID');
        uids.add(String(instance.uid));
      }
      const allocated = new Set();
      for (const gear of Object.values(state.gear)) {
        for (const uid of Object.values(gear || {})) {
          if (uid == null || uid === '') continue;
          assert(uids.has(String(uid)), 'DANGLING_EQUIPMENT');
          assert(!allocated.has(String(uid)), 'EQUIPMENT_DOUBLE_ASSIGNED');
          allocated.add(String(uid));
        }
      }
    }
    function execute(state, kind, receiptId, payload, apply) {
      try {
        assert(state && typeof state === 'object', 'BAD_SAVE');
        assert(saneId(receiptId), 'RECEIPT_REQUIRED');
        const fingerprint = JSON.stringify([kind, payload]);
        const next = jsonCopy(state), m = moduleState(next);
        const prev = m.receipts[receiptId];
        if (prev) {
          assert(prev === fingerprint, 'RECEIPT_CONFLICT');
          return { ok: true, duplicate: true, state, code: 'ALREADY_SETTLED' };
        }
        assert(Object.keys(m.receipts).length < limits.receipts, 'RECEIPT_CAPACITY');
        checkOwned(next);
        const detail = apply(next, m) || {};
        m.receipts[receiptId] = fingerprint;
        checkOwned(next);
        return { ok: true, duplicate: false, state: next, detail };
      } catch (err) {
        return { ok: false, duplicate: false, state, code: err.code || 'INVALID_OPERATION' };
      }
    }
    function available(id, category) {
      const row = catalog[id];
      assert(row, 'UNKNOWN_ITEM');
      assert(row.integration === 'PLAYABLE', 'REFERENCE_ONLY');
      if (category) assert(row.category === category, 'WRONG_ITEM_CATEGORY');
      return row;
    }
    function equipmentCapacity(state) {
      const level=state?.nlCity?.levels?.nl_city_warehouse;
      return limits.equipmentInstances+5*(Number.isSafeInteger(level)?Math.max(0,Math.min(20,level)):0);
    }
    function grant(state, entries, receiptId) {
      return execute(state, 'GRANT', receiptId, entries, (next, m) => {
        assert(Array.isArray(entries) && entries.length > 0 && entries.length <= 100, 'BAD_GRANT');
        const grouped = new Map();
        for (const e of entries) {
          assert(e && saneId(e.id) && integer(e.quantity, 1) && e.quantity <= 999, 'BAD_GRANT_QTY');
          available(e.id);
          grouped.set(e.id, (grouped.get(e.id) || 0) + e.quantity);
        }
        let equipmentCount = 0;
        const created = [];
        for (const [id, qty] of grouped) {
          const row = available(id);
          if (row.category === 'equipment') equipmentCount += qty;
          else {
            assert(integer(m.stacks[id] || 0), 'CORRUPT_STACK');
            assert((m.stacks[id] || 0) + qty <= limits.stackQuantity, 'STACK_CAPACITY');
          }
        }
        assert(next.items.length + equipmentCount <= equipmentCapacity(next), 'EQUIPMENT_CAPACITY');
        const kinds = new Set(Object.keys(m.stacks).filter(id => m.stacks[id] > 0));
        for (const [id] of grouped) if (catalog[id].category !== 'equipment') kinds.add(id);
        assert(kinds.size <= limits.stackKinds, 'STACK_KIND_CAPACITY');
        const existingUids = new Set(next.items.map(x => String(x.uid)));
        for (const [id, qty] of grouped) {
          if (catalog[id].category !== 'equipment') {
            m.stacks[id] = (m.stacks[id] || 0) + qty;
          } else {
            for (let i = 0; i < qty; i++) {
              let uid;
              do { m.serial++; uid = 'nli-' + m.serial; } while (existingUids.has(uid));
              existingUids.add(uid);
              next.items.push({ uid, base: id, lv: 1 });
              created.push(uid);
            }
          }
        }
        return { created, quantities: Object.fromEntries(grouped) };
      });
    }
    // Buying is distinct from receiving a victory reward: no item is created
    // without charging its declared project-shop cost in the same transaction.
    function buy(state, id, receiptId) {
      return execute(state, 'BUY_EQUIPMENT', receiptId, id, (next, m) => {
        const row = available(id, 'equipment');
        const acquisition = row.acquisitionRule;
        assert(acquisition && ['SHOP','SHOP_OR_AUTHORIZED_REWARD'].includes(acquisition.kind) &&
          acquisition.shopCost, 'EQUIPMENT_NOT_FOR_SALE');
        assert(next.items.length < equipmentCapacity(next), 'EQUIPMENT_CAPACITY');
        pay(next, acquisition.shopCost);
        const uids = new Set(next.items.map(x => String(x.uid)));
        let uid;
        do { m.serial++; uid = 'nli-' + m.serial; } while (uids.has(uid));
        next.items.push({ uid, base: id, lv: 1 });
        return { purchased: id, uid, cost: { ...acquisition.shopCost } };
      });
    }
    function equipmentInstance(state, uid) {
      assert(uid != null && saneId(String(uid)), 'BAD_UID');
      const instance = state.items.find(x => String(x.uid) === String(uid));
      assert(instance, 'EQUIPMENT_NOT_OWNED');
      available(instance.base, 'equipment');
      assert(integer(instance.lv, 1), 'BAD_REINFORCEMENT_LEVEL');
      return instance;
    }
    function equip(state, heroId, uid, receiptId) {
      return execute(state, 'EQUIP', receiptId, [heroId, uid], next => {
        assert(saneId(heroId) && next.hero && owned(next.hero, heroId), 'HERO_NOT_FOUND');
        const instance = equipmentInstance(next, uid), row = catalog[instance.base];
        const level = next.hero[heroId]?.level;
        assert(integer(level, 1) && level >= (row.requiredLevel || 1), 'HERO_LEVEL_REQUIRED');
        const gear = next.gear[heroId] || (next.gear[heroId] = {});
        for (const [owner, slots] of Object.entries(next.gear)) {
          for (const currentUid of Object.values(slots || {})) {
            if (String(currentUid) === String(uid)) {
              assert(owner === heroId, 'EQUIPPED_BY_OTHER_HERO');
              assert(String(gear[row.slot]) === String(uid), 'ALREADY_EQUIPPED_WRONG_SLOT');
            }
          }
        }
        // Existing Save v5 uses 'banner', so preserve the concrete slot key.
        assert(!Object.entries(gear).some(([slot, oldUid]) =>
          canon(slot) === canon(row.slot) && slot !== row.slot && oldUid), 'DUPLICATE_SLOT_ALIAS');
        gear[row.slot] = instance.uid;
        return { heroId, uid: instance.uid, slot: row.slot };
      });
    }
    function unequip(state, heroId, slot, receiptId) {
      return execute(state, 'UNEQUIP', receiptId, [heroId, slot], next => {
        assert(saneId(heroId) && next.hero && owned(next.hero, heroId), 'HERO_NOT_FOUND');
        assert(saneId(slot), 'BAD_SLOT');
        const gear = next.gear[heroId] || {};
        assert(owned(gear, slot) && gear[slot] != null, 'SLOT_EMPTY');
        const uid = gear[slot];
        delete gear[slot];
        return { heroId, uid, slot };
      });
    }
    function pay(state, costs) {
      for (const [resource, amount] of Object.entries(costs)) {
        assert(RESOURCES.has(resource) && integer(amount), 'INVALID_COST');
        assert(integer(state[resource] || 0) && (state[resource] || 0) >= amount, 'INSUFFICIENT_RESOURCES');
      }
      for (const [resource, amount] of Object.entries(costs)) state[resource] = (state[resource] || 0) - amount;
    }
    // One price source for UI, combat state and all receipt transactions.
    function reinforcementCost(level, state) {
      assert(integer(level, 1) && level < rules.reinforcement.maxLevel, 'BAD_REINFORCE_LEVEL');
      const r=rules.reinforcement;
      const silver=Math.round(r.silverBase*Math.pow(level,r.silverExponent));
      const cost = r.classicA3Pricing===true
        ? {silver:silver+Math.round(r.silverSupplementBase*Math.pow(level,r.silverSupplementExponent)),
           grain:Math.round(r.grainBase*Math.pow(level,r.grainExponent))}
        : {silver,iron:Math.round(r.ironBase*Math.pow(level,r.ironExponent))};
      const levels=state?.nlCity?.levels||{};
      const safeLevel=id=>Number.isSafeInteger(levels[id])?Math.max(0,Math.min(20,levels[id])):0;
      const discount=Math.min(.16,Math.min(.10,safeLevel('nl_city_workshop')*.02)+Math.min(.06,safeLevel('nl_city_engraving')*.01));
      if(discount)cost.silver=Math.ceil(cost.silver*(1-discount));
      return cost;
    }
    function reinforce(state, uid, receiptId) {
      return execute(state, 'REINFORCE', receiptId, uid, next => {
        const instance = equipmentInstance(next, uid);
        const r = rules.reinforcement;
        assert(instance.lv < r.maxLevel, 'REINFORCEMENT_MAX');
        const cost = reinforcementCost(instance.lv,next);
        pay(next, cost);
        instance.lv++;
        return { uid: instance.uid, level: instance.lv, cost };
      });
    }
    function refine(state, uid, receiptId) {
      return execute(state, 'REFINE', receiptId, uid, (next, m) => {
        const instance = equipmentInstance(next, uid), r = rules.refinement;
        const rank = instance.refineLv || 0;
        assert(integer(rank) && rank < r.maxLevel, 'REFINE_MAX');
        const material = available(r.materialId, 'material');
        const row = catalog[instance.base];
        // R03 and early gear remain price-stable; premium applies only to
        // high-tier, project-authored equipment.
        const premium = row.sourceId && row.integration==='PLAYABLE' && r.highTierPricing?.groups
          ? r.highTierPricing.groups[row.sourceGroup] : null;
        const materialCount = r.materialPerLevel + (premium?.materialExtra || 0);
        assert(integer(m.stacks[material.id] || 0) && m.stacks[material.id] >= materialCount, 'INSUFFICIENT_MATERIAL');
        const cost = { silver: Math.round(r.silverBase * (rank + 1) * (premium?.silverMultiplier || 1)) };
        pay(next, cost);
        m.stacks[material.id] -= materialCount;
        if (m.stacks[material.id] === 0) delete m.stacks[material.id];
        instance.refineLv = rank + 1;
        return { uid: instance.uid, refineLv: instance.refineLv, cost, material: material.id };
      });
    }
    function use(state, id, receiptId) {
      return execute(state, 'USE', receiptId, id, (next, m) => {
        const row = available(id, 'consumable'), effect = row.effectRule;
        assert(effect && effect.kind === 'GRANT_RESOURCE' && RESOURCES.has(effect.resource) &&
          integer(effect.amount, 1), 'UNSUPPORTED_CONSUMABLE');
        assert(integer(m.stacks[id] || 0) && m.stacks[id] >= 1, 'OUT_OF_STOCK');
        assert(integer(next[effect.resource] || 0) &&
          (next[effect.resource] || 0) + effect.amount <= Number.MAX_SAFE_INTEGER, 'RESOURCE_OVERFLOW');
        m.stacks[id]--;
        if (m.stacks[id] === 0) delete m.stacks[id];
        next[effect.resource] = (next[effect.resource] || 0) + effect.amount;
        return { consumed: id, resource: effect.resource, added: effect.amount };
      });
    }
    function collectSets(state, heroId) {
      const counts = new Map();
      for (const uid of Object.values(state.gear?.[heroId] || {})) {
        if (uid == null) continue;
        const instance = equipmentInstance(state, uid);
        const setId = catalog[instance.base].effectRule?.setId;
        if (setId) counts.set(setId, (counts.get(setId) || 0) + 1);
      }
      const activated = [], totals = Object.fromEntries(STATS.map(k => [k,0]));
      for (const [setId, pieces] of counts) {
        const rule = rules.setBonuses?.[setId];
        if (!rule) continue;
        for (const threshold of rule.thresholds || []) {
          if (pieces < threshold.pieces) continue;
          assert(integer(threshold.pieces, 1) && STATS.every(k =>
            !Object.prototype.hasOwnProperty.call(threshold.stats,k) ||
            integer(threshold.stats[k])), 'BAD_SET_BONUS');
          for (const [key, amount] of Object.entries(threshold.stats)) {
            assert(STATS.includes(key) && integer(amount), 'BAD_SET_BONUS');
            totals[key] += amount;
          }
          activated.push({ setId, pieces, activatedAt: threshold.pieces,
            stats: { ...threshold.stats } });
        }
      }
      return { bonuses: totals, activated };
    }
    function sets(state, heroId) {
      checkOwned(state);
      return collectSets(state, heroId).activated;
    }
    function bonuses(state, heroId) {
      checkOwned(state);
      const result = Object.fromEntries([...STATS, ...LANES].map(k => [k, 0]));
      for (const uid of Object.values(state.gear?.[heroId] || {})) {
        if (uid == null) continue;
        const instance = equipmentInstance(state, uid), row = catalog[instance.base];
        const refineLv = instance.refineLv || 0;
        assert(integer(refineLv) && refineLv <= rules.refinement.maxLevel, 'BAD_REFINE_LEVEL');
        const factor = (1 + (instance.lv - 1) * rules.reinforcement.statBonusPerLevel) *
          (1 + refineLv * rules.refinement.statBonusPerLevel);
        for (const stat of STATS) result[stat] += Math.round(row.stats[stat] * factor);
        if (row.slot === 'weapon') result.weaponAtk += Math.round(row.stats.atk * factor);
        if (row.slot === 'horse') result.horseAtk += Math.round(row.stats.atk * factor);
      }
      const setStats = collectSets(state, heroId).bonuses;
      for (const key of STATS) result[key] += setStats[key];
      return result;
    }
    return { grant, buy, equip, unequip, reinforce, reinforcementCost, refine, use, bonuses, sets, validateState: checkOwned };
  }
  return { createModule, validateCatalogue };
});
