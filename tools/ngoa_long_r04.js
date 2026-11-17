// === NL-R04 — original visual pilot ===
const NL_R04_PILOT_ART={scout:"data:image/png;base64,__R04_SCOUT_PNG_BASE64__",tactician:"data:image/png;base64,__R04_TACTICIAN_PNG_BASE64__"};
const nlR04PriorRenderBattleShell=renderBattleShell;
renderBattleShell=function(){
 nlR04PriorRenderBattleShell();
 const callout=document.querySelector('.nlr03-encounter[data-r03-encounter]');
 const encounterId=callout?.getAttribute('data-r03-encounter');
 const character=encounterId==='r03-bulwark'?{id:'scout',label:'Trinh sát biên cảnh'}:encounterId==='r03-ember'?{id:'tactician',label:'Nữ quân sư tiền tuyến'}:null;
 if(!callout||!character)return;
 let image=callout.querySelector('[data-r04-pilot-art]');
 if(!image){image=document.createElement('img');image.className='r04-pilot-portrait';image.dataset.r04PilotArt=character.id;callout.prepend(image);}
 image.src=NL_R04_PILOT_ART[character.id];image.alt=character.label;image.width=56;image.height=70;image.decoding='async';
 const heading=callout.querySelector('b'),description=callout.querySelector('span');
 if(heading&&description&&!callout.querySelector('.r04-pilot-copy')){const copy=document.createElement('div');copy.className='r04-pilot-copy';heading.before(copy);copy.append(heading,description);}
};
const nlR04PilotStyle=document.createElement('style');
nlR04PilotStyle.textContent=`.nlr03-encounter{align-items:center;flex-direction:row;min-height:82px}.r04-pilot-portrait{display:block;width:56px;height:70px;flex:0 0 56px;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 2px 5px #0a0d0caa)}.r04-pilot-copy{display:grid;gap:5px;min-width:0;flex:1}.nlr03-encounter .r04-pilot-copy b{white-space:normal}.nlr03-encounter .r04-pilot-copy span{line-height:1.5}@media(max-width:620px){.nlr03-encounter{flex-direction:row;align-items:center;gap:8px}.r04-pilot-portrait{width:56px;height:70px;flex-basis:56px}.r04-pilot-copy{min-width:0}}`;
document.head.appendChild(nlR04PilotStyle);
if(window.__P2_ENABLE_QA__)window.__NL_R04_QA__={art:NL_R04_PILOT_ART};
// === end NL-R04 ===
