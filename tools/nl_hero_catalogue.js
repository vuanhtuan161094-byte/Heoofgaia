"use strict";
/**
 * Mưu Định Tam Quốc / Chat 01 — isolated Wiki hero catalogue adapter.
 * Does not touch runtime, Save, battle engine, or generated index.html.
 * Wiki Mobile index metadata is reference-only; unknown fields remain null.
 * SPDX-License-Identifier: MIT (original project utility)
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HERO_DIR = path.join(ROOT, "data", "ngoalong", "modules", "heroes");
const INDEX = path.join(HERO_DIR, "wiki_catalogue_v1.json");
const LEGACY_REF = path.join(ROOT, "data", "ngoalong", "group02_wiki", "heroes.json");
const RUNTIME = path.join(ROOT, "data", "ngoalong", "alpha_content.json");
const SOURCE = "WIKI_HERO_INDEX_20261118";
const FACTION_COUNTS = Object.freeze({"Ngụy": 40, "Thục": 38, "Ngô": 39, "Quần": 174, "Trung lập": 73});
const GRADES = new Set(["Thần Hoàng", "Thái Sơ", "Thượng Cổ", "Truyền thuyết", "Thần", "Chiến", "Thường"]);
const STATUSES = new Set(["VERIFIED", "DERIVED", "SIMULATED", "UNKNOWN"]);
const NULL_FIELDS = [
  "heroKind", "variantOf", "role", "troopIds", "stats", "acquisition",
  "level", "experience", "training", "awakening", "evolution"
];

const readJSON = file => JSON.parse(fs.readFileSync(file, "utf8"));
function keyOfName(name) {
  return String(name).normalize("NFC").trim().toLocaleLowerCase("vi-VN").replace(/\s+/g, " ");
}
function assert(condition, message) {
  if (!condition) throw new Error("NL_HERO_CONTRACT: " + message);
}
function unique(items) { return [...new Set(items)]; }

/** Validate raw index without treating same-name cross-faction entries as equal IDs. */
function validateIndex(index, legacyRefs) {
  assert(index.schemaVersion === 1, "unexpected catalogue schema");
  assert(index.edition === "VNG_WIKI_MOBILE_CURRENT", "Mobile/classic scope changed");
  assert(index.source?.url === "https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong", "Wiki URL missing");
  assert(index.source?.classicParity === "UNKNOWN", "must not claim Mobile/classic parity");
  assert(index.heroes?.length === 364 && index.counts?.wikiDeclared === 364, "index is not 364 entries");
  const counts = {}, ids = new Set(), byName = new Map(), byFactionName = new Set();
  for (let i=0; i<index.heroes.length; i++) {
    const item = index.heroes[i], prefix = "heroes[" + i + "]";
    assert(item.wikiOrdinal === i+1 && item.id === "wiki-mobile-hero-" + String(i+1).padStart(3,"0"), prefix + " unstable ID/order");
    assert(!ids.has(item.id), prefix + " duplicate ID");
    ids.add(item.id);
    assert(item.name && item.name === item.name.normalize("NFC"), prefix + " invalid name");
    assert(Object.hasOwn(FACTION_COUNTS, item.faction), prefix + " invalid faction");
    assert(GRADES.has(item.indexGrade), prefix + " invalid listed grade");
    assert(item.edition === index.edition && item.sourceId === SOURCE, prefix + " wrong edition/source");
    assert(item.sourceUrl === index.source.url && item.runtimeStatus === "REFERENCE_ONLY", prefix + " unauthorized runtime promotion");
    for (const k of ["name","faction","indexGrade"]) assert(item.fieldProvenance?.[k] === "VERIFIED", prefix + "."+k+" has no verified index provenance");
    assert(Object.values(item.fieldProvenance).every(v=>STATUSES.has(v)), prefix + " invalid provenance code");
    counts[item.faction] = (counts[item.faction] || 0) + 1;
    const nameKey = keyOfName(item.name), fq = item.faction + "/" + nameKey;
    assert(!byFactionName.has(fq), prefix + " repeated faction/name combination");
    byFactionName.add(fq);
    byName.set(nameKey, [...(byName.get(nameKey) || []), item.id]);
  }
  for (const [faction, expected] of Object.entries(FACTION_COUNTS)) assert(counts[faction] === expected, "faction " + faction + " expected " + expected + " got " + counts[faction]);
  const collisions = [...byName.entries()].filter(([, v])=>v.length>1).map(([name, ids])=>({name, ids, review:"UNRESOLVED_SAME_NAME"}));
  assert(JSON.stringify(collisions) === JSON.stringify(index.duplicateNameReview), "duplicate-name audit diverged");
  assert(collisions.length === 1 && collisions[0].name === "trương hoành", "unexpected unresolved name collisions");
  assert(byName.size === index.counts.uniqueNormalizedNames, "unique-name count changed");
  const matched = new Set();
  for (const ref of legacyRefs) {
    const found = index.heroes.filter(x=>x.name===ref.name && x.faction===ref.faction);
    assert(found.length===1 && found[0].indexGrade===ref.indexGrade, "lost/altered old verified reference: "+ref.name);
    matched.add(found[0].id);
  }
  assert(legacyRefs.length===50 && matched.size===50, "legacy 50 reference coverage changed");
  return {wikiRecords:index.heroes.length,byFaction:counts,uniqueNames:byName.size,unresolvedNameCollisions:collisions,legacyReferenceMatches:matched.size};
}

