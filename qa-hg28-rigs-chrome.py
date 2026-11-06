"""HG28 T9-T10 modular rig browser gate (NOT five independent action-frame clips).
Source masters and screenshot pixels are real offline game art. No v07 mutation.
"""
from pathlib import Path
import json,base64,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs/evidence/hg28/rigs"
QA=ROOT/"docs/qa/hg28-rigs-chrome.json"
OUT.mkdir(parents=True,exist_ok=True);QA.parent.mkdir(parents=True,exist_ok=True)
ids=[f"{race}_{tier}" for race in ("human","elf","orc","undead") for tier in (9,10)]
checks=[];errors=[]
def check(name,value,detail=None):
 checks.append({"name":name,"pass":bool(value),"detail":detail})
 print(("PASS " if value else "FAIL ")+name,flush=True)
 if not value:raise AssertionError(f"{name}: {detail}")
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
 page=browser.new_page(viewport={"width":1280,"height":720})
 page.on("pageerror",lambda err:errors.append(str(err)))
 page.goto(HTML.as_uri(),wait_until="load")
 page.locator('[data-action="start"]').click()
 page.wait_for_function("()=>['human_9','elf_9','orc_9','undead_9'].every(id=>document.getElementById('hg28-troop-'+id)?.complete)",timeout=10000)
 result=page.evaluate("""()=>{
  const ids=['human_9','human_10','elf_9','elf_10','orc_9','orc_10','undead_9','undead_10'],
  acts=['idle','walk','attack','hit','death'],
  R=HOG_HG28_RIGS,E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
  strictBefore=E.strictSave(s),
  // HG08 serializer includes volatile exportedAt; compare the canonical v07
  // state payload, not the timestamp of the export envelope.
  saveBefore=JSON.stringify(JSON.parse(E.serializeSave(s)).state),
  montage=document.createElement('canvas');montage.width=1280;montage.height=960;
  const ctx=montage.getContext('2d'),real=[],frames=[],bad=[];
  ctx.fillStyle='#142733';ctx.fillRect(0,0,1280,960);
  for(let r=0;r<ids.length;r++){
   const id=ids[r],img=document.getElementById('hg28-troop-'+id);
   if(!img?.complete||img.naturalWidth!==512)bad.push(id+':src');
   for(let a=0;a<acts.length;a++){
    const action=acts[a],times=[140,330,570,760],sample=[];
    for(const t of times){
     const temp=document.createElement('canvas');temp.width=180;temp.height=180;
     const p=temp.getContext('2d');
     const good=R.draw(p,90,166,id,false,{action,time:t,duration:900,alpha:1},1.15);
     if(!good)bad.push(id+':'+action);
     sample.push(temp.toDataURL('image/png'));
    }
    const distinct=new Set(sample).size;
    if(distinct<3)bad.push(id+':'+action+':insufficient poses '+distinct);
    frames.push({id,action,distinct});
    const mini=document.createElement('canvas');mini.width=155;mini.height=185;
    const m=mini.getContext('2d');
    m.fillStyle='#192e39';m.fillRect(0,0,155,185);
    R.draw(m,77,160,id,false,{action,time:440,duration:900,alpha:1},1);
    ctx.drawImage(mini,r*160, a*192+2);
    ctx.font='11px sans-serif';ctx.fillStyle='#e8dbc2';ctx.fillText(id+' '+action,r*160+5,a*192+187);
   }
  }
  document.body.appendChild(montage);montage.id='hg28-rig-contact';
  return {ids:R.ids(),cases:frames.length,frames,bad,strictBefore,
    strictAfter:E.strictSave(s),saveUnchanged:saveBefore===JSON.stringify(JSON.parse(E.serializeSave(s)).state)};
 }""")
 check("All eight original T9/T10 masters retain image identity",result["ids"]==ids and not any(':src' in x for x in result["bad"]),result["bad"])
 check("40 individual real browser action render cases",result["cases"]==40,result["cases"])
 check("Independent component articulation yields differing visible poses",not result["bad"],result["bad"])
 check("40 draws are presentation-only; canonical Save v07 payload unchanged",result["strictBefore"] and result["strictAfter"] and result["saveUnchanged"],{k:result.get(k) for k in ("strictBefore","strictAfter","saveUnchanged")})
 page.locator('#hg28-rig-contact').screenshot(path=str(OUT/'rig-8-units-5-actions-Chromium.png'))
 # Open an actual engine-backed battle at both landscape sizes. The only
 # setup fixture assigns a T9 warrior to inspect art, not XP, drops or wins.
 fixture=page.evaluate("""()=>{
  const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
  // Art fixture must respect the REAL hero command-capacity formula.
  // Five T9 warriors cannot be assigned to a level-1 commander.
  const formation=[{unitId:'human_9',count:5}],
        required=E.formationPoints(s,formation),
        level=Array.from({length:100},(_,i)=>i+1).find(v=>E.heroLimit(v)>=required);
  if(!level)throw new Error('No legal commander level for five T9 units');
  s.heroes[0].level=level;
  s.army.human_9=5;E.setFormation(s,formation);
  const npc=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind(E.activeCity(s).key,n.key));
  E.startMarch(s,npc.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
  HOG_APP_DEBUG.render();
  return {valid:E.strictSave(s),battle:!!s.battle&&s.battle.allies.some(u=>u.unitId==='human_9'),
          legalLevel:level,commandPoints:required,commandLimit:E.heroLimit(level)};
 }""")
 check("Actual NPC battle paints articulated high-tier troop",fixture["valid"] and fixture["battle"],fixture)
 page.screenshot(path=str(OUT/'angel-rig-real-battle-1280x720.png'),full_page=False)
 page.set_viewport_size({"width":960,"height":540})
 page.evaluate("window.dispatchEvent(new Event('resize'))")
 page.wait_for_timeout(220)
 compact=page.evaluate("""()=>{
 const s=HOG_APP_DEBUG.getState(),c=document.getElementById('battle-canvas'),P=HOG_PAINTER,E=HOG_ENGINE;
 const rect=c.getBoundingClientRect(),cam=P.battleProjection(c,E);
 return {valid:E.strictSave(s),cells:P.battleGridCells(cam).length,
    canvasAspectErr:Math.abs(c.width/rect.width-c.height/rect.height),
    hit:P.battleHit(c,cam.point(s.battle.allies[0].x+.5,s.battle.allies[0].y+.5).x,
        cam.point(s.battle.allies[0].x+.5,s.battle.allies[0].y+.5).y,E,s)?.id===s.battle.allies[0].id};
 }""")
 check("960×540 source animation preserves real battle hit testing",compact["valid"] and compact["cells"]==108 and compact["canvasAspectErr"]<.008 and compact["hit"],compact)
 page.screenshot(path=str(OUT/'angel-rig-real-battle-960x540.png'),full_page=False)
 check("No uncaught browser JavaScript exceptions",not errors,errors)
 browser.close()
receipt={"status":"PASS","checks":checks,"sourceType":"master-derived individually articulated part masks, NOT real five source action clips","cases":result["frames"],
 "artifacts":[str(p.relative_to(ROOT)) for p in OUT.glob('*.png')],"errors":errors,
 "htmlSha256":hashlib.sha256(HTML.read_bytes()).hexdigest()}
QA.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(f"HG28 RIG Chromium {len(checks)}/{len(checks)} PASS",flush=True)
