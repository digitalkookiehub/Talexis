import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { interviewService } from '../../services/interviewService';
import type { Interview, InterviewQuestion } from '../../types';
import { Brain, Send, CheckCircle, Loader2, ArrowRight, Mic, Square, Clock, Target, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnsweredQA {
  questionNum: number;
  questionText: string;
  answerText: string;
  topics: string[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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

  // Answer history
  const [answeredHistory, setAnsweredHistory] = useState<AnsweredQA[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Timing state
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const startQuestionTimer = () => {
    const now = Date.now();
    setQuestionStartTime(now);
    setElapsedSeconds(0);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - now) / 1000));
    }, 1000);
  };

  const stopQuestionTimer = (): number => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!questionStartTime) return 0;
    return (Date.now() - questionStartTime) / 1000;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const data = await interviewService.get(interviewId);
        setInterview(data);

        if (data.status !== 'in_progress') {
          navigate(`/student/interviews/${interviewId}/results`);
          return;
        }

        const existing = await interviewService.getQuestions(interviewId);
        if (existing.length > 0) {
          setQuestionCount(existing.length);
          setCurrentQuestion(existing[existing.length - 1] ?? null);
          startQuestionTimer();
        } else {
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
      startQuestionTimer();
    } catch {
      setError('Failed to generate question. Make sure Ollama is running.');
    } finally {
      setGenerating(false);
    }
  };

  const generateNext = async () => {
    // Save current Q&A to history before moving on
    if (currentQuestion && answer.trim()) {
      setAnsweredHistory((prev) => [...prev, {
        questionNum: questionCount,
        questionText: currentQuestion.question_text,
        answerText: answer.trim(),
        topics: currentQuestion.expected_topics || [],
      }]);
    }

    setGenerating(true);
    setSubmitted(false);
    setAnswer('');
    try {
      const q = await interviewService.generateQuestion(interviewId);
      setCurrentQuestion(q);
      setQuestionCount((c) => c + 1);
      startQuestionTimer();
    } catch {
      setError('Failed to generate next question.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !answer.trim()) return;
    setSubmitting(true);
    const responseTime = stopQuestionTimer();
    try {
      await interviewService.submitAnswer(interviewId, currentQuestion.id, answer.trim(), responseTime);
      setSubmitted(true);
    } catch {
      setError('Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    // Save last Q&A to history
    if (currentQuestion && answer.trim() && submitted) {
      setAnsweredHistory((prev) => {
        if (prev.some((h) => h.questionNum === questionCount)) return prev;
        return [...prev, {
          questionNum: questionCount,
          questionText: currentQuestion.question_text,
          answerText: answer.trim(),
          topics: currentQuestion.expected_topics || [],
        }];
      });
    }
    setCompleting(true);
    try {
      await interviewService.complete(interviewId);
      navigate(`/student/interviews/${interviewId}/results`);
    } catch {
      setCompleting(false);
      setError('Failed to complete interview.');
    }
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        void processRecording();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permission.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) return;
    setTranscribing(true);
    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const result = await interviewService.transcribeAudio(interviewId, blob);
      setAnswer((prev) => (prev ? `${prev} ${result.text}` : result.text));
    } catch {
      setError('Transcription failed. Make sure Whisper is set up.');
    } finally {
      setTranscribing(false);
      audioChunksRef.current = [];
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (loading) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </PageWrapper>
    );
  }

  if (!interview) {
    return <PageWrapper><p className="text-red-500">Interview not found.</p></PageWrapper>;
  }

  const target = interview.target_questions || 5;
  const isLastQuestion = submitted && questionCount >= target;
  const progressPct = Math.min((questionCount / target) * 100, 100);
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            {interview.interview_type} Interview
          </h1>
          <p className="text-gray-500 text-sm capitalize">
            Difficulty: {interview.difficulty_level} &middot; Question {questionCount} of {target}
            {interview.target_role && (
              <span className="text-emerald-600"> &middot; {interview.target_role}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!submitted && questionStartTime && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock size={14} className="text-gray-500" />
              {formatTime(elapsedSeconds)}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Brain size={16} className="text-emerald-500" />
            AI-Powered
          </div>
        </div>
      </div>

      {(interview.target_role || interview.target_industry) && (
        <div className="flex items-center gap-2 mb-4 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
          <Target size={12} />
          {interview.target_role && <span>Role: <strong>{interview.target_role}</strong></span>}
          {interview.target_role && interview.target_industry && <span>&middot;</span>}
          {interview.target_industry && <span>Industry: <strong>{interview.target_industry}</strong></span>}
        </div>
      )}

      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <motion.div
          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full"
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

      {/* Previous answers panel */}
      {answeredHistory.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors w-full"
          >
            <MessageSquare size={14} className="text-emerald-500" />
            Previous Answers ({answeredHistory.length})
            {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {answeredHistory.map((qa) => (
                    <div key={qa.questionNum} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Q{qa.questionNum}</span>
                        {qa.topics.map((t) => (
                          <span key={t} className="text-[10px] text-gray-400 capitalize">{t}</span>
                        ))}
                      </div>
                      <p className="text-xs font-medium text-gray-800 mb-1">{qa.questionText}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{qa.answerText}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {generating ? (
        <GlassCard className="bg-white border-gray-100 text-center py-12">
          <Loader2 className="animate-spin text-emerald-500 mx-auto mb-3" size={32} />
          <p className="text-gray-600">AI is generating your next question...</p>
          <p className="text-xs text-gray-400 mt-1">This may take 10-30 seconds with the local model</p>
        </GlassCard>
      ) : currentQuestion ? (
        <div className="space-y-4">
          <GlassCard className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-emerald-600 font-medium">Question {questionCount}</p>
              {currentQuestion.expected_topics.length > 0 && (
                <div className="flex gap-1.5">
                  {currentQuestion.expected_topics.map((topic) => (
                    <span key={topic} className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full capitalize">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-lg text-gray-900 font-medium">{currentQuestion.question_text}</p>
          </GlassCard>

          <GlassCard className="bg-white border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Your Answer</label>
              <div className="flex items-center gap-3">
                {!submitted && (
                  <span className="text-xs text-gray-400">{wordCount} words</span>
                )}
                {!submitted && (
                  <div className="flex items-center gap-2">
                    {transcribing && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Loader2 className="animate-spin" size={12} /> Transcribing...
                      </span>
                    )}
                    {recording ? (
                      <motion.button
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full text-xs font-medium hover:bg-red-600"
                      >
                        <Square size={12} fill="currentColor" />
                        Stop ({recordingDuration}s)
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => void startRecording()}
                        disabled={transcribing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium hover:bg-emerald-200 disabled:opacity-50"
                        title="Record voice answer"
                      >
                        <Mic size={12} />
                        Voice
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none transition-colors min-h-[150px]"
              placeholder="Type your answer here, or click the Voice button to dictate..."
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-emerald-600 text-sm">
                <CheckCircle size={16} /> All {target} questions answered! Click finish to evaluate.
              </motion.div>
            )}
          </GlassCard>
        </div>
      ) : null}
    </PageWrapper>
  );
}
