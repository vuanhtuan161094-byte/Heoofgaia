// === NL-HERO207-V1: stage-gated project-original hero runtime adapter ===
// Chat08 integration authority. Source fields are SIMULATED, never VNG Mobile 2026 facts.
// The old 14-hero recruit pool stays unchanged; new heroes are exposed to HEROES/P2_SKILLS only when owned.
const NL_HERO207_ROWS = NL_GAME_DATA.heroes.hero207Roster || [];
const NL_HERO207_BY_ID = new Map(NL_HERO207_ROWS.map(hero => [hero.id, hero]));
const NL_HERO207_SKILLS = NL_GAME_DATA.skills.hero207ById || {};
const NL_HERO207_UNLOCKS = NL_GAME_DATA.heroes.hero207Unlocks || {};
if(NL_HERO207_ROWS.length!==207 || NL_HERO207_BY_ID.size!==207)throw Error("NL-HERO207: missing or duplicate source profiles");
if(NL_HERO207_ROWS.some(hero => !NL_HERO207_SKILLS[hero.id] || !NL_HERO207_UNLOCKS[hero.id] || hero.provenance?.classification!=="SIMULATED"))throw Error("NL-HERO207: invalid source metadata");

function nlHero207Owned(id) { return Array.isArray(game?.roster) && game.roster.includes(id) && Boolean(game.hero?.[id]); }
function nlHero207Unlock(id) { return NL_HERO207_UNLOCKS[id] || null; }
function nlHero207CanRecruit(id) {
 const gate=nlHero207Unlock(id);
 return Boolean(gate && !battle && !nlHero207Owned(id) && Array.isArray(game.cleared) &&
   game.cleared.includes(gate.stage) && Number.isFinite(game.silver) && game.silver>=gate.silverCost);
}
function nlHero207Register(id) {
 const entry=NL_HERO207_BY_ID.get(id);
 if(!entry)return false;
 const {id:ownedId,provenance,fieldProvenance,...hero}=entry;
 HEROES[ownedId]={...hero};
 const {provenance:skillSource,...descriptor}=NL_HERO207_SKILLS[ownedId];
 P2_SKILLS[ownedId]={...descriptor};
 return true;
}
function nlHero207Hydrate() {
 if(!Array.isArray(game?.roster) || !game.hero || typeof game.hero!=="object")return;
 for(const id of game.roster)if(NL_HERO207_BY_ID.has(id) && game.hero[id])nlHero207Register(id);
}
const nlHero207PriorHydrate = hydrateExtension;
hydrateExtension = function() { nlHero207PriorHydrate(); nlHero207Hydrate(); };
nlHero207Hydrate();

