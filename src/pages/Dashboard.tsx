import { collection, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Car,
  ChevronRight,
  Database,
  Gavel,
  Inbox,
  Loader2,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../components/EmptyState';
import KpiCard from '../components/KpiCard';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { useCollection } from '../lib/hooks';
import { callAdminFunction } from '../lib/kyc';
import { pkr, relativeTime } from '../lib/format';

interface DashListing {
  id: string;
  title: string;
  status: string;
  isAuction: boolean;
  currentPrice: number;
  bidCount: number | null;
  sellerName: string;
  city: string;
  createdAt: any;
  auctionEndTime: any;
  isVerified: boolean;
}

interface DashUser {
  id: string;
  verificationStatus: string;
  role: string;
  createdAt: any;
}

export default function Dashboard({ email }: { email: string | null }) {
  const usersQ = query(collection(db, 'users'));
  const listingsQ = query(collection(db, 'listings'));
  const pendingUsersQ = query(
    collection(db, 'users'),
    where('verificationStatus', '==', 'pending'),
  );

  const users = useCollection<DashUser>(usersQ, (id, d) => ({
    id,
    verificationStatus: d.verificationStatus ?? 'unverified',
    role: d.role ?? 'buyer',
    createdAt: d.createdAt ?? null,
  }));
  const listings = useCollection<DashListing>(listingsQ, mapListing);
  const pending = useCollection<DashUser>(pendingUsersQ, (id, d) => ({
    id,
    verificationStatus: d.verificationStatus,
    role: d.role,
    createdAt: d.createdAt ?? null,
  }));

  const allListings = listings.data ?? [];
  const liveAuctions = allListings.filter(
    (l) =>
      l.isAuction &&
      l.status === 'active' &&
      l.auctionEndTime &&
      l.auctionEndTime.toDate &&
      l.auctionEndTime.toDate().getTime() > Date.now(),
  );
  const totalGmv = liveAuctions.reduce((s, l) => s + l.currentPrice, 0);
  const recent = [...allListings]
    .sort((a, b) => {
      const ad = a.createdAt?.toDate?.()?.getTime() ?? 0;
      const bd = b.createdAt?.toDate?.()?.getTime() ?? 0;
      return bd - ad;
    })
    .slice(0, 8);

  const pendingCount = pending.data?.length ?? 0;

  return (
    <Layout email={email} title="Dashboard" subtitle="Live overview of CARBAZAR">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Users"
          value={users.data?.length ?? '—'}
          Icon={UsersIcon}
          accent="brand"
          hint={
            pendingCount > 0
              ? `${pendingCount} pending verification`
              : 'All caught up'
          }
        />
        <KpiCard
          label="Listings"
          value={allListings.length}
          Icon={Car}
          accent="amber"
          hint={`${allListings.filter((l) => l.status === 'active').length} active`}
        />
        <KpiCard
          label="Live auctions"
          value={liveAuctions.length}
          Icon={Gavel}
          accent="success"
        />
        <KpiCard
          label="Auction GMV"
          value={pkr(totalGmv)}
          Icon={Banknote}
          accent="warning"
          hint="Sum of current bids"
        />
      </div>

      {pendingCount > 0 && (
        <Link
          to="/verifications"
          className="mt-6 block bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-lg bg-amber-200/60 text-amber-700">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-amber-900">
                {pendingCount} user{pendingCount === 1 ? '' : 's'} awaiting verification
              </div>
              <div className="text-xs text-amber-800">
                Review their KYC documents and approve or reject — they can't publish listings until you do.
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900">
              Open queue
              <ArrowRight size={12} />
            </span>
          </div>
        </Link>
      )}

      <div className="mt-8 bg-white rounded-xl border border-gray-100 shadow-soft">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide">
            Recent listings
          </h2>
          <Link
            to="/listings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
          >
            View all
            <ChevronRight size={12} />
          </Link>
        </div>
        {listings.loading ? (
          <div className="p-8 text-sm text-ink-muted">Loading…</div>
        ) : recent.length === 0 ? (
          <EmptyState
            Icon={Inbox}
            title="No listings yet"
            description="Sellers haven't posted anything."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map((l) => (
              <Link
                key={l.id}
                to={`/listings/${l.id}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate group-hover:text-brand-700">
                    {l.title}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {l.sellerName} • {l.city || 'N/A'} •{' '}
                    {relativeTime(l.createdAt)}
                  </div>
                </div>
                <div className="text-sm font-bold text-brand-900 whitespace-nowrap">
                  {pkr(l.currentPrice)}
                </div>
                <ChevronRight
                  size={14}
                  className="text-ink-muted group-hover:text-brand-700"
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Demo / seed controls live at the very bottom — they're a power-user
          tool, not part of the daily admin flow. */}
      <SeedControls />
    </Layout>
  );
}

function SeedControls() {
  const [busy, setBusy] = useState<'seed' | 'wipe' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultTone, setResultTone] = useState<'success' | 'error'>('success');

  async function run(action: 'seed' | 'wipe') {
    if (action === 'wipe') {
      const ok = confirm(
        'Wipe all DEMO data? This deletes every listing whose ID starts with "seed-" and every user with @carbazar.demo email (Firebase Auth + Firestore + KYC objects). Real users and listings are NOT touched.',
      );
      if (!ok) return;
    }
    setBusy(action);
    setResult(null);
    try {
      const fn = action === 'seed' ? 'seed-marketplace' : 'wipe-marketplace';
      const res = await callAdminFunction(fn);
      setResultTone('success');
      const summary =
        action === 'seed'
          ? `Seeded: ${res.sellersCreated} sellers, ${res.buyersCreated} buyers, ${res.listingsCreated} listings, ${res.bidsCreated} bids${
              res.errors?.length ? ` • ${res.errors.length} non-fatal errors` : ''
            }`
          : `Wiped: ${res.listingsDeleted} listings, ${res.bidsDeleted} bids, ${res.viewsDeleted} views, ${res.usersDeleted} users (${res.authUsersDeleted} auth), ${res.kycObjectsDeleted} KYC files`;
      setResult(summary);
    } catch (e: any) {
      setResultTone('error');
      setResult(e.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 bg-white rounded-xl border border-dashed border-gray-300 shadow-soft p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide flex items-center gap-2">
            <Database size={14} className="text-ink-muted" />
            Demo data
            <span className="text-[10px] font-bold tracking-wider uppercase text-ink-muted bg-gray-100 rounded px-1.5 py-0.5 ml-1">
              Power user
            </span>
          </h2>
          <p className="text-xs text-ink-muted mt-1 max-w-xl">
            Populate or reset the marketplace with realistic seed data: 10 sellers
            (mix of individual + business, mostly verified), 10 buyers, 28
            listings with bids — all created as real Firebase Auth accounts and
            Firestore documents.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            disabled={busy !== null}
            onClick={() => run('seed')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 hover:bg-brand-800 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold"
          >
            {busy === 'seed' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Database size={14} />
            )}
            Seed marketplace
          </button>
          <button
            disabled={busy !== null}
            onClick={() => run('wipe')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
          >
            {busy === 'wipe' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Wipe demo data
          </button>
        </div>
      </div>
      {result && (
        <div
          className={`mt-3 text-sm rounded-lg px-3 py-2 border flex items-start gap-2 ${
            resultTone === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {resultTone === 'error' && (
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          )}
          <span>{result}</span>
        </div>
      )}
      <p className="text-xs text-ink-muted mt-3">
        Demo seller / buyer accounts use the password{' '}
        <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
          Demo@1234
        </code>{' '}
        and emails like{' '}
        <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">
          ahmad.motors@carbazar.demo
        </code>
        . Sign in on the Flutter app with any of them to see the full experience.
      </p>
    </div>
  );
}

function mapListing(id: string, d: any): DashListing {
  return {
    id,
    title: d.title ?? 'Untitled',
    status: d.status ?? 'active',
    isAuction: !!d.isAuction,
    currentPrice: typeof d.currentPrice === 'number' ? d.currentPrice : 0,
    bidCount: typeof d.bidCount === 'number' ? d.bidCount : null,
    sellerName: d.sellerName ?? 'Unknown',
    city: d.city ?? '',
    createdAt: d.createdAt ?? null,
    auctionEndTime: d.auctionEndTime ?? null,
    isVerified: !!d.isVerified,
  };
}
