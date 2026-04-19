import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { talentService } from '../../services/talentService';
import type { TalentProfile } from '../../types';
import { Users, Heart, Loader2, ChevronRight, ArrowUpDown, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const recBadge: Record<string, { label: string; color: string }> = {
  YES: { label: 'Recommended', color: 'bg-green-100 text-green-700' },
  MAYBE: { label: 'Potential', color: 'bg-yellow-100 text-yellow-700' },
  NO: { label: 'Needs Growth', color: 'bg-gray-100 text-gray-600' },
};

const recFilters = [
  { value: 'all', label: 'All' },
  { value: 'YES', label: 'Recommended' },
  { value: 'MAYBE', label: 'Potential' },
  { value: 'NO', label: 'Needs Growth' },
];

const expFilters = [
  { value: 'all', label: 'All Experience' },
  { value: 'fresher', label: 'Fresher' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
];

type SortKey = 'score_desc' | 'score_asc' | 'code';

function avgScore(scores: Record<string, number>): number {
  const vals = Object.values(scores).filter((v) => typeof v === 'number');
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function TalentBrowsePage() {
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shortlisting, setShortlisting] = useState<string | null>(null);
  const [shortlistedCodes, setShortlistedCodes] = useState<Set<string>>(new Set());

  const [recFilter, setRecFilter] = useState('all');
  const [expFilter, setExpFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('score_desc');
  const [search, setSearch] = useState('');

  useEffect(() => {
    talentService.browse(0, 100).then((data) => {
      setTalents(data.talents);
      setTotal(data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = talents;
    if (recFilter !== 'all') {
      result = result.filter((t) => t.recommendation === recFilter);
    }
    if (expFilter !== 'all') {
      result = result.filter((t) => (t as unknown as { experience_level?: string }).experience_level === expFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.candidate_code.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'score_asc': return avgScore(a.skill_scores) - avgScore(b.skill_scores);
        case 'code': return a.candidate_code.localeCompare(b.candidate_code);
        default: return avgScore(b.skill_scores) - avgScore(a.skill_scores);
      }
    });
    return result;
  }, [talents, recFilter, sort, search]);

  const handleShortlist = async (code: string) => {
    setShortlisting(code);
    try {
      await talentService.shortlist(code);
      setShortlistedCodes((prev) => new Set([...prev, code]));
    } catch {
      setShortlistedCodes((prev) => new Set([...prev, code]));
    } finally {
      setShortlisting(null);
    }
  };

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg"><Users className="text-emerald-600" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Talent Pool</h1>
            <p className="text-gray-500 text-sm">{total} pre-qualified candidates</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate code..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {recFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setRecFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                recFilter === f.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {expFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setExpFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                expFilter === f.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <ArrowUpDown size={12} className="text-gray-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none"
          >
            <option value="score_desc">Highest score</option>
            <option value="score_asc">Lowest score</option>
            <option value="code">Code A-Z</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Users className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">
            {talents.length === 0
              ? 'No candidates available yet. Students need to complete interviews and grant consent.'
              : 'No candidates match your filters.'}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((talent, i) => {
            const avg = avgScore(talent.skill_scores);
            const isShortlisted = shortlistedCodes.has(talent.candidate_code);
            return (
              <motion.div key={talent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard className="bg-white border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-gray-400">{talent.candidate_code}</span>
                    {talent.recommendation && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${recBadge[talent.recommendation]?.color ?? ''}`}>
                        {recBadge[talent.recommendation]?.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
                    <span>{(talent as unknown as { college_name?: string }).college_name || 'Independent'}</span>
                    {(talent as unknown as { experience_level?: string }).experience_level && (
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full capitalize">
                        {(talent as unknown as { experience_level: string }).experience_level}
                      </span>
                    )}
                  </div>

                  {/* Overall avg */}
                  <div className="text-center mb-3">
                    <p className="text-2xl font-bold text-gray-900">{avg.toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400">avg score /10</p>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(talent.skill_scores).map(([key, val]) => (
                      <div key={key} className="text-center p-1.5 bg-gray-50 rounded-lg">
                        <p className="text-sm font-bold text-gray-900">{typeof val === 'number' ? val.toFixed(1) : '—'}</p>
                        <p className="text-[10px] text-gray-500 capitalize">{key}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/company/talents/${talent.candidate_code}`} className="flex-1">
                      <GradientButton variant="outline" size="sm" className="w-full">
                        <span className="flex items-center gap-1">View <ChevronRight size={14} /></span>
                      </GradientButton>
                    </Link>
                    <GradientButton
                      size="sm"
                      onClick={() => void handleShortlist(talent.candidate_code)}
                      disabled={shortlisting === talent.candidate_code || isShortlisted}
                    >
                      {shortlisting === talent.candidate_code ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Heart size={14} className={isShortlisted ? 'fill-current' : ''} />
                      )}
                    </GradientButton>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
