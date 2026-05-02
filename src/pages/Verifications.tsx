import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileWarning,
  History,
  IdCard,
  ImageIcon,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { auth, db } from '../lib/firebase';
import { useCollection } from '../lib/hooks';
import { getSignedKycUrl, sendAdminPush } from '../lib/kyc';
import { relativeTime, shortDate } from '../lib/format';

interface PendingUser {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  city: string;
  cnicNumber: string;
  role: 'buyer' | 'seller';
  dealershipName: string;
  dealershipAddress: string;
  dealershipPhone: string;
  dealershipLat: number | null;
  dealershipLng: number | null;
  kycCnicFrontPath: string | null;
  kycCnicBackPath: string | null;
  kycBusinessLicensePath: string | null;
  kycShowroomPhotoPath: string | null;
  verificationStatus: string;
  verificationNotes: string | null;
  createdAt: any;
}

interface RecentDecision {
  id: string;
  uid: string;
  displayName: string;
  decision: 'verified' | 'unverified' | 'blocked';
  notes: string | null;
  decidedBy: string;
  decidedAt: any;
}

const REJECTION_TEMPLATES = [
  { label: 'Blurry CNIC photo', text: 'Your CNIC photo is too blurry to verify. Please retake a clear photo in good lighting and resubmit.' },
  { label: 'CNIC info mismatch', text: 'The name on your CNIC does not match your account name. Please update your profile name to match your CNIC or contact support.' },
  { label: 'Incomplete documents', text: 'Some required documents are missing from your submission. Please upload all required documents and resubmit.' },
  { label: 'Expired CNIC', text: 'Your CNIC appears to be expired. Please submit a valid, non-expired CNIC.' },
  { label: 'Business license unclear', text: 'Your business license is not readable. Please upload a clearer copy of your business registration document.' },
  { label: 'Showroom photo needed', text: 'We need a recent photo of your showroom/dealership to verify your business. Please upload a clear exterior photo.' },
  { label: 'Suspected fake document', text: 'Your submitted document could not be verified. If you believe this is an error, please resubmit the original document or contact support.' },
  { label: 'Resubmit all documents', text: 'We need you to resubmit all verification documents. Please ensure each photo is clear, well-lit, and shows the complete document.' },
];

