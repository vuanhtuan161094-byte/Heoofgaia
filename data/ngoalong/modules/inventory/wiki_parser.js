'use strict';
/* Public Wiki 674-item index parser. Lossless for visible names/category/level.
 * Never fabricates absent rows (including collapsed/empty groups).
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NLWikiItemsParser=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const COUNTS=Object.freeze({
  'Rương':323,'Vật Liệu':145,'Tài Nguyên':82,'Túi Phúc':64,
  'Ấn Thạch':27,'Danh Phẩm':17,'Bí Tịch':9,
  'Truyền Thừa Lệnh':1,'Lệnh':1,'Chìa Khóa':1,'Khác':4
 });
 const URL='https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham';
 function parse(text,checkedAt='2026-11-19'){
  if(typeof text!=='string')throw new Error('INVALID_WIKI_TEXT');
  const marker=/Tổng\s+(\d+)\s+vật phẩm/i.exec(text);
  if(!marker)throw new Error('WIKI_ITEM_TOTAL_MISSING');
  if(Number(marker[1])!==674)throw new Error('WIKI_ITEM_TOTAL_CHANGED');
  const portion=text.slice(marker.index+marker[0].length)
    .split(/CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG/i)[0];
  const lines=portion.split(/\r?\n/).map(s=>s.replace(/\s+/g,' ').trim())
    .filter(s=>s&&!/^Image:?\s*$/i.test(s));
  const rows=[],groupCounts={},keys=new Set();
  let group=null,subGroup=null;
  function add(name,level){
    if(!group)return;
    const clean=name.normalize('NFC').trim();
    if(!clean || clean.length>160||/^[\[\](){},]+$/.test(clean))return;
    const key=[group,subGroup,clean,level??''].join('\u001f');
    if(keys.has(key))throw new Error('DUPLICATE_WIKI_ITEM_ROW_'+clean);
    keys.add(key);
    rows.push({
      id:'wiki-item-index-'+String(rows.length+1).padStart(4,'0'),
      name:clean,sourceCategory:group,sourceGroup:subGroup||group,
      displayedLevel:level,sourceUrl:URL,sourceEdition:'VNG_WIKI_MOBILE_CURRENT',
      sourceKind:'public-index',integration:'REFERENCE_ONLY',
      stats:null,effectRule:null,acquisitionRule:null,
      fieldProvenance:{name:'VERIFIED',sourceCategory:'VERIFIED',
       sourceGroup:'VERIFIED',displayedLevel:level==null?'UNKNOWN':'VERIFIED',
       effectRule:'UNKNOWN',acquisitionRule:'UNKNOWN'},
      provenance:{classification:'VERIFIED',sourceId:'VNG_WIKI_ITEMS_PUBLIC_INDEX',
        checkedAt}
    });
    groupCounts[group]=(groupCounts[group]||0)+1;
    if(groupCounts[group]>COUNTS[group])throw new Error('CATEGORY_EXCEEDS_DECLARED_'+group);
  }
  for(const line of lines){
    if(line.startsWith('Image:'))continue;
    const category=/^\+?\s*(Rương|Vật Liệu|Tài Nguyên|Túi Phúc|Ấn Thạch|Danh Phẩm|Bí Tịch|Truyền Thừa Lệnh|Lệnh|Chìa Khóa|Khác)\s*\(?(\d+)\)?$/.exec(line);
    if(category&&Number(category[2])===COUNTS[category[1]]){
      group=category[1];subGroup=null;continue;
    }
    if(line.startsWith('+')){
      const sub=/^\+\s*(.*?)\s+(\d+)$/.exec(line);
      if(sub){subGroup=sub[1];continue}
    }
    if(!group)continue;
    const onlyLevel=/^Cấp\s+(\d+)$/.exec(line);
    if(onlyLevel){
      if(rows.length&&rows[rows.length-1].sourceCategory===group &&
        rows[rows.length-1].displayedLevel==null)
        rows[rows.length-1].displayedLevel=Number(onlyLevel[1]);
      continue;
    }
    const match=/^(.*?)\s+Cấp\s+(\d+)$/.exec(line);
    if(match)add(match[1],Number(match[2]));
    else if(!/^(\[Button:|\[Input:|Tất cả$|Vật Phẩm$|WIKI$|Chơi Ngay$|Tải APK$)/.test(line))
      add(line,null);
  }
  const covered=Object.fromEntries(Object.keys(COUNTS).map(k=>[k,groupCounts[k]||0]));
  const missing=Object.fromEntries(Object.entries(COUNTS).map(([k,v])=>[k,v-covered[k]]));
  if(rows.length>674)throw new Error('TOO_MANY_ITEMS');
  return {
    schemaVersion:1,sourceUrl:URL,sourceEdition:'VNG_WIKI_MOBILE_CURRENT',
    declaredCount:674,extractedCount:rows.length,checkedAt,
    rawTextOrigin:'Rendered public VNG Wiki body.innerText',
    reproducibility:'Names/categories from captured view, not generated from count',
    categoryCounts:COUNTS,extractedCounts:covered,missingCounts:missing,
    isIndexComplete:rows.length===674,
    sourceRules:{sourceEffectAuthority:false,statsFromWiki:false,
      noHiddenRecordsInvented:true,classicParity:'UNKNOWN'},
    rows
  };
 }
 return {parse,COUNTS,URL};
});
