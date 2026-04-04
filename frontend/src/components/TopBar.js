import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, CaretRight, SignOut, User, Gear, X, WarningCircle, ShieldWarning, CheckCircle, Info, ArrowsClockwise } from '@phosphor-icons/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useCurrentUser, signOut } from './AuthGuard';

const ROUTE_LABELS = {
  '/': 'Warehouse Plot',
  '/ingestion': 'Data Ingestion',
  '/anomaly': 'Anomaly Detection',
  '/ownership': 'Ownership Trace',
  '/tracking': 'Shipment Tracking',
  '/history': 'Shipment History',
  '/trust-score': 'Trust Score',
};

const NOTIFICATION_TYPES = {
  critical: { icon: WarningCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  warning: { icon: ShieldWarning, color: '#F97316', bg: 'rgba(249,115,22,0.08)' },
  success: { icon: CheckCircle, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  info: { icon: Info, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
};

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'critical', title: 'Ghost Container Alert', message: 'GCL8319867 in Receiving Zone — 318 days in yard. Clearance required.', time: '2m ago', read: false },
  { id: 2, type: 'critical', title: 'Customs Hold — Yang Ming', message: 'Shipper Li Wei flagged by customs for GCU4044905. Trust score dropped to 42.', time: '8m ago', read: false },
  { id: 3, type: 'warning', title: 'Ownership Confidence Below Threshold', message: 'Container GCR6169895 ownership chain confidence is 0.35. Manual verification recommended.', time: '15m ago', read: false },
  { id: 4, type: 'success', title: 'Pipeline Sync Complete', message: 'Port TOS and NAVIS N4 synced successfully. 83,350 records ingested.', time: '22m ago', read: false },
  { id: 5, type: 'warning', title: 'Anomaly Scan — 14 Flagged', message: 'Latest scan detected 14 anomalies. 12 critical, 2 high risk.', time: '35m ago', read: false },
  { id: 6, type: 'info', title: 'Trust Score Updated', message: 'James Chen (TransOcean Logistics) score recalculated: 65 (Medium Risk, Stable).', time: '1h ago', read: true },
  { id: 7, type: 'success', title: 'Clearance Approved', message: 'GCR9198030 clearance approved by Operations. Container moving to dispatch.', time: '2h ago', read: true },
];

function NotificationPanel({ notifications, onDismiss, onMarkAllRead, onClose }) {
  const panelRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={panelRef} className="absolute right-0 top-full mt-2 w-96 max-h-[520px] bg-[#121620] border border-[#2A3441] rounded-lg shadow-2xl shadow-black/40 overflow-hidden z-50"
      data-testid="notification-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3441]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#F8FAFC]">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#EF4444]/15 text-[#EF4444]">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} className="text-[10px] text-[#3B82F6] hover:underline">Mark all read</button>
          )}
          <button onClick={onClose} className="p-1 text-[#4A5568] hover:text-[#B0B8C4] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
      {/* List */}
      <div className="overflow-y-auto max-h-[440px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell size={24} className="text-[#2A3441] mb-2" />
            <span className="text-xs text-[#4A5568]">No notifications</span>
          </div>
        ) : (
          notifications.map((n) => {
            const typeConfig = NOTIFICATION_TYPES[n.type];
            const Icon = typeConfig.icon;
            return (
              <div key={n.id} data-testid={`notification-${n.id}`}
                className={`flex items-start gap-3 px-4 py-3 border-b border-[#1a2030] transition-colors hover:bg-[#1E293B]/50 ${!n.read ? 'bg-[#0B0F19]/50' : ''}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: typeConfig.bg }}>
                  <Icon size={16} style={{ color: typeConfig.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${n.read ? 'text-[#B0B8C4]' : 'text-[#F8FAFC]'}`}>{n.title}</span>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#4A5568] mt-0.5 leading-snug">{n.message}</p>
                      <span className="text-[10px] text-[#2A3441] mt-1 block">{n.time}</span>
                    </div>
                    <button onClick={() => onDismiss(n.id)} className="p-1 text-[#2A3441] hover:text-[#B0B8C4] transition-colors shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const pageLabel = ROUTE_LABELS[location.pathname] || 'Dashboard';
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleDismiss = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
  const handleMarkAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between px-6 lg:px-10 py-3 bg-[#0B0F19]/80 backdrop-blur-md border-b border-[#2A3441]/50">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs">
        <span className="text-[#4A5568]">Dashboard</span>
        <CaretRight size={10} className="text-[#2A3441]" />
        <span className="text-[#F8FAFC] font-medium">{pageLabel}</span>
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            data-testid="notification-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-[#1E293B] transition-colors"
          >
            <Bell size={18} className="text-[#B0B8C4]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-[8px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationPanel
              notifications={notifications}
              onDismiss={handleDismiss}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>

        {/* User pill */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#1E293B] transition-colors focus:outline-none">
                <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center text-[11px] font-bold text-white">
                  {user.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium text-[#F8FAFC] leading-tight">{user.name}</div>
                  <div className="text-[10px] text-[#4A5568] leading-tight">{user.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#121620] border-[#2A3441]">
              <DropdownMenuItem className="text-xs text-[#B0B8C4] focus:bg-[#1E293B] focus:text-[#F8FAFC]">
                <User size={14} className="mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-[#B0B8C4] focus:bg-[#1E293B] focus:text-[#F8FAFC]">
                <Gear size={14} className="mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2A3441]" />
              <DropdownMenuItem
                className="text-xs text-[#EF4444] focus:bg-[#1E293B] focus:text-[#EF4444]"
                onClick={() => signOut(navigate)}
              >
                <SignOut size={14} className="mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
