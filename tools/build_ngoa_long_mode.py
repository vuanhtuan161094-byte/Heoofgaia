#!/usr/bin/env python3
"""Deterministic Ngọa Long-first UI build step for the canonical offline index.html.

The canonical distributable remains one generated index.html. The historical
5.5 MB base includes many embedded provenance-checked atlases: this build step
patches it in-place before QA and release, preserving all game/save logic.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = "NL-REBUILD-01"
OLD_TITLE = "<title>Mưu Định Tam Quốc — V0.6 P4.1 Mỹ Thuật</title>"
NEW_TITLE = "<title>Mưu Định Tam Quốc — Chiến thuật trận hình</title>"
OLD_NAV = "const NAV=[['city','🏯','Thành Trì'],['heroes','⚔️','Võ Tướng'],['formation','🛡️','Bày Trận'],['campaign','🗺️','Chinh Phạt'],['barracks','🏹','Doanh Trại'],['journal','📜','Nhật Ký']];"
NEW_NAV = "const NAV=[['city','🏯','Thành Trì'],['formation','🛡️','Bày Trận'],['campaign','🗺️','Chinh Phạt'],['heroes','⚔️','Võ Tướng'],['barracks','🏹','Doanh Trại'],['journal','📜','Nhật Ký']];"
BOOT = "setInterval(tick,1000);setInterval(save,15000);window.addEventListener('beforeunload',save);tick();render();"

CSS = """
/* NL-REBUILD-01 — Ngọa Long-first command hub */
.nl-command{overflow:hidden;border:1px solid #b59762;border-radius:14px;background:linear-gradient(125deg,#1c2929,#152027 55%,#2b2720);box-shadow:0 12px 35px #05090b78;margin-bottom:18px;padding:20px;color:#f5e7ca}
.nl-command .nl-kicker{font-size:10px;letter-spacing:2.4px;color:#e2bc7e;font-weight:700}
.nl-command h2{font:700 clamp(20px,2.3vw,30px) Georgia,"Times New Roman",serif;color:#f4deaa;margin:7px 0 9px}
.nl-command p{font-size:12px;line-height:1.75;color:#cad1c6;max-width:850px;margin:0 0 12px}
.nl-command .nl-content{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(270px,.95fr);gap:17px;align-items:stretch}
.nl-command .nl-actions{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}.nl-command .nl-actions button{font-size:12px;padding:10px 13px;border-radius:6px}
.nl-command .nl-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
.nl-command .nl-fact{padding:11px 8px;background:#101c21b8;border:1px solid #60736b88;border-radius:7px;text-align:center}
.nl-command .nl-fact b{display:block;font-size:19px;color:#f2d192}.nl-command .nl-fact small{display:block;margin-top:3px;font-size:10px;color:#c3c9bd}
.nl-command .nl-panel{padding:13px;border-radius:9px;border:1px solid #60736b;background:#101b20ab}.nl-command .nl-panel h3{margin:0 0 11px;font-size:14px;color:#f0d8a9}
.nl-command .nl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(49px,auto));gap:5px}
.nl-command .nl-slot{border:1px solid #5d6d62;min-height:47px;border-radius:5px;background:#1a2d2c;display:grid;place-items:center;text-align:center;padding:4px;line-height:1.25}
.nl-command .nl-slot.occupied{border-color:#c69c5f;background:linear-gradient(150deg,#443c2b,#283536)}
.nl-command .nl-slot b{font-size:11px;color:#f7e1b8}.nl-command .nl-slot small{font-size:9px;color:#9caaa3}
.nl-command .nl-slot.empty{opacity:.48}.nl-command .nl-lines{font-size:11px;color:#cad3c6;line-height:1.65;margin-top:10px}
.nl-command .nl-footnote{font-size:10px;color:#a6b5aa;margin-top:8px;line-height:1.5}
@media(max-width:850px){.nl-command .nl-content{grid-template-columns:1fr}.nl-command{padding:15px}}
@media(max-width:420px){.nl-command .nl-facts{gap:5px}.nl-command .nl-fact b{font-size:16px}.nl-command .nl-actions button{flex:1 1 43%}}
"""

# This code is inserted INSIDE the existing game closure, after all gameplay
# upgrades/overrides and immediately before the existing final render().
PORTAL = r"""
// === NL-REBUILD-01: first-class 3x3 strategy dashboard ===
function nlRebuildHub(){
  const current=Math.min(STAGES.length,game.cleared.length+1);
  const stage=STAGES[current-1],deployed=game.slots.filter(id=>id&&game.hero[id]?.troops>=30);
  const preset=typeof P3_PRESETS!=='undefined'?P3_PRESETS.find(p=>p.id===game.p3PresetId):null;
  const formation=FORMATIONS[game.formation];
  const slots=game.slots.map((id,i)=>`<div class="nl-slot ${id?'occupied':'empty'}" aria-label="Ô trận ${i+1}: ${id?(HEROES[id]?.name||id):'trống'}">${id?`<b>${esc(HEROES[id]?.name||id)}</b><small>${esc(HEROES[id]?.role||'Võ tướng')}</small>`:'<small>Ô trống</small>'}</div>`).join('');
  return `<section class="nl-command" data-nl-command="1"><div class="nl-kicker">TRUNG QUÂN · QUYẾT SÁCH</div><h2>Quân Cơ Phủ — Bày trận định thiên hạ</h2><p>Mưu Định Tam Quốc là game chiến thuật nguyên bản: sắp tối đa năm tướng đã chiêu mộ vào chín ô trận, phối hợp binh chủng, tích sĩ khí và chọn thời điểm thi triển chiến pháp. Phó bản tiếp theo mở bằng kết quả thắng trận thật.</p><div class="nl-content"><div><div class="nl-facts"><div class="nl-fact"><b>${deployed.length}/5</b><small>Tướng đủ quân xuất trận</small></div><div class="nl-fact"><b>${game.cleared.length}/${STAGES.length}</b><small>Ải hoàn thành</small></div><div class="nl-fact"><b>${esc(formation.name)}</b><small>Thế trận hiện tại</small></div></div><div class="nl-actions"><button class="gold-button" data-nl-route="formation">🛡️ Bày trận 3×3</button><button class="dark-button" data-nl-route="heroes">👑 Võ tướng</button><button class="dark-button" data-nl-route="barracks">🏹 Doanh Trại</button><button class="dark-button" data-nl-route="equipment">🗡️ Trang Bị</button><button class="dark-button" data-nl-route="tech">📜 Khoa kỹ</button><button class="dark-button" data-nl-route="campaign">🗺️ Phó bản</button></div><div class="nl-panel"><h3>⚔️ Phó bản tiếp theo — ${esc(stage[0])}</h3><p>Địch tướng: ${esc(stage[1])} · Ải ${current} · Chiến phí: ${fmt(100+current*25)} lương.</p><button class="gold-button" data-battle="${current}" ${deployed.length===0?'disabled':''}>Xuất chiến · Sĩ khí & Chiến pháp</button><div class="nl-footnote">Trận hình, chiến đấu và kết quả dùng combat authority hiện có; replay chỉ đọc bản ghi.</div></div></div><div class="nl-panel"><h3>🛡️ Trận đồ 3×3 · Tuyến trước ở bên phải</h3><div class="nl-grid">${slots}</div><div class="nl-lines"><b>Chiến thuật:</b> ${esc(preset?.title||formation.name)}<br><b>Sĩ khí:</b> Đòn thường tích lũy; đủ ngưỡng sẽ kích hoạt chiến pháp.<br><b>Khắc chế:</b> Bộ → Kỵ → Cung → Bộ.</div><div class="nl-footnote">Chạm “Bày trận 3×3” để đổi tướng, trận pháp và 24 phương án chiến thuật.</div></div></div></section>`;
}
const nlPreviousCityRenderer=renderCity;
renderCity=function(){return nlRebuildHub()+nlPreviousCityRenderer();};
document.addEventListener('click',ev=>{
  const action=ev.target.closest('[data-nl-route]');
  if(!action||action.disabled)return;
  tab=action.dataset.nlRoute;
  render();
});
// === end NL-REBUILD-01 ===
"""

def replace_once(source: str, old: str, new: str, what: str) -> str:
    if source.count(old) != 1:
        raise ValueError(f"Cannot uniquely replace {what}: matches={source.count(old)}")
    return source.replace(old, new, 1)

def build(source: str) -> str:
    if "nlRebuildHub()" in source:
        if source.count("function nlRebuildHub(){") != 1:
            raise ValueError("Unexpected multiple Ngọa Long hubs")
        return source
    source = replace_once(source, OLD_TITLE, NEW_TITLE, "HTML title")
    source = replace_once(source, "KIẾN THÀNH · DỤNG BINH · ĐỊNH THIÊN HẠ", "BÀY TRẬN · SĨ KHÍ · ĐỊNH THIÊN HẠ", "tagline")
    source = replace_once(source, "</style>", CSS + "</style>", "stylesheet")
    source = replace_once(source, OLD_NAV, NEW_NAV, "NAV")
    source = replace_once(source, BOOT, PORTAL + "\n" + BOOT, "runtime bootstrap")
    if source.count("function nlRebuildHub(){") != 1:
        raise ValueError("Hub build verification failed")
    return source

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="check markers without writing")
    args = ap.parse_args()
    original = INDEX.read_text(encoding="utf-8")
    assembled = build(original)
    if args.check and assembled == original:
        # Keep this status line portable to Windows consoles using cp1252.
        print("Already portal-ready")
        return
    if not args.check and assembled != original:
        INDEX.write_text(assembled, encoding="utf-8", newline="")
    digest = hashlib.sha256(assembled.encode("utf-8")).hexdigest()
    print(f"NL-REBUILD-01: bytes={len(assembled.encode('utf-8'))} sha256={digest} applied={assembled!=original} dry_run={args.check}")

if __name__ == "__main__":
    main()
