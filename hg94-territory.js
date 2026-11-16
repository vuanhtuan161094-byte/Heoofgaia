/* HG94 — Sparse territorial conquest, real battles and resource farming.
 * Every passable, vacant land square is an interactable conquest/raid target.
 * This is an OFFLINE gameplay module. Networking must be server-authoritative.
 */
(function(root){'use strict';
const E=root.HOG_ENGINE;
if(!E||E.V!==7||E.WIDTH!==200||E.HEIGHT!==200)throw Error('HG94 requires HG93 / Save v07');
const prev={make:E.make,parse:E.parseSave,serialize:E.serializeSave,strict:E.strictSave,battleAct:E.battleAct};
const index=t=>t.y*E.WIDTH+t.x;
const territory=t=>!!t&&t.kind==='empty'&&t.terrain!=='water';
const homeIndex=key=>{const t=E.getTile(key);if(!t||t.kind!=='castle')throw Error('Không có thành xuất phát');return index(t)};
function ensure(s){
 if(s.hg94===undefined)s.hg94={version:1,claims:[]};
 if(!s.hg94||s.hg94.version!==1||!Array.isArray(s.hg94.claims))throw Error('Dữ liệu lãnh thổ HG94 hỏng');
 return s.hg94;
}
function lookup(claims,idx){
 let lo=0,hi=claims.length;while(lo<hi){const mid=(lo+hi)>>1;
  if(claims[mid][0]<idx)lo=mid+1;else hi=mid}
 return {at:lo,found:lo<claims.length&&claims[lo][0]===idx};
}
function isClaimed(s,key){
 const t=E.getTile(key);if(!territory(t))return false;
 const claims=ensure(s).claims;
 return lookup(claims,index(t)).found;
}
function quote(s,key){
 const t=E.getTile(key);
 if(!t)return {available:false,reason:'Ngoài bản đồ'};
 if(!territory(t))return {available:false,reason:t.terrain==='water'?'Đường thủy chưa có hạm đội':'Ô này đã có địa điểm riêng'};
 const h=ensure(s),i=index(t),where=lookup(h.claims,i),row=where.found?h.claims[where.at]:null;
 const [resource,income]=t.terrain==='forest'?['wood',2]:
   t.terrain==='hill'?['ore',2]:
   t.terrain==='plain'||t.terrain==='road'?['gold',3]:[null,0];
 return {available:true,key:t.key,terrain:t.terrain,owned:!!row,
  homeKey:row?E.TILES[row[1]]?.key:null,
  action:row?'territory-farm':'territory',resource,income,apCost:8,
  level:Math.min(8,1+Math.floor((t.x+t.y)/38)),territories:h.claims.length};
}
function valid(s){
 const h=s?.hg94;
 if(h===undefined)return true; // Existing unmodified v07 saves upgrade on parse.
 if(!h||h.version!==1||!Array.isArray(h.claims)||h.claims.length>40000)return false;
 let previous=-1;
 for(const pair of h.claims){
  if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isSafeInteger))return false;
  const [cell,owner]=pair;
  if(cell<=previous||cell<0||cell>=E.TILES.length||owner<0||owner>=E.TILES.length)return false;
  if(!territory(E.TILES[cell])||E.TILES[owner].kind!=='castle'||!s.cities.some(c=>c.key===E.TILES[owner].key))return false;
  previous=cell;
 }
 return true;
}
function make(...args){const s=prev.make(...args);ensure(s);return s}
function parse(...args){const s=prev.parse(...args);ensure(s);
 if(!valid(s))throw Error('Save v07 chứa lãnh thổ không hợp lệ');return s}
function strict(s){return prev.strict(s)&&valid(s)}
function serialize(s){ensure(s);if(!strict(s))throw Error('HG94 không thể xuất Save v07 hỏng');return prev.serialize(s)}
function battleAct(s,...args){
 const b=s.battle,action=b?.hg94Action,target=b?.target,origin=s.expedition?.homeKey||s.activeCastleKey||'3,4';
 const out=prev.battleAct(s,...args);
 if(out?.type!=='win'||!['territory','territory-farm'].includes(action))return out;
 const t=E.getTile(target);if(!territory(t))throw Error('Trận lãnh thổ không khớp vị trí');
 const h=ensure(s),i=index(t),p=lookup(h.claims,i);
 if(action==='territory'){
  if(p.found)throw Error('Ô đất đã có chủ, không thể nhận hai lần');
  h.claims.splice(p.at,0,[i,homeIndex(origin)]);
  E.note(s,'Đã chiếm lãnh thổ ('+t.x+','+t.y+'), sản lượng thuộc '+origin+'.');
 }else if(!p.found)throw Error('Không thể farm trên đất chưa chiếm');
 if(!strict(s))throw Error('Hỏng tính toàn vẹn Save v07 sau giao tranh lãnh thổ');
 return {...out,hg94Claim:action==='territory',hg94Farm:action==='territory-farm',territoryKey:t.key};
}
Object.assign(E,{make,parseSave:parse,serializeSave:serialize,strictSave:strict,valid:strict,battleAct,
 hg94Ensure:ensure,hg94Valid:valid,hg94Quote:quote,hg94IsClaimed:isClaimed});
root.HOG_HG94=Object.freeze({version:1,save:7,world:200,claimable:true,multiplayer:false});
})(typeof globalThis!=='undefined'?globalThis:this);
