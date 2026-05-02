import { collection, query } from 'firebase/firestore';
import { Eye, Users as UsersIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { useCollection } from '../lib/hooks';
import { relativeTime } from '../lib/format';

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  city: string;
  cnicNumber: string;
  dealershipName: string;
  photoUrl: string;
  role: 'buyer' | 'seller';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'blocked';
  createdAt: any;
}

type StatusFilter = 'all' | 'pending' | 'verified' | 'blocked' | 'unverified';

export default function Users({ email }: { email: string | null }) {
  const usersQ = query(collection(db, 'users'));
  const { data, loading, error } = useCollection<UserRow>(usersQ, mapRow);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      if (statusFilter !== 'all' && u.verificationStatus !== statusFilter) {
        return false;
      }
      if (q.length === 0) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phoneNumber.includes(q) ||
        u.cnicNumber.includes(q)
      );
    });
  }, [data, search, statusFilter]);

  return (
    <Layout
      email={email}
      title="Users"
      subtitle={`${data?.length ?? 0} total accounts`}
      actions={
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search by name, email, phone, CNIC…"
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
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="blocked">Blocked</option>
            <option value="unverified">Unverified</option>
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
          Icon={UsersIcon}
          title="No users match"
          description="Try a different search or status filter."
        />
      )}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-ink-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">KYC</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Joined</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        photoUrl={u.photoUrl}
                        name={u.displayName || u.email}
                        size={36}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">
                          {u.displayName || '—'}
                        </div>
                        <div className="text-xs text-ink-muted truncate">
                          {u.email || u.phoneNumber || u.id}
                        </div>
                        {u.city && (
                          <div className="text-xs text-ink-muted truncate">
                            {u.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === 'seller' ? 'amber' : 'brand'}>
                      {u.role}
                    </Badge>
                    {u.dealershipName && (
                      <div className="text-xs text-ink-muted mt-1">
                        {u.dealershipName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {u.cnicNumber ? (
                      <span className="font-mono">{u.cnicNumber}</span>
                    ) : (
                      <span className="text-ink-muted">No CNIC</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.verificationStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft whitespace-nowrap">
                    {relativeTime(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/users/${u.id}`);
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

function StatusBadge({ status }: { status: UserRow['verificationStatus'] }) {
  switch (status) {
    case 'verified':
      return <Badge tone="success">Verified</Badge>;
    case 'pending':
      return <Badge tone="warning">Pending</Badge>;
    case 'blocked':
      return <Badge tone="danger">Blocked</Badge>;
    default:
      return <Badge tone="neutral">Unverified</Badge>;
  }
}

function mapRow(id: string, d: any): UserRow {
  return {
    id,
    email: d.email ?? '',
    displayName: d.displayName ?? '',
    phoneNumber: d.phoneNumber ?? '',
    city: d.city ?? '',
    cnicNumber: d.cnicNumber ?? '',
    dealershipName: d.dealershipName ?? '',
    photoUrl: d.photoUrl ?? '',
    role: (d.role === 'seller' ? 'seller' : 'buyer') as UserRow['role'],
    verificationStatus: (d.verificationStatus ??
      'unverified') as UserRow['verificationStatus'],
    createdAt: d.createdAt ?? null,
  };
}
