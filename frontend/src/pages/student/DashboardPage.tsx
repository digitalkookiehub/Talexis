import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { useAuth } from '../../context/AuthContext';
import { Brain, TrendingUp, ClipboardCheck, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function StudentDashboardPage() {
  const { user } = useAuth();

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
          { label: 'Interviews Taken', value: '0', icon: <Brain className="text-purple-500" />, color: 'bg-purple-50' },
          { label: 'Average Score', value: '0.0', icon: <ClipboardCheck className="text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Readiness', value: '0%', icon: <TrendingUp className="text-green-500" />, color: 'bg-green-50' },
          { label: 'Modules Done', value: '0', icon: <BookOpen className="text-orange-500" />, color: 'bg-orange-50' },
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
            <Link to="/student/resume">
              <GradientButton variant="outline" className="w-full">Upload Resume</GradientButton>
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-500 text-sm">No interviews yet. Start your first mock interview to see your progress here.</p>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
