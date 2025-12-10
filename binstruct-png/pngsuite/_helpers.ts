export function zlibCmfFlg(
  data: Uint8Array,
) {
  const cmf = data[0];
  const flg = data[1];

  return {
    cMethod: (cmf >> 0) & 0b1111,
    cInfo: (cmf >> 4) & 0b1111,
    fCheck: (flg >> 0) & 0b1111,
    fDict: (flg >> 4) & 0b1,
    fLevel: (flg >> 6) & 0b11,
  };
}
