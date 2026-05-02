import {
  Car,
  Flag,
  Gavel,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Shield,
  ShieldCheck,
  Users as UsersIcon,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import { signOutAdmin } from '../lib/auth';

interface SidebarProps {
  email: string | null;
}

const navItems: { to: string; label: string; icon: JSX.Element }[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/verifications', label: 'Verifications', icon: <ShieldCheck size={18} /> },
  { to: '/users', label: 'Users', icon: <UsersIcon size={18} /> },
  { to: '/listings', label: 'Listings', icon: <Car size={18} /> },
  { to: '/auctions', label: 'Live Auctions', icon: <Gavel size={18} /> },
  { to: '/deals', label: 'Deals', icon: <Handshake size={18} /> },
  { to: '/chats', label: 'Chats', icon: <MessageSquare size={18} /> },
  { to: '/reports', label: 'Reports', icon: <Flag size={18} /> },
  { to: '/support', label: 'Support', icon: <HelpCircle size={18} /> },
];

export default function Sidebar({ email }: SidebarProps) {
  const navigate = useNavigate();
  return (
    <aside className="flex w-60 flex-col bg-brand-900 text-white">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Shield size={22} className="text-accent-500" />
          <div className="text-2xl font-extrabold tracking-tight">CARBAZAR</div>
        </div>
        <div className="text-xs text-brand-200 mt-1 ml-7">Admin Console</div>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 border-l-4 border-accent-500 pl-5 text-white'
                  : 'text-brand-100 hover:bg-white/5 border-l-4 border-transparent',
              ].join(' ')
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-xs text-brand-200">
        <div className="truncate" title={email ?? ''}>
          {email ?? 'Signed out'}
        </div>
        <button
          onClick={async () => {
            await signOutAdmin();
            navigate('/login', { replace: true });
          }}
          className="mt-2 w-full rounded-md bg-white/5 hover:bg-white/10 py-2 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
