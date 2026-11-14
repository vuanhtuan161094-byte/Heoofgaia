"""HG90 real HTML Chromium checks: secondary city, god receipt, divine relic,
real myth soldiers, city switch/isolation, daily Tower reset and Save v07.
All seeded resources/cities are QA fixtures, never gameplay freebies.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,hashlib,atexit
ROOT=Path(__file__).resolve().parent; HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/evidence/hg90';OUT.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'docs/qa/hg90/real-ui.json';REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];shots=[];errors=[]
def test(label,value,detail=None):
 checks.append({'name':label,'pass':bool(value)})
 print(('HG90 UI PASS ' if value else 'HG90 UI FAIL ')+label+' '+str(detail or '')[:190],flush=True)
 if not value:raise AssertionError(label+' '+str(detail))
def capture(p,label):
 file=OUT/(label+'.png');p.screenshot(path=str(file),animations='disabled')
 shots.append({'file':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
@atexit.register
def report():
 REPORT.write_text(json.dumps({'passed':sum(t['pass'] for t in checks),'total':len(checks),
  'errors':errors,'screenshots':shots},indent=2,ensure_ascii=False),encoding='utf8')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for label,size in [('pc',{'width':1280,'height':720}),('mobile',{'width':960,'height':540})]:
  for race in ['human','elf','orc','undead']:
   p=browser.new_page(viewport=size);p.set_default_timeout(22000)
   p.on('pageerror',lambda e,la=label,ra=race:errors.append(la+ra+': '+str(e)))
   p.on('dialog',lambda dialog:dialog.accept())
   p.goto(HTML.as_uri(),wait_until='load',timeout=180000)
   if race!='human':p.locator('[data-action="race"][data-race="'+race+'"]').click()
   p.locator('[data-action="start"]').click()
   t=p.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
    s.fame=1000000;
    const c=JSON.parse(JSON.stringify(E.make('elf',s.lastTick).cities[0]));
    c.id='qa-elf-city';c.name='Thành phụ Tinh Linh';c.key='9,10';c.main=false;
    s.cities.push(c);if(s.aiCities?.[c.key])delete s.aiCities[c.key];
    HOG_APP_DEBUG.render();
    return {valid:E.strictSave(s),cityCount:s.cities.length};
   }""")
   test(label+' '+race+' secondary city seeded and v07 valid',t['valid'] and t['cityCount']==2,t)
   p.locator('[data-action="tab"][data-tab="city"]').first.click()
   p.locator('[data-action="city-switch"][data-id="qa-elf-city"]').first.click()
   p.evaluate("""() => {
     const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
     s.hg18.materials.resource_chest=160;s.hg90.shards=120;s.res.gold=E.limits(s).gold;
     HOG_APP_DEBUG.render();
   }""")
   p.locator('[data-action="tab"][data-tab="relics"]').first.click()
   forge=p.evaluate("""() => ({
     sixGods:document.querySelectorAll('.hg89-deity').length,
     mythTroop:!!document.querySelector('[data-action="hg90-summon-troops"]:not(:disabled)'),
     bonds:document.querySelectorAll('.hg90-bond').length,
     relics:document.querySelectorAll('.hg90-relic-list article').length,
     city:HOG_APP_DEBUG.getState().activeCityId
   })""")
   test(label+' '+race+' six gods six relics four synergy combos and mythic unit UI',
    forge['sixGods']==6 and forge['mythTroop'] and forge['bonds']==4 and
    forge['relics']==6 and forge['city']=='qa-elf-city',forge)
   capture(p,label+'-'+race+'-hg90-forge')
   p.locator('[data-action="hg89-awaken"][data-id="yang_jian"]').click()
   awaken=p.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.mythicId==='yang_jian');
      return {id:h?.id,city:h?.cityId,race:h?.race,selected:s.activeHero,
       owner:h?.name,frags:s.hg18.materials.resource_chest,
       valid:HOG_ENGINE.strictSave(s)};
   }""")
   test(label+' '+race+' Yang Jian enters local city and becomes REAL commander',
    awaken['id']==2 and awaken['city']=='qa-elf-city' and awaken['race']=='elf' and
    awaken['selected']==2 and awaken['frags']==60 and awaken['valid'],awaken)
   p.locator('[data-action="tab"][data-tab="relics"]').first.click()
   p.locator('[data-action="hg90-forge"][data-id="hg90_relic_yang_jian"]').click()
   divine=p.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return {made:s.hg90.forged,
      items:s.inventory.filter(i=>i.itemId==='hg90_relic_yang_jian').length,
      shards:s.hg90.shards,frags:s.hg18.materials.resource_chest,
      valid:HOG_ENGINE.strictSave(s)};
   }""")
   test(label+' '+race+' earned one deity-only relic without phantom stock',
    divine['items']==1 and divine['made']==['hg90_relic_yang_jian'] and
    divine['shards']==108 and divine['frags']==35 and divine['valid'],divine)
   capture(p,label+'-'+race+'-divine-gear')
   p.locator('[data-action="hg90-summon-troops"]').click()
   troops=p.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),id='elf_hg90_celestial';
      return {unit:id,owned:s.army[id],shards:s.hg90.shards,city:s.activeCityId,
       name:E.getUnit(s,id)?.name,valid:E.strictSave(s)};
   }""")
   test(label+' '+race+' 60 real Elf myth troops appear ONLY in secondary city',
    troops['owned']==60 and troops['shards']==8 and troops['city']=='qa-elf-city' and troops['valid'],troops)
   p.locator('[data-action="tab"][data-tab="city"]').first.click()
   p.locator('[data-action="city-switch"][data-id="main"]').first.click()
   main=p.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {city:s.activeCityId,commander:s.activeHero,
      troops:s.army.elf_hg90_celestial||0,local:E.hg82CityHeroes(s).map(h=>h.id),
      valid:E.strictSave(s)};
   }""")
   test(label+' '+race+' main city never receives secondary god or mythical army',
    main['city']=='main' and main['commander']==1 and main['troops']==0 and main['local']==[1] and main['valid'],main)
   p.locator('[data-action="city-switch"][data-id="qa-elf-city"]').click()
   home=p.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {city:s.activeCityId,commander:s.activeHero,army:s.army.elf_hg90_celestial,
       hero:E.hg82CityHeroes(s).map(h=>h.name),valid:E.strictSave(s)};
   }""")
   test(label+' '+race+' returning to secondary city selects local god and preserves troops',
    home['city']=='qa-elf-city' and home['commander']==2 and home['army']==60 and
    home['hero']==['Dương Tiễn'] and home['valid'],home)
   p.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      s.hg20.tower.floor=21;s.hg20.tower.hg88.highest=20;s.hg20.tower.hg88.resetsUsed=0;
      HOG_APP_DEBUG.render();
   }""")
   p.locator('[data-action="tab"][data-tab="tower"]').first.click()
   p.locator('[data-action="hg88-tower-reset"]').click()
   reset=p.evaluate("""() => {
     const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
     return {floor:s.hg20.tower.floor,highest:s.hg20.tower.hg88.highest,
      used:s.hg20.tower.hg88.resetsUsed,rewardText:document.body.innerText.includes('100%'),
      valid:E.strictSave(s)};
   }""")
   test(label+' '+race+' daily reset preserves highest and FULL-reward communication',
    reset['floor']==1 and reset['highest']==20 and reset['used']==1 and reset['valid'],reset)
   capture(p,label+'-'+race+'-tower-reset-full-rewards')
   p.evaluate('HOG_APP_DEBUG.save()');p.reload(wait_until='load',timeout=180000)
   cold=p.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {v:s.version,valid:E.strictSave(s),city:s.activeCityId,hero:s.heroes.find(h=>h.mythicId==='yang_jian')?.cityId,
       unit:s.army.elf_hg90_celestial,relic:s.inventory.filter(i=>i.itemId==='hg90_relic_yang_jian').length,
       shards:s.hg90.shards,reset:s.hg20.tower.hg88.resetsUsed};
   }""")
   test(label+' '+race+' cold Save v07 retains god, city, relic, troops and Tower reset',
    cold['v']==7 and cold['valid'] and cold['city']=='qa-elf-city' and cold['hero']=='qa-elf-city' and
    cold['unit']==60 and cold['relic']==1 and cold['shards']==8 and cold['reset']==1,cold)
   p.close()
 browser.close()
test('No JavaScript page errors',not errors,errors)
print('HG90 Chromium '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks))+' PASS',flush=True)
