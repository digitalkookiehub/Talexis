import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { interviewService } from '../../services/interviewService';
import type { Interview, InterviewType } from '../../types';
import { Clock, Brain, ChevronRight, Loader2, Trash2, PlayCircle, Target, Timer, ArrowUpDown } from 'lucide-react';
import { motion } from 'framer-motion';

const statusBadge: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-600' },
  completed: { label: 'Awaiting Eval', color: 'bg-yellow-100 text-yellow-700' },
  evaluated: { label: 'Completed', color: 'bg-green-100 text-green-700' },
};

const typeLabels: { value: InterviewType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'hr', label: 'HR' },
  { value: 'technical', label: 'Domain Skills' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'sales', label: 'Sales' },
];

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Awaiting Eval' },
  { value: 'evaluated', label: 'Completed' },
];

type SortKey = 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function InterviewHistoryPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [abandoning, setAbandoning] = useState<number | null>(null);

  const [typeFilter, setTypeFilter] = useState<InterviewType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('date_desc');

  useEffect(() => {
    setLoading(true);
    interviewService.history(0, 100).then((data) => {
      setInterviews(data.interviews);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = interviews;
    if (typeFilter !== 'all') {
      result = result.filter((i) => i.interview_type === typeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter);
    }
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'score_desc':
          return (b.total_score ?? -1) - (a.total_score ?? -1);
        case 'score_asc':
          return (a.total_score ?? -1) - (b.total_score ?? -1);
        default: // date_desc
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return result;
  }, [interviews, typeFilter, statusFilter, sort]);

  const handleAbandon = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Discard this in-progress interview? This cannot be undone.')) return;
    setAbandoning(id);
    try {
      await interviewService.abandon(id);
      setInterviews((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // error
    } finally {
      setAbandoning(null);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </PageWrapper>
    );
  }

  const evaluated = interviews.filter((i) => i.status === 'evaluated');
  const inProgress = interviews.filter((i) => i.status === 'in_progress');
  const completed = interviews.filter((i) => i.status === 'completed');

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Clock className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview History</h1>
          <p className="text-gray-500 text-sm">
            {evaluated.length} completed &middot; {completed.length} awaiting eval &middot; {inProgress.length} in progress
          </p>
        </div>
      </div>

      {interviews.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Brain className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500">No interviews yet. Start your first mock interview!</p>
          <Link to="/student/interviews" className="text-emerald-600 text-sm hover:underline mt-2 inline-block">
            Start Interview
          </Link>
        </GlassCard>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="flex gap-1.5">
              {typeLabels.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTypeFilter(t.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    typeFilter === t.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />
            <div className="flex gap-1.5">
              {statusFilters.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <ArrowUpDown size={12} className="text-gray-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none"
              >
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="score_desc">Highest score</option>
                <option value="score_asc">Lowest score</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3">{filtered.length} interview{filtered.length !== 1 ? 's' : ''}</p>

          <div className="space-y-3">
            {filtered.map((interview, i) => {
              const badge = statusBadge[interview.status] ?? { label: interview.status, color: 'bg-gray-100' };
              const isInProgress = interview.status === 'in_progress';
              const linkTo = isInProgress
                ? `/student/interviews/${interview.id}`
                : `/student/interviews/${interview.id}/results`;
              const duration = formatDuration(interview.duration_seconds);
              const answered = interview.questions_answered ?? 0;

              return (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link to={linkTo}>
                    <GlassCard className="bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isInProgress ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                            {isInProgress ? <PlayCircle className="text-blue-600" size={20} /> : <Brain className="text-emerald-600" size={20} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 capitalize">
                                {interview.interview_type} Interview
                              </p>
                              {interview.target_role && (
                                <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full truncate max-w-[140px]">
                                  <Target size={8} />
                                  {interview.target_role}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 capitalize mt-0.5">
                              <span>{interview.difficulty_level}</span>
                              <span>&middot;</span>
                              <span>{answered}/{interview.target_questions} answered</span>
                              {duration && (
                                <>
                                  <span>&middot;</span>
                                  <span className="flex items-center gap-0.5"><Timer size={10} />{duration}</span>
                                </>
                              )}
                              {interview.created_at && (
                                <>
                                  <span>&middot;</span>
                                  <span>{new Date(interview.created_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                            {interview.overall_summary && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{interview.overall_summary}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          {interview.total_score != null ? (
                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900">{interview.total_score.toFixed(1)}</p>
                              <p className="text-[10px] text-gray-400">/ 10</p>
                            </div>
                          ) : null}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.color}`}>{badge.label}</span>
                          {isInProgress && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => void handleAbandon(e, interview.id)}
                              disabled={abandoning === interview.id}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Abandon this interview"
                            >
                              {abandoning === interview.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            </motion.button>
                          )}
                          <ChevronRight size={16} className="text-gray-400" />
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <GlassCard className="bg-white border-gray-100 text-center py-8">
              <p className="text-gray-400 text-sm">No interviews match your filters.</p>
            </GlassCard>
          )}
        </>
      )}
    </PageWrapper>
  );
}
