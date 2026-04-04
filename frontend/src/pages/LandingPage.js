import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Warehouse, WarningCircle, Package, Clock, X, SquaresFour, MapPin, MagnifyingGlass, TreeStructure } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Skeleton } from '../components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONTAINER_COLORS = { normal: '#3B82F6', overdue: '#F97316', ghost: '#EF4444' };
const STATUS_BG = { normal: 'rgba(59,130,246,0.12)', overdue: 'rgba(249,115,22,0.12)', ghost: 'rgba(239,68,68,0.12)' };
const FLAGGED_COLORS = {
  clearance: { color: '#06B6D4', bg: 'rgba(6,182,212,0.18)', label: 'Flagged for Clearance' },
  review: { color: '#FBBF24', bg: 'rgba(251,191,36,0.18)', label: 'Scheduled for Review' },
};

const ZONE_CONFIG = [
  { name: 'Receiving', label: 'RCV', color: '#3B82F6' },
  { name: 'Bulk Storage', label: 'BLK', color: '#B0B8C4' },
  { name: 'High-Value', label: 'HVL', color: '#F59E0B' },
  { name: 'Refrigerated', label: 'REF', color: '#06B6D4' },
  { name: 'Hazardous', label: 'HAZ', color: '#EF4444' },
  { name: 'Dispatch', label: 'DSP', color: '#10B981' },
];

