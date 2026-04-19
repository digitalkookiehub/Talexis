import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { GlassCard } from '../../components/ui/GlassCard';
import { adminService, type PlatformStats, type PlatformAnalytics } from '../../services/adminService';
import { Users, Brain, Building2, BarChart3, Loader2, ChevronRight, GraduationCap, Shield, TrendingUp, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import type { User } from '../../types';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [demoRequests, setDemoRequests] = useState<Array<{ id: number; contact_name: string; company_name: string; email: string; status: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      adminService.getAnalytics(),
      adminService.listUsers(undefined, 0, 5),
      api.get<Array<{ id: number; contact_name: string; company_name: string; email: string; status: string; created_at: string }>>('/admin/demo-requests').then((r) => r.data).catch(() => []),
    ]).then(([s, a, users, demos]) => {
      setStats(s);
      setAnalytics(a);
      setRecentUsers(users.slice(-5).reverse());
      setDemoRequests(demos.filter((d) => d.status === 'pending').slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageWrapper className="flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></PageWrapper>;
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: <Users className="text-emerald-500" size={20} />, color: 'bg-emerald-50', link: '/admin/users' },
    { label: 'Candidates', value: stats?.students ?? 0, icon: <GraduationCap className="text-blue-500" size={20} />, color: 'bg-blue-50', link: '/admin/users' },
    { label: 'Companies', value: stats?.companies ?? 0, icon: <Building2 className="text-green-500" size={20} />, color: 'bg-green-50', link: '/admin/users' },
    { label: 'Total Interviews', value: stats?.total_interviews ?? 0, icon: <Brain className="text-orange-500" size={20} />, color: 'bg-orange-50', link: '/admin/analytics' },
  ];

  const roleColors: Record<string, string> = {
    student: 'bg-blue-100 text-blue-700',
    company: 'bg-green-100 text-green-700',
    college_admin: 'bg-orange-100 text-orange-700',
    admin: 'bg-red-100 text-red-700',
  };

  return (
    <PageWrapper className="p-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link to={stat.link}>
              <GlassCard className="bg-white border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform health */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" /> Platform Health
            </h2>
            <Link to="/admin/analytics" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
              Details <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Evaluated Interviews</span>
              <span className="text-sm font-semibold">{analytics?.evaluated_interviews ?? 0} / {analytics?.total_interviews ?? 0}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${analytics && analytics.total_interviews > 0 ? (analytics.evaluated_interviews / analytics.total_interviews) * 100 : 0}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Average Score</span>
              <span className="text-sm font-bold text-emerald-600">{analytics?.platform_avg_score?.toFixed(1) ?? '—'} / 10</span>
            </div>
            {analytics?.users_by_role && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Users by Role</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(analytics.users_by_role).map(([role, count]) => (
                    <span key={role} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColors[role] ?? 'bg-gray-100'}`}>
                      {role}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Recent users */}
        <GlassCard className="bg-white border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <Link to="/admin/users" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-gray-400 text-sm">No users yet.</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                      {(u.full_name ?? u.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.full_name || u.email}</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColors[u.role] ?? 'bg-gray-100'}`}>
                      {u.role}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Quick actions */}
        <GlassCard className="bg-white border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/admin/users" className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
              <Users size={16} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Manage Users</span>
            </Link>
            <Link to="/admin/analytics" className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <BarChart3 size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">View Analytics</span>
            </Link>
            <Link to="/admin/anticheat" className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
              <Shield size={16} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Anti-Cheat</span>
            </Link>
            <Link to="/admin/settings" className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <Building2 size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </Link>
          </div>
        </GlassCard>
      </div>
      {/* Demo Requests */}
      {demoRequests.length > 0 && (
        <GlassCard className="bg-amber-50 border-amber-200 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-amber-800 flex items-center gap-2">
              <MessageSquare size={18} /> Demo Requests ({demoRequests.length} pending)
            </h2>
          </div>
          <div className="space-y-2">
            {demoRequests.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.contact_name} — <span className="text-emerald-600">{d.company_name}</span></p>
                  <p className="text-xs text-gray-500">{d.email} &middot; {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await api.put(`/admin/demo-requests/${d.id}`, null, { params: { status: 'contacted' } });
                      setDemoRequests((prev) => prev.filter((r) => r.id !== d.id));
                    }}
                    className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                  >
                    Mark Contacted
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </PageWrapper>
  );
}
