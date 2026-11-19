'use strict';
const fs=require('node:fs'),path=require('node:path');
const R=require('../data/ngoalong/modules/campaign/nl_campaign_readiness_v1.js');
const ROOT=path.resolve(__dirname,'..');
const PREFIX='data/ngoalong/modules/campaign/source_shards/';
const OUT='data/ngoalong/modules/campaign/source_readiness_v1.json';
function main(args){
 const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
 const manifest=read(PREFIX+'manifest.json');
 const files=[...new Set(Object.values(manifest.mapLocator).map(x=>x.shard))].sort();
 if(files.length!==manifest.shardCount)throw Error('missing source shards');
 const result=R.produce(manifest,files.map(name=>read(PREFIX+name)));
 const content=JSON.stringify(result,null,2)+String.fromCharCode(10);
 const target=path.join(ROOT,OUT);
 if(args.includes('--check')){
   if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)
     throw Error('stale readiness report');
 } else fs.writeFileSync(target,content,'utf8');
 console.log(JSON.stringify(result.counts));
}
if(require.main===module){
 try {main(process.argv.slice(2));}
 catch(e){console.error(e.stack||String(e));process.exitCode=1;}
}
module.exports={main};
