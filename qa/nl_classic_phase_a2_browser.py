#!/usr/bin/env python3
"""Classic WEB Phase A2 release gate against the actual compiled single-file HTML.

No automated test rewrites Save values unless using the game's own QA state bridge.
All sources/coefficients remain PROJECT SIMULATED, never VNG Wiki-verified.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright


def check(ok: object, message: str) -> None:
    if not ok:
        raise AssertionError(message)
    print("PASS " + message, flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--html', default='index.html')
    args=parser.parse_args()
    uri=Path(args.html).resolve().as_uri()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1280,'height':720})
        context.add_init_script('window.__P2_ENABLE_QA__=true;')
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(uri,wait_until='domcontentloaded')
        page.wait_for_timeout(300)
        version=page.evaluate('window.__NL_CLASSIC_A2_QA__?.version')
        check(version==1,'Phase A2 module runs in final HTML')
        catalog=page.evaluate('window.__NL_CLASSIC_A2_QA__.cityCatalogue()')
        check(len(catalog['buildings'])==31 and len(catalog['legacy'])==7, '31 project and 7 legacy buildings preserved')
        check(catalog['buildings'][0]['id']=='nl_city_hall', 'main city entry is Thành Chính')
        check(all('iron' not in b.get('baseCost', {}) for b in catalog['buildings']),
              'all 31 project building costs use the core Bạc/Lương economy')
        check(all('iron' not in (o.get('cost') or {}) for b in catalog['buildings'] for o in b.get('actions',[])),
              'all project city-operation costs avoid hidden legacy iron')
        for building in catalog['buildings']:
            check(all(isinstance(v,int) and v>=0 for v in building['baseCost'].values()),
                  'valid project cost for '+building['id'])
        original=page.evaluate('window.__P2_QA__.getGame()')
        initial_iron=original['iron']
        cost=page.evaluate('window.__NL_CLASSIC_A2_QA__.legacyCost("palace")')
        check(set(cost)=={'silver','grain'} and cost['silver']>0, 'all 7 legacy buildings use Bạc and Lương fees')
        page.evaluate('''() => {let g=window.__P2_QA__.getGame();g.silver=150000;g.grain=100000;g.iron=2222;window.__P2_QA__.setGame(g);}''')
        before=page.evaluate('window.__P2_QA__.getGame()')
        page.evaluate('window.__NL_CLASSIC_A2_QA__.upgrade("palace")')
        after=page.evaluate('window.__P2_QA__.getGame()')
        check(after['buildings']['palace']==before['buildings']['palace']+1, 'Thành Chính level upgraded')
        check(before['silver']-after['silver']==cost['silver'] and before['grain']-after['grain']==cost['grain'],
              'building debit uses same UI cost, once only')
        check(after['iron']==2222, 'legacy iron stays untouched on classic upgrade')
        # Mine has the classic silver name but must NOT produce invisible iron.
        page.evaluate('''() => {let g=window.__P2_QA__.getGame();g.lastTick=Date.now()-12000;window.__P2_QA__.setGame(g);}''')
        t0=page.evaluate('window.__P2_QA__.getGame()')
        page.evaluate('window.__NL_CLASSIC_A2_QA__.tick()')
        t1=page.evaluate('window.__P2_QA__.getGame()')
        check(t1['iron']==t0['iron'] and t1['silver']>t0['silver'],
              'Mỏ Bạc adds silver via native timer, no invisible iron creation')
        check(page.evaluate('window.__P2_QA__.getGame().version')==5, 'Save v5 schema unchanged')
        # Do not conflate source records: all 207 are ORIGINAL PROJECT/SIMULATED.
        hero_info=page.evaluate('''() => {
           let arr=window.__NL_CLASSIC_A2_QA__.heroes();
           return {count:arr.length,ids:new Set(arr.map(h=>h.id)).size,
             story:arr.find(h=>h.route.method==='story'),
             renown:arr.find(h=>h.route.method==='renown'),
             tavern:arr.find(h=>h.route.method==='tavern')};
        }''')
        check(hero_info['count']==207 and hero_info['ids']==207, '207 project hero identities retained exactly')
        check(all(hero_info.get(x) for x in ['story','renown','tavern']),
              'all three project recruit routes represented')
        # Setup one stage-1 unlock for the same authoritative stage/save owner.
        story=hero_info['story']
        page.evaluate('''() => {let g=window.__P2_QA__.getGame();g.silver=300000;g.prestige=800;g.cleared=Array.from({length:28},(_,i)=>i+1);g.buildings.tavern=1;window.__P2_QA__.setGame(g);}''')
        page.locator('.nav[data-tab="heroes"]').click()
        page.wait_for_timeout(180)
        check(page.locator('[data-nl-hero207]').count()==1 and page.locator('[data-nl207-select]').count()==1,
              'all 207 use one unified Heroes panel with existing equipment bridge selectors')
        check(page.locator('[data-nla2-route]').count()==4, 'search/filter routes are visible in Heroes UI')
        # Hero207 is a semantic secondary window in the fixed-window shell.
        # Switch to the actual visible window before selecting an option.
        found=False
        for index in range(page.locator('#nl-screen-select option').count()):
            page.locator('#nl-screen-select').select_option(str(index))
            if page.locator('[data-nl207-select]').is_visible():
                found=True
                break
        check(found,'207 recruitment selector is reachable through visible window controls')
        page.locator('[data-nl207-select]').select_option(story['id'])
        old=page.evaluate('window.__P2_QA__.getGame()')
        price=page.evaluate('(id)=>window.__NL_HERO207_QA__.getUnlock(id).silverCost',story['id'])
        page.locator('[data-nl207-recruit]').click()
        new=page.evaluate('window.__P2_QA__.getGame()')
        check(story['id'] in new['roster'] and story['id'] in new['hero'], 'named story hero registers through original authoritative owner')
        check(old['silver']-new['silver']==price,'207 story hero charges exactly its preexisting project cost')
        check(page.evaluate('(id)=>window.__NL_CLASSIC_A2_QA__.recruit(id)', story['id']) is False,
              'recruit receipt blocks repeat project hero transaction')
        check(page.evaluate('window.__P2_QA__.getGame().silver')==new['silver'], 'duplicate hero does not debit silver twice')
        # The renown route requires BOTH the original stage and the new prestige gate.
        renown=hero_info['renown']
        page.evaluate('''() => {let g=window.__P2_QA__.getGame();g.prestige=0;window.__P2_QA__.setGame(g);}''')
        check(not page.evaluate('(id)=>window.__NL_CLASSIC_A2_QA__.canRecruit(id)',renown['id']),
              '207 renown-gated general cannot bypass prestige')
        page.evaluate('''() => {let g=window.__P2_QA__.getGame();g.prestige=1000;window.__P2_QA__.setGame(g);}''')
        check(page.evaluate('(id)=>window.__NL_CLASSIC_A2_QA__.recruit(id)',renown['id']),
              '207 renown-gated general can join once both conditions hold')
        # Tavern consumes the shared existing talk counter, not separate free quota.
        tavern=hero_info['tavern']
        talk_before=page.evaluate('window.__NL_CLASSIC_A_QA__.snapshot().talkUsed')
        check(page.evaluate('(id)=>window.__NL_CLASSIC_A2_QA__.recruit(id)', tavern['id']),
              '207 tavern recruit uses real Hero207 grant path')
        talk_after=page.evaluate('window.__NL_CLASSIC_A_QA__.snapshot().talkUsed')
        check(talk_after==talk_before+1,'207 tavern recruit consumes exactly one shared Hội đàm attempt')
        receipts=page.evaluate('window.__NL_CLASSIC_A_QA__.snapshot().recruitReceipts')
        check(all(any(r['id']==hero_info[route]['id'] for r in receipts) for route in ['story','renown','tavern']),
              'three route receipts use same Save v5 ledger')
        save=page.evaluate('localStorage.getItem("muu_dinh_tam_quoc_v1")')
        check(save is not None and json.loads(save)['version']==5, 'persisted Save schema v5 with all owned 207 recruits')
        page.reload(wait_until='domcontentloaded')
        page.wait_for_timeout(100)
        restored=page.evaluate('window.__P2_QA__.getGame()')
        check(all(hero_info[x]['id'] in restored['roster'] for x in ['story','renown','tavern']),
              'reload preserves three project-recruitment routes and hero IDs')
        check(restored['iron']==2222 and restored['version']==5, 'reload preserves historical iron without wiping Save data')
        check(not errors,'Chromium has zero uncaught JavaScript errors: '+repr(errors))
        context.close()
        browser.close()
    print('NL_CLASSIC_A2_QA PASS')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