function RackSlot({ stack, onSelect, selectedId, zone, rack, flaggedContainers }) {
  if (stack.length === 0) {
    return (
      <div className="h-14 rounded-lg bg-[#0B0F19]/50 border border-dashed border-[#1a2030] flex items-center justify-center">
        <span className="text-[8px] font-mono text-[#2A3441]">EMPTY</span>
      </div>
    );
  }
  const top = stack[stack.length - 1];
  const flagType = flaggedContainers?.get(top.container_id);
  const flagCfg = flagType ? FLAGGED_COLORS[flagType] : null;
  const color = flagCfg ? flagCfg.color : CONTAINER_COLORS[top.status];
  const bgColor = flagCfg ? flagCfg.bg : STATUS_BG[top.status];
  const isSelected = selectedId === top.id;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            data-testid={`container-block-${top.container_id}`}
            className={`h-14 w-full rounded-lg border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-150 relative
              ${isSelected ? 'ring-2 ring-offset-1 ring-offset-[#0B0F19] scale-[1.03] z-10' : 'hover:scale-[1.03] hover:brightness-125'}`}
            style={{ 
              background: bgColor, 
              borderColor: flagCfg ? color : (isSelected ? color : `${color}60`), 
              borderWidth: flagCfg ? '2px' : '1px',
              boxShadow: flagCfg || isSelected ? `0 0 16px ${color}40` : 'none', 
              ringColor: color 
            }}
            onClick={() => onSelect(top)}
          >
            <span className="text-[10px] font-mono font-bold leading-none" style={{ color }}>{top.dwell_days}d</span>
            <span className="text-[7px] font-mono text-[#B0B8C4] leading-none truncate px-1 w-full text-center">{top.container_id.slice(-6)}</span>
            {stack.length > 1 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#121620] border border-[#2A3441] text-[7px] font-mono text-[#B0B8C4] flex items-center justify-center">{stack.length}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-[#0B0F19] border border-[#2A3441] px-3 py-2">
          <div className="text-[11px] font-mono text-[#F8FAFC] font-bold">{top.container_id}</div>
          <div className="flex items-center gap-1.5 mt-1"><Clock size={10} style={{ color }} /><span className="text-[11px] font-mono" style={{ color }}>{top.dwell_days} days in storage</span></div>
          <div className="text-[10px] text-[#B0B8C4] mt-0.5">{top.shipping_line} &middot; {top.size} &middot; {stack.length > 1 ? `${stack.length} stacked` : 'Single'}</div>
          <div className="text-[10px] text-[#B0B8C4] mt-0.5"><MapPin size={9} className="inline" /> {zone} &middot; Rack {rack}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 bg-[#1E293B]" />)}
      </div>
      <Skeleton className="h-96 bg-[#1E293B]" />
    </div>
  );
}

export default function LandingPage() {
  const [containers, setContainers] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [flaggedContainers, setFlaggedContainers] = useState(new Map());
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [selectedOwnership, setSelectedOwnership] = useState(null);
  const navigate = useNavigate();
  const isLoading = containers.length === 0 && stats === null;

  const fetchData = useCallback(async () => {
    try {
      const [contRes, statsRes] = await Promise.all([
        axios.get(`${API}/containers`),
        axios.get(`${API}/containers/stats`),
      ]);
      setContainers(contRes.data);
      setStats(statsRes.data);
      setLastUpdated(new Date());
      setMinutesAgo(0);
    } catch (e) {
      console.error('Failed to fetch containers', e);
      toast.error('Failed to load data. Please try again.');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // #11 - last updated timer
  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesAgo(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Filter by search
  const filtered = search
    ? containers.filter(c => c.container_id.toLowerCase().includes(search.toLowerCase()))
    : containers;

  useEffect(() => {
    if (!selected) { setSelectedAnomaly(null); return; }
    axios.get(`${API}/containers/${selected.container_id}/anomalies`)
      .then(res => setSelectedAnomaly(res.data.length > 0 ? res.data[0] : null))
      .catch(() => setSelectedAnomaly(null));
  }, [selected]);

  useEffect(() => {
    if (!selected) { setSelectedOwnership(null); return; }
    axios.get(`${API}/containers/${selected.container_id}/ownership`)
      .then(res => setSelectedOwnership(res.data.node ? res.data : null))
      .catch(() => setSelectedOwnership(null));
  }, [selected]);

  const grid = {};
  filtered.forEach(c => {
    const key = `${c.position_x}-${c.position_y}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(c);
  });

  const zoneCounts = ZONE_CONFIG.map((z, zi) => {
    let count = 0;
    for (let r = 0; r < 8; r++) count += (grid[`${r}-${zi}`] || []).length;
    return count;
  });

  const noResults = search && filtered.length === 0;

  return (
    <div data-testid="landing-page" className="p-6 lg:p-10">
      <PageHeader
        icon={<Warehouse size={20} weight="bold" className="text-[#3B82F6]" />}
        title="Warehouse Plot"
        subtitle="Real-time warehouse floor map. Each zone contains storage racks with containers. Hover for dwell time, click for full details. Ghost items require immediate clearance."
        meta={stats ? `${stats.total} containers` : null}
      />

      {isLoading ? <SkeletonGrid /> : (
        <>
          {stats && (
            <div data-testid="stats-bar" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total', value: stats.total, color: '#F8FAFC', icon: Package, sub: 'containers in yard' },
                { label: 'Active', value: stats.normal, color: '#3B82F6', icon: Package, sub: 'within threshold' },
                { label: 'Overdue', value: stats.overdue, color: '#F97316', icon: WarningCircle, sub: 'past 90 day limit', alert: true },
                { label: 'Ghost', value: stats.ghost, color: '#EF4444', icon: WarningCircle, sub: 'require clearance', alert: true },
              ].map(s => (
                <div key={s.label} className={`panel-border rounded-lg p-4 stagger-in ${s.alert ? 'border-l-2' : ''}`}
                  style={s.alert ? { borderLeftColor: s.color } : {}}
                  data-testid={`stat-${s.label.toLowerCase()}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                      <s.icon size={20} style={{ color: s.color }} />
                    </div>
                    <div>
                      <div className="text-xs text-[#B0B8C4] mb-0.5">{s.label}</div>
                      <div className="text-2xl font-mono font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] text-[#4A5568] mt-0.5">{s.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* #11 Last updated */}
          {lastUpdated && (
            <div data-testid="last-updated" className="text-[10px] font-mono text-[#B0B8C4] mb-6">
              Last updated: {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`}
            </div>
          )}

          {/* #7 Search */}
          <div className="mb-4">
            <div className="relative w-64">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B8C4]" />
              <input
                data-testid="container-search"
                type="text"
                placeholder="Search container ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); setSelectedAnomaly(null); setSelectedOwnership(null); }}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[#121620] border border-[#2A3441] rounded-lg text-[#F8FAFC] placeholder:text-[#B0B8C4] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 mb-6">
            {/* #8 overflow-x-auto */}
            <div className="panel-border rounded-lg p-6 overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="flex items-center justify-between mb-5">
                  <div className="text-xs uppercase tracking-widest text-[#B0B8C4]">Warehouse Floor Plan</div>
                  <div className="flex items-center gap-2 text-[10px] text-[#B0B8C4]"><SquaresFour size={12} /> 6 Zones &middot; 8 Racks each</div>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-3 mb-2">
                  <div />
                  <div className="grid grid-cols-8 gap-2">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="text-center text-[9px] font-mono text-[#B0B8C4] uppercase">Rack {i + 1}</div>
                    ))}
                  </div>
                </div>

                {noResults ? (
                  <div data-testid="no-results" className="py-12 text-center text-sm text-[#B0B8C4]">No containers match "{search}"</div>
                ) : (
                  <div className="space-y-1" data-testid="container-yard-grid">
                    {ZONE_CONFIG.map((zone, zoneIdx) => (
                      <div key={zone.label}>
                        {zoneIdx > 0 && (
                          <div className="flex items-center gap-2 my-2">
                            <div className="flex-1 h-px bg-[#2A3441] opacity-40" />
                            <span className="text-[8px] font-mono text-[#2A3441] uppercase tracking-widest">Aisle {zoneIdx}</span>
                            <div className="flex-1 h-px bg-[#2A3441] opacity-40" />
                          </div>
                        )}
                        <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
                          <div className="flex items-center gap-2 py-2 px-3 rounded-lg" style={{ background: `${zone.color}08`, borderLeft: `3px solid ${zone.color}40` }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-mono font-bold" style={{ background: `${zone.color}15`, color: zone.color }}>{zone.label}</div>
                            <div>
                              <div className="text-[10px] font-bold text-[#F8FAFC] leading-tight">{zone.name}</div>
                              <div className="text-[8px] font-mono text-[#B0B8C4]">{zoneCounts[zoneIdx]} items</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-8 gap-2">
                            {Array.from({ length: 8 }, (_, rackIdx) => {
                              const key = `${rackIdx}-${zoneIdx}`;
                              const stack = grid[key] || [];
                              return <RackSlot key={key} stack={stack} onSelect={setSelected} selectedId={selected?.id} zone={zone.name} rack={rackIdx + 1} flaggedContainers={flaggedContainers} />;
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-6 text-xs text-[#B0B8C4] mt-6 pt-4 border-t border-[#2A3441]">
                  {[
                    { label: 'Active (<90d)', color: '#3B82F6' },
                    { label: 'Overdue (90-180d)', color: '#F97316' },
                    { label: 'Ghost (>180d)', color: '#EF4444' },
                    { label: 'Empty Slot', color: '#2A3441', dashed: true },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-lg ${l.dashed ? 'border border-dashed' : 'border-2'}`} style={{ borderColor: l.color, background: l.dashed ? 'transparent' : `${l.color}20` }} />
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detail Panel with #10 action buttons */}
            <div className={`panel-border rounded-lg transition-opacity duration-200 ${selected ? 'opacity-100' : 'opacity-40'}`}>
              {selected ? (
                <div data-testid="container-detail-panel" className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-widest text-[#B0B8C4]">Item Details</span>
                    <button data-testid="close-detail-panel" onClick={() => setSelected(null)} className="text-[#B0B8C4] hover:text-white transition-colors"><X size={16} /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2" style={{ borderColor: CONTAINER_COLORS[selected.status], background: STATUS_BG[selected.status] }}>
                      <Package size={18} style={{ color: CONTAINER_COLORS[selected.status] }} />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-[#F8FAFC]">{selected.container_id}</h3>
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: CONTAINER_COLORS[selected.status] }}>{selected.status}</span>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'Storage Duration', value: `${selected.dwell_days} days`, mono: true },
                      { label: 'Container Size', value: selected.size, mono: true },
                      { label: 'Shipping Line', value: selected.shipping_line },
                      { label: 'Zone / Rack', value: `${ZONE_CONFIG[selected.position_y]?.name || 'Unknown'} / Rack ${selected.position_x + 1}`, mono: true },
                      { label: 'Received', value: new Date(selected.arrival_date).toLocaleDateString(), mono: true },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-[#1a2030]">
                        <span className="text-[#B0B8C4] text-xs">{row.label}</span>
                        <span className={`text-[#F8FAFC] ${row.mono ? 'font-mono' : ''} text-xs`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {selected.status !== 'normal' && (
                    <div className="mt-4 p-3 rounded-lg border" style={{ borderColor: CONTAINER_COLORS[selected.status] + '40', background: STATUS_BG[selected.status] }}>
                      <div className="flex items-center gap-2">
                        <WarningCircle size={14} style={{ color: CONTAINER_COLORS[selected.status] }} />
                        <span className="text-xs" style={{ color: CONTAINER_COLORS[selected.status] }}>
                          {selected.status === 'ghost' ? 'Ghost item. Requires immediate clearance action.' : 'Overdue storage. Approaching ghost threshold.'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    {selectedAnomaly && (
                      <button
                        onClick={() => navigate(`/anomaly?highlight=${selected.container_id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#F97316]/40 bg-[#F97316]/10 hover:bg-[#F97316]/20 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <WarningCircle size={13} className="text-[#F97316]" />
                          <span className="text-xs text-[#F97316] font-mono">Active Anomaly — Risk {(selectedAnomaly.risk_score * 100).toFixed(0)}%</span>
                        </div>
                        <span className="text-[10px] text-[#F97316] font-mono">View →</span>
                      </button>
                    )}
                    {selectedOwnership && (
                      <button
                        onClick={() => navigate(`/ownership?container=${selected.container_id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 hover:bg-[#10B981]/20 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <TreeStructure size={13} className="text-[#10B981]" />
                          <span className="text-xs text-[#10B981] font-mono">
                            Owner: {selectedOwnership.chain.find(c => c.node.node_type === 'owner')?.node.label || 'On record'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#10B981] font-mono">Trace →</span>
                      </button>
                    )}
                  </div>
                  {/* #10 Action buttons */}
                  {(selected.status === 'ghost' || selected.status === 'overdue') && (
                    <div className="mt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            data-testid={selected.status === 'ghost' ? 'flag-clearance-btn' : 'schedule-review-btn'}
                            className="w-full py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
                            style={{ background: CONTAINER_COLORS[selected.status], color: '#fff' }}
                          >
                            {selected.status === 'ghost' ? 'Flag for Clearance' : 'Schedule Review'}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#121620] border-[#2A3441]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-[#F8FAFC]">
                              {selected.status === 'ghost' ? 'Flag for Clearance?' : 'Schedule Review?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-[#B0B8C4]">
                              {selected.status === 'ghost'
                                ? `Container ${selected.container_id} will be flagged for immediate clearance. This action will notify the operations team.`
                                : `Container ${selected.container_id} will be scheduled for review. The assigned officer will be notified.`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-[#1E293B] border-[#2A3441] text-[#B0B8C4] hover:bg-[#2A3441] hover:text-[#F8FAFC]">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              data-testid="confirm-action-btn"
                              className="bg-[#3B82F6] hover:bg-[#2563EB]"
                              onClick={() => {
                                const actionType = selected.status === 'ghost' ? 'clearance' : 'review';
                                setFlaggedContainers(prev => {
                                  const next = new Map(prev);
                                  next.set(selected.container_id, actionType);
                                  return next;
                                });
                                toast.success(
                                  selected.status === 'ghost'
                                    ? `${selected.container_id} flagged for clearance`
                                    : `Review scheduled for ${selected.container_id}`
                                );
                              }}
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <Package size={28} className="text-[#2A3441] mb-3" />
                  <span className="text-xs text-[#B0B8C4]">Select an item from the floor plan to view details</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
