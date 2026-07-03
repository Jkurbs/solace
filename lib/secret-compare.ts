import 'server-only';

import { createHash, timingSafeEqual } from 'crypto';

// Constant-time secret comparison. Both sides are hashed first so buffer
// lengths always match and length differences don't leak timing.
export function safeSecretEquals(provided: string, expected: string) {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();

  return timingSafeEqual(providedHash, expectedHash);
}
