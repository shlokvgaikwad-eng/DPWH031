import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Path, MapPin, Package, Funnel, CaretLeft, CaretRight, X, Truck, Anchor as AnchorIcon, ShieldCheck, CheckCircle, MagnifyingGlass, CaretUp, CaretDown, WarningCircle } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../components/ui/sheet';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  at_port: { label: 'At Port', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: AnchorIcon },
  in_transit: { label: 'In Transit', color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: Truck },
  customs_hold: { label: 'Customs Hold', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: ShieldCheck },
  delivered: { label: 'Delivered', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span data-testid={`status-badge-${status}`} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
      <cfg.icon size={11} />{cfg.label}
    </span>
  );
}

function ContainerDetailPanel({ container, shipper, onClose }) {
  const navigate = useNavigate();
  if (!container) return null;
  const timeline = [
    { label: 'Departure', date: container.departure_date, done: true },
    { label: 'Port Arrival', date: container.port_arrival_date, done: !!container.port_arrival_date },
    { label: 'Customs Clearance', date: container.customs_clearance_date, done: !!container.customs_clearance_date },
    { label: 'Delivered', date: container.delivery_date, done: !!container.delivery_date },
  ];
  return (
    <div data-testid="container-detail-panel" className="p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-widest text-[#B0B8C4]">Shipment Detail</span>
        <button data-testid="close-detail-panel" onClick={onClose} className="text-[#B0B8C4] hover:text-white"><X size={16} /></button>
      </div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: STATUS_CONFIG[container.status]?.bg, border: `1px solid ${STATUS_CONFIG[container.status]?.color}30` }}>
          <Package size={18} style={{ color: STATUS_CONFIG[container.status]?.color }} />
        </div>
        <div>
          <h3 className="font-mono text-sm font-bold text-[#F8FAFC]">{container.container_id}</h3>
          <StatusBadge status={container.status} />
        </div>
      </div>
      {shipper && (
        <div className="mb-4 p-3 rounded-lg bg-[#0B0F19] border border-[#1a2030]">
          <div className="text-[10px] uppercase tracking-wider text-[#B0B8C4] mb-2">Shipper / Owner</div>
          <div className="text-sm font-bold text-[#F8FAFC]">{shipper.name}</div>
          <div className="text-xs text-[#B0B8C4] mt-0.5">{shipper.company}</div>
          <div className="grid grid-cols-1 gap-1 mt-2 text-xs">
            <div className="flex justify-between"><span className="text-[#B0B8C4]">Email</span><span className="font-mono text-[#F8FAFC]">{shipper.email}</span></div>
            <div className="flex justify-between"><span className="text-[#B0B8C4]">Phone</span><span className="font-mono text-[#F8FAFC]">{shipper.phone}</span></div>
            <div className="flex justify-between"><span className="text-[#B0B8C4]">Country</span><span className="text-[#F8FAFC]">{shipper.country}</span></div>
          </div>
        </div>
      )}
      {shipper && (
        <button
          onClick={() => navigate(`/history?shipper=${shipper.id}`)}
          className="w-full mt-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#3B82F6] border border-[#3B82F6]/30 rounded-lg hover:bg-[#3B82F6]/10 transition-colors"
        >
          View Full Shipper History →
        </button>
      )}
      <div className="space-y-2 text-xs mb-4">
        {[
          { label: 'Origin', value: `${container.origin_port}, ${container.origin_country}` },
          { label: 'Destination', value: `${container.destination_warehouse}, ${container.destination_country}` },
          { label: 'Size / Weight', value: `${container.size} / ${container.weight_tons}t`, mono: true },
          { label: 'Cargo', value: container.cargo_type },
          { label: 'ETA', value: new Date(container.eta).toLocaleDateString(), mono: true },
        ].map(r => (
          <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-[#1a2030]">
            <span className="text-[#B0B8C4]">{r.label}</span><span className={`text-[#F8FAFC] ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[#B0B8C4] mb-3">Timeline</div>
      <div className="space-y-0">
        {timeline.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 ${step.done ? 'bg-[#10B981] border-[#10B981]' : 'bg-transparent border-[#2A3441]'}`} />
              {i < timeline.length - 1 && <div className={`w-0.5 h-6 ${step.done ? 'bg-[#10B981]' : 'bg-[#2A3441]'}`} />}
            </div>
            <div className="pb-4">
              <div className={`text-xs font-bold ${step.done ? 'text-[#F8FAFC]' : 'text-[#B0B8C4]'}`}>{step.label}</div>
              <div className="text-[10px] font-mono text-[#B0B8C4]">{step.date ? new Date(step.date).toLocaleDateString() : 'Pending'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_ORDER = { delivered: 0, at_port: 1, in_transit: 2, customs_hold: 3 };

export default function ShipmentTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ data: [], total: 0, page: 1, pages: 0 });
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') || '1', 10));
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [sheetOpen, setSheetOpen] = useState(false);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const [anomalyIds, setAnomalyIds] = useState(new Set());

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1280);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1280);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    axios.get(`${API}/anomalies`)
      .then(res => setAnomalyIds(new Set(res.data.map(a => a.container_id))))
      .catch(() => {});
  }, []);

  // Persist to URL
  useEffect(() => {
    const params = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [statusFilter, page, setSearchParams]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await axios.get(`${API}/tracking/containers?${params}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data. Please try again.');
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Deep-link: pre-fill search + auto-open detail from ?container=XXX
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    const containerParam = searchParams.get('container');
    if (!containerParam || deepLinkHandled.current) return;
    if (!searchText) setSearchText(containerParam);
    // Wait for data to load, then auto-select the first match
    const match = data.data.find(c => c.container_id === containerParam);
    if (match) {
      deepLinkHandled.current = true;
      fetchDetail(match);
    }
  }, [data.data, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDetail = async (container) => {
    setSelected(container.id);
    try {
      const res = await axios.get(`${API}/tracking/containers/${container.id}`);
      setDetail(res.data);
      setSheetOpen(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data. Please try again.');
    }
  };

  // Client-side search + sort
  const displayData = useMemo(() => {
    let items = [...data.data];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(c => c.container_id.toLowerCase().includes(q) || c.shipper_name.toLowerCase().includes(q));
    }
    if (sortField === 'eta') {
      items.sort((a, b) => sortDir === 'asc' ? new Date(a.eta) - new Date(b.eta) : new Date(b.eta) - new Date(a.eta));
    } else if (sortField === 'status') {
      items.sort((a, b) => sortDir === 'asc' ? (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) : (STATUS_ORDER[b.status] ?? 9) - (STATUS_ORDER[a.status] ?? 9));
    }
    return items;
  }, [data.data, debouncedSearch, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <CaretDown size={10} className="text-[#2A3441] ml-1" />;
    return sortDir === 'asc' ? <CaretUp size={10} className="text-[#3B82F6] ml-1" /> : <CaretDown size={10} className="text-[#3B82F6] ml-1" />;
  };

  const closeDetail = () => { setDetail(null); setSelected(null); setSheetOpen(false); };

  return (
    <div data-testid="tracking-page" className="p-6 lg:p-10">
      <PageHeader
        icon={<Path size={20} weight="bold" className="text-[#3B82F6]" />}
        title="Shipment Tracking"
        subtitle="Track all incoming containers from shipyards to your warehouse. Click a shipment for full details."
        meta={`${data.total} shipments`}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Funnel size={16} className="text-[#B0B8C4]" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger data-testid="status-filter" className="w-44 bg-[#121620] border-[#2A3441] text-[#F8FAFC]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-[#121620] border-[#2A3441]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="at_port">At Port</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="customs_hold">Customs Hold</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B8C4]" />
          <input data-testid="tracking-search" type="text" placeholder="Search ID or shipper..." value={searchText} onChange={e => setSearchText(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs font-mono bg-[#121620] border border-[#2A3441] rounded-lg text-[#F8FAFC] placeholder:text-[#B0B8C4] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] w-52" />
        </div>
        <span className="text-xs text-[#B0B8C4] font-mono">{data.total} shipments</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="panel-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="tracking-table">
              <thead>
                <tr className="bg-[#0B0F19] border-b border-[#2A3441]">
                  <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Container</th>
                  <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Route</th>
                  <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="inline-flex items-center">Status<SortIcon field="status" /></span>
                  </th>
                  <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('eta')}>
                    <span className="inline-flex items-center">ETA<SortIcon field="eta" /></span>
                  </th>
                  <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Shipper</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((c, i) => (
                  <tr key={c.id} data-testid={`tracking-row-${i}`}
                    className={`border-b border-[#1a2030] cursor-pointer transition-colors stagger-in ${selected === c.id ? 'bg-[#1E293B]' : 'hover:bg-[#121620]'}`}
                    onClick={() => fetchDetail(c)}>
                    <td className="px-4 py-3 font-mono font-bold text-[#F8FAFC]">
                      {c.container_id}
                      {anomalyIds.has(c.container_id) && (
                        <WarningCircle size={12} className="text-[#F97316] inline ml-1.5 mb-0.5" title="Active anomaly flagged" />
                      )}
                    </td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1.5"><MapPin size={11} className="text-[#F97316]" /><span className="text-[#F8FAFC]">{c.origin_country}</span><span className="text-[#B0B8C4]">&rarr;</span><span className="text-[#F8FAFC]">{c.destination_country}</span></div></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 font-mono text-[#F8FAFC]">{new Date(c.eta).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[#B0B8C4]">{c.shipper_name}</td>
                  </tr>
                ))}
                {displayData.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#B0B8C4]">No shipments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div data-testid="pagination" className="flex items-center justify-between px-4 py-3 border-t border-[#2A3441]">
              <button data-testid="prev-page" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 text-xs text-[#B0B8C4] hover:text-white disabled:opacity-30"><CaretLeft size={14} /> Prev</button>
              <span className="text-xs font-mono text-[#B0B8C4]">{page} / {data.pages}</span>
              <button data-testid="next-page" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 text-xs text-[#B0B8C4] hover:text-white disabled:opacity-30">Next <CaretRight size={14} /></button>
            </div>
          )}
        </div>

        {/* Desktop: inline detail (hidden on <xl) */}
        <div className="hidden xl:block">
          {detail ? (
            <div className="panel-border rounded-lg">
              <ContainerDetailPanel container={detail.container} shipper={detail.shipper} onClose={closeDetail} />
            </div>
          ) : (
            <div className="panel-border rounded-lg p-5 flex flex-col items-center justify-center min-h-[300px] opacity-40 text-center">
              <Package size={28} className="text-[#2A3441] mb-3" /><span className="text-xs text-[#B0B8C4]">Select a shipment to view details</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Sheet slide-over — only rendered when not on desktop to prevent overlay mounting */}
      {!isDesktop && (
        <Sheet open={sheetOpen && !!detail} onOpenChange={(open) => { if (!open) closeDetail(); }}>
          <SheetContent side="right" className="bg-[#121620] border-l border-[#2A3441] w-[90vw] sm:max-w-md p-0">
            <SheetHeader className="sr-only"><SheetTitle>Shipment Detail</SheetTitle><SheetDescription>Container detail view</SheetDescription></SheetHeader>
            {detail && <ContainerDetailPanel container={detail.container} shipper={detail.shipper} onClose={closeDetail} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
