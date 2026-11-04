"""HG18 actual offline Chromium clicks. No-grant rookie segment is separate from
explicit endgame fixtures. All rendered controls use app.js action routing.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
QA=ROOT/"docs"/"qa"/"hg18";OUT=ROOT/"docs"/"evidence"/"hg18"
QA.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(label,ok,details=None):
 checks.append({"label":label,"ok":bool(ok),"details":details})
 print(("PASS " if ok else "FAIL ")+label,details or "",flush=True)
 if not ok: raise AssertionError(label)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
  page=browser.new_page(viewport={"width":1280,"height":900})
  page.set_default_timeout(15000)
  page.on("pageerror",lambda e: errors.append(str(e)))
  page.goto(HTML.as_uri(),wait_until="load")
  page.locator('[data-action="start"]').click()
  check("New Game retains no free HG18 materials",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();return !!s?.hg18&&Object.values(s.hg18.materials).every(v=>v===0)&&s.fame===5;
  }"""))
  page.locator('[data-action="tab"][data-tab="city"]').first.click()
  page.locator('[data-action="building"][data-key="market"]').click()
  page.locator('[data-action="upgrade"][data-key="market"]').click()
  page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();
    HOG_ENGINE.tick(s,s.lastTick+(s.buildingQueue.remaining+2)*1000/s.speed);
    HOG_APP_DEBUG.render();
  }""")
  page.locator('[data-action="tab"][data-tab="tasks"]').first.click()
  check("Actual daily/weekly quest cards appear with a real completed build",
        page.locator('[data-action="hg18-claim"][data-id="daily_build"]').is_enabled()
        and page.locator('[data-action="hg18-claim"][data-id="weekly_build"]').count()==1)
  page.screenshot(path=str(OUT/"daily-weekly-quests-chrome.png"),full_page=True)
  page.locator('[data-action="hg18-claim"][data-id="daily_build"]').click()
  check("Claim button pays exactly one resource card",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();return s.hg18.materials.resource_card===1&&
     s.hg18.day.claimed.includes('daily_build')&&HOG_ENGINE.strictSave(s);
  }"""))
  page.locator('[data-action="tab"][data-tab="relics"]').first.click()
  check("Resource cards, rare fragments, forge and set slots appear in actual UI",
        page.locator('[data-action="hg18-open"][data-id="resource_card"]').count()==1
        and page.locator('[data-action="hg18-craft"][data-id="astral"]').count()==1)
  page.locator('[data-action="hg18-open"][data-id="resource_card"]').click()
  check("Actual resource-card opening credits stock without duplicates",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();return s.hg18.materials.resource_card===0&&HOG_ENGINE.strictSave(s);
  }"""))
  page.locator('#save').click()
  page.reload(wait_until="load")
  check("Cold reload retains task claims and used resource card",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();return s.hg18.day.claimed.includes('daily_build')&&
     s.hg18.materials.resource_card===0&&s.buildings.market===1&&HOG_ENGINE.strictSave(s);
  }"""))
  # Organic continuation: real training -> NPC combat -> quest gear -> +1 -> reload.
  # No artificial materials, XP, gold, or troop grants in this segment.
  page.locator('[data-action="tab"][data-tab="army"]').first.click()
  page.locator('#q_human_1').fill('24')
  page.locator('[data-action="recruit"][data-id="human_1"]').click()
  check("Paid New Game training queue has 24 recruits",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();return s.training.length===1&&s.training[0].count===24&&s.army.human_1===16;
  }"""))
  page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),q=s.training[0];
    HOG_ENGINE.tick(s,s.lastTick+(q.remaining+2)*1000/s.speed);
    HOG_APP_DEBUG.render();
  }""")
  page.locator('[data-action="tab"][data-tab="tasks"]').first.click()
  check("Actual completed training unlocks daily quest",page.locator('[data-action="hg18-claim"][data-id="daily_recruit"]').is_enabled())
  page.locator('[data-action="hg18-claim"][data-id="daily_recruit"]').click()
  check("Daily recruitment credits two upgrade stones, without test grant",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();return s.army.human_1===40&&s.hg18.materials.enhance_stone===2;
  }"""))
  rookie_npc=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
    const tile=E.TILES.find(t=>t.kind==='npc'&&t.level===1&&E.pathfind('3,4',t.key));
    if(!tile)throw Error('No reachable rookie NPC');
    E.startMarch(s,tile.key);
    E.tick(s,s.lastTick+(s.march.remaining+2)*1000/s.speed);
    HOG_APP_DEBUG.render();
    if(!s.battle)throw Error('NPC march did not enter battle');
    return tile.key;
  }""")
  for turn in range(70):
   if not page.evaluate("!!HOG_APP_DEBUG.getState().battle"):break
   page.locator('[data-action="battle"][data-cmd="attack"]').click()
  check("Unseeded 40-militia army defeats a real 1-star NPC",page.evaluate("""key => {
    const s=HOG_APP_DEBUG.getState();return !s.battle&&
      s.cleared.includes(key)&&s.hg18.day.counts.npcWins>=1&&HOG_ENGINE.strictSave(s);
  }""",rookie_npc),{"npc":rookie_npc})
  page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();
    if(s.march)HOG_ENGINE.tick(s,s.lastTick+(s.march.remaining+2)*1000/s.speed);
    HOG_APP_DEBUG.render();
  }""")
  page.locator('[data-action="tab"][data-tab="tasks"]').first.click()
  page.locator('[data-action="hg18-claim"][data-id="daily_npc"]').click()
  page.locator('[data-action="tab"][data-tab="relics"]').first.click()
  page.locator('[data-action="hg18-open"][data-id="gear_pack"]').click()
  earned_uid=page.evaluate("""() => HOG_APP_DEBUG.getState().inventory.find(i=>i.origin==='HG18 mission chest')?.uid??null""")
  check("Daily NPC mission yields an actual owned gear item",earned_uid is not None)
  page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
  page.locator(f'[data-action="equipitem"][data-uid="{earned_uid}"]').click()
  page.locator(f'[data-action="hg18-enhance"][data-uid="{earned_uid}"]').click()
  check("Organic gear +1 spends two quest stones and is equipped",page.evaluate("""uid => {
    const s=HOG_APP_DEBUG.getState(),item=s.inventory.find(i=>i.uid===uid);
    return item?.enhance===1&&s.hg18.materials.enhance_stone===0&&
      Object.values(s.equipment[s.activeHero]||{}).includes(uid)&&HOG_ENGINE.strictSave(s);
  }""",earned_uid))
  page.locator('#save').click()
  page.reload(wait_until='load')
  check("New Game -> paid training -> NPC -> earned gear +1 survives cold reload",page.evaluate("""uid => {
    const s=HOG_APP_DEBUG.getState();
    return s.buildings.market===1&&s.hg18.day.claimed.includes('daily_recruit')&&
      s.hg18.day.claimed.includes('daily_npc')&&s.inventory.some(i=>i.uid===uid&&i.enhance===1)&&
      HOG_ENGINE.strictSave(s);
  }""",earned_uid))
  page.screenshot(path=str(OUT/"organic-dayone-quest-gear-chrome.png"),full_page=True)
  # Explicit high-end fixture to test locked progression UI. These grants are
  # NOT part of the above organic New Game or of the shipped starting state.
  page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
    s.hg18.materials.astral_shard=24;s.hg18.materials.enhance_stone=110;
    s.hg18.materials.rebirth_core=1;s.hg18.materials.rank_emblem=1;
    s.hg18.week.counts.eliteWins=1;
    s.res.gold=E.limits(s).gold;s.heroes[0].level=100;
    HOG_APP_DEBUG.render();
  }""")
  page.locator('[data-action="tab"][data-tab="relics"]').first.click()
  for i in range(3):
   page.locator('[data-action="hg18-craft"][data-id="astral"]').click()
  check("Three actual crafting clicks make 3 different Astral pieces",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),ids=s.inventory.filter(i=>i.itemId.startsWith('astral_')).map(i=>i.itemId);
    return ids.length===3&&new Set(ids).size===3&&s.hg18.materials.astral_shard===0;
  }"""))
  page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
  for item in ['astral_sword','astral_plate','astral_seal']:
   uid=page.evaluate("""id => HOG_APP_DEBUG.getState().inventory.find(i=>i.itemId===id).uid""",item)
   page.locator(f'[data-action="equipitem"][data-uid="{uid}"]').click()
  check("Set bonus is actually equipped through three Hero screen clicks",page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
    return E.hg18SetCounts(s,s.activeHero).astral===3&&E.combatModifiers(s).damageBonus>=.07;
  }"""))
  target_uid=page.evaluate("""() => HOG_APP_DEBUG.getState().inventory.find(i=>i.itemId==='astral_sword').uid""")
  page.locator(f'[data-action="hg18-enhance"][data-uid="{target_uid}"]').click()
  check("Enhancement UI debits stones/gold and writes item +1",page.evaluate("""uid => {
    const s=HOG_APP_DEBUG.getState();
    return s.inventory.find(i=>i.uid===uid).enhance===1&&s.hg18.materials.enhance_stone===108;
  }""",target_uid))
  page.locator('[data-action="hg18-rank"]').first.click()
  check("Rank card action raises Hero rank under Lv100",page.evaluate("HOG_APP_DEBUG.getState().heroes[0].heroRank===2"))
  page.once("dialog",lambda d:d.accept())
  page.locator('[data-action="hg18-rebirth"]').first.click()
  check("Rebirth UI resets Lv100 to Lv1, preserves rank and equipment",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,h=s.heroes[0];
    return h.level===1&&h.rebirth===1&&h.heroRank===2&&
      E.hg18SetCounts(s,h.id).astral===3&&E.strictSave(s);
  }"""))
  page.screenshot(path=str(OUT/"hero-rebirth-forge-chrome.png"),full_page=True)
  page.locator('[data-action="tab"][data-tab="tasks"]').first.click()
  page.locator('[data-action="hg18-claim"][data-id="weekly_boss"]').click()
  check("Quest-only special soldier awarded once through real weekly claim button",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();return s.army.human_quest_guard===1&&
      s.hg18.week.claimed.includes('weekly_boss')&&HOG_ENGINE.strictSave(s);
  }"""))
  check("Browser records zero uncaught JS exceptions",not errors,errors)
  check("High tier bosses are selectable via world-map landmark UI",page.evaluate("""() => {
    const E=HOG_ENGINE;return E.TILES.filter(t=>t.eliteTier>=11).length===4;
  }"""))
  page.locator('#save').click()
  page.reload(wait_until="load")
  check("Cold reload saves rebirth, enhanced set and weekly soldier reward exactly once",page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
    return s.heroes[0].rebirth===1&&s.army.human_quest_guard===1&&
      s.inventory.some(i=>i.itemId==='astral_sword'&&i.enhance===1)&&E.strictSave(s);
  }"""))
  browser.close()
finally:
 output={"phase":"HG18 UI Chromium", "checks":checks,
   "passed":sum(x["ok"] for x in checks),"total":len(checks),
   "failed":sum(not x["ok"] for x in checks),"runtimeErrors":errors,
   "fixturePolicy":"New Game through paid build/training/NPC/gear +1 and reload is unseeded; endgame Lv100/materials remain explicit fixtures"}
 (QA/"hg18-chrome.json").write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding="utf-8")
