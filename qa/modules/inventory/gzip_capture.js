'use strict';
/* Tiny RFC1951 gzip decoder used ONLY for audit fixture captured in Actions log.
 * No eval, network, filesystem or runtime dependencies. Max output 2 MB.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.NLWikiGzipQA=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 function b64decode(input){
   const result=[];let buf=0,bits=0;
   for(const ch of input.replace(/\s/g,'')){
     if(ch==='=')break;
     const v=alphabet.indexOf(ch);
     if(v<0)throw Error('BAD_BASE64');
     buf=(buf<<6)|v;bits+=6;
     if(bits>=8){bits-=8;result.push((buf>>>bits)&255);buf&=(1<<bits)-1}
   }
   return result;
 }
 const LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
 const LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
 const DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
 const DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
 function huffman(lengths){
   const count=new Array(16).fill(0),tables=Array.from({length:16},()=>new Map());
   for(const len of lengths)if(len){if(len>15)throw Error('BAD_CODE_LENGTH');count[len]++}
   const next=new Array(16).fill(0);let code=0;
   for(let n=1;n<=15;n++){code=(code+count[n-1])<<1;next[n]=code}
   for(let sym=0;sym<lengths.length;sym++){
     const l=lengths[sym];
     if(l)tables[l].set(next[l]++,sym);
   }
   return tables;
 }
 function utf8(bytes){
   let res='';
   for(let i=0;i<bytes.length;){
     const x=bytes[i++];let cp;
     if(x<128)cp=x;
     else if((x&224)===192){cp=((x&31)<<6)|(bytes[i++]&63)}
     else if((x&240)===224){cp=((x&15)<<12)|((bytes[i++]&63)<<6)|(bytes[i++]&63)}
     else if((x&248)===240){cp=((x&7)<<18)|((bytes[i++]&63)<<12)|((bytes[i++]&63)<<6)|(bytes[i++]&63)}
     else throw Error('BAD_UTF8');
     if(cp<=0xffff)res+=String.fromCharCode(cp);
     else{cp-=0x10000;res+=String.fromCharCode((cp>>10)+0xd800,(cp&1023)+0xdc00)}
   }
   return res;
 }
 function gunzip(bytes){
   if(bytes[0]!==31||bytes[1]!==139||bytes[2]!==8)throw Error('NOT_GZIP');
   let idx=10;const flags=bytes[3];
   if(flags&4){const size=bytes[idx]|bytes[idx+1]<<8;idx+=size+2}
   if(flags&8){while(bytes[idx++]!==0)if(idx>bytes.length)throw Error('BAD_NAME')}
   if(flags&16){while(bytes[idx++]!==0)if(idx>bytes.length)throw Error('BAD_COMMENT')}
   if(flags&2)idx+=2;
   let pos=idx*8;
   function read(n){
     let value=0;
     for(let i=0;i<n;i++){
       if((pos>>>3)>=bytes.length-8)throw Error('DEFLATE_EOF');
       value|=((bytes[pos>>>3]>>>(pos&7))&1)<<i;pos++;
     }
     return value;
   }
   function sym(t){
     let code=0;
     for(let n=1;n<=15;n++){
       code=(code<<1)|read(1);
       const val=t[n].get(code);
       if(val!==undefined)return val;
     }
     throw Error('INVALID_HUFFMAN_CODE');
   }
   const result=[];let last=0;
   while(!last){
     last=read(1);const type=read(2);
     if(type===0){
       pos=(pos+7)&~7;const count=read(16),inverse=read(16);
       if(((count^inverse)&65535)!==65535)throw Error('STORED_BLOCK_BAD_LENGTH');
       for(let i=0;i<count;i++)result.push(read(8));
     }else if(type===1||type===2){
       let lit,dist;
       if(type===1){
         const ls=Array.from({length:288},(_,i)=>i<=143?8:i<=255?9:i<=279?7:8);
         lit=huffman(ls);dist=huffman(Array(32).fill(5));
       }else{
         const nl=read(5)+257,nd=read(5)+1,ncl=read(4)+4;
         const order=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
         const codelen=new Array(19).fill(0);
         for(let i=0;i<ncl;i++)codelen[order[i]]=read(3);
         const codetab=huffman(codelen),all=[];
         while(all.length<nl+nd){
           const v=sym(codetab);
           if(v<=15)all.push(v);
           else{
             let n,value=0;
             if(v===16){n=read(2)+3;value=all[all.length-1]}
             else if(v===17)n=read(3)+3;
             else if(v===18)n=read(7)+11;
             else throw Error('INVALID_CODE_REPEAT');
             if(value===undefined)throw Error('INVALID_CODE_PREVIOUS');
             for(let i=0;i<n;i++)all.push(value);
           }
         }
         lit=huffman(all.slice(0,nl));
         dist=huffman(all.slice(nl,nl+nd));
       }
       for(;;){
         const s=sym(lit);
         if(s<256)result.push(s);
         else if(s===256)break;
         else{
           const li=s-257;
           if(li<0||li>=LB.length)throw Error('BAD_LENGTH_SYMBOL');
           const len=LB[li]+read(LE[li]);
           const d=sym(dist);
           if(d>=DB.length)throw Error('BAD_DISTANCE_SYMBOL');
           const distance=DB[d]+read(DE[d]);
           if(distance>result.length)throw Error('BACKREF_OUT_OF_WINDOW');
           for(let i=0;i<len;i++)result.push(result[result.length-distance]);
         }
         if(result.length>2e6)throw Error('ZIP_BOMB_LIMIT');
       }
     }else throw Error('INVALID_BLOCK_TYPE');
     if(result.length>2e6)throw Error('ZIP_BOMB_LIMIT');
   }
   return utf8(result);
 }
 return {decodeGzipBase64:input=>gunzip(b64decode(input))};
});
