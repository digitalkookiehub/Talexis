import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { BarChart3, Users, Heart, CheckCircle, XCircle, Phone, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface CompanyAnalytics {
  available_talent_pool: number;
  total_shortlisted: number;
  hired: number;
  rejected: number;
  contacted: number;
  shortlisted: number;
  conversion_rate: number;
}

interface TrendData {
  shortlists_by_date: Array<{ date: string; count: number }>;
  schedules_by_date: Array<{ date: string; count: number }>;
  schedule_statuses: Record<string, number>;
}

export function CompanyAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CompanyAnalytics>('/analytics/company').then((r) => r.data),
      api.get<TrendData>('/analytics/company/trends').then((r) => r.data).catch(() => null),
    ]).then(([a, t]) => {
      setAnalytics(a);
      setTrends(t);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (!analytics) {
    return <PageWrapper><p className="text-red-500">Failed to load analytics. Make sure your company profile is set up.</p></PageWrapper>;
  }

  const total = analytics.total_shortlisted || 1;
  const maxShortlistDay = Math.max(...(trends?.shortlists_by_date.map((d) => d.count) ?? [1]), 1);

  const stages = [
    { label: 'Available', value: analytics.available_talent_pool, icon: <Users size={20} className="text-emerald-500" />, color: 'bg-emerald-50' },
    { label: 'Shortlisted', value: analytics.shortlisted, icon: <Heart size={20} className="text-pink-500" />, color: 'bg-pink-50' },
    { label: 'Contacted', value: analytics.contacted, icon: <Phone size={20} className="text-blue-500" />, color: 'bg-blue-50' },
    { label: 'Hired', value: analytics.hired, icon: <CheckCircle size={20} className="text-green-500" />, color: 'bg-green-50' },
    { label: 'Rejected', value: analytics.rejected, icon: <XCircle size={20} className="text-red-500" />, color: 'bg-red-50' },
  ];

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg"><BarChart3 className="text-orange-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Analytics</h1>
          <p className="text-gray-500 text-sm">Hiring funnel, pipeline metrics, and trends</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {stages.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="bg-white border-gray-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Conversion rate */}
        <GlassCard className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Hiring Conversion Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.conversion_rate}%</p>
              <p className="text-xs text-gray-500 mt-1">Hired / Shortlisted</p>
            </div>
            <CheckCircle className="text-green-400" size={48} />
          </div>
        </GlassCard>

        {/* Interview schedule breakdown */}
        {trends && Object.keys(trends.schedule_statuses).length > 0 && (
          <GlassCard className="bg-white border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Calendar size={16} className="text-indigo-500" /> Interview Schedules</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(trends.schedule_statuses).map(([status, count]) => {
                const colors: Record<string, string> = { scheduled: 'text-blue-600 bg-blue-50', rescheduled: 'text-yellow-600 bg-yellow-50', completed: 'text-green-600 bg-green-50', cancelled: 'text-red-600 bg-red-50' };
                return (
                  <div key={status} className={`p-2.5 rounded-lg text-center ${colors[status] ?? 'bg-gray-50'}`}>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-[10px] capitalize">{status}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Shortlisting trend chart */}
      {trends && trends.shortlists_by_date.length > 0 && (
        <GlassCard className="bg-white border-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Shortlisting Activity (30 days)</h2>
          <div className="flex items-end gap-1 h-28">
            {trends.shortlists_by_date.map((d, i) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <motion.div
                  className="w-full rounded-t bg-gradient-to-t from-pink-500 to-pink-300 min-h-[2px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.count / maxShortlistDay) * 100}%` }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                />
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                  {new Date(d.date).toLocaleDateString()} — {d.count} shortlisted
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 mt-1">
            <span>{trends.shortlists_by_date[0]?.date ? new Date(trends.shortlists_by_date[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
            <span>Today</span>
          </div>
        </GlassCard>
      )}

      {/* Hiring funnel */}
      <GlassCard className="bg-white border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Hiring Funnel</h2>
        <div className="space-y-3">
          {[
            { label: 'Shortlisted', count: analytics.shortlisted, color: 'bg-pink-500' },
            { label: 'Contacted', count: analytics.contacted, color: 'bg-blue-500' },
            { label: 'Hired', count: analytics.hired, color: 'bg-green-500' },
            { label: 'Rejected', count: analytics.rejected, color: 'bg-red-500' },
          ].map((stage, i) => (
            <div key={stage.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{stage.label}</span>
                <span className="font-medium">{stage.count}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <motion.div
                  className={`h-3 rounded-full ${stage.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(stage.count / total) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </PageWrapper>
  );
}
