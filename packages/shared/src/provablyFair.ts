import { HOUSE_EDGE, MIN_CHANCE, MAX_CHANCE } from './constants.js';
import { UpgradeCalculationResult, ProvablyFairVerificationResult } from './types.js';

// --- Pure TypeScript SHA-256 & HMAC-SHA256 (Isomorphic: works in Node & Browser) ---

function sha256Bytes(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const withOne = len + 1;
  const padLen = (withOne % 64 <= 56) ? (56 - (withOne % 64)) : (120 - (withOne % 64));
  const totalLen = withOne + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(data);
  padded[len] = 0x80;

  // Append length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);

  const W = new Uint32Array(64);

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
      const s1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, h0, false);
  resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false);
  resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false);
  resView.setUint32(20, h5, false);
  resView.setUint32(24, h6, false);
  resView.setUint32(28, h7, false);
  return result;
}

function stringToUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function sha256(input: string): string {
  const bytes = stringToUtf8(input);
  return bytesToHex(sha256Bytes(bytes));
}

export function hmacSha256(keyStr: string, messageStr: string): string {
  let keyBytes = stringToUtf8(keyStr);
  const msgBytes = stringToUtf8(messageStr);

  const blockSize = 64;
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + msgBytes.length);
  innerMsg.set(iKeyPad);
  innerMsg.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(blockSize + 32);
  outerMsg.set(oKeyPad);
  outerMsg.set(innerHash, blockSize);
  const outerHash = sha256Bytes(outerMsg);

  return bytesToHex(outerHash);
}

// --- Provably Fair Math & Roll Derivation ---

/**
 * Calculates raw chance, multiplier and checks validity without clamping!
 */
export function calculateUpgradeMath(sourcePrice: number, targetPrice: number): UpgradeCalculationResult {
  if (sourcePrice <= 0 || targetPrice <= 0) {
    return {
      isValid: false,
      rawChance: 0,
      displayChance: 0,
      multiplier: 0,
      sourcePrice,
      targetPrice,
      reason: 'Некорректная цена предметов'
    };
  }

  const multiplier = Number((targetPrice / sourcePrice).toFixed(2));
  const rawChance = (sourcePrice / targetPrice) * (1 - HOUSE_EDGE) * 100;
  const displayChance = Number(rawChance.toFixed(2));

  if (rawChance < MIN_CHANCE) {
    return {
      isValid: false,
      rawChance,
      displayChance,
      multiplier,
      sourcePrice,
      targetPrice,
      reason: `Шанс (${displayChance}%) ниже минимального порога ${MIN_CHANCE.toFixed(1)}%. Слишком высокий коэффициент (x${multiplier}).`
    };
  }

  if (rawChance > MAX_CHANCE) {
    return {
      isValid: false,
      rawChance,
      displayChance,
      multiplier,
      sourcePrice,
      targetPrice,
      reason: `Шанс (${displayChance}%) превышает максимальный лимит ${MAX_CHANCE.toFixed(1)}%. Выберите более ценный целевой подарок.`
    };
  }

  return {
    isValid: true,
    rawChance,
    displayChance,
    multiplier,
    sourcePrice,
    targetPrice
  };
}

/**
 * Derives roll (0.0000 - 99.9999) from HMAC-SHA256
 */
export function deriveRollFromHmac(hmacHex: string): { roll: number; rollAngle: number } {
  // First 8 hex characters = 4 bytes (32-bit unsigned integer)
  const first8 = hmacHex.substring(0, 8);
  const intVal = parseInt(first8, 16);
  // Divide by 0xFFFFFFFF (4294967295) -> [0, 1)
  const normalized = intVal / 4294967295;
  // Multiply by 100 -> [0.0000, 99.9999]
  const roll = Number((normalized * 100).toFixed(4));
  // Circle angle 0 - 360 degrees
  const rollAngle = Number(((roll / 100) * 360).toFixed(2));
  return { roll, rollAngle };
}

/**
 * Computes roll directly from serverSeed, clientSeed, nonce
 */
export function calculateRoll(serverSeed: string, clientSeed: string, nonce: number): {
  hmac: string;
  roll: number;
  rollAngle: number;
} {
  const message = `${clientSeed}:${nonce}`;
  const hmac = hmacSha256(serverSeed, message);
  const { roll, rollAngle } = deriveRollFromHmac(hmac);
  return { hmac, roll, rollAngle };
}

/**
 * Verifies a game result for audit
 */
export function verifyGameResult(
  serverSeed: string,
  expectedServerSeedHash: string,
  clientSeed: string,
  nonce: number,
  expectedRoll: number
): ProvablyFairVerificationResult {
  const computedHash = sha256(serverSeed);
  const { hmac, roll, rollAngle } = calculateRoll(serverSeed, clientSeed, nonce);

  return {
    computedHash,
    computedHmac: hmac,
    computedRoll: roll,
    computedAngle: rollAngle,
    isHashMatch: computedHash.toLowerCase() === expectedServerSeedHash.toLowerCase(),
    isRollMatch: Math.abs(roll - expectedRoll) < 0.001
  };
}
