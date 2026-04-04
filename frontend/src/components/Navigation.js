import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Warehouse,
  Database,
  ShieldWarning,
  TreeStructure,
  Path,
  ClockCounterClockwise,
  ShieldCheck,
  List,
  X,
  SignOut,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { signOut } from './AuthGuard';

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { path: '/', label: 'Warehouse Plot', icon: Warehouse },
      { path: '/ingestion', label: 'Data Ingestion', icon: Database },
      { path: '/tracking', label: 'Shipment Tracking', icon: Path },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/anomaly', label: 'Anomaly Detection', icon: ShieldWarning },
      { path: '/ownership', label: 'Ownership Trace', icon: TreeStructure },
      { path: '/trust-score', label: 'Trust Score', icon: ShieldCheck },
    ],
  },
  {
    label: 'History',
    items: [
      { path: '/history', label: 'Shipment History', icon: ClockCounterClockwise },
    ],
  },
];

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[#3B82F6] focus:text-white focus:rounded-lg focus:text-sm focus:font-bold"
        data-testid="skip-to-content"
      >
        Skip to content
      </a>

      {/* Mobile toggle */}
      <button
        data-testid="mobile-nav-toggle"
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-[#121620] border border-[#2A3441]"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <List size={20} />}
      </button>

      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          data-testid="mobile-nav-backdrop"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        data-testid="main-navigation"
        className={`fixed top-0 left-0 h-full w-56 bg-[#0B0F19] border-r border-[#2A3441] z-40 flex flex-col transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-[#2A3441]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <Warehouse size={18} weight="bold" className="text-[#0B0F19]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-[#F8FAFC]">GhostClear</h1>
              <span className="text-[10px] text-[#4A5568]">Warehouse Storage</span>
            </div>
          </div>
        </div>

        {/* Nav Groups */}
        <div className="flex-1 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <div className="px-4 pt-4 pb-1.5 text-[10px] uppercase tracking-wider text-[#4A5568] font-medium">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-link-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-all duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F19]
                      ${isActive
                        ? 'bg-[#1E293B] text-[#F8FAFC] border-l-2 border-[#3B82F6]'
                        : 'text-[#B0B8C4] hover:text-[#F8FAFC] hover:bg-[#121620] border-l-2 border-transparent'
                      }`}
                  >
                    <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A3441]">
          <button
            onClick={() => signOut(navigate)}
            className="flex items-center gap-3 w-full px-6 py-3 text-sm text-[#B0B8C4] hover:text-[#EF4444] hover:bg-[#121620] transition-colors"
          >
            <SignOut size={18} />
            <span>Sign Out</span>
          </button>
          <div className="px-4 py-3 border-t border-[#2A3441]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981] status-blink" />
              <span className="text-xs text-[#B0B8C4]">System Online</span>
            </div>
            <div className="mt-1 text-[10px] text-[#4A5568] font-mono">v2.4.1 | Metro Warehouse</div>
          </div>
        </div>
      </nav>
    </>
  );
}
