import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  Icon?: LucideIcon;
  accent?: 'brand' | 'amber' | 'success' | 'warning';
}

const accentBg: Record<NonNullable<KpiCardProps['accent']>, string> = {
  brand: 'bg-brand-50 text-brand-900',
  amber: 'bg-amber-50 text-amber-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-rose-50 text-rose-700',
};

export default function KpiCard({
  label,
  value,
  hint,
  Icon,
  accent = 'brand',
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </div>
        {Icon && (
          <div
            className={`h-9 w-9 grid place-items-center rounded-lg ${accentBg[accent]}`}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="mt-3 text-3xl font-extrabold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}
