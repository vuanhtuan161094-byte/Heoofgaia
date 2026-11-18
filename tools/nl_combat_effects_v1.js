/* Muu Dinh Tam Quoc - original, deterministic status mechanics V1.
   Reference Wiki data is NEVER loaded as executable combat rules.
   Works with Node CommonJS and a plain browser script. No globals mutated. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.NLCombatEffectsV1 = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const MODES = new Set(["refresh-longer", "add-stack", "replace"]);
  const PHASES = new Set(["round-end", "owner-action"]);
  const POLARITIES = new Set(["beneficial", "harmful", "neutral"]);
  function fail(message) { throw new Error("NL_EFFECT_V1: " + message); }
  function copy(data) { return JSON.parse(JSON.stringify(data)); }
  function isInt(n) { return Number.isSafeInteger(n); }
  function nonnegative(n) { return typeof n === "number" && Number.isFinite(n) && n >= 0; }
  function validateCatalog(catalog) {
    if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.effects)) fail("invalid project catalog");
    const seen = new Set();
    for (const e of catalog.effects) {
      if (!e || typeof e.id !== "string" || !e.id || seen.has(e.id)) fail("duplicate or missing effect id");
      seen.add(e.id);
      if (!POLARITIES.has(e.polarity) || !["removable", "unremovable"].includes(e.dispelPolicy)) fail(e.id + " polarity/dispel");
      if (!MODES.has(e.stacking) || !PHASES.has(e.expirePhase)) fail(e.id + " stacking/phase");
      if (!isInt(e.duration) || e.duration < 1 || !isInt(e.stackLimit) || e.stackLimit < 1) fail(e.id + " duration/limit");
      if (e.provenance?.classification !== "SIMULATED") fail(e.id + " is not declared original SIMULATED");
      if (e.burnFraction !== undefined && (!nonnegative(e.burnFraction) || e.burnFraction > 1)) fail(e.id + " burnFraction");
      if (e.modifiers && Object.values(e.modifiers).some(v => !nonnegative(v))) fail(e.id + " modifier");
      if (e.shieldCharges !== undefined && (!isInt(e.shieldCharges) || e.shieldCharges < 1)) fail(e.id + " charges");
    }
    if (!isInt(catalog.moraleCap) || catalog.moraleCap < 1) fail("moraleCap");
    return true;
  }
  function definition(catalog, id) {
    const e = catalog.effects.find(x => x.id === id);
    if (!e) fail("unknown status " + String(id));
    return e;
  }
  function unitIn(state, id) {
    const unit = state.units.find(x => x.id === id);
    if (!unit) fail("unknown unit " + String(id));
    return unit;
  }
  function statusOf(unit, id) { return unit.statuses.find(x => x.id === id); }
  function assertState(state) {
    if (!state || !Array.isArray(state.units) || !isInt(state.sequence) || !isInt(state.round)) fail("invalid state");
    if (new Set(state.units.map(x => x.id)).size !== state.units.length) fail("duplicate units");
    return true;
  }
  function newBattle(catalog, units) {
    validateCatalog(catalog);
    if (!Array.isArray(units) || units.length === 0) fail("units required");
    const state = { schemaVersion: 1, round: 1, sequence: 0, units: units.map(u => {
      if (typeof u.id !== "string" || !u.id || !isInt(u.maxHp) || u.maxHp < 1) fail("bad unit");
      if (!isInt(u.hp) || u.hp < 0 || u.hp > u.maxHp) fail("unit hp");
      const morale = u.morale === undefined ? 0 : u.morale;
      if (!isInt(morale) || morale < 0 || morale > catalog.moraleCap) fail("unit morale");
      return { id: u.id, side: String(u.side ?? ""), hp: u.hp, maxHp: u.maxHp, morale, statuses: [] };
    }) };
    assertState(state);
    return state;
  }
  function resolveProc(options) {
    if (options.chance === undefined && options.roll === undefined) return true;
    if (!nonnegative(options.chance) || options.chance > 1 || !nonnegative(options.roll) || options.roll >= 1) fail("supply chance in [0,1] and external roll in [0,1)");
    return options.roll < options.chance;
  }
  function applyStatus(state, catalog, options) {
    assertState(state); validateCatalog(catalog);
    const s = copy(state), u = unitIn(s, options.targetId), e = definition(catalog, options.statusId);
    const events = [];
    if (u.hp === 0) return { state: s, accepted: false, events: [{ type: "status-blocked", reason: "dead", targetId: u.id, statusId: e.id }] };
    if (!resolveProc(options)) return { state: s, accepted: false, events: [{ type: "status-missed", targetId: u.id, statusId: e.id }] };
    if (e.polarity === "harmful" && statusOf(u, "ward")) return { state: s, accepted: false, events: [{ type: "status-blocked", reason: "ward", targetId: u.id, statusId: e.id }] };
    if (e.polarity === "beneficial" && statusOf(u, "repel-blessing")) return { state: s, accepted: false, events: [{ type: "status-blocked", reason: "repel-blessing", targetId: u.id, statusId: e.id }] };
    const old = statusOf(u, e.id);
    if (old) {
      if (e.stacking === "add-stack") {
        old.stacks = Math.min(e.stackLimit, old.stacks + 1);
        old.remaining = Math.max(old.remaining, e.duration);
      } else if (e.stacking === "refresh-longer") {
        old.remaining = Math.max(old.remaining, e.duration);
      } else {
        old.stacks = 1; old.remaining = e.duration; old.charges = e.shieldCharges ?? null;
      }
      events.push({ type: "status-updated", targetId: u.id, statusId: e.id, stacks: old.stacks, remaining: old.remaining });
    } else {
      u.statuses.push({ id: e.id, stacks: 1, remaining: e.duration, charges: e.shieldCharges ?? null, order: ++s.sequence });
      events.push({ type: "status-applied", targetId: u.id, statusId: e.id, stacks: 1, remaining: e.duration });
    }
    return { state: s, accepted: true, events };
  }
  function dispel(state, catalog, options) {
    assertState(state); validateCatalog(catalog);
    const s = copy(state), u = unitIn(s, options.targetId);
    const scope = options.scope ?? "harmful";
    if (!["beneficial", "harmful", "all"].includes(scope)) fail("invalid cleanse scope");
    const max = options.maxRemove === undefined ? Number.MAX_SAFE_INTEGER : options.maxRemove;
    if (!isInt(max) || max < 0) fail("invalid cleanse count");
    const removed = [];
    const eligible = u.statuses.filter(x => {
      const e = definition(catalog, x.id);
      return e.dispelPolicy === "removable" && (scope === "all" || scope === e.polarity);
    }).sort((a, b) => a.order - b.order).slice(0, max);
    const keys = new Set(eligible.map(x => x.id));
    u.statuses = u.statuses.filter(x => !keys.has(x.id));
    for (const x of eligible) removed.push({ type: "status-dispelled", targetId: u.id, statusId: x.id });
    return { state: s, removed: eligible.map(x => x.id), events: removed };
  }
  function modifiers(state, catalog, unitId) {
    const u = unitIn(state, unitId);
    let outgoing = 1, incoming = 1;
    for (const s of u.statuses) {
      const e = definition(catalog, s.id), m = e.modifiers || {};
      if (m.incomingDamageMultiplier !== undefined) incoming *= Math.pow(m.incomingDamageMultiplier, s.stacks);
      if (m.outgoingDamageMultiplier !== undefined) outgoing *= Math.pow(m.outgoingDamageMultiplier, s.stacks);
    }
    return { outgoingDamageMultiplier: outgoing, incomingDamageMultiplier: incoming };
  }
  function damage(state, catalog, options) {
    assertState(state); validateCatalog(catalog);
    if (!isInt(options.amount) || options.amount < 0) fail("invalid damage");
    const s = copy(state), u = unitIn(s, options.targetId), events = [];
    let raw = options.amount;
    if (options.sourceId !== undefined && options.sourceId !== null) raw *= modifiers(s, catalog, options.sourceId).outgoingDamageMultiplier;
    raw = Math.max(0, Math.floor(raw * modifiers(s, catalog, u.id).incomingDamageMultiplier));
    const protection = statusOf(u, "ironwall");
    if (raw > 0 && protection && protection.charges > 0) {
      protection.charges--;
      events.push({ type: "damage-blocked", targetId: u.id, by: "ironwall", damage: raw });
      if (protection.charges === 0) u.statuses = u.statuses.filter(x => x.id !== "ironwall");
      return { state: s, damage: 0, events };
    }
    const dealt = Math.min(u.hp, raw);
    u.hp -= dealt;
    events.push({ type: "damage", targetId: u.id, amount: dealt, remainingHp: u.hp });
    if (dealt > 0 && !statusOf(u, "anchored")) {
      const wakeups = u.statuses.filter(x => definition(catalog, x.id).breakOnDamage === true).map(x => x.id);
      u.statuses = u.statuses.filter(x => !wakeups.includes(x.id));
      for (const id of wakeups) events.push({ type: "status-broken-by-damage", targetId: u.id, statusId: id });
    }
    return { state: s, damage: dealt, events };
  }
  function morale(state, catalog, options) {
    assertState(state); validateCatalog(catalog);
    if (!isInt(options.delta)) fail("morale delta must be integer");
    const s = copy(state), u = unitIn(s, options.targetId), requested = options.delta;
    const applied = requested > 0 && statusOf(u, "morale-seal") ? 0 :
      Math.max(0, Math.min(catalog.moraleCap, u.morale + requested)) - u.morale;
    u.morale += applied;
    return { state: s, applied, events: [{ type: "morale", targetId: u.id, requested, applied, remaining: u.morale }] };
  }
  function startAction(state, catalog, options) {
    assertState(state); validateCatalog(catalog);
    const s = copy(state), u = unitIn(s, options.targetId), events = [];
    const blockers = u.statuses.filter(x => definition(catalog, x.id).control === "skip-action").map(x => x.id);
    if (blockers.length) events.push({ type: "action-skipped", targetId: u.id, by: blockers.slice() });
    else events.push({ type: "action-allowed", targetId: u.id });
    for (const x of u.statuses) if (definition(catalog, x.id).expirePhase === "owner-action") x.remaining--;
    const expired = u.statuses.filter(x => x.remaining <= 0).map(x => x.id);
    u.statuses = u.statuses.filter(x => x.remaining > 0);
    for (const id of expired) events.push({ type: "status-expired", targetId: u.id, statusId: id, phase: "owner-action" });
    return { state: s, canAct: blockers.length === 0, events };
  }
  function endRound(state, catalog) {
    assertState(state); validateCatalog(catalog);
    const s = copy(state), events = [];
    for (const u of s.units) {
      for (const st of u.statuses) {
        const e = definition(catalog, st.id);
        if (e.expirePhase !== "round-end") continue;
        if (e.burnFraction && u.hp > 0) {
          const n = Math.min(u.hp, Math.max(1, Math.floor(u.maxHp * e.burnFraction * st.stacks)));
          u.hp -= n;
          events.push({ type: "periodic-damage", targetId: u.id, statusId: st.id, amount: n, remainingHp: u.hp });
        }
        st.remaining--;
      }
      const expired = u.statuses.filter(x => x.remaining <= 0).map(x => x.id);
      u.statuses = u.statuses.filter(x => x.remaining > 0);
      for (const id of expired) events.push({ type: "status-expired", targetId: u.id, statusId: id, phase: "round-end" });
    }
    s.round++;
    return { state: s, events };
  }
  function auditWikiSources(effects, bridge) {
    if (effects?.edition !== "VNG_WIKI_MOBILE_CURRENT" || bridge?.coverage?.effectProfiles !== 320) fail("Wiki source edition mismatch");
    if (!Array.isArray(effects.records) || effects.records.length !== 320 ||
        !Array.isArray(bridge.events) || bridge.events.length !== 501 || bridge.coverage.troopProfiles !== 372) fail("Wiki source count mismatch");
    const ids = new Set(effects.records.map(e => e.id));
    if (ids.size !== 320) fail("duplicate Wiki effect id");
    for (const x of bridge.events) {
      if (x.runtimeEnabled !== false || (x.canonicalEffectId && !ids.has(x.canonicalEffectId)) ||
          (x.candidateEffectIds || []).some(y => !ids.has(y))) fail("unsafe Wiki bridge event");
    }
    return { sourceOnly: true, effectCount: ids.size, troopProfiles: bridge.coverage.troopProfiles,
      observations: bridge.events.length, statusLinked: bridge.coverage.statusLinkedOneToOne,
      statusAmbiguous: bridge.coverage.statusAmbiguousName, statusUnknown: bridge.coverage.statusUnmapped,
      classification: "VERIFIED_REFERENCE_DERIVED_MAPPING_NOT_RUNTIME" };
  }
  return Object.freeze({ validateCatalog, newBattle, applyStatus, dispel, damage, morale, startAction, endRound, modifiers, auditWikiSources });
});
