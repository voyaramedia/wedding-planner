import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createSolidPng(width, height, r, g, b, a = 255) {
  // Simple uncompressed or deflate PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = crc32(crcBuf);
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcOut]);
  }

  // Scanlines with a subtle gold accent circle / border
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let pos = 0;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.38;
  const ringWidth = Math.max(2, width * 0.04);

  for (let y = 0; y < height; y++) {
    scanlines.writeUInt8(0, pos++); // filter type 0
    for (let x = 0; x < width; x++) {
      const dist = Math.hypot(x - centerX, y - centerY);
      // Ring boundary
      const onRing = Math.abs(dist - radius) < ringWidth;
      const onInnerRing = Math.abs(dist - (radius * 0.6)) < (ringWidth * 0.8);
      
      if (onRing || onInnerRing) {
        // Gold
        scanlines.writeUInt8(229, pos++);
        scanlines.writeUInt8(193, pos++);
        scanlines.writeUInt8(88, pos++);
        scanlines.writeUInt8(255, pos++);
      } else {
        // Luxury Deep Wine / Burgundy (#311219)
        scanlines.writeUInt8(49, pos++);
        scanlines.writeUInt8(18, pos++);
        scanlines.writeUInt8(25, pos++);
        scanlines.writeUInt8(255, pos++);
      }
    }
  }

  const compressedData = zlib.deflateSync(scanlines);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
const sizes = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'pwa-maskable-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const { file, size } of sizes) {
  const filePath = path.join(publicDir, file);
  fs.writeFileSync(filePath, createSolidPng(size, size, 49, 18, 25));
  console.log(`Generated ${file} (${size}x${size})`);
}
