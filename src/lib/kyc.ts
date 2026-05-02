import { auth } from './firebase';

const FN_URL =
  'https://ntjpjkglnjtsnxjgrckv.supabase.co/functions/v1/kyc-signed-url';

export interface KycPaths {
  cnicFront?: string | null;
  cnicBack?: string | null;
  businessLicense?: string | null;
  showroomPhoto?: string | null;
}

/**
 * Mints a short-lived signed URL for a KYC document via the
 * `kyc-signed-url` Edge Function. The function verifies the caller is in
 * the admins/{uid} collection before signing.
 */
export async function getSignedKycUrl(
  storagePath: string,
  expiresIn = 300,
): Promise<string> {
  const user = auth.currentUser;
  if (user == null) throw new Error('Not signed in.');
  const idToken = await user.getIdToken();
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ path: storagePath, expiresIn }),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error ?? `Sign URL failed: ${res.status}`);
  }
  return data.url as string;
}

const FN_BASE = 'https://ntjpjkglnjtsnxjgrckv.supabase.co/functions/v1';

/**
 * Sends a push notification to a user via the existing fcm-push Edge
 * Function. Used by the verifications + reports flows to notify the
 * subject when their status changes.
 */
export async function sendAdminPush(opts: {
  recipientUid: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  await fetch(`${FN_BASE}/fcm-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  }).catch(() => {});
}

/// Calls a privileged admin function with the caller's Firebase ID token.
export async function callAdminFunction(
  name: 'seed-marketplace' | 'wipe-marketplace',
  body: Record<string, unknown> = {},
): Promise<any> {
  const user = auth.currentUser;
  if (user == null) throw new Error('Not signed in.');
  const idToken = await user.getIdToken();
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(data.error ?? `${name} failed: ${res.status}`);
  }
  return data;
}
