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

  useEffect(() => {
    interviewService.get(interviewId).then((data) => {
      setInterview(data);
      setLoading(false);
      if (data.status === 'in_progress') {
        void generateNext();
      }
    }).catch(() => setLoading(false));
  }, [interviewId]);

  const generateNext = async () => {
    setGenerating(true);
    setSubmitted(false);
    setAnswer('');
    try {
      const q = await interviewService.generateQuestion(interviewId);
      setCurrentQuestion(q);
      setQuestionCount((c) => c + 1);
    } catch {
      // Fallback
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
      // Error handling
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await interviewService.complete(interviewId);
      navigate(`/student/interviews/${interviewId}/results`);
    } catch {
      setCompleting(false);
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

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            {interview.interview_type} Interview
          </h1>
          <p className="text-gray-500 text-sm capitalize">
            Difficulty: {interview.difficulty_level} &middot; Question {questionCount}
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
          animate={{ width: `${Math.min(questionCount * 20, 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {generating ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Loader2 className="animate-spin text-purple-500 mx-auto mb-3" size={32} />
          <p className="text-gray-600">AI is generating your next question...</p>
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
              ) : (
                <>
                  <GradientButton onClick={() => void generateNext()}>
                    <span className="flex items-center gap-2"><ArrowRight size={16} /> Next Question</span>
                  </GradientButton>
                  {questionCount >= 3 && (
                    <GradientButton variant="secondary" onClick={() => void handleComplete()} disabled={completing}>
                      {completing ? (
                        <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Finishing...</span>
                      ) : (
                        <span className="flex items-center gap-2"><CheckCircle size={16} /> Finish Interview</span>
                      )}
                    </GradientButton>
                  )}
                </>
              )}
            </div>

            {submitted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} /> Answer submitted! Continue to the next question or finish.
              </motion.div>
            )}
          </GlassCard>
        </div>
      ) : null}
    </PageWrapper>
  );
}
