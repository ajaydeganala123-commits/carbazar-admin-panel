import { collection, query } from 'firebase/firestore';
import { Car, Eye, Gavel, ImageOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { useCollection } from '../lib/hooks';
import { pkr, relativeTime } from '../lib/format';

interface ListingRow {
  id: string;
  title: string;
  status: 'active' | 'pending' | 'sold' | 'expired' | 'blocked';
  isAuction: boolean;
  isVerified: boolean;
  coverImage: string;
  currentPrice: number;
  bidCount: number | null;
  city: string;
  brand: string;
  model: string;
  year: number | null;
  sellerName: string;
  sellerId: string;
  createdAt: any;
}

type StatusFilter = 'all' | 'active' | 'pending' | 'sold' | 'blocked';

export default function Listings({ email }: { email: string | null }) {
  const listingsQ = query(collection(db, 'listings'));
  const { data, loading, error } = useCollection<ListingRow>(listingsQ, mapRow);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list
      .filter((l) => {
        if (statusFilter !== 'all' && l.status !== statusFilter) return false;
        if (q.length === 0) return true;
        return (
          l.title.toLowerCase().includes(q) ||
          l.brand.toLowerCase().includes(q) ||
          l.model.toLowerCase().includes(q) ||
          l.sellerName.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ad = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bd = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bd - ad;
      });
  }, [data, search, statusFilter]);

  return (
    <Layout
      email={email}
      title="Listings"
      subtitle={`${data?.length ?? 0} total in marketplace`}
      actions={
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search by title, brand, seller, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      }
    >
      {loading && <div className="text-sm text-ink-muted">Loading…</div>}
      {error && (
        <div className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 border border-rose-200 text-sm">
          {error}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <EmptyState
          Icon={Car}
          title="No listings match"
          description="Try a different search or status filter."
        />
      )}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-ink-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Listing</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Price</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Posted</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/listings/${l.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                        {l.coverImage ? (
                          <img
                            src={l.coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) =>
                              ((e.target as HTMLImageElement).style.display =
                                'none')
                            }
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-ink-muted">
                            <ImageOff size={20} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate max-w-xs">
                          {l.title}
                        </div>
                        <div className="text-xs text-ink-muted truncate max-w-xs">
                          {l.sellerName} • {l.city || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {l.isAuction ? (
                      <Badge tone="amber">
                        <Gavel size={12} className="inline mr-1" />
                        Auction
                      </Badge>
                    ) : (
                      <Badge tone="brand">Fixed</Badge>
                    )}
                    {l.isVerified && (
                      <div className="mt-1">
                        <Badge tone="success">Verified</Badge>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-brand-900">
                      {pkr(l.currentPrice)}
                    </div>
                    {l.isAuction && l.bidCount != null && (
                      <div className="text-xs text-ink-muted">
                        {l.bidCount} {l.bidCount === 1 ? 'bid' : 'bids'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ListingStatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft whitespace-nowrap">
                    {relativeTime(l.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/listings/${l.id}`);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 px-3 py-1.5 text-xs font-semibold"
                    >
                      <Eye size={12} /> Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

function ListingStatusBadge({ status }: { status: ListingRow['status'] }) {
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

function mapRow(id: string, d: any): ListingRow {
  return {
    id,
    title: d.title ?? 'Untitled',
    status: (d.status ?? 'active') as ListingRow['status'],
    isAuction: !!d.isAuction,
    isVerified: !!d.isVerified,
    coverImage: d.coverImage ?? '',
    currentPrice: typeof d.currentPrice === 'number' ? d.currentPrice : 0,
    bidCount: typeof d.bidCount === 'number' ? d.bidCount : null,
    city: d.city ?? '',
    brand: d.brand ?? '',
    model: d.model ?? '',
    year: typeof d.year === 'number' ? d.year : null,
    sellerName: d.sellerName ?? 'Unknown',
    sellerId: d.sellerId ?? '',
    createdAt: d.createdAt ?? null,
  };
}
