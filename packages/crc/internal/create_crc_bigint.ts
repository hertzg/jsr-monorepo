/**
 * Internal helper for creating CRC functions using bigint types.
 * @module
 */

function buildTable(polynomial: bigint): BigUint64Array {
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
  const table = buildTable(polynomial);
  return (data: Uint8Array): bigint => {
    let crc = init;
    for (let i = 0; i < data.length; i++) {
      crc = table[Number((crc ^ BigInt(data[i])) & 0xffn)] ^ (crc >> 8n);
    }
    return crc ^ xorOut;
  };
}
