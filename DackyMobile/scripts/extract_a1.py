#!/usr/bin/env python3
"""Data-only extractor for the public DackyVanTien legacy gameplay tables.
No executable, DLL, SQL server, account/player tables or credentials are downloaded.
Python 3.10+, standard library. Run on an authorized machine with internet:
  python extract_a1.py --fetch --output extracted
Or on existing authorized table files:
  python extract_a1.py --source /path/to/fswd-main --output extracted
The output is historical research data, not a verified Mobile runtime database.
"""
import argparse, hashlib, json, math, re, struct, urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

COMMIT='13d969fc88c141553535c70943aaa98cf9f86616'
BASE=f'https://raw.githubusercontent.com/chipdien/DackyVanTien/{COMMIT}/Server/MySQL_Server_5.0/data/fswd-main/'
TABLES='''namedinfo buildinfo technologyinfo resourcebuildlevelinfo managebuildlevelinfo technologylevelinfo technologyleveladdinfo buildrequireinfo 147-soldierinfo soldierinfo 147-soldierrequireinfo soldierrequireinfo 147-restraintinfo 147-restraintinfo-1 restraintinfo generallevelinfo generalgenguaddinfo generalrefreshlevellimitinfo famousgeneraliteminfo generalchestlistinfo strongpointinfo strongpointgeneralinfo specialgeneraliteminfo specialgengugeneralinfo 147-goodsinfo goodsinfo goodstrumpinfo goodschestlistinfo famouscitygeneralinfo 147-advfieldgeneralinfo advfieldgeneralinfo advfieldinfo 147-elflandfloorgeneralinfo elflandfloorgeneralinfo elflandfloorgeneralinfo_45 elflandfloorinfo elflandfloorinfo_45 elflandinfo elflandinfo_45 elflandfightgetgoodscfginfo buzhoumountainconfig buzhoumountainfightgetgoodscfginfo buzhoumountainfightgetzhuangbeicfginfo buzhoumountainfloorconfig buzhoumountaingeneralconfig fieldarmygenlevelinfo fieldexploreandlookforgoodscfginfo fieldfightgetgoodscfginfo fieldrandeventcfginfo fightgetgoodstimecfg mapfieldlevelinfo quest quest_20_11 questcondition theurgy upgradeexp metempsychosisconfiginfo guildskillconfig rampartlevelinfo rampartlevelrequireinfo defenceinfo defencerequireinfo officiallevelinfo officiallevelrequireinfo officialposinfo officialposrequireinfo officialpossalaryinfo dukeposinfo dukeposrequireinfo dukepossalaryinfo'''.split()
EXPECTED={'famousgeneraliteminfo':540,'namedinfo':55,'buildinfo':21,'technologyinfo':19,'resourcebuildlevelinfo':120,'managebuildlevelinfo':450,'technologylevelinfo':570,'technologyleveladdinfo':570,'buildrequireinfo':7565,'147-soldierinfo':39,'soldierinfo':40,'147-soldierrequireinfo':126,'soldierrequireinfo':201,'147-restraintinfo':430,'generallevelinfo':100,'147-goodsinfo':2155,'goodsinfo':2157,'goodstrumpinfo':156,'famouscitygeneralinfo':375,'theurgy':18,'147-advfieldgeneralinfo':25,'specialgeneraliteminfo':4,'quest':1158,'questcondition':5745,'mapfieldlevelinfo':65,'rampartlevelinfo':30}

def n(b,p,l,order='little',signed=False):
    if p<0 or p+l>len(b): raise ValueError(f'field out of bounds: {p}+{l}/{len(b)}')
    return int.from_bytes(b[p:p+l],order,signed=signed)

def digest(b): return hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()

def layout(frm,idx):
    if idx[:4]!=b'\xfe\xfe\x07\x01': raise ValueError('unsupported index signature')
    seq=max(re.findall(rb'\xff(?:[A-Za-z_][A-Za-z0-9_]*\xff)+',frm),key=lambda s:s.count(b'\xff'))
    names=[s.decode('ascii') for s in seq.split(b'\xff') if s]
    pos=frm.index(seq)-17*len(names)
    cols=[{'name':name,'type':frm[pos+17*i+13],'flags':n(frm,pos+17*i+8,2)} for i,name in enumerate(names)]
    phys=[c for c in cols if c['type']!=16]
    end=n(idx,6,2,'big'); start=end-7*(len(phys)+1)
    ds=[(n(idx,p,2,'big'),n(idx,p+2,2,'big'),idx[p+4],n(idx,p+5,2,'big')) for p in range(start,end,7)]
    if ds[0][0]!=0 or any(t not in (0,3,8) or l<=0 for t,l,_,_ in ds): raise ValueError(f'unsupported descriptor layout {ds}')
    # MyISAM column type 3 = zero-suppressed fixed-width; type 8 = varchar.
    # The null bitmap is separate from the compression bitmap.
    if any(c['type'] not in (1,2,3,4,5,8,9,13,15,16,253,254) for c in cols): raise ValueError('unsupported SQL field type')
    return cols,phys,ds