/** Materialize all required unknowns explicitly, without making up progression stats/skills. */
function materializeProfiles(index, legacyRefs = []) {
  const aliases = new Map(legacyRefs.map(x=>[x.faction + "/" + keyOfName(x.name), x.id]));
  const collisions = new Set(index.duplicateNameReview.flatMap(d=>d.ids));
  return index.heroes.map(entry => {
    const facts = Object.fromEntries(NULL_FIELDS.map(field=>[field,null]));
    const provenance = Object.fromEntries(NULL_FIELDS.map(field=>[field,"UNKNOWN"]));
    return {
      id:entry.id, wikiOrdinal:entry.wikiOrdinal, name:entry.name,
      faction:entry.faction, grade:{listed:entry.indexGrade, current:null},
      edition:entry.edition, kind:"UNRESOLVED", identityStatus:collisions.has(entry.id)?"HOMONYM_REVIEW":"INDEX_ONLY",
      ...facts,
      skills:{normal:null, active:null, passives:[], skillSourceStatus:"UNKNOWN"},
      source:{id:entry.sourceId,url:entry.sourceUrl,scope:"MOBILE_INDEX",checkedAt:index.snapshotDate},
      aliases:{legacyReferenceId:aliases.get(entry.faction + "/" + keyOfName(entry.name)) || null},
      fieldProvenance:{
        id:"DERIVED", wikiOrdinal:"VERIFIED", name:"VERIFIED", faction:"VERIFIED",
        gradeListed:"VERIFIED",gradeCurrent:"UNKNOWN",edition:"DERIVED",kind:"UNKNOWN",
        ...provenance,skills:"UNKNOWN"
      },
      readiness:"REFERENCE_ONLY"
    };
  });
}
function validateProfiles(profiles) {
  assert(profiles.length===364, "materialized roster incomplete");
  for (const p of profiles) {
    assert(p.readiness==="REFERENCE_ONLY" && p.skills.skillSourceStatus==="UNKNOWN", p.id+" promoted without evidence");
    for (const field of NULL_FIELDS) assert(p[field]===null && p.fieldProvenance[field]==="UNKNOWN", p.id+" fabricated "+field);
    assert(p.grade.current === null && p.fieldProvenance.gradeCurrent==="UNKNOWN",p.id+" guessed evolution grade");
  }
  return true;
}

/**
 * Overlay evidence-backed detail batches without altering historical index rows.
 * All patch fields are source-backed and edition-scoped. Wiki PLAYABLE is never automatic.
 */
