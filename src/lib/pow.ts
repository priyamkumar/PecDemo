import crypto from 'crypto';

// Ephemeral server secret for HMAC signing challenge tokens
const SERVER_SECRET = process.env.POW_SECRET || 'small-web-reader-secret-pow-salt-' + new Date().toDateString();

// Rotating daily salt for IP hashing
function getDailySalt(): string {
  const dayKey = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(SERVER_SECRET + dayKey).digest('hex');
}

export function generatePoWChallenge(difficulty = 3) {
  const timestamp = Date.now();
  const salt = crypto.randomBytes(16).toString('hex');
  const challenge = crypto.randomBytes(16).toString('hex');

  const payload = `${challenge}:${salt}:${timestamp}:${difficulty}`;
  const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');

  return {
    challenge,
    difficulty,
    salt,
    timestamp,
    signature
  };
}

export function verifyPoWSolution(
  challenge: string,
  salt: string,
  timestamp: number,
  difficulty: number,
  signature: string,
  nonce: number
): { valid: boolean; error?: string } {
  // Check challenge age (max 10 minutes)
  const age = Date.now() - timestamp;
  if (age < 0 || age > 10 * 60 * 1000) {
    return { valid: false, error: 'Challenge expired or timestamp invalid' };
  }

  // Verify HMAC signature
  const payload = `${challenge}:${salt}:${timestamp}:${difficulty}`;
  const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
  if (signature !== expectedSig) {
    return { valid: false, error: 'Invalid challenge signature' };
  }

  // Verify proof of work
  const hash = crypto.createHash('sha256').update(`${challenge}:${salt}:${nonce}`).digest('hex');
  const prefix = '0'.repeat(difficulty);
  if (!hash.startsWith(prefix)) {
    return { valid: false, error: 'Proof-of-work solution incorrect' };
  }

  return { valid: true };
}

/**
 * Computes a 1-way salted hash of client IP.
 * IP is NEVER stored in plaintext. The salt rotates daily.
 */
export function hashClientIp(clientIp: string): string {
  const salt = getDailySalt();
  return crypto.createHash('sha256').update(`${clientIp}:${salt}`).digest('hex');
}
