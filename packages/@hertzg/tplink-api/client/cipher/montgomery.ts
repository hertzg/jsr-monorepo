/**
 * Montgomery multiplication for faster modular exponentiation.
 *
 * Instead of computing (a * b) % n with expensive division,
 * Montgomery works in a transformed space where reduction
 * uses only shifts and additions.
 */

/** Precomputed constants for a specific modulus */
export interface MontgomeryParams {
  n: bigint; // The modulus
  rBits: number; // Bit length of R (rounded to 64-bit boundary)
  r: bigint; // R = 2^rBits (larger than n)
  rMask: bigint; // R - 1 (for fast mod R via bitwise AND)
  nPrime: bigint; // -n^(-1) mod R (for Montgomery reduction)
  rSquared: bigint; // R^2 mod n (for converting to Montgomery form)
}

/**
 * Compute modular inverse using extended Euclidean algorithm.
 * Returns x such that (a * x) mod m = 1
 */
function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [a % m, m];
  let [oldS, s] = [1n, 0n];

  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }

  return ((oldS % m) + m) % m;
}

/**
 * Create Montgomery parameters for a given modulus.
 * Call once per modulus, reuse for all operations with that modulus.
 */
export function createMontgomeryParams(n: bigint): MontgomeryParams {
  // R must be larger than n and a power of 2
  // Round up to 64-bit boundary for efficient operations
  const nBits = n.toString(2).length;
  const rBits = ((nBits + 63) >> 6) << 6;
  const r = 1n << BigInt(rBits);
  const rMask = r - 1n;

  // Compute n' such that n * n' ≡ -1 (mod R)
  const nInv = modInverse(n, r);
  const nPrime = (r - nInv) % r;

  // Precompute R^2 mod n for fast conversion to Montgomery form
  const rSquared = (r * r) % n;

  return { n, rBits, r, rMask, nPrime, rSquared };
}

/**
 * Montgomery reduction: compute t * R^(-1) mod n
 * This replaces expensive division with shifts and multiplication.
 */
function montReduce(t: bigint, p: MontgomeryParams): bigint {
  // m = (t * n') mod R  (mod R is just bitwise AND with rMask)
  const m = (t * p.nPrime) & p.rMask;
  // u = (t + m * n) / R  (div R is just right shift)
  const u = (t + m * p.n) >> BigInt(p.rBits);
  // Final correction if u >= n
  return u >= p.n ? u - p.n : u;
}

/**
 * Convert a number to Montgomery form: a -> aR mod n
 */
function toMontgomery(a: bigint, p: MontgomeryParams): bigint {
  return montReduce(a * p.rSquared, p);
}

/**
 * Convert from Montgomery form back to normal: aR -> a mod n
 */
function fromMontgomery(aR: bigint, p: MontgomeryParams): bigint {
  return montReduce(aR, p);
}

/**
 * Montgomery multiplication: compute (a * b * R^(-1)) mod n
 * If inputs are in Montgomery form (aR, bR), result is (abR) mod n
 */
function montMultiply(aR: bigint, bR: bigint, p: MontgomeryParams): bigint {
  return montReduce(aR * bR, p);
}

/**
 * Modular exponentiation using Montgomery multiplication.
 * Computes: base^exp mod n
 *
 * @param base The base (normal form, will be converted internally)
 * @param exp The exponent
 * @param p Precomputed Montgomery parameters for the modulus
 * @returns base^exp mod n
 */
export function modPowMontgomery(
  base: bigint,
  exp: bigint,
  p: MontgomeryParams,
): bigint {
  if (p.n === 1n) return 0n;
  if (exp === 0n) return 1n;

  // Convert base to Montgomery form
  let result = toMontgomery(1n, p);
  let baseMont = toMontgomery(base % p.n, p);

  // Binary exponentiation with Montgomery multiplication
  while (exp > 0n) {
    if ((exp & 1n) === 1n) {
      result = montMultiply(result, baseMont, p);
    }
    exp = exp >> 1n;
    if (exp > 0n) {
      baseMont = montMultiply(baseMont, baseMont, p);
    }
  }

  // Convert result back from Montgomery form
  return fromMontgomery(result, p);
}
