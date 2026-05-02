import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Eye,
  Gavel,
  ImageOff,
  MapPin,
  ShieldOff,
  Tag,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { pkr, relativeTime, shortDate, timeUntil } from '../lib/format';

interface ListingDoc {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'pending' | 'sold' | 'expired' | 'blocked';
  isAuction: boolean;
  isVerified: boolean;
  coverImage: string;
  images: string[];
  city: string;
  brand: string;
  model: string;
  bodyType: string;
  year: number | null;
  mileage: number | null;
  transmission: string;
  fuelType: string;
  currentPrice: number;
  basePrice: number | null;
  bidCount: number | null;
  viewCount: number;
  sellerId: string;
  sellerName: string;
  createdAt: any;
  auctionEndTime: any;
}

interface BidRow {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: any;
}

interface SellerLite {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  city: string;
  verificationStatus: string;
  role: string;
  photoUrl: string;
}

export default function ListingDetail({ email }: { email: string | null }) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<ListingDoc | null>(null);
  const [seller, setSeller] = useState<SellerLite | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState<string>('');

  // Live listing.
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'listings', id),
      async (snap) => {
        if (!snap.exists()) {
          setListing(null);
          setLoading(false);
          setError('Listing not found');
          return;
        }
        const d = snap.data() as Record<string, unknown>;
        const l: ListingDoc = {
          id: snap.id,
          title: (d.title as string) ?? 'Untitled',
          description: (d.description as string) ?? '',
          status: ((d.status as string) ?? 'active') as ListingDoc['status'],
          isAuction: !!d.isAuction,
          isVerified: !!d.isVerified,
          coverImage: (d.coverImage as string) ?? '',
          images: Array.isArray(d.images) ? (d.images as string[]) : [],
          city: (d.city as string) ?? '',
          brand: (d.brand as string) ?? '',
          model: (d.model as string) ?? '',
          bodyType: (d.bodyType as string) ?? '',
          year: typeof d.year === 'number' ? (d.year as number) : null,
          mileage: typeof d.mileage === 'number' ? (d.mileage as number) : null,
          transmission: (d.transmission as string) ?? '',
          fuelType: (d.fuelType as string) ?? '',
          currentPrice:
            typeof d.currentPrice === 'number' ? (d.currentPrice as number) : 0,
          basePrice: typeof d.basePrice === 'number' ? (d.basePrice as number) : null,
          bidCount:
            typeof d.bidCount === 'number' ? (d.bidCount as number) : null,
          viewCount: typeof d.viewCount === 'number' ? (d.viewCount as number) : 0,
          sellerId: (d.sellerId as string) ?? '',
          sellerName: (d.sellerName as string) ?? 'Unknown',
          createdAt: d.createdAt,
          auctionEndTime: d.auctionEndTime,
        };
        setListing(l);
        setLoading(false);
        setError(null);
        // Initialise hero image once.
        setActiveImage((curr) => (curr ? curr : l.images[0] ?? l.coverImage));

        // Fetch seller doc (best-effort).
        if (l.sellerId) {
          try {
            const sellerSnap = await getDoc(doc(db, 'users', l.sellerId));
            if (sellerSnap.exists()) {
              const ud = sellerSnap.data() as Record<string, unknown>;
              setSeller({
                id: sellerSnap.id,
                displayName: (ud.displayName as string) ?? '',
                email: (ud.email as string) ?? '',
                phoneNumber: (ud.phoneNumber as string) ?? '',
                city: (ud.city as string) ?? '',
                verificationStatus: (ud.verificationStatus as string) ?? 'unverified',
                role: (ud.role as string) ?? 'buyer',
                photoUrl: (ud.photoUrl as string) ?? '',
              });
            }
          } catch {
            // ignore — seller lookup is best-effort
          }
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [id]);

  // Live bid history.
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'listings', id, 'bids'),
      orderBy('timestamp', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setBids(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            bidderId: (data.bidderId as string) ?? '',
            bidderName: (data.bidderName as string) ?? '',
            amount:
              typeof data.amount === 'number' ? (data.amount as number) : 0,
            timestamp: data.timestamp,
          };
        }),
      );
    });
    return () => unsub();
  }, [id]);

  // Once: count unique view records.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'listings', id, 'views'));
        if (!cancelled) setViewerCount(snap.size);
      } catch {
        // ignore (rules may forbid)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isLive =
    listing?.status === 'active' &&
    listing.isAuction &&
    listing.auctionEndTime?.toDate?.()?.getTime?.() > Date.now();

  const uniqueBidders = useMemo(
    () => new Set(bids.map((b) => b.bidderId)).size,
    [bids],
  );

  async function setStatus(
    status: ListingDoc['status'],
    confirmText?: string,
  ) {
    if (!listing) return;
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        status,
        moderatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      alert(`Could not update: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function hardDelete() {
    if (!listing) return;
    if (!confirm(`PERMANENTLY delete "${listing.title}"? Cannot be undone.`))
      return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'listings', listing.id));
      navigate('/listings', { replace: true });
    } catch (e: any) {
      alert(`Could not delete: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function endAuctionNow() {
    if (!listing) return;
    if (!confirm('Force-end this auction now? Buyers can no longer bid.'))
      return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        auctionEndTime: serverTimestamp(),
        moderatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      alert(`Could not end auction: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout
      email={email}
      title={listing?.title ?? (loading ? 'Loading…' : 'Listing')}
      subtitle={
        listing
          ? `${listing.brand} ${listing.model} ${listing.year ?? ''}`.trim()
          : id
      }
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

      {listing && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          <div className="space-y-6">
            <Card>
              <Gallery
                images={
                  listing.images.length > 0
                    ? listing.images
                    : [listing.coverImage].filter(Boolean)
                }
                active={activeImage}
                onPick={setActiveImage}
              />
              <div className="mt-4 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-ink leading-tight">
                    {listing.title}
                  </h2>
                  <div className="text-sm text-ink-muted mt-1">
                    {[listing.brand, listing.model, listing.year]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {listing.isAuction ? (
                      <Badge tone="amber">
                        <Gavel size={10} className="inline mr-0.5" /> Auction
                      </Badge>
                    ) : (
                      <Badge tone="brand">Fixed price</Badge>
                    )}
                    <ListingStatusBadge status={listing.status} />
                    {listing.isVerified && <Badge tone="success">Verified seller</Badge>}
                    {isLive && <Badge tone="success">LIVE</Badge>}
                    <span className="text-xs text-ink-muted">
                      Posted {relativeTime(listing.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
                    {listing.isAuction ? 'Current bid' : 'Asking price'}
                  </div>
                  <div className="text-2xl font-extrabold text-brand-900">
                    {pkr(listing.currentPrice)}
                  </div>
                  {listing.isAuction && listing.basePrice != null && (
                    <div className="text-xs text-ink-muted">
                      base {pkr(listing.basePrice)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat
                  label={listing.isAuction ? 'Bids' : 'Views'}
                  value={
                    listing.isAuction
                      ? `${listing.bidCount ?? 0}`
                      : `${listing.viewCount ?? 0}`
                  }
                />
                <Stat
                  label={listing.isAuction ? 'Bidders' : 'Unique viewers'}
                  value={listing.isAuction ? `${uniqueBidders}` : `${viewerCount}`}
                />
                <Stat
                  label={listing.isAuction ? 'Time' : 'Posted'}
                  value={
                    listing.isAuction
                      ? timeUntil(listing.auctionEndTime)
                      : relativeTime(listing.createdAt)
                  }
                />
                <Stat
                  label="Listing ID"
                  value={listing.id.slice(0, 10)}
                />
              </div>
            </Card>

            <Card title="Vehicle details" icon={<Car size={16} />}>
              <KeyValueGrid
                rows={[
                  ['Brand', listing.brand || '—'],
                  ['Model', listing.model || '—'],
                  ['Year', listing.year != null ? `${listing.year}` : '—'],
                  ['Body', listing.bodyType || '—'],
                  [
                    'Mileage',
                    listing.mileage != null
                      ? `${listing.mileage.toLocaleString()} km`
                      : '—',
                  ],
                  ['Transmission', listing.transmission || '—'],
                  ['Fuel', listing.fuelType || '—'],
                  [
                    'Location',
                    listing.city ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} className="text-ink-muted" /> {listing.city}
                      </span>
                    ) : (
                      '—'
                    ),
                  ],
                  ['Posted', shortDate(listing.createdAt)],
                  ...(listing.isAuction
                    ? ([
                        [
                          'Base price',
                          listing.basePrice != null
                            ? pkr(listing.basePrice)
                            : '—',
                        ],
                        ['Auction ends', shortDate(listing.auctionEndTime)],
                      ] as [string, React.ReactNode][])
                    : []),
                ]}
              />
            </Card>

            {listing.description && (
              <Card title="Description">
                <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-wrap">
                  {listing.description}
                </p>
              </Card>
            )}

            {listing.isAuction && (
              <Card
                title={`Bid history (${bids.length})`}
                icon={<Gavel size={16} />}
              >
                {bids.length === 0 ? (
                  <EmptyRow text="No bids placed yet." />
                ) : (
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg bg-white">
                    {bids.map((b, i) => (
                      <li
                        key={b.id}
                        className={`px-3 py-2 flex items-center justify-between text-sm ${
                          i === 0 ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <Link
                          to={`/users/${b.bidderId}`}
                          className="min-w-0 flex-1 group"
                        >
                          <span className="font-semibold text-ink group-hover:text-brand-700">
                            {b.bidderName || b.bidderId.slice(0, 8)}
                          </span>
                          <span className="ml-2 text-xs text-ink-muted">
                            {relativeTime(b.timestamp)}
                          </span>
                        </Link>
                        <span
                          className={`font-bold ${
                            i === 0 ? 'text-emerald-700' : 'text-ink'
                          }`}
                        >
                          {pkr(b.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card title="Moderation actions">
              <div className="space-y-2">
                {listing.status !== 'active' && (
                  <ActionButton
                    busy={busy}
                    onClick={() => setStatus('active')}
                    tone="emerald"
                    icon={<CheckCircle2 size={12} />}
                    label="Mark active"
                  />
                )}
                {listing.status !== 'sold' && (
                  <ActionButton
                    busy={busy}
                    onClick={() =>
                      setStatus('sold', `Mark "${listing.title}" as sold?`)
                    }
                    tone="gray"
                    icon={<Tag size={12} />}
                    label="Mark sold"
                  />
                )}
                {listing.status !== 'blocked' && (
                  <ActionButton
                    busy={busy}
                    onClick={() =>
                      setStatus(
                        'blocked',
                        `Block "${listing.title}"? It will be hidden from buyers immediately.`,
                      )
                    }
                    tone="rose"
                    icon={<ShieldOff size={12} />}
                    label="Block listing"
                  />
                )}
                {listing.isAuction && isLive && (
                  <ActionButton
                    busy={busy}
                    onClick={endAuctionNow}
                    tone="amber"
                    icon={<Gavel size={12} />}
                    label="Force-end auction"
                  />
                )}
                <ActionButton
                  busy={busy}
                  onClick={hardDelete}
                  tone="solidRose"
                  icon={<Trash2 size={12} />}
                  label="Delete permanently"
                />
              </div>
            </Card>

            <Card title="Seller">
              {seller ? (
                <Link
                  to={`/users/${seller.id}`}
                  className="block bg-gray-50 hover:bg-gray-100 transition rounded-lg p-3 group"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      photoUrl={seller.photoUrl}
                      name={seller.displayName || seller.email}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink group-hover:text-brand-700 truncate">
                        {seller.displayName || 'Unknown'}
                      </div>
                      <div className="text-xs text-ink-muted truncate">
                        {seller.email || seller.phoneNumber || seller.id}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone={seller.role === 'seller' ? 'amber' : 'brand'}>
                          {seller.role}
                        </Badge>
                        <Badge
                          tone={
                            seller.verificationStatus === 'verified'
                              ? 'success'
                              : seller.verificationStatus === 'blocked'
                                ? 'danger'
                                : seller.verificationStatus === 'pending'
                                  ? 'warning'
                                  : 'neutral'
                          }
                        >
                          {seller.verificationStatus}
                        </Badge>
                        {seller.city && (
                          <span className="text-xs text-ink-muted">
                            {seller.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-brand-700 font-semibold">
                    <Eye size={11} /> Open profile
                  </div>
                </Link>
              ) : (
                <EmptyRow text="Seller not loaded." />
              )}
            </Card>

            <Card title="Identifier">
              <code className="text-xs font-mono bg-gray-50 border border-gray-100 rounded px-2 py-1 break-all block">
                {listing.id}
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
      <div className="font-bold text-ink mt-0.5 truncate">{value}</div>
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

function ListingStatusBadge({ status }: { status: ListingDoc['status'] }) {
  switch (status) {
    case 'active':
      return <Badge tone="success">Active</Badge>;
    case 'pending':
      return <Badge tone="warning">Pending</Badge>;
    case 'sold':
      return <Badge tone="neutral">Sold</Badge>;
    case 'expired':
      return <Badge tone="neutral">Expired</Badge>;
    case 'blocked':
      return <Badge tone="danger">Blocked</Badge>;
  }
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="text-xs text-ink-muted bg-gray-50 border border-gray-100 rounded-lg px-3 py-3 text-center">
      {text}
    </div>
  );
}

function Gallery({
  images,
  active,
  onPick,
}: {
  images: string[];
  active: string;
  onPick: (src: string) => void;
}) {
  if (images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg grid place-items-center text-ink-muted">
        <ImageOff size={36} />
      </div>
    );
  }
  return (
    <div>
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={active || images[0]}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2 grid grid-cols-6 gap-2">
          {images.slice(0, 6).map((src) => (
            <button
              key={src}
              onClick={() => onPick(src)}
              className={`aspect-video rounded-md overflow-hidden border-2 transition ${
                src === active ? 'border-brand-600' : 'border-transparent'
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  busy,
  onClick,
  tone,
  icon,
  label,
}: {
  busy: boolean;
  onClick: () => void;
  tone: 'emerald' | 'gray' | 'rose' | 'amber' | 'solidRose';
  icon: React.ReactNode;
  label: string;
}) {
  const styles: Record<typeof tone, string> = {
    emerald:
      'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200',
    gray: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200',
    rose: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200',
    solidRose:
      'bg-rose-600 hover:bg-rose-700 text-white border-rose-600',
  } as Record<'emerald' | 'gray' | 'rose' | 'amber' | 'solidRose', string>;
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className={`w-full inline-flex items-center justify-center gap-1 rounded-md border disabled:opacity-50 px-3 py-2 text-xs font-semibold ${styles[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}
