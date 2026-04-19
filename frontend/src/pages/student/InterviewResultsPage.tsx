import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { evaluationService, type ScorecardResponse, type DetailedFeedback } from '../../services/evaluationService';
import { ClipboardCheck, Loader2, Star, AlertTriangle, ArrowLeft, Target, Timer, MessageCircle, Lightbulb, Clock, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">{score.toFixed(1)}/10</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <motion.div
          className={`h-3 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function InterviewResultsPage() {
  const { id } = useParams<{ id: string }>();
  const interviewId = parseInt(id ?? '0');
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null);
  const [feedback, setFeedback] = useState<DetailedFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      evaluationService.getScorecard(interviewId),
      evaluationService.getDetailedFeedback(interviewId).catch(() => []),
    ]).then(([sc, fb]) => {
      setScorecard(sc);
      setFeedback(fb);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [interviewId]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError('');
    try {
      await evaluationService.evaluate(interviewId);
      const [data, fb] = await Promise.all([
        evaluationService.getScorecard(interviewId),
        evaluationService.getDetailedFeedback(interviewId).catch(() => []),
      ]);
      setScorecard(data);
      setFeedback(fb);
    } catch {
      setError('Evaluation failed. Make sure OpenAI API key is configured.');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </PageWrapper>
    );
  }

  const hasEvaluations = scorecard && scorecard.evaluations.length > 0;

  return (
    <PageWrapper className="p-0">
      <Link to="/student/interviews" className="flex items-center gap-1 text-emerald-600 text-sm mb-4 hover:underline">
        <ArrowLeft size={14} /> Back to Interviews
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <ClipboardCheck className="text-yellow-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Results</h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm capitalize">
            <span>{scorecard?.interview_type} &middot; {scorecard?.difficulty}</span>
            {scorecard?.target_role && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Target size={12} /> {scorecard.target_role}
              </span>
            )}
            {scorecard?.duration_seconds && (
              <span className="flex items-center gap-1 text-gray-400">
                <Timer size={12} /> {formatDuration(scorecard.duration_seconds)}
              </span>
            )}
            {scorecard?.questions_answered != null && (
              <span className="text-gray-400">
                &middot; {scorecard.questions_answered} answered
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasEvaluations ? (
        <GlassCard className="bg-white border-gray-100 text-center py-8">
          <Star className="text-gray-300 mx-auto mb-3" size={48} />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Not Yet Evaluated</h2>
          <p className="text-gray-500 text-sm mb-4">Click below to evaluate your answers with AI.</p>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <GradientButton onClick={() => void handleEvaluate()} disabled={evaluating}>
            {evaluating ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Evaluating with AI...</span>
            ) : (
              'Evaluate with AI'
            )}
          </GradientButton>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {/* Overall Score */}
          <GlassCard className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <div className="text-center">
              <p className="text-sm text-emerald-600 font-medium mb-1">Overall Score</p>
              <p className="text-5xl font-bold text-gray-900">{scorecard.total_score?.toFixed(1) ?? '—'}</p>
              <p className="text-gray-500 text-sm mt-1">out of 10</p>
            </div>
          </GlassCard>

          {/* Overall Summary & Feedback */}
          {(scorecard.overall_summary || scorecard.overall_feedback) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scorecard.overall_summary && (
                <GlassCard className="bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={16} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-800">Summary</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{scorecard.overall_summary}</p>
                </GlassCard>
              )}
              {scorecard.overall_feedback && (
                <GlassCard className="bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={16} className="text-amber-600" />
                    <h3 className="text-sm font-semibold text-amber-800">What to Work On</h3>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{scorecard.overall_feedback}</p>
                </GlassCard>
              )}
            </div>
          )}

          {/* Dimension Scores */}
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Score Breakdown</h2>
            <div className="space-y-4">
              <ScoreBar label="Communication" score={scorecard.avg_communication} color="bg-blue-500" />
              <ScoreBar label="Technical Accuracy" score={scorecard.avg_technical} color="bg-emerald-500" />
              <ScoreBar label="Confidence" score={scorecard.avg_confidence} color="bg-green-500" />
              <ScoreBar label="Answer Structure" score={scorecard.avg_structure} color="bg-orange-500" />
            </div>
          </GlassCard>

          {/* Per-answer detailed feedback */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Detailed Feedback</h2>
            {(feedback.length > 0 ? feedback : scorecard.evaluations.map((ev) => ({ evaluation: ev }))).map((item, i) => {
              const fb = item as DetailedFeedback;
              const ev = fb.evaluation;
              if (!ev) return null;
              return (
                <GlassCard key={ev.id} className="bg-white border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-600">Q{i + 1}</span>
                      {fb.question_topics?.map((t) => (
                        <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      {fb.response_time_seconds != null && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock size={10} /> {Math.round(fb.response_time_seconds)}s
                        </span>
                      )}
                      {fb.word_count != null && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <FileText size={10} /> {fb.word_count} words
                        </span>
                      )}
                      <span className="text-sm font-bold">{ev.overall_score.toFixed(1)}/10</span>
                    </div>
                  </div>

                  {/* Question */}
                  {fb.question_text && (
                    <div className="bg-emerald-50 rounded-lg p-2.5 mb-2">
                      <p className="text-xs font-medium text-emerald-700 mb-0.5">Question</p>
                      <p className="text-sm text-gray-800">{fb.question_text}</p>
                    </div>
                  )}

                  {/* Student answer */}
                  {fb.answer_text && (
                    <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Your Answer</p>
                      <p className="text-sm text-gray-700">{fb.answer_text}</p>
                    </div>
                  )}

                  {/* AI feedback */}
                  <p className="text-gray-700 text-sm mb-3">{ev.feedback_text}</p>
                  {ev.strengths.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-green-600">Strengths: </span>
                      <span className="text-xs text-gray-600">{ev.strengths.join(', ')}</span>
                    </div>
                  )}
                  {ev.weaknesses.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-red-500">To improve: </span>
                      <span className="text-xs text-gray-600">{ev.weaknesses.join(', ')}</span>
                    </div>
                  )}
                  {ev.improved_answer_suggestion && (
                    <details className="mt-2">
                      <summary className="text-xs text-emerald-600 cursor-pointer hover:underline">View suggested answer</summary>
                      <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded-lg">{ev.improved_answer_suggestion}</p>
                    </details>
                  )}
                  {ev.risk_flags.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                      <AlertTriangle size={12} /> {ev.risk_flags.join(', ')}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