function nlHero207Recruit(id) {
 const entry=NL_HERO207_BY_ID.get(id),gate=nlHero207Unlock(id);
 if(!entry || !gate || !nlHero207CanRecruit(id))return false;
 // Single-owner settlement: payment first, roster and unit authority second, Save once.
 if(!payment({silver:gate.silverCost}))return false;
 if(!Array.isArray(game.roster) || !game.hero || typeof game.hero!=="object")throw Error("NL-HERO207: missing Save-v5 roster authority");
 game.roster.push(id);
 game.hero[id]={level:1,xp:0,troops:160};
 if(!game.troopModes || typeof game.troopModes!=="object")game.troopModes={};
 game.troopModes[id]=entry.type;
 nlHero207Register(id);
 if(typeof countTask==="function")countTask("recruit");
 if(typeof log==="function")log("Chiêu mộ "+entry.name+" (thiết kế mô phỏng) ở ải "+gate.stage+".");
 save();
 render();
 if(typeof toast==="function")toast("Đã chiêu mộ "+entry.name+".");
 return true;
}
function nlHero207Panel() {
 const cleared=new Set(Array.isArray(game.cleared)?game.cleared:[]);
 const available=NL_HERO207_ROWS.filter(h=>!nlHero207Owned(h.id) && cleared.has(NL_HERO207_UNLOCKS[h.id].stage));
 const owned=NL_HERO207_ROWS.filter(h=>nlHero207Owned(h.id)).length;
 const eligible=available.length;
 const maxStage=Math.min(28,Math.max(0,...cleared));
 const ownedIds=Array.isArray(game.roster)?game.roster:[];
 const pool=available.slice().sort((a,b)=>NL_HERO207_UNLOCKS[a.id].stage-NL_HERO207_UNLOCKS[b.id].stage||a.id.localeCompare(b.id));
 const next=NL_HERO207_ROWS.filter(h=>!ownedIds.includes(h.id) && !cleared.has(NL_HERO207_UNLOCKS[h.id].stage))
   .sort((a,b)=>NL_HERO207_UNLOCKS[a.id].stage-NL_HERO207_UNLOCKS[b.id].stage).slice(0,3);
 const options=pool.map(h=>{
   const u=NL_HERO207_UNLOCKS[h.id];
   return '<option value="'+esc(h.id)+'">'+esc(h.name)+' · '+esc(h.role)+' · ải '+u.stage+' · '+u.silverCost.toLocaleString("vi-VN")+' bạc</option>';
 }).join("");
 const more=next.length?'Kế tiếp: '+next.map(h=>esc(h.name)+' (ải '+NL_HERO207_UNLOCKS[h.id].stage+')').join(', '):'';
 return '<section class="panel mini-box" data-nl-hero207="1">'+
   '<h3>⚔️ Tướng Tam Quốc · 207 nhân vật mở rộng</h3>'+
   '<p class="tiny">Đã chiêu mộ '+owned+'/207 · đủ điều kiện tuyển '+eligible+' · đã vượt ải '+maxStage+'/28. Chỉ số và kỹ năng mở rộng là thiết kế SIMULATED, không phải công thức VNG.</p>'+
   (eligible?'<div class="nl207-recruit"><select aria-label="Chọn tướng mở rộng" data-nl207-select>'+options+'</select><button class="gold-button" data-nl207-recruit>Chiêu mộ</button></div>'
     :'<p class="tiny">Chưa có tướng mở khóa mới. Vượt ải để nhận quyền chiêu mộ.</p>')+
   '<p class="tiny">'+more+'</p></section>';
}
// Preserve the established Heroes tab; only append our panel.
if(typeof renderHeroes==="function") {
 const nlHero207PriorHeroes = renderHeroes;
 renderHeroes = function() { return nlHero207PriorHeroes.apply(this,arguments)+nlHero207Panel(); };
}
// Expose an entry point from the command hub even if the legacy Heroes panel is not open.
if(typeof nlRebuildHub==="function") {
 const nlHero207PriorHub = nlRebuildHub;
 nlRebuildHub = function() { return nlHero207PriorHub.apply(this,arguments)+
  '<p class="nl-hero207-cta" data-nl-hero207-link="1">207 tướng mở rộng · mở tab Võ Tướng để chiêu mộ theo ải.</p>'; };
}
document.addEventListener("click",event=>{
 const button=event.target.closest("[data-nl207-recruit]");
 if(!button)return;
 event.preventDefault();
 const select=button.closest("[data-nl-hero207]")?.querySelector("[data-nl207-select]");
 if(select)nlHero207Recruit(select.value);
});
if(window.__P2_ENABLE_QA__)window.__NL_HERO207_QA__={
 count:NL_HERO207_ROWS.length, ids:NL_HERO207_ROWS.map(x=>x.id), owned:()=>NL_HERO207_ROWS.filter(x=>nlHero207Owned(x.id)).length,
 getUnlock:nlHero207Unlock, canRecruit:nlHero207CanRecruit, recruit:nlHero207Recruit,
 renderPanel:nlHero207Panel, hydrate:nlHero207Hydrate,
 sourceStatus:"SIMULATED_PROJECT_AUTHORING", saveSchema:5, allSkillIds:Object.keys(NL_HERO207_SKILLS),
 originalHeroesRemainUntouched:NL_GAME_DATA.heroes.projectRoster.length===14
};
// === end NL-HERO207-V1 ===
