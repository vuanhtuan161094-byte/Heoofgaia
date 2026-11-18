/*
 * NL-CAMPAIGN-04 — read-only, data-backed chapter route and NPC reconnaissance.
 * Integration owner: chat 07. This module does NOT touch combat, Save, receipts,
 * stage settlement, source data, or the shared HTML/build generator.
 * Source pack: data/ngoalong/alpha_content.json (project SIMULATED content).
 */
(function (root) {
  'use strict';

  function fail(message) { throw new Error('NL-CAMPAIGN-04: ' + message); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }
  function getRequired(map, key, kind) {
    const found = map.get(key);
    if (!found) fail('Missing ' + kind + ' reference: ' + String(key));
    return found;
  }
  function uniqueIndex(rows, label) {
    if (!Array.isArray(rows)) fail(label + ' must be an array');
    const index = new Map();
    rows.forEach(function (row) {
      if (!row || typeof row.id !== 'string' || !row.id || index.has(row.id)) fail('Duplicate/missing ' + label + ' ID');
      index.set(row.id, row);
    });
    return index;
  }
  function selectedUnits(npc, encounter) {
    if (!Array.isArray(npc.units) || !Number.isInteger(npc.activeCount) || npc.activeCount < 1 || npc.activeCount > 5) {
      fail('Invalid NPC unit deployment ' + npc.id);
    }
    // Match the existing NL-R02 scouting/battle order; do not reinterpret units.
    const count = npc.activeCount;
    const positions = encounter.deploymentSlots || [];
    const occupied = new Set();
    return Array.from({length: count}, function (_, i) {
      const unit = npc.units[i === count - 1 ? 4 : i];
      if (!unit) fail('Missing deployed unit for ' + npc.id + ' at index ' + i);
      const slot = positions[i] == null ? unit.formationSlot : positions[i];
      if (!Number.isInteger(slot) || slot < 0 || slot > 8 || occupied.has(slot)) {
        fail('Invalid/duplicate deployed slot for ' + npc.id);
      }
      occupied.add(slot);
      return {
        id: unit.id, slot: slot, troopId: unit.troopId,
        heroId: unit.heroId, level: unit.level, soldiers: unit.soldiers,
        stats: unit.stats, skillId: unit.skillId, statusEffects: unit.statusEffects || [],
        provenance: unit.provenance || null
      };
    });
  }
  function derive(pack, cleared, selectedStage) {
    const campaign = pack && pack.campaign;
    if (!campaign || !Array.isArray(campaign.chapters)) fail('Missing campaign/chapter data');
    const maps = uniqueIndex(campaign.maps, 'map');
    const npcs = uniqueIndex(campaign.npcs, 'NPC');
    const encounters = uniqueIndex(campaign.encounters, 'encounter');
    const clearedSet = new Set((Array.isArray(cleared) ? cleared : []).filter(Number.isInteger));
    const stages = [...encounters.values()].sort(function (a,b) { return a.stage - b.stage; });
    if (!stages.length || stages.some(function (e,i) { return e.stage !== i + 1; })) fail('Stage IDs are not contiguous');
    const firstUncleared = stages.find(function (e) { return !clearedSet.has(e.stage); });
    const nextStage = firstUncleared ? firstUncleared.stage : stages.length + 1;
    const covered = new Set();
    const chapters = campaign.chapters.map(function (chapter) {
      if (!Array.isArray(chapter.encounterIds) || !chapter.encounterIds.length) fail('Empty chapter ' + chapter.id);
      const nodes = chapter.encounterIds.map(function (encounterId, index) {
        if (covered.has(encounterId)) fail('Encounter reused across chapters: ' + encounterId);
        covered.add(encounterId);
        const encounter = getRequired(encounters, encounterId, 'encounter');
        const map = getRequired(maps, encounter.mapId, 'map');
        const npc = getRequired(npcs, encounter.npcId, 'NPC');
        if (npc.mapId !== map.id) fail('NPC/map mismatch: ' + npc.id);
        const units = selectedUnits(npc, encounter);
        return {
          id: encounter.id, stage: encounter.stage, mapId: map.id, mapName: map.name,
          npcId: npc.id, npcName: npc.name, units: units,
          tactic: encounter.tactic || map.synopsis || '',
          mechanics: encounter.mechanics || [],
          rewards: encounter.rewards || {},
          cleared: clearedSet.has(encounter.stage),
          accessible: clearedSet.has(encounter.stage) || encounter.stage === nextStage,
          chapterFinale: index === chapter.encounterIds.length - 1,
          hasDropTable: Boolean(encounter.dropTableId || encounter.drops || encounter.loot),
          allNpcFieldsVerified: units.every(function (u) {
            return u.heroId != null && u.level != null && u.soldiers != null && u.stats != null && u.skillId != null;
          })
        };
      });
      return {id: chapter.id, name: chapter.name, nodes: nodes,
        clearedCount: nodes.filter(function (n) { return n.cleared; }).length};
    });
    if (covered.size !== encounters.size) fail('Chapters do not cover all encounters');
    const flattened = chapters.flatMap(function (ch) { return ch.nodes.map(function (node) { return node.stage; }); });
    if (flattened.some(function (stage,i) { return stage !== i + 1; })) fail('Chapter sequence differs from Save stage order');
    const requested = Number.isInteger(selectedStage) ? selectedStage : nextStage;
    const effective = requested >= 1 && requested <= stages.length ? requested : Math.min(nextStage, stages.length);
    const activeChapter = chapters.find(function (ch) { return ch.nodes.some(function (n) { return n.stage === effective; }); });
    const selected = activeChapter.nodes.find(function (n) { return n.stage === effective; });
    const allNodes = chapters.flatMap(function (ch) { return ch.nodes; });
    return {
      chapters: chapters, activeChapter: activeChapter, selected: selected,
      nextStage: nextStage, totalStages: stages.length,
      completeNpcRecords: allNodes.filter(function (n) { return n.allNpcFieldsVerified; }).length,
      withDropTables: allNodes.filter(function (n) { return n.hasDropTable; }).length
    };
  }
  function render(model) {
    const chapter = model.activeChapter;
    const node = model.selected;
    if (!chapter || !node) return '';
    const route = chapter.nodes.map(function (entry) {
      const status = entry.cleared ? 'Đã qua' : entry.accessible ? 'Có thể đánh' : 'Chưa mở';
      return '<button type="button" class="nl04-step" data-nl04-stage="' + entry.stage + '"' +
        (entry.accessible ? '' : ' disabled') +
        ' aria-current="' + (entry.stage === node.stage ? 'step' : 'false') + '">' +
        '<span class="nl04-node">' + entry.stage + '</span><b>' + escapeHtml(entry.npcName) +
        '</b><small>' + escapeHtml(status) + (entry.chapterFinale ? ' · Cuối chương' : '') + '</small></button>';
    }).join('<span class="nl04-connector" aria-hidden="true">›</span>');
    const occupied = new Map(node.units.map(function (unit) { return [unit.slot, unit]; }));
    const grid = Array.from({length:9}, function (_,slot) {
      const unit = occupied.get(slot);
      if (!unit) return '<div class="nl04-cell nl04-empty" aria-label="Ô ' + (slot + 1) + ' trống">·</div>';
      const skill = unit.skillId == null ? 'Chiến pháp theo hệ quân (SIMULATED)' : 'Kỹ năng: ' + unit.skillId;
      return '<div class="nl04-cell" data-nl04-unit="' + escapeHtml(unit.id) + '"><b>' +
        escapeHtml(unit.troopId) + '</b><small>Ô ' + (slot + 1) + ' · ' + escapeHtml(skill) +
        '</small><small>Tướng/cấp/quân số/chỉ số: ' +
        (unit.heroId == null || unit.level == null || unit.soldiers == null || unit.stats == null ? 'UNKNOWN' : 'Có dữ liệu') +
        '</small></div>';
    }).join('');
    const rewards = Object.entries(node.rewards).map(function (item) {
      return escapeHtml(item[0]) + ': ' + escapeHtml(item[1]);
    }).join(' · ');
    return '<section class="nl04-campaign" data-nl04-campaign="' + escapeHtml(chapter.id) + '" aria-label="Bản đồ chiến dịch theo chương">' +
      '<h3>' + escapeHtml(chapter.name) + ' · ' + chapter.clearedCount + '/' + chapter.nodes.length + ' trận</h3>' +
      '<nav class="nl04-route" aria-label="Chuỗi NPC trong chương">' + route + '</nav>' +
      '<div class="nl04-intel"><h4>' + escapeHtml(node.mapName) + ' — ' + escapeHtml(node.npcName) + '</h4>' +
      '<p>' + escapeHtml(node.tactic) + '</p><div class="nl04-grid" aria-label="Trận đồ địch 3 nhân 3">' + grid + '</div>' +
      '<p>Thưởng dự kiến lần đầu (SIMULATED): ' + rewards + '</p>' +
      (node.hasDropTable ? '' : '<p>Đồ rơi: UNKNOWN — chưa có bảng rơi được chuẩn hóa.</p>') +
      '<p>Đây là dữ liệu chiến dịch của dự án, không phải chỉ số NPC chính thức của Ngọa Long.</p></div></section>';
  }
  function bindSelection(container, getModel, choose) {
    if (!container || typeof container.addEventListener !== 'function') fail('Missing route container');
    if (typeof getModel !== 'function' || typeof choose !== 'function') fail('Missing selection callbacks');
    const listener = function (event) {
      const target = event.target && event.target.closest ? event.target.closest('[data-nl04-stage]') : null;
      if (!target || !container.contains(target)) return;
      const stage = Number(target.getAttribute('data-nl04-stage'));
      const model = getModel();
      const node = model.chapters.flatMap(function (ch) { return ch.nodes; }).find(function (n) { return n.stage === stage; });
      if (!node || !node.accessible) return;
      choose(stage);
    };
    container.addEventListener('click', listener);
    return function unbind() { container.removeEventListener('click', listener); };
  }
  const api = Object.freeze({derive: derive, render: render, bindSelection: bindSelection});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NL_CAMPAIGN04 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
