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

/** Chat 05 skill handoff: one unresolved descriptor bundle per general, not a second engine. */
function buildSkillDescriptors(profiles) {
  return profiles.map(p=>({
    heroId:p.id,edition:p.edition,sourceId:p.source.id,
    skillSlots:{normal:null,active:null,passive:[]},
    contract:{trigger:null,target:null,operation:null,probability:null,duration:null,moraleDelta:null,stacking:null,dispel:null,immunity:null},
    fieldProvenance:"UNKNOWN",status:"REFERENCE_ONLY",consumer:"CHAT_05",runtimeImport:false
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
  const profiles=materializeProfiles(index,refs);
  validateProfiles(profiles);
  const project=projectRosterAudit(alpha,profiles);
  return {index,profiles,inventory,project,readiness:readinessAudit(profiles),skillDescriptors:buildSkillDescriptors(profiles)};
}
function main(argv=process.argv.slice(2)) {
  const allowed=new Set(["--check","--export-skills"]);
  assert(argv.every(a=>allowed.has(a)), "usage: node tools/nl_hero_catalogue.js [--check] [--export-skills]");
  const result=loadCatalogue();
  if(argv.includes("--export-skills")){
    const filename=path.join(HERO_DIR,"skills_handoff_v1.json");
    fs.writeFileSync(filename,JSON.stringify({schemaVersion:1,edition:result.index.edition,sourceId:SOURCE,skills:result.skillDescriptors},null,2)+"\n");
  }
  console.log(JSON.stringify({inventory:result.inventory,project:result.project,readiness:result.readiness,skillBundles:result.skillDescriptors.length},null,2));
}
if(require.main===module){try{main();}catch(err){console.error(err.stack||String(err));process.exitCode=1;}}
module.exports={loadCatalogue,validateIndex,materializeProfiles,validateProfiles,projectRosterAudit,buildSkillDescriptors,readinessAudit,keyOfName,main};
