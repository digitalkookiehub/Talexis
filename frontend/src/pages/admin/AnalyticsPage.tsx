import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { adminService, type PlatformAnalytics } from '../../services/adminService';
import api from '../../services/api';
import { BarChart3, Users, Brain, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrendData {
  interviews_by_date: Array<{ date: string; count: number }>;
  users_by_date: Array<{ date: string; count: number }>;
  interviews_by_type: Record<string, number>;
  score_distribution: Record<string, number>;
}

const typeColors: Record<string, string> = {
  hr: 'from-blue-400 to-blue-600',
  technical: 'from-emerald-400 to-emerald-600',
  behavioral: 'from-orange-400 to-orange-600',
  sales: 'from-pink-400 to-pink-600',
};

const scoreColors: Record<string, string> = {
  '0-3': 'bg-red-400',
  '4-5': 'bg-orange-400',
  '6-7': 'bg-yellow-400',
  '8-9': 'bg-emerald-400',
  '10': 'bg-green-500',
};

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getAnalytics(),
      api.get<TrendData>('/analytics/platform/trends').then((r) => r.data).catch(() => null),
    ]).then(([a, t]) => {
      setAnalytics(a);
      setTrends(t);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (!analytics) {
    return <PageWrapper><p className="text-red-500">Failed to load analytics.</p></PageWrapper>;
  }

  const maxInterviewDay = Math.max(...(trends?.interviews_by_date.map((d) => d.count) ?? [1]), 1);
  const maxScoreBucket = Math.max(...Object.values(trends?.score_distribution ?? { x: 1 }), 1);

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg"><BarChart3 className="text-orange-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-500 text-sm">System-wide metrics &middot; Last 30 days</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: analytics.total_users, icon: <Users className="text-emerald-500" size={20} />, color: 'bg-emerald-50' },
          { label: 'Total Interviews', value: analytics.total_interviews, icon: <Brain className="text-blue-500" size={20} />, color: 'bg-blue-50' },
          { label: 'Evaluated', value: analytics.evaluated_interviews, icon: <TrendingUp className="text-green-500" size={20} />, color: 'bg-green-50' },
          { label: 'Avg Score', value: analytics.platform_avg_score.toFixed(1), icon: <BarChart3 className="text-orange-500" size={20} />, color: 'bg-orange-50' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="bg-white border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Interview Trend Chart */}
        {trends && trends.interviews_by_date.length > 0 && (
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Interview Activity (30 days)</h2>
            <div className="flex items-end gap-1 h-32">
              {trends.interviews_by_date.map((d, i) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <motion.div
                    className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 min-h-[2px]"
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.count / maxInterviewDay) * 100}%` }}
                    transition={{ duration: 0.4, delay: i * 0.02 }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {new Date(d.date).toLocaleDateString()} - {d.count} interviews
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>{trends.interviews_by_date[0]?.date ? new Date(trends.interviews_by_date[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
              <span>Today</span>
            </div>
          </GlassCard>
        )}

        {/* Score Distribution */}
        {trends && (
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Score Distribution</h2>
            <div className="space-y-3">
              {Object.entries(trends.score_distribution).map(([bucket, count]) => (
                <div key={bucket} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{bucket} / 10</span>
                    <span className="font-medium text-gray-800">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <motion.div
                      className={`h-3 rounded-full ${scoreColors[bucket] ?? 'bg-gray-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxScoreBucket) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interviews by Type */}
        {trends && Object.keys(trends.interviews_by_type).length > 0 && (
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Interviews by Type (30 days)</h2>
            <div className="space-y-3">
              {Object.entries(trends.interviews_by_type).map(([type, count]) => {
                const maxType = Math.max(...Object.values(trends.interviews_by_type), 1);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium text-gray-700">{type}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <motion.div
                        className={`h-3 rounded-full bg-gradient-to-r ${typeColors[type] ?? 'from-gray-400 to-gray-600'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxType) * 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Users by Role */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
          <div className="space-y-3">
            {Object.entries(analytics.users_by_role).map(([role, count]) => {
              const pct = analytics.total_users > 0 ? (count / analytics.total_users) * 100 : 0;
              return (
                <div key={role} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-gray-600">{role.replace('_', ' ')}</span>
                    <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <motion.div
                      className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
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
      </div>
    </PageWrapper>
  );
}
