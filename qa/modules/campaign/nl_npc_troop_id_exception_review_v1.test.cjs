'use strict';
/* CHAT06: source-only numeric evidence contract; never enable gameplay. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {test}=require('node:test');
const base=path.join(__dirname,'../../../data/ngoalong/modules/campaign');
const read=n=>JSON.parse(fs.readFileSync(path.join(base,n),'utf8'));
const review=read('npc_troop_id_evidence_review_v1.json');
const crosswalk=read('npc_numeric_troop_crosswalk_v2.json');
test('Every numeric exception remains traced to the original source crosswalk',()=>{
  assert.equal(review.authority,'RESEARCH_ONLY');
  assert.equal(review.runtimeEnabled,false);
  assert.equal(review.sourceEdition,crosswalk.sourceEdition);
  assert.equal(review.rows.length,44);
  assert.equal(review.totals.ambiguous,9);
  assert.equal(review.totals.missingCatalogue,35);
  assert.equal(review.totals.chestLabeled,11);
  assert.equal(review.totals.unitOccurrences,851);
  const expected=crosswalk.records.filter(x=>x.catalogueStatus!=='EXACT_UNIQUE_NAME_CANDIDATE');
  assert.equal(expected.length,44);
  const index=new Map(expected.map(x=>[x.wikiTroopId,x]));
  assert.equal(new Set(review.rows.map(x=>x.wikiTroopId)).size,44);
  for(const x of review.rows){
    const y=index.get(x.wikiTroopId);
    assert.ok(y,'unknown Wiki numeric ID: '+x.wikiTroopId);
    assert.equal(x.wikiName,y.wikiTroopName);
    assert.equal(x.observedInNpcFormations,y.occurrences);
    assert.deepEqual(x.chat02CandidateIds,y.chat02CandidateIds);
    assert.deepEqual(x.duplicateNumericIdsForName,y.otherNumericIdsSameName);
    assert.deepEqual(x.sourceNpcExamples,y.sourceExamples);
    assert.equal(x.triageClass==='AMBIGUOUS_VARIANT',y.catalogueStatus==='CHAT02_NAME_AMBIGUOUS');
  }
});
test('No evidence inflation and no numeric-to-runtime identity approval',()=>{
  assert.equal(review.totals.newIndependentlyVerifiedNumericJoins,0);
  assert.equal(review.totals.approvedForChat08,0);
  assert.deepEqual(review.gate.chat08AllowedMappings,[]);
  assert.deepEqual(review.gate.blockedNumericIds,[...review.rows.map(x=>x.wikiTroopId)]);
  assert.equal(review.gate.runtimeChangesAllowed,false);
  for(const r of review.rows){
    assert.equal(r.independentNpcNumericIdentityEvidence,'NOT_OBTAINED');
    assert.equal(r.numericToChat02CandidateConfirmed,false);
    assert.equal(r.approvedChat02TroopId,null);
    assert.equal(r.approvedRuntimeTroopId,null);
    assert.equal(r.promotedForChat08,false);
    assert.equal(r.npcOnlyConfirmed,false);
    assert.equal(r.recruitableConfirmed,false);
    if(r.triageClass==='AMBIGUOUS_VARIANT'){
      assert.equal(r.independentCatalogueEvidence.independentlyVerifiedField,'DUPLICATED_NAME_AND_VARIANT_CONTEXT_ONLY');
      assert.equal(r.alternateEditionEvidence.numericIdCorrespondence,'NOT_PROVEN');
    } else {
      assert.equal(r.independentCatalogueEvidence,null);
    }
  }
});
