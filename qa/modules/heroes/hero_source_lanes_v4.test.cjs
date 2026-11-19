"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const v4=require("../../../data/ngoalong/modules/heroes/hero_source_lanes_v4.js");
const root=path.resolve(__dirname,"../../../data/ngoalong/modules/heroes");
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),"utf8"));
const base=read("hero_evidence_matrix_v3.json");
const classic=read("archive_wei_2012_2013_v1.json");
const recruits=read("mobile_recruitment_guide_2022_v1.json");
const purple=read("wei_quan_purple_2019_v1.json");
const matrix=v4.createV4({base,classic,recruitment:recruits,purple});
let tests=0;
const test=(name,fn)=>{fn();tests++;console.log("PASS HERO_SOURCE_V4: "+name);};
const byName=name=>matrix.entries.find(x=>x.name===name);
test("364 distinct Wiki hero records",()=>{
 assert.equal(matrix.entries.length,364);
 assert.equal(new Set(matrix.entries.map(x=>x.heroId)).size,364);
});
test("41 classic Wei source rows, 21 tower and 20 renown",()=>{
 assert.equal(classic.recordCount,41);
 assert.deepEqual(classic.byMethod,{TRIAL_TOWER:21,RENOWN:20});
});
test("18 source gaps split 12 exact, 3 aliases, 3 no sources",()=>{
 assert.deepEqual(matrix.audit.archivalWeiBacklog,{EXACT_NAME_ARCHIVAL_FACTS:12,ALIAS_REVIEW:3,NOT_FOUND:3});
 assert.equal(matrix.review.wei18.length,18);
});
test("mobile and classic evidence is not conflated",()=>{
 assert.equal(matrix.counts.MOBILE_DETAIL_EXISTING,134);
 assert.equal(matrix.counts.MOBILE_RECRUITMENT_ONLY,8);
 assert.equal(matrix.counts.CLASSIC_ARCHIVE_ONLY,13);
 assert.equal(matrix.counts.INDEX_ONLY,209);
 assert.equal(matrix.audit.mobileDetailWithRecruitment,142);
 assert.equal(matrix.audit.withAnyDatedHistoricalSource,155);
});
test("Wei 12 exact archive candidates do not become Mobile authoritative",()=>{
 const wei=matrix.entries.filter(x=>x.faction==="Ngụy");
 assert.equal(wei.length,40);
 assert.equal(wei.filter(x=>x.hasPublishedMobileDetail).length,22);
 assert.equal(wei.filter(x=>x.hasAnyHistoricalDetail).length,34);
 assert.equal(wei.filter(x=>x.sourceResearchClass==="CLASSIC_ARCHIVE_ONLY").length,12);
});
test("Tào Phi historical renown cost is not a currency transaction",()=>{
 const x=byName("Tào Phi");
 const a=x.evidenceLanes.classicBase2012_2013.find(x=>x.sourceName==="Tào Phi");
 assert.equal(a.acquisition.type,"RENOWN");
 assert.equal(a.acquisition.requiredRenown,5000);
 assert.equal(a.baseSkillName,"Công tâm");
 assert.equal(x.playable,false);
 assert.equal(x.currentMobileEquippedSkill,null);
});
test("Tào Hưu historic tower facts retain all six numerical stats",()=>{
 const a=byName("Tào Hưu").evidenceLanes.classicBase2012_2013.find(x=>x.sourceName==="Tào Hưu");
 assert.deepEqual(a.attributes,{leadership:79,martial:81,intelligence:43});
 assert.deepEqual(a.rebirthGrowth,{leadership:2.1,martial:2.3,intelligence:1.2});
 assert.equal(a.acquisition.minFloor,5);
});
test("three misspelled names are not mapped to a different identity",()=>{
 assert.deepEqual(matrix.review.unresolvedClassicAliases.map(x=>x.wikiName),["Hách Chiêu","Hí Chí Tài","Lạc Tiến"]);
 assert(matrix.review.unresolvedClassicAliases.every(x=>x.approved===false));
 assert.equal(byName("Hách Chiêu").evidenceLanes.classicBase2012_2013.length,0);
});
test("unavailable Li Dien, Wang Shuang and Nghiem Chinh remain unsupported",()=>{
 for(const name of ["Lý Điển","Vương Song","Nghiêm Chính"]){
  const x=byName(name);
  assert.equal(x.sourceResearchClass,"INDEX_ONLY");
  assert.equal(x.hasPublishedMobileDetail,false);
 }
});
test("2022 official Mobile recruits: seven new Quan plus one neutral",()=>{
 assert.equal(matrix.audit.linkedMobileRecruitmentFacts,11);
 assert.equal(matrix.byFaction["Quần"].mobileDetail,49);
 assert.equal(matrix.byFaction["Trung lập"].mobileDetail,1);
 assert.equal(byName("Hứa Cống").sourceResearchClass,"MOBILE_RECRUITMENT_ONLY");
});
test("Bùi Nguyên Thiệu source label exact and unknown probability",()=>{
 const r=byName("Bùi Nguyên Thiệu").evidenceLanes.mobile2022Recruitment[0];
 assert.equal(r.mechanicLabel,"Thiết bích");
 const src=recruits.records.find(x=>x.sourceFactId===r.factId);
 assert.equal(src.exactRecruitCost,null);
 assert.equal(src.probability,null);
});
test("purple archive holds 4 typed non-executable skills",()=>{
 assert.equal(matrix.audit.purpleClassicSkills,4);
 assert.equal(byName("Tào Phi").evidenceLanes.classicPurple2019[0].skillName,"Uy Áp");
 assert.equal(byName("Trương Ninh").evidenceLanes.classicPurple2019[0].skillName,"Quỷ Cốc Di Kế");
 assert(purple.records.every(x=>x.executable===false));
});
test("unknown historic purple damage coefficient remains null",()=>{
 const x=byName("Tào Phi").evidenceLanes.classicPurple2019[0];
 assert(x.events.some(e=>e.op==="DAMAGE_UNQUANTIFIED"&&e.coefficientPct===null));
});
test("no unsupported aliases applied from mobile 2022",()=>{
 assert.deepEqual(matrix.review.unresolvedMobileRecruitmentNames.map(x=>x.name),["Lương Nhan","Phong Điền","Mê Đang"]);
 assert.equal(byName("Mê Đương").evidenceLanes.mobile2022Recruitment.length,0);
});
test("all source lanes nonplayable, all current stats unknown",()=>{
 assert(matrix.entries.every(x=>x.playable===false&&x.verifiedCurrentMobileStats===false&&x.currentMobileEquippedSkill===null&&x.crossEditionParity==="UNKNOWN"));
});
test("negative: wrong 2012 tower source URL rejected",()=>{
 const wrong=structuredClone(classic);wrong.records[0].sourceUrl="https://example.com";
 assert.throws(()=>v4.createV4({base,classic:wrong,recruitment:recruits,purple}),/source URL\/date/);
});
test("negative: illegal 2012 combat activation rejected",()=>{
 const wrong=structuredClone(classic);wrong.records[0].combatExecutable=true;
 assert.throws(()=>v4.createV4({base,classic:wrong,recruitment:recruits,purple}),/must not bind Mobile runtime/);
});
test("negative: wrong 2022 name-to-Wiki ID rejected",()=>{
 const wrong=structuredClone(recruits);wrong.records[0].wikiCandidateIds=["wiki-mobile-hero-001"];
 assert.throws(()=>v4.createV4({base,classic,recruitment:wrong,purple}),/improper recruitment alias binding/);
});
test("negative: 2019 null coefficient cannot become fabricated",()=>{
 const wrong=structuredClone(purple);wrong.records[0].events[0].coefficientPct=999999;
 assert.throws(()=>v4.createV4({base,classic,recruitment:recruits,purple:wrong}),/unknown coefficient replaced with invention/);
});
test("V4 matrix committed snapshot reproduces byte-for-byte",()=>{
 const saved=fs.readFileSync(path.join(root,"hero_source_evidence_matrix_v4.json"),"utf8");
 assert.equal(saved,JSON.stringify(matrix,null,2)+"\n");
});
console.log("HERO_SOURCE_V4 "+tests+"/"+tests+" PASS - source-only");
