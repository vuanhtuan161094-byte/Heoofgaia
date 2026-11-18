# ART — Idle-first production contract (Owner correction, 18/11/2026)

**AUTHORITATIVE ART-ONLY CONTRACT.** This replaces R07–R10 five-actions-by-four-frames-per-unit quotas and any "completed" claims based only on atlas cell counts. Chat 00 may adopt it for cross-chat coordination. This file belongs to the Art team's exclusive area; do not edit shared gameplay, generator or Save files.

## Actual product and scale

Mưu Định Tam Quốc uses a **stationary formation / auto-battle (idle) presentation**. There is no player-controlled troop walk/run on the combat grid. Default unit art needs **1 original, recognizable IDLE PNG per troop**, plus **1 different CONTACT/ATTACK PNG only if it genuinely improves the battle**. A renderer may briefly flash/recoil on Hit and fade on defeat. Skill VFX lives in separate transparent assets keyed to existing battle events. Do not fabricate new HP, morale, turns or time from an illustration.

**One art source at a time.** Generate a single isolated, full-body character on *true transparent RGBA* with no typography, title, label, border, presentation card, landscape, UI, collage or concept board. Use the Wiki **only** to derive role, armor silhouette and weapon family, never import its protected pixels. Inspect character integrity at ~80px. After the character is accepted, create the attack-contact pose as a second isolated image. Do **not** ask image generation for "promotional poster", "infographic", "showcase board", "card", "title and captions" or a full multi-class marketing sheet.

**Minimal file format:** PNG RGBA 128×128 or size defined by Integration 07; consistent ground pivot; no square background, incomplete head or weapon, poster lettering, adjacent cell fragments. Do not encode animation by a text promise. Only independently illustrated poses may be called independent animation frames. Source crop/translation/tint = compositing. Do not mirror weapon grip just to claim a new direction. No rig.

**QA is one lightweight batch gate:** preview the whole class sheet at the actual game size; confirm each character has a legible, distinct silhouette and weapon; verify PNG alpha and safe clipping; record status. No Chromium/Save/full regression per individual sprite. Integration team runs real event/Save QA at its milestone, not the Art chat.

## Fixed status vocabulary

- `REFERENCE_ONLY` — poster, concept board, VNG Wiki screenshot: **NOT A GAME ASSET**.
- `QUARANTINED` — chopped weapon/body, false alpha, figure fragment, unreadable at game scale, one-off poster crop.
- `VISUAL_CANDIDATE` — clean PNG source available but not owner-approved.
- `APPROVED_ART` — owner confirmed appearance at actual render size.
- `IN_GAME` — integrated by Chat 07 into canonical generator, linked to real battle events. A repository file/ZIP alone never qualifies.

## Audit correction

- R06: **REJECTED** original code-vector; never integrate.
- R07–R09: 11 image-generated infantry identity candidates, not 220 independent drawings or accepted gameplay.
- R10: eight named entries but **five fail the current source gate**: `giap_bo`, `hoang_bo` are badly framed/visually cramped; `loi_kiem_si`, `phan_quan`, `van_khuc` are poster-derived unreliable source crops. Quarantine instead of promoting them.
- R11 corrective pack: 14 surviving identity candidates (11 R07–R09 + 3 R10), 28 separate **static** RGBA PNGs, no animation-clone claims, no runtime modification. ZIP in user's ChatGPT Library, see `assets/ngoalong/infantry_r11/HANDOFF.md`.

**Stop instruction for all Art chats:** don't generate more posters, fake motion frame totals, or high-tier characters until the corrected small-asset pipeline has been adopted. Owner specifically requested a simple idle game with minimal repeated QA.
