# P4 Quality Review

Local Chromium QA with the current packaged single-file HTML and 14 explicit checks covers:
- Both embedded battle art images load; city CSS data URL present and no remote images.
- All 7 building hotspots retain click behavior; original city artwork is background not a dead static image.
- 8 portrait mappings, three starter cards and live formations.
- Actual canvas draws image sprites during a real battle; battle log/report still generated once.
- Desktop screenshot 1280×720; responsive viewport 390 px; no console errors.

Regression carried forward from P3: 7 smoke + 31 P2 + 12 P2 advanced + 74 P3 + 360 balance runs. **Local PASS does not imply CI PASS or owner art acceptance.**

Reviewer's notes: City art looks much better, units are recognizable, portrait-cards fixed after first screenshot had empty crops. Combat background is still basic compared with city. Some sprites have noisy alpha edges and VFX sheets lack exact per-effect pivots. Motion uses still sprites (attack/idle) with transition timing; no complete frame-by-frame animation pipeline yet. Grade as functional integration only, not production-ready art.
