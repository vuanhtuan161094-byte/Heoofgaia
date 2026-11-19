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
 // Stable across partial/full rescans: no sequence-number IDs that rekey Save.
 function stableId(category,group,name,level){
   const sig=[category,group,name,level??''].join('|').normalize('NFC');
   let a=2166136261,b=5381;
   for(let i=0;i<sig.length;i++){
     const c=sig.charCodeAt(i);
     a=Math.imul(a^c,16777619)>>>0;
     b=(Math.imul(b,33)^c)>>>0;
   }
   return 'wiki-item-index-'+a.toString(16).padStart(8,'0')+
      b.toString(16).padStart(8,'0');
 }
 function parse(text,checkedAt='2026-11-19'){
  if(typeof text!=='string')throw new Error('INVALID_WIKI_TEXT');
  const marker=/Tổng\s+(\d+)\s+vật phẩm/i.exec(text);
  if(!marker)throw new Error('WIKI_ITEM_TOTAL_MISSING');
  if(Number(marker[1])!==674)throw new Error('WIKI_ITEM_TOTAL_CHANGED');
  const portion=text.slice(marker.index+marker[0].length)
    .split(/CÔNG TY CỔ PHẦN TẬP ĐOÀN VNG/i)[0];
  const normalized=portion.replace(/^[+−-][ \t]*\r?\n[ \t]*([^\r\n]+)[ \t]*\r?\n[ \t]*(\d+)[ \t]*$/gm,
    (_,label,num)=>'+'+label.trim()+' '+num);
  const lines=normalized.split(/\r?\n/).map(s=>s.replace(/\s+/g,' ').trim())
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
      id:stableId(group,subGroup||group,clean,level),
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
        rows[rows.length-1].displayedLevel==null){
         const last=rows[rows.length-1];
         keys.delete([last.sourceCategory,last.sourceGroup,last.name,''].join('\u001f'));
         const level=Number(onlyLevel[1]);
         const key=[last.sourceCategory,last.sourceGroup,last.name,level].join('\u001f');
         if(keys.has(key))throw Error('DUPLICATE_WIKI_ITEM_ROW_'+last.name);
         keys.add(key);
         last.displayedLevel=level;
         last.id=stableId(last.sourceCategory,last.sourceGroup,last.name,level);
         last.fieldProvenance.displayedLevel='VERIFIED';
      }
      continue;
    }
    // "Quà Cấp 1" is the item NAME; "Quà Cấp 1 Cấp 10" carries an actual displayed level.
    if(/^Quà Cấp \d+$/.test(line)){add(line,null);continue}
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
 function parseSnapshots(payload){
   const snapshots=payload?.categorySnapshots;
   if(!snapshots||typeof snapshots!=='object')throw Error('NO_CATEGORY_SNAPSHOTS');
   const rows=[],extractedCounts={},rawHashes={};
   for(const [category,declared] of Object.entries(COUNTS)){
     const source=snapshots[category]?.body;
     if(typeof source!=='string')continue;
     const parsed=parse(source,payload.checkedAt?.slice(0,10)||'2026-11-19');
     const candidate=parsed.rows.filter(x=>x.sourceCategory===category);
     if(candidate.length>declared)throw Error('CATEGORY_EXCESS_'+category);
     for(const row of candidate){
       const finalRow={...row};
       rows.push(finalRow);
     }
     extractedCounts[category]=candidate.length;
   }
   if(rows.length>674)throw Error('SNAPSHOTS_TOO_LARGE');
   return {
    schemaVersion:1,sourceUrl:URL,sourceEdition:'VNG_WIKI_MOBILE_CURRENT',
    declaredCount:674,extractedCount:rows.length,
    checkedAt:payload.checkedAt?.slice(0,10)||'2026-11-19',
    categoryCounts:COUNTS,
    extractedCounts:Object.fromEntries(Object.keys(COUNTS).map(k=>[k,extractedCounts[k]||0])),
    missingCounts:Object.fromEntries(Object.entries(COUNTS).map(([k,n])=>[k,n-(extractedCounts[k]||0)])),
    isIndexComplete:rows.length===674,
    sourceRules:{sourceEffectAuthority:false,statsFromWiki:false,
      noHiddenRecordsInvented:true,classicParity:'UNKNOWN'},
    origin:'LIVE_PLAYWRIGHT_EXPANDED_CATEGORY_SNAPSHOTS',
    rows
   };
 }
 return {parse,parseSnapshots,stableId,COUNTS,URL};
});
