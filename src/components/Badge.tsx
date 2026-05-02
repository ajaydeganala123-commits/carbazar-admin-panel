import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'amber';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  brand: 'bg-brand-50 text-brand-900',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700',
  amber: 'bg-accent-500/10 text-accent-600',
};

export default function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
