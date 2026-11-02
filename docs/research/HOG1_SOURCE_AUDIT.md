# HOG1 source and asset recovery audit

**Checked:** 2026-11-02  
**Target:** Snail Games' 2009 Flash Heroes of Gaia / Castle of Heroes / 英雄之城.  
**Excluded:** Heroes of Gaia 2 (Unity 4.3 + Java) and unrelated games sharing “Castle of Heroes.”  
**Result: NOT_RECOVERED.** No original HOG1 SWF, asset package, server source, or database bytes were retrieved. A link or post is not proof of a file.

## Input bundle actually reviewed

The supplied HOG1_Codex_Research_And_Playable_20261102.zip was 10,131 bytes, SHA-256 9D641CE4210E24D342CE7F0F4CA1F1556FCC4D82F3F09CB7873081E3B82AEF63. All three requested documents were read:

| File | Bytes | SHA-256 |
|---|---:|---|
| README_FIRST.md | 905 | AF75B7DECA61A3DDFAE434603A29161212C3E3373E6748457C08E71A98CEAF72 |
| CODEX_PROMPT_HOG1_HG08_TO_HG13_20261102.md | 11,403 | 4C499B8AE329ABB356C8CCCF2D5DA5A49D91B39702D40C5BB7C896CA6EB2607E |
| docs/research/Heroes_of_Gaia_1_Flash_2009_source_research_2026-11-02.md | 6,919 | A4EBB99BF982030D4F6B694403EC54DFB33A7FB0A16EE5144479B14EA111FCF7 |

## Lead-by-lead ledger

“No bytes” means no verified file size, SHA-256, format signature, manifest, or load result.

