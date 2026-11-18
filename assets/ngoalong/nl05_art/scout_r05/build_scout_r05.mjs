#!/usr/bin/env node
// Rebuild tracked R05 PNGs deterministically from canonical R04 masters. No rig.
// All frames are raster compositing of source poses, NOT newly hand-painted poses.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const root=path.resolve(import.meta.dirname,'../../../..');
const assetDir=path.dirname(import.meta.filename);
const sourcePaths=["assets/r04/r04-original-bulwark-scout-v1-master.png","assets/r04/r04-original-bulwark-scout-attack-contact-v1.png"];
const definitions=[[{"src":0,"dy":0},{"src":0,"dy":-1},{"src":0,"dy":0},{"src":0,"dy":1}],[{"src":0,"dx":-3},{"src":1,"dx":-2},{"src":1,"dx":0},{"src":0,"dx":2}],[{"src":0,"dx":0},{"src":0,"dx":-5,"hit":0.15},{"src":0,"dx":-2,"hit":0.07},{"src":0,"dx":0}],[{"src":0,"dy":-1},{"src":1,"dx":-1},{"src":1,"dx":1},{"src":0,"dy":0}],[{"src":0,"dy":0,"opacity":1},{"src":0,"dy":4,"opacity":0.67},{"src":0,"dy":9,"opacity":0.34},{"src":0,"dy":16,"opacity":0.06}]];
const W=160,H=168,C=4,A=5,PW=640,PH=840;
function u32(b,i){return b.readUInt32BE(i)}
function readPNG(p){
 const bytes=fs.readFileSync(p);let w,h,type,depth,parts=[];
 for(let i=8;i<bytes.length;){const n=u32(bytes,i),t=bytes.toString('ascii',i+4,i+8);if(t==='IHDR'){w=u32(bytes,i+8);h=u32(bytes,i+12);depth=bytes[i+16];type=bytes[i+17]}if(t==='IDAT')parts.push(bytes.subarray(i+8,i+8+n));i+=n+12;if(t==='IEND')break}
 if(depth!==8||type!==6)throw Error('Need 8-bit RGBA PNG '+p);
 const raw=zlib.inflateSync(Buffer.concat(parts)),out=Buffer.alloc(w*h*4);let k=0,stride=w*4;
 for(let y=0;y<h;y++){const f=raw[k++];for(let x=0;x<stride;x++){let v=raw[k++],a=x>=4?out[y*stride+x-4]:0,b=y?out[(y-1)*stride+x]:0,c=y&&x>=4?out[(y-1)*stride+x-4]:0;
 if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c}out[y*stride+x]=v&255}}
 return {w,h,pixels:out};
}
function crc(bytes){let c=0xffffffff;for(let b of bytes){c^=b;for(let i=0;i<8;i++)c=(c&1)?(c>>>1)^0xedb88320:c>>>1}return (c^0xffffffff)>>>0}
function png(W,H,pixels){
 const stride=W*4,raw=Buffer.alloc(H*(stride+1));for(let y=0;y<H;y++)pixels.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);
 const pieces=[],ch=(type,data)=>{const h=Buffer.alloc(8),t=Buffer.from(type,'ascii'),tail=Buffer.alloc(4);h.writeUInt32BE(data.length,0);t.copy(h,4);tail.writeUInt32BE(crc(Buffer.concat([t,data])),0);return Buffer.concat([h,t,data,tail])};
 const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw,{level:0})),ch('IEND',Buffer.alloc(0))]);
}
const src=sourcePaths.map(p=>readPNG(path.join(root,p))),out=Buffer.alloc(PW*PH*4);
for(let row=0;row<A;row++)for(let col=0;col<4;col++){
 const f=definitions[row][col],s=src[f.src],dx=f.dx||0,dy=f.dy||0,opacity=f.opacity===undefined?1:f.opacity,hit=f.hit||0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let sx=Math.round(s.w/2+(x-80-dx)/0.2),sy=Math.round(595+(y-158-dy)/0.2);
 if(sx<0||sx>=s.w||sy<0||sy>=s.h)continue;
 const si=(sy*s.w+sx)*4,di=((row*H+y)*PW+col*W+x)*4,a=s.pixels[si+3];if(!a)continue;
 out[di]=Math.round(s.pixels[si]*(1-hit)+236*hit);out[di+1]=Math.round(s.pixels[si+1]*(1-hit));out[di+2]=Math.round(s.pixels[si+2]*(1-hit));out[di+3]=Math.round(a*opacity);
 }}
const fx=Buffer.alloc(PW*H*4);
function blend(f,x,y,a){if(x<0||x>=W||y<0||y>=H||a<=0)return;let k=(y*PW+f*W+x)*4,p=fx[k+3]/255,A=Math.max(0,Math.min(1,a)),v=A+p*(1-A),c=[128,237,220];for(let j=0;j<3;j++)fx[k+j]=Math.round((c[j]*A+fx[k+j]*p*(1-A))/v);fx[k+3]=Math.round(v*255)}
for(let f=0;f<4;f++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){let cx=f===0?136:f===2?150:139,cy=99,r=Math.hypot(x-cx,y-cy),a=0;
 if(f===0)a=0.28*Math.exp(-r*r/90)+0.8*Math.exp(-r*r/12);
 if(f===1){let v=Math.abs(y-(99-0.06*(x-104)));if(x>=103&&x<=151)a=0.52*Math.exp(-v*v/20)+0.42*Math.exp(-v*v/2)}
 if(f===2){let arm=Math.min(Math.abs(x-150),Math.abs(y-99));a=0.66*Math.exp(-r*r/80)+0.45*Math.exp(-r*r/5)+0.35*Math.exp(-arm*arm/2)*Math.exp(-r/22)}
 if(f===3)a=0.30*Math.exp(-r*r/95)+0.2*Math.exp(-Math.pow(Math.hypot(x-142,y-96)-7,2)/5);
 if(a>0.015)blend(f,x,y,Math.min(a,0.9))}
for(const [name,data,ww,hh] of [['scout-r05-stationary-atlas.png',out,PW,PH],['scout-r05-spear-fx.png',fx,PW,H]]){
 const expected=png(ww,hh,data),target=path.join(assetDir,name);
 if(process.argv.includes('--check')){if(!fs.existsSync(target)||!fs.readFileSync(target).equals(expected))throw Error('Stale or corrupted PNG '+name);console.log('PASS exact bytes '+name)}
 else {fs.writeFileSync(target,expected);console.log('WROTE '+name)}
}
