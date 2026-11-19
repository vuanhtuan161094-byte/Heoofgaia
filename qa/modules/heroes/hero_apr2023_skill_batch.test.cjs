"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const dir=path.resolve(__dirname,"../../../data/ngoalong/modules/heroes");
const pack=JSON.parse(fs.readFileSync(path.join(dir,"wiki_orange_skills_2023_apr_v1.json"),"utf8"));
const idx=JSON.parse(fs.readFileSync(path.join(dir,"wiki_catalogue_v1.json"),"utf8"));
const matrix=JSON.parse(fs.readFileSync(path.join(dir,"hero_evidence_matrix_v3.json"),"utf8"));
let tests=0;
function check(name,fn){fn();tests++;console.log("PASS HERO_APR23: "+name);}
const find=(name,stage="ORANGE")=>pack.records.find(r=>r.name===name&&r.stage===stage);
check("19 original dated skill records",()=>assert.equal(pack.count,19));
check("all stage skills reference exact unique existing Wiki ID",()=>{
 for(const s of pack.records){
  const refs=idx.heroes.filter(h=>h.name===s.name);
  assert.equal(refs.length,1);assert.equal(refs[0].id,s.heroId);
  assert.equal(s.runtimeEligible,false);
  assert.equal(s.currentVersionVerified,false);
 }
});
check("2023 official source and date are consistent",()=>{
 assert.equal(pack.sourceDate,"2023-04-08");
 for(const r of pack.records){assert.equal(r.sourceDate,pack.sourceDate);assert.equal(r.sourceUrl,pack.sourceUrl);}
});
check("Tào Hồng 14000 TACTIC plus self HEAL 2x20",()=>{
 const r=find("Tào Hồng");assert(r);
 assert(r.events.some(e=>e.op==="DAMAGE"&&e.pct===14000&&e.lane==="TACTIC"));
 assert(r.events.some(e=>e.op==="HEAL"&&e.pct===20&&e.hits===2));
});
check("Nhan Lương 6000 tactic and 2-turn bounty",()=>{
 const r=find("Nhan Lương");assert(r);
 assert(r.events.some(e=>e.op==="DAMAGE"&&e.pct===6000));
 assert(r.events.some(e=>e.op==="STATUS"&&e.name==="Treo Thưởng"&&e.turns===2&&e.dispel===false));
});
check("Văn Sửu 500 morale cost and 5 strikes",()=>{
 const r=find("Văn Sửu");assert(r);
 assert(r.events.some(e=>e.op==="MORALE_COST"&&e.amount===500));
 assert(r.events.some(e=>e.op==="DAMAGE"&&e.pct===9000&&e.hits===5));
});
check("Văn Sính 15000 tactical and two team heals",()=>{
 const r=find("Văn Sính");assert(r);
 assert(r.events.some(e=>e.op==="DAMAGE"&&e.pct===15000));
 assert(r.events.some(e=>e.op==="HEAL"&&e.pct===20&&e.hits===2));
});
check("Mã Vân Lộc maintains distinct 10000 and twice 13000",()=>{
 const r=find("Mã Vân Lộc");assert(r);
 assert.deepEqual(r.events.filter(x=>x.op==="DAMAGE").map(x=>[x.pct,x.hits]),[[10000,1],[13000,2]]);
});
check("Trần Cung RED/PURPLE/ORANGE variants never collapsed",()=>{
 assert.deepEqual(pack.records.filter(x=>x.name==="Trần Cung").map(x=>x.stage),["RED","PURPLE","ORANGE"]);
});
check("five newly sourced generals are no longer INDEX_ONLY",()=>{
 for(const name of ["Tào Hồng","Nhan Lương","Văn Sửu","Văn Sính","Mã Vân Lộc"]){
  const entry=matrix.entries.find(x=>x.name===name);
  assert(entry);assert.notEqual(entry.researchState,"INDEX_ONLY");
  assert.equal(entry.playable,false);
 }
});
check("snapshot totals: 134 detailed, 230 index-only",()=>{
 assert.equal(matrix.groupCount.INDEX_ONLY,230);
 assert.equal(matrix.entries.length-matrix.groupCount.INDEX_ONLY,134);
});
console.log("HERO_APR23 "+tests+"/"+tests+" PASS (source and snapshot QA only)");
