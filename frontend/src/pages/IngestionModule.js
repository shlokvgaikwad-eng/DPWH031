import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Database, ArrowsClockwise, CloudArrowDown, CheckCircle, HardDrives } from '@phosphor-icons/react';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner';
import { PIPELINE_STATUS } from '../lib/statusConfig';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function PipelineNode({ source, index, onSync }) {
  const cfg = PIPELINE_STATUS[source.status];
  const Icon = cfg.icon;

  return (
    <div data-testid={`pipeline-${source.source_name.replace(/\s+/g, '-').toLowerCase()}`}
      className="panel-border rounded-lg p-4 relative stagger-in" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CloudArrowDown size={16} className="text-[#3B82F6]" />
          <span className="text-sm font-bold tracking-wide text-[#F8FAFC]">{source.source_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid={`sync-btn-${source.source_name.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => onSync(source.id)}
            disabled={source.status === 'syncing'}
            className="p-1 rounded-sm hover:bg-[#1E293B] transition-colors disabled:opacity-40"
            title="Sync Now"
          >
            <ArrowsClockwise size={14} className={`text-[#3B82F6] ${source.status === 'syncing' ? 'animate-spin' : ''}`} />
          </button>
          <Icon size={14} style={{ color: cfg.color }} className={source.status === 'syncing' ? 'animate-spin' : ''} />
          <span className="text-xs font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-[#B0B8C4]">Type</span><div className="font-mono text-[#F8FAFC] mt-0.5">{source.source_type}</div></div>
        <div><span className="text-[#B0B8C4]">Interval</span><div className="font-mono text-[#F8FAFC] mt-0.5">{source.sync_interval_min}min</div></div>
        <div><span className="text-[#B0B8C4]">Records</span><div className="font-mono text-[#3B82F6] mt-0.5">{source.records_ingested.toLocaleString()}</div></div>
        <div><span className="text-[#B0B8C4]">Last Sync</span><div className="font-mono text-[#F8FAFC] mt-0.5 text-[10px]">{new Date(source.last_sync).toLocaleTimeString()}</div></div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: cfg.color, opacity: 0.4 }} />
    </div>
  );
}

export default function IngestionModule() {
  const [pipelines, setPipelines] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/pipelines`);
      setPipelines(res.data);
    } catch (e) {
      console.error('Failed to fetch pipelines', e);
      toast.error('Failed to load data. Please try again.');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = (pipelineId) => {
    setPipelines(prev => prev.map(p => p.id === pipelineId ? { ...p, status: 'syncing' } : p));
    setTimeout(() => {
      setPipelines(prev => prev.map(p => p.id === pipelineId ? { ...p, status: 'active', last_sync: new Date().toISOString() } : p));
      toast.success('Pipeline synced successfully.');
    }, 2000);
  };

  const totalRecords = pipelines.reduce((sum, p) => sum + p.records_ingested, 0);
  const activeCount = pipelines.filter(p => p.status === 'active').length;

  return (
    <div data-testid="ingestion-page" className="p-6 lg:p-10">
      <PageHeader
        icon={<Database size={20} weight="bold" className="text-[#3B82F6]" />}
        title="Data Ingestion"
        subtitle="Live data streams from port systems. Pipelines sync every 15 minutes pulling container records from multiple sources."
        meta={`${pipelines.length} sources`}
      />

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Sources', value: pipelines.length, color: '#F8FAFC', icon: HardDrives, sub: 'connected pipelines' },
          { label: 'Active', value: activeCount, color: '#10B981', icon: CheckCircle, sub: 'syncing normally' },
          { label: 'Total Records', value: totalRecords.toLocaleString(), color: '#3B82F6', icon: Database, sub: 'ingested to date' },
        ].map(s => (
          <div key={s.label} className="panel-border rounded-lg p-4" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
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

      <div className="panel-border rounded-lg p-6 mb-6">
        <div className="text-xs text-[#B0B8C4] mb-4">Pipeline Network</div>
        <div className="relative mb-8">
          <svg width="100%" height="200" viewBox="0 0 800 200" className="overflow-visible">
            <rect x="340" y="70" width="120" height="60" rx="4" fill="#1E293B" stroke="#3B82F6" strokeWidth="1" />
            <text x="400" y="95" textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="bold">GHOSTCLEAR</text>
            <text x="400" y="112" textAnchor="middle" fill="#B0B8C4" fontSize="9">Data Hub</text>
            {pipelines.slice(0, 3).map((p, i) => {
              const y = 40 + i * 60;
              const cfg = PIPELINE_STATUS[p.status];
              return (
                <g key={p.id}>
                  <line x1="180" y1={y + 15} x2="340" y2="100" stroke={cfg.color} strokeWidth="1" className="data-flow-line" opacity="0.6" />
                  <rect x="40" y={y} width="140" height="30" rx="2" fill="#121620" stroke="#2A3441" strokeWidth="1" />
                  <circle cx="55" cy={y + 15} r="4" fill={cfg.color} />
                  <text x="70" y={y + 19} fill="#F8FAFC" fontSize="10">{p.source_name}</text>
                </g>
              );
            })}
            {pipelines.slice(3).map((p, i) => {
              const y = 40 + i * 60;
              const cfg = PIPELINE_STATUS[p.status];
              return (
                <g key={p.id}>
                  <line x1="460" y1="100" x2="620" y2={y + 15} stroke={cfg.color} strokeWidth="1" className="data-flow-line" opacity="0.6" />
                  <rect x="620" y={y} width="140" height="30" rx="2" fill="#121620" stroke="#2A3441" strokeWidth="1" />
                  <circle cx="635" cy={y + 15} r="4" fill={cfg.color} />
                  <text x="650" y={y + 19} fill="#F8FAFC" fontSize="10">{p.source_name}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pipelines.map((p, i) => (
          <PipelineNode key={p.id} source={p} index={i} onSync={handleSync} />
        ))}
      </div>
    </div>
  );
}
