# P4.1 QA — exact-SHA pending before GitHub run

Local V0 syntax: Node `--check` PASS. P2 regression 31/31 and 12/12 PASS. P3 74/74 PASS. P3 balance 360 deterministic scenarios PASS. P4 visual 14/14 PASS, P4 original asset byte identity 4/4 PASS. P4.1 18/18 PASS. Smoke 7/7 PASS. The **expected** CI sum is 160 distinct browser/functional/provenance checks, excluding 360 balance scenario executions.

Chromium video: `qa/p41-combat-1280x720.mp4`, 1280×720 @ 12 fps, 52 frames. It samples four **actual combat events** including one skill event; charge/contact/fade values are visual-clock samples, not a real-time recorded stream. Rebuilt from exact code and final atlas before release.

Screenshots: `qa/p41-browser-matrix.png` (browser rendering all 4×4×3 key action frames), `qa/p41-charge-70.png`, `qa/p41-release-290.png`, `qa/p41-contact-520.png`, `qa/p41-fade-790.png` and resulting MP4 artifact.

This document records **local** evidence and acceptance limitations; GitHub Actions must prove the latest commit SHA, and owner art review is separate. For current CI refer to Actions latest run on branch `main-ngoalong`, not an older passing SHA.