export default function Verifications({ email }: { email: string | null }) {
  const pendingQ = query(
    collection(db, 'users'),
    where('verificationStatus', '==', 'pending'),
  );
  const { data, loading, error } = useCollection<PendingUser>(pendingQ, mapRow);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);

  const loadRecent = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'verification_log'),
          orderBy('decidedAt', 'desc'),
          limit(15),
        ),
      );
      setRecentDecisions(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: (data.uid as string) ?? '',
            displayName: (data.displayName as string) ?? '',
            decision: (data.decision as string) ?? 'unverified',
            notes: (data.notes as string) ?? null,
            decidedBy: (data.decidedBy as string) ?? '',
            decidedAt: data.decidedAt,
          } as RecentDecision;
        }),
      );
    } catch {
      // collection may not exist yet
    }
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const sorted = useMemo(() => {
    const list = data ?? [];
    return [...list].sort((a, b) => {
      const ad = a.createdAt?.toDate?.()?.getTime() ?? 0;
      const bd = b.createdAt?.toDate?.()?.getTime() ?? 0;
      return ad - bd;
    });
  }, [data]);

  const selected = sorted.find((u) => u.id === selectedId) ?? sorted[0];

  return (
    <Layout
      email={email}
      title="Verifications"
      subtitle={`${sorted.length} user${sorted.length === 1 ? '' : 's'} awaiting review`}
    >
      {loading && <div className="text-sm text-ink-muted">Loading…</div>}
      {error && (
        <div className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 border border-rose-200 text-sm flex items-start gap-2">
          <FileWarning size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {!loading && sorted.length === 0 && recentDecisions.length === 0 ? (
        <EmptyState
          Icon={ShieldCheck}
          title="No pending verifications"
          description="All caught up. New submissions will appear here in real time."
        />
      ) : (
        <div className="space-y-6">
          {sorted.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  Queue ({sorted.length})
                </div>
                <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                  {sorted.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      className={`w-full text-left p-3 transition-colors ${
                        selected?.id === u.id
                          ? 'bg-brand-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {u.dealershipName ? (
                          <Building2 size={14} className="text-amber-600 flex-shrink-0" />
                        ) : (
                          <IdCard size={14} className="text-brand-700 flex-shrink-0" />
                        )}
                        <div className="font-semibold text-sm text-ink truncate flex-1">
                          {u.displayName || u.email || u.id}
                        </div>
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5 truncate">
                        {u.dealershipName || u.email}
                      </div>
                      <div className="text-xs text-ink-muted mt-1">
                        {relativeTime(u.createdAt)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {selected && <ReviewPanel user={selected} onDecided={loadRecent} />}
            </div>
          )}
          {!loading && sorted.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 flex items-center gap-2">
              <ShieldCheck size={18} />
              <span className="font-semibold">Queue empty — all pending submissions have been reviewed.</span>
            </div>
          )}
          <RecentActivity decisions={recentDecisions} />
        </div>
      )}
    </Layout>
  );
}

function ReviewPanel({ user, onDecided }: { user: PendingUser; onDecided: () => void }) {
  const [busy, setBusy] = useState(false);
  const [actionState, setActionState] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showReject, setShowReject] = useState(false);

  const adminUid = auth.currentUser?.uid ?? '';
  const adminEmail = auth.currentUser?.email ?? '';

  async function decide(
    decision: 'verified' | 'unverified' | 'blocked',
    notes?: string,
  ) {
    setBusy(true);
    setActionState(null);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        verificationStatus: decision,
        verificationNotes: notes ?? null,
        verificationDecidedAt: serverTimestamp(),
        verificationDecidedBy: adminEmail,
      });

      const titles: Record<string, string> = {
        verified: 'Your account is verified',
        unverified: 'Verification needs attention',
        blocked: 'Account suspended',
      };
      const bodies: Record<string, string> = {
        verified:
          'Your seller verification was approved — you can now publish active listings. Welcome aboard!',
        unverified: notes
          ? `Your verification needs changes:\n\n${notes}\n\nPlease update your documents and resubmit from your profile.`
          : 'Your verification submission needs changes. Please re-submit from your profile.',
        blocked: notes
          ? `Your account has been suspended.\n\nReason: ${notes}`
          : 'Your account has been suspended by an admin. Contact support if you believe this is an error.',
      };
      await addDoc(collection(db, 'users', user.id, 'notifications'), {
        kind: 'verification',
        title: titles[decision],
        body: bodies[decision],
        read: false,
        createdAt: serverTimestamp(),
        actorUid: adminUid,
        actorName: adminEmail,
      });

      await sendAdminPush({
        recipientUid: user.id,
        title: titles[decision],
        body: bodies[decision],
        data: { kind: 'verification' },
      });

      // Log to verification_log for recent activity
      await addDoc(collection(db, 'verification_log'), {
        uid: user.id,
        displayName: user.displayName || user.email || user.id,
        decision,
        notes: notes ?? null,
        decidedBy: adminEmail,
        decidedAt: serverTimestamp(),
      });

      setActionState(
        decision === 'verified'
          ? 'Approved — seller notified and can now publish listings.'
          : decision === 'unverified'
            ? 'Rejected — seller notified with your feedback.'
            : 'Blocked — seller account suspended.',
      );
      setShowReject(false);
      setRejectNotes('');
      onDecided();
    } catch (e: any) {
      setActionState(`Failed: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {user.dealershipName ? (
              <Store size={20} className="text-amber-600" />
            ) : (
              <IdCard size={20} className="text-brand-700" />
            )}
            <h2 className="text-xl font-bold text-ink">
              {user.displayName || 'Unnamed user'}
            </h2>
            <Badge tone={user.dealershipName ? 'amber' : 'brand'}>
              {user.dealershipName ? 'Showroom' : 'Individual'}
            </Badge>
          </div>
          <div className="text-sm text-ink-muted mt-1">
            {user.email} {user.phoneNumber && `• ${user.phoneNumber}`} {user.city && `• ${user.city}`}
          </div>
          <div className="text-xs text-ink-muted mt-1">
            Submitted {relativeTime(user.createdAt)}
          </div>
        </div>
      </div>

      <Section title="Identity">
        <Row label="CNIC #" value={user.cnicNumber || '—'} mono />
      </Section>

      {user.dealershipName && (
        <Section title="Business">
          <Row label="Showroom" value={user.dealershipName} />
          <Row label="Address" value={user.dealershipAddress} />
          {user.dealershipPhone && <Row label="Phone" value={user.dealershipPhone} />}
          {user.dealershipLat != null && user.dealershipLng != null && (
            <Row
              label="Location"
              value={
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${user.dealershipLat},${user.dealershipLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 font-medium"
                >
                  <MapPin size={14} />
                  {user.dealershipLat.toFixed(6)}, {user.dealershipLng.toFixed(6)}
                  <ExternalLink size={12} />
                </a>
              }
            />
          )}
        </Section>
      )}

      <Section title="Documents">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          <DocCard label="CNIC — front" path={user.kycCnicFrontPath} />
          <DocCard label="CNIC — back" path={user.kycCnicBackPath} />
          {user.dealershipName && (
            <>
              <DocCard label="Business license" path={user.kycBusinessLicensePath} />
              <DocCard label="Showroom photo" path={user.kycShowroomPhotoPath} optional />
            </>
          )}
        </div>
      </Section>

      <div className="mt-6 pt-4 border-t border-gray-100">
        {showReject ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-ink uppercase tracking-wider">
              Feedback to seller
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REJECTION_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setRejectNotes((prev) => prev ? `${prev}\n\n${t.text}` : t.text)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-ink-soft rounded-full px-3 py-1.5 font-medium transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
              placeholder="Select a template above or type a custom message…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-2">
              <button
                disabled={busy || rejectNotes.trim().length === 0}
                onClick={() => decide('unverified', rejectNotes.trim())}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                Send & request resubmission
              </button>
              <button
                disabled={busy}
                onClick={() => { setShowReject(false); setRejectNotes(''); }}
                className="rounded-lg bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => decide('verified')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() => setShowReject(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 text-sm font-semibold"
            >
              <RefreshCw size={14} /> Request changes
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (confirm(`Block ${user.displayName || user.email}? They can no longer create listings, send messages, or place bids.`)) {
                  decide('blocked', 'Account blocked after verification review.');
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-4 py-2 text-sm font-semibold"
            >
              <AlertTriangle size={14} /> Block account
            </button>
          </div>
        )}
        {actionState && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${
            actionState.startsWith('Failed')
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {actionState}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <div className="text-ink-muted">{label}</div>
      <div className={mono ? 'font-mono text-ink' : 'text-ink'}>
        {value || '—'}
      </div>
    </div>
  );
}

function DocCard({
  label,
  path,
  optional,
}: {
  label: string;
  path: string | null;
  optional?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!path) return;
    setBusy(true);
    setError(null);
    try {
      const u = await getSignedKycUrl(path);
      setUrl(u);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!path) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-3 bg-gray-50">
        <div className="text-xs font-semibold text-ink-muted">{label}</div>
        <div className="text-xs text-ink-muted mt-1">
          {optional ? 'Not submitted (optional)' : 'Missing!'}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-2 bg-white">
      <div className="text-xs font-semibold text-ink mb-2">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt={label}
            className="w-full h-32 object-cover rounded bg-gray-100"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="text-xs text-brand-700 hover:text-brand-900 mt-1 inline-flex items-center gap-1 font-medium">
            <ExternalLink size={11} /> Open full size
          </div>
        </a>
      ) : (
        <button
          onClick={load}
          disabled={busy}
          className="w-full h-32 rounded bg-gray-50 hover:bg-gray-100 grid place-items-center text-xs text-ink-muted"
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <ImageIcon size={20} />
              <span>Click to view</span>
            </div>
          )}
        </button>
      )}
      {error && (
        <div className="mt-2 text-xs text-rose-700 flex items-start gap-1">
          <FileWarning size={12} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function RecentActivity({ decisions }: { decisions: RecentDecision[] }) {
  if (decisions.length === 0) return null;

  function decisionIcon(d: string) {
    switch (d) {
      case 'verified':   return <CheckCircle2 size={14} className="text-emerald-600" />;
      case 'blocked':    return <XCircle size={14} className="text-rose-600" />;
      default:           return <RefreshCw size={14} className="text-amber-600" />;
    }
  }

  function decisionTone(d: string): 'success' | 'danger' | 'warning' {
    switch (d) {
      case 'verified': return 'success';
      case 'blocked':  return 'danger';
      default:         return 'warning';
    }
  }

  function decisionLabel(d: string): string {
    switch (d) {
      case 'verified': return 'Approved';
      case 'blocked':  return 'Blocked';
      default:         return 'Changes requested';
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-5">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted mb-4">
        <History size={14} />
        <span>Recent activity</span>
      </h3>
      <ul className="divide-y divide-gray-100">
        {decisions.map((d) => (
          <li key={d.id} className="py-3 flex items-start gap-3">
            <div className="mt-0.5">{decisionIcon(d.decision)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ink">{d.displayName}</span>
                <Badge tone={decisionTone(d.decision)}>{decisionLabel(d.decision)}</Badge>
              </div>
              {d.notes && (
                <div className="text-xs text-ink-soft mt-1 line-clamp-2">{d.notes}</div>
              )}
              <div className="text-[11px] text-ink-muted mt-1">
                by {d.decidedBy} · {d.decidedAt ? relativeTime(d.decidedAt) : '—'}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function mapRow(id: string, d: any): PendingUser {
  return {
    id,
    email: d.email ?? '',
    displayName: d.displayName ?? '',
    phoneNumber: d.phoneNumber ?? '',
    city: d.city ?? '',
    cnicNumber: d.cnicNumber ?? '',
    role: (d.role === 'seller' ? 'seller' : 'buyer') as PendingUser['role'],
    dealershipName: d.dealershipName ?? '',
    dealershipAddress: d.dealershipAddress ?? '',
    dealershipPhone: d.dealershipPhone ?? '',
    dealershipLat:
      typeof d.dealershipLat === 'number' ? d.dealershipLat : null,
    dealershipLng:
      typeof d.dealershipLng === 'number' ? d.dealershipLng : null,
    kycCnicFrontPath: d.kycCnicFrontPath ?? null,
    kycCnicBackPath: d.kycCnicBackPath ?? null,
    kycBusinessLicensePath: d.kycBusinessLicensePath ?? null,
    kycShowroomPhotoPath: d.kycShowroomPhotoPath ?? null,
    verificationStatus: d.verificationStatus ?? 'pending',
    verificationNotes: d.verificationNotes ?? null,
    createdAt: d.createdAt ?? null,
  };
}
