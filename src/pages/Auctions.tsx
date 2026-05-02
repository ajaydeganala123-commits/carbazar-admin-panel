import { collection, query, where } from 'firebase/firestore';
import { Car, Eye, Gavel, Inbox } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { useCollection } from '../lib/hooks';
import { pkr, shortDate, timeUntil } from '../lib/format';

interface AuctionRow {
  id: string;
  title: string;
  status: string;
  coverImage: string;
  currentPrice: number;
  basePrice: number | null;
  bidCount: number | null;
  city: string;
  sellerName: string;
  auctionEndTime: any;
}

export default function Auctions({ email }: { email: string | null }) {
  // Live tick to refresh "X minutes left" countdowns.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const auctionsQ = query(
    collection(db, 'listings'),
    where('isAuction', '==', true),
  );
  const { data, loading, error } = useCollection<AuctionRow>(auctionsQ, mapRow);
  const navigate = useNavigate();

  const { live, ended } = useMemo(() => {
    const list = data ?? [];
    const live: AuctionRow[] = [];
    const ended: AuctionRow[] = [];
    const now = Date.now();
    for (const a of list) {
      const end = a.auctionEndTime?.toDate?.()?.getTime?.();
      if (a.status === 'active' && end && end > now) {
        live.push(a);
      } else {
        ended.push(a);
      }
    }
    live.sort((a, b) => {
      const ad = a.auctionEndTime?.toDate?.()?.getTime() ?? Infinity;
      const bd = b.auctionEndTime?.toDate?.()?.getTime() ?? Infinity;
      return ad - bd;
    });
    ended.sort((a, b) => {
      const ad = a.auctionEndTime?.toDate?.()?.getTime() ?? 0;
      const bd = b.auctionEndTime?.toDate?.()?.getTime() ?? 0;
      return bd - ad;
    });
    return { live, ended };
  }, [data]);

  return (
    <Layout
      email={email}
      title="Live auctions"
      subtitle="Server-time countdowns refresh every 30s"
    >
      {loading && <div className="text-sm text-ink-muted">Loading…</div>}
      {error && (
        <div className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 border border-rose-200 text-sm">
          {error}
        </div>
      )}

      <Section title={`Currently live (${live.length})`}>
        {live.length === 0 ? (
          <EmptyState Icon={Gavel} title="No live auctions" />
        ) : (
          <Grid auctions={live} live onView={(id) => navigate(`/auctions/${id}`)} />
        )}
      </Section>

      <Section title={`Ended / inactive (${ended.length})`}>
        {ended.length === 0 ? (
          <EmptyState Icon={Inbox} title="No past auctions" />
        ) : (
          <Grid
            auctions={ended}
            live={false}
            onView={(id) => navigate(`/auctions/${id}`)}
          />
        )}
      </Section>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold text-ink uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({
  auctions,
  live,
  onView,
}: {
  auctions: AuctionRow[];
  live: boolean;
  onView: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {auctions.map((a) => (
        <button
          key={a.id}
          onClick={() => onView(a.id)}
          className="text-left bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden hover:shadow-md transition"
        >
          <div className="h-32 bg-gray-100 relative">
            {a.coverImage ? (
              <img
                src={a.coverImage}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) =>
                  ((e.target as HTMLImageElement).style.display = 'none')
                }
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-ink-muted">
                <Car size={32} />
              </div>
            )}
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/90 backdrop-blur text-ink-muted px-2 py-0.5 text-[10px] font-semibold">
              <Eye size={10} /> Open
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-ink truncate">{a.title}</div>
              {live ? (
                <Badge tone="success">LIVE</Badge>
              ) : (
                <Badge tone="neutral">{a.status === 'active' ? 'ended' : a.status}</Badge>
              )}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              {a.sellerName} • {a.city || 'N/A'}
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-xs text-ink-muted">Current bid</div>
                <div className="text-lg font-extrabold text-brand-900">
                  {pkr(a.currentPrice)}
                </div>
                {a.basePrice != null && (
                  <div className="text-xs text-ink-muted">
                    started at {pkr(a.basePrice)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-muted">Bids</div>
                <div className="text-lg font-bold text-accent-600">
                  {a.bidCount ?? 0}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-ink-muted">{shortDate(a.auctionEndTime)}</span>
              <span
                className={live ? 'font-bold text-rose-600' : 'text-ink-muted'}
              >
                {timeUntil(a.auctionEndTime)}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function mapRow(id: string, d: any): AuctionRow {
  return {
    id,
    title: d.title ?? 'Untitled',
    status: d.status ?? 'active',
    coverImage: d.coverImage ?? '',
    currentPrice: typeof d.currentPrice === 'number' ? d.currentPrice : 0,
    basePrice: typeof d.basePrice === 'number' ? d.basePrice : null,
    bidCount: typeof d.bidCount === 'number' ? d.bidCount : null,
    city: d.city ?? '',
    sellerName: d.sellerName ?? 'Unknown',
    auctionEndTime: d.auctionEndTime ?? null,
  };
}
