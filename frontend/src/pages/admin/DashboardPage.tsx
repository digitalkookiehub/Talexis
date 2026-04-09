import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { Users, Brain, Building2, BarChart3 } from 'lucide-react';

export function AdminDashboardPage() {
  return (
    <PageWrapper className="p-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: '0', icon: <Users className="text-purple-500" />, color: 'bg-purple-50' },
          { label: 'Interviews Today', value: '0', icon: <Brain className="text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Companies', value: '0', icon: <Building2 className="text-green-500" />, color: 'bg-green-50' },
          { label: 'Placement Rate', value: '0%', icon: <BarChart3 className="text-orange-500" />, color: 'bg-orange-50' },
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
    </PageWrapper>
  );
}
