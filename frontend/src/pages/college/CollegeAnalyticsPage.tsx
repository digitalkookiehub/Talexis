import { useState, useEffect } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { collegeService, type CollegeAnalytics } from '../../services/collegeService';
import { BarChart3, Users, Brain, TrendingUp, Loader2, FileText, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const typeColors: Record<string, string> = {
  hr: 'from-blue-400 to-blue-600',
  technical: 'from-emerald-400 to-emerald-600',
  behavioral: 'from-orange-400 to-orange-600',
  sales: 'from-pink-400 to-pink-600',
};

export function CollegeAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CollegeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    collegeService.getAnalytics().then(setAnalytics).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  if (!analytics) {
    return <PageWrapper><p className="text-red-500">Failed to load analytics. Set your college name first.</p></PageWrapper>;
  }

  const maxType = Math.max(...Object.values(analytics.interviews_by_type), 1);
  const maxBranch = Math.max(...Object.values(analytics.branch_breakdown), 1);
  const rs = analytics.readiness_summary;
  const totalAssessed = rs.ready + rs.maybe + rs.not_ready;

  return (
    <PageWrapper className="p-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg"><BarChart3 className="text-orange-600" size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">College Analytics</h1>
          <p className="text-gray-500 text-sm">{analytics.college_name}</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'Candidates', value: analytics.total_students, icon: <Users size={16} className="text-emerald-500" />, color: 'bg-emerald-50' },
          { label: 'Interviews', value: analytics.total_interviews, icon: <Brain size={16} className="text-blue-500" />, color: 'bg-blue-50' },
          { label: 'Evaluated', value: analytics.evaluated_interviews, icon: <TrendingUp size={16} className="text-green-500" />, color: 'bg-green-50' },
          { label: 'Avg Score', value: `${analytics.avg_score.toFixed(1)}`, icon: <BarChart3 size={16} className="text-orange-500" />, color: 'bg-orange-50' },
          { label: 'Resumes', value: analytics.resume_uploaded, icon: <FileText size={16} className="text-pink-500" />, color: 'bg-pink-50' },
          { label: 'Visible', value: analytics.visible_to_companies, icon: <Eye size={16} className="text-indigo-500" />, color: 'bg-indigo-50' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="bg-white border-gray-100 text-center py-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 ${stat.color}`}>{stat.icon}</div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-500">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Readiness Funnel */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Readiness Breakdown</h2>
          {totalAssessed === 0 ? (
            <p className="text-gray-400 text-sm">No students assessed yet.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Placement Ready', count: rs.ready, color: 'bg-green-500', pct: (rs.ready / analytics.total_students) * 100 },
                { label: 'Almost There', count: rs.maybe, color: 'bg-yellow-500', pct: (rs.maybe / analytics.total_students) * 100 },
                { label: 'Needs Improvement', count: rs.not_ready, color: 'bg-red-400', pct: (rs.not_ready / analytics.total_students) * 100 },
                { label: 'Not Assessed', count: analytics.total_students - totalAssessed, color: 'bg-gray-300', pct: ((analytics.total_students - totalAssessed) / analytics.total_students) * 100 },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.count} ({item.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <motion.div
                      className={`h-3 rounded-full ${item.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Placement Rate */}
        <GlassCard className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 text-center flex flex-col items-center justify-center">
          <p className="text-sm text-emerald-600 font-medium mb-2">Placement Rate</p>
          <div className="relative w-32 h-32 mx-auto mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <motion.path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="url(#cgrad)" strokeWidth="3"
                strokeDasharray={`${analytics.placement_rate}, 100`}
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${analytics.placement_rate}, 100` }}
                transition={{ duration: 1.5 }}
              />
              <defs>
                <linearGradient id="cgrad"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#14b8a6" /></linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{analytics.placement_rate.toFixed(0)}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">{rs.ready} of {analytics.total_students} students placement ready</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interviews by Type */}
        {Object.keys(analytics.interviews_by_type).length > 0 && (
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Interviews by Type</h2>
            <div className="space-y-3">
              {Object.entries(analytics.interviews_by_type).map(([type, count]) => (
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
              ))}
            </div>
          </GlassCard>
        )}

        {/* Branch Breakdown */}
        {Object.keys(analytics.branch_breakdown).length > 0 && (
          <GlassCard className="bg-white border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Students by Branch</h2>
            <div className="space-y-3">
              {Object.entries(analytics.branch_breakdown).map(([branch, count]) => (
                <div key={branch} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{branch}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <motion.div
                      className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxBranch) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </PageWrapper>
  );
}
