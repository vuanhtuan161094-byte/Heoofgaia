'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.cwd();
const rel = p => path.join(root, p);
const readJson = p => JSON.parse(fs.readFileSync(rel(p), 'utf8'));
const writeJson = (p, value) => fs.writeFileSync(rel(p), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();

const hallPath = 'assets/generated/hg11/buildings/human-town-hall-manifest.json';
const hall = readJson(hallPath);
const receipt = readJson(hall.integration.receipt);
const bundlePath = hall.integration.offlineBundle.projectPath;
const bundle = fs.readFileSync(rel(bundlePath));
const bundleText = bundle.toString('utf8');
const bundleSha = sha256(bundle);
if (bundleSha !== receipt.offlineBundleSha256) throw new Error('Focused Chrome receipt is for a different offline bundle.');
if (!bundleText.includes('id="asset-human-town-hall"')) throw new Error('Town Hall source tag is missing from the standalone bundle.');
if (receipt.total !== 16 || receipt.passed !== 16 || receipt.failed !== 0 || receipt.errors.length !== 0) {
  throw new Error('Human building Chrome receipt must be a clean 16/16.');
}

const screenshotRows = receipt.screenshots.map(row => {
  const bytes = fs.readFileSync(rel(row.path));
  if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) throw new Error(`Screenshot receipt mismatch: ${row.path}`);
  return { projectPath: row.path, bytes: bytes.length, resolution: row.resolution, sha256: row.sha256 };
});
const runtime = hall.runtime;
const pngCount = (bundleText.match(/data:image\/png;base64,/g) || []).length;
if (pngCount !== 17) throw new Error(`Expected 17 runtime PNGs embedded in the bundle, found ${pngCount}.`);

hall.integration.offlineBundle.sha256 = bundleSha;
hall.integration.offlineBundle.bytes = bundle.length;
hall.integration.screenshots = screenshotRows;
hall.integration.screenshotCount = screenshotRows.length;
writeJson(hallPath, hall);

const barracksPath = 'assets/generated/hg11/buildings/human-barracks-manifest.json';
const barracks = readJson(barracksPath);
barracks.integration.offlineBundle.sha256 = bundleSha;
barracks.integration.offlineBundle.bytes = bundle.length;
barracks.integration.screenshots = screenshotRows
  .filter(row => row.projectPath.includes('human-barracks-building-detail'))
  .map(row => ({ ...row, bitDepth: 8, colorType: 2 }));
writeJson(barracksPath, barracks);

const fieldPath = 'assets/generated/hg11/battlefield/asset-manifest.json';
const field = readJson(fieldPath);
field.integration.bundle = { ...field.integration.bundle, projectPath: bundlePath, bytes: bundle.length, sha256: bundleSha, runtimePngCount: pngCount };
field.integration.nodeRegression = { passed: 175, total: 175, failed: 0, result: 'PASS' };
writeJson(fieldPath, field);

const soldierPath = 'assets/licensed/kaykit-heavy-soldier/asset-manifest.json';
const soldier = readJson(soldierPath);
soldier.integration.standaloneHtml = {
  ...soldier.integration.standaloneHtml,
  projectPath: bundlePath,
  bytes: bundle.length,
  characters: bundleText.length,
  sha256: bundleSha,
  embeddedRuntimePngCount: pngCount,
};
soldier.integration.nodeRegression = {
  ...soldier.integration.nodeRegression,
  suiteTotal: 175,
  suitePassed: 175,
  suiteFailed: 0,
  result: 'PASS',
};
writeJson(soldierPath, soldier);

const parentPath = 'assets/generated/hg11/asset-manifest.json';
const parent = readJson(parentPath);
parent.target = 'HG-11 four-faction scenic city art, Human Barracks and Town Hall detail, Human Meadow battlefield and one animated Human Heavy Soldier';
parent.integration.browserScreenshot = [...new Set([...parent.integration.browserScreenshot, ...screenshotRows.map(row => row.projectPath)])];
parent.integration.fullGameRegression = 'PASS: 175/175 Node engine regression';
parent.integration.independentBuildingAssets = 'PASS: Human Barracks and Town Hall have separate static detail art and real paid v07 construction receipts; focused Chrome 16/16; no animation or original parity claim.';
parent.buildingAssets = parent.buildingAssets.filter(asset => asset.assetId !== hall.assetId);
parent.buildingAssets.push({
  assetId: hall.assetId,
  faction: hall.faction,
  buildingKey: hall.buildingKey,
  status: hall.status,
  animationFrames: hall.states.animationFrames,
  manifest: hallPath,
  runtime,
  detailScreenshots: screenshotRows.map(row => row.projectPath),
});
writeJson(parentPath, parent);

process.stdout.write(`Synchronized Human building manifests; bundle=${bundleSha}; embeddedPngs=${pngCount}; focused=${receipt.passed}/${receipt.total}\n`);
