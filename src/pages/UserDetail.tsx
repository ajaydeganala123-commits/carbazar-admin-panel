import {
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  MailOpen,
  MapPin,
  MessageSquare,
  Shield,
  ShieldOff,
  ShieldX,
  Smartphone,
  Store,
  TicketCheck,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { pkr, relativeTime, shortDate } from '../lib/format';

interface UserDoc {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  city: string;
  cnicNumber: string;
  dealershipName: string;
  dealershipAddress: string;
  dealershipPhone: string;
  dealershipLat: number | null;
  dealershipLng: number | null;
  photoUrl: string;
  role: 'buyer' | 'seller';
  sellerType: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'blocked';
  verificationNotes: string | null;
  createdAt: any;
  lastLoginAt: any;
  presence: string | null;
  lastActiveAt: any;
  preferredBrands: string[];
  minBudget: number | null;
  maxBudget: number | null;
  preferredCondition: string | null;
}

interface ListingLite {
  id: string;
  title: string;
  status: string;
  isAuction: boolean;
  currentPrice: number;
  createdAt: any;
  city: string;
  bidCount: number | null;
  viewCount: number;
}

interface ReportLite {
  id: string;
  reason: string;
  status: string;
  notes: string;
  createdAt: any;
}

interface TicketLite {
  id: string;
  title: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'medium' | 'high';
  updatedAt: any;
}

export default function UserDetail({ email }: { email: string | null }) {
  const { uid = '' } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingLite[]>([]);
  const [reports, setReports] = useState<ReportLite[]>([]);
  const [tickets, setTickets] = useState<TicketLite[]>([]);
  const [deviceCount, setDeviceCount] = useState<number>(0);
  const [chatCount, setChatCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');

  // Live user doc.
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) {
          setUser(null);
          setLoading(false);
          setError('User not found');
          return;
        }
        const d = snap.data() as Record<string, unknown>;
        const u: UserDoc = {
          id: snap.id,
          email: (d.email as string) ?? '',
          displayName: (d.displayName as string) ?? '',
          phoneNumber: (d.phoneNumber as string) ?? '',
          city: (d.city as string) ?? '',
          cnicNumber: (d.cnicNumber as string) ?? '',
          dealershipName: (d.dealershipName as string) ?? '',
          dealershipAddress: (d.dealershipAddress as string) ?? '',
          dealershipPhone: (d.dealershipPhone as string) ?? '',
          dealershipLat:
            typeof d.dealershipLat === 'number' ? (d.dealershipLat as number) : null,
          dealershipLng:
            typeof d.dealershipLng === 'number' ? (d.dealershipLng as number) : null,
          photoUrl: (d.photoUrl as string) ?? '',
          role: (d.role === 'seller' ? 'seller' : 'buyer') as UserDoc['role'],
          sellerType: (d.sellerType as string) ?? '',
          verificationStatus:
            ((d.verificationStatus as string) ?? 'unverified') as UserDoc['verificationStatus'],
          verificationNotes: (d.verificationNotes as string) ?? null,
          createdAt: d.createdAt,
          lastLoginAt: d.lastLoginAt,
          presence: (d.presence as string) ?? null,
          lastActiveAt: d.lastActiveAt,
          preferredBrands: Array.isArray(d.preferredBrands) ? (d.preferredBrands as string[]) : [],
          minBudget: typeof d.minBudget === 'number' ? (d.minBudget as number) : null,
          maxBudget: typeof d.maxBudget === 'number' ? (d.maxBudget as number) : null,
          preferredCondition: (d.preferredCondition as string) ?? null,
        };
        setUser(u);
        setNotes(u.verificationNotes ?? '');
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  // Live: their listings.
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'listings'), where('sellerId', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      setListings(
        snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              title: (data.title as string) ?? 'Untitled',
              status: (data.status as string) ?? 'active',
              isAuction: Boolean(data.isAuction),
              currentPrice:
                typeof data.currentPrice === 'number'
                  ? (data.currentPrice as number)
                  : 0,
              createdAt: data.createdAt,
              city: (data.city as string) ?? '',
              bidCount:
                typeof data.bidCount === 'number' ? (data.bidCount as number) : null,
              viewCount:
                typeof data.viewCount === 'number' ? (data.viewCount as number) : 0,
            };
          })
          .sort((a, b) => {
            const ad = (a.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
            const bd = (b.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
            return bd - ad;
          }),
      );
    });
    return () => unsub();
  }, [uid]);

  // Live: reports filed against this user.
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'reports'), where('subjectUid', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      setReports(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            reason: (data.reason as string) ?? 'other',
            status: (data.status as string) ?? 'open',
            notes: (data.notes as string) ?? '',
            createdAt: data.createdAt,
          };
        }),
      );
    });
    return () => unsub();
  }, [uid]);

  // Live: support tickets they filed.
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'support_tickets'), where('userId', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(
        snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              title: (data.title as string) ?? 'Untitled ticket',
              status: ((data.status as string) ?? 'open') as TicketLite['status'],
              priority: ((data.priority as string) ?? 'medium') as TicketLite['priority'],
              updatedAt: data.updatedAt,
            };
          })
          .sort((a, b) => {
            const ad = (a.updatedAt as any)?.toDate?.()?.getTime?.() ?? 0;
            const bd = (b.updatedAt as any)?.toDate?.()?.getTime?.() ?? 0;
            return bd - ad;
          }),
      );
    });
    return () => unsub();
  }, [uid]);

  // One-shot: count registered devices and chat threads.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const devs = await getDocs(collection(db, 'users', uid, 'devices'));
        if (!cancelled) setDeviceCount(devs.size);
      } catch {
        // Permission or absence — fine.
      }
      try {
        const chats = await getDocs(
          query(collection(db, 'chats'), where('participants', 'array-contains', uid)),
        );
        if (!cancelled) setChatCount(chats.size);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const stats = useMemo(() => {
    return {
      totalListings: listings.length,
      activeListings: listings.filter((l) => l.status === 'active').length,
      auctionListings: listings.filter((l) => l.isAuction).length,
      reportsOpen: reports.filter((r) => r.status === 'open').length,
      ticketsOpen: tickets.filter((t) => t.status !== 'closed').length,
    };
  }, [listings, reports, tickets]);

  async function setStatus(
    status: UserDoc['verificationStatus'],
    confirmText?: string,
  ) {
    if (!user) return;
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    try {
      const patch: Record<string, unknown> = {
        verificationStatus: status,
        verificationNotes: notes.trim().length > 0 ? notes.trim() : null,
      };
      await updateDoc(doc(db, 'users', user.id), patch);
    } catch (e: any) {
      alert(`Could not update status: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveNotesOnly() {
    if (!user) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        verificationNotes: notes.trim().length > 0 ? notes.trim() : null,
        notesUpdatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      alert(`Could not save notes: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout
      email={email}
      title={user?.displayName || (loading ? 'Loading…' : 'User')}
      subtitle={user?.email || user?.phoneNumber || uid}
      actions={
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> Back
        </button>
      }
    >
      {error && (
        <div className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 border border-rose-200 text-sm">
          {error}
        </div>
      )}
      {loading && <div className="text-sm text-ink-muted">Loading…</div>}

      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          <div className="space-y-6">
            <Card>
              <div className="flex items-start gap-4">
                <Avatar
                  photoUrl={user.photoUrl}
                  name={user.displayName || user.email}
                  size={72}
                />
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-ink leading-tight">
                    {user.displayName || 'CARBAZAR member'}
                  </h2>
                  <div className="text-sm text-ink-muted mt-1 truncate">
                    {user.email || user.phoneNumber || user.id}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={user.role === 'seller' ? 'amber' : 'brand'}>
                      {user.role}
                    </Badge>
                    <StatusBadge status={user.verificationStatus} />
                    <span className="text-xs text-ink-muted">
                      Joined {shortDate(user.createdAt)}
                    </span>
                    <span className="text-xs text-ink-muted">
                      · {presenceLabel(user)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Listings" value={`${stats.totalListings}`} />
                <Stat label="Active" value={`${stats.activeListings}`} />
                <Stat label="Auctions" value={`${stats.auctionListings}`} />
                <Stat label="Devices" value={`${deviceCount}`} />
              </div>
            </Card>

            <Card title="Identity" icon={<UserIcon size={16} />}>
              <KeyValueGrid
                rows={[
                  ['Email', user.email || '—'],
                  ['Phone', user.phoneNumber || '—'],
                  ['City', user.city || '—'],
                  [
                    'CNIC',
                    user.cnicNumber ? (
                      <code className="font-mono text-xs">{user.cnicNumber}</code>
                    ) : (
                      '—'
                    ),
                  ],
                  ['Last login', user.lastLoginAt ? relativeTime(user.lastLoginAt) : '—'],
                  ['Presence', presenceLabel(user)],
                ]}
              />
            </Card>

            {user.role === 'seller' && (
              <Card title="Seller business" icon={<Store size={16} />}>
                <KeyValueGrid
                  rows={[
                    ['Type', user.sellerType || 'individual'],
                    ['Dealership', user.dealershipName || '—'],
                    ['Address', user.dealershipAddress || '—'],
                    ['Business phone', user.dealershipPhone || '—'],
                    [
                      'Coordinates',
                      user.dealershipLat != null && user.dealershipLng != null ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${user.dealershipLat},${user.dealershipLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-900 font-semibold"
                        >
                          <MapPin size={12} /> Open in Maps
                        </a>
                      ) : (
                        '—'
                      ),
                    ],
                  ]}
                />
              </Card>
            )}

            {user.role === 'buyer' && (user.preferredBrands.length > 0 ||
              user.minBudget != null ||
              user.maxBudget != null) && (
              <Card title="Buyer preferences">
                <KeyValueGrid
                  rows={[
                    [
                      'Preferred brands',
                      user.preferredBrands.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {user.preferredBrands.map((b) => (
                            <Badge key={b} tone="brand">
                              {b}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        '—'
                      ),
                    ],
                    [
                      'Budget',
                      user.minBudget != null && user.maxBudget != null
                        ? `${pkr(user.minBudget)} – ${pkr(user.maxBudget)}`
                        : '—',
                    ],
                    ['Condition', user.preferredCondition || '—'],
                  ]}
                />
              </Card>
            )}

            <Card
              title={`Listings (${listings.length})`}
              icon={<ChevronRight size={16} />}
            >
              {listings.length === 0 ? (
                <EmptyRow text="No listings posted yet." />
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg bg-white">
                  {listings.slice(0, 12).map((l) => (
                    <li key={l.id} className="px-3 py-2 text-sm">
                      <Link
                        to={`/listings/${l.id}`}
                        className="flex items-center justify-between gap-3 group"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold text-ink group-hover:text-brand-700 truncate block">
                            {l.title}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {l.isAuction ? 'Auction' : 'Fixed'} · {pkr(l.currentPrice)}{' '}
                            · {l.city || 'N/A'} · {relativeTime(l.createdAt)}
                            {l.isAuction && l.bidCount != null
                              ? ` · ${l.bidCount} bids`
                              : ` · ${l.viewCount} views`}
                          </span>
                        </span>
                        <ListingStatusBadge status={l.status} />
                      </Link>
                    </li>
                  ))}
                  {listings.length > 12 && (
                    <li className="px-3 py-2 text-xs text-ink-muted text-center">
                      +{listings.length - 12} more
                    </li>
                  )}
                </ul>
              )}
            </Card>

            <Card
              title={`Reports filed against this user (${reports.length})`}
            >
              {reports.length === 0 ? (
                <EmptyRow text="No reports — clean record." />
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg bg-white">
                  {reports.map((r) => (
                    <li key={r.id} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{r.reason}</span>
                        <Badge tone={r.status === 'open' ? 'warning' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </div>
                      {r.notes && (
                        <div className="text-xs text-ink-muted mt-1">{r.notes}</div>
                      )}
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {relativeTime(r.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title={`Support tickets (${tickets.length})`}
              icon={<TicketCheck size={16} />}
            >
              {tickets.length === 0 ? (
                <EmptyRow text="Hasn't filed any support tickets." />
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg bg-white">
                  {tickets.slice(0, 6).map((t) => (
                    <li key={t.id} className="px-3 py-2 text-sm">
                      <Link
                        to="/support"
                        className="flex items-center justify-between gap-3 group"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold text-ink group-hover:text-brand-700">
                            {t.title}
                          </span>
                          <span className="text-xs text-ink-muted ml-2">
                            {t.priority} · updated {relativeTime(t.updatedAt)}
                          </span>
                        </span>
                        <TicketStatusBadge status={t.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <DevicesCard uid={user.id} />
          </div>

          <div className="space-y-6">
            <Card title="Moderation actions">
              <div className="grid grid-cols-2 gap-2">
                <ModButton
                  busy={busy}
                  disabled={user.verificationStatus === 'verified'}
                  tone="emerald"
                  onClick={() => setStatus('verified')}
                  icon={<CheckCircle2 size={12} />}
                  label="Verify"
                />
                <ModButton
                  busy={busy}
                  disabled={user.verificationStatus === 'pending'}
                  tone="amber"
                  onClick={() => setStatus('pending')}
                  icon={<Hourglass size={12} />}
                  label="Mark pending"
                />
                <ModButton
                  busy={busy}
                  disabled={user.verificationStatus === 'unverified'}
                  tone="gray"
                  onClick={() => setStatus('unverified')}
                  icon={<MailOpen size={12} />}
                  label="Reset to unverified"
                />
                <ModButton
                  busy={busy}
                  disabled={user.verificationStatus === 'blocked'}
                  tone="rose"
                  onClick={() =>
                    setStatus(
                      'blocked',
                      `Suspend ${user.displayName || user.email || 'this account'}? They will be locked out of every action until you unblock.`,
                    )
                  }
                  icon={<ShieldX size={12} />}
                  label="Suspend"
                />
                {user.verificationStatus === 'blocked' && (
                  <ModButton
                    busy={busy}
                    tone="brand"
                    onClick={() => setStatus('unverified')}
                    icon={<Shield size={12} />}
                    label="Unblock"
                  />
                )}
              </div>
            </Card>

            <Card title="Admin notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes shown to the user when they're rejected or blocked…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="mt-2 flex justify-end">
                <button
                  disabled={busy}
                  onClick={saveNotesOnly}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold"
                >
                  Save notes
                </button>
              </div>
            </Card>

            <Card title="At a glance">
              <div className="space-y-2">
                <Tile
                  icon={<MessageSquare size={14} />}
                  label="Active chat threads"
                  value={`${chatCount}`}
                />
                <Tile
                  icon={<Smartphone size={14} />}
                  label="Registered devices"
                  value={`${deviceCount}`}
                />
                <Tile
                  icon={<ShieldOff size={14} />}
                  label="Open reports"
                  value={`${stats.reportsOpen}`}
                />
                <Tile
                  icon={<TicketCheck size={14} />}
                  label="Open tickets"
                  value={`${stats.ticketsOpen}`}
                />
              </div>
            </Card>

            <Card title="Identifier">
              <code className="text-xs font-mono bg-gray-50 border border-gray-100 rounded px-2 py-1 break-all block">
                {user.id}
              </code>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────

function Card({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-5">
      {title && (
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
          {icon}
          <span>{title}</span>
        </h3>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
        {label}
      </div>
      <div className="font-bold text-ink mt-0.5">{value}</div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-ink-soft">
        {icon}
        <span>{label}</span>
      </span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}

function KeyValueGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-3 gap-y-2 text-sm">
      {rows.map(([k, v], i) => (
        <div key={`${k}-${i}`} className="contents">
          <dt className="col-span-1 text-xs text-ink-muted">{k}</dt>
          <dd className="col-span-2 text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusBadge({ status }: { status: UserDoc['verificationStatus'] }) {
  switch (status) {
    case 'verified':
      return <Badge tone="success">Verified</Badge>;
    case 'pending':
      return <Badge tone="warning">Pending</Badge>;
    case 'blocked':
      return (
        <Badge tone="danger">
          <ShieldOff size={10} className="inline mr-0.5" /> Blocked
        </Badge>
      );
    default:
      return <Badge tone="neutral">Unverified</Badge>;
  }
}

function ListingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <Badge tone="success">Active</Badge>;
    case 'pending':
      return <Badge tone="warning">Pending</Badge>;
    case 'sold':
      return <Badge tone="neutral">Sold</Badge>;
    case 'blocked':
      return <Badge tone="danger">Blocked</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

function TicketStatusBadge({ status }: { status: TicketLite['status'] }) {
  switch (status) {
    case 'open':
      return <Badge tone="warning">Open</Badge>;
    case 'answered':
      return <Badge tone="brand">Answered</Badge>;
    case 'closed':
      return <Badge tone="neutral">Closed</Badge>;
  }
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="text-xs text-ink-muted bg-gray-50 border border-gray-100 rounded-lg px-3 py-3 text-center">
      {text}
    </div>
  );
}

function ModButton({
  busy,
  disabled,
  tone,
  onClick,
  icon,
  label,
}: {
  busy: boolean;
  disabled?: boolean;
  tone: 'emerald' | 'amber' | 'gray' | 'rose' | 'brand';
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const styles: Record<typeof tone, string> = {
    emerald:
      'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200',
    gray: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200',
    rose: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200',
    brand: 'bg-brand-50 hover:bg-brand-100 text-brand-800 border-brand-200',
  } as Record<'emerald' | 'amber' | 'gray' | 'rose' | 'brand', string>;
  return (
    <button
      disabled={busy || disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 rounded-md border disabled:opacity-50 px-3 py-2 text-xs font-semibold ${styles[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function presenceLabel(u: UserDoc): string {
  if (u.presence === 'online') return 'Online';
  if (u.presence === 'away') return 'Away';
  if (u.lastActiveAt) return `Last active ${relativeTime(u.lastActiveAt)}`;
  return 'Offline';
}

// ── Devices ────────────────────────────────────────────────────────────

interface DeviceRow {
  installId: string;
  platform: string;
  osVersion: string | null;
  manufacturer: string | null;
  model: string | null;
  appVersion: string | null;
  firstSignInAt: any;
  lastActiveAt: any;
  revokedAt: any;
}

function DevicesCard({ uid }: { uid: string }) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users', uid, 'devices'), orderBy('lastActiveAt', 'desc')),
      );
      setDevices(
        snap.docs.map((d) => ({
          installId: d.id,
          platform: (d.data().platform as string) ?? 'other',
          osVersion: (d.data().osVersion as string) ?? null,
          manufacturer: (d.data().manufacturer as string) ?? null,
          model: (d.data().model as string) ?? null,
          appVersion: (d.data().appVersion as string) ?? null,
          firstSignInAt: d.data().firstSignInAt ?? null,
          lastActiveAt: d.data().lastActiveAt ?? null,
          revokedAt: d.data().revokedAt ?? null,
        })),
      );
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleRevoke = useCallback(
    async (installId: string, revoked: boolean) => {
      setBusy(installId);
      try {
        await setDoc(
          doc(db, 'users', uid, 'devices', installId),
          revoked
            ? { revokedAt: deleteField() }
            : { revokedAt: serverTimestamp() },
          { merge: true },
        );
        await reload();
      } finally {
        setBusy(null);
      }
    },
    [uid, reload],
  );

  return (
    <Card title={`Devices (${devices.length})`} icon={<Smartphone size={16} />}>
      {loading ? (
        <EmptyRow text="Loading devices…" />
      ) : devices.length === 0 ? (
        <EmptyRow text="This user hasn't signed in on a device yet." />
      ) : (
        <ul className="space-y-2">
          {devices.map((d) => (
            <li
              key={d.installId}
              className={`rounded-lg border p-3 ${
                d.revokedAt
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink truncate">
                    {[d.manufacturer, d.model].filter(Boolean).join(' ') ||
                      d.platform.toUpperCase()}
                  </div>
                  <div className="text-xs text-ink-soft">
                    {[d.osVersion, d.appVersion].filter(Boolean).join(' · ') ||
                      '—'}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1">
                    Active {relativeTime(d.lastActiveAt?.toDate?.() ?? null)}{' '}
                    · joined{' '}
                    {relativeTime(d.firstSignInAt?.toDate?.() ?? null)}
                  </div>
                  <div className="text-[10px] text-ink-muted mt-1 font-mono break-all">
                    {d.installId}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={d.revokedAt ? 'danger' : 'success'}>
                    {d.revokedAt ? 'Revoked' : 'Active'}
                  </Badge>
                  <button
                    disabled={busy === d.installId}
                    onClick={() => toggleRevoke(d.installId, !!d.revokedAt)}
                    className={`text-[11px] font-semibold rounded px-2 py-1 border disabled:opacity-50 ${
                      d.revokedAt
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {d.revokedAt ? 'Restore' : 'Revoke'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
