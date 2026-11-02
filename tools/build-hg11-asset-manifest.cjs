'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'docs/qa/hg11/chrome-visual-smoke.json');
const nodeReportPath = path.join(root, 'docs/evidence/hg09/QA-HG09-NODE-RESULTS.json');
const outputs = {
  human: 'exec-63adb29d-92a2-409a-8442-b6349f108080.png',
  elf: 'exec-86f53a55-174d-41ce-8814-6def1b54fe2f.png',
  orc: 'exec-c351ddc6-8db1-491c-899f-3cf50755ae1f.png',
  undead: 'exec-c62db231-b13b-493b-abf2-35848821fc0c.png'
};
const genDir = 'C:/Users/Admin/.codex/generated_images/01a19a08-e09e-7801-88a0-49e6d7322f34';
const races = Object.keys(outputs);
let browserReport = null;
try { browserReport = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch {}
let nodeReport = null;
try { nodeReport = JSON.parse(fs.readFileSync(nodeReportPath, 'utf8')); } catch {}
const nodeRegression = nodeReport?.suiteFailed === 0 && nodeReport?.suitePassed === nodeReport?.suiteTotal;
const browserScreenshots = races.map(race => `docs/evidence/hg11/city-${race}-chrome.png`);
const browserIntegrated = !!browserReport && browserReport.failed === 0 && browserReport.screenshots?.length === 4 && browserScreenshots.every(p => fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).size > 100000);
const hitZonesPass = browserIntegrated && browserReport.checks.filter(c => c.name === 'All 12 real canvas hit zones select the correct building' && c.ok).length === 4;
const offlinePath = path.join(root, 'Play-Heoofgaia-HG11.html');
const bundle = fs.existsSync(offlinePath) ? fs.readFileSync(offlinePath, 'utf8') : '';
const embeddedAssets = races.every(race => bundle.includes(`data:image/png;base64,`)) && (bundle.match(/data:image\/png;base64,/g) || []).length === 4;
const assets = races.map(race => {
  const sourcePath = path.join(genDir, outputs[race]);
  const runtimePath = `assets/generated/hg11/cities/${race}-city-1176x560.png`;
  const source = fs.readFileSync(sourcePath);
  const runtime = fs.readFileSync(path.join(root, runtimePath));
  const resolution = buffer => `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
  const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
  const sourceResolution = resolution(source), runtimeResolution = resolution(runtime);
  if (runtimeResolution !== '1176x560') throw new Error(`${race} runtime dimensions ${runtimeResolution}`);
  return {
    id: `HOG1-HG11-CITY-${race.toUpperCase()}-V3`,
    faction: race,
    status: 'RECREATED',
    provider: 'ChatGPT image_gen.imagegen',
    generationPrompt: `assets/generated/hg11/prompts.md#${race}-prompt-v3.1`,
    sourceImageId: outputs[race],
    sourceFile: `C:/Users/Admin/.codex/generated_images/01a19a08-e09e-7801-88a0-49e6d7322f34/${outputs[race]}`,
    sourceRoute: 'Generated independently from text; no historical screenshots or original game art supplied as image input.',
    generationTimestamp: 'UNKNOWN_NOT_RETURNED_BY_TOOL',
    generationCost: 'UNKNOWN_NOT_RETURNED_BY_TOOL',
    source: {
      projectPath: `assets/generated/hg11/source/${race}-city-master.png`,
      resolution: sourceResolution,
      bytes: fs.statSync(path.join(root, `assets/generated/hg11/source/${race}-city-master.png`)).size,
      sha256: sha(fs.readFileSync(path.join(root, `assets/generated/hg11/source/${race}-city-master.png`)))
    },
    runtime: {
      projectPath: runtimePath,
      resolution: runtimeResolution,
      bytes: runtime.length,
      sha256: sha(runtime),
      alpha: runtime[25] === 2 ? 'OPAQUE_RGB_NO_ALPHA_CHANNEL' : 'RGBA_ALPHA_CHANNEL_CHECK_REQUIRED'
    },
    states: {
      imageCreated: true,
      fileExported: true,
      assetQcPass: true,
      integratedInGame: browserIntegrated && hitZonesPass && embeddedAssets
    },
    visualReview: {
      noTextOrUiObserved: true,
      factionIdentityReviewed: true,
      exactHistoricalParityClaimed: false,
      sceneIsFlattened: true,
      hotspotIntegration: hitZonesPass ? 'PASS: 12 real actions per faction in Chrome' : 'PENDING'
    }
  };
});

const manifest = {
  schema: 'hog1-asset-manifest-v1',
  project: 'Hẻoofgaia / Heroes of Gaia 1 reconstruction',
  createdAt: new Date().toISOString(),
  target: 'HG-11 four-faction scenic city art',
  copyrightStatus: 'RECREATED; not extracted or verified original commercial art',
  referenceOnly: [
    'https://news.sfacg.com/Files/2009-6-9/7b77c6c3-c4a3-4e85-9d2b-c590e8241e1d.shtml',
    'https://games.sina.com.cn/o/i/2009-03-05/1638161736.shtml'
  ],
  promptFile: 'assets/generated/hg11/prompts.md',
  interactionContract: 'painter.js CITY_SITES/cityHit select real game building actions; background painting itself has no gameplay logic.',
  integration: {
    offlineBundlePath: 'Play-Heoofgaia-HG11.html',
    offlineBundleEmbeddedAssets: embeddedAssets,
    browserScreenshot: browserIntegrated ? browserScreenshots : 'PENDING',
    hitZoneRegression: hitZonesPass ? 'PASS: 4 factions × 12 live canvas actions' : 'PENDING',
    browserAcceptance: browserReport ? `${browserReport.passed}/${browserReport.passed + browserReport.failed} checks; ${browserReport.failed ? 'FAIL' : 'PASS'}` : 'PENDING',
    fullGameRegression: nodeRegression ? `PASS: ${nodeReport.suitePassed}/${nodeReport.suiteTotal} Node engine regression` : 'PENDING'
  },
  assets
};
fs.writeFileSync(path.join(root, 'assets/generated/hg11/asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(assets.map(a => ({
  faction: a.faction,
  sourceResolution: a.source.resolution,
  sourceBytes: a.source.bytes,
  sourceSha256: a.source.sha256,
  runtimeResolution: a.runtime.resolution,
  runtimeBytes: a.runtime.bytes,
  runtimeSha256: a.runtime.sha256
})), null, 2));
