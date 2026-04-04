import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, User, CaretDown, CaretUp, Spinner, TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner';
import { useShippers } from '../hooks/useShippers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_CONFIG = {
  'Low Risk': { color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  'Medium Risk': { color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  'High Risk': { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

const TREND_COLORS = { increasing: '#10B981', stable: '#B0B8C4', decreasing: '#EF4444' };
const TREND_LABELS = { increasing: 'Improving', stable: 'Stable', decreasing: 'Declining' };
const TREND_ICONS = { increasing: TrendUp, stable: Minus, decreasing: TrendDown };

// Compact inline score ring (80×80)
function ScoreRingInline({ score, category }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Medium Risk'];
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div data-testid="trust-score-ring" className="relative w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="30" fill="none" stroke="#1a2030" strokeWidth="6" />
        <circle cx="40" cy="40" r="30" fill="none" stroke={cfg.color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-mono font-bold text-[#F8FAFC]">{score}</span>
      </div>
    </div>
  );
}

export default function TrustScore() {
  const [searchParams] = useSearchParams();
  const { shippers, selectedShipper, setSelectedShipper } = useShippers(searchParams.get('shipper'));
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const abortRef = useRef(null);

  const fetchTrustScore = useCallback(async () => {
    if (!selectedShipper) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setTrustData(null);
    try {
      const res = await axios.get(`${API}/tracking/shippers/${selectedShipper}/trust-score`, { signal: controller.signal });
      setTrustData(res.data);
    } catch (e) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error(e);
      toast.error('Failed to load data. Please try again.');
    }
    setLoading(false);
  }, [selectedShipper]);

  useEffect(() => { fetchTrustScore(); }, [fetchTrustScore]);

  const shipper = shippers.find(s => s.id === selectedShipper);
  const trendColor = trustData?.trend ? TREND_COLORS[trustData.trend] : '#B0B8C4';
  const trendLabel = trustData?.trend ? TREND_LABELS[trustData.trend] : '';
  const TrendIcon = trustData?.trend ? TREND_ICONS[trustData.trend] : Minus;
  const cfg = trustData ? (CATEGORY_CONFIG[trustData.category] || CATEGORY_CONFIG['Medium Risk']) : null;

  return (
    <div data-testid="trust-score-page" className="p-6 lg:p-10">
      <PageHeader
        icon={<ShieldCheck size={20} weight="bold" className="text-[#10B981]" />}
        title="Trust Score Engine"
        subtitle="AI-powered trust scoring for each shipper. Scores are generated based on historical shipment data with full explainability."
        meta={trustData ? `Score: ${trustData.score}` : null}
      />

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <User size={16} className="text-[#B0B8C4]" />
        <Select value={selectedShipper || ''} onValueChange={(v) => setSelectedShipper(v)}>
          <SelectTrigger data-testid="trust-shipper-selector" className="w-64 bg-[#121620] border-[#2A3441] text-[#F8FAFC]">
            <SelectValue placeholder="Select Shipper" />
          </SelectTrigger>
          <SelectContent className="bg-[#121620] border-[#2A3441]">
            {shippers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name} — {s.company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {shipper && <span className="text-xs text-[#B0B8C4]">{shipper.company}, {shipper.country}</span>}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} className="animate-spin text-[#3B82F6]" />
          <span className="ml-3 text-sm text-[#B0B8C4]">Analyzing shipper data with AI...</span>
        </div>
      )}

      {trustData && !loading && (
        <div className="space-y-4">
          {/* Score header strip — inline ring + category + trend + stats */}
          <div className="panel-border rounded-lg p-5">
            <div className="flex items-center gap-6 flex-wrap">
              <ScoreRingInline score={trustData.score} category={trustData.category} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                    {trustData.category}
                  </span>
                  <div data-testid="trust-trend" className="flex items-center gap-1.5">
                    <TrendIcon size={14} style={{ color: trendColor }} />
                    <span className="text-xs font-mono" style={{ color: trendColor }}>{trendLabel}</span>
                    {trustData.trend_delta != null && trustData.trend_delta !== 0 && (
                      <span className="text-xs font-mono" style={{ color: trustData.trend_delta > 0 ? '#10B981' : '#EF4444' }}>
                        ({trustData.trend_delta > 0 ? '+' : ''}{trustData.trend_delta}%)
                      </span>
                    )}
                  </div>
                </div>
                {shipper && (
                  <div className="text-xs text-[#B0B8C4]">
                    <span className="text-[#F8FAFC] font-medium">{shipper.name}</span> · {shipper.company} · {shipper.country}
                  </div>
                )}
              </div>
              {/* Inline stat pills */}
              {trustData.stats && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Total', value: trustData.stats.total, color: '#F8FAFC' },
                    { label: 'On Time', value: trustData.stats.delivered, color: '#10B981' },
                    { label: 'Delayed', value: trustData.stats.delayed, color: '#F97316' },
                    { label: 'Disputes', value: trustData.stats.disputes, color: '#EF4444' },
                    { label: 'Holds', value: trustData.stats.customs_holds, color: '#EF4444' },
                    { label: 'Avg Delay', value: `${trustData.stats.avg_delay_days}d`, color: '#F97316' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F19] border border-[#2A3441]">
                      <span className="text-[10px] text-[#B0B8C4]">{s.label}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Score Breakdown with impact bars */}
          <div className="panel-border rounded-lg p-6">
            <div className="text-xs text-[#B0B8C4] mb-4">Score Breakdown</div>
            <div className="space-y-3">
              {(trustData.breakdown || []).map((item, i) => {
                const impact = String(item.impact);
                const numVal = parseInt(impact.replace('+', ''), 10) || 0;
                const isPositive = impact.startsWith('+') || (!impact.startsWith('-') && numVal > 0);
                const barWidth = Math.min(Math.abs(numVal) * 3, 100); // scale for visual
                return (
                  <div key={i} data-testid={`breakdown-item-${i}`} className="py-2 border-b border-[#1a2030]">
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-14 text-right">
                        <span className={`text-sm font-mono font-bold ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          {isPositive && !impact.startsWith('+') ? '+' : ''}{impact}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-[#F8FAFC]">{item.factor}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-14" />
                      <div className="flex-1">
                        {/* Impact bar */}
                        <div className="w-full h-1.5 bg-[#1a2030] rounded-full overflow-hidden mb-1">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barWidth}%`, background: isPositive ? '#10B981' : '#EF4444' }} />
                        </div>
                        <div className="text-[10px] text-[#B0B8C4]">{item.description}</div>
                        {item.detail && <div className="text-[10px] text-[#4A5568] mt-0.5 italic">{item.detail}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="panel-border rounded-lg p-6">
            <button data-testid="toggle-explanation" onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left">
              <span className="text-xs text-[#B0B8C4]">AI Analysis</span>
              {expanded ? <CaretUp size={14} className="text-[#B0B8C4]" /> : <CaretDown size={14} className="text-[#B0B8C4]" />}
            </button>
            {expanded && (
              <div data-testid="trust-explanation" className="mt-4 p-4 rounded-lg bg-[#0B0F19] border border-[#1a2030]">
                <p className="text-sm text-[#F8FAFC] leading-relaxed">{trustData.explanation}</p>
              </div>
            )}
          </div>

          {/* Score Evidence — kept as the most useful panel */}
          {trustData.reference_events && (
            <div className="panel-border rounded-lg p-6">
              <div className="text-xs text-[#B0B8C4] mb-4">Score Evidence — Why this score?</div>
              <Tabs defaultValue="delays">
                <TabsList className="bg-[#0B0F19] border border-[#2A3441] mb-4">
                  <TabsTrigger value="delays" className="text-xs data-[state=active]:bg-[#1E293B] data-[state=active]:text-[#F8FAFC]">Worst Delays ({trustData.reference_events.worst_delays.length})</TabsTrigger>
                  <TabsTrigger value="disputes" className="text-xs data-[state=active]:bg-[#1E293B] data-[state=active]:text-[#F8FAFC]">Disputes ({trustData.reference_events.disputes.length})</TabsTrigger>
                  <TabsTrigger value="customs" className="text-xs data-[state=active]:bg-[#1E293B] data-[state=active]:text-[#F8FAFC]">Customs Holds ({trustData.reference_events.customs_holds.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="delays">
                  <p className="text-[10px] text-[#B0B8C4] mb-3 italic">Each delay reduces the on-time rate, which accounts for 40% of the total score.</p>
                  {trustData.reference_events.worst_delays.length === 0 ? <p className="text-xs text-[#B0B8C4]">No delays recorded.</p> : (
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-[#2A3441]">
                        {['Shipment', 'Date', 'Delay', 'Route', 'Cargo'].map(h => <th key={h} className="pb-2 text-left text-[#B0B8C4] font-mono uppercase text-[10px]">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {trustData.reference_events.worst_delays.map((e, i) => (
                          <tr key={i} className="border-b border-[#1a2030]">
                            <td className="py-2 font-mono text-[#3B82F6]">{e.shipment_id}</td>
                            <td className="py-2 font-mono text-[#B0B8C4]">{e.date}</td>
                            <td className="py-2 font-mono font-bold text-[#EF4444]">{e.delay_days}d</td>
                            <td className="py-2 text-[#F8FAFC]">{e.route}</td>
                            <td className="py-2 text-[#B0B8C4]">{e.cargo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </TabsContent>

                <TabsContent value="disputes">
                  <p className="text-[10px] text-[#B0B8C4] mb-3 italic">Each dispute reduces the score by 5 points. Industry benchmark is under 3% dispute rate.</p>
                  {trustData.reference_events.disputes.length === 0 ? <p className="text-xs text-[#B0B8C4]">No disputes recorded.</p> : (
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-[#2A3441]">
                        {['Shipment', 'Date', 'Route', 'Cargo'].map(h => <th key={h} className="pb-2 text-left text-[#B0B8C4] font-mono uppercase text-[10px]">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {trustData.reference_events.disputes.map((e, i) => (
                          <tr key={i} className="border-b border-[#1a2030]">
                            <td className="py-2 font-mono text-[#3B82F6]">{e.shipment_id}</td>
                            <td className="py-2 font-mono text-[#B0B8C4]">{e.date}</td>
                            <td className="py-2 text-[#F8FAFC]">{e.route}</td>
                            <td className="py-2 text-[#B0B8C4]">{e.cargo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </TabsContent>

                <TabsContent value="customs">
                  <p className="text-[10px] text-[#B0B8C4] mb-3 italic">Each customs hold reduces the score by 3 points.</p>
                  {trustData.reference_events.customs_holds.length === 0 ? <p className="text-xs text-[#B0B8C4]">No customs holds recorded.</p> : (
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-[#2A3441]">
                        {['Shipment', 'Date', 'Route'].map(h => <th key={h} className="pb-2 text-left text-[#B0B8C4] font-mono uppercase text-[10px]">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {trustData.reference_events.customs_holds.map((e, i) => (
                          <tr key={i} className="border-b border-[#1a2030]">
                            <td className="py-2 font-mono text-[#3B82F6]">{e.shipment_id}</td>
                            <td className="py-2 font-mono text-[#B0B8C4]">{e.date}</td>
                            <td className="py-2 text-[#F8FAFC]">{e.route}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
