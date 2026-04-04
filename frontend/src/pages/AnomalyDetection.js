import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldWarning, Lightning, Spinner as SpinnerIcon, CaretUp, CaretDown, X, ArrowSquareOut, WarningCircle, Fire } from '@phosphor-icons/react';
import { Progress } from '../components/ui/progress';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function RiskBadge({ score }) {
  const color = score >= 0.8 ? '#EF4444' : score >= 0.6 ? '#F97316' : '#F59E0B';
  const label = score >= 0.8 ? 'CRITICAL' : score >= 0.6 ? 'HIGH' : 'MEDIUM';
  return (
    <span data-testid={`risk-badge-${label.toLowerCase()}`} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label} {(score * 100).toFixed(0)}%
    </span>
  );
}

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [sortField, setSortField] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [dismissing, setDismissing] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [anomalyShippers, setAnomalyShippers] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/anomalies`);
      setAnomalies(res.data);
    } catch (e) {
      console.error('Failed to fetch anomalies', e);
      toast.error('Failed to load data. Please try again.');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!anomalies.length) return;
    anomalies.forEach(a => {
      if (anomalyShippers[a.container_id]) return;
      axios.get(`${API}/tracking/containers/lookup/${a.container_id}`)
        .then(res => { if (res.data) setAnomalyShippers(prev => ({ ...prev, [a.container_id]: res.data })); })
        .catch(() => {});
    });
  }, [anomalies]);

  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (highlight && anomalies.length > 0) {
      const match = anomalies.find(a => a.container_id === highlight);
      if (match) setSelected(match);
    }
  }, [anomalies, searchParams]);

  const handleScan = async () => {
    setScanning(true);
    const minWait = new Promise(r => setTimeout(r, 1000));
    await Promise.all([fetchData(), minWait]);
    setScanning(false);
    toast.success('Scan complete. Anomaly list refreshed.');
  };

  const handleDismiss = async (anomalyId) => {
    setDismissing(anomalyId);
    try {
      await axios.post(`${API}/anomalies/${anomalyId}/dismiss`);
      setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
      if (selected?.id === anomalyId) setSelected(null);
      toast.success('Anomaly dismissed.');
    } catch (e) {
      console.error('Failed to dismiss anomaly', e);
      toast.error('Failed to dismiss. Please try again.');
    }
    setDismissing(null);
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <CaretDown size={10} className="text-[#2A3441] ml-1" />;
    return sortDir === 'asc' ? <CaretUp size={10} className="text-[#3B82F6] ml-1" /> : <CaretDown size={10} className="text-[#3B82F6] ml-1" />;
  };

  const sorted = useMemo(() => {
    const items = [...anomalies];
    items.sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return items;
  }, [anomalies, sortField, sortDir]);

  const criticalCount = anomalies.filter(a => a.risk_score >= 0.8).length;
  const highCount = anomalies.filter(a => a.risk_score >= 0.6 && a.risk_score < 0.8).length;

  return (
    <div data-testid="anomaly-page" className="p-6 lg:p-10">
      <PageHeader
        icon={<ShieldWarning size={20} weight="bold" className="text-[#F97316]" />}
        title="Anomaly Detection"
        subtitle="AI-powered scanning identifies overdue and ghost containers. Risk scores indicate urgency of intervention."
        meta={`${anomalies.length} flagged`}
        actions={
          <button
            data-testid="scan-now-btn"
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] disabled:opacity-60 transition-colors"
          >
            {scanning ? <SpinnerIcon size={14} className="animate-spin" /> : <ShieldWarning size={14} />}
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Flagged', value: anomalies.length, color: '#F97316', icon: ShieldWarning, sub: 'containers flagged', alert: true },
          { label: 'Critical', value: criticalCount, color: '#EF4444', icon: Fire, sub: 'score ≥ 80%', alert: true },
          { label: 'High Risk', value: highCount, color: '#F97316', icon: WarningCircle, sub: 'score 60–79%' },
        ].map(s => (
          <div key={s.label} className={`panel-border rounded-lg p-4 ${s.alert ? 'border-l-2' : ''}`}
            style={s.alert ? { borderLeftColor: s.color } : {}}
            data-testid={`anomaly-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
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

      {/* Full-width sortable anomaly table */}
      <div className="panel-border rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="anomaly-table">
            <thead>
              <tr className="bg-[#0B0F19] border-b border-[#2A3441]">
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Container ID</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Anomaly Type</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('risk_score')}>
                  <span className="inline-flex items-center">Risk Score<SortIcon field="risk_score" /></span>
                </th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('dwell_days')}>
                  <span className="inline-flex items-center">Dwell / Max<SortIcon field="dwell_days" /></span>
                </th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Shipping Line</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Detected</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a, i) => (
                <tr key={a.id} data-testid={`anomaly-row-${i}`}
                  className={`border-b border-[#1a2030] cursor-pointer transition-colors stagger-in ${selected?.id === a.id ? 'bg-[#1E293B]' : 'hover:bg-[#121620]'}`}
                  onClick={() => setSelected(a)}>
                  <td className="px-4 py-3">
                    <Link to={`/tracking?container=${a.container_id}`} onClick={e => e.stopPropagation()} className="font-mono font-bold text-[#3B82F6] hover:underline inline-flex items-center gap-1">
                      {a.container_id}
                      <ArrowSquareOut size={10} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#F8FAFC]">{a.anomaly_type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><RiskBadge score={a.risk_score} /></td>
                  <td className="px-4 py-3 font-mono">
                    <span className="text-[#EF4444]">{a.dwell_days}d</span>
                    <span className="text-[#B0B8C4]"> / {a.expected_max_days}d</span>
                  </td>
                  <td className="px-4 py-3 text-[#F8FAFC]">{a.shipping_line}</td>
                  <td className="px-4 py-3 font-mono text-[#B0B8C4]">{new Date(a.detected_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      data-testid={`dismiss-btn-${i}`}
                      onClick={(e) => { e.stopPropagation(); handleDismiss(a.id); }}
                      disabled={dismissing === a.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#B0B8C4] hover:text-white bg-[#1E293B] border border-[#2A3441] rounded-lg hover:bg-[#2A3441] disabled:opacity-40 transition-colors"
                    >
                      {dismissing === a.id ? <SpinnerIcon size={10} className="animate-spin" /> : <X size={10} />}
                      Dismiss
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#B0B8C4]">No anomalies detected</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div data-testid="anomaly-detail-panel" className="panel-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><Lightning size={20} className="text-[#F97316]" /><h3 className="font-mono text-lg font-bold text-[#F8FAFC]">{selected.container_id}</h3></div>
            <button data-testid="close-anomaly-detail" onClick={() => setSelected(null)} className="text-xs text-[#B0B8C4] hover:text-white">Close</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-[#B0B8C4]">Risk Score</span>
              <div className="mt-1"><Progress value={selected.risk_score * 100} className="h-2" /><span className="text-sm font-mono font-bold text-[#F97316] mt-1 block">{(selected.risk_score * 100).toFixed(0)}%</span></div>
            </div>
            <div><span className="text-xs text-[#B0B8C4]">Anomaly Type</span><div className="text-sm font-mono text-[#F8FAFC] mt-1">{selected.anomaly_type.replace(/_/g, ' ')}</div></div>
            <div><span className="text-xs text-[#B0B8C4]">Dwell / Expected</span><div className="text-sm font-mono mt-1"><span className="text-[#EF4444]">{selected.dwell_days}d</span><span className="text-[#B0B8C4]"> / {selected.expected_max_days}d</span></div></div>
            <div><span className="text-xs text-[#B0B8C4]">Shipping Line</span><div className="text-sm text-[#F8FAFC] mt-1">{selected.shipping_line}</div></div>
          </div>
          {anomalyShippers[selected.container_id] && (
            <div className="mt-4 flex items-center justify-between p-3 rounded-lg border border-[#2A3441] bg-[#0B0F19]">
              <div className="text-xs text-[#B0B8C4]">
                Shipper: <span className="text-[#F8FAFC] font-mono">{anomalyShippers[selected.container_id].shipper_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/tracking?container=${selected.container_id}`)} className="text-[10px] font-mono text-[#3B82F6] hover:underline uppercase">View Shipment →</button>
                <button onClick={() => navigate(`/trust-score?shipper=${anomalyShippers[selected.container_id].shipper_id}`)} className="text-[10px] font-mono text-[#10B981] hover:underline uppercase">Trust Score →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
