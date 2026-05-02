import {
  collection,
  doc,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Flag,
  MessageSquare,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { auth, db } from '../lib/firebase';
import { useCollection } from '../lib/hooks';
import { relativeTime } from '../lib/format';

interface ReportRow {
  id: string;
  reporterUid: string;
  reporterName: string;
  type: 'user' | 'listing' | 'chat';
  reason: string;
  notes: string;
  subjectUid: string | null;
  subjectListingId: string | null;
  subjectChatId: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: any;
  adminNotes: string | null;
}

type StatusFilter = 'all' | 'open' | 'resolved' | 'dismissed';

const reasonLabels: Record<string, string> = {
  inappropriate: 'Inappropriate',
  fraud: 'Fraud / scam',
  spam: 'Spam',
  other: 'Other',
  block_request: 'Block request',
};

export default function Reports({ email }: { email: string | null }) {
  const reportsQ = query(collection(db, 'reports'));
  const { data, loading, error } = useCollection<ReportRow>(reportsQ, mapRow);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .sort((a, b) => {
        const ad = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bd = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bd - ad;
      });
  }, [data, statusFilter]);

  async function setStatus(
    r: ReportRow,
    status: ReportRow['status'],
  ) {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, 'reports', r.id), {
        status,
        resolvedAt: serverTimestamp(),
        resolvedBy: auth.currentUser?.uid ?? '',
      });
    } catch (e: any) {
      alert(`Could not update: ${e.message ?? e}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout
      email={email}
      title="Reports"
      subtitle={`${data?.length ?? 0} total reports`}
      actions={
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All</option>
        </select>
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
          Icon={Flag}
          title={
            statusFilter === 'open'
              ? 'No open reports'
              : 'No reports match this filter'
          }
          description="Users can flag listings, chats, and other users from the mobile app."
        />
      )}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-100 shadow-soft p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 grid place-items-center rounded-lg bg-rose-50 text-rose-600 flex-shrink-0">
                    {r.reason === 'block_request' ? (
                      <ShieldAlert size={18} />
                    ) : (
                      <Flag size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">
                        {reasonLabels[r.reason] ?? r.reason}
                      </span>
                      <Badge tone={typeTone(r.type)}>
                        {typeLabel(r.type)}
                      </Badge>
                      <ReportStatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-ink-muted mt-1">
                      Reported by{' '}
                      <span className="font-semibold">{r.reporterName || r.reporterUid}</span>
                      {' '}• {relativeTime(r.createdAt)}
                    </div>
                    {r.notes && (
                      <div className="mt-2 text-sm text-ink-soft bg-gray-50 rounded p-2 border border-gray-100">
                        {r.notes}
                      </div>
                    )}
                    <SubjectLink r={r} />
                  </div>
                </div>
                {r.status === 'open' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setStatus(r, 'resolved')}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 text-xs font-semibold"
                    >
                      <Check size={12} /> Resolve
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setStatus(r, 'dismissed')}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 text-xs font-semibold"
                    >
                      <X size={12} /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

function SubjectLink({ r }: { r: ReportRow }) {
  if (r.subjectUid) {
    return (
      <Link
        to="/users"
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
      >
        <User size={12} />
        Reported user: {r.subjectUid.slice(0, 8)}…
        <ExternalLink size={11} />
      </Link>
    );
  }
  if (r.subjectListingId) {
    return (
      <Link
        to="/listings"
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
      >
        Reported listing: {r.subjectListingId.slice(0, 12)}…
        <ExternalLink size={11} />
      </Link>
    );
  }
  if (r.subjectChatId) {
    return (
      <div className="mt-2 inline-flex items-center gap-1 text-xs text-ink-muted">
        <MessageSquare size={12} />
        Chat: {r.subjectChatId.slice(0, 16)}…
      </div>
    );
  }
  return null;
}

function ReportStatusBadge({ status }: { status: ReportRow['status'] }) {
  switch (status) {
    case 'open':
      return (
        <Badge tone="warning">
          <AlertTriangle size={10} className="inline mr-0.5" /> Open
        </Badge>
      );
    case 'resolved':
      return <Badge tone="success">Resolved</Badge>;
    case 'dismissed':
      return <Badge tone="neutral">Dismissed</Badge>;
  }
}

function typeTone(t: ReportRow['type']): 'brand' | 'amber' | 'neutral' {
  return t === 'user' ? 'brand' : t === 'listing' ? 'amber' : 'neutral';
}
function typeLabel(t: ReportRow['type']): string {
  return t === 'user' ? 'User report' : t === 'listing' ? 'Listing report' : 'Chat report';
}

function mapRow(id: string, d: any): ReportRow {
  return {
    id,
    reporterUid: d.reporterUid ?? '',
    reporterName: d.reporterName ?? '',
    type: (d.type === 'listing' || d.type === 'chat' ? d.type : 'user') as ReportRow['type'],
    reason: d.reason ?? 'other',
    notes: d.notes ?? '',
    subjectUid: d.subjectUid ?? null,
    subjectListingId: d.subjectListingId ?? null,
    subjectChatId: d.subjectChatId ?? null,
    status: (d.status === 'resolved' || d.status === 'dismissed' ? d.status : 'open') as ReportRow['status'],
    createdAt: d.createdAt ?? null,
    adminNotes: d.adminNotes ?? null,
  };
}
