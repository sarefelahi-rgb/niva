import { json } from '@/lib/api';
import { isPushConfigured, pushPublicKey } from '@/lib/push-server';

/**
 * Push capability discovery (public material only — the VAPID *public* key).
 * Unauthenticated by design: the public key is not a secret, and the client
 * needs it before sign-in flows that prefill push state. The private key is
 * never referenced here.
 */
export async function GET() {
  const configured = isPushConfigured();
  return json({
    configured,
    ...(configured ? { publicKey: pushPublicKey() } : {}),
  });
}
