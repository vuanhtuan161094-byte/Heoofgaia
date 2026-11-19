'use strict';
/* Read existing Group02 large blueprint; output small campaign shards only. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const S=require('../data/ngoalong/modules/campaign/nl_campaign_shards_v1.js');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.join(ROOT,'data/ngoalong/modules/campaign/shards');
function main(args){
 const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
 const sourcePath=path.join(ROOT,'data/ngoalong/group02_wiki/wiki_dungeon_blueprints.json');
 const raw=fs.readFileSync(sourcePath);
 const source=JSON.parse(raw.toString('utf8'));
 const approved=read('data/ngoalong/modules/campaign/approved_bindings_v1.json');
 const report=read('data/ngoalong/group02_wiki/wiki_dungeon_builder_report.json');
 const out=S.build(source,approved,12);
 if(out.manifest.counts.maps!==report.mapCount||
   out.manifest.counts.npcRows!==report.npcDetailCount)
   throw Error('Wiki count changed: review before importing');
 out.manifest.blueprintSha256=crypto.createHash('sha256').update(raw).digest('hex');
 out.manifest.builderReportedSoldierNonmatches=report.soldierTotalContradictions;
 out.manifest.builderReportedUnverifiedFormations=report.unverifiedNpcFormationCount;
 out.manifest.blueprintFile='data/ngoalong/group02_wiki/wiki_dungeon_blueprints.json';
 const files=[
  ['manifest.json',JSON.stringify(out.manifest,null,2)+'\n'],
  ...out.shards.map(s=>[s.filename,JSON.stringify(s.body)+'\n'])
 ];
 if(!args.includes('--check'))fs.mkdirSync(DIR,{recursive:true});
 for(const [filename,content] of files){
   const target=path.join(DIR,filename);
   if(args.includes('--check')){
     if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)
       throw Error('stale/missing '+filename);
   }else fs.writeFileSync(target,content);
 }
 const wanted=new Set(files.map(x=>x[0]));
 for(const filename of fs.readdirSync(DIR)){
   if(/^shard-\d{3}\.json$/.test(filename)&&!wanted.has(filename)){
     if(args.includes('--check'))throw Error('stale shard '+filename);
     fs.rmSync(path.join(DIR,filename));
   }
 }
 console.log(JSON.stringify({maps:out.manifest.counts.maps,
  npcRows:out.manifest.counts.npcRows,
  ready:out.manifest.counts.mapsReadyForIntegration,
  shardCount:out.shards.length,check:args.includes('--check')}));
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(error){console.error(error.stack||String(error));process.exitCode=1}
}
module.exports={main};
