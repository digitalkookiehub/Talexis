import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { interviewService } from '../../services/interviewService';
import type { Interview, InterviewQuestion } from '../../types';
import { Brain, Send, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function LiveInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = parseInt(id ?? '0');

  const [interview, setInterview] = useState<Interview | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const data = await interviewService.get(interviewId);
        setInterview(data);

        if (data.status !== 'in_progress') {
          // Already completed/evaluated — go to results
          navigate(`/student/interviews/${interviewId}/results`);
          return;
        }

        // Load existing questions to resume properly
        const existing = await interviewService.getQuestions(interviewId);
        if (existing.length > 0) {
          setQuestionCount(existing.length);
          setCurrentQuestion(existing[existing.length - 1] ?? null);
          // Assume the last question is unanswered when resuming
        } else {
          // Fresh interview — generate first question
          await generateFirstQuestion();
        }
      } catch {
        setError('Could not load interview');
      } finally {
        setLoading(false);
      }
    };
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  const generateFirstQuestion = async () => {
    setGenerating(true);
    try {
      const q = await interviewService.generateQuestion(interviewId);
      setCurrentQuestion(q);
      setQuestionCount(1);
    } catch {
      setError('Failed to generate question. Make sure Ollama is running.');
    } finally {
      setGenerating(false);
    }
  };

  const generateNext = async () => {
    setGenerating(true);
    setSubmitted(false);
    setAnswer('');
    try {
      const q = await interviewService.generateQuestion(interviewId);
      setCurrentQuestion(q);
      setQuestionCount((c) => c + 1);
    } catch {
      setError('Failed to generate next question.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !answer.trim()) return;
    setSubmitting(true);
    try {
      await interviewService.submitAnswer(interviewId, currentQuestion.id, answer.trim());
      setSubmitted(true);
    } catch {
      setError('Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await interviewService.complete(interviewId);
      // Auto-eval runs on the backend; results page will fetch them
      navigate(`/student/interviews/${interviewId}/results`);
    } catch {
      setCompleting(false);
      setError('Failed to complete interview.');
    }
  };

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </PageWrapper>
    );
  }

  if (!interview) {
    return <PageWrapper><p className="text-red-500">Interview not found.</p></PageWrapper>;
  }

  const target = interview.target_questions || 5;
  const isLastQuestion = submitted && questionCount >= target;
  const progressPct = Math.min((questionCount / target) * 100, 100);

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            {interview.interview_type} Interview
          </h1>
          <p className="text-gray-500 text-sm capitalize">
            Difficulty: {interview.difficulty_level} &middot; Question {questionCount} of {target}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Brain size={16} className="text-purple-500" />
          AI-Powered
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <motion.div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {error && (
        <GlassCard className="bg-red-50 border-red-200 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </GlassCard>
      )}

      {generating ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Loader2 className="animate-spin text-purple-500 mx-auto mb-3" size={32} />
          <p className="text-gray-600">AI is generating your next question...</p>
          <p className="text-xs text-gray-400 mt-1">This may take 10-30 seconds with the local model</p>
        </GlassCard>
      ) : currentQuestion ? (
        <div className="space-y-4">
          <GlassCard className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <p className="text-sm text-purple-600 font-medium mb-2">Question {questionCount}</p>
            <p className="text-lg text-gray-900 font-medium">{currentQuestion.question_text}</p>
          </GlassCard>

          <GlassCard className="bg-white border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none transition-colors min-h-[150px]"
              placeholder="Type your answer here... Be detailed and structured."
              disabled={submitted}
            />

            <div className="flex gap-3 mt-4">
              {!submitted ? (
                <GradientButton onClick={() => void handleSubmitAnswer()} disabled={submitting || !answer.trim()}>
                  {submitting ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Send size={16} /> Submit Answer</span>
                  )}
                </GradientButton>
              ) : isLastQuestion ? (
                <GradientButton variant="secondary" onClick={() => void handleComplete()} disabled={completing}>
                  {completing ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Evaluating with AI...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle size={16} /> Finish & See Results</span>
                  )}
                </GradientButton>
              ) : (
                <>
                  <GradientButton onClick={() => void generateNext()}>
                    <span className="flex items-center gap-2"><ArrowRight size={16} /> Next Question ({questionCount + 1} of {target})</span>
                  </GradientButton>
                  <GradientButton variant="outline" onClick={() => void handleComplete()} disabled={completing}>
                    Finish Early
                  </GradientButton>
                </>
              )}
            </div>

            {submitted && !isLastQuestion && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} /> Answer submitted! Continue to the next question.
              </motion.div>
            )}
            {submitted && isLastQuestion && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-purple-600 text-sm">
                <CheckCircle size={16} /> All {target} questions answered! Click finish to evaluate.
              </motion.div>
            )}
          </GlassCard>
        </div>
      ) : null}
    </PageWrapper>
  );
}