def blocks(b):
    p=0
    while p<len(b):
        t=b[p]; length=n(b,p+1,2,'big')
        if t not in (1,3): raise ValueError(f'unsupported/deleted/chained block type {t} at {p}')
        h=4 if t==3 else 3; pad=b[p+3] if t==3 else 0; end=p+h+length
        if length==0 or end+pad>len(b): raise ValueError(f'bad block at {p}')
        yield b[p+h:end]; p=end+pad

def decode_table(table,frm,idx,data):
    cols,phys,ds=layout(frm,idx); count=n(idx,28,8,'big')
    if table in EXPECTED and count!=EXPECTED[table]: raise ValueError(f'index count changed {count}')
    if not count:
        if data: raise ValueError('empty index but nonempty data')
        return [],cols,'empty'
    if not data: raise ValueError('nonempty index but empty data')
    width=sum(x[1] for x in ds); fixed=not any(t==8 for t,*_ in ds) and len(data)==count*width
    packed=0 if fixed else (sum(t==3 for t,*_ in ds)+7)//8
    records=(data[i:i+width] for i in range(0,len(data),width)) if fixed else blocks(data)
    out=[]
    for i,b in enumerate(records):
        p=packed+ds[0][1]; nb=b[packed:p]; k=0; row={}
        if p>len(b): raise ValueError('missing record bitmap')
        for c,(t,l,bit,null_pos) in zip(phys,ds[1:]):
            skip=False
            if t==3 and not fixed:
                skip=bool(b[k//8]&(1<<(k%8))); k+=1
            if skip: val=0
            elif t==8:
                size=n(b,p,1);p+=1
                if l-1>255 and size==255: size=n(b,p,2,'big');p+=2
                if p+size>len(b) or size>l-1: raise ValueError(f'bad string {c["name"]} row {i}')
                val=b[p:p+size].decode('utf-8');p+=size
            else:
                typ=c['type'];raw=b[p:p+l]
                if len(raw)!=l: raise ValueError('truncated numeric')
                if typ in (4,5):
                    val=struct.unpack('<f' if typ==4 else '<d',raw)[0]
                    if not math.isfinite(val): raise ValueError('nonfinite float')
                else: val=n(b,p,l,signed=bool(c['flags']&1) and typ in (1,2,3,8,9))
                p+=l
            if bit and null_pos>=len(nb):raise ValueError('bad null position')
            row[c['name']]=None if bit and nb[null_pos]&bit else val
        bitcols=[c for c in cols if c['type']==16]
        if bitcols:
            if table in ('goodsinfo','147-goodsinfo') and [c['name'] for c in bitcols]==['GiftCertificateBuy']:
                row['GiftCertificateBuy']=None if nb[0]&16 else bool(nb[0]&32)
            else: raise ValueError('unverified BIT column layout')
        if p!=len(b):raise ValueError(f'row {i}: decoded {p} of {len(b)} bytes')
        out.append(row)
    if len(out)!=count:raise ValueError(f'index/data count mismatch {count}/{len(out)}')
    return out,cols,'fixed' if fixed else 'dynamic'

def read_file(source,table,ext,fetch):
    name=table+'.'+ext;p=source/name
    if not p.exists() and fetch:
        req=urllib.request.Request(BASE+name,headers={'User-Agent':'Dacky-legacy-data-research/1.0'})
        with urllib.request.urlopen(req,timeout=45) as resp: b=resp.read(32*1024*1024+1)
        if len(b)>32*1024*1024:raise ValueError('size limit exceeded')
        p.write_bytes(b)
    return p.read_bytes()

def run(source,out,fetch,tables):
    source.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
    manifest={'source_commit':COMMIT,'status':'LEGACY_NOT_MOBILE_VERIFIED','tables':{}}
    def work(t):
        dest=out/(t+'.json')
        try:
            frm,idx,data=[read_file(source,t,ext,fetch) for ext in ('frm','MYI','MYD')]
            rows,cols,mode=decode_table(t,frm,idx,data)
            payload={'table':t,'source_commit':COMMIT,'source_git_blob_sha1':digest(data),'schema':cols,'records':rows,'status':'LEGACY_NOT_MOBILE_VERIFIED'}
            tmp=dest.with_suffix('.tmp');tmp.write_text(json.dumps(payload,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8');tmp.replace(dest)
            return t,{'status':'DECODED','rows':len(rows),'fields':len(cols),'mode':mode,'data_sha1':digest(data),'frm_sha1':digest(frm),'index_sha1':digest(idx)}
        except Exception as e:
            return t,{'status':'HOLD','error':str(e)}
    with ThreadPoolExecutor(max_workers=3) as ex:
        for t,m in ex.map(work,tables):
            manifest['tables'][t]=m;print(t,m,flush=True)
    manifest['decoded_rows']=sum(x.get('rows',0) for x in manifest['tables'].values());manifest['decoded_tables']=sum(x['status']=='DECODED' for x in manifest['tables'].values())
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1]/'input-private'/'legacy_table_cache');p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'input-private'/'extracted');p.add_argument('--fetch',action='store_true');p.add_argument('--tables',nargs='*',choices=TABLES);a=p.parse_args();run(a.source,a.output,a.fetch,a.tables or TABLES)
