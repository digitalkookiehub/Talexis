import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { adminService, type PlatformAnalytics } from '../../services/adminService';
import { BarChart3, Users, Brain, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAnalytics().then(setAnalytics).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  if (!analytics) {
    return <PageWrapper><p className="text-red-500">Failed to load analytics.</p></PageWrapper>;
  }

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <BarChart3 className="text-orange-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-500 text-sm">System-wide metrics</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: analytics.total_users, icon: <Users className="text-purple-500" />, color: 'bg-purple-50' },
          { label: 'Total Interviews', value: analytics.total_interviews, icon: <Brain className="text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Evaluated', value: analytics.evaluated_interviews, icon: <TrendingUp className="text-green-500" />, color: 'bg-green-50' },
          { label: 'Avg Score', value: analytics.platform_avg_score.toFixed(1), icon: <BarChart3 className="text-orange-500" />, color: 'bg-orange-50' },
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

      {/* Users by role */}
      <GlassCard className="bg-white border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
        <div className="space-y-3">
          {Object.entries(analytics.users_by_role).map(([role, count]) => {
            const total = analytics.total_users || 1;
            const pct = (count / total) * 100;
            return (
              <div key={role} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize text-gray-600">{role.replace('_', ' ')}</span>
                  <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <motion.div
                    className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </PageWrapper>
  );
}
