/* HG50-A — Real Boss expedition progression, additive within Save v07.
 * No second battle engine, no pseudo-victories, no free loot or extra HTML.
 * Boss T11->T12->T13 become one-time quest milestones; the old Boss screen
 * remains independently available for unrestricted normal PvE.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E?.hg409Preview||!E?.hg410EncounterPreview||!E?.hg47Status||E.V!==7)
 throw Error('HG50-A requires HG41/HG47, HG40.9 and Save v07');
const TIERS=Object.freeze([11,12,13]);
// Memoize world target lookup; do not scan/sort the entire tile catalog on
// every Boss-screen rerender or every phone economy tick.
const ROUTE_TILES=Object.freeze(TIERS.map(tier=>
 E.TILES.filter(t=>t.kind==='npc'&&t.eliteTier===tier)
   .sort((a,b)=>a.key.localeCompare(b.key))[0]||null
));
const old={make:E.make,parse:E.parseSave,strict:E.strictSave,battleAct:E.battleAct};
const fresh=()=>({v:1,unlocked:1,completed:[]});
function ensure(s){if(!s.hg50)s.hg50=fresh();return s.hg50;}
function valid(s){
 const q=s.hg50;
 if(q===undefined)return true; // legacy Save v07 before parse/migration
 if(!q||q.v!==1||!Array.isArray(q.completed)||!Number.isInteger(q.unlocked)
    ||q.completed.length>3||q.unlocked!==q.completed.length+1)return false;
 if(Object.keys(q).sort().join(',')!=='completed,unlocked,v')return false;
 return q.completed.every((tier,i)=>tier===TIERS[i]);
}
function status(s){
 const q=s.hg50||fresh();
 return {v:1,unlocked:q.unlocked,completed:q.completed.slice(),done:q.completed.length===3,
   stages:TIERS.map((tier,i)=>{
    const tile=ROUTE_TILES[i];
    const p=tile?E.hg409Preview('npc',tile.key):null;
    const layout=tile?E.hg410EncounterPreview('npc',tile.key):null;
    return {stage:i+1,tier,target:tile?.key||null,name:tile?.value||tile?.name||'Boss T'+tier,
      cs:p?.cs||0,stacks:layout?.stacks||0,completed:i<q.completed.length,
      unlocked:i+1<=q.unlocked};
   })};
}
function battleAct(s,action,options){
 // Capture the ACTUAL battle before the original engine settles and removes it.
 const b=s.battle;
 const tile=b?.kind==='npc'?E.getTile(b.target):null;
 const tier=tile?.eliteTier;
 const target=b?.target;
 const result=old.battleAct(s,action,options);
 if(result?.type!=='win'||!TIERS.includes(tier)||!target)return result;
 const q=ensure(s);
 const expected=TIERS[q.completed.length];
 if(tier!==expected)return result; // unrelated repeat/later Boss: existing rewards unchanged
 q.completed.push(tier);
 q.unlocked=q.completed.length+1;
 E.note(s,'🧭 Viễn Chinh: hoàn tất chặng '+q.completed.length+'/3 bằng chiến thắng Boss T'+tier+
  ' tại '+target+'. Phần thưởng vẫn do hệ thống Boss gốc quyết toán.');
 return {...result,hg50Stage:tier};
}
function make(...args){const s=old.make(...args);ensure(s);return s;}
function parse(...args){const s=old.parse(...args);ensure(s);if(!valid(s))throw Error('HG50 Save v07 hỏng');return s;}
function strict(s){return old.strict(s)&&valid(s);}
Object.assign(E,{make,parseSave:parse,strictSave:strict,valid:strict,battleAct,
 hg50Status:status,hg50Valid:valid,hg50Tiers:TIERS});
root.HOG_HG50=Object.freeze({version:1,save:7,stages:3,rewards:'existing-authoritative-only'});
})(typeof globalThis!=='undefined'?globalThis:this);
