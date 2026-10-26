const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createZip(sourceDir, outZipPath) {
  const files = [];

  function scan(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scan(full);
      } else {
        const relPath = path.relative(sourceDir, full).replace(/\\/g, '/');
        files.push({ full, relPath });
      }
    }
  }

  scan(sourceDir);

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  function crc32(buf) {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return ~crc >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }

  const chunks = [];

  for (const f of files) {
    const rawData = fs.readFileSync(f.full);
    const compressed = zlib.deflateRawSync(rawData, { level: 9 });
    const crc = crc32(rawData);
    const nameBuf = Buffer.from(f.relPath, 'utf8');

    // Local file header (30 bytes + name)
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(8, 8);           // compression (deflate)
    local.writeUInt16LE(0, 10);          // mod time
    local.writeUInt16LE(0, 12);          // mod date
    local.writeUInt32LE(crc, 14);        // crc-32
    local.writeUInt32LE(compressed.length, 18); // compressed size
    local.writeUInt32LE(rawData.length, 22);    // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);    // filename length
    local.writeUInt16LE(0, 28);                 // extra field length
    nameBuf.copy(local, 30);

    const localOffset = offset;
    chunks.push(local);
    chunks.push(compressed);
    offset += local.length + compressed.length;

    // Central directory header (46 bytes + name)
    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4);         // version made by
    central.writeUInt16LE(20, 6);         // version needed
    central.writeUInt16LE(0, 8);          // flags
    central.writeUInt16LE(8, 10);         // compression
    central.writeUInt16LE(0, 12);         // mod time
    central.writeUInt16LE(0, 14);         // mod date
    central.writeUInt32LE(crc, 16);       // crc
    central.writeUInt32LE(compressed.length, 20); // compressed size
    central.writeUInt32LE(rawData.length, 24);    // uncompressed size
    central.writeUInt16LE(nameBuf.length, 28);    // filename length
    central.writeUInt16LE(0, 30);                 // extra field length
    central.writeUInt16LE(0, 32);                 // file comment length
    central.writeUInt16LE(0, 34);                 // disk number
    central.writeUInt16LE(0, 36);                 // internal attributes
    central.writeUInt32LE(0, 38);                 // external attributes
    central.writeUInt32LE(localOffset, 42);       // relative offset of local header
    nameBuf.copy(central, 46);

    centralHeaders.push(central);
  }

  const centralDirStart = offset;
  let centralDirSize = 0;
  for (const c of centralHeaders) {
    chunks.push(c);
    centralDirSize += c.length;
  }

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // start disk
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12); // size of central dir
  eocd.writeUInt32LE(centralDirStart, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20);          // comment length

  chunks.push(eocd);

  fs.writeFileSync(outZipPath, Buffer.concat(chunks));
}

module.exports = { createZip };
