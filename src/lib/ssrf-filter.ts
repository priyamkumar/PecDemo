/**
 * SSRF and Private IP Range protection
 * Validates URLs before fetching or recording subscriptions.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'instance-data',
  'metadata.google.internal'
]);

function isPrivateIpV4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16 (Link Local / Cloud Metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // Carrier-grade NAT 100.64.0.0/10
  if (a === 100 && b >= 64 && b <= 127) return true;
  // Multicast / Reserved: 224.0.0.0/4 and 240.0.0.0/4
  if (a >= 224) return true;

  return false;
}

function isPrivateIpV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  // IPv4-mapped IPv6
  if (lower.startsWith('::ffff:')) {
    const v4Part = lower.slice(7);
    return isPrivateIpV4(v4Part);
  }
  return false;
}

export function validateSafePublicUrl(urlString: string): { safe: boolean; error?: string; url?: URL } {
  try {
    const parsed = new URL(urlString);

    // Only allow http: and https:
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: `Disallowed protocol: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block known loopback and internal hostnames
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
      return { safe: false, error: 'Loopback and internal hostnames are forbidden.' };
    }

    // Check if hostname is an IPv4 literal
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      if (isPrivateIpV4(hostname)) {
        return { safe: false, error: 'Private or local IP ranges are forbidden.' };
      }
    }

    // Check if hostname is an IPv6 literal (e.g., [::1])
    const cleanHost = hostname.replace(/^\[/, '').replace(/\]$/, '');
    if (cleanHost.includes(':')) {
      if (isPrivateIpV6(cleanHost)) {
        return { safe: false, error: 'Private or local IPv6 addresses are forbidden.' };
      }
    }

    return { safe: true, url: parsed };
  } catch {
    return { safe: false, error: 'Invalid URL format.' };
  }
}
