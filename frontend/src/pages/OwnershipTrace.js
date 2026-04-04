import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TreeStructure, MagnifyingGlass, Package, User, Buildings, ArrowSquareOut, Download } from '@phosphor-icons/react';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONFIDENCE_COLORS = (score) => score > 0.7 ? '#10B981' : score > 0.4 ? '#F97316' : '#EF4444';

const COUNTRY_FLAGS = {
  'Singapore': '🇸🇬', 'Hong Kong': '🇭🇰', 'China': '🇨🇳',
  'Germany': '🇩🇪', 'USA': '🇺🇸', 'UK': '🇬🇧',
  'Japan': '🇯🇵', 'UAE': '🇦🇪', 'Unknown': '🏳️',
};

export default function OwnershipTrace() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/ownership`);
      setGraph(res.data);
    } catch (e) {
      console.error('Failed to fetch ownership data', e);
      toast.error('Failed to load data. Please try again.');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build joined rows: container → registry → owner by walking edges
  const joinedRows = useMemo(() => {
    const { nodes, edges } = graph;
    if (!nodes.length || !edges.length) return [];

    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.node_id] = n; });

    const rows = [];
    const containers = nodes.filter(n => n.node_type === 'container');

    containers.forEach(container => {
      const containerEdges = edges.filter(e => e.source === container.node_id);

      containerEdges.forEach(ce => {
        const registry = nodeMap[ce.target];
        if (!registry || registry.node_type !== 'registry') return;

        const registryEdges = edges.filter(e => e.source === registry.node_id);

        registryEdges.forEach(re => {
          const owner = nodeMap[re.target];
          if (!owner || owner.node_type !== 'owner') return;

          rows.push({
            containerId: container.node_id,
            containerLabel: container.label,
            containerDetails: container.details || {},
            registryLabel: registry.label,
            registryType: registry.details?.registry_type || '—',
            containerToRegistryRel: ce.relationship.replace(/_/g, ' '),
            registryToOwnerRel: re.relationship.replace(/_/g, ' '),
            ownerLabel: owner.label,
            ownerCountry: owner.details?.country || '—',
            ownerStatus: owner.details?.status || '—',
            ownerContact: owner.details?.contact || '—',
            confidence: owner.confidence_score ?? registry.confidence_score ?? null,
          });
        });

        if (registryEdges.filter(e => nodeMap[e.target]?.node_type === 'owner').length === 0) {
          rows.push({
            containerId: container.node_id,
            containerLabel: container.label,
            containerDetails: container.details || {},
            registryLabel: registry.label,
            registryType: registry.details?.registry_type || '—',
            containerToRegistryRel: ce.relationship.replace(/_/g, ' '),
            registryToOwnerRel: '—',
            ownerLabel: 'Unknown',
            ownerCountry: '—',
            ownerStatus: '—',
            ownerContact: '—',
            confidence: registry.confidence_score ?? null,
          });
        }
      });
    });

    return rows;
  }, [graph]);

  // Filter
  const filtered = useMemo(() => {
    if (!search) return joinedRows;
    const q = search.toLowerCase();
    return joinedRows.filter(r =>
      r.containerLabel.toLowerCase().includes(q) ||
      r.registryLabel.toLowerCase().includes(q) ||
      r.ownerLabel.toLowerCase().includes(q) ||
      r.ownerCountry.toLowerCase().includes(q) ||
      r.registryType.toLowerCase().includes(q)
    );
  }, [joinedRows, search]);

  // Auto-expand from URL param
  useEffect(() => {
    const containerParam = searchParams.get('container');
    if (containerParam && filtered.length > 0) {
      const idx = filtered.findIndex(r => r.containerLabel === containerParam);
      if (idx >= 0) {
        const r = filtered[idx];
        setExpandedRow(`${r.containerId}-${r.registryLabel}-${r.ownerLabel}-${idx}`);
      }
    }
  }, [filtered, searchParams]);

  return (
    <div data-testid="ownership-page" className="p-6 lg:p-10">
      <PageHeader
        icon={<TreeStructure size={20} weight="bold" className="text-[#10B981]" />}
        title="Ownership Trace"
        subtitle="Trace container ownership through registries and operators. Search across all fields to find specific containers or owners."
        meta={`${filtered.length} chains`}
      />

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-72">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B8C4]" />
          <input
            data-testid="ownership-search"
            type="text"
            placeholder="Search container, registry, or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[#121620] border border-[#2A3441] rounded-lg text-[#F8FAFC] placeholder:text-[#B0B8C4] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>
        <span className="text-xs text-[#B0B8C4] font-mono">{filtered.length} trace{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Joined table */}
      <div className="panel-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="ownership-table">
            <thead>
              <tr className="bg-[#0B0F19] border-b border-[#2A3441]">
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Container</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Registry</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Registry Type</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Relationship</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Country</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[#B0B8C4] font-mono uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const rowKey = `${row.containerId}-${row.registryLabel}-${row.ownerLabel}-${i}`;
                const isExpanded = expandedRow === rowKey;
                return (
                  <>
                    <tr
                      key={rowKey}
                      data-testid={`ownership-row-${i}`}
                      className={`border-b border-[#1a2030] cursor-pointer transition-colors stagger-in ${isExpanded ? 'bg-[#1E293B]' : 'hover:bg-[#121620]'}`}
                      onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-[#3B82F6]">{row.containerLabel}</div>
                        {row.containerDetails.size && (
                          <div className="text-[10px] text-[#B0B8C4]">{row.containerDetails.size} · {row.containerDetails.dwell_days}d dwell</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#F8FAFC]">{row.registryLabel}</td>
                      <td className="px-4 py-3 text-[#B0B8C4]">{row.registryType}</td>
                      <td className="px-4 py-3">
                        <div className="text-[10px] text-[#B0B8C4]">{row.containerToRegistryRel}</div>
                        <div className="text-[10px] text-[#B0B8C4]">→ {row.registryToOwnerRel}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono font-bold ${row.ownerLabel === 'Unknown' || row.ownerLabel === 'Unknown Entity' ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                          {row.ownerLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#F8FAFC]">{row.ownerCountry}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-lg ${
                          row.ownerStatus === 'Active' ? 'text-[#10B981] bg-[rgba(16,185,129,0.12)]' :
                          row.ownerStatus === 'Dormant' ? 'text-[#F97316] bg-[rgba(249,115,22,0.12)]' :
                          'text-[#EF4444] bg-[rgba(239,68,68,0.12)]'
                        }`}>
                          {row.ownerStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.confidence != null ? (
                          <span className="text-sm font-mono font-bold" style={{ color: CONFIDENCE_COLORS(row.confidence) }}>
                            {(row.confidence * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-[#B0B8C4]">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${rowKey}-detail`} className="bg-[#0B0F19] border-b border-[#2A3441]">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Container */}
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-[#B0B8C4] mb-3 flex items-center gap-1.5"><Package size={11} /> Container</div>
                              <div className="font-mono font-bold text-[#3B82F6] text-sm mb-2">{row.containerLabel}</div>
                              {row.containerDetails.size && (
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between"><span className="text-[#B0B8C4]">Size</span><span className="font-mono text-[#F8FAFC]">{row.containerDetails.size}</span></div>
                                  <div className="flex justify-between"><span className="text-[#B0B8C4]">Dwell Time</span>
                                    <span className={`font-mono font-bold ${row.containerDetails.dwell_days > 180 ? 'text-[#EF4444]' : row.containerDetails.dwell_days > 90 ? 'text-[#F97316]' : 'text-[#10B981]'}`}>
                                      {row.containerDetails.dwell_days}d
                                    </span>
                                  </div>
                                  <div className="flex justify-between"><span className="text-[#B0B8C4]">Risk Status</span>
                                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-lg ${row.containerDetails.dwell_days > 180 ? 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]' : row.containerDetails.dwell_days > 90 ? 'text-[#F97316] bg-[rgba(249,115,22,0.12)]' : 'text-[#10B981] bg-[rgba(16,185,129,0.12)]'}`}>
                                      {row.containerDetails.dwell_days > 180 ? 'Ghost Risk' : row.containerDetails.dwell_days > 90 ? 'Overdue' : 'Active'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Registry */}
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-[#B0B8C4] mb-3 flex items-center gap-1.5"><Buildings size={11} /> Registry Chain</div>
                              <div className="font-bold text-[#F8FAFC] text-sm mb-2">{row.registryLabel}</div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between"><span className="text-[#B0B8C4]">Type</span><span className="text-[#F8FAFC]">{row.registryType}</span></div>
                                <div className="flex justify-between"><span className="text-[#B0B8C4]">Container Rel.</span><span className="font-mono text-[#F8FAFC]">{row.containerToRegistryRel}</span></div>
                                <div className="flex justify-between"><span className="text-[#B0B8C4]">Owner Rel.</span><span className="font-mono text-[#F8FAFC]">{row.registryToOwnerRel}</span></div>
                              </div>
                            </div>

                            {/* Owner */}
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-[#B0B8C4] mb-3 flex items-center gap-1.5"><User size={11} /> Owner Details</div>
                              <div className={`font-bold text-sm mb-2 ${row.ownerLabel === 'Unknown' || row.ownerLabel === 'Unknown Entity' ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{row.ownerLabel}</div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between"><span className="text-[#B0B8C4]">Country</span><span className="text-[#F8FAFC]">{COUNTRY_FLAGS[row.ownerCountry] || ''} {row.ownerCountry}</span></div>
                                <div className="flex justify-between"><span className="text-[#B0B8C4]">Contact</span><span className="font-mono text-[#F8FAFC] text-[10px]">{row.ownerContact}</span></div>
                                <div className="flex justify-between"><span className="text-[#B0B8C4]">Status</span>
                                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-lg ${row.ownerStatus === 'Active' ? 'text-[#10B981] bg-[rgba(16,185,129,0.12)]' : row.ownerStatus === 'Dormant' ? 'text-[#F97316] bg-[rgba(249,115,22,0.12)]' : 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]'}`}>
                                    {row.ownerStatus}
                                  </span>
                                </div>
                                {row.confidence != null && (
                                  <div className="flex justify-between items-center pt-1">
                                    <span className="text-[#B0B8C4]">Confidence</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-1.5 bg-[#1a2030] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${row.confidence * 100}%`, background: row.confidence > 0.7 ? '#10B981' : row.confidence > 0.4 ? '#F97316' : '#EF4444' }} />
                                      </div>
                                      <span className="text-sm font-mono font-bold" style={{ color: row.confidence > 0.7 ? '#10B981' : row.confidence > 0.4 ? '#F97316' : '#EF4444' }}>
                                        {(row.confidence * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#2A3441]">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/tracking?container=${row.containerLabel}`); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#3B82F6] border border-[#3B82F6]/40 rounded-lg hover:bg-[#3B82F6]/10 transition-colors"
                            >
                              <ArrowSquareOut size={11} /> View in Tracking
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const blob = new Blob([JSON.stringify({ container: row.containerLabel, registry: row.registryLabel, owner: row.ownerLabel, country: row.ownerCountry, contact: row.ownerContact, confidence: row.confidence, relationship: row.registryToOwnerRel }, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = `ownership_${row.containerLabel}.json`; a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#B0B8C4] border border-[#2A3441] rounded-lg hover:text-white hover:border-[#B0B8C4] transition-colors"
                            >
                              <Download size={11} /> Export Chain
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#B0B8C4]">No ownership traces found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
