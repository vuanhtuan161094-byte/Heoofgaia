"""Focused visual layer contract, no simulated gameplay assertions."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch()
    for width,height in [(1280,720),(390,844)]:
        page=browser.new_page(viewport={"width":width,"height":height})
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.add_init_script("window.__P2_ENABLE_QA__=true")
        page.goto((root/"index.html").as_uri(),wait_until="domcontentloaded")
        page.wait_for_function("Boolean(window.__NL_ART_D_QA__)")
        result=page.evaluate("""() => {
          const q=window.__NL_ART_D_QA__;
          const a=q.portrait('test-a'), b=q.portrait('test-b');
          return {heroes:q.count(),icons:q.icons.length,distinct:a!==b,
            offline:a.startsWith('data:image/svg+xml'),nav:document.querySelectorAll('.nav .nl-art-d-img').length,
            city:document.querySelectorAll('.building .nl-art-d-img').length,
            save:window.__P2_QA__.getGame().version};
        }""")
        assert result["heroes"]>=368 and result["icons"]>=14 and result["distinct"] and result["offline"],result
        assert result["nav"]>=14 and result["city"]>0 and result["save"]==5,result
        page.locator('.nav[data-tab="heroes"]').click()
        page.wait_for_function("document.querySelectorAll('[data-nla-hero] .nl-art-d-img').length>0")
        page.locator('.nav[data-tab="barracks"]').click()
        page.wait_for_function("document.querySelectorAll('.nlw-unit .nl-art-d-img').length>0")
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+2")
        assert not errors,errors
        print("NL_ART_D PASS",width,result)
        page.close()
    browser.close()
