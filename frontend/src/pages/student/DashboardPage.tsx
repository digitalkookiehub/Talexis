import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import api from '../../services/api';
import { Brain, TrendingUp, ClipboardCheck, BookOpen, ArrowRight, User, FileText, CheckCircle, Circle, Sparkles, X, Shield, Calendar, Building2, Clock, Video } from 'lucide-react';
import { talentService } from '../../services/talentService';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Interview } from '../../types';

interface DashboardData {
  profile_complete: boolean;
  resume_uploaded: boolean;
  total_interviews: number;
  baseline_score: number | null;
}

interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  done: boolean;
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
  const [readinessPercent, setReadinessPercent] = useState<number>(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [visibilityReqs, setVisibilityReqs] = useState<Array<{ key: string; label: string; met: boolean; detail: string }>>([]);
  const [allReqsMet, setAllReqsMet] = useState(false);
  const [companySchedules, setCompanySchedules] = useState<Array<{
    id: number; company_name: string; scheduled_at: string; duration_minutes: number;
    interview_type: string | null; meeting_link: string | null; status: string; college_approval: string;
  }>>([]);

  useEffect(() => {
    studentService.getDashboard().then((d) => {
      setData(d);
      // Show welcome modal for brand new users (no profile, no resume, no interviews)
      if (!d.profile_complete && !d.resume_uploaded && d.total_interviews === 0) {
        const dismissed = localStorage.getItem('talexis_welcome_dismissed');
        if (!dismissed) setShowWelcome(true);
      }
    }).catch(() => {});
    api.get<{ interviews: Interview[]; total: number }>('/interviews/history?limit=5')
      .then((r) => setRecentInterviews(r.data.interviews))
      .catch(() => {});
    api.get('/readiness/me')
      .then((r) => setReadinessPercent((r.data as { overall_readiness_percent: number }).overall_readiness_percent))
      .catch(() => {});

    talentService.getReadinessRequirements().then((data) => {
      setVisibilityReqs(data.requirements);
      setAllReqsMet(data.all_met);
    }).catch(() => {});

    api.get<Array<{ id: number; company_name: string; scheduled_at: string; duration_minutes: number; interview_type: string | null; meeting_link: string | null; status: string; college_approval: string }>>('/interviews/company-schedules')
      .then((r) => setCompanySchedules(r.data.filter((s) => s.status === 'scheduled' || s.status === 'rescheduled')))
      .catch(() => {});

    // Check if onboarding was dismissed
    const onb = localStorage.getItem('talexis_onboarding_dismissed');
    if (onb) setDismissedOnboarding(true);
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('talexis_welcome_dismissed', '1');
  };

  const dismissOnboarding = () => {
    setDismissedOnboarding(true);
    localStorage.setItem('talexis_onboarding_dismissed', '1');
  };

  const totalInterviews = data?.total_interviews ?? 0;
  const evaluatedScores = recentInterviews.filter((i) => i.total_score !== null);
  const avgScore = evaluatedScores.length > 0
    ? evaluatedScores.reduce((sum, i) => sum + (i.total_score ?? 0), 0) / evaluatedScores.length
    : 0;

  // Onboarding steps
  const steps: OnboardingStep[] = [
    {
      key: 'profile',
      label: 'Complete your profile',
      description: 'Add your branch, college, skills, and interests',
      link: '/student/profile',
      icon: <User size={16} />,
      done: data?.profile_complete ?? false,
    },
    {
      key: 'resume',
      label: 'Upload your resume',
      description: 'Upload and parse your resume with AI for personalized questions',
      link: '/student/resume',
      icon: <FileText size={16} />,
      done: data?.resume_uploaded ?? false,
    },
    {
      key: 'interview',
      label: 'Take your first interview',
      description: 'Practice with an AI-powered mock interview',
      link: '/student/interviews',
      icon: <Brain size={16} />,
      done: totalInterviews > 0,
    },
    {
      key: 'readiness',
      label: 'Check your readiness',
      description: 'See your placement readiness score and recommendations',
      link: '/student/readiness',
      icon: <TrendingUp size={16} />,
      done: readinessPercent > 0,
    },
  ];

  const completedSteps = steps.filter((s) => s.done).length;
  const allDone = completedSteps === steps.length;
  const showOnboarding = !dismissedOnboarding && !allDone && data !== null;

  return (
    <PageWrapper className="p-0">
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={dismissWelcome}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Talexis!</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Your AI-powered interview training platform. Practice mock interviews, get instant feedback, and track your placement readiness.
                </p>

                <div className="text-left space-y-3 mb-6">
                  {[
                    { icon: <User size={14} />, text: 'Set up your profile and upload your resume' },
                    { icon: <Brain size={14} />, text: 'Take AI-powered mock interviews' },
                    { icon: <ClipboardCheck size={14} />, text: 'Get scored on communication, technical skills, confidence, and structure' },
                    { icon: <TrendingUp size={14} />, text: 'Track your readiness and improve over time' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                        {item.icon}
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>

                <GradientButton onClick={dismissWelcome} className="w-full">
                  Get Started
                </GradientButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{totalInterviews > 0 ? ' back' : ''}, {user?.full_name ?? 'Student'}
        </h1>
        <p className="text-gray-500 mt-1">
          {totalInterviews > 0
            ? "Here's your interview preparation overview"
            : 'Get started by completing the steps below'}
        </p>
      </div>

      {/* Upcoming Company Interviews */}
      {companySchedules.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <GlassCard className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" /> Upcoming Company Interviews
            </h2>
            <div className="space-y-2">
              {companySchedules.map((s) => {
                const isApproved = s.college_approval === 'approved' || s.college_approval === 'not_required';
                const isPending = s.college_approval === 'pending';
                return (
                  <div key={s.id} className={`bg-white rounded-xl p-3 border ${isPending ? 'border-amber-200' : 'border-indigo-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 size={14} className="text-emerald-600" />
                          <p className="text-sm font-semibold text-gray-900">{s.company_name}</p>
                          {s.interview_type && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] capitalize">{s.interview_type.replace('_', ' ')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(s.scheduled_at).toLocaleDateString()} at {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {s.duration_minutes} min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium">Awaiting college approval</span>
                        )}
                        {isApproved && s.meeting_link && (
                          <a href={s.meeting_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700">
                            <Video size={14} /> Join Interview
                          </a>
                        )}
                        {isApproved && !s.meeting_link && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">Confirmed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Onboarding Checklist */}
      {showOnboarding && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <GlassCard className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-500" /> Getting Started
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{completedSteps} of {steps.length} steps completed</p>
              </div>
              <button onClick={dismissOnboarding} className="text-gray-400 hover:text-gray-600 p-1" title="Dismiss">
                <X size={16} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-emerald-100 rounded-full h-2 mb-4">
              <motion.div
                className="h-2 rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${(completedSteps / steps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="space-y-2">
              {steps.map((step, i) => {
                const nextUndone = steps.findIndex((s) => !s.done);
                const isNext = i === nextUndone;
                return (
                  <Link key={step.key} to={step.link}>
                    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      step.done
                        ? 'bg-white/50 opacity-60'
                        : isNext
                          ? 'bg-white shadow-sm border border-emerald-200'
                          : 'bg-white/30 hover:bg-white/50'
                    }`}>
                      <div className={`shrink-0 ${step.done ? 'text-emerald-500' : isNext ? 'text-emerald-600' : 'text-gray-300'}`}>
                        {step.done ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${step.done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-400">{step.description}</p>
                      </div>
                      {isNext && !step.done && (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                          Next
                        </span>
                      )}
                      {step.done && (
                        <span className="text-[10px] text-emerald-600 shrink-0">Done</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Interview Readiness Requirements */}
      {visibilityReqs.length > 0 && !allReqsMet && (
        <GlassCard className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Path to Company Visibility</h2>
              <p className="text-[10px] text-gray-500">Complete these to let companies discover you</p>
            </div>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5 mb-3">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${(visibilityReqs.filter((r) => r.met).length / visibilityReqs.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibilityReqs.map((req) => (
              <div key={req.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${req.met ? 'bg-white/50' : 'bg-white border border-blue-100'}`}>
                {req.met ? (
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                ) : (
                  <Circle size={14} className="text-blue-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={req.met ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}>{req.label}</p>
                  <p className="text-[10px] text-gray-400">{req.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {allReqsMet && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link to="/student/profile">
            <GlassCard className="bg-emerald-50 border-emerald-200 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">You're interview ready!</p>
                  <p className="text-xs text-emerald-600">All requirements met. Go to Profile to enable company visibility.</p>
                </div>
                <ArrowRight size={16} className="text-emerald-500 ml-auto" />
              </div>
            </GlassCard>
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Interviews Taken', value: String(totalInterviews), icon: <Brain className="text-emerald-500" />, color: 'bg-emerald-50' },
          { label: 'Average Score', value: avgScore > 0 ? avgScore.toFixed(1) : '—', icon: <ClipboardCheck className="text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Readiness', value: readinessPercent > 0 ? `${readinessPercent.toFixed(0)}%` : '—', icon: <TrendingUp className="text-green-500" />, color: 'bg-green-50' },
          { label: 'Profile', value: data?.profile_complete ? 'Complete' : 'Incomplete', icon: <BookOpen className="text-orange-500" />, color: 'bg-orange-50' },
        ].map((stat) => (
          <GlassCard key={stat.label} className="bg-white border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/student/interviews">
              <GradientButton className="w-full">Start Mock Interview</GradientButton>
            </Link>
            {!data?.resume_uploaded && (
              <Link to="/student/resume">
                <GradientButton variant="outline" className="w-full">Upload Resume</GradientButton>
              </Link>
            )}
            {!data?.profile_complete && (
              <Link to="/student/profile">
                <GradientButton variant="outline" className="w-full">Complete Profile</GradientButton>
              </Link>
            )}
          </div>
        </GlassCard>

        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Interviews</h2>
            {recentInterviews.length > 0 && (
              <Link to="/student/interviews/history" className="text-emerald-600 text-xs hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            )}
          </div>
          {recentInterviews.length === 0 ? (
            <div className="text-center py-4">
              <Brain className="text-gray-300 mx-auto mb-2" size={32} />
              <p className="text-gray-500 text-sm">No interviews yet.</p>
              <Link to="/student/interviews" className="text-emerald-600 text-xs hover:underline mt-1 inline-block">
                Start your first interview
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentInterviews.map((interview) => (
                <Link key={interview.id} to={
                  interview.status === 'in_progress'
                    ? `/student/interviews/${interview.id}`
                    : `/student/interviews/${interview.id}/results`
                }>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{interview.interview_type}</p>
                      <p className="text-xs text-gray-500 capitalize">{interview.difficulty_level}</p>
                    </div>
                    <div className="text-right">
                      {interview.total_score !== null ? (
                        <p className="text-sm font-bold text-gray-900">{interview.total_score.toFixed(1)}/10</p>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">{interview.status.replace('_', ' ')}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
