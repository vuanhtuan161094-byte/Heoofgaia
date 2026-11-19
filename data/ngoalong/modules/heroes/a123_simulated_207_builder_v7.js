'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const load = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
function buildDesign({wiki,cross,gaps,delta,foreign}) {
 const byWikiId=new Map(wiki.heroes.map(h=>[h.id,h]));
 const extra=new Map(gaps.rows.filter(x=>x.addition).map(x=>[x.heroId,x.addition]));
 const foreignById=new Map(foreign.records.map(x=>[x.heroId,x]));
 const deltaById=new Map(delta.rows.map(x=>[x.heroId,x]));
 const knownRole={
 "Văn Khâm":"DEFENDER","Ngưu Kim":"DISRUPTOR","Triệu Phạm":"STRIKER","Chu Chỉ":"CAVALRY","Quản Lộ":"SUPPORT","Nghiêm Dư":"STRIKER",
 "Dương Nghi":"STRATEGIST","Đinh Nguyên":"CAVALRY","Vô Khâu Kiệm":"DEFENDER","Lâu Ban":"CAVALRY","Dương Cổ":"STRIKER","Kha Ngô":"ARCHER"
 };
 const roles=["DEFENDER","STRIKER","CAVALRY","ARCHER","STRATEGIST","SUPPORT","DISRUPTOR"];
 const tags={
 DEFENDER:{troops:"INFANTRY",lane:"PHYSICAL",targets:["SINGLE_ENEMY"],effects:["SELF_GUARD","ALLY_GUARD"],bases:[77,72,52],coef:1.07},
 STRIKER:{troops:"SPEAR",lane:"TACTICAL",targets:["SINGLE_ENEMY","ENEMY_FRONT"],effects:["ARMOR_BREAK","BLEED"],bases:[71,83,49],coef:1.55},
 CAVALRY:{troops:"CAVALRY",lane:"TACTICAL",targets:["ENEMY_COLUMN","SINGLE_ENEMY"],effects:["MORALE_REDUCE","WEAKEN"],bases:[74,84,50],coef:1.24},
 ARCHER:{troops:"ARCHER",lane:"PHYSICAL",targets:["ENEMY_COLUMN","SINGLE_ENEMY"],effects:["WEAKEN","ARMOR_BREAK"],bases:[69,79,60],coef:1.2},
 STRATEGIST:{troops:"CIVIL",lane:"STRATEGY",targets:["ENEMY_ROW","SINGLE_ENEMY"],effects:["DOT","STRATEGY_WEAKEN"],bases:[63,50,84],coef:1.37},
 SUPPORT:{troops:"CIVIL",lane:"SUPPORT",targets:["ALL_ALLIES","LOWEST_HP_ALLY"],effects:["HEAL","MORALE_GAIN"],bases:[66,46,83],coef:0.46},
 DISRUPTOR:{troops:"CIVIL",lane:"STRATEGY",targets:["SINGLE_ENEMY","ENEMY_COLUMN"],effects:["MORALE_REDUCE","CONTROL"],bases:[67,59,77],coef:1.1}
 };
 const names={
 DEFENDER:["Thiết Trận Trấn Quân","Thủ Thành Quyết","Huyền Giáp Phản Kích"],
 STRIKER:["Phá Trận Tiên Phong","Thương Phong Truy Kích","Huyết Chiến Xung Kích"],
 CAVALRY:["Thiết Kỵ Phá Tuyến","Phong Kỵ Đột Tập","Truy Phong Liên Kích"],
 ARCHER:["Bách Bộ Xuyên Tâm","Liên Nỏ Phá Giáp","Xuyên Vân Tiễn Trận"],
 STRATEGIST:["Hỏa Trận Mưu Công","Ngũ Lôi Kỳ Kế","Thủy Hỏa Liên Mưu"],
 SUPPORT:["An Quân Phù Trận","Hồi Sinh Quân Khí","Hộ Mệnh Tương Trợ"],
 DISRUPTOR:["Loạn Trận Đoạt Khí","Kỳ Mưu Nhiễu Quân","Trấn Hồn Ly Gián"]
 };
 function hash(s){let h=2166136261>>>0;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
 function clamp(x,min,max){return Math.max(min,Math.min(max,Math.round(x)));}
 const grade={Thường:0,Chiến:1,Thần:2,"Truyền thuyết":3};
 function roleFrom(skill,force,seed){
  if(force)return force;
  const s=skill||"";
  if(/铁壁|盾击|守护|反扑|死撑|铜墙|御甲/.test(s))return "DEFENDER";
  if(/鼓舞|治疗|治愈|恢复|援护/.test(s))return "SUPPORT";
  if(/暗祭|离间|幻术|辱骂|威风|苦计|怒吼|自毁|雷霆|连环/.test(s))return "DISRUPTOR";
  if(/火龙|海啸|落雷|爆炎|滚石|炎爆|红炎|毒咒|剧毒|浪涛|玄冰|攻心/.test(s))return "STRATEGIST";
  if(/狙击|飞射|雷箭|箭雨|乱射|穿杨|齐射|阻击|火弩/.test(s))return "ARCHER";
  if(/骑踏|疾冲|突进|突击|踏破|强袭|奔袭/.test(s))return "CAVALRY";
  if(/刺击|横扫|连击|连城|奋迅|奋战|血路|暗杀|血制|锤击/.test(s))return "STRIKER";
  return roles[seed%roles.length];
 }
 const designRows=[], groupCounts={}, warning=[];
 for(const [group,rows] of Object.entries(cross.rows)){
  groupCounts[group]={total:rows.length};
  for(const r of rows){
   const w=byWikiId.get(r.heroId);
   if(!w||w.name!==r.name) throw Error("wiki mapping mismatch "+r.heroId);
   const src=r.historicEvidence||null;
   const gap=extra.get(r.heroId)||null;
   const f=foreignById.get(r.heroId)||null;
   const d=deltaById.get(r.heroId)||null;
   const seed=hash(r.heroId+"/"+w.name);
   const skill=f?.facts?.skillChinese||src?.historicSkillNameChinese||gap?.classicSkillTitle||null;
   const role=roleFrom(skill,knownRole[r.name],seed);
   const rdef=tags[role],gradeIndex=grade[w.indexGrade];
   if(gradeIndex===undefined)throw Error("unknown grade "+w.indexGrade);
   const historicStats=f?.facts?.baseStatsCommandMightIntellect||src?.historicStatsCommandMightIntellect||null;
   const arr=rdef.bases.map((b,k)=>clamp((historicStats?0.5*historicStats[k]+0.5*b:b)+(gradeIndex*2)+((hash(r.heroId+"/"+k)%11)-5),35,96));
   const [command,might,intellect]=arr;
   const combatStats={
    hp:clamp(950+11*command+65*gradeIndex,900,2500),
    physicalAttack:clamp(90+1.45*might+12*gradeIndex,100,300),
    tacticalAttack:clamp(88+1.45*might+12*gradeIndex,100,300),
    strategyAttack:clamp(82+1.45*intellect+12*gradeIndex,100,300),
    physicalDefense:clamp(64+1.22*command+5*gradeIndex,80,220),
    tacticalDefense:clamp(61+1.20*command+5*gradeIndex,80,220),
    strategyDefense:clamp(61+1.03*intellect+4*gradeIndex,80,220),
    startingMorale:50
   };
   const variant=seed%3, target=rdef.targets[variant%rdef.targets.length],effect=rdef.effects[variant%rdef.effects.length];
   const aoe=target!=="SINGLE_ENEMY"&&target!=="LOWEST_HP_ALLY";
   const multip=Math.round(rdef.coef*(aoe?0.71:1)*(1+gradeIndex*0.08)*100)/100;
   const effectChance=effect==="CONTROL"?Math.min(0.3,0.18+gradeIndex*0.025):effect==="BLEED"||effect==="DOT"?0.65:1;
   const effectMagnitude=effect==="HEAL"?Math.min(0.55,0.31+gradeIndex*0.06):effect==="MORALE_GAIN"?Math.min(20,12+gradeIndex*2):effect==="MORALE_REDUCE"?Math.min(30,14+gradeIndex*4):0.06+gradeIndex*0.015;
   const stageMin=gradeIndex===3?19:gradeIndex===2?15:gradeIndex===1?6:1;
   const stageMax=gradeIndex===3?28:gradeIndex===2?28:gradeIndex===1?24:18;
   const stage=stageMin+(seed%(stageMax-stageMin+1));
   let proposalRoute=group==="A3"?(d&&d.classicEditionTransition.endsWith("UNAVAILABLE")?"BOSS_QUEST_TO_ALLY":"SIDE_QUEST_TO_ALLY"):group==="A1"?"FACTION_REPUTATION":"CAMPAIGN_MILESTONE";
   if(r.name==="Quản Lộ")proposalRoute="ADVISOR_QUEST_TO_ALLY";
   const recruitment={
    method:proposalRoute,stageNumber:stage,
    silverCost:proposalRoute==="FACTION_REPUTATION"?1200+stage*150:0,
    randomChance:null,guaranteedWhenObjectivesMet:true,
    conditions:proposalRoute==="BOSS_QUEST_TO_ALLY"?["DEFEAT_NAMED_NPC","COMPLETE_POST_BOSS_QUEST"]:["CLEAR_STAGE","COMPLETE_CHARACTER_QUEST"],
    rewardReceipt:"ONCE_PER_HERO_ID",recruitCountCap:1
   };
   const awakening={
    scheme:"PROJECT_VETERAN_AND_ELITE_ONLY_NOT_VNG_COLOURS",
    upgrades:[
      {tier:"VETERAN",levelRequired:15,silverCost:4000+gradeIndex*1500,materials:{"hero-seal":2+gradeIndex},statMultiplier:1.12},
      {tier:"ELITE",levelRequired:30,silverCost:12000+gradeIndex*3500,materials:{"hero-seal":7+gradeIndex*2},statMultiplier:1.26}
    ],
    routeProbability:null,maxTier:"ELITE",stageColorParity:"NOT_APPLICABLE"
   };
   designRows.push({
    heroId:r.heroId,name:r.name,faction:w.faction,wikiIndexGrade:w.indexGrade,group,
    researchEvidence:{
     historicSkillChinese:skill,
     historicBaseStats:historicStats,
     foreignFactId:f?.factId||null,
     sourceReferences:[...new Set([src?.sourceUrl,gap?.sourceUrl,f?.sourceUrl,d?.sourceUrl].filter(Boolean))],
     historic2021RecruitmentChange:d?.classicEditionTransition||null,
     sourceDataRole:"REFERENCE_ONLY",
     verifiedCurrentMobileStats:false,verifiedCurrentMobileSkillCoefficient:false,
     verifiedVngMobileRecruitment:false,
     crossEditionParity:"UNKNOWN"
    },
    proposedDesign:{
     role,troopFamily:rdef.troops,
     baseAttributes:{command,might,intellect},
     combatStats,
     normalAttack:{type:rdef.lane==="SUPPORT"?"PHYSICAL":rdef.lane,coefficient:0.88,target:"SINGLE_ENEMY",moraleGain:25},
     active:{
       id:"mdtq-sim-"+r.heroId.slice(-3),
       name:names[role][variant]+" · "+r.name,
       attackLane:rdef.lane,target,
       damageCoefficient:rdef.lane==="SUPPORT"?0:multip,
       healFractionOfStrategyAttack:effect==="HEAL"?Math.round(effectMagnitude*100)/100:0,
       statusEffect:effect,statusChance:effectChance,
       statusMagnitude:Math.round(effectMagnitude*1000)/1000,
       statusDurationTurns:effect==="SELF_GUARD"?2:effect==="ALLY_GUARD"?2:effect==="CONTROL"?1:effect==="DOT"?2:1,
       targetCap:target==="SINGLE_ENEMY"||target==="LOWEST_HP_ALLY"?1:target==="ENEMY_COLUMN"||target==="ENEMY_FRONT"?3:5,
       moraleCost:100,cooldownTurns:2+seed%2,
       actionMaxPerRound:1,canTriggerOnReplay:false
     },
     passive:{id:"mdtq-pass-"+r.heroId.slice(-3),kind:["MELEE_RESIST","OPENING_MORALE","ANTI_CONTROL","FACTION_GUARD"][seed%4],magnitude:Math.round((0.035+gradeIndex*0.01)*1000)/1000,stackCap:1,triggerCapPerRound:1},
     recruitment,awakening,
     balanceLimits:{singleTargetDamageCoefficientMax:2.2,areaDamageCoefficientMax:1.5,healFractionMax:0.55,controlChanceMax:0.3,passiveStackMax:1}
    },
    provenance:{classification:"SIMULATED",scope:"PROJECT_BALANCE_PROPOSAL_NOT_VNG_MECHANICS",basedOnEvidence:historicStats?"HISTORIC_NAME_AND_STATS_AS_INSPIRATION":"PROJECT_ROLE_ARCHETYPE_ONLY",author:"MuuDinhTamQuoc_CHAT01",reviewRequired:true,gameplayImport:false},
    runtimeStatus:"DESIGN_CANDIDATE_NOT_INTEGRATED",combatBinding:null,saveBinding:null
   });
  }
 }
 designRows.sort((a,b)=>a.heroId.localeCompare(b.heroId));
 const hist=designRows.reduce((acc,r)=>(acc[r.proposedDesign.role]=(acc[r.proposedDesign.role]||0)+1,acc),{});
 const sources=designRows.filter(r=>r.researchEvidence.sourceReferences.length>0).length;
 if(designRows.length!==207||new Set(designRows.map(r=>r.heroId)).size!==207)throw Error("207 uniqueness");
 if(Object.keys(hist).length<6)throw Error("low role diversity "+JSON.stringify(hist));
 if(sources<195)throw Error("loss of citations "+sources);
 const groupTotals=Object.fromEntries(Object.keys(cross.rows).map(k=>[k,designRows.filter(r=>r.group===k).length]));
 return {schemaVersion:7,checkedAt:"2026-11-19",sourceAuthority:"USER_AUTHORIZED_PROJECT_SIMULATED_GAMEPLAY_DESIGN",status:"DESIGN_CANDIDATE_NOT_RUNTIME",inputFiles:["wiki_catalogue_v1.json","a123_external_lequ_crosscheck_v6.json","a123_external_gap_followups_v6.json","a123_lequ_2021_recruitment_delta_v6.json","a123_foreign_source_updates_v7.json"],immutableRules:{neverOverrideWikiMetadata:true,realMobileStatsRemainUnknown:true,historicSourceOnlyProvidesInspiration:true,officialStageSkillsAreNotReplaced:true,allBalancingFiguresSimulated:true,doNotAutoImport:true,onlyChat05MayApproveCombatEngine:true,onlyChat08MayIntegrateRuntime:true,releaseQARequired:true},summary:{total:designRows.length,byGroup:groupTotals,byRole:hist,withAnyHistoricOrExternalEvidence:sources,unsourced:designRows.length-sources,playableInExistingRuntime:0},heroes:designRows};
}
const data = buildDesign({wiki:load('wiki_catalogue_v1.json'),cross:load('a123_external_lequ_crosscheck_v6.json'),gaps:load('a123_external_gap_followups_v6.json'),delta:load('a123_lequ_2021_recruitment_delta_v6.json'),foreign:load('a123_foreign_source_updates_v7.json')});
const content = JSON.stringify(data,null,2)+'\n';
if (process.argv.includes('--check')) {const onDisk=fs.readFileSync(path.join(dir,'a123_simulated_207_design_v7.json'),'utf8'); if(onDisk!==content)throw Error('V7 snapshot mismatch'); console.log('207 simulated hero designs: snapshot PASS');} else {fs.writeFileSync(path.join(dir,'a123_simulated_207_design_v7.json'),content);console.log('207 hero designs exported');}
