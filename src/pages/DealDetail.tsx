import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Handshake,
  MapPin,
  MessageCircle,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { pkr, relativeTime, shortDate, tsToDate } from '../lib/format';

const SUPABASE_PUBLIC_BASE =
  'https://ntjpjkglnjtsnxjgrckv.supabase.co/storage/v1/object/public/deal_documents';

type DealState =
  | 'pendingAcceptance'
  | 'agreed'
  | 'docsShared'
  | 'meetingSet'
  | 'sold'
  | 'cancelled';

interface DealDoc {
  id: string;
  slot: string;
  storagePath: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: any;
  sizeBytes: number;
}

interface UserLite {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoUrl: string;
  role: 'buyer' | 'seller' | null;
  verificationStatus: string;
}

interface DealDetailDoc {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCover: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  state: DealState;
  finalPrice: number;
  createdFromAuction: boolean;
  pendingAcceptanceAt: any;
  agreedAt: any;
  docsSharedAt: any;
  meetingSetAt: any;
  soldAt: any;
  cancelledAt: any;
  meetingDate: any;
  meetingLocation: string;
  sellerConfirmedSold: boolean;
  buyerConfirmedSold: boolean;
  cancelledBy: string;
  cancelReason: string;
  docsCount: number;
  createdAt: any;
  updatedAt: any;
}

