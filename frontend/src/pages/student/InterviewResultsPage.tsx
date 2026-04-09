import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { evaluationService, type ScorecardResponse } from '../../services/evaluationService';
import { ClipboardCheck, Loader2, Star, AlertTriangle, ArrowLeft } from 'lucide-react';
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

export function InterviewResultsPage() {
  const { id } = useParams<{ id: string }>();
  const interviewId = parseInt(id ?? '0');
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    evaluationService.getScorecard(interviewId).then((data) => {
      setScorecard(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [interviewId]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError('');
    try {
      await evaluationService.evaluate(interviewId);
      const data = await evaluationService.getScorecard(interviewId);
      setScorecard(data);
    } catch {
      setError('Evaluation failed. Make sure OpenAI API key is configured.');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </PageWrapper>
    );
  }

  const hasEvaluations = scorecard && scorecard.evaluations.length > 0;

  return (
    <PageWrapper className="p-0">
      <Link to="/student/interviews" className="flex items-center gap-1 text-purple-600 text-sm mb-4 hover:underline">
        <ArrowLeft size={14} /> Back to Interviews
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <ClipboardCheck className="text-yellow-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Results</h1>
          <p className="text-gray-500 text-sm capitalize">
            {scorecard?.interview_type} &middot; {scorecard?.difficulty}
          </p>
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
          <GlassCard className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="text-center">
              <p className="text-sm text-purple-600 font-medium mb-1">Overall Score</p>
              <p className="text-5xl font-bold text-gray-900">{scorecard.total_score?.toFixed(1) ?? '—'}</p>
              <p className="text-gray-500 text-sm mt-1">out of 10</p>
            </div>
          </GlassCard>

          {/* Dimension Scores */}
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Score Breakdown</h2>
            <div className="space-y-4">
              <ScoreBar label="Communication" score={scorecard.avg_communication} color="bg-blue-500" />
              <ScoreBar label="Technical Accuracy" score={scorecard.avg_technical} color="bg-purple-500" />
              <ScoreBar label="Confidence" score={scorecard.avg_confidence} color="bg-green-500" />
              <ScoreBar label="Answer Structure" score={scorecard.avg_structure} color="bg-orange-500" />
            </div>
          </GlassCard>

          {/* Per-answer feedback */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Detailed Feedback</h2>
            {scorecard.evaluations.map((ev, i) => (
              <GlassCard key={ev.id} className="bg-white border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-purple-600">Answer {i + 1}</span>
                  <span className="text-sm font-bold">{ev.overall_score.toFixed(1)}/10</span>
                </div>
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
                {ev.risk_flags.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle size={12} /> {ev.risk_flags.join(', ')}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
