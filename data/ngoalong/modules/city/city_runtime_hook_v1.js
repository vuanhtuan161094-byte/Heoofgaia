/* CHAT 03 City integration hooks — executable adapter for CHAT 08 canonical builder.
 * This module alone does not patch index.html or take ownership of Save/timers.
 * It is intentionally dependency-injected to run INSIDE the existing game closure.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NLCityRuntimeHook = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SLOT_ID = 'nl-city-panel-root';
  function createIntegration(deps) {
    if (!deps || !deps.catalog || !deps.research || !deps.engineApi || !deps.panelApi ||
        typeof deps.getGame !== 'function' || typeof deps.save !== 'function' ||
        typeof deps.findRoot !== 'function') throw Error('NL_CITY_INTEGRATION_DEPENDENCIES_REQUIRED');
    const now = deps.now || Date.now;
    const engine = deps.engineApi.createEngine(deps.catalog, deps.research);
    const panel = deps.panelApi.createPanel({
      engine, catalog:deps.catalog, research:deps.research,
      getGame:deps.getGame, save:deps.save, now,
      openLegacy:deps.openLegacy, onResult:deps.onResult
    });
    if (panel.coverage.cityBuildings !== 31 || panel.coverage.legacyBuildings !== 7 ||
        panel.coverage.techs !== 8) throw Error('NL_CITY_INTEGRATION_INCOMPLETE_COVERAGE');
    let mounted = null, unbind = null;
    function slotHtml() {
      return '<div id="'+SLOT_ID+'" data-nl-city-root="1"></div>';
    }
    function appendCity(existing) {
      if (typeof existing !== 'string') throw Error('NL_CITY_NATIVE_RENDERER_EXPECTED_STRING');
      if (existing.includes('id="'+SLOT_ID+'"'))throw Error('NL_CITY_DUPLICATE_PANEL_SLOT');
      return existing + slotHtml();
    }
    function unmount() {
      if (unbind) {unbind(); unbind=null;}
      mounted=null;
    }
    function mount() {
      const root=deps.findRoot(SLOT_ID);
      if (!root) {unmount();return false;}
      if (root===mounted) return true;
      unmount();
      unbind=panel.bind(root);
      mounted=root;
      return true;
    }
    function advance() {return engine.advance(deps.getGame(),now());}
    function wrapRenderCity(renderCity) {
      if (typeof renderCity !== 'function')throw Error('NL_CITY_NATIVE_CITY_RENDERER_REQUIRED');
      return function() {return appendCity(renderCity.apply(this,arguments));};
    }
    function wrapRender(render) {
      if (typeof render !== 'function')throw Error('NL_CITY_NATIVE_RENDER_REQUIRED');
      return function() {
        const result=render.apply(this,arguments);
        mount(); // Native render may replace #view on every tab and resource update.
        return result;
      };
    }
    function wrapTick(tick) {
      if (typeof tick !== 'function')throw Error('NL_CITY_NATIVE_TICK_REQUIRED');
      return function() {
        advance(); // Use game clock; no second interval or secondary Save key.
        return tick.apply(this,arguments);
      };
    }
    function uninstall() {unmount();}
    return Object.freeze({
      SLOT_ID,engine,panel,slotHtml,appendCity,mount,unmount,advance,
      wrapRenderCity,wrapRender,wrapTick,uninstall,
      get mounted(){return Boolean(mounted);},
      coverage:panel.coverage
    });
  }
  return Object.freeze({createIntegration,SLOT_ID});
});
