"""HG14 Batch 1: real file:// Chromium sprite motion acceptance for four factions."""
from pathlib import Path
import hashlib, json, sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout,"reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
SHOT=ROOT/"docs"/"evidence"/"hg14"
REPORT=ROOT/"docs"/"qa"/"hg14"
SHOT.mkdir(parents=True,exist_ok=True)
REPORT.mkdir(parents=True,exist_ok=True)
checks=[]
screenshots=[]
errors=[]
def check(message,ok):
    valid=bool(ok)
    checks.append({"name":message,"passed":valid})
    print(("PASS " if valid else "FAIL ")+message,flush=True)

fixtures=[
    ("human","human_3","unit-human-archer"),
    ("elf","elf_1","unit-elf-centaur"),
    ("orc","orc_1","unit-orc-imp"),
    ("undead","undead_1","unit-undead-skeleton"),
    ("elf","elf_2","unit-elf-scout"),
]

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
    for race,unit_id,image_id in fixtures:
        page=browser.new_page(viewport={"width":1280,"height":720})
        page.set_default_timeout(12000)
        page.on("pageerror",lambda error:errors.append(str(error)))
        page.goto(HTML.as_uri(),wait_until="load")
        page.locator(f'[data-action="race"][data-race="{race}"]').click()
        page.locator('[data-action="start"]').click()
        fixture=page.evaluate("""({unitId,imageId}) => {
            const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState();
            const img=document.getElementById(imageId),src=P.MOTION_SPRITES[unitId];
            const fresh={race:s.race,loaded:!!img?.complete&&img.naturalWidth===512&&img.naturalHeight===512,
                inline:!!img?.src.startsWith('data:image/png;base64,'),registered:src?.id===imageId};
            s.army[unitId]=16;E.setFormation(s,[{unitId,count:16}]);
            const target=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind(E.activeCity(s).key,n.key));
            E.startMarch(s,target.key);
            E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
            HOG_APP_DEBUG.render();
            return {...fresh,unit:E.getUnit(s,unitId).name,
                    battle:!!s.battle,selected:s.battle?.allies.some(u=>u.unitId===unitId),
                    saveValid:E.strictSave(s),animated:P.hasAnimatedTroops(s.battle)};
        }""",{"unitId":unit_id,"imageId":image_id})
        check(f"{race}/{unit_id} loads correct real 512px embedded PNG",fixture["loaded"] and fixture["inline"] and fixture["registered"])
        check(f"{race}/{unit_id} real march reaches illustrated battle",fixture["race"]==race and fixture["battle"] and fixture["selected"])
        check(f"{race}/{unit_id} animated battle keeps strict v07 save",fixture["saveValid"] and fixture["animated"])
        painted=page.evaluate("""({unitId,imageId})=>{
            const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState();
            const canvas=document.getElementById('battle-canvas'),context=canvas.getContext('2d');
            const original=context.drawImage,seen=[];
            context.drawImage=function(image,...args){if(image?.id)seen.push(image.id);return original.call(this,image,...args)};
            const stateBefore=E.serializeSave(s);
            try{
                P.drawBattle(canvas,E,s,performance.now()+60);
                const start=canvas.toDataURL('image/png');
                P.drawBattle(canvas,E,s,performance.now()+360);
                const end=canvas.toDataURL('image/png');
                return {spriteDraws:seen.filter(x=>x===imageId).length,
                        changed:start!==end,
                        stable:E.serializeSave(s)===stateBefore,
                        pose:P.motionPose('attack',320,650),
                        hit:P.motionPose('hit',90,650),
                        death:P.motionPose('death',900,1200)};
            }finally{context.drawImage=original}
        }""",{"unitId":unit_id,"imageId":image_id})
        check(f"{race}/{unit_id} actual sprite is drawn on canvas",painted["spriteDraws"]>=2)
        check(f"{race}/{unit_id} idle is animated without mutating gameplay",painted["changed"] and painted["stable"])
        check(f"{race}/{unit_id} attack/hit/death are visibly distinct",painted["pose"]["dx"]>0 and painted["hit"]["flash"]>0 and painted["death"]["angle"]<-.8)
        saved=page.evaluate("""() => {
            const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
            let out=E.battleAct(s,'attack'),actions=s.battle?.lastEvents||[];
            const actual=actions.some(e=>e.actorId===s.battle?.allies[0].id);
            HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
            return {action:out.type,actual,saved:!!localStorage.getItem(E.SAVE_KEY)};
        }""")
        check(f"{race}/{unit_id} combat action writes actual v07 save",saved["saved"] and saved["action"] in ("continue","win","lose","timeout","retreat"))
        capture=SHOT/f"battle-{race}-{unit_id}-chrome.png"
        page.screenshot(path=str(capture),full_page=False)
        screenshots.append(str(capture.relative_to(ROOT)))
        page.reload(wait_until="load")
        check(f"{race}/{unit_id} cold reload preserves playable battle",page.evaluate("!!HOG_APP_DEBUG.getState()?.battle"))
        if race=="undead":
            page.set_viewport_size({"width":960,"height":540})
            check("Undead battle keeps canvas proportional at mobile landscape",
                  page.evaluate("""() => {const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect();
                    return r.width>=window.innerWidth*.9&&Math.abs(c.width/r.width-c.height/r.height)<.008&&document.documentElement.scrollWidth<=window.innerWidth+1}"""))
            mobile=SHOT/"battle-undead-landscape-chrome.png"
            page.screenshot(path=str(mobile),full_page=False)
            screenshots.append(str(mobile.relative_to(ROOT)))
        page.close()
    check("No Chromium JavaScript errors in five real battles",len(errors)==0)
    browser.close()

result={"status":"PASS" if all(c["passed"] for c in checks) else "FAIL",
        "passed":sum(c["passed"] for c in checks),"total":len(checks),"checks":checks,
        "htmlSha256":hashlib.sha256(HTML.read_bytes()).hexdigest().upper(),
        "screenshots":screenshots,"errors":errors,
        "source":"existing HG11 PNG sprite masters; five action transforms are procedural, not individually drawn frames"}
(REPORT/"batch01-chrome.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print(f"HG14 Batch 01 Chromium {result['passed']}/{result['total']} PASS",flush=True)
raise SystemExit(0 if result["status"]=="PASS" else 1)
