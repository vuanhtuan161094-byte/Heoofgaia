from pathlib import Path
from playwright.sync_api import sync_playwright
import json,collections
p=Path(__file__).resolve().parents[1]
EVIDENCE=p/'qa'
s=p.joinpath('index.html').read_text(encoding='utf-8')
stub="<script>window.__P2_ENABLE_QA__=true;const __data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__data[k]??null,setItem:(k,v)=>__data[k]=String(v),removeItem:k=>delete __data[k]}});</script>"
s=s.replace('<script>',stub+'<script>',1)
profiles={'weak':{'levels':[1,3,6,10,15],'troops':[220,280,320,380,450],'tier':[1,1,1,1,2]},'normal':{'levels':[2,5,9,15,23],'troops':[300,370,470,620,730],'tier':[1,1,2,2,3]},'strong':{'levels':[3,7,13,22,32],'troops':[380,510,650,800,900],'tier':[1,1,2,3,4]}}
stages=[1,4,9,16,24]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),args=['--no-sandbox']);page=b.new_page();page.set_content(s,wait_until='domcontentloaded')
 original=page.evaluate('window.__P2_QA__.getGame()')
 out=[]
 for level,profile in profiles.items():
  for j,stage in enumerate(stages):
   for preset in page.evaluate('window.__P3_QA__.presets'):
    g=json.loads(json.dumps(original));g['cleared']=list(range(1,stage));g['grain']=100000;g['silver']=100000;g['iron']=100000
    if stage>=9:
     for h in ['zhao','huang']:
      g['roster'].append(h);g['hero'][h]={'level':1,'xp':0,'troops':0}
    for h in g['hero'].values():h['level']=profile['levels'][j];h['troops']=profile['troops'][j]
    g['p3TroopTier']={h:profile['tier'][j] for h in g['roster']}
    r=page.evaluate('''({g,id,stage})=>{__P2_QA__.closeBattle();__P2_QA__.setGame(g);__P3_QA__.assign(id);__P2_QA__.beginBattle(stage);const b=__P2_QA__.debugBattle();if(!b)return {error:'not opened'};b.seed=7777+stage;__P2_QA__.skipBattle();const done=__P2_QA__.getBattle();return {win:done.won,turns:done.turns,remaining:done.p.reduce((s,u)=>s+u.hp,0)};}''',{'g':g,'id':preset['id'],'stage':stage})
    out.append(dict(profile=level,stage=stage,preset=preset['id'],**r))
  print('Completed',level,flush=True)
 b.close()
summary=[]
for profile in profiles:
 for stage in stages:
  xs=[x for x in out if x['profile']==profile and x['stage']==stage];v={'profile':profile,'stage':stage,'wins':sum(x.get('win',False) for x in xs),'trials':len(xs),'mean_turns':round(sum(x.get('turns',0) for x in xs)/len(xs),1)};summary.append(v)
print(json.dumps(summary,ensure_ascii=False,indent=2));EVIDENCE.joinpath('balance-probe.json').write_text(json.dumps({'summary':summary,'samples':out},ensure_ascii=False,indent=2))

# Fixed-seed deterministic regression bands, not claims about live-player win rates.
by={(r['profile'],r['stage']):r['wins'] for r in summary}
assert all(by['weak',stage]<=by['normal',stage]<=by['strong',stage] for stage in stages), 'power progression inversion'
assert 5<=by['normal',16]<=20, 'midgame stage-16 tuning drift'
assert 4<=by['normal',24]<=20, 'endgame stage-24 tuning drift'
print('P3 BALANCE CONTRACT PASS: fixed profiles monotone and mid/end difficulty in modeled bands')
