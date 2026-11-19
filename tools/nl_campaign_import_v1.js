#!/usr/bin/env node
'use strict';
// Reuse group02's prebuilt 249-map blueprint. Never crawl again or edit source files.
const fs = require('node:fs');
const path = require('node:path');
const {compileWikiDungeons, validateCatalogue} =
  require('../data/ngoalong/modules/campaign/nl_campaign_core_v1.js');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_ROOT = path.join(ROOT, 'data/ngoalong/modules/campaign');
function opt(args, flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}
function readJson(f) { return JSON.parse(fs.readFileSync(path.resolve(ROOT, f), 'utf8')); }
function main(argv) {
  const src = opt(argv, '--source', 'data/ngoalong/group02_wiki/wiki_dungeon_blueprints.json');
  const binding = opt(argv, '--bindings', 'data/ngoalong/modules/campaign/approved_bindings_v1.json');
  const out = path.resolve(ROOT, opt(argv, '--output',
    'data/ngoalong/modules/campaign/catalogue_generated_v1.json'));
  const report = path.resolve(ROOT, opt(argv, '--report',
    'data/ngoalong/modules/campaign/coverage_generated_v1.json'));
  for (const file of [out, report]) {
    if (!(file.startsWith(OUTPUT_ROOT + path.sep))) {
      throw new Error('Campaign compilation output must remain inside campaign module');
    }
  }
  const srcDoc = readJson(src);
  const approvalDoc = readJson(binding);
  const pack = validateCatalogue(compileWikiDungeons(srcDoc, approvalDoc));
  const expected = opt(argv, '--builder-report',
    'data/ngoalong/group02_wiki/wiki_dungeon_builder_report.json');
  const upstream = readJson(expected);
  if (pack.counts.maps !== upstream.mapCount || pack.counts.npcRows !== upstream.npcDetailCount)
    throw new Error('Blueprint coverage changed relative to builder report: review before publishing');
  const summary = {schemaVersion: 1, sourceReport: expected, sourceEdition: pack.sourceEdition,
    classicParity: pack.classicWebgameParity, maps: pack.counts.maps,
    npcRows: pack.counts.npcRows, mapsReadyForIntegration: pack.counts.mapsReadyForIntegration,
    mapsBlocked: pack.counts.mapsBlocked,
    npcsReadyForIntegration: pack.counts.npcsReadyForIntegration,
    numericallyConfirmedSoldierContradictions: pack.counts.sourceSoldierContradictions,
    builderFlaggedSoldierNonmatches: upstream.soldierTotalContradictions,
    status: pack.counts.mapsReadyForIntegration ? 'REVIEW_REQUIRED' : 'REFERENCE_ONLY'};
  const expectedOut = JSON.stringify(pack);
  const expectedReport = JSON.stringify(summary, null, 2) + '\n';
  if (argv.includes('--check')) {
    if (fs.readFileSync(out, 'utf8') !== expectedOut ||
        fs.readFileSync(report, 'utf8') !== expectedReport) {
      throw new Error('Generated catalogue/report are stale');
    }
  } else {
    fs.writeFileSync(out, expectedOut);
    fs.writeFileSync(report, expectedReport);
  }
  console.log(JSON.stringify(summary));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.stack || String(error)); process.exitCode = 1; }
}
module.exports = {main};