function applyDetailPatches(baseProfiles, patchSet) {
  assert(patchSet?.schemaVersion===1 && patchSet.edition==="VNG_WIKI_MOBILE_CURRENT", "detail patch version mismatch");
  assert(Array.isArray(patchSet.patches), "detail patches must be an array");
  const allowed=new Set([...NULL_FIELDS,"skills"]);
  const byId=new Map(baseProfiles.map(p=>[p.id,p]));
  const patchIds=new Set();
  for(const patch of patchSet.patches) {
    assert(byId.has(patch.heroId), "patch refers to unknown hero "+patch.heroId);
    assert(!patchIds.has(patch.heroId), "multiple batches conflict for "+patch.heroId);
    patchIds.add(patch.heroId);
    assert(patch.edition===patchSet.edition, "hero patch must specify exact edition");
    assert(patch.fields && Object.keys(patch.fields).length>0, "hero patch is empty");
    const profile={...byId.get(patch.heroId),fieldProvenance:{...byId.get(patch.heroId).fieldProvenance}};
    for(const [field, fact] of Object.entries(patch.fields)){
      assert(allowed.has(field), "unsupported hero fact "+field);
      assert(fact && fact.classification==="VERIFIED" && fact.value!==null && fact.value!==undefined, "hero fact must be VERIFIED with nonnull value: "+field);
      assert(typeof fact.sourceUrl==="string" && /^https:\/\//.test(fact.sourceUrl) && fact.sourceUrl!=="https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong", "hero detail requires a source more specific than the index: "+field);
      assert(/^\d{4}-\d{2}-\d{2}$/.test(fact.checkedAt||""), "hero fact missing checkedAt: "+field);
      assert(fact.edition===patchSet.edition, "cross-edition hero fact blocked: "+field);
      if(field==="heroKind") assert(["BASE","VARIANT","SPECIAL"].includes(fact.value), "heroKind requires explicit classification");
      if(field==="variantOf") assert(typeof fact.value==="string" && fact.value!==profile.id && byId.has(fact.value), "variantOf target not in catalogue");
      if(field==="skills") assert(fact.value && typeof fact.value==="object" && ("normal" in fact.value) && ("active" in fact.value) && Array.isArray(fact.value.passives), "skills must specify normal, active, passives");
      profile[field]=fact.value;
      profile.fieldProvenance[field]="VERIFIED";
    }
    profile.kind=profile.heroKind || "UNRESOLVED";
    if(profile.role!==null && profile.skills && (profile.skills.active!==null || profile.skills.normal!==null) && profile.fieldProvenance.skills==="VERIFIED") profile.readiness="DESIGN_READY";
    byId.set(profile.id,profile);
  }
  return baseProfiles.map(p=>byId.get(p.id));
}

/**
 * Verifiable per-stage skill data is distinct from current equipped abilities:
 * 2024 Orange and 2026 Gold announcement mechanics are versioned facts.
 * No stage is assumed unlocked/equipped by the currently saved player.
 */
const STAGE_FILES = Object.freeze([
  ["wiki_orange_skills_2024_v1.json","ORANGE",24,"2024-01-02"],
  ["wiki_gold_skills_2025_dec_v1.json","GOLD",13,"2025-12-12"],
  ["wiki_gold_skills_2026_v1.json","GOLD",8,"2026-06-07"],
  ["wiki_gold_skills_2026_aug_v1.json","GOLD",10,"2026-08-17"]
]);
const ALLOWED_SKILL_OPS = new Set([
  "DAMAGE","STATUS","MORALE","HEAL","MORALE_COST",
  "ATTACK_REDUCTION","DISPEL","DAMAGE_TO_HEAL","HEAL_RECEIVED_REDUCTION","DEFENSE_REDUCTION",
  "ATTACK_CHANGE","HEAL_UNQUANTIFIED","STAT_BONUS_UNQUANTIFIED"
]);
function loadWikiStageSkills(root, index) {
  const known=new Map(index.heroes.map(h=>[h.id,h]));
  const rows=[], unique=new Set();
  for (const [file,stage,total,sourceDate] of STAGE_FILES) {
    const pack=readJSON(path.join(root,"data","ngoalong","modules","heroes",file));
    assert(pack.schemaVersion===1 && pack.stage===stage && pack.count===total && pack.skills?.length===total, "stage pack invalid: "+file);
    assert(pack.edition===index.edition && typeof pack.sourceUrl==="string" && pack.sourceUrl.startsWith("https://ngoalong.vnggames.com/"), "stage source mismatch: "+file);
    for (const item of pack.skills) {
      const key=item.name+"/"+stage+"/"+sourceDate;
      assert(!unique.has(key),"same hero + stage repeated: "+key);
      unique.add(key);
      assert(item.sourceDate===sourceDate && item.sourceUrl===pack.sourceUrl && item.edition===pack.edition && item.provenance==="VERIFIED", "stage fact source invalid: "+key);
      assert(item.skillId && typeof item.skillName==="string" && item.skillName.length>0, "stage identity missing: "+key);
      assert(item.engineOwner==="CHAT_05" && item.executable===false, "stage fact cannot be made executable by catalogue: "+key);
      assert(Array.isArray(item.events) && item.events.length>0, "stage events missing: "+key);
      for(const [ei,event] of item.events.entries()){
        assert(ALLOWED_SKILL_OPS.has(event.op), "unrecognized operation "+key+":"+ei);
        assert(typeof event.target==="string" && event.target.length>0, "missing operation target: "+key+":"+ei);
        if(event.op==="DAMAGE" || event.op==="HEAL") {
          assert(typeof event.coefficientPct==="number" && event.coefficientPct>=0, "damage/heal coefficient invalid: "+key+":"+ei);
          assert(Number.isInteger(event.hits) && event.hits>0, "hit count invalid: "+key+":"+ei);
        }
        if(event.op==="STATUS") assert(typeof event.effect==="string" && event.effect.length>0 && (event.durationTurns===null || Number.isInteger(event.durationTurns)), "status undefined: "+key+":"+ei);
      }
      if(item.heroId!==null) {
        const hero=known.get(item.heroId);
        assert(hero && hero.name===item.name, "stage-to-index hero identity mismatch: "+key);
        assert(item.sourceListStatus==="IN_WIKI_364_INDEX" || stage==="GOLD", "indexed skill has invalid scope");
      } else {
        assert(item.sourceListStatus==="IN_OFFICIAL_UPDATE_ONLY" && (
          (stage==="ORANGE" && ["Lưu Bị","Tào Tháo","Tôn Quyền"].includes(item.name)) ||
          (stage==="GOLD" && sourceDate==="2026-08-17" && item.name==="Công Tôn Toản" && item.candidateIndexAlias==="Công Tôn Toán" && item.identityLink==="SOURCE_NAME_ONLY_NO_AUTO_MAPPING")
        ), "unindexed official hero requires explicit source/alias review");
      }
      rows.push(item);
    }
  }
  assert(rows.length===55 && rows.filter(x=>x.heroId!==null).length===51, "unexpected stage-ability totals");
  return rows;
}

/** Add versioned skill data for Chat 05 without promoting any roster entry into runtime. */
function buildSkillDescriptors(profiles, wikiStageSkills=[]) {
  const byHeroId=new Map();
  for(const row of wikiStageSkills) if(row.heroId){
    if(!byHeroId.has(row.heroId))byHeroId.set(row.heroId,[]);
    byHeroId.get(row.heroId).push(row);
  }
  return profiles.map(p=>({
    heroId:p.id,name:p.name,faction:p.faction,edition:p.edition,
    sourceId:p.source.id,sourceUrl:p.source.url,
    normal:p.skills.normal,active:p.skills.active,passive:p.skills.passives,
    stageSkills:byHeroId.get(p.id)||[],currentStage:null,
    descriptors:{trigger:null,target:null,operation:null,probability:null,duration:null,moraleDelta:null,stacking:null,dispel:null,immunity:null},
    factStatus:p.fieldProvenance.skills,stageFactStatus:byHeroId.has(p.id)?"VERIFIED":"UNKNOWN",
    readiness:p.readiness,consumer:"CHAT_05",runtimeImport:false
  }));
}
/**
 * Existing 14 project-owned general definitions are allowed for compatibility only.
 * Name equality with a Wiki general never establishes a shared ID, skill or evolution.
 */
function projectRosterAudit(alpha, profiles) {
  const project = alpha.heroes?.projectRoster || [];
  const skills = alpha.skills?.heroById || {};
  assert(project.length===14, "project runtime roster changed from 14");
  assert(new Set(project.map(p=>p.id)).size===14, "project runtime duplicate IDs");
  assert(Object.keys(skills).length===14, "project runtime skill descriptors missing");
  assert(project.every(p=>p.provenance?.classification==="SIMULATED" && Object.hasOwn(skills,p.id)), "project runtime provenance/skill contract failed");
  return {
    projectRuntimeCount:project.length,
    projectSkillCount:Object.keys(skills).length,
    runtimeEditPerformed:false,
    possibleNameOverlaps:project.flatMap(p=>{
      const matches=profiles.filter(w=>keyOfName(w.name)===keyOfName(p.name));
      return matches.length?[{projectId:p.id,projectName:p.name,wikiIds:matches.map(m=>m.id),mappingStatus:"NAME_ONLY_NOT_AUTHORIZED"}]:[];
    })
  };
}
function readinessAudit(profiles) {
  return profiles.reduce((a,p)=>{ a[p.readiness]=(a[p.readiness]||0)+1; return a; },{});
}
function loadCatalogue(root=ROOT) {
  const h=path.join(root,"data","ngoalong","modules","heroes","wiki_catalogue_v1.json");
  const l=path.join(root,"data","ngoalong","group02_wiki","heroes.json");
  const r=path.join(root,"data","ngoalong","alpha_content.json");
  const index=readJSON(h), refs=readJSON(l).heroes, alpha=readJSON(r);
  const inventory=validateIndex(index,refs);
  const baseProfiles=materializeProfiles(index,refs);
  validateProfiles(baseProfiles);
  const patches=readJSON(path.join(root,"data","ngoalong","modules","heroes","detail_patches_v1.json"));
  const profiles=applyDetailPatches(baseProfiles,patches);
  const wikiStageSkills=loadWikiStageSkills(root,index);
  const skillDescriptors=buildSkillDescriptors(profiles,wikiStageSkills);
  const project=projectRosterAudit(alpha,profiles);
  const detailedHeroIds=new Set(wikiStageSkills.map(x=>x.heroId).filter(Boolean));
  return {
    index,profiles,inventory,project,readiness:readinessAudit(profiles),
    wikiStageSkills,skillDescriptors,
    stageFactsCoverage:{
      sourceVerifiedAbilities:wikiStageSkills.length,
      indexedHeroSkillVariants:wikiStageSkills.filter(x=>x.heroId!==null).length,
      indexedHeroProfilesWithAnyStageSkill:detailedHeroIds.size,
      unindexedOfficialHeroes:[...new Set(wikiStageSkills.filter(x=>x.heroId===null).map(x=>x.name))],
      actualEquippedAbilitiesVerified:0,
      runtimeEligibleFromThisModule:0
    }
  };
}
/** Stable on-disk descriptor contract for Chat 05 and Chat 08 (no runtime mutation). */
function makeSkillHandoff(result) {
  return {
    schemaVersion:1,edition:result.index.edition,
    checkedAt:result.wikiStageSkills[0]?.checkedAt||result.index.snapshotDate,
    source:result.index.source,
    disclaimer:"Four official announcement batches (2024–2026) contain dated skill versions, not the hero's currently equipped stage. Older and newer versions are retained separately. Do not resolve conflicts without explicit version selection; unresolved base skills remain UNKNOWN and no combat engine is executed.",
    count:result.skillDescriptors.length,stageFactsCoverage:result.stageFactsCoverage,
    heroes:result.skillDescriptors
  };
}
function main(argv=process.argv.slice(2)) {
  const allowed=new Set(["--check","--export-skills"]);
  assert(argv.every(a=>allowed.has(a)), "usage: node tools/nl_hero_catalogue.js [--check] [--export-skills]");
  const result=loadCatalogue();
  if(argv.includes("--export-skills")){
    const filename=path.join(HERO_DIR,"skills_handoff_v1.json");
    fs.writeFileSync(filename,JSON.stringify(makeSkillHandoff(result),null,2)+"\n");
  }
  console.log(JSON.stringify({inventory:result.inventory,project:result.project,readiness:result.readiness,skillBundles:result.skillDescriptors.length,stageFactsCoverage:result.stageFactsCoverage},null,2));
}
if(require.main===module){try{main();}catch(err){console.error(err.stack||String(err));process.exitCode=1;}}
module.exports={loadCatalogue,validateIndex,materializeProfiles,validateProfiles,applyDetailPatches,loadWikiStageSkills,projectRosterAudit,buildSkillDescriptors,makeSkillHandoff,readinessAudit,keyOfName,main};
