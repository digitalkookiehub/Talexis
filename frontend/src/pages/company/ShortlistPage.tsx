import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { talentService } from '../../services/talentService';
import type { CompanyShortlist, ShortlistStatus } from '../../types';
import { Heart, Loader2, ChevronRight, Trash2, MessageSquare, Search, Pencil, Check, X, GitCompare, Download } from 'lucide-react';
import { downloadCsv } from '../../utils/csvExport';
import { talentService as ts, type TalentDetail } from '../../services/talentService';
import { motion } from 'framer-motion';
import api from '../../services/api';

const statusOptions: ShortlistStatus[] = ['shortlisted', 'contacted', 'rejected', 'hired'];
const statusColors: Record<string, string> = {
  shortlisted: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-green-100 text-green-700',
};

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

interface TalentMini { id: number; candidate_code: string }

export function ShortlistPage() {
  const [items, setItems] = useState<CompanyShortlist[]>([]);
  const [talentMap, setTalentMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [compareData, setCompareData] = useState<TalentDetail[]>([]);
  const [comparing, setComparing] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    Promise.all([
      talentService.getShortlist(),
      api.get<{ talents: TalentMini[] }>('/talents?skip=0&limit=100').then((r) => r.data).catch(() => ({ talents: [] })),
    ]).then(([sl, talents]) => {
      setItems(sl);
      const map: Record<number, string> = {};
      for (const t of talents.talents) map[t.id] = t.candidate_code;
      setTalentMap(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => {
        const code = talentMap[i.talent_profile_id] ?? '';
        return code.toLowerCase().includes(q) || (i.notes ?? '').toLowerCase().includes(q);
      });
    }
    return result;
  }, [items, statusFilter, search, talentMap]);

  const handleStatusChange = async (id: number, status: ShortlistStatus) => {
    try {
      const updated = await talentService.updateShortlistStatus(id, status);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch { /* error */ }
  };

  const handleRemove = async (id: number, talentId: number) => {
    const code = talentMap[talentId];
    if (!code) return;
    try {
      await talentService.removeFromShortlist(code);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* error */ }
  };

  const startEditNote = (item: CompanyShortlist) => {
    setEditingNoteId(item.id);
    setNoteText(item.notes ?? '');
  };

  const saveNote = async () => {
    if (editingNoteId === null) return;
    try {
      const updated = await talentService.updateShortlistNotes(editingNoteId, noteText);
      setItems((prev) => prev.map((i) => (i.id === editingNoteId ? updated : i)));
    } catch { /* error */ }
    setEditingNoteId(null);
    setNoteText('');
  };

  const toggleCompare = (talentId: number) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(talentId)) next.delete(talentId);
      else if (next.size < 3) next.add(talentId);
      return next;
    });
  };

  const runCompare = async () => {
    setComparing(true);
    try {
      const codes = Array.from(compareIds).map((id) => talentMap[id]).filter((c): c is string => !!c);
      const details = await Promise.all(codes.map((code) => ts.getDetail(code)));
      setCompareData(details);
      setShowCompare(true);
    } catch { /* error */ } finally { setComparing(false); }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  const counts = {
    shortlisted: items.filter((i) => i.status === 'shortlisted').length,
    contacted: items.filter((i) => i.status === 'contacted').length,
    hired: items.filter((i) => i.status === 'hired').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  };

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg"><Heart className="text-pink-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shortlist</h1>
          <p className="text-gray-500 text-sm">
            {counts.shortlisted} shortlisted &middot; {counts.contacted} contacted &middot; {counts.hired} hired
          </p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => {
              const rows = items.map((item) => [
                talentMap[item.talent_profile_id] ?? `ID-${item.talent_profile_id}`,
                item.status,
                item.shortlisted_at ? new Date(item.shortlisted_at).toLocaleDateString() : '',
                item.notes ?? '',
              ]);
              downloadCsv('shortlist.csv', ['Candidate Code', 'Status', 'Shortlisted Date', 'Notes'], rows);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Search + Status filter */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or notes..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.value !== 'all' && ` (${counts[f.value as keyof typeof counts] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Compare bar */}
      {compareIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-indigo-50 rounded-xl px-4 py-2.5 border border-indigo-200">
          <GitCompare size={16} className="text-indigo-600" />
          <span className="text-sm text-indigo-700">{compareIds.size} selected</span>
          <button
            onClick={() => void runCompare()}
            disabled={compareIds.size < 2 || comparing}
            className="ml-auto px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg disabled:opacity-40"
          >
            {comparing ? 'Loading...' : `Compare ${compareIds.size}`}
          </button>
          <button onClick={() => { setCompareIds(new Set()); setShowCompare(false); setCompareData([]); }} className="text-indigo-400 hover:text-indigo-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Comparison Panel */}
      {showCompare && compareData.length >= 2 && (
        <GlassCard className="bg-white border-indigo-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GitCompare size={18} className="text-indigo-500" /> Candidate Comparison
            </h2>
            <button onClick={() => setShowCompare(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Metric</th>
                  {compareData.map((c) => (
                    <th key={c.candidate_code} className="text-center py-2 px-3 text-xs font-mono text-emerald-600">{c.candidate_code}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {['communication', 'technical', 'confidence', 'structure'].map((dim) => {
                  const scores = compareData.map((c) => (c.skill_scores[dim] as number) ?? 0);
                  const best = Math.max(...scores);
                  return (
                    <tr key={dim}>
                      <td className="py-2 px-3 text-gray-600 capitalize">{dim}</td>
                      {compareData.map((c) => {
                        const val = (c.skill_scores[dim] as number) ?? 0;
                        return (
                          <td key={c.candidate_code} className="text-center py-2 px-3">
                            <span className={`font-bold ${val === best && scores.filter((s) => s === best).length === 1 ? 'text-emerald-600' : 'text-gray-900'}`}>
                              {val.toFixed(1)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-700">Interviews</td>
                  {compareData.map((c) => (
                    <td key={c.candidate_code} className="text-center py-2 px-3 font-bold">{c.total_interviews}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-700">Readiness</td>
                  {compareData.map((c) => (
                    <td key={c.candidate_code} className="text-center py-2 px-3 font-bold">
                      {c.readiness ? `${c.readiness.overall_percent.toFixed(0)}%` : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-700">Recommendation</td>
                  {compareData.map((c) => (
                    <td key={c.candidate_code} className="text-center py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.recommendation === 'yes' ? 'bg-green-100 text-green-700' :
                        c.recommendation === 'maybe' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{c.recommendation?.toUpperCase() ?? '—'}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-gray-700">College</td>
                  {compareData.map((c) => (
                    <td key={c.candidate_code} className="text-center py-2 px-3 text-xs text-gray-600">{c.profile.college_name ?? '—'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {items.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Heart className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">No candidates shortlisted yet. Browse the talent pool to find candidates.</p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-8">
          <p className="text-gray-400 text-sm">No candidates match your filter.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => {
            const code = talentMap[item.talent_profile_id] ?? `ID-${item.talent_profile_id}`;
            const isEditingNote = editingNoteId === item.id;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard className={`bg-white border-gray-100 ${compareIds.has(item.talent_profile_id) ? 'ring-2 ring-indigo-300' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={compareIds.has(item.talent_profile_id)}
                        onChange={() => toggleCompare(item.talent_profile_id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        title="Select for comparison"
                      />
                      <Link to={`/company/talents/${code}`} className="font-medium text-gray-900 font-mono text-sm hover:text-emerald-600">
                        {code}
                      </Link>
                      <span className="text-xs text-gray-400">
                        {item.shortlisted_at ? new Date(item.shortlisted_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(e) => void handleStatusChange(item.id, e.target.value as ShortlistStatus)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer ${statusColors[item.status] ?? ''}`}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s} className="bg-white text-gray-900">{s}</option>
                        ))}
                      </select>
                      <Link to={`/company/talents/${code}`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="View profile">
                        <ChevronRight size={16} />
                      </Link>
                      <button onClick={() => void handleRemove(item.id, item.talent_profile_id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Notes section */}
                  {isEditingNote ? (
                    <div className="flex items-center gap-2 mt-2">
                      <MessageSquare size={12} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-emerald-500 outline-none"
                        placeholder="Add a note about this candidate..."
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') void saveNote(); if (e.key === 'Escape') setEditingNoteId(null); }}
                      />
                      <button onClick={() => void saveNote()} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button>
                      <button onClick={() => setEditingNoteId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1 group cursor-pointer" onClick={() => startEditNote(item)}>
                      <MessageSquare size={12} className="text-gray-300" />
                      <p className="text-xs text-gray-400 flex-1">
                        {item.notes || 'Click to add notes...'}
                      </p>
                      <Pencil size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
