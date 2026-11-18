#!/usr/bin/env python3
"""Group 07: real Chromium campaign status integration, Save and replay safety.
Run after the canonical single-file HTML generator; not a synthetic DOM mock.
"""
from pathlib import Path
import json
import subprocess
import sys
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SAVE_KEY="muu_dinh_tam_quoc_v1"
STUB="<script>window.__P2_ENABLE_QA__=true;</script>"
checks=[]
errors=[]

def check(label,ok):
    checks.append({"name":label,"pass":bool(ok)})
    print(("PASS" if ok else "FAIL")+" "+label,flush=True)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    page=browser.new_page(viewport={"width":1280,"height":720},device_scale_factor=1)
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.set_content(HTML.replace("<script>",STUB+"<script>",1),wait_until="domcontentloaded")
    check("single canonical Chromium UI is playable",page.locator("[data-nl-command]").count()==1)
    check("approved original engine is wired before bootstrap",page.evaluate(
        "typeof window.NLCombatEffectsV1==='object' && typeof window.NLCombatEffectBridgeV1==='object' && !!window.__P2_QA__?.nlEffectBridge"
    ))
    check("six existing statuses are segregated, seven additive statuses available",page.evaluate("""() => {
      const x=window.__P2_QA__.nlEffectBridge;
      return x.legacyIds.length===6&&x.additionalIds.length===7&&x.legacyDifferences.length===4;
    }"""))
    page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
    data=page.evaluate("""() => {
      const q=window.__P2_QA__,b=q.debugBattle();
      const a={id:'test-attacker',team:'p',slot:2,troop:'infantry',type:'infantry',
        atk:240,catk:240,matk:240,crit:0,hp:1200,maxHp:1200,morale:50,effects:[]};
      const t={id:'test-target',team:'e',slot:2,troop:'spear',type:'spear',
        hp:3000,maxHp:3000,def:25,tdef:25,mdef:25,morale:40,alive:true,effects:[]};
      b.seed=181118;const baseline=q.p2Hit(a,t,'physical').amount;
      const focus=q.p2Status(a,'focus',2);
      b.seed=181118;const focused=q.p2Hit(a,t,'physical').amount;
      const initialFocus=a.effects.find(x=>x.kind==='focus');
      for(let i=0;i<4;i++)q.p2Status(a,'focus',2);
      const stacks=a.effects.find(x=>x.kind==='focus')?.stacks;
      const before=structuredClone(a.effects);
      q.p2Status(t,'ironwall',2);
      const hpBeforeShield=t.hp;
      b.seed=181118;const blocked=q.p2Hit(a,t,'physical');
      const hpAfterShield=t.hp;
      b.seed=181118;const next=q.p2Hit(a,t,'physical');
      q.p2Status(t,'sleep',1);
      const sleepAfter=q.nlEffectBridge.startAction(t);
      const actor=b.p.find(u=>u.hp>0);
      q.p2Status(actor,'sleep',1);
      const eventsBeforeSkip=b.events.length,actionsBefore=actor.actions;
      q.perform(actor);
      const skip=b.events.at(-1);
      const skipResult={mode:skip?.mode,eventsBeforeSkip,eventsAfterSkip:b.events.length,
        turnsAfter:b.turns,actionsBefore,actionsAfter:actor.actions,
        savedStateHasControl:skip?.state?.p?.some(u=>u.id===actor.id&&u.effects.some(e=>e.kind==='sleep')),
        nlEffects:skip?.nlEffects};
      q.p2Status(t,'anchored',2);
      const anchored=q.p2Cleanse(t,'all',8);
      const anchoredLeft=t.effects.some(x=>x.kind==='anchored');
      const all=q.nlEffectBridge.additionalIds;
      return {baseline,focused,focus,initialFocus,stacks,before,
        blocked,next,hpBeforeShield,hpAfterShield,skipResult,
        sleepAfter,anchored,anchoredLeft,all,liveTurn:b.round,
        gameVersion:q.getGame().version};
    }""")
    check("focus applied to a real live campaign unit",data["focus"] and data["initialFocus"]["nlEffectV1"] and data["initialFocus"]["turns"]==2)
    check("same-seed live hit grows under focus",data["focused"]>data["baseline"]>0)
    check("focus caps at three stacks",data["stacks"]==3)
    check("ironwall blocks first real P2 hit, not the next",data["blocked"]["amount"]==0 and data["blocked"].get("nlEffectBlock")=="ironwall" and data["next"]["amount"]>0 and data["hpBeforeShield"]==data["hpAfterShield"])
    check("sleep control is deterministic in original engine",not data["sleepAfter"]["canAct"])
    check("sleep skip advances a real turn and records an immutable replay event",
          data["skipResult"]["mode"]=="stunned" and
          data["skipResult"]["eventsAfterSkip"]==data["skipResult"]["eventsBeforeSkip"]+1 and
          data["skipResult"]["actionsAfter"]==data["skipResult"]["actionsBefore"]+1 and
          isinstance(data["skipResult"]["nlEffects"],list))
    check("unremovable anchored survives live cleansing",data["anchoredLeft"])
    check("Save schema remains v5",data["gameVersion"]==5)
    parity=page.evaluate("""() => {
      const q=window.__P2_QA__,b=q.debugBattle(),u=b.p[0];
      const oldStatus=q.status(u,'burn',2);
      const old=u.effects.find(x=>x.kind==='burn');
      const before=JSON.stringify(old);
      q.p2Status(u,'focus',2);
      q.p2Cleanse(u,'beneficial',1);
      const after=JSON.stringify(u.effects.find(x=>x.kind==='burn'));
      const v1=q.nlEffectBridge.legacyDifferences;
      const pre=q.getGame(),logBefore=b.events.length;
      q.perform(b.p.find(x=>x.hp>0));
      const logAfter=b.events.length,entry=b.events.at(-1);
      const save=q.getGame(),recorded=structuredClone({stage:b.stage,mode:b.mode,
        opening:b.opening,events:b.events});
      const exactFrame=recorded.events.at(-1)?.state;
      q.closeBattle('city');
      const beforeReplay=q.getGame();
      q.p2OpenReplay(recorded);
      q.p2LoadReplayFrame(recorded.events.length);
      const replay=q.debugBattle();
      const replayMatch=replay?.replay===true &&
        replay.replayIndex===recorded.events.length &&
        JSON.stringify({p:replay.p,e:replay.e})===JSON.stringify(exactFrame);
      const afterReplay=q.getGame();
      const noRepay=['silver','grain','iron','prestige','gems'].every(key=>
        beforeReplay[key]===afterReplay[key]);
      q.closeBattle('city');
      return {unchanged:before===after,oldStatus,logBefore,logAfter,
        event:entry&&{mode:entry.mode,actorTeam:entry.actorTeam},
        savedGame:save,pre,afterClose:q.getGame(),diffs:v1,
        replayMatch,noRepay};
    }""")
    check("legacy burn coefficients and state were not rewritten",parity["unchanged"])
    check("battle produces an actual replay event",parity["logAfter"]>parity["logBefore"] and parity["event"] is not None)
    check("immutable replay restores exact final combat snapshot",parity["replayMatch"])
    check("replay does not settle resources or issue a second payment",parity["noRepay"])
    check("turn activity does not invent Save receipts or overwrite campaign data",
          parity["pre"]["version"]==parity["afterClose"]["version"]==5 and
          parity["pre"]["cleared"]==parity["afterClose"]["cleared"])
    page.screenshot(path=str(ROOT/"qa/nl-group07-effects-desktop.png"),full_page=False)
    browser.close()

sha=subprocess.run(["git","rev-parse","HEAD"],cwd=ROOT,text=True,capture_output=True).stdout.strip()
report={"sha":sha,"checks":checks,"errors":errors,"status":"PASS" if all(x["pass"] for x in checks) and not errors else "FAIL"}
(ROOT/"qa/nl_group07_effects_v1_report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
if errors: print("BROWSER ERRORS:",errors,file=sys.stderr)
print("GROUP07",sum(x["pass"] for x in checks),"/",len(checks),report["status"])
sys.exit(0 if report["status"]=="PASS" else 1)
