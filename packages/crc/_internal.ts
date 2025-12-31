/**
 * Internal helpers for CRC implementations.
 * @module
 */

type CrcArrayConstructor =
  | Uint8ArrayConstructor
  | Uint16ArrayConstructor
  | Uint32ArrayConstructor;

function buildTableNumber(
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
  const table = buildTableNumber(ArrayType, polynomial);
  return (data: Uint8Array): number => {
    let crc = init;
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ xorOut) >>> 0;
  };
}

function buildTableBigint(polynomial: bigint): BigUint64Array {
  const table = new BigUint64Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = BigInt(i);
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1n ? polynomial ^ (crc >> 1n) : crc >> 1n;
    }
    table[i] = crc;
  }
  return table;
}

export function createCrcBigint(
  polynomial: bigint,
  init: bigint,
  xorOut: bigint,
): (data: Uint8Array) => bigint {
  const table = buildTableBigint(polynomial);
  return (data: Uint8Array): bigint => {
    let crc = init;
    for (let i = 0; i < data.length; i++) {
      crc = table[Number((crc ^ BigInt(data[i])) & 0xffn)] ^ (crc >> 8n);
    }
    return crc ^ xorOut;
  };
}