| ID | Candidate / URL | Access and evidence checked 2026-11-02 | Bytes / SHA-256 | Result / next action |
|---|---|---|---|---|
| HOG1-001 | [IOPQ 2010 source thread](https://www.iopq.net/thread-16624758-1-1.html) | HTML accessible. Uploader says download was untested and might be incomplete; lists three Qiannao parts, no screenshots. A reply says it may be client-only; hearsay only. | No game-file bytes / none | LEAD_ONLY; retry mirrors or find an independent copy, then inspect safely. |
| HOG1-002 | Qiannao yxzc20090714164324.part1.rar | Historical mirror link in HOG1-001; direct retrieval failed (HTTP 502 in supplied report / inaccessible here). | 0 / none | NOT_RETRIEVED; do not assert contents. |
| HOG1-003 | Qiannao yxzc20090714164324.part2.rar | Same retrieval status as part 1. | 0 / none | NOT_RETRIEVED; seek exact-basename mirror. |
| HOG1-004 | Qiannao yxzc20090714164324.part3.rar | Same retrieval status as part 1. | 0 / none | NOT_RETRIEVED; preserve multipart completeness if found. |
| HOG1-005 | [RaGEZONE request thread](https://forum.ragezone.com/threads/request-%E8%8B%B1%E9%9B%84%E4%B9%8B%E5%9F%8Eserver-castle-of-hero-heroes-of-gaia.1113500/) | Accessible 2016 post says Vietnamese users once had server files, with no host/file/hash. Later replies discuss a newer Unity game, not HOG1. | No bytes / none | ANECDOTE_ONLY; do not treat the newer game as HOG1. |
| HOG1-006 | [GameLandVN: Anh Hùng Online server pricing (2010)](https://gamelandvn.com/anh-hung-online-ngay-tan-cua-may-chu-thu-phi-da-toi/) | Accessible. Identifies Vietnamese title as Castle of Heroes / Heroes of Gaia, VGame operator. | HTML only | IDENTITY_REFERENCE; not a code source. |
| HOG1-007 | [GameLandVN launch-site report](https://gamelandvn.com/anh-hung-online-ra-mat-trang-chu-chinh-thuc/) | Cited in supplied report; direct fetch returned cache miss in this review. Report associates it with aho.webgame.vn and Flash tutorials. | No game bytes / none | CITED_REFERENCE; seek an archived copy if pursuing the domain. |
| HOG1-008 | [GameLandVN VGame shutdown report (2013)](https://gamelandvn.com/vgame-dong-cua-toan-bo-cac-game-dang-van-hanh/) | Accessible. Reports shutdown of Anh Hùng Online and VGame systems unplugged 2013-03-01. | HTML only | HISTORICAL_CONTEXT; not a client source. |
| HOG1-009 | [Sina: 2009 launch-era overview](https://games.sina.com.cn/o/n/2009-02-02/1026294562.shtml) | Accessible. Identifies Snail Games, January 2009 launch and official hero.woniu.com; describes controllable combat and large map. | HTML/images only; no SWF | IDENTITY_REFERENCE; no downloadable asset verified. |
| HOG1-010 | [Kongregate Heroes of Gaia](https://www.kongregate.com/en/games/snailgame/heroes-of-gaia) | Legacy listing/search-indexed comments say game does not load and users seek SWF/server access. No game file verified. | No bytes / none | DISTRIBUTION_REFERENCE; no source recovery. |
| HOG1-011 | [Heroes of Gaia Fandom wiki](https://heroesofgaia.fandom.com/wiki/Heroes_of_Gaia_Wiki) | Index reports about 608 articles. Selected indexed extracts reviewed. Direct enumeration/full-site read was blocked by Cloudflare/robots. | No executable data | PARTIAL_MECHANICS_REFERENCE; full 608 articles have not been read; wiki is not version-locked to 2009. |
| HOG1-012 | [Heroes of Gaia Wikidot](https://heroesofgaia.wikidot.com/) | Historical mechanics tables accessible; no client payload or source tree identified. | No executable data | MECHANICS_REFERENCE; track edition/date and conflicts. |
| HOG1-013 | [Flashpoint database search UI](https://flashpointproject.github.io/flashpoint-database/) | Search page opens, but dynamic query not verified to return a HOG1 record. Search results did not confirm an archive. | No candidate bytes / none | NO_CONFIRMED_MATCH; require launch metadata and actual archive bytes. |
| HOG1-014 | [Wayback snapshot cited by supplied report](https://web.archive.org/web/20100701190337/http://en.heroes.gpotato.eu/guide/game/start/index.aspx) | Direct snapshot/CDX retrieval was blocked in prior checks; no archived response, SWF or CDN manifest captured. | No bytes / none | QUERY_BLOCKED; retry compatible CDX access and inspect linked hosts. |
| HOG1-015 | GitHub search for Heroes of Gaia, Castle of Heroes, 英雄之城, yxzc20090714164324 | Connected repository/code search found no confirmed matching original client or redistributable asset package. | No candidate bytes / none | NO_CONFIRMED_MATCH; search snapshot is not proof that no private/unindexed copy exists. |
| HOG1-016 | [17173 Chinese guide (2009-12-27)](https://web.17173.com/content/2009-12-27/1261927948.shtml) and [Lequ-hosted guide (2010-11)](https://www.lequ.com/yxzc/201011/8592.html) | Period gameplay tables list initial 5 mines, Fame limits 6/7/8/9/11/13/15/17/20 at thresholds 2,200/5,800/11,500/21,000/33,000/54,000/80,000/150,000/300,000; top cap stays 20 at 500k/700k/1m. Raw per-mine output Gold 200/h, Wood/Ore 40/h, Sulfur/Crystal 20/h. Lequ repeats near-verbatim prose, not independent corroboration. | Guide HTML only | MECHANIC_EVIDENCE_B; Chinese edition only. Implemented cap and fixed yields; no mine-level multiplier inferred. |
| HOG1-017 | [RaGEZONE later HOG2 clarification](https://forum.ragezone.com/threads/request-%E8%8B%B1%E9%9B%84%E4%B9%8B%E5%9F%8Eserver-castle-of-hero-heroes-of-gaia.1113500/) | Thread’s newer Unity/Java references are separate from the 2009 Flash target. | No HOG1 bytes | EXCLUDED_HOG2; do not import its code, schema, rules or assets. |

## Component status

| Component | Status | Evidence required for PASS |
|---|---|---|
| Original Flash client/SWF | NOT_RECOVERED | Actual file, size, SHA-256, FWS/CWS/ZWS signature, dependencies, HOG1 identity and isolated load |
| Original art/sprites/animation | REFERENCE_ONLY | Per-item provenance, ownership/license, preview and version match |
| HOG1 server source | NOT_RECOVERED | Verifiable source tree/config/protocol and successful isolated boot; exclude HOG2 |
| HOG1 database/schema | NOT_RECOVERED | Readable schema/dump tied to verified HOG1 server/version |
| Offline original client | NOT_TESTED | Cold start and server dependency behavior from authorized file |
| Independent browser reconstruction | PASS — prototype only | Receipts under docs/qa/hg08-fame-cap-20261102; does not prove original source recovery |
| GitHub source search | NO_CONFIRMED_MATCH | Matching repository and file-level identity, not title-only metadata |
| Wayback | QUERY_BLOCKED | Retrieved snapshot/manifest/file bytes and hashes |

## Asset rights

No original SWF, sprite, audio, video, database or third-party gallery image was added. Current visuals are project-authored HTML/CSS/canvas. Historical screenshots remain reference-only until provenance and release rights are established. See docs/ASSET-PROVENANCE.md.

## Next research actions

1. Search Wayback/CDX for hero.woniu.com, aho.webgame.vn, en.heroes.gpotato.eu and the exact Qiannao basename; follow archived HTML/CDN references and verify bytes.
2. Search Vietnamese archives for Anh Hùng Online, aho.webgame.vn and VGame within 2009–2013; separate later same-name games.
3. Query Flashpoint for all localized names and HOG1 domains; record launch command, source URL, dependencies and actual bytes.
4. Find owner-authorized/licensed art and record version, filename, size, SHA-256, owner, license and decision.
5. Keep developing the independent clone if source recovery remains blocked.
