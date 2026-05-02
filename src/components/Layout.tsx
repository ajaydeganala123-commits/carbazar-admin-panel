import type { ReactNode } from 'react';

import Sidebar from './Sidebar';

interface LayoutProps {
  email: string | null;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function Layout({
  email,
  title,
  subtitle,
  actions,
  children,
}: LayoutProps) {
  return (
    <div className="flex h-full">
      <Sidebar email={email} />
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="px-8 py-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-ink">{title}</h1>
              {subtitle && (
                <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>
              )}
            </div>
            {actions}
          </div>
        </header>
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
