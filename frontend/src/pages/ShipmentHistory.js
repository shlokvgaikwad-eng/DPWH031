import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ClockCounterClockwise, Funnel, CaretLeft, CaretRight, SortAscending, SortDescending, User, Path, ShieldCheck } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner';
import { useShippers } from '../hooks/useShippers';
import { HISTORY_STATUS } from '../lib/statusConfig';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShipmentHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { shippers, selectedShipper, setSelectedShipper } = useShippers(searchParams.get('shipper'));
  const navigate = useNavigate();
  const [history, setHistory] = useState({ data: [], total: 0, page: 1, pages: 0, metrics: null });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [sortOrder, setSortOrder] = useState('desc');
  const abortRef = useRef(null);

  // Persist to URL
  useEffect(() => {
    const params = {};
    if (selectedShipper) params.shipper = selectedShipper;
    if (statusFilter !== 'all') params.status = statusFilter;
    setSearchParams(params, { replace: true });
  }, [selectedShipper, statusFilter, setSearchParams]);

  const fetchHistory = useCallback(async () => {
    if (!selectedShipper) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10', sort_order: sortOrder });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await axios.get(`${API}/tracking/shippers/${selectedShipper}/history?${params}`, { signal: controller.signal });
      setHistory(res.data);
    } catch (e) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error(e);
      toast.error('Failed to load data. Please try again.');
    }
  }, [selectedShipper, page, statusFilter, sortOrder]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const m = history.metrics;

  return (
    <div data-testid="history-page" className="p-6 lg:p-10">
      <PageHeader
        icon={<ClockCounterClockwise size={20} weight="bold" className="text-[#3B82F6]" />}
        title="Shipment History"
        subtitle="Full historical data per shipper. Filter, sort, and review past shipment performance."
        meta={history.total ? `${history.total} records` : null}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <User size={16} className="text-[#B0B8C4]" />
        <Select value={selectedShipper || ''} onValueChange={(v) => { setSelectedShipper(v); setPage(1); }}>
          <SelectTrigger data-testid="shipper-selector" className="w-64 bg-[#121620] border-[#2A3441] text-[#F8FAFC]">
            <SelectValue placeholder="Select Shipper" />
          </SelectTrigger>
          <SelectContent className="bg-[#121620] border-[#2A3441]">
            {shippers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name} — {s.company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedShipper && (
          <>
            <button
              onClick={() => navigate(`/tracking`)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[#B0B8C4] border border-[#2A3441] rounded-lg hover:text-white hover:border-[#3B82F6] transition-colors"
            >
              <Path size={12} /> Active Shipments
            </button>
            <button
              onClick={() => navigate(`/trust-score?shipper=${selectedShipper}`)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[#B0B8C4] border border-[#2A3441] rounded-lg hover:text-white hover:border-[#10B981] transition-colors"
            >
              <ShieldCheck size={12} /> Trust Score
            </button>
          </>
        )}
      </div>

      {m && (
        <div data-testid="history-metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Total', value: m.total_shipments, color: '#F8FAFC' },
            { label: 'On-Time', value: `${m.on_time_pct}%`, color: '#10B981' },
            { label: 'Delayed', value: `${m.delayed_pct}%`, color: '#F97316' },
            { label: 'Avg Delay', value: `${m.avg_delay_days}d`, color: '#F97316' },
            { label: 'Disputes', value: m.disputes, color: '#EF4444' },
            { label: 'Holds', value: m.customs_holds, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} className="panel-border rounded-lg p-3 stagger-in">
              <span className="text-[10px] uppercase tracking-wider text-[#B0B8C4] block">{s.label}</span>
              <span className="text-lg font-mono font-bold block mt-0.5" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Funnel size={14} className="text-[#B0B8C4]" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger data-testid="history-status-filter" className="w-40 bg-[#121620] border-[#2A3441] text-[#F8FAFC] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#121620] border-[#2A3441]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="customs_hold">Customs Hold</SelectItem>
            <SelectItem value="dispute">Dispute</SelectItem>
          </SelectContent>
        </Select>
        <button data-testid="sort-toggle" onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 text-xs text-[#B0B8C4] hover:text-white px-2 py-1.5 rounded-lg bg-[#121620] border border-[#2A3441]">
          {sortOrder === 'desc' ? <SortDescending size={14} /> : <SortAscending size={14} />}
          {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      <div className="panel-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="history-table">
            <thead>
              <tr className="bg-[#0B0F19] border-b border-[#2A3441]">
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Shipment</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Route</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Delay</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Cargo</th>
              </tr>
            </thead>
            <tbody>
              {history.data.map((h, i) => {
                const cfg = HISTORY_STATUS[h.status];
                return (
                  <tr key={h.id} data-testid={`history-row-${i}`} className="border-b border-[#1a2030] hover:bg-[#121620] stagger-in">
                    <td className="px-4 py-3 font-mono font-bold text-[#F8FAFC]">{h.shipment_id}</td>
                    <td className="px-4 py-3 font-mono text-[#F8FAFC]">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[#B0B8C4]"><div className="max-w-[200px] truncate">{h.origin} &rarr; {h.destination}</div></td>
                    <td className="px-4 py-3">
                      {cfg && <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase" style={{ color: cfg.color }}><cfg.icon size={11} /> {cfg.label}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {h.delay_days > 0 ? <span className="text-[#F97316]">+{h.delay_days}d</span> : <span className="text-[#B0B8C4]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#B0B8C4]">{h.cargo_type}</td>
                  </tr>
                );
              })}
              {history.data.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#B0B8C4]">No history found</td></tr>}
            </tbody>
          </table>
        </div>
        {history.pages > 1 && (
          <div data-testid="history-pagination" className="flex items-center justify-between px-4 py-3 border-t border-[#2A3441]">
            <button data-testid="history-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 text-xs text-[#B0B8C4] hover:text-white disabled:opacity-30"><CaretLeft size={14} /> Prev</button>
            <span className="text-xs font-mono text-[#B0B8C4]">{page} / {history.pages}</span>
            <button data-testid="history-next" disabled={page >= history.pages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 text-xs text-[#B0B8C4] hover:text-white disabled:opacity-30">Next <CaretRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
