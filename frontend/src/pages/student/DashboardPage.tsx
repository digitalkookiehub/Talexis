import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import api from '../../services/api';
import { Brain, TrendingUp, ClipboardCheck, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Interview } from '../../types';

interface DashboardData {
  profile_complete: boolean;
  resume_uploaded: boolean;
  total_interviews: number;
  baseline_score: number | null;
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
  const [readinessPercent, setReadinessPercent] = useState<number>(0);

  useEffect(() => {
    studentService.getDashboard().then(setData).catch(() => {});
    api.get<{ interviews: Interview[]; total: number }>('/interviews/history?limit=5')
      .then((r) => setRecentInterviews(r.data.interviews))
      .catch(() => {});
    api.get('/readiness/me')
      .then((r) => setReadinessPercent((r.data as { overall_readiness_percent: number }).overall_readiness_percent))
      .catch(() => {});
  }, []);

  const totalInterviews = data?.total_interviews ?? 0;
  const evaluatedScores = recentInterviews.filter((i) => i.total_score !== null);
  const avgScore = evaluatedScores.length > 0
    ? evaluatedScores.reduce((sum, i) => sum + (i.total_score ?? 0), 0) / evaluatedScores.length
    : 0;

  return (
    <PageWrapper className="p-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name ?? 'Student'}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s your interview preparation overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Interviews Taken', value: String(totalInterviews), icon: <Brain className="text-purple-500" />, color: 'bg-purple-50' },
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
              <Link to="/student/interviews/history" className="text-purple-600 text-xs hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            )}
          </div>
          {recentInterviews.length === 0 ? (
            <p className="text-gray-500 text-sm">No interviews yet. Start your first mock interview to see your progress here.</p>
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
