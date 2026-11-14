# HG91 — Runtime asset rights clearance register (STAGING ONLY)

As of 2026-11-14, **PUBLIC RELEASE IS NOT APPROVED**. The user owns the project code, but possession of an image or a public GitHub source does not automatically grant its redistribution rights. This register distinguishes proven licensing from an unresolved release audit; it is not legal advice.

| Asset family | Evidence | Current assessment | Public gate |
| --- | --- | --- | --- |
| Original four-faction background art | `assets/generated/hg11/asset-manifest.json`, `docs/ASSET-PROVENANCE.md` | Independently generated, documented | Check final embedded source hashes and prompt provenance |
| HG86 hero and gear renders | `assets/generated/hg86/`, original ImageGen manifest | Project-generated candidates | Check originality, prompt source and distribution rights |
| HG89 mythic pantheon portraits | `assets/generated/hg89/` | Original rendered art, mythological names | Verify no third-party game designs copied |
| game-icons.net icons | Footer currently credits Lorc, Delapouite, Sbed, CC BY 3.0 | Attribution-required third-party artwork | Audit every shipped icon, creator, CC BY 3.0 conditions and include proper notice |
| Undead Skeleton | `assets/licensed/hg22-skeleton/LICENSE.txt` MIT; copyright 2026 Chong-U Lim | MIT permission conditional on including the notice | Full MIT notice embedded under game settings → Licenses & credits; verify atlas derivatives |
| KayKit Heavy Soldier | `assets/licensed/kaykit-heavy-soldier/ASSET_CONTRACT.md` | CC0 source; export-time Three.js MIT | Verify actual shipped runtime atlas provenance |
| Dungeon Crawl Stone Soup tiles | `assets/licensed/dcss-cc0/unit-manifest.json` | Repo marks curated CC0, no blanket verification | Confirm the precise file-level source licenses, not folder claims |
| Source A / historical Heroes of Gaia screenshots and sprites | Research references and `docs/ASSET-PROVENANCE.md` | **Reference only unless explicit permission** | Block any redistributable legacy original asset that lacks rights |
| Sound effects | HG91 browser-native opt-in oscillator sound (no audio file) | Original code-generated | Ensure no imported music or sample enters release without license |
| User-facing title and publisher association | UI title `Anh Hùng Thời Loạn`; historical reference in credits | Independent game brand | Legal/brand review for resemblance and confusing association |

## Public-release decision

**PENDING**: automated release archive generation is permitted for restricted local/internal review only. Itch visibility must remain Draft/Restricted. Before publication, produce a manifest mapping every `build_offline.py` embedded image/atlas and icon to sha256, author, license, attribution and redistribution decision. No PASS on unknown license provenance. The user must approve final copyright and public visibility decisions.

## Notices already inserted into single HTML

- Accessible Licenses & credits disclosure under 🌐 game settings, including the complete Skeleton MIT text and game-icons CC BY license links.
- The game retains one HTML and Save v07. The license section is a text-only overlay, with no external runtime dependencies.
- itch.io AI Assisted disclosure is required and included in storefront copy.
