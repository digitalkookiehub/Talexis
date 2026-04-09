import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { ClipboardCheck, Brain, TrendingUp, Award, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface InterviewScorecard {
  interview_id: number;
  type: string;
  difficulty: string;
  total_score: number | null;
  questions_count: number;
  date: string;
  communication: number;
  technical: number;
  confidence: number;
  structure: number;
}

interface Totals {
  total_interviews: number;
  total_questions: number;
  avg_score: number;
  avg_communication: number;
  avg_technical: number;
  avg_confidence: number;
  avg_structure: number;
  best_type: string | null;
  worst_type: string | null;
}

interface AggregateResponse {
  interviews: InterviewScorecard[];
  totals: Totals | null;
}

function ScoreBar({ label, score, color, delay }: { label: string; score: number; color: string; delay: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold">{score.toFixed(1)}/10</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <motion.div
          className={`h-3 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 0.8, delay }}
        />
      </div>
    </div>
  );
}

const typeIcons: Record<string, string> = {
  hr: 'bg-blue-100 text-blue-600',
  technical: 'bg-purple-100 text-purple-600',
  behavioral: 'bg-green-100 text-green-600',
  sales: 'bg-orange-100 text-orange-600',
};

export function ScorecardPage() {
  const [data, setData] = useState<AggregateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AggregateResponse>('/evaluations/aggregate/scorecard')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  const totals = data?.totals;
  const interviews = data?.interviews ?? [];

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-100 rounded-lg"><ClipboardCheck className="text-yellow-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overall Scorecard</h1>
          <p className="text-gray-500 text-sm">Aggregate performance across all interviews</p>
        </div>
      </div>

      {!totals || interviews.length === 0 ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Award className="text-gray-300 mx-auto mb-3" size={48} />
          <p className="text-gray-500 mb-2">No evaluated interviews yet.</p>
          <p className="text-gray-400 text-sm">Complete interviews and evaluate them to see your aggregate scorecard.</p>
          <Link to="/student/interviews" className="text-purple-600 text-sm hover:underline mt-3 inline-block">
            Start an Interview
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {/* Overall stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 text-center">
              <p className="text-4xl font-bold text-gray-900">{totals.avg_score.toFixed(1)}</p>
              <p className="text-xs text-purple-600 font-medium mt-1">Average Score</p>
            </GlassCard>
            <GlassCard className="bg-white border-gray-100 text-center">
              <p className="text-3xl font-bold text-gray-900">{totals.total_interviews}</p>
              <p className="text-xs text-gray-500 mt-1">Interviews</p>
            </GlassCard>
            <GlassCard className="bg-white border-gray-100 text-center">
              <p className="text-3xl font-bold text-gray-900">{totals.total_questions}</p>
              <p className="text-xs text-gray-500 mt-1">Questions Answered</p>
            </GlassCard>
            <GlassCard className="bg-white border-gray-100 text-center">
              <p className="text-lg font-bold text-green-600 capitalize">{totals.best_type ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Strongest Type</p>
            </GlassCard>
          </div>

          {/* Dimension breakdown */}
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Skill Dimensions (Aggregate)</h2>
            <div className="space-y-4">
              <ScoreBar label="Communication" score={totals.avg_communication} color="bg-blue-500" delay={0} />
              <ScoreBar label="Technical Accuracy" score={totals.avg_technical} color="bg-purple-500" delay={0.1} />
              <ScoreBar label="Confidence" score={totals.avg_confidence} color="bg-green-500" delay={0.2} />
              <ScoreBar label="Answer Structure" score={totals.avg_structure} color="bg-orange-500" delay={0.3} />
            </div>
          </GlassCard>

          {/* Per-interview breakdown */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Interview Breakdown</h2>
            <div className="space-y-3">
              {interviews.map((interview, i) => (
                <motion.div key={interview.interview_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/student/interviews/${interview.interview_id}/results`}>
                    <GlassCard className="bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeIcons[interview.type] ?? 'bg-gray-100'}`}>
                            <Brain size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{interview.type} Interview</p>
                            <p className="text-xs text-gray-500">
                              {interview.difficulty} &middot; {interview.questions_count} questions &middot; {new Date(interview.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden md:flex gap-3 text-xs text-gray-500">
                            <span>C: {interview.communication.toFixed(1)}</span>
                            <span>T: {interview.technical.toFixed(1)}</span>
                            <span>Cf: {interview.confidence.toFixed(1)}</span>
                            <span>S: {interview.structure.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-900">{(interview.total_score ?? 0).toFixed(1)}</span>
                            <ChevronRight size={16} className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Score trend */}
          {interviews.length > 1 && (
            <GlassCard className="bg-white border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-500" /> Score Trend
              </h2>
              <div className="flex items-end gap-2 h-28">
                {[...interviews].reverse().map((interview, i) => (
                  <motion.div
                    key={interview.interview_id}
                    className="flex-1 flex flex-col items-center gap-1"
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-xs font-medium text-gray-600">{(interview.total_score ?? 0).toFixed(1)}</span>
                    <div
                      className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t min-h-[4px]"
                      style={{ height: `${((interview.total_score ?? 0) / 10) * 80}px` }}
                    />
                    <span className="text-[10px] text-gray-400 capitalize">{interview.type.slice(0, 4)}</span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
