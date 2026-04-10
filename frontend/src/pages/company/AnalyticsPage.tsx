import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { BarChart3, Users, Heart, CheckCircle, XCircle, Phone, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CompanyAnalytics {
  available_talent_pool: number;
  total_shortlisted: number;
  hired: number;
  rejected: number;
  contacted: number;
  shortlisted: number;
  by_status: Record<string, number>;
  conversion_rate: number;
}

export function CompanyAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CompanyAnalytics>('/analytics/company')
      .then((r) => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  if (!analytics) {
    return <PageWrapper><p className="text-red-500">Failed to load analytics. Make sure your company profile is set up.</p></PageWrapper>;
  }

  const total = analytics.total_shortlisted || 1;
  const stages = [
    { label: 'Available', value: analytics.available_talent_pool, icon: <Users size={20} className="text-purple-500" />, color: 'bg-purple-50' },
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
          <p className="text-gray-500 text-sm">Hiring funnel and pipeline metrics</p>
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

      {/* Conversion rate */}
      <GlassCard className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-600 font-medium">Hiring Conversion Rate</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.conversion_rate}%</p>
            <p className="text-xs text-gray-500 mt-1">Hired / Shortlisted</p>
          </div>
          <CheckCircle className="text-green-400" size={48} />
        </div>
      </GlassCard>

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
