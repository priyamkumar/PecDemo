import { PoWChallenge, PoWSolution } from '@/types';

// Convert ArrayBuffer to hex string
function buf2hex(buffer: ArrayBuffer): string {
  return Array.prototype.map
    .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
    .join('');
}

/**
 * Solves the PoW challenge in browser using Web Crypto API.
 * Takes ~30-70ms for difficulty 3 (e.g. hash starting with '000').
 */
export async function solvePoW(challenge: PoWChallenge): Promise<PoWSolution> {
  const encoder = new TextEncoder();
  const prefix = '0'.repeat(challenge.difficulty);

  let nonce = 0;
  while (nonce < 200000) {
    const inputStr = `${challenge.challenge}:${challenge.salt}:${nonce}`;
    const data = encoder.encode(inputStr);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashHex = buf2hex(hashBuf);

    if (hashHex.startsWith(prefix)) {
      return {
        challenge: challenge.challenge,
        nonce,
        signature: challenge.signature,
      };
    }
    nonce++;
  }

  // Fallback
  return {
    challenge: challenge.challenge,
    nonce: 0,
    signature: challenge.signature,
  };
}
