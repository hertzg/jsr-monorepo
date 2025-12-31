/**
 * Internal helper for creating CRC functions using number types.
 * @module
 */

type CrcArrayConstructor =
  | Uint8ArrayConstructor
  | Uint16ArrayConstructor
  | Uint32ArrayConstructor;

function buildTable(
  ArrayType: CrcArrayConstructor,
  polynomial: number,
): Uint8Array | Uint16Array | Uint32Array {
  const table = new ArrayType(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? polynomial ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc;
  }
  return table;
}

export function createCrcNumber(
  ArrayType: CrcArrayConstructor,
  polynomial: number,
  init: number,
  xorOut: number,
): (data: Uint8Array) => number {
  const table = buildTable(ArrayType, polynomial);
  return (data: Uint8Array): number => {
    let crc = init;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ xorOut) >>> 0;
  };
}
