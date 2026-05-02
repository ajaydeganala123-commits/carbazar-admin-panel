import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  HelpCircle,
  MailOpen,
  Send,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { auth, db } from '../lib/firebase';
import { useCollection } from '../lib/hooks';
import { relativeTime, shortDate } from '../lib/format';

interface TicketRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'answered' | 'closed';
  createdAt: any;
  updatedAt: any;
  lastMessage: string;
  lastMessageBy: string | null;
  unreadByAdmin: number;
  unreadByUser: number;
}

interface TicketMessage {
  id: string;
  authorId: string;
  authorName: string;
  isAdmin: boolean;
  text: string;
  createdAt: any;
  isAuto: boolean;
}

type StatusFilter = 'all' | 'open' | 'answered' | 'closed';

export default function Support({ email }: { email: string | null }) {
  const ticketsQ = query(collection(db, 'support_tickets'));
  const { data, loading, error } = useCollection<TicketRow>(ticketsQ, mapTicket);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .sort((a, b) => {
        const ad = a.updatedAt?.toDate?.()?.getTime() ?? 0;
        const bd = b.updatedAt?.toDate?.()?.getTime() ?? 0;
        return bd - ad;
      });
  }, [data, statusFilter]);

  // Auto-select the first ticket on load when none selected.
  useEffect(() => {
    if (selectedId == null && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
    if (selectedId != null && !filtered.some((t) => t.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  return (
    <Layout
      email={email}
      title="Support"
      subtitle={`${data?.length ?? 0} total tickets`}
      actions={
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="open">Open</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
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
          Icon={HelpCircle}
          title={
            statusFilter === 'open'
              ? 'No open tickets'
              : 'No tickets match this filter'
          }
          description="Tickets are created from the mobile app under Settings → Report a Problem."
        />
      )}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            <div className="px-4 py-2.5 text-xs font-semibold text-ink-muted border-b border-gray-100 bg-gray-50">
              {filtered.length} ticket{filtered.length === 1 ? '' : 's'}
            </div>
            <div className="overflow-auto flex-1">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    t.id === selectedId
                      ? 'bg-brand-50/60'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                    {t.unreadByAdmin > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
                        {t.unreadByAdmin}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-ink truncate">
                    {t.title || 'Untitled ticket'}
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    {t.userName || t.userEmail || t.userId.slice(0, 8)}
                    {' · '}
                    {relativeTime(t.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            {selected ? (
              <TicketThread ticket={selected} />
            ) : (
              <div className="flex-1 grid place-items-center text-sm text-ink-muted">
                Select a ticket
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function TicketThread({ ticket }: { ticket: TicketRow }) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'support_tickets', ticket.id, 'messages'),
      orderBy('createdAt'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            authorId: (data.authorId as string) ?? '',
            authorName: (data.authorName as string) ?? '',
            isAdmin: Boolean(data.isAdmin),
            text: (data.text as string) ?? '',
            createdAt: data.createdAt,
            isAuto: Boolean(data.isAuto),
          };
        }),
      );
    });
    return () => unsub();
  }, [ticket.id]);

  // Mark unreadByAdmin → 0 when the admin opens the thread.
  useEffect(() => {
    if (ticket.unreadByAdmin === 0) return;
    void updateDoc(doc(db, 'support_tickets', ticket.id), {
      unreadByAdmin: 0,
    }).catch(() => {});
  }, [ticket.id, ticket.unreadByAdmin]);

  async function sendReply() {
    const text = reply.trim();
    if (text.length === 0 || busy) return;
    const me = auth.currentUser;
    if (me == null) return;
    setBusy(true);
    try {
      await addDoc(
        collection(db, 'support_tickets', ticket.id, 'messages'),
        {
          authorId: me.uid,
          authorName: me.displayName ?? me.email ?? 'CARBAZAR Support',
          isAdmin: true,
          text,
          createdAt: serverTimestamp(),
          isAuto: false,
        },
      );
      const ticketUpdate: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
        lastMessage: text,
        lastMessageBy: me.uid,
        unreadByUser: increment(1),
        unreadByAdmin: 0,
      };
      // Move 'open' → 'answered' once an admin actually replies.
      if (ticket.status === 'open') ticketUpdate.status = 'answered';
      await updateDoc(doc(db, 'support_tickets', ticket.id), ticketUpdate);
      setReply('');
    } catch (e: any) {
      alert(`Could not reply: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: TicketRow['status']) {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'support_tickets', ticket.id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      alert(`Could not update status: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <div className="mt-1 font-bold text-ink truncate">{ticket.title}</div>
          <div className="text-xs text-ink-muted mt-0.5 truncate">
            From{' '}
            <span className="font-semibold">
              {ticket.userName || ticket.userEmail || ticket.userId.slice(0, 8)}
            </span>{' '}
            · created {shortDate(ticket.createdAt)}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {ticket.status !== 'closed' ? (
            <button
              disabled={busy}
              onClick={() => setStatus('closed')}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 text-xs font-semibold"
            >
              <CheckCircle2 size={12} /> Mark closed
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => setStatus('answered')}
              className="inline-flex items-center gap-1 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 text-xs font-semibold"
            >
              <MailOpen size={12} /> Re-open
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 bg-gray-50">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        {ticket.status === 'closed' ? (
          <div className="text-xs text-ink-muted text-center py-2">
            This ticket is closed. Re-open it to reply.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              rows={2}
              placeholder="Reply to the user…"
              className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              disabled={busy || reply.trim().length === 0}
              onClick={sendReply}
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-3 py-2 text-sm font-semibold"
            >
              <Send size={14} /> Send
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Bubble({ message }: { message: TicketMessage }) {
  const align = message.isAdmin ? 'items-start' : 'items-end';
  const bubble = message.isAdmin
    ? 'bg-white border border-gray-200 text-ink'
    : 'bg-brand-600 text-white';
  return (
    <div className={`mb-3 flex flex-col ${align}`}>
      {message.isAuto && (
        <span className="text-[10px] font-semibold tracking-wide uppercase text-ink-muted mb-1">
          Auto-reply
        </span>
      )}
      {!message.isAuto && message.isAdmin && (
        <span className="text-[11px] font-semibold text-ink-muted mb-1">
          {message.authorName || 'CARBAZAR Support'}
        </span>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${bubble}`}
      >
        {message.text}
      </div>
      <span className="text-[10px] text-ink-muted mt-1">
        {shortDate(message.createdAt)}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: TicketRow['status'] }) {
  switch (status) {
    case 'open':
      return (
        <Badge tone="warning">
          <AlertTriangle size={10} className="inline mr-0.5" /> Open
        </Badge>
      );
    case 'answered':
      return (
        <Badge tone="brand">
          <Check size={10} className="inline mr-0.5" /> Answered
        </Badge>
      );
    case 'closed':
      return (
        <Badge tone="neutral">
          <X size={10} className="inline mr-0.5" /> Closed
        </Badge>
      );
  }
}

function PriorityBadge({ priority }: { priority: TicketRow['priority'] }) {
  switch (priority) {
    case 'low':
      return <Badge tone="success">Low</Badge>;
    case 'medium':
      return <Badge tone="warning">Medium</Badge>;
    case 'high':
      return <Badge tone="danger">High</Badge>;
  }
}

function mapTicket(id: string, d: any): TicketRow {
  return {
    id,
    userId: d.userId ?? '',
    userName: d.userName ?? '',
    userEmail: d.userEmail ?? '',
    title: d.title ?? '',
    priority: (['low', 'medium', 'high'].includes(d.priority)
      ? d.priority
      : 'medium') as TicketRow['priority'],
    status: (['open', 'answered', 'closed'].includes(d.status)
      ? d.status
      : 'open') as TicketRow['status'],
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
    lastMessage: d.lastMessage ?? '',
    lastMessageBy: d.lastMessageBy ?? null,
    unreadByAdmin: d.unreadByAdmin ?? 0,
    unreadByUser: d.unreadByUser ?? 0,
  };
}
