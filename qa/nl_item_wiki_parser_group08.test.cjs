'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parse,parseSnapshots,COUNTS}=require('../data/ngoalong/modules/inventory/wiki_parser.js');
const footer='CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG';
function text(src){return 'WIKI\nTổng 674 vật phẩm\n'+src+'\n'+footer}
const block=(cat,count,sub,n,items)=>
 '+\n'+cat+'\n'+count+'\n+\n'+sub+'\n'+n+'\n'+items.join('\n');
test('01 folded Wiki headings and Quà Cấp 1 are parsed without name truncation',()=>{
 const result=parse(text(block('Rương',323,'Quà Cấp',39,
  ['Quà Cấp 1','Cấp 10','Quà Cấp 10 Cấp 140'])));
 assert.equal(result.rows.length,2);
 assert.equal(result.rows[0].name,'Quà Cấp 1');
 assert.equal(result.rows[0].displayedLevel,10);
 assert.equal(result.rows[0].fieldProvenance.displayedLevel,'VERIFIED');
 assert.equal(result.rows[1].name,'Quà Cấp 10');
 assert.equal(result.rows[1].displayedLevel,140);
 assert.equal(result.categoryCounts['Rương'],323);
});
test('02 missing Wiki categories never create names to satisfy advertised total',()=>{
 const item=parse(text(block('Vật Liệu',145,'Cùng Kỳ',5,
  ['Côn Ngô Huyền Thạch','Cấp 350'])));
 assert.equal(item.rows.length,1);
 assert.equal(item.extractedCount,1);
 assert.equal(item.missingCounts['Vật Liệu'],144);
 assert.equal(item.missingCounts['Rương'],323);
 assert.equal(item.rows[0].integration,'REFERENCE_ONLY');
 assert.equal(item.rows[0].effectRule,null);
});
test('03 all 11 categories in snapshots are deduplicated by source category and never synthetic',()=>{
 const payload={checkedAt:'2026-11-19T00:00:00Z',categorySnapshots:{
  'Rương':{body:text(block('Rương',323,'Quà Cấp',39,
    ['Quà Cấp 1','Cấp 10','Quà Cấp 2 Cấp 20']))},
  'Vật Liệu':{body:text(block('Vật Liệu',145,'Cùng Kỳ',5,
    ['Côn Ngô Huyền Thạch Cấp 350']))}
 }};
 const index=parseSnapshots(payload);
 assert.equal(index.extractedCount,3);
 assert.equal(index.missingCounts['Rương'],321);
 assert.equal(index.missingCounts['Vật Liệu'],144);
 assert.equal(index.rows[2].sourceCategory,'Vật Liệu');
 assert.equal(new Set(index.rows.map(x=>x.id)).size,3);
 assert.equal(Object.keys(COUNTS).length,11);
});
test('04 failed source total and malformed duplicated rows fail closed',()=>{
 assert.throws(()=>parse('Tổng 673 vật phẩm\n+x 1'),/WIKI_ITEM_TOTAL_CHANGED/);
 const repeated=parse(text(block('Rương',323,'Quà Cấp',39,
  ['Quà Cấp 1','Cấp 10','Quà Cấp 1 Cấp 10'])));
 assert.equal(repeated.rows.length,2);
 assert.equal(repeated.rows[0].name,repeated.rows[1].name);
 assert.equal(new Set(repeated.rows.map(x=>x.id)).size,2);
 assert.match(repeated.rows[1].id,/-2$/);
});
