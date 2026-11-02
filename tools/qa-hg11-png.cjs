'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function check(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${file}: not PNG`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), depth = bytes[24], type = bytes[25], interlace = bytes[28];
  if (depth !== 8 || ![2, 6].includes(type) || interlace !== 0) throw new Error(`${file}: expected non-interlaced 8-bit RGB/RGBA PNG`);
  const blocks = [];
  for (let p = 8; p < bytes.length;) {
    const n = bytes.readUInt32BE(p), kind = bytes.toString('ascii', p + 4, p + 8);
    if (kind === 'IDAT') blocks.push(bytes.subarray(p + 8, p + 8 + n));
    p += 12 + n;
    if (kind === 'IEND') break;
  }
  const channels = type === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(blocks)), stride = width * channels, prev = Buffer.alloc(stride);
  if (raw.length !== (stride + 1) * height) throw new Error(`${file}: unexpected inflated byte count`);
  let minAlpha = 255, maxAlpha = 0, nonOpaque = 0, src = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++], scan = raw.subarray(src, src + stride), row = Buffer.allocUnsafe(stride); src += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? row[i - channels] : 0, b = prev[i], c = i >= channels ? prev[i - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : filter === 4 ? paeth(a, b, c) : null;
      if (predictor === null) throw new Error(`${file}: unknown PNG filter ${filter}`);
      row[i] = (scan[i] + predictor) & 255;
    }
    if (channels === 4) for (let i = 3; i < stride; i += 4) { const alpha = row[i]; minAlpha = Math.min(minAlpha, alpha); maxAlpha = Math.max(maxAlpha, alpha); if (alpha < 255) nonOpaque++; }
    row.copy(prev);
  }
  if (minAlpha !== 255 || nonOpaque) throw new Error(`${file}: unexpected transparency min=${minAlpha} nonOpaque=${nonOpaque}`);
  return { file: path.relative(root, file).replaceAll('\\', '/'), width, height, bitDepth: depth, colorType: type, transparency: channels === 3 ? 'none (RGB has no alpha channel)' : { minAlpha, maxAlpha, nonOpaque } };
}
const results = ['human', 'elf', 'orc', 'undead'].map(race => check(path.join(root, 'assets/generated/hg11/cities', `${race}-city-1176x560.png`)));
console.log(JSON.stringify({ passed: results.length, alpha: 'opaque', results }, null, 2));
