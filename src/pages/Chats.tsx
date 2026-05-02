import {
  collection,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import { ArrowLeft, MessageSquare, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import { db } from '../lib/firebase';
import { relativeTime } from '../lib/format';
import { useCollection, useDocument } from '../lib/hooks';

interface ChatRow {
  id: string;
  participants: string[];
  participantInfo: Record<string, { name: string; photoUrl?: string | null }>;
  lastMessage: string;
  lastSenderId: string | null;
  lastMessageAt: any;
  unreadCount: Record<string, number>;
  listingId: string | null;
  createdAt: any;
}

interface MessageRow {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'image' | 'document';
  attachmentUrl: string | null;
  timestamp: any;
}

function mapChat(id: string, data: any): ChatRow {
  return {
    id,
    participants: (data.participants ?? []) as string[],
    participantInfo: (data.participantInfo ?? {}) as Record<
      string,
      { name: string; photoUrl?: string | null }
    >,
    lastMessage: (data.lastMessage as string) ?? '',
    lastSenderId: (data.lastSenderId as string) ?? null,
    lastMessageAt: data.lastMessageAt ?? null,
    unreadCount: (data.unreadCount ?? {}) as Record<string, number>,
    listingId: (data.listingId as string) ?? null,
    createdAt: data.createdAt ?? null,
  };
}

function mapMessage(id: string, data: any): MessageRow {
  return {
    id,
    senderId: (data.senderId as string) ?? '',
    senderName: (data.senderName as string) ?? 'User',
    text: (data.text as string) ?? '',
    type: ((data.type as string) ?? 'text') as MessageRow['type'],
    attachmentUrl: (data.attachmentUrl as string) ?? null,
    timestamp: data.timestamp ?? null,
  };
}

/// Read-only chat oversight for admins.
///
/// Lists every chat thread sorted by most-recent activity. Selecting one
/// opens the thread in a side panel where the admin can read every
/// message — they cannot post.
export default function Chats({ email }: { email: string | null }) {
  const params = useParams<{ chatId?: string }>();
  const selectedChatId = params.chatId ?? null;
  const chatsQ = query(
    collection(db, 'chats'),
    orderBy('lastMessageAt', 'desc'),
  );
  const { data: chats, loading } = useCollection<ChatRow>(chatsQ, mapChat);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = chats ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const names = c.participants
        .map((u) => c.participantInfo[u]?.name?.toLowerCase() ?? '')
        .join(' ');
      const idsBlob = c.participants.join(' ').toLowerCase();
      return (
        names.includes(q) ||
        idsBlob.includes(q) ||
        (c.lastMessage ?? '').toLowerCase().includes(q)
      );
    });
  }, [chats, search]);

  return (
    <Layout
      email={email}
      title="Chats"
      subtitle={`${chats?.length ?? 0} threads`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-4 h-[calc(100vh-200px)]">
        {/* List ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <input
                type="search"
                placeholder="Search by name, uid, or message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-6 text-sm text-ink-soft">Loading…</div>
            ) : filtered.length === 0 ? (
              <EmptyState
                Icon={MessageSquare}
                title="No conversations"
                description="When users message each other, threads will appear here."
              />
            ) : (
              <ul>
                {filtered.map((c) => (
                  <ChatRowItem
                    key={c.id}
                    chat={c}
                    selected={c.id === selectedChatId}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Thread ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white flex flex-col overflow-hidden">
          {selectedChatId ? (
            <ChatThread key={selectedChatId} chatId={selectedChatId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-ink-soft p-6 text-center">
              Pick a conversation from the list to read it. Admins are
              read-only — you can&apos;t post messages.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ChatRowItem({ chat, selected }: { chat: ChatRow; selected: boolean }) {
  const otherIds = chat.participants;
  const names = otherIds.map(
    (uid) => chat.participantInfo[uid]?.name ?? 'Unknown',
  );
  const lastAt = chat.lastMessageAt?.toDate?.() ?? null;
  const unreadTotal = Object.values(chat.unreadCount ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
  return (
    <li>
      <Link
        to={`/chats/${chat.id}`}
        className={`block px-4 py-3 border-b border-gray-100 transition-colors ${
          selected
            ? 'bg-brand-50'
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink truncate">
              {names.join(' ↔ ')}
            </div>
            <div className="text-xs text-ink-soft truncate mt-0.5">
              {chat.lastMessage || '(no messages yet)'}
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            {lastAt && (
              <span className="text-[11px] text-ink-soft">
                {relativeTime(lastAt)}
              </span>
            )}
            {unreadTotal > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent-500 text-white text-[10px] font-bold">
                {unreadTotal}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function ChatThread({ chatId }: { chatId: string }) {
  const chatRef = doc(db, 'chats', chatId);
  const { data: chat, loading: chatLoading } = useDocument<ChatRow>(
    chatRef,
    mapChat,
  );
  const messagesQ = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc'),
  );
  const { data: messages, loading: msgsLoading } = useCollection<MessageRow>(
    messagesQ,
    mapMessage,
  );

  if (chatLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-ink-soft">
        Loading…
      </div>
    );
  }
  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-ink-soft">
        This chat no longer exists.
      </div>
    );
  }
  const names = chat.participants.map(
    (uid) => chat.participantInfo[uid]?.name ?? uid,
  );
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
        <Link
          to="/chats"
          className="lg:hidden inline-flex items-center text-ink-soft hover:text-ink"
          aria-label="Back to chat list"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink truncate">
            {names.join(' ↔ ')}
          </div>
          <div className="text-xs text-ink-soft mt-0.5">
            {chat.participants.length} participants · admin read-only
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-2 bg-gray-50">
        {msgsLoading ? (
          <div className="text-sm text-ink-soft text-center py-6">
            Loading messages…
          </div>
        ) : (messages ?? []).length === 0 ? (
          <div className="text-sm text-ink-soft text-center py-6">
            No messages yet.
          </div>
        ) : (
          (messages ?? []).map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))
        )}
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: MessageRow }) {
  const ts = message.timestamp?.toDate?.() ?? null;
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
      <div className="text-xs font-semibold text-ink mb-0.5">
        {message.senderName}
      </div>
      {message.type === 'image' && message.attachmentUrl ? (
        <a
          href={message.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1"
        >
          <img
            src={message.attachmentUrl}
            alt="Attachment"
            className="max-h-48 rounded-md"
          />
        </a>
      ) : message.type === 'document' && message.attachmentUrl ? (
        <a
          href={message.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-600 underline"
        >
          📎 Document attachment
        </a>
      ) : (
        <div className="text-sm text-ink whitespace-pre-wrap">
          {message.text}
        </div>
      )}
      {ts && (
        <div className="text-[10px] text-ink-soft mt-1">
          {ts.toLocaleString()}
        </div>
      )}
    </div>
  );
}
