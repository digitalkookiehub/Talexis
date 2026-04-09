import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { useAuth } from '../../context/AuthContext';
import { Users, Heart, Briefcase, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CompanyDashboardPage() {
  const { user } = useAuth();

  return (
    <PageWrapper className="p-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Company Dashboard
        </h1>
        <p className="text-gray-500 mt-1">Welcome, {user?.full_name ?? 'Company'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Available Talent', value: '0', icon: <Users className="text-purple-500" />, color: 'bg-purple-50' },
          { label: 'Shortlisted', value: '0', icon: <Heart className="text-pink-500" />, color: 'bg-pink-50' },
          { label: 'Active Jobs', value: '0', icon: <Briefcase className="text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Hired', value: '0', icon: <BarChart3 className="text-green-500" />, color: 'bg-green-50' },
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
            <Link to="/company/talents">
              <GradientButton className="w-full">Browse Talent Pool</GradientButton>
            </Link>
            <Link to="/company/jobs">
              <GradientButton variant="outline" className="w-full">Post a Job Role</GradientButton>
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Shortlists</h2>
          <p className="text-gray-500 text-sm">No candidates shortlisted yet. Browse the talent pool to get started.</p>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
