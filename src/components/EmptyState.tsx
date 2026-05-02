import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  Icon?: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyState({
  Icon = Inbox,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-soft py-16 text-center">
      <div className="flex justify-center mb-3 text-ink-muted">
        <Icon size={40} />
      </div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      {description && (
        <div className="mt-1 text-xs text-ink-muted">{description}</div>
      )}
    </div>
  );
}
