'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const rel = p => path.relative(root, p).replaceAll(path.sep, '/');
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function png(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${rel(file)} is not PNG`);
  return {
    projectPath: rel(file), bytes: bytes.length,
    resolution: `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,
    bitDepth: bytes[24], colorType: bytes[25], sha256: sha(bytes)
  };
}
function screenshot(file, receiptRecord) {
  const info = png(file);
  if (info.sha256 !== receiptRecord.sha256 || info.bytes !== receiptRecord.bytes || info.resolution !== receiptRecord.resolution)
    throw new Error(`Screenshot receipt does not match ${info.projectPath}`);
  return info;
}

const receiptPath = path.join(root, 'docs/qa/hg11/human-barracks-building-chrome.json');
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
if (receipt.total !== 13 || receipt.passed !== 13 || receipt.failed !== 0 || receipt.errors.length !== 0)
  throw new Error('Human Barracks browser receipt must be 13/13 with no JavaScript errors');
const source = png(path.join(root, 'assets/generated/hg11/source/human-barracks-master.png'));
const cleaned = png(path.join(root, 'assets/generated/hg11/source/human-barracks-master-clean.png'));
const runtime = png(path.join(root, 'assets/generated/hg11/buildings/human-barracks.png'));
const rejected = png(path.join(root, 'assets/generated/hg11/source/rejected/human-barracks-tall-keep-rejected-master.png'));
if (source.resolution !== '1254x1254' || cleaned.resolution !== '1254x1254' || runtime.resolution !== '512x512' || rejected.resolution !== '1254x1254')
  throw new Error('Unexpected Barracks asset dimensions');
for (const [name, asset] of [['raw master', source], ['clean master', cleaned], ['runtime', runtime], ['rejected trial', rejected]])
  if (asset.bitDepth !== 8 || asset.colorType !== 6) throw new Error(`${name} must be 8-bit RGBA`);
const screenshotRecords = receipt.screenshots.map(row => screenshot(path.join(root, row.path), row));
const html = fs.readFileSync(path.join(root, 'Play-Heoofgaia-HG11.html'));
if (!html.includes(Buffer.from(`src="data:image/png;base64,${fs.readFileSync(path.join(root, runtime.projectPath)).toString('base64')}"`)))
  throw new Error('Barracks runtime must be embedded in the offline HTML');

const manifest = {
  schema: 'hog1-building-art-v1',
  project: 'Anh Hùng Thời Loạn / Heroes of Gaia 1 reconstruction',
  assetId: 'HOG1-HG11-HUMAN-BARRACKS-v1',
  buildingKey: 'barracks',
  faction: 'human',
  status: 'RECREATED',
  historicalIdentity: 'Human Barracks building identity in the independent game catalog. The detailed silhouette, colors and architecture in this asset are newly authored and are not asserted to match original HOG1 art.',
  provider: 'ChatGPT image_gen.imagegen',
  generationPrompt: 'assets/generated/hg11/buildings/human-barracks-prompt.md#selected-v2',
  sourceImageId: 'exec-c7d6f3f0-b42c-4279-a92b-7def4ecc177b.png',
  sourceFile: 'C:/Users/Admin/.codex/generated_images/01a19a08-e09e-7801-88a0-49e6d7322f34/exec-c7d6f3f0-b42c-4279-a92b-7def4ecc177b.png',
  sourceRoute: 'Image edit of the prior project-generated trial with text instructions; the source trial was also generated from text. No historical screenshot, original client art or third-party game image was supplied as image input.',
  generationTimestamp: 'NOT_REPORTED_BY_IMAGE_TOOL',
  generationCost: 'NOT_REPORTED_BY_IMAGE_TOOL',
  licenseAssessment: 'New project recreation; no extracted HOG1 commercial asset is included. Original commercial artwork is not bundled. This manifest does not grant third-party rights or claim legal exclusivity.',
  rejectedTrial: {
    ...rejected,
    sourceImageId: 'exec-f65c8cde-6293-4f9d-b087-bd870826128d.png',
    reason: 'Rejected after visual review because the silhouette read as a Town Hall/keep and contained detached generation specks. Retained only for provenance; not used at runtime.'
  },
  master: {
    ...source, format: 'RGBA PNG', alphaRange: [0, 255], alphaGte8Bounds: [27, 359, 1224, 986], alphaGte8Pixels: 630552
  },
  cleanedMaster: {
    ...cleaned, format: 'RGBA PNG', alphaRange: [0, 255], alphaGte8Bounds: [25, 358, 1226, 986], alphaGte8Pixels: 634194,
    processing: 'tools/process-hg11-unit-sprite.ps1 retains the largest connected architectural subject and rebuilds the antialiased edge; the untouched selected master is preserved.'
  },
  runtime: {
    ...runtime, format: 'RGBA PNG', alphaRange: [0, 255], alphaGte8Bounds: [8, 228, 503, 487], alphaGte8Pixels: 108360,
    pivotPixels: [256, 488], pivotNormalized: [0.5, 0.953125],
    processing: 'Cleaned-alpha bounds [25,358,1226,986] scaled onto a 512x512 transparent canvas; pixel bounds were scanned with System.Drawing after export.'
  },
  visualDesign: {
    identity: 'Broad, low Human military training hall with pale limestone, red slate roof, timber gate and attached practice targets.',
    originalVisualParityClaimed: false,
    sourceImageHadOriginalGameArt: false
  },
  states: {
    masterCreated: true, transparentAlphaVerified: true, singleBuildingReviewed: true,
    runtimeExported: true, embeddedInOfflineGame: true, integratedInBuildingDetail: true,
    realConstructionActionStillEnabledAfterHallPrerequisite: true,
    v07SaveLoadQueueVerified: true,
    animationFrames: 0
  },
  qualityGate: {
    alphaScan: 'PASS: raw, cleaned and runtime PNGs scanned with System.Drawing; RGBA alpha range 0-255 and alpha>=8 bounds/pixel counts recorded.',
    browserIntegration: 'PASS: actual Chrome file:// game loaded the embedded 512px Barracks art from its real Human city hotspot.',
    gameplay: 'PASS: real UI paid for Town Hall 2 and Barracks 2, Save/Reload preserved both v07 construction queues, and actual engine ticks completed each build.',
    responsiveLayout: 'PASS: actual Chrome at 390px displayed the building detail without horizontal page overflow.',
    javascriptErrors: 'PASS: zero page errors in the focused 13-check Chrome session.'
  },
  integration: {
    offlineBundle: { projectPath: 'Play-Heoofgaia-HG11.html', sha256: sha(html).toUpperCase(), bytes: html.length },
    browser: 'Chrome file:// using the bundled standalone HTML',
    receipt: rel(receiptPath),
    screenshots: screenshotRecords
  }
};
fs.writeFileSync(path.join(root, 'assets/generated/hg11/buildings/human-barracks-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ asset: manifest.assetId, runtime: manifest.runtime, screenshots: manifest.integration.screenshots }, null, 2));