const STATE_LABELS: Record<DealState, { label: string; tone: any }> = {
  pendingAcceptance: { label: 'Pending acceptance', tone: 'neutral' },
  agreed: { label: 'Agreed', tone: 'brand' },
  docsShared: { label: 'Docs shared', tone: 'brand' },
  meetingSet: { label: 'Meeting set', tone: 'warning' },
  sold: { label: 'Sold', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

const TIMELINE_ORDER: Array<{
  key: DealState;
  field: keyof DealDetailDoc;
  label: string;
}> = [
  {
    key: 'pendingAcceptance',
    field: 'pendingAcceptanceAt',
    label: 'Pending acceptance',
  },
  { key: 'agreed', field: 'agreedAt', label: 'Agreed' },
  { key: 'docsShared', field: 'docsSharedAt', label: 'Docs shared' },
  { key: 'meetingSet', field: 'meetingSetAt', label: 'Meeting set' },
  { key: 'sold', field: 'soldAt', label: 'Sold' },
];

const SLOT_LABELS: Record<string, string> = {
  registration_front: 'Registration (front)',
  registration_back: 'Registration (back)',
  cnic: 'CNIC',
  transfer_letter: 'Transfer letter',
  other: 'Other',
};

function fmtBytes(b: number): string {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function publicDocUrl(path: string): string {
  if (!path) return '';
  const clean = path.replace(/^\/+/, '');
  return `${SUPABASE_PUBLIC_BASE}/${clean}`;
}

export default function DealDetail({ email }: { email: string | null }) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<DealDetailDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DealDoc[]>([]);
  const [seller, setSeller] = useState<UserLite | null>(null);
  const [buyer, setBuyer] = useState<UserLite | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'deals', id),
      (snap) => {
        if (!snap.exists()) {
          setDeal(null);
          setLoading(false);
          return;
        }
        const d = snap.data() as any;
        setDeal({
          id: snap.id,
          listingId: (d.listingId as string) ?? '',
          listingTitle: (d.listingTitle as string) ?? '',
          listingCover: (d.listingCover as string) ?? '',
          sellerId: (d.sellerId as string) ?? '',
          sellerName: (d.sellerName as string) ?? 'Seller',
          buyerId: (d.buyerId as string) ?? '',
          buyerName: (d.buyerName as string) ?? 'Buyer',
          state: ((d.state as string) ?? 'agreed') as DealState,
          finalPrice: (d.finalPrice as number) ?? 0,
          createdFromAuction: (d.createdFromAuction as boolean) ?? false,
          pendingAcceptanceAt: d.pendingAcceptanceAt ?? null,
          agreedAt: d.agreedAt ?? null,
          docsSharedAt: d.docsSharedAt ?? null,
          meetingSetAt: d.meetingSetAt ?? null,
          soldAt: d.soldAt ?? null,
          cancelledAt: d.cancelledAt ?? null,
          meetingDate: d.meetingDate ?? null,
          meetingLocation: (d.meetingLocation as string) ?? '',
          sellerConfirmedSold: (d.sellerConfirmedSold as boolean) ?? false,
          buyerConfirmedSold: (d.buyerConfirmedSold as boolean) ?? false,
          cancelledBy: (d.cancelledBy as string) ?? '',
          cancelReason: (d.cancelReason as string) ?? '',
          docsCount: (d.docsCount as number) ?? 0,
          createdAt: d.createdAt ?? null,
          updatedAt: d.updatedAt ?? null,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'deals', id, 'docs'),
      orderBy('uploadedAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: DealDoc[] = snap.docs.map((s) => {
        const d = s.data() as any;
        return {
          id: s.id,
          slot: (d.slot as string) ?? 'other',
          storagePath: (d.storagePath as string) ?? '',
          mimeType: (d.mimeType as string) ?? '',
          uploadedBy: (d.uploadedBy as string) ?? '',
          uploadedAt: d.uploadedAt ?? null,
          sizeBytes: (d.sizeBytes as number) ?? 0,
        };
      });
      setDocs(list);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!deal?.sellerId) return;
    const unsub = onSnapshot(doc(db, 'users', deal.sellerId), (snap) => {
      if (!snap.exists()) {
        setSeller(null);
        return;
      }
      const d = snap.data() as any;
      setSeller({
        id: snap.id,
        displayName: (d.displayName as string) ?? deal.sellerName,
        email: (d.email as string) ?? '',
        phoneNumber: (d.phoneNumber as string) ?? '',
        photoUrl: (d.photoUrl as string) ?? '',
        role: (d.role as any) ?? null,
        verificationStatus: (d.verificationStatus as string) ?? 'unverified',
      });
    });
    return unsub;
  }, [deal?.sellerId, deal?.sellerName]);

  useEffect(() => {
    if (!deal?.buyerId) return;
    const unsub = onSnapshot(doc(db, 'users', deal.buyerId), (snap) => {
      if (!snap.exists()) {
        setBuyer(null);
        return;
      }
      const d = snap.data() as any;
      setBuyer({
        id: snap.id,
        displayName: (d.displayName as string) ?? deal.buyerName,
        email: (d.email as string) ?? '',
        phoneNumber: (d.phoneNumber as string) ?? '',
        photoUrl: (d.photoUrl as string) ?? '',
        role: (d.role as any) ?? null,
        verificationStatus: (d.verificationStatus as string) ?? 'unverified',
      });
    });
    return unsub;
  }, [deal?.buyerId, deal?.buyerName]);

  const stateMeta = useMemo(
    () =>
      deal
        ? STATE_LABELS[deal.state] ?? { label: deal.state, tone: 'neutral' }
        : null,
    [deal],
  );

  return (
    <Layout
      email={email}
      title="Deal details"
      subtitle={loading ? 'Loading…' : deal ? deal.listingTitle : 'Not found'}
      actions={
        <button
          onClick={() => navigate('/deals')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> Back to deals
        </button>
      }
    >
      {loading ? (
        <div className="text-sm text-ink-soft">Loading deal…</div>
      ) : error ? (
        <div className="text-sm text-rose-600">Error: {error}</div>
      ) : !deal ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <Handshake size={28} className="mx-auto text-ink-soft" />
          <div className="mt-2 font-semibold">Deal not found</div>
          <div className="text-sm text-ink-soft">
            It may have been deleted, or the id is invalid.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing summary */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex gap-4 p-4">
                {deal.listingCover ? (
                  <img
                    src={deal.listingCover}
                    alt=""
                    className="w-32 h-24 rounded-lg object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-32 h-24 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {stateMeta && (
                      <Badge tone={stateMeta.tone}>{stateMeta.label}</Badge>
                    )}
                    {deal.createdFromAuction && (
                      <Badge tone="amber">From auction</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-lg font-bold text-ink truncate">
                    {deal.listingTitle || '—'}
                  </div>
                  <div className="text-xs text-ink-soft font-mono">
                    {deal.id}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-brand-900">
                    {pkr(deal.finalPrice)}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {deal.listingId && (
                      <Link
                        to={`/listings/${deal.listingId}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50"
                      >
                        Open listing
                      </Link>
                    )}
                    {deal.sellerId && deal.buyerId && (
                      <Link
                        to={`/chats`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50"
                      >
                        <MessageCircle size={12} /> Open chats
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-ink mb-3">
                Timeline
              </div>
              <ol className="space-y-3">
                {TIMELINE_ORDER.map((step) => {
                  const ts = tsToDate((deal as any)[step.field]);
                  const reached = ts !== null;
                  const isCurrent = deal.state === step.key && reached;
                  return (
                    <li key={step.key} className="flex items-start gap-3">
                      <div
                        className={`mt-1 w-4 h-4 rounded-full grid place-items-center flex-shrink-0 ${
                          reached
                            ? isCurrent
                              ? 'bg-brand-500'
                              : 'bg-emerald-500'
                            : 'bg-gray-200'
                        }`}
                      >
                        {reached && (
                          <Check size={10} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-sm font-medium ${
                            reached ? 'text-ink' : 'text-ink-soft'
                          }`}
                        >
                          {step.label}
                          {isCurrent && (
                            <span className="ml-2 text-[10px] font-bold text-brand-700">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {ts ? shortDate(ts) : '—'}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {deal.state === 'cancelled' && (
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-4 h-4 rounded-full bg-rose-500 grid place-items-center flex-shrink-0">
                      <X size={10} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-rose-700">
                        Cancelled
                        <span className="ml-2 text-[10px] font-bold text-rose-700">
                          CURRENT
                        </span>
                      </div>
                      <div className="text-xs text-ink-soft">
                        {tsToDate(deal.cancelledAt)
                          ? shortDate(tsToDate(deal.cancelledAt)!)
                          : '—'}
                      </div>
                    </div>
                  </li>
                )}
              </ol>
            </div>

            {/* Meeting */}
            {(tsToDate(deal.meetingDate) || deal.meetingLocation) && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                  <CalendarDays size={14} /> Meeting
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-soft">Date</div>
                    <div className="text-ink">
                      {tsToDate(deal.meetingDate)
                        ? shortDate(tsToDate(deal.meetingDate)!)
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-soft flex items-center gap-1">
                      <MapPin size={11} /> Location
                    </div>
                    <div className="text-ink">
                      {deal.meetingLocation || '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation */}
            {deal.state === 'cancelled' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-sm font-semibold text-rose-800 mb-2 flex items-center gap-2">
                  <ShieldAlert size={14} /> Cancellation
                </div>
                <div className="text-sm text-rose-900">
                  <div className="text-xs text-rose-700">Cancelled by</div>
                  <div className="font-mono text-xs break-all">
                    {deal.cancelledBy || '—'}
                    {deal.cancelledBy === deal.sellerId && ' (seller)'}
                    {deal.cancelledBy === deal.buyerId && ' (buyer)'}
                  </div>
                  <div className="mt-2 text-xs text-rose-700">Reason</div>
                  <div className="whitespace-pre-wrap">
                    {deal.cancelReason || '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="text-sm font-semibold text-ink flex items-center gap-2">
                  <FileText size={14} /> Documents
                </div>
                <Badge tone="neutral">{docs.length}</Badge>
              </div>
              {docs.length === 0 ? (
                <div className="px-4 py-6 text-sm text-ink-soft text-center">
                  No documents uploaded yet.
                </div>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-ink-soft uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2">Slot</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Size</th>
                      <th className="px-4 py-2">Uploaded by</th>
                      <th className="px-4 py-2">When</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {docs.map((d) => {
                      const url = publicDocUrl(d.storagePath);
                      const uploaderTag =
                        d.uploadedBy === deal.sellerId
                          ? 'seller'
                          : d.uploadedBy === deal.buyerId
                            ? 'buyer'
                            : 'user';
                      return (
                        <tr key={d.id}>
                          <td className="px-4 py-2 text-sm font-medium">
                            {SLOT_LABELS[d.slot] ?? d.slot}
                          </td>
                          <td className="px-4 py-2 text-xs text-ink-soft">
                            {d.mimeType || '—'}
                          </td>
                          <td className="px-4 py-2 text-xs text-ink-soft">
                            {fmtBytes(d.sizeBytes)}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {uploaderTag}
                          </td>
                          <td className="px-4 py-2 text-xs text-ink-soft">
                            {relativeTime(tsToDate(d.uploadedAt))}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                              >
                                View
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Parties */}
            <PartyCard
              role="Seller"
              uid={deal.sellerId}
              fallbackName={deal.sellerName}
              user={seller}
              confirmed={deal.sellerConfirmedSold}
            />
            <PartyCard
              role="Buyer"
              uid={deal.buyerId}
              fallbackName={deal.buyerName}
              user={buyer}
              confirmed={deal.buyerConfirmedSold}
            />

            {/* At a glance */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-ink mb-3">
                At a glance
              </div>
              <dl className="space-y-2 text-sm">
                <Row
                  label="Created"
                  value={
                    tsToDate(deal.createdAt)
                      ? shortDate(tsToDate(deal.createdAt)!)
                      : '—'
                  }
                />
                <Row
                  label="Last update"
                  value={relativeTime(tsToDate(deal.updatedAt))}
                />
                <Row
                  label="From auction"
                  value={deal.createdFromAuction ? 'Yes' : 'No'}
                />
                <Row
                  label="Documents"
                  value={String(deal.docsCount || docs.length || 0)}
                />
                <Row
                  label="Both confirmed"
                  value={
                    deal.sellerConfirmedSold && deal.buyerConfirmedSold
                      ? 'Yes'
                      : 'No'
                  }
                />
              </dl>
            </div>

            {/* Identifier */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
                Deal id
              </div>
              <div className="text-xs font-mono break-all">{deal.id}</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft text-xs">{label}</dt>
      <dd className="text-ink text-xs text-right">{value}</dd>
    </div>
  );
}

function PartyCard({
  role,
  uid,
  fallbackName,
  user,
  confirmed,
}: {
  role: 'Seller' | 'Buyer';
  uid: string;
  fallbackName: string;
  user: UserLite | null;
  confirmed: boolean;
}) {
  const name = user?.displayName ?? fallbackName;
  const verified = user?.verificationStatus === 'verified';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
          {role}
        </div>
        <Badge tone={confirmed ? 'success' : 'neutral'}>
          {confirmed ? 'Confirmed sold' : 'Not confirmed'}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Avatar photoUrl={user?.photoUrl} name={name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-ink truncate">{name}</div>
            {verified && <Badge tone="success">Verified</Badge>}
          </div>
          <div className="text-xs text-ink-soft truncate">
            {user?.email || '—'}
          </div>
          {user?.phoneNumber && (
            <div className="text-xs text-ink-soft truncate">
              {user.phoneNumber}
            </div>
          )}
        </div>
      </div>
      {uid && (
        <Link
          to={`/users/${uid}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-50"
        >
          Open profile
        </Link>
      )}
    </div>
  );
}
