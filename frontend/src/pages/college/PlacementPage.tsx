import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { collegeService, type PlacementData } from '../../services/collegeService';
import { TrendingUp, Loader2, CheckCircle, AlertCircle, XCircle, Eye, FileText, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const recColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  yes: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: <CheckCircle size={16} className="text-green-500" /> },
  maybe: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', icon: <AlertCircle size={16} className="text-yellow-500" /> },
  no: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', icon: <XCircle size={16} className="text-red-500" /> },
};

export function PlacementPage() {
  const [data, setData] = useState<PlacementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    collegeService.getPlacements().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data.students;
    if (filter !== 'all') {
      if (filter === 'none') {
        result = result.filter((s) => !s.recommendation);
      } else {
        result = result.filter((s) => s.recommendation === filter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.branch ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, filter, search]);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (!data) {
    return <PageWrapper><p className="text-red-500">Failed to load placement data.</p></PageWrapper>;
  }

  const { summary } = data;

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="text-green-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement Tracking</h1>
          <p className="text-gray-500 text-sm">Per-student readiness and placement status</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Ready', value: summary.ready, color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle size={16} className="text-green-500" /> },
          { label: 'Almost There', value: summary.maybe, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: <AlertCircle size={16} className="text-yellow-500" /> },
          { label: 'Needs Work', value: summary.not_ready, color: 'text-red-600', bg: 'bg-red-50', icon: <XCircle size={16} className="text-red-500" /> },
          { label: 'No Data', value: summary.no_data, color: 'text-gray-500', bg: 'bg-gray-50', icon: <AlertCircle size={16} className="text-gray-400" /> },
        ].map((item) => (
          <GlassCard key={item.label} className={`${item.bg} border-gray-100 text-center py-3`}>
            <div className="flex items-center justify-center gap-1 mb-1">{item.icon}</div>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-gray-500">{item.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or branch..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { value: 'all', label: 'All' },
            { value: 'yes', label: 'Ready' },
            { value: 'maybe', label: 'Almost' },
            { value: 'no', label: 'Needs Work' },
            { value: 'none', label: 'No Data' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student cards */}
      <div className="space-y-2">
        {filtered.map((s, i) => {
          const rec = recColors[s.recommendation ?? ''];
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <GlassCard className={`border ${rec?.bg ?? 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="shrink-0">
                      {rec?.icon ?? <AlertCircle size={16} className="text-gray-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{s.name ?? 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span>{s.branch ?? '—'}</span>
                        {s.graduation_year && <span>({s.graduation_year})</span>}
                        <span>&middot;</span>
                        <span>{s.interviews_completed} interviews</span>
                      </div>
                      {/* Weak/strong areas */}
                      {(s.weak_areas.length > 0 || s.strong_areas.length > 0) && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.strong_areas.map((a) => (
                            <span key={a} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full capitalize">{a}</span>
                          ))}
                          {s.weak_areas.map((a) => (
                            <span key={a} className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full capitalize">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-3">
                    <div className="flex items-center gap-1.5">
                      {s.resume_uploaded && <span title="Resume"><FileText size={12} className="text-green-500" /></span>}
                      {s.visible_to_companies && <span title="Visible"><Eye size={12} className="text-emerald-500" /></span>}
                    </div>
                    {s.readiness_percent != null ? (
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{s.readiness_percent.toFixed(0)}%</p>
                        <p className="text-[10px] text-gray-400">readiness</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No data</span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <GlassCard className="bg-white border-gray-100 text-center py-8">
          <p className="text-gray-400 text-sm">No students match your filter.</p>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
