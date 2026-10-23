import crypto from 'crypto';
import { calculateRoll } from '@upgrader/shared';

export class ProvablyFairService {
  /**
   * Generates a cryptographically strong 64-hex-char server seed (32 bytes)
   */
  static generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * SHA-256 hash of server seed for commitment
   */
  static hashServerSeed(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  /**
   * Computes the roll outcome for given parameters
   */
  static evaluateRoll(serverSeed: string, clientSeed: string, nonce: number) {
    return calculateRoll(serverSeed, clientSeed, nonce);
  }
}
