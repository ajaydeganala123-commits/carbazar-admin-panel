import { collection, orderBy, query } from 'firebase/firestore';
import { ChevronRight, Handshake, ImageOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { pkr, relativeTime } from '../lib/format';
import { useCollection } from '../lib/hooks';

interface DealRow {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCover: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  state:
    | 'pendingAcceptance'
    | 'agreed'
    | 'docsShared'
    | 'meetingSet'
    | 'sold'
    | 'cancelled';
  finalPrice: number;
  createdFromAuction: boolean;
  docsCount: number;
  cancelReason: string | null;
  createdAt: any;
  updatedAt: any;
}

function mapDeal(id: string, data: any): DealRow {
  return {
    id,
    listingId: (data.listingId as string) ?? '',
    listingTitle: (data.listingTitle as string) ?? '',
    listingCover: (data.listingCover as string) ?? '',
    sellerId: (data.sellerId as string) ?? '',
    sellerName: (data.sellerName as string) ?? 'Seller',
    buyerId: (data.buyerId as string) ?? '',
    buyerName: (data.buyerName as string) ?? 'Buyer',
    state: ((data.state as string) ?? 'agreed') as DealRow['state'],
    finalPrice: (data.finalPrice as number) ?? 0,
    createdFromAuction: (data.createdFromAuction as boolean) ?? false,
    docsCount: (data.docsCount as number) ?? 0,
    cancelReason: (data.cancelReason as string) ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

const STATE_FILTERS: Array<{ id: 'all' | DealRow['state']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pendingAcceptance', label: 'Pending acceptance' },
  { id: 'agreed', label: 'Agreed' },
  { id: 'docsShared', label: 'Docs shared' },
  { id: 'meetingSet', label: 'Meeting set' },
  { id: 'sold', label: 'Sold' },
  { id: 'cancelled', label: 'Cancelled' },
];

function stateBadgeKind(state: DealRow['state']): {
  tone: 'success' | 'warning' | 'danger' | 'brand' | 'neutral';
  label: string;
} {
  switch (state) {
    case 'sold':
      return { tone: 'success', label: 'Sold' };
    case 'meetingSet':
      return { tone: 'warning', label: 'Meeting set' };
    case 'docsShared':
      return { tone: 'brand', label: 'Docs shared' };
    case 'agreed':
      return { tone: 'brand', label: 'Agreed' };
    case 'pendingAcceptance':
      return { tone: 'neutral', label: 'Pending acceptance' };
    case 'cancelled':
      return { tone: 'danger', label: 'Cancelled' };
    default:
      return { tone: 'neutral', label: String(state) || 'Unknown' };
  }
}

export default function Deals({ email }: { email: string | null }) {
  const dealsQ = query(collection(db, 'deals'), orderBy('updatedAt', 'desc'));
  const { data, loading } = useCollection<DealRow>(dealsQ, mapDeal);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | DealRow['state']>(
    'all',
  );
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((d) => {
      if (stateFilter !== 'all' && d.state !== stateFilter) return false;
      if (!q) return true;
      return (
        d.listingTitle.toLowerCase().includes(q) ||
        d.sellerName.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    });
  }, [data, search, stateFilter]);

  return (
    <Layout
      email={email}
      title="Deals"
      subtitle={`${data?.length ?? 0} total transactions`}
      actions={
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search by title, seller, buyer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as any)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {STATE_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {loading ? (
        <div className="text-sm text-ink-soft">Loading deals…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          Icon={Handshake}
          title="No deals"
          description="When buyers and sellers start a transaction, it appears here."
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-ink-soft uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((d) => {
                const badge = stateBadgeKind(d.state);
                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/deals/${d.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {d.listingCover ? (
                          <img
                            src={d.listingCover}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-ink-soft">
                            <ImageOff size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">
                            {d.listingTitle || '—'}
                          </div>
                          <div className="text-xs text-ink-soft truncate">
                            {d.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{d.sellerName}</td>
                    <td className="px-4 py-3 text-sm">{d.buyerName}</td>
                    <td className="px-4 py-3">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      {d.createdFromAuction && (
                        <span className="ml-1 inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                          AUCTION
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {pkr(d.finalPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm">{d.docsCount}</td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      {relativeTime(d.updatedAt?.toDate?.() ?? null)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/deals/${d.id}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Open <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
