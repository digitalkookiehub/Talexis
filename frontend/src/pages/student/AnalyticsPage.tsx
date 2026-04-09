import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import api from '../../services/api';
import { BarChart3, Brain, TrendingUp, Target, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentAnalytics {
  total_interviews: number;
  evaluated_interviews: number;
  average_score: number;
  highest_score: number;
  interviews_by_type: Record<string, number>;
}

const typeColors: Record<string, string> = {
  hr: 'from-blue-400 to-blue-600',
  technical: 'from-purple-400 to-purple-600',
  behavioral: 'from-green-400 to-green-600',
  sales: 'from-orange-400 to-orange-600',
};

export function StudentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<StudentAnalytics>('/analytics/student')
      .then((r) => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></PageWrapper>;
  }

  if (!analytics) {
    return <PageWrapper><p className="text-red-500">Failed to load analytics.</p></PageWrapper>;
  }

  const maxType = Object.values(analytics.interviews_by_type).reduce((a, b) => Math.max(a, b), 1);

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg"><BarChart3 className="text-indigo-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Analytics</h1>
          <p className="text-gray-500 text-sm">Your interview performance over time</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Interviews', value: analytics.total_interviews, icon: <Brain className="text-purple-500" size={20} />, color: 'bg-purple-50' },
          { label: 'Evaluated', value: analytics.evaluated_interviews, icon: <Target className="text-blue-500" size={20} />, color: 'bg-blue-50' },
          { label: 'Average Score', value: `${analytics.average_score}/10`, icon: <BarChart3 className="text-green-500" size={20} />, color: 'bg-green-50' },
          { label: 'Highest Score', value: `${analytics.highest_score}/10`, icon: <TrendingUp className="text-orange-500" size={20} />, color: 'bg-orange-50' },
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

      {/* Interviews by type chart */}
      <GlassCard className="bg-white border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Interviews by Type</h2>
        {Object.keys(analytics.interviews_by_type).length === 0 ? (
          <p className="text-gray-400 text-sm">Complete some interviews to see breakdown.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(analytics.interviews_by_type).map(([type, count]) => (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium text-gray-700">{type}</span>
                  <span className="text-gray-500">{count} interview{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4">
                  <motion.div
                    className={`h-4 rounded-full bg-gradient-to-r ${typeColors[type] ?? 'from-gray-400 to-gray-600'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxType) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Score gauge */}
      <GlassCard className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 text-center">
        <p className="text-sm text-indigo-600 font-medium mb-2">Overall Performance</p>
        <div className="relative w-32 h-32 mx-auto mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <motion.path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeDasharray={`${(analytics.average_score / 10) * 100}, 100`}
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${(analytics.average_score / 10) * 100}, 100` }}
              transition={{ duration: 1.5 }}
            />
            <defs>
              <linearGradient id="gradient"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#ec4899" /></linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{analytics.average_score}</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          {analytics.average_score >= 7 ? 'Excellent performance!' : analytics.average_score >= 5 ? 'Good progress, keep improving!' : 'Keep practicing to improve your scores.'}
        </p>
      </GlassCard>
    </PageWrapper>
  );
}
